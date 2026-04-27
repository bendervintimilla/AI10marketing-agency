import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Simple in-memory sliding-window rate limiter.
 * No external dependencies — uses a Map to track request timestamps per IP.
 *
 * Usage:
 *   fastify.post('/auth/login', { preHandler: [rateLimit(10, 60_000)] }, handler)
 */

interface RateLimitEntry {
    timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        // Remove entries where all timestamps are older than 2 minutes
        if (entry.timestamps.every((ts) => now - ts > 120_000)) {
            store.delete(key);
        }
    }
}, 60_000);

/**
 * Creates a Fastify preHandler that rate-limits requests.
 * @param maxRequests  Maximum number of requests allowed in the window
 * @param windowMs    Window duration in milliseconds (default: 60000 = 1 min)
 */
export function rateLimit(maxRequests: number = 10, windowMs: number = 60_000) {
    return async function rateLimitHandler(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const ip = request.ip;
        const now = Date.now();

        let entry = store.get(ip);
        if (!entry) {
            entry = { timestamps: [] };
            store.set(ip, entry);
        }

        // Remove timestamps outside the window
        entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

        if (entry.timestamps.length >= maxRequests) {
            const retryAfter = Math.ceil(
                (entry.timestamps[0] + windowMs - now) / 1000
            );
            reply.header('Retry-After', retryAfter.toString());
            return reply.status(429).send({
                error: 'Too Many Requests',
                message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
                code: 'RATE_LIMIT_EXCEEDED',
            });
        }

        entry.timestamps.push(now);
    };
}
