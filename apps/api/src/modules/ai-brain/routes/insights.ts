import { FastifyInstance } from 'fastify';
import { prisma } from '@agency/db';
import { getCampaignInsights } from '../services/insights';

export async function insightsRoutes(fastify: FastifyInstance) {
    /**
     * GET /ai/insights/:campaignId
     */
    fastify.get<{ Params: { campaignId: string } }>('/ai/insights/:campaignId', async (request, reply) => {
        const user = (request as any).user;
        if (!user) return reply.status(401).send({ success: false, error: 'Unauthorized' });

        const { campaignId } = request.params;

        try {
            const campaign = await prisma.campaign.findUnique({
                where: { id: campaignId },
                select: { organizationId: true },
            });

            if (!campaign) return reply.status(404).send({ success: false, error: 'Campaign not found' });
            if (campaign.organizationId !== user.orgId) {
                return reply.status(403).send({ success: false, error: 'Forbidden' });
            }

            const insights = await getCampaignInsights(campaignId);
            return reply.send({ success: true, data: { campaignId, insights } });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return reply.status(500).send({ success: false, error: message });
        }
    });
}
