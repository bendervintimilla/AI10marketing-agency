import { FastifyInstance } from 'fastify';
import { recommendationRoutes } from './routes/recommendations';
import { insightsRoutes } from './routes/insights';
import { chatRoutes } from './routes/chat';
import { internalRoutes } from './routes/internal';
import { overviewRoutes } from './routes/overview';

/**
 * AI Brain Fastify Plugin
 * Register at root — routes are pre-prefixed with /ai
 *
 * Public routes:
 *   GET  /ai/insights/overview
 *   GET  /ai/insights/:campaignId
 *   GET  /ai/recommendations?status=&campaignId=
 *   POST /ai/recommendations/:id/accept
 *   POST /ai/recommendations/:id/dismiss
 *   POST /ai/chat
 *
 * Internal routes (x-worker-secret header required):
 *   POST /ai/internal/analyze
 *   POST /ai/internal/autopilot
 */
export async function aiBrainRoutes(fastify: FastifyInstance) {
    await fastify.register(overviewRoutes);
    await fastify.register(recommendationRoutes);
    await fastify.register(insightsRoutes);
    await fastify.register(chatRoutes);
    await fastify.register(internalRoutes);
}
