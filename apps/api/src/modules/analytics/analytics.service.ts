import { prisma } from '../../lib/prisma';

// ─── Campaign Analytics ───────────────────────────────────────────────────────

export interface CampaignAnalytics {
    campaignId: string;
    campaignName: string;
    adCount: number;
    totalImpressions: number;
    totalReach: number;
    totalClicks: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalSaves: number;
    totalSpent: number;
    avgCtr: number;
    avgCpm: number;
    avgEngagementRate: number;
    byPlatform: Record<string, {
        impressions: number;
        reach: number;
        clicks: number;
        spent: number;
    }>;
    topAds: {
        adId: string;
        adName: string;
        platform: string;
        impressions: number;
        ctr: number;
        thumbnailUrl: string | null;
    }[];
}

export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics | null> {
    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
            ads: {
                include: {
                    analytics: {
                        orderBy: { fetchedAt: 'desc' },
                        take: 1, // Latest snapshot per ad
                    },
                },
            },
        },
    });

    if (!campaign) return null;

    const adsWithSnapshots = campaign.ads.filter((a) => a.analytics.length > 0);

    const totals = adsWithSnapshots.reduce(
        (acc, ad) => {
            const s = ad.analytics[0];
            acc.impressions += s.impressions;
            acc.reach += s.reach;
            acc.clicks += s.clicks;
            acc.likes += s.likes;
            acc.comments += s.comments;
            acc.shares += s.shares;
            acc.saves += s.saves;
            acc.spent += s.spent;
            acc.ctrSum += s.ctr;
            acc.cpmSum += s.cpm;
            const eng = s.reach > 0 ? ((s.likes + s.comments + s.shares + s.saves) / s.reach) * 100 : 0;
            acc.engSum += eng;
            return acc;
        },
        {
            impressions: 0, reach: 0, clicks: 0, likes: 0, comments: 0,
            shares: 0, saves: 0, spent: 0, ctrSum: 0, cpmSum: 0, engSum: 0,
        }
    );

    const count = adsWithSnapshots.length || 1;

    // Platform breakdown
    const byPlatform: Record<string, { impressions: number; reach: number; clicks: number; spent: number }> = {};
    for (const ad of adsWithSnapshots) {
        const s = ad.analytics[0];
        if (!byPlatform[ad.platform]) {
            byPlatform[ad.platform] = { impressions: 0, reach: 0, clicks: 0, spent: 0 };
        }
        byPlatform[ad.platform].impressions += s.impressions;
        byPlatform[ad.platform].reach += s.reach;
        byPlatform[ad.platform].clicks += s.clicks;
        byPlatform[ad.platform].spent += s.spent;
    }

    // Top ads by engagement rate
    const topAds = [...adsWithSnapshots]
        .sort((a, b) => b.analytics[0].ctr - a.analytics[0].ctr)
        .slice(0, 5)
        .map((ad) => ({
            adId: ad.id,
            adName: ad.name,
            platform: ad.platform,
            impressions: ad.analytics[0].impressions,
            ctr: ad.analytics[0].ctr,
            thumbnailUrl: ad.thumbnailUrl,
        }));

    return {
        campaignId,
        campaignName: campaign.name,
        adCount: campaign.ads.length,
        totalImpressions: totals.impressions,
        totalReach: totals.reach,
        totalClicks: totals.clicks,
        totalLikes: totals.likes,
        totalComments: totals.comments,
        totalShares: totals.shares,
        totalSaves: totals.saves,
        totalSpent: totals.spent,
        avgCtr: totals.ctrSum / count,
        avgCpm: totals.cpmSum / count,
        avgEngagementRate: totals.engSum / count,
        byPlatform,
        topAds,
    };
}

// ─── Ad Time Series ───────────────────────────────────────────────────────────

export interface AdTimeSeries {
    adId: string;
    adName: string;
    platform: string;
    campaignId: string;
    snapshots: {
        date: string;
        impressions: number;
        reach: number;
        clicks: number;
        likes: number;
        comments: number;
        shares: number;
        saves: number;
        ctr: number;
        cpm: number;
        engagementRate: number;
        spent: number;
    }[];
    campaignAvg: {
        impressions: number;
        reach: number;
        ctr: number;
        engagementRate: number;
    };
    aiRecommendations: {
        id: string;
        type: string;
        payload: any;
        status: string;
        createdAt: Date;
    }[];
}

