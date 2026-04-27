import { Queue } from 'bullmq';
import { getRedis } from '../../lib/redis';

export const generateAdQueue = new Queue('generate-ad', {
    connection: getRedis(),
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
    },
});


export interface GenerateJobPayload {
    adId: string;
    generationType: 'VIDEO' | 'IMAGE';
    productMediaIds: string[];
    brandId: string;
    campaignId: string;
    platform: string;
    format: string;
    style?: string;
    userPrompt?: string;
}

export async function enqueueGenerate(payload: GenerateJobPayload): Promise<string> {
    const job = await generateAdQueue.add('generate', payload, {
        jobId: `gen-${payload.adId}`,
    });
    return job.id!;
}
