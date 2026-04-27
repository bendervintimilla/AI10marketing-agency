/**
 * Publish Ad BullMQ Worker
 *
 * Listens on "publish-ad" queue. For each job:
 *  1. Loads Ad and SocialAccount from DB
 *  2. Decrypts tokens, refreshes if expired
 *  3. Calls platform publisher dispatcher
 *  4. Updates Ad: externalPostId, status=PUBLISHED, publishedAt
 *
 * Error handling:
 *  - BullMQ handles retries (3 attempts, exponential backoff defined in queue)
 *  - On token expiry: refresh and retry (handled during job processing)
 *  - On permanent failure (all retries exhausted): mark Ad FAILED + create Notification
 */

import { Worker, Job, UnrecoverableError } from 'bullmq';
import Redis from 'ioredis';
import { Platform, AdStatus, prisma, socialAccount } from '@agency/db';
import { decrypt, encrypt } from '../lib/crypto';
import { publishAd } from '../publishers';
import { refreshMetaToken } from '../oauth/meta';
import { refreshTikTokToken } from '../oauth/tiktok';


export const QUEUE_NAME = 'publish-ad';

export interface PublishJobData {
    adId: string;
    platform: string;
    orgId: string;
}

async function ensureFreshToken(
    account: Awaited<ReturnType<typeof socialAccount.findByOrgAndPlatform>>
): Promise<string> {
    if (!account) throw new Error('Social account not found');

    const accessToken = decrypt(account.accessToken);

    // Check if token is expired or about to expire (within 5 minutes)
    const isExpired =
        account.expiresAt && account.expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

    if (!isExpired) return accessToken;

    console.log(`[publish-worker] Token expired for ${account.platform}, refreshing...`);

    if (account.platform === Platform.TIKTOK) {
        if (!account.refreshToken) {
            throw new UnrecoverableError('TikTok refresh token missing — cannot refresh');
        }
        const refreshToken = decrypt(account.refreshToken);
        const tokens = await refreshTikTokToken(refreshToken);
        const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

        await socialAccount.upsert({
            orgId: account.organizationId,
            platform: Platform.TIKTOK,
            accessToken: encrypt(tokens.accessToken),
            refreshToken: encrypt(tokens.refreshToken),
            expiresAt,
            accountName: account.accountName,
            accountId: account.accountId,
        });

        return tokens.accessToken;
    }

    // Meta (Instagram / Facebook) — re-exchange long-lived token
    const { accessToken: newToken, expiresIn } = await refreshMetaToken(accessToken);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await socialAccount.upsert({
        orgId: account.organizationId,
        platform: account.platform as Platform,
        accessToken: encrypt(newToken),
        refreshToken: null,
        expiresAt,
        accountName: account.accountName,
        accountId: account.accountId,
    });

    return newToken;
}

export function createPublishWorker(redisUrl: string) {
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

    const worker = new Worker<PublishJobData>(
        QUEUE_NAME,
        async (job: Job<PublishJobData>) => {
            const { adId, platform, orgId } = job.data;
            const attemptNumber = (job.attemptsMade ?? 0) + 1;

            console.log(
                `[publish-worker] Job ${job.id} attempt ${attemptNumber} — ` +
                `adId=${adId} platform=${platform} orgId=${orgId}`
            );

            // 1. Load Ad
            const ad = await prisma.ad.findUnique({ where: { id: adId } });
            if (!ad) {
                throw new UnrecoverableError(`Ad ${adId} not found — skipping`);
            }

            const mediaUrl = ad.generatedVideoUrl ?? ad.generatedImageUrl;
            if (!mediaUrl) {
                throw new UnrecoverableError(
                    `Ad ${adId} has no generated media URL — cannot publish`
                );
            }

            // 2. Load SocialAccount
            const parsedPlatform = platform as Platform;
            const account = await socialAccount.findByOrgAndPlatform(orgId, parsedPlatform);
            if (!account) {
                throw new UnrecoverableError(
                    `No connected ${platform} account for org ${orgId} — cannot publish`
                );
            }

            // 3. Ensure token is fresh (refresh if expired)
            await ensureFreshToken(account);

            // Reload account after potential refresh
            const freshAccount = await socialAccount.findByOrgAndPlatform(orgId, parsedPlatform);
            if (!freshAccount) throw new Error('Account disappeared after token refresh');

            // 4. Publish
            const isVideo = !!ad.generatedVideoUrl;
            const caption =
                (ad as any).caption ??
                ad.creativeBrief?.slice(0, 2000) ??
                ad.name;

            const result = await publishAd(parsedPlatform, {
                adId,
                mediaUrl,
                caption,
                isVideo,
                thumbnailUrl: ad.thumbnailUrl ?? undefined,
            }, freshAccount);

            // 5. Update Ad record
            await prisma.ad.update({
                where: { id: adId },
                data: {
                    externalPostId: result.externalPostId,
                    publishedAt: new Date(),
                    status: AdStatus.PUBLISHED,
                },
            });

            console.log(
                `[publish-worker] ✓ Published ad ${adId} to ${platform} — postId=${result.externalPostId}`
            );
        },
        {
            connection,
            concurrency: 3,
        }
    );

    // On permanent failure (all retries exhausted)
    worker.on('failed', async (job, err) => {
        if (!job) return;
        const { adId } = job.data;
        const isUnrecoverable = err instanceof UnrecoverableError;
        const allRetriesExhausted =
            job.attemptsMade >= (job.opts?.attempts ?? 3);

        if (isUnrecoverable || allRetriesExhausted) {
            console.error(
                `[publish-worker] ✗ Permanent failure for ad ${adId}: ${err.message}`
            );
            try {
                await prisma.ad.update({
                    where: { id: adId },
                    data: { status: AdStatus.FAILED },
                });

                // Create notification (best-effort)
                await prisma.aIRecommendation.create({
                    data: {
                        organizationId: job.data.orgId,
                        adId,
                        type: 'IMPROVE',
                        payload: {
                            error: err.message,
                            platform: job.data.platform,
                            jobId: job.id,
                            failedAt: new Date().toISOString(),
                        },
                        status: 'PENDING',
                    },
                });
            } catch (dbErr) {
                console.error('[publish-worker] Failed to update DB after failure:', dbErr);
            }
        }
    });

    worker.on('error', (err) => {
        console.error('[publish-worker] Worker error:', err.message);
    });

    console.log(`[publish-worker] Started, listening on queue "${QUEUE_NAME}"`);
    return worker;
}
