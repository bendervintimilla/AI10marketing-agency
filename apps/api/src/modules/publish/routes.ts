/**
 * Publish Module — Fastify Router
 *
 * Endpoints:
 *   GET  /publish/accounts              — list connected social accounts
 *   POST /publish/connect/:platform     — initiate OAuth (returns redirect URL)
 *   GET  /publish/callback/:platform    — handle OAuth callback, store tokens
 *   DEL  /publish/disconnect/:platform  — revoke + delete tokens
 *   POST /publish/schedule              — schedule a delayed publish job
 *   POST /publish/now                   — publish immediately
 *   POST /publish/unpublish             — remove post via platform API
 *   GET  /publish/queue                 — list scheduled/pending jobs
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Platform, AdStatus } from '@agency/db';
import { prisma } from '../../lib/prisma';
import { encrypt, decrypt } from '../../lib/crypto';
import { getPublishQueue } from '../../lib/queue';
import { socialAccount } from '@agency/db';
import { unpublishAd } from './publishers';
import { getMetaAuthUrl, exchangeMetaCode, getLongLivedToken, getPageToken, listAllPagesWithInstagram } from './oauth/meta';
import { getTikTokAuthUrl, exchangeTikTokCode, revokeTikTokToken } from './oauth/tiktok';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePlatform(raw: string): Platform {
    const upper = raw.toUpperCase() as Platform;
    if (!Object.values(Platform).includes(upper)) {
        throw new Error(`Unknown platform: ${raw}`);
    }
    return upper;
}

// In-memory PKCE store for TikTok (keyed by OAuth state)
// In production, store in Redis with TTL
const tiktokPkceStore = new Map<string, string>();

/** Normalize a string for matching: lowercase, strip @ and non-alphanum. */
function norm(s: string): string {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Walk every Page the user can access, and for each Page that has a linked
 * Instagram Business account, try to match it to a Brand row in the same org
 * (by IG username -> instagramHandle, or by Page name -> Brand name).
 *
 * Returns a summary with counts so the UI can show the user what landed.
 */
export async function resolveOrgBrandInstagramIds(args: {
    organizationId: string;
    metaUserId: string;
    metaUserToken: string;
}): Promise<{
    brandsTotal: number;
    matched: { brandId: string; brandName: string; igUsername: string; igUserId: string }[];
    unmatchedBrands: string[];
    unmatchedPages: { pageName: string; igUsername?: string }[];
}> {
    const pages = await listAllPagesWithInstagram(args.metaUserId, args.metaUserToken);
    const brands = await prisma.brand.findMany({
        where: { organizationId: args.organizationId },
        select: { id: true, name: true, instagramHandle: true, instagramUserId: true },
    });

    const matched: {
        brandId: string;
        brandName: string;
        igUsername: string;
        igUserId: string;
    }[] = [];
    const usedPageIdx = new Set<number>();

    // Pass 1: exact match by IG username == brand handle
    for (const brand of brands) {
        const handle = norm(brand.instagramHandle ?? '');
        if (!handle) continue;
        const idx = pages.findIndex(
            (p, i) =>
                !usedPageIdx.has(i) &&
                p.instagramAccountId &&
                p.instagramUsername &&
                norm(p.instagramUsername) === handle
        );
        if (idx >= 0) {
            usedPageIdx.add(idx);
            const p = pages[idx];
            await prisma.brand.update({
                where: { id: brand.id },
                data: { instagramUserId: p.instagramAccountId! },
            });
            matched.push({
                brandId: brand.id,
                brandName: brand.name,
                igUsername: p.instagramUsername!,
                igUserId: p.instagramAccountId!,
            });
        }
    }

    // Pass 2: fuzzy match on Page name vs Brand name for remaining brands
    const remainingBrands = brands.filter(
        (b) => !matched.find((m) => m.brandId === b.id)
    );
    for (const brand of remainingBrands) {
        const bn = norm(brand.name);
        if (!bn) continue;
        const idx = pages.findIndex((p, i) => {
            if (usedPageIdx.has(i)) return false;
            if (!p.instagramAccountId) return false;
            const pn = norm(p.pageName);
            return pn.includes(bn) || bn.includes(pn);
        });
        if (idx >= 0) {
            usedPageIdx.add(idx);
            const p = pages[idx];
            await prisma.brand.update({
                where: { id: brand.id },
                data: { instagramUserId: p.instagramAccountId! },
            });
            matched.push({
                brandId: brand.id,
                brandName: brand.name,
                igUsername: p.instagramUsername || p.pageName,
                igUserId: p.instagramAccountId!,
            });
        }
    }

    const unmatchedBrands = brands
        .filter((b) => !matched.find((m) => m.brandId === b.id))
        .map((b) => b.name);
    const unmatchedPages: { pageName: string; igUsername?: string }[] = [];
    pages.forEach((p, i) => {
        if (!usedPageIdx.has(i)) {
            unmatchedPages.push({
                pageName: p.pageName,
                igUsername: p.instagramUsername,
            });
        }
    });

    return {
        brandsTotal: brands.length,
        matched,
        unmatchedBrands,
        unmatchedPages,
    };
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

export async function publishRoutes(fastify: FastifyInstance) {

    // GET /publish/accounts
    fastify.get('/publish/accounts', async (req: FastifyRequest<{ Querystring: { orgId: string } }>, reply: FastifyReply) => {
        const { orgId } = req.query;
        if (!orgId) return reply.status(400).send({ error: 'orgId query param required' });

        const accounts = await socialAccount.listByOrg(orgId);
        return accounts.map(({ accessToken, refreshToken, ...safe }: any) => safe);
    });

    // POST /publish/connect/:platform
    fastify.post<{ Params: { platform: string }; Body: { orgId: string } }>(
        '/publish/connect/:platform',
        async (req, reply) => {
            const { orgId } = req.body;
            if (!orgId) return reply.status(400).send({ error: 'orgId required' });

            const platform = parsePlatform(req.params.platform);
            const state = `${orgId}::${Date.now()}`;

            if (platform === Platform.TIKTOK) {
                const { url, codeVerifier } = getTikTokAuthUrl(state);
                tiktokPkceStore.set(state, codeVerifier);
                return { url, state };
            }

            const url = getMetaAuthUrl(state);
            return { url, state };
        }
    );

    // GET /publish/callback/:platform
    fastify.get<{
        Params: { platform: string };
        Querystring: { code?: string; state?: string; error?: string };
    }>('/publish/callback/:platform', async (req, reply) => {
        const { code, state, error } = req.query;

        if (error) return reply.status(400).send({ error: `OAuth denied: ${error}` });
        if (!code || !state) return reply.status(400).send({ error: 'Missing code or state' });

        const orgId = state.split('::')[0];
        if (!orgId) return reply.status(400).send({ error: 'Invalid state param' });

        const platform = parsePlatform(req.params.platform);

        if (platform === Platform.TIKTOK) {
            const codeVerifier = tiktokPkceStore.get(state);
            if (!codeVerifier) return reply.status(400).send({ error: 'OAuth session expired — retry connect' });
            tiktokPkceStore.delete(state);

            const tokens = await exchangeTikTokCode(code, codeVerifier);
            const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

            await socialAccount.upsert({
                orgId,
                platform: Platform.TIKTOK,
                accessToken: encrypt(tokens.accessToken),
                refreshToken: encrypt(tokens.refreshToken),
                expiresAt,
                accountName: tokens.displayName ?? tokens.openId,
                accountId: tokens.openId,
            });

            return { success: true, platform: 'TIKTOK', accountId: tokens.openId };
        }

        // Meta (Instagram / Facebook)
        const { accessToken: shortToken, userId } = await exchangeMetaCode(code);
        const { accessToken: longToken, expiresIn } = await getLongLivedToken(shortToken);
        const { pageId, pageName, pageToken, instagramAccountId } = await getPageToken(userId, longToken);
        const expiresAt = new Date(Date.now() + expiresIn * 1000);

        if (platform === Platform.INSTAGRAM) {
            if (!instagramAccountId) {
                return reply.status(400).send({ error: 'No Instagram Business account linked to this Facebook page' });
            }
            await socialAccount.upsert({
                orgId,
                platform: Platform.INSTAGRAM,
                accessToken: encrypt(pageToken),
                refreshToken: null,
                expiresAt,
                accountName: pageName,
                accountId: instagramAccountId,
            });

            // Bulk-resolve every brand's instagramUserId in the same org from
            // this single OAuth pass. Errors here don't block the connection.
            let resolveSummary: any = null;
            try {
                resolveSummary = await resolveOrgBrandInstagramIds({
                    organizationId: orgId,
                    metaUserId: userId,
                    metaUserToken: longToken,
                });
            } catch (e: any) {
                req.log.warn({ err: e?.message }, 'Brand IG bulk-resolve failed');
            }

            const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
            const params = new URLSearchParams({
                connected: 'instagram',
                accountId: instagramAccountId,
            });
            if (resolveSummary) {
                params.set('resolution', JSON.stringify(resolveSummary));
            }
            return reply.redirect(`${frontend}/dashboard/settings/accounts?${params.toString()}`);
        }

        await socialAccount.upsert({
            orgId,
            platform: Platform.FACEBOOK,
            accessToken: encrypt(pageToken),
            refreshToken: null,
            expiresAt,
            accountName: pageName,
            accountId: pageId,
        });
        return { success: true, platform: 'FACEBOOK', accountId: pageId };
    });

    // DELETE /publish/disconnect/:platform
    fastify.delete<{ Params: { platform: string }; Body: { orgId: string } }>(
        '/publish/disconnect/:platform',
        async (req, reply) => {
            const { orgId } = req.body;
            if (!orgId) return reply.status(400).send({ error: 'orgId required' });

            const platform = parsePlatform(req.params.platform);
            const account = await socialAccount.findByOrgAndPlatform(orgId, platform);
            if (!account) return reply.status(404).send({ error: 'No connected account' });

            if (platform === Platform.TIKTOK) {
                try { await revokeTikTokToken(decrypt(account.accessToken)); } catch { /* best-effort */ }
            }

            await socialAccount.deleteByOrgAndPlatform(orgId, platform);
            return { success: true };
        }
    );

    // POST /publish/schedule
    fastify.post<{ Body: { adId: string; orgId: string; platform: string; scheduledAt: string } }>(
        '/publish/schedule',
        async (req, reply) => {
            const schema = z.object({
                adId: z.string(),
                orgId: z.string(),
                platform: z.nativeEnum(Platform),
                scheduledAt: z.string().datetime(),
            });
            const parsed = schema.safeParse(req.body);
            if (!parsed.success) return reply.status(400).send({ error: parsed.error.format() });

            const { adId, orgId, platform, scheduledAt } = parsed.data;
            const scheduledDate = new Date(scheduledAt);
            if (scheduledDate <= new Date()) {
                return reply.status(400).send({ error: 'scheduledAt must be in the future' });
            }

            const ad = await prisma.ad.findUnique({ where: { id: adId } });
            if (!ad) return reply.status(404).send({ error: 'Ad not found' });

            const account = await socialAccount.findByOrgAndPlatform(orgId, platform);
            if (!account) return reply.status(400).send({ error: `No connected ${platform} account` });

            const delayMs = scheduledDate.getTime() - Date.now();
            const queue = getPublishQueue();
            const job = await queue.add(
                'publish-ad',
                { adId, platform, orgId },
                { delay: delayMs, jobId: `publish:${adId}:${platform}` }
            );

            await prisma.ad.update({
                where: { id: adId },
                data: { scheduledAt: scheduledDate, status: AdStatus.SCHEDULED },
            });

            return { success: true, jobId: job.id, scheduledAt };
        }
    );

    // POST /publish/now
    fastify.post<{ Body: { adId: string; orgId: string; platform: string } }>(
        '/publish/now',
        async (req, reply) => {
            const schema = z.object({
                adId: z.string(),
                orgId: z.string(),
                platform: z.nativeEnum(Platform),
            });
            const parsed = schema.safeParse(req.body);
            if (!parsed.success) return reply.status(400).send({ error: parsed.error.format() });

            const { adId, orgId, platform } = parsed.data;

            const ad = await prisma.ad.findUnique({ where: { id: adId } });
            if (!ad) return reply.status(404).send({ error: 'Ad not found' });

            const account = await socialAccount.findByOrgAndPlatform(orgId, platform);
            if (!account) return reply.status(400).send({ error: `No connected ${platform} account` });

            const queue = getPublishQueue();
            const job = await queue.add(
                'publish-ad',
                { adId, platform, orgId },
                { jobId: `publish-now:${adId}:${platform}:${Date.now()}` }
            );

            return { success: true, jobId: job.id };
        }
    );

    // POST /publish/unpublish
    fastify.post<{ Body: { adId: string; orgId: string; platform: string } }>(
        '/publish/unpublish',
        async (req, reply) => {
            const schema = z.object({
                adId: z.string(),
                orgId: z.string(),
                platform: z.nativeEnum(Platform),
            });
            const parsed = schema.safeParse(req.body);
            if (!parsed.success) return reply.status(400).send({ error: parsed.error.format() });

            const { adId, orgId, platform } = parsed.data;

            const ad = await prisma.ad.findUnique({ where: { id: adId } });
            if (!ad) return reply.status(404).send({ error: 'Ad not found' });
            if (!ad.externalPostId) return reply.status(400).send({ error: 'Ad not published' });

            const account = await socialAccount.findByOrgAndPlatform(orgId, platform);
            if (!account) return reply.status(400).send({ error: `No connected ${platform} account` });

            await unpublishAd(platform, ad.externalPostId, account);

            await prisma.ad.update({
                where: { id: adId },
                data: { status: AdStatus.REMOVED, externalPostId: null, publishedAt: null },
            });

            return { success: true };
        }
    );

    // GET /publish/queue
    fastify.get<{ Querystring: { orgId: string } }>(
        '/publish/queue',
        async (req, reply) => {
            const { orgId } = req.query;
            if (!orgId) return reply.status(400).send({ error: 'orgId required' });

            const scheduledAds = await prisma.ad.findMany({
                where: {
                    status: AdStatus.SCHEDULED,
                    scheduledAt: { gte: new Date() },
                    campaign: { organizationId: orgId },
                },
                select: {
                    id: true,
                    name: true,
                    platform: true,
                    scheduledAt: true,
                    status: true,
                    generatedVideoUrl: true,
                    generatedImageUrl: true,
                    thumbnailUrl: true,
                },
                orderBy: { scheduledAt: 'asc' },
            });

            return { queue: scheduledAds };
        }
    );

    // POST /publish/resolve-brand-instagram-ids
    // Re-runs the bulk Page→Brand match using the stored Meta token, without
    // requiring a fresh OAuth. Useful after adding/renaming brands.
    fastify.post<{ Body: { orgId: string } }>(
        '/publish/resolve-brand-instagram-ids',
        async (req, reply) => {
            const { orgId } = req.body;
            if (!orgId) return reply.status(400).send({ error: 'orgId required' });

            // Find an INSTAGRAM social account for this org with a token we can use.
            const account = await prisma.socialAccount.findFirst({
                where: { organizationId: orgId, platform: Platform.INSTAGRAM },
                orderBy: { createdAt: 'desc' },
            });
            if (!account || !account.accessToken) {
                return reply
                    .status(400)
                    .send({ error: 'No Instagram connection found — connect Facebook first.' });
            }

            // The stored token is a Page Access Token. To list /me/accounts we
            // need the user token, which we don't have post-callback. Fall back
            // to using the page token to query just that page's IG account.
            const pageToken = decrypt(account.accessToken);

            try {
                // Try the user-level call first (works if it's actually a user token).
                const meRes = await fetch(
                    `https://graph.facebook.com/v19.0/me?access_token=${pageToken}`
                );
                const me = (await meRes.json()) as { id?: string };
                if (!me.id) {
                    return reply
                        .status(400)
                        .send({ error: 'Stored token cannot list pages — re-connect Facebook.' });
                }
                const summary = await resolveOrgBrandInstagramIds({
                    organizationId: orgId,
                    metaUserId: me.id,
                    metaUserToken: pageToken,
                });
                return summary;
            } catch (err: any) {
                return reply
                    .status(500)
                    .send({ error: 'resolve_failed', message: err?.message });
            }
        }
    );
}
