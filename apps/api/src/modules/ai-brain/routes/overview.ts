import { FastifyInstance } from 'fastify';
import { prisma } from '@agency/db';
import { generateStructuredContent, generateNarrativeContent } from '../services/gemini';

interface InsightOverview {
    summary: string;
    healthScore: number;
    topPerformers: Array<{ name: string; platform: string; metric: string; value: string }>;
    recommendations: Array<{ title: string; description: string; type: string; confidence: number }>;
    alerts: Array<{ title: string; severity: 'info' | 'warning' | 'critical' }>;
}

export async function overviewRoutes(fastify: FastifyInstance) {
    /**
     * GET /ai/insights/overview
     * Org-wide AI-generated insights (demo mode: uses first org)
     */
    fastify.get('/ai/insights/overview', async (_request, reply) => {
        try {
            // Demo mode: grab the first org's campaigns
            const org = await prisma.organization.findFirst({
                include: {
                    campaigns: {
                        include: {
                            ads: {
                                include: {
                                    analytics: {
                                        orderBy: { fetchedAt: 'desc' },
                                        take: 7,
                                    },
                                },
                            },
                        },
                    },
                },
            });

            // If no data in DB, return Gemini-generated mock analysis
            const campaigns = org?.campaigns ?? [];
            const totalAds = campaigns.reduce((s, c) => s + c.ads.length, 0);
            const totalImpressions = campaigns
                .flatMap(c => c.ads)
                .flatMap(a => a.analytics)
                .reduce((s, snap) => s + snap.impressions, 0);
            const totalClicks = campaigns
                .flatMap(c => c.ads)
                .flatMap(a => a.analytics)
                .reduce((s, snap) => s + snap.clicks, 0);
            const totalSpent = campaigns
                .flatMap(c => c.ads)
                .flatMap(a => a.analytics)
                .reduce((s, snap) => s + snap.spent, 0);

            const prompt = `You are a senior marketing analyst AI assistant. Generate a comprehensive marketing performance overview.

Organization: "${org?.name ?? 'Marketing Agency'}"
Total Campaigns: ${campaigns.length}
Total Ads: ${totalAds}
Total Impressions: ${totalImpressions.toLocaleString()}
Total Clicks: ${totalClicks.toLocaleString()}
Overall CTR: ${totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0'}%
Total Spend: $${totalSpent.toFixed(2)}

${campaigns.length > 0 ? `Campaign Details:
${campaigns.map(c => `- "${c.name}" (${c.status}): ${c.ads.length} ads, goal: ${c.goal}`).join('\n')}` : 'No campaigns yet — this is a new account.'}

Return a JSON object with this exact structure:
{
  "summary": "2-3 paragraph markdown summary of overall marketing performance with **bold** metrics",
  "healthScore": <number 0-100>,
  "topPerformers": [{"name": "...", "platform": "...", "metric": "...", "value": "..."}],
  "recommendations": [{"title": "...", "description": "...", "type": "Budget|Creative|Targeting|Schedule", "confidence": <number 50-99>}],
  "alerts": [{"title": "...", "severity": "info|warning|critical"}]
}

If there's no real data, generate realistic demo insights for a marketing agency getting started. Include 3-4 recommendations and 2-3 alerts. Make the summary engaging and data-driven.`;

            const insights = await generateStructuredContent<InsightOverview>(prompt);
            return reply.send({ success: true, data: insights });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            fastify.log.error(err, 'AI overview generation failed');
            return reply.status(500).send({ success: false, error: message });
        }
    });

    /**
     * POST /ai/chat/quick
     * Simple AI marketing chat — no auth for demo
     */
    fastify.post<{ Body: { message: string } }>(
        '/ai/chat/quick',
        async (request, reply) => {
            try {
                const { message } = request.body;
                if (!message) return reply.status(400).send({ success: false, error: 'message is required' });

                const systemPrompt = `You are an expert AI marketing assistant for a digital agency. 
You help with campaign strategy, ad copy, audience targeting, budget optimization, and performance analysis.
Be concise, actionable, and data-driven. Use **bold** for key points. Keep responses under 200 words.`;

                const response = await generateNarrativeContent(`${systemPrompt}\n\nUser question: ${message}`);
                return reply.send({ success: true, data: { response } });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                return reply.status(500).send({ success: false, error: message });
            }
        }
    );
}
