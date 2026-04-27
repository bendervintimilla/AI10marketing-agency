import { FastifyInstance } from 'fastify';
import { handleChat } from '../services/chat';
import { ChatRequestSchema } from '@agency/shared';

export async function chatRoutes(fastify: FastifyInstance) {
    /**
     * POST /ai/chat
     * Body: { orgId, messages: [{role, content}] }
     */
    fastify.post('/ai/chat', async (request, reply) => {
        const user = (request as any).user;
        if (!user) return reply.status(401).send({ success: false, error: 'Unauthorized' });

        const parsed = ChatRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                success: false,
                error: 'Invalid request body',
                details: parsed.error.errors,
            });
        }

        const { orgId, messages } = parsed.data;

        if (user.orgId !== orgId) {
            return reply.status(403).send({ success: false, error: 'Forbidden: org mismatch' });
        }

        try {
            const reply2 = await handleChat(orgId, messages);
            return reply.send({ success: true, data: { reply: reply2 } });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return reply.status(500).send({ success: false, error: message });
        }
    });
}
