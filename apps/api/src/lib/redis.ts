import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Singleton Redis client
let redisClient: Redis | null = null;

export function getRedis(): Redis {
    if (!redisClient) {
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });

        redisClient.on('error', (err) => {
            console.error('[Redis] Connection error:', err.message);
        });

        redisClient.on('connect', () => {
            console.log('[Redis] Connected');
        });
    }
    return redisClient;
}

/**
 * Get a cached JSON value by key. Returns null if missing or expired.
 */
export async function getCached<T>(key: string): Promise<T | null> {
    try {
        const redis = getRedis();
        const raw = await redis.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

/**
 * Set a JSON value with TTL (seconds).
 */
export async function setCached(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
        const redis = getRedis();
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
        console.warn('[Redis] Failed to write cache:', (err as Error).message);
    }
}

/**
 * Delete a cache key.
 */
export async function deleteCached(key: string): Promise<void> {
    try {
        const redis = getRedis();
        await redis.del(key);
    } catch (err) {
        console.warn('[Redis] Failed to delete cache key:', (err as Error).message);
    }
}
