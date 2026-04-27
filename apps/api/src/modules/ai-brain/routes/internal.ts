import { FastifyInstance } from 'fastify';
import { generateForOrg } from '../services/recommendation-engine';
import { recommendation as recommendationRepo } from '@agency/db';
import { executeRecommendation } from '../services/autopilot';

const WORKER_SECRET = process.env.WORKER_SECRET || 'worker-secret';

function verifyWorkerSecret(request: any): boolean {
    return request.headers['x-worker-secret'] === WORKER_SECRET;
}

/**
 * Internal routes for worker-to-API communication.
 * Protected by a shared secret — NOT exposed to the public internet.
 */
export async function internalRoutes(fastify: FastifyInstance) {
    /**
     * POST /ai/internal/analyze
     * Triggers full recommendation generation for an org.
     * Called by the ai-recommendation BullMQ worker.
     */
    fastify.post('/ai/internal/analyze', async (request, reply) => {
        if (!verifyWorkerSecret(request)) {
            return reply.status(401).send({ success: false, error: 'Unauthorized' });
        }

        const { orgId } = request.body as { orgId: string };
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'orgId is required' });
        }

        try {
            await generateForOrg(orgId);
            return reply.send({ success: true, message: `Recommendations generated for org ${orgId}` });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            fastify.log.error(`[Internal] Analyze failed for org ${orgId}: ${message}`);
            return reply.status(500).send({ success: false, error: message });
        }
    });

    /**
     * POST /ai/internal/autopilot
     * Executes pending recommendations for an org with autoPilot=true.
     * Called by the ai-autopilot BullMQ worker.
     */
    fastify.post('/ai/internal/autopilot', async (request, reply) => {
        if (!verifyWorkerSecret(request)) {
            return reply.status(401).send({ success: false, error: 'Unauthorized' });
        }

        const { orgId } = request.body as { orgId: string };
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'orgId is required' });
        }

        try {
            const staleRecs = await recommendationRepo.listStaleForAutopilot(orgId, 48);

            const results = await Promise.allSettled(
                staleRecs.map((rec) => executeRecommendation(rec as any))
            );

            const executed = results.filter((r) => r.status === 'fulfilled').length;
            const failed = results.filter((r) => r.status === 'rejected').length;

            return reply.send({
                success: true,
                message: `Autopilot: executed ${executed}, failed ${failed} of ${staleRecs.length} recommendations`,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            fastify.log.error(`[Internal] Autopilot failed for org ${orgId}: ${message}`);
            return reply.status(500).send({ success: false, error: message });
        }
    });
}
