/**
 * campaigns.router.ts — Campaign endpoints.
 *
 * GET /campaigns       — list campaigns for caller's org with rolled-up metrics
 * GET /campaigns/:id   — single campaign with ads + recent analytics
 *
 * Returns campaigns in the shape the frontend Campaigns page expects so the
 * old hardcoded FALLBACK_CAMPAIGNS can be retired.
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '@agency/db';
import { requireAuth } from '../auth/auth.middleware';

const STATUS_LABEL: Record<string, 'Draft' | 'Active' | 'Paused' | 'Completed'> = {
    DRAFT: 'Draft',
    ACTIVE: 'Active',
    PAUSED: 'Paused',
    COMPLETED: 'Completed',
};

const GOAL_LABEL: Record<string, 'Awareness' | 'Engagement' | 'Conversion'> = {
    AWARENESS: 'Awareness',
    ENGAGEMENT: 'Engagement',
    CONVERSION: 'Conversion',
};

export async function campaignsRoutes(fastify: FastifyInstance) {
    fastify.get('/campaigns', { preHandler: requireAuth }, async (req, reply) => {
        const tokenUser = (req as any).user as { orgId?: string; organizationId?: string };
        const orgId = tokenUser.orgId ?? tokenUser.organizationId;
        if (!orgId) return reply.status(400).send({ error: 'organization context missing' });

        const campaigns = await prisma.campaign.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: 'desc' },
            include: {
                ads: {
                    select: {
                        id: true,
                        platform: true,
                        analytics: {
                            orderBy: { fetchedAt: 'desc' },
                            take: 1,
                            select: { impressions: true, reach: true, clicks: true, spent: true },
                        },
                    },
                },
            },
        });

        const rows = campaigns.map((c) => {
            // Roll up latest snapshot per ad
            let impressions = 0, reach = 0, clicks = 0, spent = 0;
            const platformSet = new Set<string>();
            for (const ad of c.ads) {
                platformSet.add(ad.platform);
                const snap = ad.analytics[0];
                if (snap) {
                    impressions += snap.impressions;
                    reach += snap.reach;
                    clicks += snap.clicks;
                    spent += snap.spent;
                }
            }

            // Map Platform enum (INSTAGRAM/TIKTOK/META/etc.) to the frontend's
            // shorter labels. FACEBOOK is the fallback for META on the UI.
            const platforms = Array.from(platformSet).map((p) =>
                p === 'META' ? 'FACEBOOK' : p
            );

            return {
                id: c.id,
                name: c.name,
                status: STATUS_LABEL[c.status] ?? c.status,
                goal: GOAL_LABEL[c.goal] ?? c.goal,
                platforms,
                startDate: c.startDate?.toISOString() ?? c.createdAt.toISOString(),
                endDate: c.endDate?.toISOString() ?? null,
                adsCount: c.ads.length,
                impressions,
                reach,
                clicks,
                budget: c.budget ?? 0,
                spent,
            };
        });

        return reply.send({ campaigns: rows });
    });

    fastify.get<{ Params: { id: string } }>(
        '/campaigns/:id',
        { preHandler: requireAuth },
        async (req, reply) => {
            const tokenUser = (req as any).user as { orgId?: string; organizationId?: string };
            const orgId = tokenUser.orgId ?? tokenUser.organizationId;
            if (!orgId) return reply.status(400).send({ error: 'organization context missing' });

            const campaign = await prisma.campaign.findFirst({
                where: { id: req.params.id, organizationId: orgId },
                include: {
                    ads: {
                        include: {
                            analytics: {
                                orderBy: { fetchedAt: 'desc' },
                                take: 1,
                            },
                        },
                    },
                },
            });
            if (!campaign) return reply.status(404).send({ error: 'Campaign not found' });
            return reply.send(campaign);
        }
    );
}
