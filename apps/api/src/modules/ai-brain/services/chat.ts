import { prisma } from '@agency/db';
import { runChatSession } from './gemini';
import { Content } from '@google/generative-ai';
import { ChatMessage } from '@agency/shared';

/**
 * Handles a multi-turn conversational query about an organization's marketing data.
 * Called by POST /ai/chat
 */
export async function handleChat(orgId: string, messages: ChatMessage[]): Promise<string> {
    // 1. Build org context
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
            campaigns: {
                include: {
                    ads: {
                        include: {
                            analytics: { orderBy: { fetchedAt: 'desc' }, take: 3 },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            },
        },
    });

    if (!org) throw new Error(`Organization ${orgId} not found`);

    // 2. Build a compact context summary for Gemini
    const campaignSummaries = org.campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        goal: c.goal,
        status: c.status,
        adCount: c.ads.length,
        platforms: [...new Set(c.ads.map((a) => a.platform))],
        recentImpressions: c.ads
            .flatMap((a) => a.analytics)
            .reduce((s, snap) => s + snap.impressions, 0),
        recentClicks: c.ads
            .flatMap((a) => a.analytics)
            .reduce((s, snap) => s + snap.clicks, 0),
    }));

    const systemContext = `You are the AI marketing brain for "${org.name}". 
You have access to their real-time campaign data and can answer questions about performance, strategy, and recommendations.

Current organization context:
${JSON.stringify({ org: org.name, autoPilot: org.autoPilot, campaigns: campaignSummaries }, null, 2)}

You can:
- Analyze campaign and ad performance
- Explain why ads are underperforming
- Suggest what to post next
- Recommend budget allocation
- Guide scheduling decisions

Always be specific, reference actual data from the context, and provide actionable advice.
Format responses in clear markdown with bullet points where appropriate.`;

    // 3. Build Gemini chat history (all messages before the last one)
    const history: Content[] = [
        {
            role: 'user',
            parts: [{ text: systemContext }],
        },
        {
            role: 'model',
            parts: [{ text: `Understood! I'm ready to help analyze ${org.name}'s marketing performance. What would you like to know?` }],
        },
        // Previous conversation turns
        ...messages.slice(0, -1).map((m) => ({
            role: m.role as 'user' | 'model',
            parts: [{ text: m.content }],
        })),
    ];

    // 4. Last message is the current user query
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('Last message must be from user');
    }

    return runChatSession(history, lastMessage.content);
}
