/**
 * brands.router.ts — Brand CRUD endpoints.
 *
 * GET    /brands               — list all brands for current org
 * GET    /brands/:id           — get one brand
 * POST   /brands               — create brand
 * PATCH  /brands/:id           — update brand
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@agency/db';
import { requireAuth } from '../auth/auth.middleware';

export async function brandsRoutes(fastify: FastifyInstance) {
    // ── GET /brands ─────────────────────────────────────────────────────────
    fastify.get('/brands', { preHandler: requireAuth }, async (req, reply) => {
        const userId = (req as any).user?.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return reply.status(401).send({ error: 'Unauthorized' });

        const brands = await prisma.brand.findMany({
            where: { organizationId: user.organizationId },
            orderBy: { followerCount: 'desc' },
        });
        return reply.send(brands);
    });

    // ── GET /brands/:id ─────────────────────────────────────────────────────
    fastify.get<{ Params: { id: string } }>(
        '/brands/:id',
        { preHandler: requireAuth },
        async (req, reply) => {
            const userId = (req as any).user?.userId;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return reply.status(401).send({ error: 'Unauthorized' });

            const brand = await prisma.brand.findFirst({
                where: { id: req.params.id, organizationId: user.organizationId },
            });
            if (!brand) return reply.status(404).send({ error: 'Brand not found' });
            return reply.send(brand);
        }
    );

    // ── POST /brands ────────────────────────────────────────────────────────
    fastify.post('/brands', { preHandler: requireAuth }, async (req, reply) => {
        const userId = (req as any).user?.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return reply.status(401).send({ error: 'Unauthorized' });

        const body = req.body as Record<string, any>;
        const brand = await prisma.brand.create({
            data: {
                organizationId: user.organizationId,
                name: body.name,
                instagramHandle: body.instagramHandle,
                instagramUserId: body.instagramUserId,
                websiteUrl: body.websiteUrl,
                metaAdAccountId: body.metaAdAccountId,
                googleAdsCustomerId: body.googleAdsCustomerId,
                tiktokAdvertiserId: body.tiktokAdvertiserId,
                followerCount: body.followerCount,
                description: body.description,
            },
        });
        return reply.status(201).send(brand);
    });

    // ── PATCH /brands/:id ───────────────────────────────────────────────────
    fastify.patch<{ Params: { id: string } }>(
        '/brands/:id',
        { preHandler: requireAuth },
        async (req, reply) => {
            const userId = (req as any).user?.userId;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return reply.status(401).send({ error: 'Unauthorized' });

            const existing = await prisma.brand.findFirst({
                where: { id: req.params.id, organizationId: user.organizationId },
            });
            if (!existing) return reply.status(404).send({ error: 'Brand not found' });

            const brand = await prisma.brand.update({
                where: { id: req.params.id },
                data: req.body as any,
            });
            return reply.send(brand);
        }
    );
}
