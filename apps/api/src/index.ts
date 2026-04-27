import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from monorepo root
config({ path: resolve(__dirname, '../../../.env') });

import { validateEnv } from './lib/env';

// Validate environment before anything else
validateEnv();

import Fastify from "fastify";
import { authRoutes } from "./modules/auth/auth.router";
import { generateRoutes } from "./modules/generate/generate.router";
import { aiBrainRoutes } from "./modules/ai-brain/ai-brain.router";
import { publishRoutes } from "./modules/publish/routes";
import { analyticsRoutes } from "./modules/analytics/analytics.router";
import { billingRoutes } from "./modules/billing/billing.routes";
import { notificationRoutes } from "./modules/notifications/notifications.routes";
import { mediaRoutes } from "./modules/media/routes";
import { copyRoutes } from "./modules/copy/copy.routes";
import { auditsRoutes } from "./modules/audits/audits.router";
import { brandsRoutes } from "./modules/brands/brands.router";
import { brandMemoryRoutes } from "./modules/brand-memory/brand-memory.router";
import { claudeDesignRoutes } from "./modules/claude-design/claude-design.router";
import { globalErrorHandler } from "./lib/error-handler";
import { prisma } from "@agency/db";
import { getRedis } from "./lib/redis";

const isProd = process.env.NODE_ENV === 'production';

const server = Fastify({
    logger: isProd
        ? { level: 'info' }   // JSON logs in production (Fastify default)
        : { level: 'info', transport: { target: 'pino-pretty' } },
    bodyLimit: 1_048_576,      // 1 MB body limit
    genReqId: () => `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

// ─── Global Error Handler ────────────────────────────────────────────────────
server.setErrorHandler(globalErrorHandler);

// ─── Security Headers & CORS ─────────────────────────────────────────────────
server.addHook('onRequest', async (request, reply) => {
    const origin = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    reply.header('Access-Control-Allow-Credentials', 'true');

    // Security headers
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '0');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (isProd) {
        reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    if (request.method === 'OPTIONS') {
        reply.status(204).send();
    }
});

// ─── Health & Readiness ──────────────────────────────────────────────────────
server.get("/health", async () => {
    const checks: Record<string, string> = { status: "ok", ts: new Date().toISOString() };

    // DB check
    try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = "ok";
    } catch {
        checks.database = "error";
        checks.status = "degraded";
    }

    // Redis check
    try {
        const redis = getRedis();
        await redis.ping();
        checks.redis = "ok";
    } catch {
        checks.redis = "error";
        checks.status = "degraded";
    }

    return checks;
});

server.get("/", async () => ({ service: "AdAgency AI API", version: "1.0.0" }));

// ─── Register All Route Plugins ──────────────────────────────────────────────
server.register(authRoutes);
server.register(generateRoutes);
server.register(aiBrainRoutes);
server.register(publishRoutes);
server.register(analyticsRoutes);
server.register(billingRoutes);
server.register(notificationRoutes);
server.register(mediaRoutes);
server.register(copyRoutes);
server.register(auditsRoutes);
server.register(brandsRoutes);
server.register(brandMemoryRoutes);
server.register(claudeDesignRoutes);

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
async function shutdown(signal: string) {
    server.log.info(`Received ${signal}, shutting down gracefully…`);
    try {
        await server.close();
        await prisma.$disconnect();
        server.log.info('Server closed.');
        process.exit(0);
    } catch (err) {
        server.log.error(err, 'Error during shutdown');
        process.exit(1);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Start ───────────────────────────────────────────────────────────────────
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3001', 10);
        await server.listen({ port, host: "0.0.0.0" });
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
