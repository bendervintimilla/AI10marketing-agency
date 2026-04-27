import { FastifyRequest, FastifyReply } from 'fastify';
import { ad as adRepo } from '@agency/db';
import { generateAdQueue, enqueueGenerate } from './generate.queue';
import {
    GenerateVideoSchema,
    GenerateImageSchema,
    GenerateBatchSchema,
    RetrySchema,
    GenerateVideoInput,
    GenerateImageInput,
    GenerateBatchInput,
    RetryInput,
} from './generate.schema';

// ─── Helper ──────────────────────────────────────────────────────────────────

function mapBullMQState(state: string | undefined): 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED' {
    switch (state) {
        case 'waiting':
        case 'delayed':
        case 'prioritized':
            return 'QUEUED';
        case 'active':
            return 'PROCESSING';
        case 'completed':
            return 'COMPLETE';
        case 'failed':
            return 'FAILED';
        default:
            return 'QUEUED';
    }
}

// ─── POST /generate/video ────────────────────────────────────────────────────

export async function generateVideo(req: FastifyRequest, reply: FastifyReply) {
    const parsed = GenerateVideoSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const body = parsed.data as GenerateVideoInput;

    // Create Ad record in QUEUED state
    const newAd = await adRepo.create({
        campaignId: body.campaignId,
        brandId: body.brandId,
        name: `${body.platform} ${body.format} Video`,
        platform: body.platform as any,
        format: body.format as any,
        generationType: 'VIDEO',
        status: 'QUEUED',
        style: body.style,
    });

    // Enqueue generation job
    const jobId = await enqueueGenerate({
        adId: newAd.id,
        generationType: 'VIDEO',
        productMediaIds: body.productMediaIds,
        brandId: body.brandId,
        campaignId: body.campaignId,
        platform: body.platform,
        format: body.format,
        style: body.style,
        userPrompt: body.prompt,
    });

    // Store jobId on the Ad record
    await adRepo.update(newAd.id, { jobId });

    return reply.status(202).send({ adId: newAd.id, jobId });
}

// ─── POST /generate/image ────────────────────────────────────────────────────

export async function generateImage(req: FastifyRequest, reply: FastifyReply) {
    const parsed = GenerateImageSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const body = parsed.data as GenerateImageInput;

    const newAd = await adRepo.create({
        campaignId: body.campaignId,
        brandId: body.brandId,
        name: `${body.platform} ${body.format} Image`,
        platform: body.platform as any,
        format: body.format as any,
        generationType: 'IMAGE',
        status: 'QUEUED',
        style: body.style,
    });

    const jobId = await enqueueGenerate({
        adId: newAd.id,
        generationType: 'IMAGE',
        productMediaIds: body.productMediaIds,
        brandId: body.brandId,
        campaignId: body.campaignId,
        platform: body.platform,
        format: body.format,
        style: body.style,
        userPrompt: body.prompt,
    });

    await adRepo.update(newAd.id, { jobId });

    return reply.status(202).send({ adId: newAd.id, jobId });
}

// ─── GET /generate/status/:jobId ─────────────────────────────────────────────

export async function getGenerationStatus(
    req: FastifyRequest<{ Params: { jobId: string } }>,
    reply: FastifyReply
) {
    const { jobId } = req.params;

    const job = await generateAdQueue.getJob(jobId);
    if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
    }

    const state = await job.getState();
    const adRecord = await adRepo.findByJobId(jobId);

    return reply.send({
        jobId,
        status: mapBullMQState(state),
        progress: job.progress,
        adId: adRecord?.id ?? null,
        ad: adRecord
            ? {
                id: adRecord.id,
                status: adRecord.status,
                generatedVideoUrl: adRecord.generatedVideoUrl,
                generatedImageUrl: adRecord.generatedImageUrl,
                thumbnailUrl: adRecord.thumbnailUrl,
                creativeBrief: adRecord.creativeBrief,
            }
            : null,
    });
}

// ─── POST /generate/batch ────────────────────────────────────────────────────

export async function generateBatch(req: FastifyRequest, reply: FastifyReply) {
    const parsed = GenerateBatchSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const body = parsed.data as GenerateBatchInput;

    const results: Array<{ adId: string; jobId: string; platform: string; format: string; variant: number }> = [];

    for (const platform of body.platforms) {
        for (const format of body.formats) {
            for (let i = 0; i < body.countPerCombo; i++) {
                // Infer generation type: REEL/STORY = video, POST/CAROUSEL = image
                const generationType: 'VIDEO' | 'IMAGE' = ['REEL', 'STORY'].includes(format) ? 'VIDEO' : 'IMAGE';

                const newAd = await adRepo.create({
                    campaignId: body.campaignId,
                    brandId: body.brandId,
                    name: `${platform} ${format} ${generationType === 'VIDEO' ? 'Video' : 'Image'} v${i + 1}`,
                    platform: platform as any,
                    format: format as any,
                    generationType,
                    status: 'QUEUED',
                    style: body.style,
                });

                const jobId = await enqueueGenerate({
                    adId: newAd.id,
                    generationType,
                    productMediaIds: body.productMediaIds,
                    brandId: body.brandId,
                    campaignId: body.campaignId,
                    platform,
                    format,
                    style: body.style,
                    userPrompt: body.prompt,
                });

                await adRepo.update(newAd.id, { jobId });

                results.push({ adId: newAd.id, jobId, platform, format, variant: i + 1 });
            }
        }
    }

    return reply.status(202).send({
        count: results.length,
        jobs: results,
    });
}

// ─── POST /generate/retry/:adId ──────────────────────────────────────────────

export async function retryGeneration(
    req: FastifyRequest<{ Params: { adId: string } }>,
    reply: FastifyReply
) {
    const parsed = RetrySchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const body = parsed.data as RetryInput;
    const { adId } = req.params;

    const originalAd = await adRepo.findById(adId);
    if (!originalAd) {
        return reply.status(404).send({ error: 'Ad not found' });
    }

    // Create a new Ad linked to the original as previous version
    const newAd = await adRepo.create({
        campaignId: originalAd.campaignId,
        brandId: originalAd.brandId ?? undefined,
        name: `${originalAd.name} (retry)`,
        platform: originalAd.platform,
        format: originalAd.format,
        generationType: originalAd.generationType,
        status: 'QUEUED',
        style: body.style ?? originalAd.style ?? undefined,
        previousVersionId: originalAd.id,
    });

    // Enqueue the new generation job
    const jobId = await enqueueGenerate({
        adId: newAd.id,
        generationType: originalAd.generationType as 'VIDEO' | 'IMAGE',
        productMediaIds: [], // Worker will resolve from original if empty — see worker implementation
        brandId: originalAd.brandId ?? '',
        campaignId: originalAd.campaignId,
        platform: originalAd.platform,
        format: originalAd.format,
        style: body.style ?? originalAd.style ?? undefined,
        userPrompt: body.prompt,
    });

    await adRepo.update(newAd.id, { jobId });

    return reply.status(202).send({
        newAdId: newAd.id,
        jobId,
        previousAdId: originalAd.id,
    });
}