export async function getAdTimeSeries(
    adId: string,
    from?: Date,
    to?: Date
): Promise<AdTimeSeries | null> {
    const ad = await prisma.ad.findUnique({
        where: { id: adId },
        include: {
            analytics: {
                where: {
                    fetchedAt: {
                        gte: from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        lte: to ?? new Date(),
                    },
                },
                orderBy: { fetchedAt: 'asc' },
            },
            recommendations: {
                orderBy: { createdAt: 'desc' },
                take: 10,
            },
        },
    });

    if (!ad) return null;

    // Campaign average for comparison
    const campaignAds = await prisma.ad.findMany({
        where: { campaignId: ad.campaignId },
        include: {
            analytics: { orderBy: { fetchedAt: 'desc' }, take: 1 },
        },
    });

    const campSnaps = campaignAds.flatMap((a) => a.analytics);
    const campCount = campSnaps.length || 1;
    const campaignAvg = {
        impressions: campSnaps.reduce((a, s) => a + s.impressions, 0) / campCount,
        reach: campSnaps.reduce((a, s) => a + s.reach, 0) / campCount,
        ctr: campSnaps.reduce((a, s) => a + s.ctr, 0) / campCount,
        engagementRate:
            campSnaps.reduce((s, snap) => {
                const eng = snap.reach > 0
                    ? ((snap.likes + snap.comments + snap.shares + snap.saves) / snap.reach) * 100
                    : 0;
                return s + eng;
            }, 0) / campCount,
    };

    return {
        adId: ad.id,
        adName: ad.name,
        platform: ad.platform,
        campaignId: ad.campaignId,
        snapshots: ad.analytics.map((s) => ({
            date: s.fetchedAt.toISOString().split('T')[0],
            impressions: s.impressions,
            reach: s.reach,
            clicks: s.clicks,
            likes: s.likes,
            comments: s.comments,
            shares: s.shares,
            saves: s.saves,
            ctr: s.ctr,
            cpm: s.cpm,
            engagementRate:
                s.reach > 0
                    ? ((s.likes + s.comments + s.shares + s.saves) / s.reach) * 100
                    : 0,
            spent: s.spent,
        })),
        campaignAvg,
        aiRecommendations: ad.recommendations.map((r) => ({
            id: r.id,
            type: r.type,
            payload: r.payload,
            status: r.status,
            createdAt: r.createdAt,
        })),
    };
}

// ─── Org Overview ─────────────────────────────────────────────────────────────

export interface OrgOverview {
    orgId: string;
    totalImpressions: number;
    totalReach: number;
    totalClicks: number;
    totalSpent: number;
    avgCtr: number;
    avgEngagementRate: number;
    byPlatform: Record<string, { impressions: number; reach: number; spent: number }>;
    trendLast30Days: { date: string; impressions: number; reach: number; clicks: number }[];
    topAds: {
        adId: string;
        adName: string;
        platform: string;
        impressions: number;
        ctr: number;
        engagementRate: number;
        thumbnailUrl: string | null;
    }[];
    campaignSummaries: {
        campaignId: string;
        campaignName: string;
        impressions: number;
        reach: number;
        adCount: number;
    }[];
}

export async function getOrgOverview(orgId: string): Promise<OrgOverview> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const snapshots = await prisma.analyticsSnapshot.findMany({
        where: {
            fetchedAt: { gte: thirtyDaysAgo },
            ad: { campaign: { organizationId: orgId } },
        },
        include: {
            ad: { include: { campaign: true } },
        },
        orderBy: { fetchedAt: 'asc' },
    });

    const totals = snapshots.reduce(
        (acc, s) => {
            acc.impressions += s.impressions;
            acc.reach += s.reach;
            acc.clicks += s.clicks;
            acc.spent += s.spent;
            acc.ctrSum += s.ctr;
            const eng = s.reach > 0 ? ((s.likes + s.comments + s.shares + s.saves) / s.reach) * 100 : 0;
            acc.engSum += eng;
            return acc;
        },
        { impressions: 0, reach: 0, clicks: 0, spent: 0, ctrSum: 0, engSum: 0 }
    );

    const count = snapshots.length || 1;

    // Platform breakdown
    const byPlatform: Record<string, { impressions: number; reach: number; spent: number }> = {};
    for (const s of snapshots) {
        const p = s.ad.platform;
        if (!byPlatform[p]) byPlatform[p] = { impressions: 0, reach: 0, spent: 0 };
        byPlatform[p].impressions += s.impressions;
        byPlatform[p].reach += s.reach;
        byPlatform[p].spent += s.spent;
    }

    // Trend: group by date
    const trendMap = new Map<string, { impressions: number; reach: number; clicks: number }>();
    for (const s of snapshots) {
        const date = s.fetchedAt.toISOString().split('T')[0];
        if (!trendMap.has(date)) trendMap.set(date, { impressions: 0, reach: 0, clicks: 0 });
        const entry = trendMap.get(date)!;
        entry.impressions += s.impressions;
        entry.reach += s.reach;
        entry.clicks += s.clicks;
    }
    const trendLast30Days = Array.from(trendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v }));

    // Top 5 ads by CTR
    const latestByAd = new Map<string, typeof snapshots[0]>();
    for (const s of snapshots) {
        const existing = latestByAd.get(s.adId);
        if (!existing || s.fetchedAt > existing.fetchedAt) {
            latestByAd.set(s.adId, s);
        }
    }
    const topAds = [...latestByAd.values()]
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 5)
        .map((s) => {
            const eng = s.reach > 0 ? ((s.likes + s.comments + s.shares + s.saves) / s.reach) * 100 : 0;
            return {
                adId: s.adId,
                adName: s.ad.name,
                platform: s.ad.platform,
                impressions: s.impressions,
                ctr: s.ctr,
                engagementRate: eng,
                thumbnailUrl: s.ad.thumbnailUrl,
            };
        });

    // Campaign summaries
    const campaignMap = new Map<string, { campaignName: string; impressions: number; reach: number; adIds: Set<string> }>();
    for (const s of snapshots) {
        const cid = s.ad.campaignId;
        if (!campaignMap.has(cid)) {
            campaignMap.set(cid, { campaignName: s.ad.campaign.name, impressions: 0, reach: 0, adIds: new Set() });
        }
        const entry = campaignMap.get(cid)!;
        entry.impressions += s.impressions;
        entry.reach += s.reach;
        entry.adIds.add(s.adId);
    }
    const campaignSummaries = [...campaignMap.entries()].map(([campaignId, v]) => ({
        campaignId,
        campaignName: v.campaignName,
        impressions: v.impressions,
        reach: v.reach,
        adCount: v.adIds.size,
    }));

    return {
        orgId,
        totalImpressions: totals.impressions,
        totalReach: totals.reach,
        totalClicks: totals.clicks,
        totalSpent: totals.spent,
        avgCtr: totals.ctrSum / count,
        avgEngagementRate: totals.engSum / count,
        byPlatform,
        trendLast30Days,
        topAds,
        campaignSummaries,
    };
}

