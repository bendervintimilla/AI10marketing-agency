import { prisma } from '../../lib/prisma';
import { generateText } from '../../lib/gemini';
import { getCached, setCached, deleteCached } from '../../lib/redis';
import type {
    Platform,
    ScoredHashtag,
    CopyOutput,
    CaptionSuggestion,
} from '@agency/shared';
import { PLATFORM_HASHTAG_LIMITS } from '@agency/shared';

// Cache TTL constants
const HASHTAG_REDIS_TTL = 60 * 60; // 1 hour
const HASHTAG_REDIS_PREFIX = 'hashtags:';

// ─── Hashtag Cache ──────────────────────────────────────────────────────────

function hashtagCacheKey(platform: Platform, industry: string) {
    return `${HASHTAG_REDIS_PREFIX}${platform}:${industry.toLowerCase()}`;
}

/**
 * Fetch trending hashtags for a given platform + industry.
 * Checks Redis first (1h TTL), then DB HashtagCache, then falls back to Gemini generation.
 */
export async function getTrendingHashtags(
    platform: Platform,
    industry: string,
): Promise<ScoredHashtag[]> {
    const cacheKey = hashtagCacheKey(platform, industry);

    // 1. Try Redis
    const cached = await getCached<ScoredHashtag[]>(cacheKey);
    if (cached) return cached;

    // 2. Try DB
    const dbCache = await prisma.hashtagCache.findUnique({
        where: { platform_industry: { platform, industry } },
    });
    if (dbCache) {
        const hashtags = dbCache.hashtags as ScoredHashtag[];
        await setCached(cacheKey, hashtags, HASHTAG_REDIS_TTL);
        return hashtags;
    }

    // 3. Fallback: generate via Gemini
    const hashtags = await generateTrendingHashtagsFromGemini(platform, industry);
    await upsertHashtagCache(platform, industry, hashtags);
    return hashtags;
}

async function generateTrendingHashtagsFromGemini(
    platform: Platform,
    industry: string,
): Promise<ScoredHashtag[]> {
    const limit = PLATFORM_HASHTAG_LIMITS[platform].max;
    const prompt = `You are a social media hashtag expert. Generate ${limit} trending hashtags for the ${industry} industry on ${platform}.

Return ONLY a valid JSON array with no markdown or explanation. Each object must have:
- "tag": hashtag string (include # prefix)
- "score": overall quality score 0-100
- "velocity": trending speed 0-100 (100 = viral right now)
- "competition": competition level 0-100 (100 = very crowded, lower = better niche)

Mix high-volume broad tags with targeted niche tags. Make them realistic and currently relevant.

Example format:
[{"tag":"#FoodPhotography","score":85,"velocity":72,"competition":88},...]`;

    const raw = await generateText(prompt);

    try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('No JSON array found in response');
        return JSON.parse(jsonMatch[0]) as ScoredHashtag[];
    } catch {
        // Return safe fallback hashtags
        return Array.from({ length: 10 }, (_, i) => ({
            tag: `#${industry.replace(/\s+/g, '')}${i + 1}`,
            score: 50,
            velocity: 40,
            competition: 60,
        }));
    }
}

/**
 * Upsert hashtag data into DB and warm Redis cache.
 */
