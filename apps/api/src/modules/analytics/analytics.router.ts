import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@agency/db';
import { requireAuth } from '../auth/auth.middleware';
import {
    getCampaignAnalytics,
    getAdTimeSeries,
    getOrgOverview,
    compareAds,
    exportCampaignData,
} from './analytics.service';

function rowsToCsv(rows: Record<string, any>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [
        headers.join(','),
        ...rows.map((row) =>
            headers.map((h) => {
                const v = row[h];
                if (typeof v === 'string' && v.includes(',')) return `"${v}"`;
                return v ?? '';
            }).join(',')
        ),
    ];
    return lines.join('\n');
}

export async function analyticsRoutes(fastify: FastifyInstance) {
    // ── GET /analytics/dashboard-stats ──────────────────────────────────────
    // Top-level numbers shown on the dashboard home cards. All scoped to the
    // current organization. Returns real counts (not mock).
    fastify.get(
        '/analytics/dashboard-stats',
        { preHandler: requireAuth },
        async (req: FastifyRequest, reply: FastifyReply) => {
            // JWT payload uses `orgId` (see auth.controller.ts).
            const user = (req as any).user as { orgId?: string; organizationId?: string };
            const orgId = user?.orgId ?? user?.organizationId;
            if (!orgId) {
                return reply.status(400).send({ error: 'Missing organization on token' });
            }

            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);

            const [activeCampaigns, adsPublishedThisMonth, totalAdsPublished, failedChecks, brandCount] =
                await Promise.all([
                    prisma.campaign.count({
                        where: { organizationId: orgId, status: 'ACTIVE' as any },
                    }),
                    prisma.ad.count({
                        where: {
                            campaign: { organizationId: orgId },
                            status: 'PUBLISHED' as any,
                            publishedAt: { gte: monthStart },
                        },
                    }),
                    prisma.ad.count({
                        where: {
                            campaign: { organizationId: orgId },
                            status: 'PUBLISHED' as any,
                        },
                    }),
                    // "AI Recommendations" pending review = failed audit checks
                    // across all the org's brands. These are the real, actionable
                    // findings the user should review.
                    prisma.auditCheck.count({
                        where: {
                            status: 'FAIL' as any,
                            auditRun: { brand: { organizationId: orgId } },
                        },
                    }),
                    prisma.brand.count({ where: { organizationId: orgId } }),
                ]);

            return reply.send({
                activeCampaigns,
                adsPublished: adsPublishedThisMonth,
                totalAdsPublished,
                totalReach: 0, // No ad-level metrics ingested yet — placeholder until publish telemetry lands.
                aiRecs: failedChecks,
                brandCount,
            });
        }
    );

    // ── GET /analytics/campaign/:id ──────────────────────────────────────────
    fastify.get<{ Params: { id: string } }>(
        '/analytics/campaign/:id',
        async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id } = req.params;
            const data = await getCampaignAnalytics(id);
            if (!data) {
                return reply.status(404).send({ error: 'Campaign not found' });
            }
            return reply.send(data);
        }
    );

    // ── GET /analytics/ad/:id ────────────────────────────────────────────────
    fastify.get<{ Params: { id: string }; Querystring: { from?: string; to?: string } }>(
        '/analytics/ad/:id',
        async (req, reply) => {
            const { id } = req.params as { id: string };
            const { from, to } = req.query as { from?: string; to?: string };
            const data = await getAdTimeSeries(
                id,
                from ? new Date(from) : undefined,
                to ? new Date(to) : undefined
            );
            if (!data) {
                return reply.status(404).send({ error: 'Ad not found' });
            }
            return reply.send(data);
        }
    );

    // ── GET /analytics/org/overview ──────────────────────────────────────────
    // Auth-scoped: derives orgId from the JWT instead of trusting a header.
    fastify.get(
        '/analytics/org/overview',
        { preHandler: requireAuth },
        async (req: FastifyRequest, reply: FastifyReply) => {
            const user = (req as any).user as { orgId?: string; organizationId?: string };
            const orgId = user?.orgId ?? user?.organizationId ?? (req.headers['x-org-id'] as string) ?? '';
            if (!orgId) {
                return reply.status(400).send({ error: 'organization context missing' });
            }
            const data = await getOrgOverview(orgId);
            return reply.send(data);
        }
    );

    // ── GET /analytics/compare?adIds=a,b,c ──────────────────────────────────
    fastify.get<{ Querystring: { adIds: string } }>(
        '/analytics/compare',
        async (req, reply) => {
            const { adIds } = req.query as { adIds?: string };
            if (!adIds) {
                return reply.status(400).send({ error: 'adIds query param required (comma-separated)' });
            }
            const ids = adIds.split(',').map((s) => s.trim()).filter(Boolean);
            if (ids.length === 0 || ids.length > 10) {
                return reply.status(400).send({ error: 'Provide between 1-10 adIds' });
            }
            const data = await compareAds(ids);
            return reply.send(data);
        }
    );

    // ── GET /analytics/export/:campaignId ────────────────────────────────────
    fastify.get<{ Params: { campaignId: string }; Querystring: { format?: string } }>(
        '/analytics/export/:campaignId',
        async (req, reply) => {
            const { campaignId } = req.params as { campaignId: string };
            const format = ((req.query as any).format ?? 'csv').toLowerCase();

            const rows = await exportCampaignData(campaignId);

            if (format === 'csv') {
                const csv = rowsToCsv(rows);
                reply
                    .header('Content-Type', 'text/csv')
                    .header('Content-Disposition', `attachment; filename="campaign-${campaignId}.csv"`)
                    .send(csv);
                return;
            }

            // Default: JSON
            return reply.send(rows);
        }
    );
}
