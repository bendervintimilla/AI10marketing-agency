import { Worker, Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@agency/db';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export const AI_AUTOPILOT_QUEUE = 'ai-autopilot';

export const aiAutopilotQueue = new Queue(AI_AUTOPILOT_QUEUE, { connection });

// ─── Inline autopilot trigger (avoids cross-app imports) ──────────────────────

async function triggerAutopilotForOrg(orgId: string): Promise<void> {
    const API_BASE = process.env.API_URL || 'http://localhost:3001';
    const WORKER_SECRET = process.env.WORKER_SECRET || 'worker-secret';

    const response = await fetch(`${API_BASE}/ai/internal/autopilot`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-worker-secret': WORKER_SECRET,
        },
        body: JSON.stringify({ orgId }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`API autopilot failed: ${response.status} ${body}`);
    }
}

/**
 * BullMQ Worker: executes autopilot for orgs with autoPilot=true.
 * Job data: { orgId: string }
 */
export const aiAutopilotWorker = new Worker(
    AI_AUTOPILOT_QUEUE,
    async (job: Job<{ orgId: string }>) => {
        const { orgId } = job.data;
        console.log(`[AutopilotJob] Running for org: ${orgId}`);
        await triggerAutopilotForOrg(orgId);
        console.log(`[AutopilotJob] Completed for org: ${orgId}`);
    },
    { connection, concurrency: 2 }
);

/**
 * Enqueues autopilot jobs for all orgs with autoPilot=true.
 * Called every hour from the scheduler.
 */
export async function scheduleAutopilotForAllOrgs(): Promise<void> {
    const orgs = await prisma.organization.findMany({
        where: { autoPilot: true },
        select: { id: true },
    });

    console.log(`[AutopilotScheduler] Enqueueing autopilot for ${orgs.length} orgs`);

    for (const org of orgs) {
        await aiAutopilotQueue.add(
            'run',
            { orgId: org.id },
            {
                jobId: `autopilot-${org.id}-${Date.now()}`,
                attempts: 2,
                backoff: { type: 'fixed', delay: 30_000 },
            }
        );
    }
}