// ─── Compare Ads ──────────────────────────────────────────────────────────────

export interface AdComparison {
    adId: string;
    adName: string;
    platform: string;
    thumbnailUrl: string | null;
    impressions: number;
    reach: number;
    clicks: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    ctr: number;
    cpm: number;
    engagementRate: number;
    spent: number;
}

export async function compareAds(adIds: string[]): Promise<AdComparison[]> {
    const results: AdComparison[] = [];

    for (const adId of adIds) {
        const ad = await prisma.ad.findUnique({
            where: { id: adId },
            include: {
                analytics: { orderBy: { fetchedAt: 'desc' }, take: 1 },
            },
        });

        if (!ad) continue;

        const s = ad.analytics[0];
        if (!s) {
            results.push({
                adId: ad.id,
                adName: ad.name,
                platform: ad.platform,
                thumbnailUrl: ad.thumbnailUrl,
                impressions: 0, reach: 0, clicks: 0, likes: 0, comments: 0,
                shares: 0, saves: 0, ctr: 0, cpm: 0, engagementRate: 0, spent: 0,
            });
            continue;
        }

        const eng = s.reach > 0 ? ((s.likes + s.comments + s.shares + s.saves) / s.reach) * 100 : 0;
        results.push({
            adId: ad.id,
            adName: ad.name,
            platform: ad.platform,
            thumbnailUrl: ad.thumbnailUrl,
            impressions: s.impressions,
            reach: s.reach,
            clicks: s.clicks,
            likes: s.likes,
            comments: s.comments,
            shares: s.shares,
            saves: s.saves,
            ctr: s.ctr,
            cpm: s.cpm,
            engagementRate: eng,
            spent: s.spent,
        });
    }

    return results;
}

// ─── Export Data ──────────────────────────────────────────────────────────────

export interface ExportRow {
    adId: string;
    adName: string;
    platform: string;
    date: string;
    impressions: number;
    reach: number;
    clicks: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    ctr: number;
    cpm: number;
    engagementRate: number;
    spent: number;
}

export async function exportCampaignData(campaignId: string): Promise<ExportRow[]> {
    const ads = await prisma.ad.findMany({
        where: { campaignId },
        include: {
            analytics: { orderBy: { fetchedAt: 'asc' } },
        },
    });

    const rows: ExportRow[] = [];
    for (const ad of ads) {
        for (const s of ad.analytics) {
            const eng = s.reach > 0 ? ((s.likes + s.comments + s.shares + s.saves) / s.reach) * 100 : 0;
            rows.push({
                adId: ad.id,
                adName: ad.name,
                platform: ad.platform,
                date: s.fetchedAt.toISOString().split('T')[0],
                impressions: s.impressions,
                reach: s.reach,
                clicks: s.clicks,
                likes: s.likes,
                comments: s.comments,
                shares: s.shares,
                saves: s.saves,
                ctr: s.ctr,
                cpm: s.cpm,
                engagementRate: eng,
                spent: s.spent,
            });
        }
    }

    return rows;
}
