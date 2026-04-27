import { z } from 'zod';

// ─── Platform & Format enums (mirror Prisma) ────────────────────────────────

export const PlatformEnum = z.enum(['INSTAGRAM', 'TIKTOK', 'FACEBOOK']);
export type Platform = z.infer<typeof PlatformEnum>;

export const AdFormatEnum = z.enum(['REEL', 'STORY', 'POST', 'CAROUSEL']);
export type AdFormat = z.infer<typeof AdFormatEnum>;

// ─── Request schemas ─────────────────────────────────────────────────────────

export const GenerateCopyInputSchema = z.object({
    adId: z.string().min(1, 'adId is required'),
    brandId: z.string().min(1, 'brandId is required'),
});
export type GenerateCopyInput = z.infer<typeof GenerateCopyInputSchema>;

export const RegenerateCopyInputSchema = z.object({
    adId: z.string().min(1, 'adId is required'),
    guidance: z.string().optional(),
});
export type RegenerateCopyInput = z.infer<typeof RegenerateCopyInputSchema>;

export const TrendingHashtagsQuerySchema = z.object({
    platform: PlatformEnum,
    industry: z.string().min(1, 'industry is required'),
});
export type TrendingHashtagsQuery = z.infer<typeof TrendingHashtagsQuerySchema>;

// ─── Response schemas ─────────────────────────────────────────────────────────

export const ScoredHashtagSchema = z.object({
    tag: z.string(),
    score: z.number().min(0).max(100),
    velocity: z.number().min(0).max(100),   // trending speed
    competition: z.number().min(0).max(100), // competition level (lower = better niche)
});
export type ScoredHashtag = z.infer<typeof ScoredHashtagSchema>;

export const CaptionSuggestionSchema = z.object({
    rule: z.string(),
    suggestion: z.string(),
});
export type CaptionSuggestion = z.infer<typeof CaptionSuggestionSchema>;

export const CopyOutputSchema = z.object({
    caption: z.string(),
    hashtags: z.array(z.string()),
    callToAction: z.string(),
    optimizedCaption: z.string(),
    confidenceScore: z.number().min(0).max(100),
    suggestions: z.array(CaptionSuggestionSchema),
});
export type CopyOutput = z.infer<typeof CopyOutputSchema>;

export const TrendingHashtagsOutputSchema = z.object({
    hashtags: z.array(ScoredHashtagSchema),
});
export type TrendingHashtagsOutput = z.infer<typeof TrendingHashtagsOutputSchema>;

// ─── Platform constraints ────────────────────────────────────────────────────

export const PLATFORM_HASHTAG_LIMITS: Record<Platform, { min: number; max: number }> = {
    INSTAGRAM: { min: 20, max: 30 },
    TIKTOK: { min: 5, max: 10 },
    FACEBOOK: { min: 5, max: 10 },
};

export const PLATFORM_CAPTION_LIMITS: Record<Platform, number> = {
    INSTAGRAM: 2200,
    TIKTOK: 150,
    FACEBOOK: 63206,
};
