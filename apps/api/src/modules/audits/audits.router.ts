/**
 * audits.router.ts — Audit endpoints for the dashboard.
 *
 * POST  /audits                       — enqueue a new audit run
 * GET   /audits/:id                   — get run status, score, summary
 * GET   /audits/:id/checks            — get all check results
 * GET   /audits/:id/report            — get rendered Markdown report
 * GET   /brands/:brandId/audits       — list audits for a brand
 * GET   /brands/:brandId/audits/score-history — score trend per platform
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@agency/db';
import { requireAuth } from '../auth/auth.middleware';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const auditQueue = new Queue('run-audit', { connection });

type AuditPlatform = 'INSTAGRAM' | 'META' | 'GOOGLE' | 'TIKTOK' | 'YOUTUBE' | 'LANDING';

const VALID_PLATFORMS: AuditPlatform[] = [
    'INSTAGRAM', 'META', 'GOOGLE', 'TIKTOK', 'YOUTUBE', 'LANDING',
];

export async function auditsRoutes(fastify: FastifyInstance) {
    // ── POST /audits ────────────────────────────────────────────────────────
    fastify.post<{ Body: { brandId: string; platform: AuditPlatform } }>(
        '/audits',
        { preHandler: requireAuth },
        async (req, reply) => {
            const { brandId, platform } = req.body;

            if (!brandId || !platform) {
                return reply.status(400).send({ error: 'brandId and platform required' });
            }
            if (!VALID_PLATFORMS.includes(platform)) {
                return reply.status(400).send({
                    error: `platform must be one of ${VALID_PLATFORMS.join(', ')}`,
                });
            }

            // Verify brand exists and belongs to this org
            const userId = (req as any).user?.userId;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return reply.status(401).send({ error: 'Unauthorized' });

            const brand = await prisma.brand.findFirst({
                where: { id: brandId, organizationId: user.organizationId },
            });
            if (!brand) return reply.status(404).send({ error: 'Brand not found' });

            // Create AuditRun in QUEUED state
            const auditRun = await prisma.auditRun.create({
                data: {
                    brandId,
                    platform,
                    status: 'QUEUED',
                    triggeredBy: userId,
                },
            });

            // Enqueue background job
            await auditQueue.add('run-audit', {
                auditRunId: auditRun.id,
                brandId,
                platform,
                triggeredBy: userId,
            }, {
                jobId: auditRun.id,
                attempts: 2,
                backoff: { type: 'exponential', delay: 3000 },
                removeOnComplete: 100,
                removeOnFail: 50,
            });

            return reply.status(202).send(auditRun);
        }
    );

    // ── GET /audits/:id ─────────────────────────────────────────────────────
    fastify.get<{ Params: { id: string } }>(
        '/audits/:id',
        { preHandler: requireAuth },
        async (req, reply) => {
            const userId = (req as any).user?.userId;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return reply.status(401).send({ error: 'Unauthorized' });

            const run = await prisma.auditRun.findUnique({
                where: { id: req.params.id },
                include: { brand: true },
            });
            if (!run) return reply.status(404).send({ error: 'Audit not found' });
            if (run.brand.organizationId !== user.organizationId) {
                return reply.status(403).send({ error: 'Forbidden' });
            }

            return reply.send(run);
        }
    );

    // ── GET /audits/:id/checks ──────────────────────────────────────────────
    fastify.get<{ Params: { id: string } }>(
        '/audits/:id/checks',
        { preHandler: requireAuth },
        async (req, reply) => {
            const userId = (req as any).user?.userId;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return reply.status(401).send({ error: 'Unauthorized' });

            const run = await prisma.auditRun.findUnique({
                where: { id: req.params.id },
                include: { brand: true, checks: true },
            });
            if (!run) return reply.status(404).send({ error: 'Audit not found' });
            if (run.brand.organizationId !== user.organizationId) {
                return reply.status(403).send({ error: 'Forbidden' });
            }

            return reply.send({
                checks: run.checks,
                summary: run.summary,
                score: run.score,
                grade: run.grade,
            });
        }
    );

    // ── GET /audits/:id/report ──────────────────────────────────────────────
    fastify.get<{ Params: { id: string } }>(
        '/audits/:id/report',
        { preHandler: requireAuth },
        async (req, reply) => {
            const userId = (req as any).user?.userId;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return reply.status(401).send({ error: 'Unauthorized' });

            const run = await prisma.auditRun.findUnique({
                where: { id: req.params.id },
                include: { brand: true, report: true },
            });
            if (!run) return reply.status(404).send({ error: 'Audit not found' });
            if (run.brand.organizationId !== user.organizationId) {
                return reply.status(403).send({ error: 'Forbidden' });
            }
            if (!run.report) return reply.status(404).send({ error: 'Report not yet generated' });

            return reply.send({
                markdown: run.report.markdown,
                generatedAt: run.report.generatedAt,
            });
        }
    );

    // ── GET /brands/:brandId/audits ─────────────────────────────────────────
    fastify.get<{ Params: { brandId: string }; Querystring: { platform?: AuditPlatform; limit?: string } }>(
        '/brands/:brandId/audits',
        { preHandler: requireAuth },
        async (req, reply) => {
            const userId = (req as any).user?.userId;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return reply.status(401).send({ error: 'Unauthorized' });

            const brand = await prisma.brand.findFirst({
                where: { id: req.params.brandId, organizationId: user.organizationId },
            });
            if (!brand) return reply.status(404).send({ error: 'Brand not found' });

            const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 200);

            const runs = await prisma.auditRun.findMany({
                where: {
                    brandId: req.params.brandId,
                    ...(req.query.platform ? { platform: req.query.platform } : {}),
                },
                orderBy: { startedAt: 'desc' },
                take: limit,
            });

            return reply.send(runs);
        }
    );

    // ── GET /brands/:brandId/audits/score-history ───────────────────────────
    fastify.get<{ Params: { brandId: string } }>(
        '/brands/:brandId/audits/score-history',
        { preHandler: requireAuth },
        async (req, reply) => {
            const userId = (req as any).user?.userId;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return reply.status(401).send({ error: 'Unauthorized' });

            const brand = await prisma.brand.findFirst({
                where: { id: req.params.brandId, organizationId: user.organizationId },
            });
            if (!brand) return reply.status(404).send({ error: 'Brand not found' });

            const runs = await prisma.auditRun.findMany({
                where: { brandId: req.params.brandId, status: 'COMPLETED' },
                select: { id: true, platform: true, score: true, grade: true, completedAt: true },
                orderBy: { completedAt: 'asc' },
            });

            // Group by platform for chart consumption
            const byPlatform: Record<string, any[]> = {};
            for (const r of runs) {
                byPlatform[r.platform] = byPlatform[r.platform] ?? [];
                byPlatform[r.platform].push({
                    score: r.score,
                    grade: r.grade,
                    date: r.completedAt,
                });
            }

            return reply.send({ byPlatform });
        }
    );
}
