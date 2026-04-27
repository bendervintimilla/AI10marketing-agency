import { Worker, Queue, Job } from 'bullmq';
import axios from 'axios';
import IORedis from 'ioredis';
import { prisma } from '@agency/db';
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

// ─── Queue definition ─────────────────────────────────────────────────────────

export const FETCH_ANALYTICS_QUEUE = 'fetch-analytics';

let analyticsQueue: Queue | null = null;
export function getAnalyticsQueue(): Queue {
    if (!analyticsQueue) {
        analyticsQueue = new Queue(FETCH_ANALYTICS_QUEUE, {
            connection,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: { count: 50 },
                removeOnFail: { count: 100 },
            },
        });
    }
    return analyticsQueue;
}

// ─── Platform API helpers ─────────────────────────────────────────────────────

/** Fetch Instagram media insights from Graph API */
async function fetchInstagramInsights(
    externalPostId: string,
    accessToken: string
): Promise<Record<string, number>> {
    try {
        const fields = 'impressions,reach,engagement,saved,like_count,comments_count,shares';
        const res = await axios.get(
            `https://graph.facebook.com/v19.0/${externalPostId}/insights`,
            {
                params: {
                    metric: 'impressions,reach,engagement,saved',
                    access_token: accessToken,
                    period: 'lifetime',
                },
                timeout: 10_000,
            }
        );

        const metrics: Record<string, number> = {};
        for (const item of res.data?.data ?? []) {
            metrics[item.name] = item.values?.[0]?.value ?? 0;
        }

        // Also fetch media-level fields for likes/comments
        const mediaRes = await axios.get(
            `https://graph.facebook.com/v19.0/${externalPostId}`,
            {
                params: { fields, access_token: accessToken },
                timeout: 10_000,
            }
        );
        metrics.likes = mediaRes.data?.like_count ?? 0;
        metrics.comments = mediaRes.data?.comments_count ?? 0;
        metrics.shares = mediaRes.data?.shares ?? 0;

        return {
            impressions: metrics.impressions ?? 0,
            reach: metrics.reach ?? 0,
            likes: metrics.likes ?? 0,
            comments: metrics.comments ?? 0,
            shares: metrics.shares ?? 0,
            saves: metrics.saved ?? 0,
            clicks: metrics.link_clicks ?? 0,
        };
    } catch (err: any) {
        console.warn(`[fetch-analytics] Instagram API error for ${externalPostId}:`, err?.response?.data ?? err.message);
        return {};
    }
}

/** Fetch TikTok video statistics */
async function fetchTikTokInsights(
    videoId: string,
    accessToken: string
): Promise<Record<string, number>> {
    try {
        const res = await axios.post(
            'https://open.tiktokapis.com/v2/video/query/',
            {
                filters: { video_ids: [videoId] },
                fields: ['id', 'view_count', 'like_count', 'comment_count', 'share_count', 'reach'],
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10_000,
            }
        );

        const video = res.data?.data?.videos?.[0] ?? {};
        return {
            impressions: video.view_count ?? 0,
            reach: video.reach ?? video.view_count ?? 0,
            likes: video.like_count ?? 0,
            comments: video.comment_count ?? 0,
            shares: video.share_count ?? 0,
            saves: 0,
            clicks: 0,
        };
    } catch (err: any) {
        console.warn(`[fetch-analytics] TikTok API error for ${videoId}:`, err?.response?.data ?? err.message);
        return {};
    }
}

/** Fetch Facebook post insights from Graph API */
async function fetchFacebookInsights(
    postId: string,
    accessToken: string
): Promise<Record<string, number>> {
    try {
        const res = await axios.get(
            `https://graph.facebook.com/v19.0/${postId}/insights`,
            {
                params: {
                    metric: 'post_impressions_unique,post_impressions,post_clicks,post_reactions_by_type_total,post_shares,post_video_views',
                    access_token: accessToken,
                    period: 'lifetime',
                },
                timeout: 10_000,
            }
        );

        const metrics: Record<string, number> = {};
        for (const item of res.data?.data ?? []) {
            metrics[item.name] = item.values?.[0]?.value ?? 0;
        }

        const reactions = (metrics.post_reactions_by_type_total as any) ?? {};
        const totalLikes = Object.values(reactions).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

        return {
            impressions: metrics.post_impressions ?? 0,
            reach: metrics.post_impressions_unique ?? 0,
            clicks: metrics.post_clicks ?? 0,
            likes: totalLikes,
            comments: 0,
            shares: metrics.post_shares ?? 0,
            saves: 0,
        };
    } catch (err: any) {
        console.warn(`[fetch-analytics] Facebook API error for ${postId}:`, err?.response?.data ?? err.message);
        return {};
    }
}

// ─── Derived metric calculations ─────────────────────────────────────────────

function calculateDerivedMetrics(raw: {
    impressions: number;
    reach: number;
    clicks: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    spent: number;
}): { ctr: number; cpm: number; engagementRate: number } {
    const ctr = raw.impressions > 0 ? (raw.clicks / raw.impressions) * 100 : 0;
    const cpm = raw.impressions > 0 ? (raw.spent / raw.impressions) * 1000 : 0;
    const totalEngagements = raw.likes + raw.comments + raw.shares + raw.saves;
    const engagementRate = raw.reach > 0 ? (totalEngagements / raw.reach) * 100 : 0;
    return { ctr, cpm, engagementRate };
}

// ─── Job processor ────────────────────────────────────────────────────────────

