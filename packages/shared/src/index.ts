import { z } from "zod";

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export const PlatformEnum = z.enum(["INSTAGRAM", "TIKTOK", "FACEBOOK"]);
export type Platform = z.infer<typeof PlatformEnum>;

export const PublishStatusEnum = z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"]);
export type PublishStatus = z.infer<typeof PublishStatusEnum>;

export const PlanTypeEnum = z.enum(["FREE", "PRO", "ENTERPRISE"]);
export type PlanType = z.infer<typeof PlanTypeEnum>;

export const SubscriptionStatusEnum = z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

export const UserRoleEnum = z.enum(["OWNER", "MEMBER"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const NotificationTypeEnum = z.enum([
    "AD_GENERATION_COMPLETE",
    "AD_PUBLISHED",
    "AI_RECOMMENDATION",
    "BILLING_ALERT",
    "PAYMENT_FAILED",
    "TEAM_INVITE",
    "GENERAL",
]);
export type NotificationType = z.infer<typeof NotificationTypeEnum>;

// ─────────────────────────────────────────────
// Plan Limits
// ─────────────────────────────────────────────

export const PLAN_LIMITS = {
    FREE: {
        maxCampaigns: 1,
        maxAdsPerMonth: 5,
        maxPlatforms: 2,
        autoPilot: false,
        fullAnalytics: false,
        emailReports: false,
        apiAccess: false,
        priorityGeneration: false,
        dedicatedSupport: false,
        price: 0,
        label: "Free",
    },
    PRO: {
        maxCampaigns: 10,
        maxAdsPerMonth: 100,
        maxPlatforms: Infinity,
        autoPilot: true,
        fullAnalytics: true,
        emailReports: true,
        apiAccess: false,
        priorityGeneration: false,
        dedicatedSupport: false,
        price: 49,
        label: "Pro",
    },
    ENTERPRISE: {
        maxCampaigns: Infinity,
        maxAdsPerMonth: Infinity,
        maxPlatforms: Infinity,
        autoPilot: true,
        fullAnalytics: true,
        emailReports: true,
        apiAccess: true,
        priorityGeneration: true,
        dedicatedSupport: true,
        price: 199,
        label: "Enterprise",
    },
} as const satisfies Record<string, {
    maxCampaigns: number;
    maxAdsPerMonth: number;
    maxPlatforms: number;
    autoPilot: boolean;
    fullAnalytics: boolean;
    emailReports: boolean;
    apiAccess: boolean;
    priorityGeneration: boolean;
    dedicatedSupport: boolean;
    price: number;
    label: string;
}>;

// ─────────────────────────────────────────────
// Core Schemas
// ─────────────────────────────────────────────

export const OrganizationSchema = z.object({
    id: z.string().cuid(),
    name: z.string().min(1),
    logo: z.string().url().optional(),
    industry: z.string().optional(),
    autoPilotEnabled: z.boolean(),
    stripeCustomerId: z.string().optional(),
    plan: PlanTypeEnum,
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const UserSchema = z.object({
    id: z.string().cuid(),
    email: z.string().email(),
    name: z.string().min(1),
    role: UserRoleEnum,
    organizationId: z.string().cuid(),
    notifEmailBilling: z.boolean(),
    notifEmailAds: z.boolean(),
    notifInAppBilling: z.boolean(),
    notifInAppAds: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const CampaignSchema = z.object({
    id: z.string().cuid(),
    name: z.string().min(1),
    description: z.string().optional(),
    organizationId: z.string().cuid(),
    startDate: z.date(),
    endDate: z.date().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

export const AdSchema = z.object({
    id: z.string().cuid(),
    campaignId: z.string().cuid(),
    name: z.string().min(1),
    platform: PlatformEnum,
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type Ad = z.infer<typeof AdSchema>;

export const MediaAssetSchema = z.object({
    id: z.string().cuid(),
    url: z.string().url(),
    type: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

export const AdVariantSchema = z.object({
    id: z.string().cuid(),
    adId: z.string().cuid(),
    mediaAssetId: z.string().cuid(),
    copy: z.string(),
    publishStatus: PublishStatusEnum,
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type AdVariant = z.infer<typeof AdVariantSchema>;

export const AnalyticsSnapshotSchema = z.object({
    id: z.string().cuid(),
    adVariantId: z.string().cuid(),
    impressions: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    spend: z.number().nonnegative(),
    recordedAt: z.date(),
});
export type AnalyticsSnapshot = z.infer<typeof AnalyticsSnapshotSchema>;

export const AIRecommendationSchema = z.object({
    id: z.string().cuid(),
    adVariantId: z.string().cuid(),
    suggestion: z.string(),
    confidenceScore: z.number().min(0).max(1),
    generatedAt: z.date(),
});
export type AIRecommendation = z.infer<typeof AIRecommendationSchema>;

// ─────────────────────────────────────────────
// Billing Schemas
// ─────────────────────────────────────────────

export const SubscriptionSchema = z.object({
    id: z.string().cuid(),
    organizationId: z.string().cuid(),
    stripeSubscriptionId: z.string(),
    stripePriceId: z.string(),
    plan: PlanTypeEnum,
    status: SubscriptionStatusEnum,
    currentPeriodStart: z.date(),
    currentPeriodEnd: z.date(),
    cancelAtPeriodEnd: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const UsageRecordSchema = z.object({
    id: z.string().cuid(),
    organizationId: z.string().cuid(),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2024),
    adsGenerated: z.number().int().nonnegative(),
    activeCampaigns: z.number().int().nonnegative(),
    storageUsedBytes: z.bigint().nonnegative(),
});
export type UsageRecord = z.infer<typeof UsageRecordSchema>;

export const CheckoutRequestSchema = z.object({
    plan: z.enum(["PRO", "ENTERPRISE"]),
    organizationId: z.string().cuid(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export const PortalRequestSchema = z.object({
    organizationId: z.string().cuid(),
    returnUrl: z.string().url().optional(),
});
export type PortalRequest = z.infer<typeof PortalRequestSchema>;

// ─────────────────────────────────────────────
// Notification Schemas
// ─────────────────────────────────────────────

export const NotificationSchema = z.object({
    id: z.string().cuid(),
    userId: z.string().cuid(),
    type: NotificationTypeEnum,
    title: z.string(),
    message: z.string(),
    read: z.boolean(),
    payload: z.record(z.unknown()).optional(),
    createdAt: z.date(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// ─────────────────────────────────────────────
// Brand & Team Schemas
// ─────────────────────────────────────────────

export const BrandSettingsSchema = z.object({
    id: z.string().cuid(),
    organizationId: z.string().cuid(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    fontFamily: z.string().optional(),
    voiceTone: z.string().optional(),
    targetAudience: z.string().optional(),
});
export type BrandSettings = z.infer<typeof BrandSettingsSchema>;

export const OrgMemberSchema = z.object({
    id: z.string().cuid(),
    userId: z.string().cuid(),
    organizationId: z.string().cuid(),
    role: UserRoleEnum,
    createdAt: z.date(),
});
export type OrgMember = z.infer<typeof OrgMemberSchema>;

export const OrgInviteSchema = z.object({
    id: z.string().cuid(),
    email: z.string().email(),
    role: UserRoleEnum,
    organizationId: z.string().cuid(),
    token: z.string(),
    expiresAt: z.date(),
    acceptedAt: z.date().optional(),
    createdAt: z.date(),
});
export type OrgInvite = z.infer<typeof OrgInviteSchema>;

// ─────────────────────────────────────────────
// Plan limit check helper (shared utility)
// ─────────────────────────────────────────────

export function getPlanLimits(plan: PlanType) {
    return PLAN_LIMITS[plan];
}

export function isWithinLimit(
    plan: PlanType,
    resource: "maxCampaigns" | "maxAdsPerMonth" | "maxPlatforms",
    currentCount: number
): boolean {
    const limit = PLAN_LIMITS[plan][resource];
    return limit === Infinity || currentCount < limit;
}

// ─────────────────────────────────────────────
// Copy Generation Types (owned by Copy Agent)
// ─────────────────────────────────────────────

export const GenerateCopyInputSchema = z.object({
    adId: z.string().min(1, 'adId is required'),
    brandId: z.string().optional(),
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

export const ScoredHashtagSchema = z.object({
    tag: z.string(),
    score: z.number().min(0).max(100),
    velocity: z.number().min(0).max(100),
    competition: z.number().min(0).max(100),
});
export type ScoredHashtag = z.infer<typeof ScoredHashtagSchema>;

export const CaptionSuggestionSchema = z.object({
    rule: z.string(),
    suggestion: z.string(),
});
export type CaptionSuggestion = z.infer<typeof CaptionSuggestionSchema>;

export const CopyOutputSchema = z.object({
    adVariantId: z.string(),
    caption: z.string(),
    hashtags: z.array(z.string()),
    callToAction: z.string(),
    optimizedCaption: z.string(),
    confidenceScore: z.number().min(0).max(100),
    suggestions: z.array(CaptionSuggestionSchema),
});
export type CopyOutput = z.infer<typeof CopyOutputSchema>;

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

// ─────────────────────────────────────────────
// AI Chat Types (owned by AI Brain Agent)
// ─────────────────────────────────────────────

export const ChatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
    orgId: z.string().min(1),
    messages: z.array(ChatMessageSchema).min(1),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

