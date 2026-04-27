import { FastifyInstance } from 'fastify';
import { prisma } from '@agency/db';
import { recommendation as recommendationRepo } from '@agency/db';
import { executeRecommendation } from '../services/autopilot';

type RecStatus = 'PENDING' | 'ACCEPTED' | 'DISMISSED' | 'EXECUTED';

export async function recommendationRoutes(fastify: FastifyInstance) {
    /**
     * GET /ai/recommendations
     * Query: status?, campaignId?
     */
    fastify.get('/ai/recommendations', async (request, reply) => {
        const user = (request as any).user;
        if (!user) return reply.status(401).send({ success: false, error: 'Unauthorized' });

        const { status, campaignId } = request.query as { status?: string; campaignId?: string };
        const validStatuses: RecStatus[] = ['PENDING', 'ACCEPTED', 'DISMISSED', 'EXECUTED'];
        const statusFilter = validStatuses.includes(status as RecStatus)
            ? (status as RecStatus)
            : undefined;

        try {
            const recs = await recommendationRepo.listByOrg(user.orgId, statusFilter, campaignId);
            return reply.send({ success: true, data: recs, total: recs.length });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return reply.status(500).send({ success: false, error: message });
        }
    });

    /**
     * POST /ai/recommendations/:id/accept
     */
    fastify.post<{ Params: { id: string } }>('/ai/recommendations/:id/accept', async (request, reply) => {
        const user = (request as any).user;
        if (!user) return reply.status(401).send({ success: false, error: 'Unauthorized' });

        const { id } = request.params;

        try {
            const rec = await recommendationRepo.findById(id);
            if (!rec) return reply.status(404).send({ success: false, error: 'Recommendation not found' });
            if (rec.organizationId !== user.orgId) return reply.status(403).send({ success: false, error: 'Forbidden' });
            if (rec.status !== 'PENDING') {
                return reply.status(400).send({ success: false, error: `Cannot accept a ${rec.status} recommendation` });
            }

            await recommendationRepo.updateStatus(id, 'ACCEPTED');

            // Execute asynchronously — don't block response
            executeRecommendation(rec as any).catch((err) =>
                fastify.log.error(`[Autopilot] Failed to execute rec ${id}: ${err.message}`)
            );

            return reply.send({ success: true, data: { id, status: 'ACCEPTED', message: 'Being executed in background' } });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return reply.status(500).send({ success: false, error: message });
        }
    });

    /**
     * POST /ai/recommendations/:id/dismiss
     */
    fastify.post<{ Params: { id: string } }>('/ai/recommendations/:id/dismiss', async (request, reply) => {
        const user = (request as any).user;
        if (!user) return reply.status(401).send({ success: false, error: 'Unauthorized' });

        const { id } = request.params;

        try {
            const rec = await recommendationRepo.findById(id);
            if (!rec) return reply.status(404).send({ success: false, error: 'Recommendation not found' });
            if (rec.organizationId !== user.orgId) return reply.status(403).send({ success: false, error: 'Forbidden' });
            if (rec.status !== 'PENDING') {
                return reply.status(400).send({ success: false, error: `Cannot dismiss a ${rec.status} recommendation` });
            }

            const updated = await recommendationRepo.updateStatus(id, 'DISMISSED');
            return reply.send({ success: true, data: updated });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return reply.status(500).send({ success: false, error: message });
        }
    });
}