export async function processFetchAnalytics(): Promise<void> {
    console.log('[fetch-analytics] 🔄 Starting analytics fetch run...');

    // Get all published ads with an external post ID
    const publishedAds = await prisma.ad.findMany({
        where: {
            status: 'PUBLISHED',
            externalPostId: { not: null },
        },
        include: {
            campaign: {
                include: { organization: { include: { socialAccounts: true } } },
            },
        },
    });

    console.log(`[fetch-analytics] Found ${publishedAds.length} published ads to fetch`);

    for (const ad of publishedAds) {
        try {
            const socialAccounts = ad.campaign.organization.socialAccounts;
            const socialAccount = socialAccounts.find((s) => s.platform === ad.platform);

            if (!socialAccount) {
                console.warn(`[fetch-analytics] No social account for ${ad.platform} on ad ${ad.id}`);
                continue;
            }

            let raw: Record<string, number> = {};

            if (ad.platform === 'INSTAGRAM') {
                raw = await fetchInstagramInsights(ad.externalPostId!, socialAccount.accessToken);
            } else if (ad.platform === 'TIKTOK') {
                raw = await fetchTikTokInsights(ad.externalPostId!, socialAccount.accessToken);
            } else if (ad.platform === 'FACEBOOK') {
                raw = await fetchFacebookInsights(ad.externalPostId!, socialAccount.accessToken);
            }

            if (Object.keys(raw).length === 0) continue;

            const safeRaw = {
                impressions: raw.impressions ?? 0,
                reach: raw.reach ?? 0,
                clicks: raw.clicks ?? 0,
                likes: raw.likes ?? 0,
                comments: raw.comments ?? 0,
                shares: raw.shares ?? 0,
                saves: raw.saves ?? 0,
                spent: raw.spent ?? 0,
            };

            const { ctr, cpm, engagementRate } = calculateDerivedMetrics(safeRaw);

            // Upsert snapshot — one record per day per ad
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check for existing snapshot today
            const existing = await prisma.analyticsSnapshot.findFirst({
                where: {
                    adId: ad.id,
                    fetchedAt: { gte: today },
                },
            });

            if (existing) {
                await prisma.analyticsSnapshot.update({
                    where: { id: existing.id },
                    data: {
                        ...safeRaw,
                        ctr,
                        cpm,
                        fetchedAt: new Date(),
                    },
                });
            } else {
                await prisma.analyticsSnapshot.create({
                    data: {
                        adId: ad.id,
                        ...safeRaw,
                        ctr,
                        cpm,
                    },
                });
            }

            console.log(`[fetch-analytics] ✅ Updated analytics for ad ${ad.id} (${ad.platform}): impressions=${safeRaw.impressions}, reach=${safeRaw.reach}, engagementRate=${engagementRate.toFixed(2)}%`);
        } catch (err: any) {
            console.error(`[fetch-analytics] ❌ Failed to fetch analytics for ad ${ad.id}:`, err.message);
        }
    }

    console.log('[fetch-analytics] ✅ Analytics fetch run complete');
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export const fetchAnalyticsWorker = new Worker(
    FETCH_ANALYTICS_QUEUE,
    async () => {
        await processFetchAnalytics();
    },
    {
        connection,
        concurrency: 1,
    }
);

// ─── Schedule trigger ─────────────────────────────────────────────────────────

export async function scheduleFetchAnalytics(): Promise<void> {
    const queue = getAnalyticsQueue();
    await queue.add(
        'fetch-analytics-run',
        {},
        {
            jobId: `fetch-analytics-${Date.now()}`,
            delay: 0,
        }
    );
    console.log('[fetch-analytics] 📋 Queued analytics fetch job');
}

// ─── Weekly report ────────────────────────────────────────────────────────────

export async function generateWeeklyReport(): Promise<void> {
    console.log('[fetch-analytics] 📊 Generating weekly analytics report...');

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const snapshots = await prisma.analyticsSnapshot.findMany({
        where: { fetchedAt: { gte: oneWeekAgo } },
        include: {
            ad: {
                include: { campaign: { include: { organization: true } } },
            },
        },
        orderBy: { fetchedAt: 'desc' },
    });

    // Group by campaign
    const byCampaign = new Map<string, typeof snapshots>();
    for (const s of snapshots) {
        const cid = s.ad.campaignId;
        if (!byCampaign.has(cid)) byCampaign.set(cid, []);
        byCampaign.get(cid)!.push(s);
    }

    for (const [campaignId, snaps] of byCampaign.entries()) {
        const totalImpressions = snaps.reduce((a, s) => a + s.impressions, 0);
        const totalReach = snaps.reduce((a, s) => a + s.reach, 0);
        const totalSpent = snaps.reduce((a, s) => a + s.spent, 0);
        const avgCtr = snaps.reduce((a, s) => a + s.ctr, 0) / snaps.length;
        const topAd = [...snaps].sort((a, b) => b.ctr - a.ctr)[0];
        const bottomAd = [...snaps].sort((a, b) => a.ctr - b.ctr)[0];

        // In a real system: send via email with nodemailer/SendGrid
        console.log(`[weekly-report] Campaign ${campaignId}:
  - Total Impressions: ${totalImpressions.toLocaleString()}
  - Total Reach: ${totalReach.toLocaleString()}
  - Total Spend: $${totalSpent.toFixed(2)}
  - Avg CTR: ${avgCtr.toFixed(2)}%
  - Top Performer: Ad ${topAd?.adId} (CTR: ${topAd?.ctr.toFixed(2)}%)
  - Needs Attention: Ad ${bottomAd?.adId} (CTR: ${bottomAd?.ctr.toFixed(2)}%)
`);
    }

    console.log('[fetch-analytics] ✅ Weekly report generated');
}
