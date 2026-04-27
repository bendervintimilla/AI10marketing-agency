/**
 * claude-design.router.ts — HTTP entrypoints for the Claude creative director.
 *
 * POST /brands/:brandId/claude-design/brief    — generate creative brief
 * POST /brands/:brandId/claude-design/prompt   — convert brief to image-gen prompt
 * POST /brands/:brandId/claude-design/critique — evaluate a generated image URL
 * POST /brands/:brandId/claude-design/caption  — write on-brand copy/hashtags
 *
 * Each endpoint loads BrandMemory automatically and logs a RAG_QUERY event
 * so the audit trail captures every Claude call against a tenant's memory.
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '@agency/db';
import { requireAuth } from '../auth/auth.middleware';
import {
    brief,
    prompt,
    critique,
    caption,
    loadBrandMemoryForClaude,
} from '../../services/claude-design/claude-design.service';
import { chat as chatService } from '../../services/claude-design/claude-design.chat';

async function loadAuthorizedMemory(req: any, reply: any, brandId: string) {
    const userId = (req as any).user?.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        reply.status(401).send({ error: 'Unauthorized' });
        return null;
    }
    const memory = await loadBrandMemoryForClaude(user.organizationId, brandId);
    if (!memory) {
        reply.status(404).send({ error: 'Brand not found' });
        return null;
    }
    const brandMemoryRow = await prisma.brandMemory.findUnique({
        where: { brandId },
    });
    return { user, memory, brandMemoryRow };
}

export async function claudeDesignRoutes(fastify: FastifyInstance) {
    // ── POST /brands/:brandId/claude-design/brief ───────────────────────────
    fastify.post<{
        Params: { brandId: string };
        Body: {
            goal: string;
            platform: 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK';
            format: 'REEL' | 'STORY' | 'POST' | 'CAROUSEL';
        };
    }>(
        '/brands/:brandId/claude-design/brief',
        { preHandler: requireAuth },
        async (req, reply) => {
            const ctx = await loadAuthorizedMemory(req, reply, req.params.brandId);
            if (!ctx) return;

            try {
                const result = await brief({
                    memory: ctx.memory,
                    goal: req.body.goal,
                    platform: req.body.platform,
                    format: req.body.format,
                });
                if (ctx.brandMemoryRow) {
                    await prisma.brandMemoryEvent
                        .create({
                            data: {
                                organizationId: ctx.brandMemoryRow.organizationId,
                                brandMemoryId: ctx.brandMemoryRow.id,
                                actorId: ctx.user.id,
                                action: 'RAG_QUERY',
                                context: { kind: 'brief', goal: req.body.goal },
                            },
                        })
                        .catch(() => {});
                }
                return reply.send(result);
            } catch (err: any) {
                req.log.error(err, 'claude-design brief failed');
                return reply
                    .status(500)
                    .send({ error: 'claude_design_failed', message: err.message });
            }
        }
    );

    // ── POST /brands/:brandId/claude-design/prompt ──────────────────────────
    fastify.post<{
        Params: { brandId: string };
        Body: {
            brief: any;
            aspectRatio: '1:1' | '9:16' | '16:9' | '4:5';
            renderer: 'imagen' | 'flux' | 'sdxl';
        };
    }>(
        '/brands/:brandId/claude-design/prompt',
        { preHandler: requireAuth },
        async (req, reply) => {
            const ctx = await loadAuthorizedMemory(req, reply, req.params.brandId);
            if (!ctx) return;

            try {
                const result = await prompt({
                    memory: ctx.memory,
                    brief: req.body.brief,
                    aspectRatio: req.body.aspectRatio,
                    renderer: req.body.renderer,
                });
                return reply.send(result);
            } catch (err: any) {
                req.log.error(err, 'claude-design prompt failed');
                return reply
                    .status(500)
                    .send({ error: 'claude_design_failed', message: err.message });
            }
        }
    );

    // ── POST /brands/:brandId/claude-design/critique ────────────────────────
    fastify.post<{
        Params: { brandId: string };
        Body: { brief: any; imageUrl: string; highQuality?: boolean };
    }>(
        '/brands/:brandId/claude-design/critique',
        { preHandler: requireAuth },
        async (req, reply) => {
            const ctx = await loadAuthorizedMemory(req, reply, req.params.brandId);
            if (!ctx) return;

            try {
                const result = await critique({
                    memory: ctx.memory,
                    brief: req.body.brief,
                    imageUrl: req.body.imageUrl,
                    highQuality: req.body.highQuality,
                });
                return reply.send(result);
            } catch (err: any) {
                req.log.error(err, 'claude-design critique failed');
                return reply
                    .status(500)
                    .send({ error: 'claude_design_failed', message: err.message });
            }
        }
    );

    // ── POST /brands/:brandId/claude-design/chat ────────────────────────────
    fastify.post<{
        Params: { brandId: string };
        Body: {
            messages: { role: 'user' | 'assistant'; content: any }[];
        };
    }>(
        '/brands/:brandId/claude-design/chat',
        { preHandler: requireAuth },
        async (req, reply) => {
            const userId = (req as any).user?.userId;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return reply.status(401).send({ error: 'Unauthorized' });

            const brand = await prisma.brand.findFirst({
                where: { id: req.params.brandId, organizationId: user.organizationId },
            });
            if (!brand) return reply.status(404).send({ error: 'Brand not found' });

            if (!Array.isArray(req.body.messages) || req.body.messages.length === 0) {
                return reply.status(400).send({ error: 'messages array is required' });
            }

            try {
                const result = await chatService({
                    organizationId: user.organizationId,
                    brandId: brand.id,
                    userId: user.id,
                    messages: req.body.messages,
                });
                return reply.send(result);
            } catch (err: any) {
                req.log.error(err, 'claude-design chat failed');
                return reply
                    .status(500)
                    .send({ error: 'claude_design_chat_failed', message: err.message });
            }
        }
    );

    // ── POST /brands/:brandId/claude-design/caption ─────────────────────────
    fastify.post<{
        Params: { brandId: string };
        Body: {
            brief: any;
            platform: 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK';
            maxChars?: number;
        };
    }>(
        '/brands/:brandId/claude-design/caption',
        { preHandler: requireAuth },
        async (req, reply) => {
            const ctx = await loadAuthorizedMemory(req, reply, req.params.brandId);
            if (!ctx) return;

            try {
                const result = await caption({
                    memory: ctx.memory,
                    brief: req.body.brief,
                    platform: req.body.platform,
                    maxChars: req.body.maxChars,
                });
                return reply.send(result);
            } catch (err: any) {
                req.log.error(err, 'claude-design caption failed');
                return reply
                    .status(500)
                    .send({ error: 'claude_design_failed', message: err.message });
            }
        }
    );
}
