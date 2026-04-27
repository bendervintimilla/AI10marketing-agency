import { prisma } from '@agency/db';
import { generateNarrativeContent } from './gemini';

/**
 * Generates a natural language campaign performance summary using Gemini.
 * Called by GET /ai/insights/:campaignId
 */
export async function getCampaignInsights(campaignId: string): Promise<string> {
    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
            ads: {
                include: {
                    analytics: {
                        orderBy: { fetchedAt: 'desc' },
                        take: 14,
                    },
                },
            },
        },
    });

    if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
    }

    // Aggregate metrics
    const totalImpressions = campaign.ads
        .flatMap((a) => a.analytics)
        .reduce((s, snap) => s + snap.impressions, 0);

    const totalClicks = campaign.ads
        .flatMap((a) => a.analytics)
        .reduce((s, snap) => s + snap.clicks, 0);

    const totalSpend = campaign.ads
        .flatMap((a) => a.analytics)
        .reduce((s, snap) => s + snap.spent, 0);

    const avgEngagement =
        campaign.ads
            .flatMap((a) => a.analytics)
            .reduce((s, snap, _, arr) => {
                const eng = snap.reach > 0 ? ((snap.likes + snap.comments + snap.shares + snap.saves) / snap.reach) * 100 : 0;
                return s + eng / arr.length;
            }, 0);

    const platformBreakdown = campaign.ads.reduce<Record<string, number>>((acc, ad) => {
        acc[ad.platform] = (acc[ad.platform] ?? 0) + ad.analytics.reduce((s, a) => s + a.impressions, 0);
        return acc;
    }, {});

    const topAds = campaign.ads
        .map((ad) => ({
            name: ad.name,
            platform: ad.platform,
            avgEngagement: ad.analytics.reduce((s, a, _, arr) => {
                const eng = a.reach > 0 ? ((a.likes + a.comments + a.shares + a.saves) / a.reach) * 100 : 0;
                return s + eng / arr.length;
            }, 0),
        }))
        .filter((a) => a.avgEngagement > 0)
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, 3);

    const prompt = `
You are a senior digital marketing analyst. Write a concise, insightful campaign performance summary.

Campaign: "${campaign.name}"
Goal: ${campaign.goal}
Status: ${campaign.status}
Date Range: ${(campaign.startDate ?? new Date()).toDateString()} – ${campaign.endDate?.toDateString() ?? 'ongoing'}
Budget: ${campaign.budget ? `$${campaign.budget}` : 'not set'}

Performance (last 14 days):
- Total Impressions: ${totalImpressions.toLocaleString()}
- Total Clicks: ${totalClicks.toLocaleString()}
- Overall CTR: ${totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0}%
- Total Spend: $${totalSpend.toFixed(2)}
- Average Engagement Rate: ${(avgEngagement * 100).toFixed(2)}%
- Platform Breakdown: ${JSON.stringify(platformBreakdown)}
- Top Performing Ads: ${JSON.stringify(topAds)}
- Total Ads: ${campaign.ads.length}

Write a 3-5 paragraph markdown summary covering:
1. Overall health assessment
2. Platform insights
3. Standout performers
4. Key areas for improvement
5. Concrete next steps

Use **bold** for key metrics. Be specific, data-driven, and actionable.`.trim();

    return generateNarrativeContent(prompt);
}
