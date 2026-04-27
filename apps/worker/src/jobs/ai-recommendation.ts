import { Worker, Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@agency/db';
import { recommendation as recommendationRepo } from '@agency/db';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export const AI_RECOMMENDATION_QUEUE = 'ai-recommendation';

export const aiRecommendationQueue = new Queue(AI_RECOMMENDATION_QUEUE, { connection });

// ─── Inline core logic (avoids cross-app import from apps/api) ─────────────────

async function generateForOrg(orgId: string): Promise<void> {
    const API_BASE = process.env.API_URL || 'http://localhost:3001';
    const WORKER_SECRET = process.env.WORKER_SECRET || 'worker-secret';

    // Call the internal API trigger endpoint
    const response = await fetch(`${API_BASE}/ai/internal/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-worker-secret': WORKER_SECRET,
        },
        body: JSON.stringify({ orgId }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`API analyze failed: ${response.status} ${body}`);
    }
}

/**
 * BullMQ Worker: processes ai-recommendation jobs.
 * Job data: { orgId: string }
 */
export const aiRecommendationWorker = new Worker(
    AI_RECOMMENDATION_QUEUE,
    async (job: Job<{ orgId: string }>) => {
        const { orgId } = job.data;
        console.log(`[AIRecommendationJob] Running for org: ${orgId}`);
        await generateForOrg(orgId);
        console.log(`[AIRecommendationJob] Completed for org: ${orgId}`);
    },
    { connection, concurrency: 3 }
);

/**
 * Enqueues recommendation jobs for all orgs with active campaigns.
 * Called every 6 hours from the scheduler.
 */
export async function scheduleRecommendationRunForAllOrgs(): Promise<void> {
    const orgs = await prisma.organization.findMany({
        where: {
            campaigns: {
                some: { status: { in: ['ACTIVE', 'DRAFT'] } },
            },
        },
        select: { id: true },
    });

    console.log(`[AIRecommendationScheduler] Enqueueing jobs for ${orgs.length} orgs`);

    for (const org of orgs) {
        await aiRecommendationQueue.add(
            'run',
            { orgId: org.id },
            {
                jobId: `org-${org.id}-${Date.now()}`,
                attempts: 3,
                backoff: { type: 'exponential', delay: 60_000 },
            }
        );
    }
}
