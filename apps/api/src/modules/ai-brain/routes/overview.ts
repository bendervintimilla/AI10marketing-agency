/**
 * overview.ts — AI Insights overview + quick-chat endpoints.
 *
 * Migrated from Gemini → Claude. The Gemini key was returning 400 API_KEY_INVALID
 * in production. Claude (via the Anthropic SDK already used by the rest of the
 * platform) is the single source of truth for AI now.
 */

import { FastifyInstance } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@agency/db';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

interface InsightOverview {
    summary: string;
    healthScore: number;
    topPerformers: Array<{ name: string; platform: string; metric: string; value: string }>;
    recommendations: Array<{ title: string; description: string; type: string; confidence: number }>;
    alerts: Array<{ title: string; severity: 'info' | 'warning' | 'critical' }>;
}

async function claudeJson<T>(prompt: string, system?: string): Promise<T> {
    const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: system ?? 'You are a senior digital marketing strategist. Output valid JSON only — no prose around it, no code fences.',
        messages: [{ role: 'user', content: prompt }],
    });
    const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
    const cleaned = text
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/\s*```\s*$/m, '')
        .trim();
    return JSON.parse(cleaned) as T;
}

async function claudeText(prompt: string, system: string): Promise<string> {
    const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: prompt }],
    });
    return res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
}

export async function overviewRoutes(fastify: FastifyInstance) {
    /**
     * GET /ai/insights/overview
     * Org-wide AI-generated insights. Scoped to the authenticated user's org
     * (falls back to the first org for legacy/demo callers without auth).
     */
    fastify.get('/ai/insights/overview', async (request, reply) => {
        try {
            const user = (request as any).user as { orgId?: string; organizationId?: string } | undefined;
            const orgId = user?.orgId ?? user?.organizationId;

            const org = orgId
                ? await prisma.organization.findUnique({
                    where: { id: orgId },
                    include: {
                        campaigns: {
                            include: {
                                ads: {
                                    include: {
                                        analytics: { orderBy: { fetchedAt: 'desc' }, take: 7 },
                                    },
                                },
                            },
                        },
                    },
                })
                : await prisma.organization.findFirst({
                    include: {
                        campaigns: {
                            include: {
                                ads: {
                                    include: {
                                        analytics: { orderBy: { fetchedAt: 'desc' }, take: 7 },
                                    },
                                },
                            },
                        },
                    },
                });

            const campaigns = org?.campaigns ?? [];
            const totalAds = campaigns.reduce((s, c) => s + c.ads.length, 0);
            const totalImpressions = campaigns
                .flatMap((c) => c.ads)
                .flatMap((a) => a.analytics)
                .reduce((s, snap) => s + snap.impressions, 0);
            const totalClicks = campaigns
                .flatMap((c) => c.ads)
                .flatMap((a) => a.analytics)
                .reduce((s, snap) => s + snap.clicks, 0);
            const totalSpent = campaigns
                .flatMap((c) => c.ads)
                .flatMap((a) => a.analytics)
                .reduce((s, snap) => s + snap.spent, 0);

            // Pull recent failed audit checks so insights tie to real data we DO have
            // even when the org has no ad telemetry yet.
            const failedChecks = orgId
                ? await prisma.auditCheck.findMany({
                    where: {
                        status: 'FAIL' as any,
                        auditRun: { brand: { organizationId: orgId } },
                    },
                    orderBy: { id: 'desc' },
                    take: 12,
                    select: { checkId: true, category: true, message: true, severity: true, recommendation: true },
                })
                : [];

            const brandCount = orgId ? await prisma.brand.count({ where: { organizationId: orgId } }) : 0;

            const prompt = `Generate a strategic marketing overview for "${org?.name ?? 'this agency'}".

REAL ORG STATE:
- Brands in portfolio: ${brandCount}
- Active campaigns: ${campaigns.length}
- Total ads: ${totalAds}
- Total impressions (from connected ad accounts): ${totalImpressions.toLocaleString()}
- Total clicks: ${totalClicks.toLocaleString()}
- Overall CTR: ${totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0'}%
- Total spend: $${totalSpent.toFixed(2)}

${campaigns.length > 0 ? `CAMPAIGNS:
${campaigns.map((c) => `- "${c.name}" (${c.status}): ${c.ads.length} ads, goal=${c.goal}`).join('\n')}` : 'No campaigns yet.'}

${failedChecks.length > 0 ? `RECENT AUDIT FINDINGS (failing checks across brands):
${failedChecks.map((c) => `- [${c.checkId}/${c.severity}] ${c.message}`).join('\n')}` : 'No audits run yet.'}

Return ONLY this JSON object — no other text:
{
  "summary": "2-3 paragraph markdown summary grounded in the REAL data above. Use **bold** for key metrics. If there's no ad telemetry, focus on the audit findings + brand portfolio. Do NOT invent numbers.",
  "healthScore": <0-100, derived from real signals: more failing audit checks = lower score; ${totalAds === 0 ? 'no ads yet = score around 40-55 (room to grow)' : 'consider CTR vs benchmark'}>,
  "topPerformers": [
    {"name": "<brand or campaign or audit>", "platform": "<platform>", "metric": "<what>", "value": "<value>"}
  ],
  "recommendations": [
    {"title": "Concrete action", "description": "1-2 sentences with WHY tied to the real data", "type": "Budget|Creative|Targeting|Schedule", "confidence": <50-95>}
  ],
  "alerts": [
    {"title": "What needs attention NOW", "severity": "info|warning|critical"}
  ]
}

Rules:
- 3-5 recommendations. Each must reference real data above (a specific brand, audit checkId, or metric).
- 2-3 alerts. Critical only if there's a clear risk in the data.
- topPerformers: at most 3. If no ad telemetry, use top-scoring brands from audits, or omit.
- Never invent campaign names or metrics that aren't in the data above.`;

            const insights = await claudeJson<InsightOverview>(prompt);
            return reply.send({ success: true, data: insights });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            fastify.log.error(err, 'AI overview generation failed');
            return reply.status(500).send({ success: false, error: message });
        }
    });

    /**
     * POST /ai/chat/quick — single-turn marketing assistant.
     */
    fastify.post<{ Body: { message: string } }>('/ai/chat/quick', async (request, reply) => {
        try {
            const { message } = request.body;
            if (!message) return reply.status(400).send({ success: false, error: 'message is required' });

            const system =
                'You are an expert AI marketing assistant for a digital agency. ' +
                'You help with campaign strategy, ad copy, audience targeting, budget optimization, ' +
                'and performance analysis. Be concise, actionable, and data-driven. ' +
                'Use **bold** for key points. Keep responses under 200 words.';

            const response = await claudeText(message, system);
            return reply.send({ success: true, data: { response } });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return reply.status(500).send({ success: false, error: message });
        }
    });
}
