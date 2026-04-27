import { FastifyRequest, FastifyReply } from 'fastify';
import { checkPlanLimit } from '../modules/billing/plans';

/**
 * Fastify preHandler that enforces plan limits before allowing
 * ad generation or campaign creation.
 *
 * Usage:
 *   fastify.post('/ads/generate', { preHandler: [requirePlanLimit('maxAdsPerMonth')] }, handler)
 *   fastify.post('/campaigns', { preHandler: [requirePlanLimit('maxCampaigns')] }, handler)
 *
 * The organizationId must be present in either:
 *   - request.body.organizationId
 *   - request.query.organizationId
 *   - request.params.organizationId
 */
export function requirePlanLimit(resource: 'maxAdsPerMonth' | 'maxCampaigns') {
    return async function planLimitPreHandler(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const body = (request.body as Record<string, unknown>) || {};
        const query = (request.query as Record<string, unknown>) || {};
        const params = (request.params as Record<string, unknown>) || {};

        const organizationId =
            (body.organizationId as string) ||
            (query.organizationId as string) ||
            (params.organizationId as string);

        if (!organizationId) {
            return reply.status(400).send({
                error: 'organizationId is required',
                code: 'MISSING_ORG_ID',
            });
        }

        try {
            await checkPlanLimit(organizationId, resource);
        } catch (err: any) {
            if (err.code === 'PLAN_LIMIT_EXCEEDED') {
                return reply.status(403).send({
                    error: err.message,
                    code: 'PLAN_LIMIT_EXCEEDED',
                    upgrade: true,
                });
            }
            throw err;
        }
    };
}
