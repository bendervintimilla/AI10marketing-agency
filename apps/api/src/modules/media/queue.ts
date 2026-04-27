import { Queue, Worker, Job } from 'bullmq';
import { processMediaJobHandler } from './jobs/process-media';

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const mediaQueue = new Queue('process-media', { connection });

export const startMediaWorker = () => {
    const worker = new Worker('process-media', async (job: Job) => {
        await processMediaJobHandler(job);
    }, { connection });

    worker.on('completed', job => {
        console.log(`${job.id} has completed!`);
    });

    worker.on('failed', (job, err) => {
        console.log(`${job?.id} has failed with ${err.message}`);
    });

    return worker;
};
