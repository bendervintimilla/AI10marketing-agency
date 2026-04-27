import { createClient, RedisClientType } from 'redis';

// Simplified redis service setup with graceful fallback
let redisClient: RedisClientType | null = null;
let redisAvailable = false;

// In-memory fallback when Redis is not available
const memoryStore = new Map<string, string>();

async function getClient(): Promise<RedisClientType | null> {
    if (redisClient && redisAvailable) return redisClient;
    if (redisClient === null) {
        try {
            redisClient = createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
            }) as RedisClientType;
            redisClient.on('error', () => {
                redisAvailable = false;
            });
            await redisClient.connect();
            redisAvailable = true;
            console.log('[redis] Connected successfully');
            return redisClient;
        } catch {
            console.log('[redis] Not available — using in-memory fallback for refresh tokens');
            redisAvailable = false;
            return null;
        }
    }
    return null;
}

export const connectRedis = async () => {
    await getClient();
};

export class RedisCache {
    static async storeRefreshToken(userId: string, token: string): Promise<void> {
        const client = await getClient();
        if (client) {
            try {
                await client.set(`refresh_token:${userId}:${token}`, 'valid', { EX: 30 * 24 * 60 * 60 });
            } catch {
                memoryStore.set(`refresh_token:${userId}:${token}`, 'valid');
            }
        } else {
            memoryStore.set(`refresh_token:${userId}:${token}`, 'valid');
        }
    }

    static async isValidRefreshToken(userId: string, token: string): Promise<boolean> {
        const client = await getClient();
        if (client) {
            try {
                const value = await client.get(`refresh_token:${userId}:${token}`);
                return value === 'valid';
            } catch {
                return memoryStore.get(`refresh_token:${userId}:${token}`) === 'valid';
            }
        }
        return memoryStore.get(`refresh_token:${userId}:${token}`) === 'valid';
    }

    static async invalidateRefreshToken(userId: string, token: string): Promise<void> {
        const client = await getClient();
        if (client) {
            try { await client.del(`refresh_token:${userId}:${token}`); } catch { /* noop */ }
        }
        memoryStore.delete(`refresh_token:${userId}:${token}`);
    }

    static async invalidateAllUserTokens(userId: string): Promise<void> {
        const client = await getClient();
        if (client) {
            try {
                const keys = await client.keys(`refresh_token:${userId}:*`);
                if (keys.length > 0) await client.del(keys);
            } catch { /* noop */ }
        }
        // Also clear from memory store
        for (const key of memoryStore.keys()) {
            if (key.startsWith(`refresh_token:${userId}:`)) {
                memoryStore.delete(key);
            }
        }
    }
}
