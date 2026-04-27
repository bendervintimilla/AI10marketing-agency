import { Queue } from 'bullmq';
import { getRedis } from './redis';

export const PUBLISH_QUEUE_NAME = 'publish-ad';

export interface PublishJobData {
    adId: string;
    platform: string;
    orgId: string;
}

let publishQueue: Queue<PublishJobData> | null = null;

export function getPublishQueue(): Queue<PublishJobData> {
    if (!publishQueue) {
        publishQueue = new Queue<PublishJobData>(PUBLISH_QUEUE_NAME, {
            connection: getRedis(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000, // 5s, 10s, 20s
                },
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 200 },
            },
        });
    }
    return publishQueue;
}
