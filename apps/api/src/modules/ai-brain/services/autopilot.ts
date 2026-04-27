import { prisma } from '@agency/db';
import { recommendation as recommendationRepo } from '@agency/db';
import axios from 'axios';
import { AIRecommendation } from '@agency/db';

const AGENT_COPY_URL = process.env.AGENT_COPY_URL || 'http://localhost:3001';
const AGENT_GENERATION_URL = process.env.AGENT_GENERATION_URL || 'http://localhost:3001';
const AGENT_PUBLISH_URL = process.env.AGENT_PUBLISH_URL || 'http://localhost:3001';

/**
 * Executes a single accepted recommendation action.
 * Called both by the accept endpoint (immediate) and the autopilot worker (deferred).
 */
export async function executeRecommendation(rec: AIRecommendation): Promise<void> {
    const payload = rec.payload as Record<string, unknown> | null;
    let executionLog: Record<string, unknown> = {};
    let success = false;

    try {
        switch (rec.type) {
            case 'PAUSE':
                executionLog = await executePause(rec.adId!, 'PAUSED');
                success = true;
                break;
            case 'REMOVE':
                executionLog = await executePause(rec.adId!, 'REMOVED');
                success = true;
                break;
            case 'IMPROVE': {
                const action = payload?.action as string | undefined;
                if (action === 'regenerate-copy') {
                    executionLog = await callCopyRegenerate(rec.adId!);
                } else if (action === 'create-variant') {
                    executionLog = await callGenerateVariant(rec.adId!);
                } else {
                    executionLog = { skipped: true, reason: 'Unknown improve action' };
                }
                success = true;
                break;
            }
            case 'SCHEDULE': {
                const slots = (payload as any)?.slots;
                executionLog = await callSchedulePost(rec.adId, slots);
                success = true;
                break;
            }
            case 'HASHTAG_REFRESH': {
                const suggestedHashtags = (payload as any)?.suggestedHashtags ?? [];
                if (rec.adId && suggestedHashtags.length) {
                    await prisma.ad.update({
                        where: { id: rec.adId },
                        data: { hashtags: suggestedHashtags },
                    });
                    executionLog = { updated: true, hashtags: suggestedHashtags };
                }
                success = true;
                break;
            }
            case 'BUDGET_REALLOCATION':
                executionLog = { skipped: true, reason: 'Budget reallocation requires manual approval' };
                success = false;
                break;
            default:
                executionLog = { skipped: true, reason: `Unhandled type: ${rec.type}` };
                success = false;
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        executionLog = { error: message, agentUnavailable: true };
        console.warn(`[Autopilot] Execution failed for rec ${rec.id}:`, message);
    }

    // Always update the rec with result
    await recommendationRepo.updateStatus(
        rec.id,
        success ? 'EXECUTED' : 'PENDING',
        success ? new Date() : undefined
    );

    // Patch payload with execution log
    await prisma.aIRecommendation.update({
        where: { id: rec.id },
        data: {
            payload: JSON.parse(JSON.stringify({
                ...((rec.payload as object) ?? {}),
                executionLog,
                executedAt: success ? new Date().toISOString() : null,
            })),
        },
    });
}

// ─── Pause / Remove ───────────────────────────────────────────

async function executePause(adId: string, status: 'PAUSED' | 'REMOVED'): Promise<Record<string, unknown>> {
    await prisma.ad.update({ where: { id: adId }, data: { status } });
    return { adId, newStatus: status };
}

// ─── Copy Regeneration (Agent 6) ─────────────────────────────

async function callCopyRegenerate(adId: string): Promise<Record<string, unknown>> {
    try {
        const res = await axios.post(
            `${AGENT_COPY_URL}/copy/regenerate`,
            { adId },
            { timeout: 10_000 }
        );
        return { agentResponse: res.data, adId };
    } catch {
        return { agentUnavailable: true, url: `${AGENT_COPY_URL}/copy/regenerate`, adId };
    }
}

// ─── Generate Variant (Agent 5) ──────────────────────────────

async function callGenerateVariant(adId: string): Promise<Record<string, unknown>> {
    try {
        const res = await axios.post(
            `${AGENT_GENERATION_URL}/generate`,
            { sourceAdId: adId, createVariant: true },
            { timeout: 10_000 }
        );
        return { agentResponse: res.data, adId };
    } catch {
        return { agentUnavailable: true, url: `${AGENT_GENERATION_URL}/generate`, adId };
    }
}

// ─── Schedule Post (Agent 7) ──────────────────────────────────

async function callSchedulePost(
    adId: string | null | undefined,
    slots: unknown
): Promise<Record<string, unknown>> {
    try {
        const res = await axios.post(
            `${AGENT_PUBLISH_URL}/publish/schedule`,
            { adId, slots },
            { timeout: 10_000 }
        );
        return { agentResponse: res.data, adId };
    } catch {
        return { agentUnavailable: true, url: `${AGENT_PUBLISH_URL}/publish/schedule`, adId };
    }
}
