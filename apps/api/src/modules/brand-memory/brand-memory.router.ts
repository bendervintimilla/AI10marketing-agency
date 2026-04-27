/**
 * brand-memory.router.ts — BrandMemory + BrandAsset endpoints.
 *
 * BrandMemory holds per-tenant, per-brand structured context (palettes, voice,
 * personas, legal constraints) used by AI generation pipelines. BrandAsset
 * stores binary references (logos, photos, b-roll) linked to a BrandMemory.
 *
 * Multi-tenant safety: every query scopes by organizationId derived from the
 * authenticated user's session. organizationId is also denormalized onto
 * BrandMemory and BrandAsset for defense-in-depth.
 *
 * GET    /brands/:brandId/memory             — read full memory for a brand
 * PUT    /brands/:brandId/memory             — upsert memory (idempotent)
 * GET    /brands/:brandId/memory/assets      — list assets
 * POST   /brands/:brandId/memory/assets      — register a new asset (after upload)
 * DELETE /brands/:brandId/memory/assets/:id  — delete asset
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '@agency/db';
import { requireAuth } from '../auth/auth.middleware';

async function resolveTenantBrand(req: any, reply: any, brandId: string) {
    const userId = (req as any).user?.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        reply.status(401).send({ error: 'Unauthorized' });
        return null;
    }
    const brand = await prisma.brand.findFirst({
        where: { id: brandId, organizationId: user.organizationId },
    });
    if (!brand) {
        reply.status(404).send({ error: 'Brand not found' });
        return null;
    }
    return { user, brand };
}

async function logEvent(
    organizationId: string,
    brandMemoryId: string,
    actorId: string | null,
    action:
        | 'READ'
        | 'WRITE'
        | 'DELETE'
        | 'RAG_QUERY'
        | 'ASSET_UPLOAD'
        | 'ASSET_DELETE',
    context?: Record<string, unknown>
) {
    await prisma.brandMemoryEvent
        .create({
            data: {
                organizationId,
                brandMemoryId,
                actorId,
                action,
                context: (context ?? undefined) as any,
            },
        })
        .catch(() => {
            // Non-blocking: never fail a request because the audit log failed
        });
}

export async function brandMemoryRoutes(fastify: FastifyInstance) {
    // ── GET /brands/:brandId/memory ─────────────────────────────────────────
    fastify.get<{ Params: { brandId: string } }>(
        '/brands/:brandId/memory',
        { preHandler: requireAuth },
        async (req, reply) => {
            const ctx = await resolveTenantBrand(req, reply, req.params.brandId);
            if (!ctx) return;

            let memory = await prisma.brandMemory.findUnique({
                where: { brandId: ctx.brand.id },
                include: {
                    assets: { orderBy: { createdAt: 'desc' } },
                },
            });

            // Auto-create empty memory on first read
            if (!memory) {
                memory = await prisma.brandMemory.create({
                    data: {
                        organizationId: ctx.brand.organizationId,
                        brandId: ctx.brand.id,
                    },
                    include: { assets: true },
                });
            }

            await logEvent(memory.organizationId, memory.id, ctx.user.id, 'READ');
            return reply.send(memory);
        }
    );

    // ── PUT /brands/:brandId/memory ─────────────────────────────────────────
    fastify.put<{ Params: { brandId: string }; Body: Record<string, any> }>(
        '/brands/:brandId/memory',
        { preHandler: requireAuth },
        async (req, reply) => {
            const ctx = await resolveTenantBrand(req, reply, req.params.brandId);
            if (!ctx) return;

            const allowedFields = [
                'visualIdentity',
                'voiceProfile',
                'productCatalog',
                'audiencePersonas',
                'competitorRefs',
                'legalConstraints',
                'designSystem',
                'notes',
            ] as const;

            const data: Record<string, unknown> = {};
            for (const f of allowedFields) {
                if (f in req.body) data[f] = req.body[f];
            }

            const memory = await prisma.brandMemory.upsert({
                where: { brandId: ctx.brand.id },
                create: {
                    organizationId: ctx.brand.organizationId,
                    brandId: ctx.brand.id,
                    ...data,
                },
                update: data,
            });

            await logEvent(memory.organizationId, memory.id, ctx.user.id, 'WRITE', {
                fields: Object.keys(data),
            });
            return reply.send(memory);
        }
    );

    // ── GET /brands/:brandId/memory/assets ──────────────────────────────────
    fastify.get<{
        Params: { brandId: string };
        Querystring: { type?: string; limit?: string };
    }>(
        '/brands/:brandId/memory/assets',
        { preHandler: requireAuth },
        async (req, reply) => {
            const ctx = await resolveTenantBrand(req, reply, req.params.brandId);
            if (!ctx) return;

            const memory = await prisma.brandMemory.findUnique({
                where: { brandId: ctx.brand.id },
            });
            if (!memory) return reply.send([]);

            const limit = Math.min(parseInt(req.query.limit ?? '50', 10) || 50, 200);
            const assets = await prisma.brandAsset.findMany({
                where: {
                    organizationId: memory.organizationId,
                    brandMemoryId: memory.id,
                    ...(req.query.type ? { type: req.query.type as any } : {}),
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            });
            return reply.send(assets);
        }
    );

    // ── POST /brands/:brandId/memory/assets ─────────────────────────────────
    fastify.post<{
        Params: { brandId: string };
        Body: {
            type: string;
            url: string;
            mimeType: string;
            width?: number;
            height?: number;
            durationSec?: number;
            fileSizeBytes?: number;
            caption?: string;
            tags?: string[];
            usageRights?: Record<string, unknown>;
            source?: string;
        };
    }>(
        '/brands/:brandId/memory/assets',
        { preHandler: requireAuth },
        async (req, reply) => {
            const ctx = await resolveTenantBrand(req, reply, req.params.brandId);
            if (!ctx) return;

            // Ensure memory row exists (lazy create)
            const memory = await prisma.brandMemory.upsert({
                where: { brandId: ctx.brand.id },
                create: {
                    organizationId: ctx.brand.organizationId,
                    brandId: ctx.brand.id,
                },
                update: {},
            });

            if (!req.body.type || !req.body.url || !req.body.mimeType) {
                return reply
                    .status(400)
                    .send({ error: 'type, url and mimeType are required' });
            }

            const asset = await prisma.brandAsset.create({
                data: {
                    organizationId: memory.organizationId,
                    brandMemoryId: memory.id,
                    type: req.body.type as any,
                    url: req.body.url,
                    mimeType: req.body.mimeType,
                    width: req.body.width ?? null,
                    height: req.body.height ?? null,
                    durationSec: req.body.durationSec ?? null,
                    fileSizeBytes: req.body.fileSizeBytes ?? null,
                    caption: req.body.caption ?? null,
                    tags: req.body.tags ?? [],
                    usageRights: (req.body.usageRights ?? undefined) as any,
                    source: req.body.source ?? 'user_upload',
                },
            });

            await logEvent(
                memory.organizationId,
                memory.id,
                ctx.user.id,
                'ASSET_UPLOAD',
                { assetId: asset.id, type: asset.type }
            );
            return reply.status(201).send(asset);
        }
    );

    // ── DELETE /brands/:brandId/memory/assets/:id ───────────────────────────
    fastify.delete<{ Params: { brandId: string; id: string } }>(
        '/brands/:brandId/memory/assets/:id',
        { preHandler: requireAuth },
        async (req, reply) => {
            const ctx = await resolveTenantBrand(req, reply, req.params.brandId);
            if (!ctx) return;

            const memory = await prisma.brandMemory.findUnique({
                where: { brandId: ctx.brand.id },
            });
            if (!memory) return reply.status(404).send({ error: 'Memory not found' });

            const asset = await prisma.brandAsset.findFirst({
                where: {
                    id: req.params.id,
                    organizationId: memory.organizationId,
                    brandMemoryId: memory.id,
                },
            });
            if (!asset) return reply.status(404).send({ error: 'Asset not found' });

            await prisma.brandAsset.delete({ where: { id: asset.id } });
            await logEvent(
                memory.organizationId,
                memory.id,
                ctx.user.id,
                'ASSET_DELETE',
                { assetId: asset.id }
            );
            return reply.status(204).send();
        }
    );
}
