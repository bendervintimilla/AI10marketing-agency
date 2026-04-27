import { AnalyticsSnapshot } from '@agency/db';

// ─── Types ────────────────────────────────────────────────────

export interface AdPerformanceSummary {
    adId: string;
    platform: string;
    avgCtr: number;
    avgCpm: number;
    avgEngagementRate: number;
    latestImpressions: number;
    ctrTrend: 'rising' | 'stable' | 'declining';
    ctrDropPercent: number;
}

export interface TimeSlot {
    dayOfWeek: number; // 0=Sun … 6=Sat
    hour: number;      // 0-23 UTC
    avgEngagement: number;
    sampleSize: number;
}

// ─── CTR Decline Detection ─────────────────────────────────────

/**
 * Flags ads whose CTR dropped more than `thresholdPercent` over the last `windowDays` days.
 */
export function findDecliningCtrAds(
    snapshotsByAdId: Record<string, AnalyticsSnapshot[]>,
    thresholdPercent = 30,
    windowDays = 3
): { adId: string; ctrDropPercent: number; reason: string }[] {
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const flagged: { adId: string; ctrDropPercent: number; reason: string }[] = [];

    for (const [adId, snapshots] of Object.entries(snapshotsByAdId)) {
        const sorted = snapshots
            .filter((s) => s.impressions > 0)
            .sort((a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime());

        if (sorted.length < 2) continue;

        const recent = sorted.filter((s) => new Date(s.fetchedAt) >= cutoff);
        const older = sorted.filter((s) => new Date(s.fetchedAt) < cutoff);

        if (!recent.length || !older.length) continue;

        const avgRecentCtr = avg(recent.map((s) => s.ctr));
        const avgOlderCtr = avg(older.map((s) => s.ctr));

        if (avgOlderCtr === 0) continue;
        const dropPercent = ((avgOlderCtr - avgRecentCtr) / avgOlderCtr) * 100;

        if (dropPercent >= thresholdPercent) {
            flagged.push({
                adId,
                ctrDropPercent: Math.round(dropPercent * 10) / 10,
                reason: `CTR dropped ${dropPercent.toFixed(1)}% over the last ${windowDays} days (was ${(avgOlderCtr * 100).toFixed(2)}%, now ${(avgRecentCtr * 100).toFixed(2)}%)`,
            });
        }
    }

    return flagged;
}

// ─── High CPM Detection ───────────────────────────────────────

/**
 * Flags ads whose CPM exceeds campaign average by `multiplier`x.
 */
export function findHighCpmAds(
    snapshotsByAdId: Record<string, AnalyticsSnapshot[]>,
    multiplier = 2
): { adId: string; adCpm: number; campaignAvgCpm: number; reason: string }[] {
    const avgCpmByAd: Record<string, number> = {};

    for (const [adId, snapshots] of Object.entries(snapshotsByAdId)) {
        const valid = snapshots.filter((s) => s.cpm > 0 && s.impressions > 0);
        if (valid.length) avgCpmByAd[adId] = avg(valid.map((s) => s.cpm));
    }

    const allCpms = Object.values(avgCpmByAd);
    if (!allCpms.length) return [];

    const campaignAvgCpm = avg(allCpms);
    const threshold = campaignAvgCpm * multiplier;

    return Object.entries(avgCpmByAd)
        .filter(([, cpm]) => cpm > threshold)
        .map(([adId, adCpm]) => ({
            adId,
            adCpm: Math.round(adCpm * 100) / 100,
            campaignAvgCpm: Math.round(campaignAvgCpm * 100) / 100,
            reason: `CPM of $${adCpm.toFixed(2)} is ${(adCpm / campaignAvgCpm).toFixed(1)}× campaign average ($${campaignAvgCpm.toFixed(2)})`,
        }));
}

// ─── Low Engagement Detection ─────────────────────────────────

/**
 * Flags ads below median engagement rate for their platform.
 */
export function findLowEngagementAds(
    snapshotsByAdId: Record<string, AnalyticsSnapshot[]>,
    platformByAdId: Record<string, string>
): { adId: string; engagementRate: number; platformMedian: number; reason: string }[] {
    // Group engagement rates by platform
    const platformRates: Record<string, number[]> = {};
    const adAvgEngagement: Record<string, number> = {};

    for (const [adId, snapshots] of Object.entries(snapshotsByAdId)) {
        const valid = snapshots.filter((s) => s.reach > 0);
        if (!valid.length) continue;

        const rate = avg(valid.map((s) => s.reach > 0 ? ((s.likes + s.comments + s.shares + s.saves) / s.reach) * 100 : 0));
        adAvgEngagement[adId] = rate;

        const platform = platformByAdId[adId] || 'UNKNOWN';
        if (!platformRates[platform]) platformRates[platform] = [];
        platformRates[platform].push(rate);
    }

    const platformMedians: Record<string, number> = {};
    for (const [platform, rates] of Object.entries(platformRates)) {
        platformMedians[platform] = median(rates);
    }

    return Object.entries(adAvgEngagement)
        .filter(([adId, rate]) => {
            const platform = platformByAdId[adId] || 'UNKNOWN';
            return rate < (platformMedians[platform] ?? 0);
        })
        .map(([adId, rate]) => {
            const platform = platformByAdId[adId] || 'UNKNOWN';
            const med = platformMedians[platform] ?? 0;
            return {
                adId,
                engagementRate: Math.round(rate * 10000) / 100,
                platformMedian: Math.round(med * 10000) / 100,
                reason: `Engagement rate ${(rate * 100).toFixed(2)}% is below ${platform} median (${(med * 100).toFixed(2)}%)`,
            };
        });
}

// ─── Optimal Posting Times ────────────────────────────────────

export interface BestPostingTime {
    platform: string;
    dayOfWeek: number;
    hour: number;
    dayName: string;
    score: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Finds top 3 posting time slots per platform based on engagement patterns.
 */
export function findOptimalPostingTimes(
    snapshotsByAdId: Record<string, AnalyticsSnapshot[]>,
    platformByAdId: Record<string, string>
): Record<string, BestPostingTime[]> {
    const slotScores: Record<string, Record<string, number[]>> = {};

    for (const [adId, snapshots] of Object.entries(snapshotsByAdId)) {
        const platform = platformByAdId[adId] || 'UNKNOWN';
        if (!slotScores[platform]) slotScores[platform] = {};

        for (const s of snapshots) {
            if (s.reach === 0) continue;
            const d = new Date(s.fetchedAt);
            const key = `${d.getUTCDay()}:${d.getUTCHours()}`;
            if (!slotScores[platform][key]) slotScores[platform][key] = [];
            slotScores[platform][key].push(s.reach > 0 ? ((s.likes + s.comments + s.shares + s.saves) / s.reach) * 100 : 0);
        }
    }

    const result: Record<string, BestPostingTime[]> = {};

    for (const [platform, slots] of Object.entries(slotScores)) {
        const scored = Object.entries(slots)
            .map(([key, rates]) => {
                const [day, hour] = key.split(':').map(Number);
                return { platform, dayOfWeek: day, hour: hour!, dayName: DAY_NAMES[day]!, score: avg(rates) };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        result[platform] = scored;
    }

    return result;
}

// ─── Ad Performance Summary ───────────────────────────────────

export function summarizeAdPerformance(
    adId: string,
    platform: string,
    snapshots: AnalyticsSnapshot[]
): AdPerformanceSummary {
    const sorted = [...snapshots].sort(
        (a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime()
    );

    const avgCtr = avg(sorted.map((s) => s.ctr));
    const avgCpm = avg(sorted.map((s) => s.cpm));
    const avgEngagementRate = avg(sorted.map((s) => s.reach > 0 ? ((s.likes + s.comments + s.shares + s.saves) / s.reach) * 100 : 0));
    const latestImpressions = sorted[sorted.length - 1]?.impressions ?? 0;

    // Trend: compare first-half vs second-half CTR
    const half = Math.floor(sorted.length / 2);
    const firstHalfCtr = avg(sorted.slice(0, half).map((s) => s.ctr));
    const secondHalfCtr = avg(sorted.slice(half).map((s) => s.ctr));
    const ctrDropPercent =
        firstHalfCtr > 0 ? ((firstHalfCtr - secondHalfCtr) / firstHalfCtr) * 100 : 0;

    const ctrTrend: AdPerformanceSummary['ctrTrend'] =
        ctrDropPercent > 15 ? 'declining' : ctrDropPercent < -10 ? 'rising' : 'stable';

    return {
        adId,
        platform,
        avgCtr,
        avgCpm,
        avgEngagementRate,
        latestImpressions,
        ctrTrend,
        ctrDropPercent: Math.max(0, ctrDropPercent),
    };
}

// ─── Utility ──────────────────────────────────────────────────

function avg(nums: number[]): number {
    if (!nums.length) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums: number[]): number {
    if (!nums.length) return 0;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? ((sorted[mid - 1]! + sorted[mid]!) / 2)
        : sorted[mid]!;
}
