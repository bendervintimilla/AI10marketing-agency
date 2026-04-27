import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
    generateCopy,
    regenerateCopy,
    getTrendingHashtags,
} from './copy.service';

interface GenerateBody { adId: string }
interface RegenerateBody { adId: string; guidance?: string }
interface TrendingQuery { platform: string; industry: string }

export async function copyRoutes(fastify: FastifyInstance) {
    // POST /copy/generate
    fastify.post<{ Body: GenerateBody }>('/copy/generate', async (req, reply) => {
        try {
            const { adId } = req.body;
            if (!adId) {
                return reply.status(400).send({ error: 'adId is required' });
            }
            const result = await generateCopy(adId);
            return reply.send(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Copy generation failed';
            const statusCode = message.includes('not found') ? 404 : 500;
            return reply.status(statusCode).send({ error: message });
        }
    });

    // POST /copy/regenerate
    fastify.post<{ Body: RegenerateBody }>('/copy/regenerate', async (req, reply) => {
        try {
            const { adId, guidance } = req.body;
            if (!adId) {
                return reply.status(400).send({ error: 'adId is required' });
            }
            const result = await regenerateCopy(adId, guidance);
            return reply.send(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Copy regeneration failed';
            const statusCode = message.includes('not found') ? 404 : 500;
            return reply.status(statusCode).send({ error: message });
        }
    });

    // GET /copy/trending-hashtags
    fastify.get<{ Querystring: TrendingQuery }>('/copy/trending-hashtags', async (req, reply) => {
        try {
            const { platform, industry } = req.query;
            if (!platform || !industry) {
                return reply.status(400).send({ error: 'platform and industry query params are required' });
            }
            const hashtags = await getTrendingHashtags(platform as any, industry);
            return reply.send({ hashtags });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch trending hashtags';
            return reply.status(500).send({ error: message });
        }
    });
}
