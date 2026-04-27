import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from monorepo root
config({ path: resolve(__dirname, '../../../.env') });

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processGenerateAd } from './jobs/generate-ad';
import {
    aiRecommendationWorker,
    scheduleRecommendationRunForAllOrgs,
} from './jobs/ai-recommendation';
import {
    aiAutopilotWorker,
    scheduleAutopilotForAllOrgs,
} from './jobs/ai-autopilot';
import {
    fetchAnalyticsWorker,
    processFetchAnalytics,
    generateWeeklyReport,
} from './jobs/fetch-analytics';
import { createPublishWorker } from './jobs/publish-ad';
import { refreshAllHashtags } from './jobs/refreshHashtags';
import { processRunAudit } from './jobs/run-audit';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
});

// ─── generate-ad worker ───────────────────────────────────────────────────────

const generateAdWorker = new Worker(
    'generate-ad',
    processGenerateAd,
    {
        connection,
        concurrency: 3,       // Process up to 3 generation jobs simultaneously
        limiter: {
            max: 10,
            duration: 60_000, // Max 10 Veo/Imagen API calls per minute
        },
    }
);

generateAdWorker.on('completed', job => {
    console.log(`[worker] ✅ Job ${job.id} (Ad ${job.data.adId}) completed`);
});

generateAdWorker.on('failed', (job, err: Error) => {
    console.error(`[worker] ❌ Job ${job?.id} (Ad ${job?.data?.adId}) failed:`, err.message);
});

generateAdWorker.on('progress', (job, progress) => {
    console.log(`[worker] 📊 Job ${job.id} progress: ${progress}%`);
});

console.log('[worker] 🚀 generate-ad worker started');

// ─── ai-recommendation worker ─────────────────────────────────────────────────

aiRecommendationWorker.on('completed', (job) =>
    console.log(`[worker] ✅ ai-recommendation job ${job.id} completed`)
);
aiRecommendationWorker.on('failed', (job, err) =>
    console.error(`[worker] ❌ ai-recommendation job ${job?.id} failed:`, err.message)
);

// ─── ai-autopilot worker ─────────────────────────────────────────────────────

aiAutopilotWorker.on('completed', (job) =>
    console.log(`[worker] ✅ ai-autopilot job ${job.id} completed`)
);
aiAutopilotWorker.on('failed', (job, err) =>
    console.error(`[worker] ❌ ai-autopilot job ${job?.id} failed:`, err.message)
);

console.log('[worker] 🤖 AI recommendation + autopilot workers started');

// ─── publish-ad worker ────────────────────────────────────────────────────────

const publishWorker = createPublishWorker(REDIS_URL);

publishWorker.on('completed', (job) =>
    console.log(`[worker] ✅ publish-ad job ${job?.id} completed`)
);

console.log('[worker] 📤 publish-ad worker started');

// ─── run-audit worker ─────────────────────────────────────────────────────────

const auditWorker = new Worker('run-audit', processRunAudit, {
    connection,
    concurrency: 2, // Meta API rate limits — keep low
});

auditWorker.on('completed', (job) =>
    console.log(`[worker] ✅ audit job ${job.id} completed`)
);
auditWorker.on('failed', (job, err: Error) =>
    console.error(`[worker] ❌ audit job ${job?.id} failed:`, err.message)
);

console.log('[worker] 🔍 run-audit worker started');

// ─── Scheduling ───────────────────────────────────────────────────────────────

// Kick off once on startup
scheduleRecommendationRunForAllOrgs().catch(console.error);

// Every 6 hours: enqueue recommendation jobs for all active orgs
setInterval(() => scheduleRecommendationRunForAllOrgs().catch(console.error), 6 * 60 * 60 * 1000);

// Every hour: run autopilot for orgs with autoPilot=true
setInterval(() => scheduleAutopilotForAllOrgs().catch(console.error), 60 * 60 * 1000);

// Every 24 hours: refresh trending hashtag cache
refreshAllHashtags().catch(console.error); // warm cache on startup
setInterval(() => refreshAllHashtags().catch(console.error), 24 * 60 * 60 * 1000);
console.log('[worker] 🏷️  Hashtag refresh scheduled (daily)');

// ─── fetch-analytics worker ───────────────────────────────────────────────────

fetchAnalyticsWorker.on('completed', (job) =>
    console.log(`[worker] ✅ fetch-analytics job ${job.id} completed`)
);
fetchAnalyticsWorker.on('failed', (job, err: Error) =>
    console.error(`[worker] ❌ fetch-analytics job ${job?.id} failed:`, err.message)
);

console.log('[worker] 📊 fetch-analytics worker started');

// Fetch analytics immediately on startup, then every 4 hours
processFetchAnalytics().catch(console.error);
setInterval(() => processFetchAnalytics().catch(console.error), 4 * 60 * 60 * 1000);

// Every Monday: send weekly analytics report
const now = new Date();
const msUntilMonday = (() => {
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
    const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(8, 0, 0, 0);
    return nextMonday.getTime() - now.getTime();
})();
setTimeout(() => {
    generateWeeklyReport().catch(console.error);
    setInterval(() => generateWeeklyReport().catch(console.error), 7 * 24 * 60 * 60 * 1000);
}, msUntilMonday);
console.log('[worker] 📧 Weekly analytics report scheduled');

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
async function shutdown(signal: string) {
    console.log(`[worker] Received ${signal}, shutting down gracefully…`);
    try {
        await Promise.allSettled([
            generateAdWorker.close(),
            aiRecommendationWorker.close(),
            aiAutopilotWorker.close(),
            fetchAnalyticsWorker.close(),
            publishWorker.close(),
            auditWorker.close(),
        ]);
        await connection.quit();
        console.log('[worker] All workers closed.');
        process.exit(0);
    } catch (err) {
        console.error('[worker] Error during shutdown:', err);
        process.exit(1);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