export async function upsertHashtagCache(
    platform: Platform,
    industry: string,
    hashtags: ScoredHashtag[],
): Promise<void> {
    await prisma.hashtagCache.upsert({
        where: { platform_industry: { platform, industry } },
        create: { platform, industry, hashtags: hashtags as object[], expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        update: { hashtags: hashtags as object[], expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
    const cacheKey = hashtagCacheKey(platform, industry);
    await setCached(cacheKey, hashtags, HASHTAG_REDIS_TTL);
}

/**
 * Invalidate Redis cache for a platform+industry pair.
 */
export async function invalidateHashtagCache(platform: Platform, industry: string): Promise<void> {
    await deleteCached(hashtagCacheKey(platform, industry));
}

// ─── Hashtag Selection ──────────────────────────────────────────────────────

/**
 * Select the best hashtags for a given ad, mixing trending + contextual.
 * Scoring: (score * 0.4) + (velocity * 0.4) + ((100 - competition) * 0.2)
 */
export async function selectHashtags(
    caption: string,
    platform: Platform,
    industry: string,
    contentKeywords: string[],
): Promise<string[]> {
    const { min, max } = PLATFORM_HASHTAG_LIMITS[platform];
    const trendingHashtags = await getTrendingHashtags(platform, industry);

    // Score hashtags by composite score
    const scored = trendingHashtags.map((h) => ({
        ...h,
        composite: h.score * 0.4 + h.velocity * 0.4 + (100 - h.competition) * 0.2,
    }));

    // Sort by composite score descending
    scored.sort((a, b) => b.composite - a.composite);

    // Take top 60% high-volume and 40% niche
    const totalNeeded = Math.min(max, Math.max(min, scored.length));
    const highVolumeCount = Math.ceil(totalNeeded * 0.6);
    const nicheCount = totalNeeded - highVolumeCount;

    const highVolume = scored.filter((h) => h.competition >= 50).slice(0, highVolumeCount);
    const niche = scored.filter((h) => h.competition < 50).slice(0, nicheCount);

    const selected = [...highVolume, ...niche].slice(0, max);

    // Always include at least `min` tags — top-up if needed
    if (selected.length < min) {
        const additional = scored.filter((h) => !selected.includes(h)).slice(0, min - selected.length);
        selected.push(...additional);
    }

    return selected.map((h) => h.tag);
}

// ─── Caption Optimizer ──────────────────────────────────────────────────────

interface OptimizeResult {
    optimizedCaption: string;
    confidenceScore: number;
    suggestions: CaptionSuggestion[];
}

const PLATFORM_RULES: Record<Platform, Array<{ rule: string; check: (c: string) => boolean; suggestion: string }>> = {
    INSTAGRAM: [
        {
            rule: 'Hook in first line',
            check: (c) => {
                const firstLine = c.split('\n')[0] ?? '';
                return firstLine.length > 10 && firstLine.length <= 150;
            },
            suggestion: 'Start with a punchy first line (10–150 chars) to hook readers before the "more" fold.',
        },
        {
            rule: 'Contains a call-to-action',
            check: (c) => /\b(shop|buy|link|click|visit|save|share|comment|dm|swipe|tap|check out)\b/i.test(c),
            suggestion: 'Add a clear CTA (e.g., "Shop now", "Link in bio", "Save for later").',
        },
        {
            rule: 'Uses emojis',
            check: (c) => /\p{Emoji}/u.test(c),
            suggestion: 'Add 1–3 relevant emojis to boost engagement and visual appeal.',
        },
        {
            rule: 'Line breaks for readability',
            check: (c) => c.includes('\n'),
            suggestion: 'Break long captions with empty lines to improve readability.',
        },
        {
            rule: 'Caption length',
            check: (c) => c.length <= 2200,
            suggestion: 'Keep captions under 2200 characters for Instagram.',
        },
    ],
    TIKTOK: [
        {
            rule: 'Conversational tone',
            check: (c) => /\b(you|your|i|we|us|let'?s|right\?|wait|okay|ok)\b/i.test(c),
            suggestion: 'Use casual, conversational language ("you", "let\'s", "wait for it…") to match TikTok\'s vibe.',
        },
        {
            rule: 'Short caption',
            check: (c) => c.length <= 150,
            suggestion: 'Keep TikTok captions under 150 characters — punchy and scannable.',
        },
        {
            rule: 'Trending phrase or hook',
            check: (c) => /\b(pov|when|wait for it|okay but|not me|tell me why|hot take|real talk)\b/i.test(c),
            suggestion: 'Include a trending phrase ("POV:", "Tell me why…") to ride current TikTok trends.',
        },
    ],
    FACEBOOK: [
        {
            rule: 'Question-based hook',
            check: (c) => /\?/.test(c.split('\n')[0] ?? ''),
            suggestion: 'Open with a question to drive comments and engagement on Facebook.',
        },
        {
            rule: 'Appropriate length',
            check: (c) => c.length >= 80 && c.length <= 500,
            suggestion: 'Facebook works best with 80–500 character captions — enough to tell a story.',
        },
        {
            rule: 'Contains a call-to-action',
            check: (c) => /\b(shop|buy|learn more|click|visit|share|comment|tag|check out|find out)\b/i.test(c),
            suggestion: 'Add a CTA like "Learn more", "Shop now", or "Tag a friend".',
        },
    ],
};

/**
 * Analyze a caption against platform best practices and return an optimized version.
 */
export function optimizeCaption(caption: string, platform: Platform): OptimizeResult {
    const rules = PLATFORM_RULES[platform];
    const suggestions: CaptionSuggestion[] = [];
    let passedCount = 0;

    for (const { rule, check, suggestion } of rules) {
        if (check(caption)) {
            passedCount++;
        } else {
            suggestions.push({ rule, suggestion });
        }
    }

    const confidenceScore = Math.round((passedCount / rules.length) * 100);

    // Build an optimized caption from the original if low confidence
    let optimizedCaption = caption;
    if (confidenceScore < 70 && suggestions.length > 0) {
        if (platform === 'INSTAGRAM' && !PLATFORM_RULES.INSTAGRAM[0].check(caption)) {
            // Ensure first line hook
            const lines = caption.split('\n');
            if (lines[0] && lines[0].length > 150) {
                optimizedCaption = lines[0].substring(0, 120) + '…\n\n' + lines.slice(1).join('\n');
            }
        }
        if (platform === 'TIKTOK' && caption.length > 150) {
            optimizedCaption = caption.substring(0, 147) + '…';
        }
    }

    return { optimizedCaption, confidenceScore, suggestions };
}

// ─── Copy Generation Core ────────────────────────────────────────────────────

interface AdContext {
    id: string;
    platform: Platform;
    adVariants: Array<{
        id: string;
        copy: string;
        mediaAsset?: {
            filename: string;
            assetType: string;
            tags: string[];
        } | null;
    }>;
    campaign: {
        name: string;
        description?: string | null;
        organization: {
            name: string;
            industry?: string | null;
        };
    };
}

function buildGenerationPrompt(ad: AdContext, guidance?: string): string {
    const { platform, campaign, adVariants } = ad;
    const org = campaign.organization;
    const industry = org.industry ?? 'general';
    const mediaContext = adVariants
        .map((v) =>
            v.mediaAsset
                ? `Asset: ${v.mediaAsset.filename} (${v.mediaAsset.assetType}), Tags: ${v.mediaAsset.tags.join(', ')}`
                : `Copy hint: ${v.copy}`,
        )
        .join('\n');

    const platformGuidance: Record<Platform, string> = {
        INSTAGRAM: 'Hook in the first line, use emojis, line breaks for readability, clear CTA, up to 2200 chars.',
        TIKTOK: 'Casual and conversational, trendy phrases, under 150 chars, fun energy.',
        FACEBOOK: 'Open with a question, slightly longer, good for storytelling, clear CTA.',
    };

    const guidanceBlock = guidance ? `\nUser Instruction: "${guidance}"\n` : '';

    return `You are a world-class social media copywriter for ${org.name} (${industry} industry).

Campaign: "${campaign.name}"${campaign.description ? ` — ${campaign.description}` : ''}
Platform: ${platform}
Platform best practices: ${platformGuidance[platform]}
${guidanceBlock}
Visual Context:
${mediaContext}

Generate engaging social media copy optimized for ${platform}. Return ONLY valid JSON with no markdown:
{
  "caption": "the full caption text",
  "callToAction": "a short, punchy CTA (5-10 words)",
  "contentKeywords": ["keyword1","keyword2","keyword3"]
}`;
}

/**
 * Generate copy for an ad using Gemini. Persists results to the first AdVariant.
 */
export async function generateCopy(adId: string): Promise<CopyOutput> {
    const ad = await prisma.ad.findUnique({
        where: { id: adId },
        include: {
            variants: {
                take: 1,
                include: { mediaAsset: { select: { filename: true, type: true, tags: true } } },
            },
            campaign: {
                include: {
                    organization: { select: { name: true, industry: true } },
                },
            },
        },
    });

    if (!ad) throw new Error(`Ad not found: ${adId}`);
    if (!ad.variants.length) throw new Error(`Ad ${adId} has no variants to attach copy to`);

    const variantId = ad.variants[0]!.id;
    return generateAndPersistCopy(ad as unknown as AdContext, variantId, undefined);
}

/**
 * Regenerate copy for an existing ad variant with optional user guidance.
 */
export async function regenerateCopy(adId: string, guidance?: string): Promise<CopyOutput> {
    const ad = await prisma.ad.findUnique({
        where: { id: adId },
        include: {
            variants: {
                take: 1,
                include: { mediaAsset: { select: { filename: true, type: true, tags: true } } },
            },
            campaign: {
                include: {
                    organization: { select: { name: true, industry: true } },
                },
            },
        },
    });

    if (!ad) throw new Error(`Ad not found: ${adId}`);
    if (!ad.variants.length) throw new Error(`Ad ${adId} has no variants`);

    const variantId = ad.variants[0]!.id;
    return generateAndPersistCopy(ad as unknown as AdContext, variantId, guidance);
}

async function generateAndPersistCopy(
    ad: AdContext,
    variantId: string,
    guidance?: string,
): Promise<CopyOutput> {
    const platform = ad.platform;
    const industry = ad.campaign.organization.industry ?? 'general';

    // 1. Generate caption + CTA via Gemini
    const prompt = buildGenerationPrompt(ad, guidance);
    const rawText = await generateText(prompt);

    let caption = '';
    let callToAction = '';
    let contentKeywords: string[] = [];

    try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON object found');
        const parsed = JSON.parse(jsonMatch[0]);
        caption = parsed.caption ?? '';
        callToAction = parsed.callToAction ?? '';
        contentKeywords = parsed.contentKeywords ?? [];
    } catch {
        caption = rawText.trim().substring(0, 500);
        callToAction = 'Learn more';
        contentKeywords = [industry];
    }

    // 2. Select hashtags
    const hashtags = await selectHashtags(caption, platform, industry, contentKeywords);

    // 3. Optimize caption
    const { optimizedCaption, confidenceScore, suggestions } = optimizeCaption(caption, platform);

    // 4. Persist to AdVariant
    await prisma.adVariant.update({
        where: { id: variantId },
        data: {
            caption,
            hashtags,
            copy: caption, // keep legacy copy field in sync
        },
    });

    return {
        adVariantId: variantId,
        caption,
        hashtags,
        callToAction,
        optimizedCaption,
        confidenceScore,
        suggestions,
    };
}
