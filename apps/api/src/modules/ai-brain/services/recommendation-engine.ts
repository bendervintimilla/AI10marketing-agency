import { prisma } from '@agency/db';
import { recommendation as recommendationRepo } from '@agency/db';
import { generateStructuredContent, generateNarrativeContent } from './gemini';
import {
    findDecliningCtrAds,
    findHighCpmAds,
    findLowEngagementAds,
    findOptimalPostingTimes,
    summarizeAdPerformance,
} from './analyzer';
import { AnalyticsSnapshot, Ad, Campaign } from '@agency/db';

// ─── Types ────────────────────────────────────────────────────

interface GeminiScheduleOutput {
    title: string;
    reasoning: string;
    payload: {
        platform: string;
        slots: { dayName: string; hour: number; label: string }[];
    };
}

interface GeminiHashtagOutput {
    title: string;
    reasoning: string;
    payload: {
        adId: string;
        currentHashtags: string[];
        suggestedHashtags: string[];
    };
}

// ─── Main Engine ─────────────────────────────────────────────

/**
 * Generates all recommendation types for an organization.
 * Called by the scheduled worker job every 6 hours.
 */
export async function generateForOrg(organizationId: string): Promise<void> {
    console.log(`[RecommendationEngine] Running for org: ${organizationId}`);

    // 1. Fetch all active campaigns with ads and 14d analytics
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const campaigns = await prisma.campaign.findMany({
        where: {
            organizationId,
            status: { in: ['ACTIVE', 'DRAFT'] },
        },
        include: {
            ads: {
                include: {
                    analytics: {
                        where: { fetchedAt: { gte: fourteenDaysAgo } },
                        orderBy: { fetchedAt: 'asc' },
                    },
                },
            },
        },
    });

    if (!campaigns.length) {
        console.log(`[RecommendationEngine] No active campaigns for org ${organizationId}`);
        return;
    }

    for (const campaign of campaigns) {
        await generateForCampaign(organizationId, campaign);
    }
}

async function generateForCampaign(
    organizationId: string,
    campaign: Campaign & { ads: (Ad & { analytics: AnalyticsSnapshot[] })[] }
): Promise<void> {
    const { id: campaignId, ads } = campaign;

    if (!ads.length) return;

    // Build index structures
    const snapshotsByAdId: Record<string, AnalyticsSnapshot[]> = {};
    const platformByAdId: Record<string, string> = {};

    for (const ad of ads) {
        snapshotsByAdId[ad.id] = ad.analytics;
        platformByAdId[ad.id] = ad.platform;
    }

    const hasEnoughData = ads.some((a) => a.analytics.length >= 2);

    // Run all recommendation generators in parallel
    await Promise.allSettled([
        hasEnoughData && generateScheduleRecommendations(organizationId, campaignId, snapshotsByAdId, platformByAdId),
        hasEnoughData && generatePauseRecommendations(organizationId, campaignId, snapshotsByAdId, platformByAdId),
        generateImproveRecommendations(organizationId, campaignId, snapshotsByAdId, platformByAdId),
        generateHashtagRefreshRecommendations(organizationId, campaignId, ads),
    ]);
}

// ─── SCHEDULE Recommendations ─────────────────────────────────

async function generateScheduleRecommendations(
    organizationId: string,
    campaignId: string,
    snapshotsByAdId: Record<string, AnalyticsSnapshot[]>,
    platformByAdId: Record<string, string>
): Promise<void> {
    try {
        const optimalTimes = findOptimalPostingTimes(snapshotsByAdId, platformByAdId);
        if (!Object.keys(optimalTimes).length) return;

        const prompt = `You are an expert social media strategist. Based on historical engagement data, generate a scheduling recommendation.

Optimal posting times found:
${JSON.stringify(optimalTimes, null, 2)}

Return a JSON object with:
- title: short title like "Optimal Posting Schedule for Instagram"
- reasoning: 2-3 sentence explanation referencing the data
- payload: { platform, slots: [{dayName, hour, label (e.g. "Tuesday at 7PM")}] }

Generate one recommendation object for each platform.`;

        const recs = await generateStructuredContent<GeminiScheduleOutput[]>(prompt);

        for (const rec of recs) {
            await recommendationRepo.create({
                organizationId,
                campaignId,
                type: 'SCHEDULE',
                status: 'PENDING',
                title: rec.title,
                reasoning: rec.reasoning,
                payload: rec.payload as any,
                confidence: 0.75,
            });
        }
    } catch (err) {
        console.error('[RecommendationEngine] SCHEDULE generation failed:', err);
    }
}

// ─── PAUSE / REMOVE Recommendations ──────────────────────────

