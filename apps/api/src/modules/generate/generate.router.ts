import { FastifyInstance } from 'fastify';
import {
    generateVideo,
    generateImage,
    getGenerationStatus,
    generateBatch,
    retryGeneration,
} from './generate.controller';

export async function generateRoutes(fastify: FastifyInstance) {
    // Generate a video ad
    fastify.post('/generate/video', generateVideo);

    // Generate an image ad
    fastify.post('/generate/image', generateImage);

    // Get generation status by BullMQ job ID
    fastify.get<{ Params: { jobId: string } }>('/generate/status/:jobId', getGenerationStatus);

    // Batch generate multiple ad variants for a campaign
    fastify.post('/generate/batch', generateBatch);

    // Retry / regenerate an existing ad
    fastify.post<{ Params: { adId: string } }>('/generate/retry/:adId', retryGeneration);
}
