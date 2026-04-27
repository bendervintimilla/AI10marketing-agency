import { z } from 'zod';

const PlatformEnum = z.enum(['INSTAGRAM', 'TIKTOK', 'FACEBOOK']);
const AdFormatEnum = z.enum(['REEL', 'STORY', 'POST', 'CAROUSEL']);

export const GenerateVideoSchema = z.object({
    productMediaIds: z.array(z.string().min(1)).min(1, 'At least one media asset is required'),
    brandId: z.string().min(1, 'Brand ID is required'),
    campaignId: z.string().min(1, 'Campaign ID is required'),
    platform: PlatformEnum,
    format: AdFormatEnum,
    style: z.string().optional(),
    prompt: z.string().optional(),
});

export const GenerateImageSchema = z.object({
    productMediaIds: z.array(z.string().min(1)).min(1, 'At least one media asset is required'),
    brandId: z.string().min(1, 'Brand ID is required'),
    campaignId: z.string().min(1, 'Campaign ID is required'),
    platform: PlatformEnum,
    format: AdFormatEnum,
    style: z.string().optional(),
    prompt: z.string().optional(),
});

export const GenerateBatchSchema = z.object({
    campaignId: z.string().min(1, 'Campaign ID is required'),
    brandId: z.string().min(1, 'Brand ID is required'),
    productMediaIds: z.array(z.string().min(1)).min(1),
    platforms: z.array(PlatformEnum).min(1, 'At least one platform is required'),
    formats: z.array(AdFormatEnum).min(1, 'At least one format is required'),
    countPerCombo: z.number().int().min(1).max(10).default(1),
    style: z.string().optional(),
    prompt: z.string().optional(),
});

export const RetrySchema = z.object({
    prompt: z.string().optional(),
    style: z.string().optional(),
});

export type GenerateVideoInput = z.infer<typeof GenerateVideoSchema>;
export type GenerateImageInput = z.infer<typeof GenerateImageSchema>;
export type GenerateBatchInput = z.infer<typeof GenerateBatchSchema>;
export type RetryInput = z.infer<typeof RetrySchema>;
