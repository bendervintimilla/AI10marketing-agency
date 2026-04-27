import { prisma } from '@agency/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Redis from 'ioredis';
import type { Platform, ScoredHashtag } from '@agency/shared';
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HASHTAG_REDIS_TTL = 60 * 60; // 1 hour

// ─── Platforms to refresh ────────────────────────────────────────────────────

const ALL_PLATFORMS: Platform[] = ['INSTAGRAM', 'TIKTOK', 'FACEBOOK'];

// ─── Gemini hashtag generation ───────────────────────────────────────────────

async function generateHashtagsForIndustry(
    platform: Platform,
    industry: string,
): Promise<ScoredHashtag[]> {
    if (!GEMINI_API_KEY) {
        console.warn('[RefreshHashtags] No GEMINI_API_KEY — skipping AI generation');
        return [];
    }

    const platformLimits: Record<Platform, number> = {
        INSTAGRAM: 30,
        TIKTOK: 10,
        FACEBOOK: 10,
    };

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a social media hashtag expert. Generate ${platformLimits[platform]} currently trending hashtags for the ${industry} industry on ${platform}.

Return ONLY a valid JSON array. Each object must have:
- "tag": hashtag string (include # prefix)
- "score": overall quality score 0-100
- "velocity": trending speed 0-100 (100 = viral right now)
- "competition": competition level 0-100 (100 = very crowded)

Mix high-volume broad tags with niche targeted ones. Return only the JSON array, no explanation.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('No JSON found');
        return JSON.parse(jsonMatch[0]) as ScoredHashtag[];
    } catch (err) {
        console.error(`[RefreshHashtags] Gemini error for ${platform}/${industry}:`, err);
        return [];
    }
}

// ─── Main refresh function ───────────────────────────────────────────────────

export async function refreshAllHashtags(): Promise<void> {
    console.log('[RefreshHashtags] Starting daily hashtag refresh…');

    // Collect unique industries from organizations
    const organizations = await prisma.organization.findMany({
        select: { industry: true },
        distinct: ['industry'],
    });

    const industries = organizations
        .map((o: { industry: string | null }) => o.industry)
        .filter((i: string | null): i is string => !!i && i.trim() !== '');

    if (industries.length === 0) {
        console.log('[RefreshHashtags] No industries found — skipping');
        return;
    }

    let refreshedCount = 0;

    for (const industry of industries) {
        for (const platform of ALL_PLATFORMS) {
            try {
                const hashtags = await generateHashtagsForIndustry(platform, industry);
                if (hashtags.length === 0) continue;

                // Upsert into HashtagCache
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                await prisma.hashtagCache.upsert({
                    where: { platform_industry: { platform, industry } },
                    create: { platform, industry, hashtags: hashtags as object[], expiresAt },
                    update: { hashtags: hashtags as object[], expiresAt },
                });

                // Invalidate Redis cache so API picks up fresh data
                const cacheKey = `hashtags:${platform}:${industry.toLowerCase()}`;
                await redis.set(cacheKey, JSON.stringify(hashtags), 'EX', HASHTAG_REDIS_TTL);

                refreshedCount++;
                console.log(`[RefreshHashtags] ✓ ${platform} / ${industry} (${hashtags.length} tags)`);
            } catch (err) {
                console.error(`[RefreshHashtags] Error for ${platform}/${industry}:`, err);
            }
        }
    }

    console.log(`[RefreshHashtags] Done — refreshed ${refreshedCount} platform/industry pairs`);
}