async function generatePauseRecommendations(
    organizationId: string,
    campaignId: string,
    snapshotsByAdId: Record<string, AnalyticsSnapshot[]>,
    platformByAdId: Record<string, string>
): Promise<void> {
    try {
        const decliningAds = findDecliningCtrAds(snapshotsByAdId);
        const highCpmAds = findHighCpmAds(snapshotsByAdId);
        const lowEngagementAds = findLowEngagementAds(snapshotsByAdId, platformByAdId);

        // De-duplicate ad IDs flagged for pause
        const pauseAdIds = new Set([
            ...decliningAds.map((a) => a.adId),
            ...highCpmAds.map((a) => a.adId),
        ]);

        const removeAdIds = new Set(
            lowEngagementAds
                .filter((a) => pauseAdIds.has(a.adId)) // flagged by 2+ signals = remove
                .map((a) => a.adId)
        );

        for (const adId of pauseAdIds) {
            const type = removeAdIds.has(adId) ? 'REMOVE' : 'PAUSE';
            const declining = decliningAds.find((a) => a.adId === adId);
            const highCpm = highCpmAds.find((a) => a.adId === adId);
            const reasons = [declining?.reason, highCpm?.reason].filter(Boolean).join(' ');

            await recommendationRepo.create({
                organizationId,
                campaignId,
                adId,
                type,
                status: 'PENDING',
                title: `${type === 'REMOVE' ? 'Remove' : 'Pause'} underperforming ad`,
                reasoning: reasons,
                payload: {
                    adId,
                    signals: {
                        ctrDrop: declining?.ctrDropPercent ?? null,
                        cpmExcess: highCpm ? { adCpm: highCpm.adCpm, campaignAvg: highCpm.campaignAvgCpm } : null,
                    },
                },
                confidence: type === 'REMOVE' ? 0.88 : 0.72,
            });
        }
    } catch (err) {
        console.error('[RecommendationEngine] PAUSE/REMOVE generation failed:', err);
    }
}

// ─── IMPROVE Recommendations ──────────────────────────────────

async function generateImproveRecommendations(
    organizationId: string,
    campaignId: string,
    snapshotsByAdId: Record<string, AnalyticsSnapshot[]>,
    platformByAdId: Record<string, string>
): Promise<void> {
    try {
        const summaries = Object.entries(snapshotsByAdId)
            .filter(([, snaps]) => snaps.length >= 2)
            .map(([adId, snaps]) =>
                summarizeAdPerformance(adId, platformByAdId[adId] ?? 'UNKNOWN', snaps)
            );

        const underperformers = summaries.filter(
            (s) => s.ctrTrend === 'declining' || s.avgEngagementRate < 0.02
        );
        const topPerformers = summaries
            .filter((s) => s.ctrTrend !== 'declining')
            .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
            .slice(0, 3);

        // Suggest caption regeneration for underperformers
        for (const ad of underperformers) {
            await recommendationRepo.create({
                organizationId,
                campaignId,
                adId: ad.adId,
                type: 'IMPROVE',
                status: 'PENDING',
                title: 'Regenerate ad copy to boost engagement',
                reasoning: `This ad has a ${(ad.avgEngagementRate * 100).toFixed(2)}% engagement rate with a ${ad.ctrTrend} CTR trend. A fresh caption and hashtags may revive performance.`,
                payload: { action: 'regenerate-copy', adId: ad.adId },
                confidence: 0.65,
            });
        }

        // Suggest creating similar variants for top performers
        for (const ad of topPerformers) {
            await recommendationRepo.create({
                organizationId,
                campaignId,
                adId: ad.adId,
                type: 'IMPROVE',
                status: 'PENDING',
                title: 'Create variant of high-performing ad',
                reasoning: `This ${ad.platform} ad has ${(ad.avgEngagementRate * 100).toFixed(2)}% engagement — above average. Creating similar variants can scale this success.`,
                payload: { action: 'create-variant', adId: ad.adId },
                confidence: 0.78,
            });
        }
    } catch (err) {
        console.error('[RecommendationEngine] IMPROVE generation failed:', err);
    }
}

// ─── HASHTAG_REFRESH Recommendations ─────────────────────────

const HASHTAG_REFRESH_DAYS = 7;

async function generateHashtagRefreshRecommendations(
    organizationId: string,
    campaignId: string,
    ads: (Ad & { analytics: AnalyticsSnapshot[] })[]
): Promise<void> {
    try {
        const threshold = new Date(Date.now() - HASHTAG_REFRESH_DAYS * 24 * 60 * 60 * 1000);

        // Find ads with hashtags that haven't been updated in 7+ days
        const staleAds = ads.filter(
            (ad) =>
                ad.hashtags.length > 0 &&
                new Date(ad.updatedAt) < threshold
        );

        if (!staleAds.length) return;

        for (const ad of staleAds) {
            const prompt = `You are an expert social media hashtag strategist.
An ad on ${ad.platform} has been using these hashtags for over ${HASHTAG_REFRESH_DAYS} days: ${ad.hashtags.join(', ')}.

Suggest a refreshed set of 10-15 trending hashtags for ${ad.platform} that would perform better, maintaining relevance to: "${ad.caption ?? 'marketing content'}".

Return JSON: { title, reasoning, payload: { adId: "${ad.id}", currentHashtags: [...], suggestedHashtags: [...] } }`;

            const rec = await generateStructuredContent<GeminiHashtagOutput>(prompt);

            await recommendationRepo.create({
                organizationId,
                campaignId,
                adId: ad.id,
                type: 'HASHTAG_REFRESH',
                status: 'PENDING',
                title: rec.title || `Refresh hashtags for ${ad.platform} ad`,
                reasoning: rec.reasoning,
                payload: {
                    ...(rec.payload as Record<string, unknown>),
                    adId: ad.id,
                },
                confidence: 0.80,
            });
        }
    } catch (err) {
        console.error('[RecommendationEngine] HASHTAG_REFRESH generation failed:', err);
    }
}
