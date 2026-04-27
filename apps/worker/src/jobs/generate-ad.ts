import type { Job } from 'bullmq';
import axios from 'axios';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ad as adRepo } from '@agency/db';
import { buildGenerationPrompt } from '../services/prompt.service';
import { GenerateJobPayload } from '../types/generate';

// ─── S3 Client ────────────────────────────────────────────────────────────────

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin',
    },
    endpoint: process.env.AWS_S3_ENDPOINT || 'http://localhost:9000',
    forcePathStyle: true,
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME || 'media-assets';
const S3_PUBLIC_URL = process.env.AWS_S3_PUBLIC_URL || 'http://localhost:9000';

// ─── Veo 3.1 integration ─────────────────────────────────────────────────────

const VEO_API_KEY = process.env.VEO_API_KEY || process.env.GEMINI_API_KEY || '';
const VEO_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

async function generateVideoWithVeo(
    visualPrompt: string,
    aspectRatio: string,
    durationSeconds: number = 8,
    referenceImageUrls: string[] = []
): Promise<string> {
    // Build request body
    const requestBody: any = {
        model: 'veo-3.0-generate-preview',
        prompt: visualPrompt,
        config: {
            aspectRatio,
            durationSeconds,
        },
    };

    if (referenceImageUrls.length > 0) {
        // Include reference images as base content
        requestBody.image = {
            imageUri: referenceImageUrls[0],
            mimeType: 'image/jpeg',
        };
    }

    // Start video generation operation
    const startRes = await axios.post(
        `${VEO_BASE_URL}/models/veo-3.0-generate-preview:generateVideo`,
        requestBody,
        {
            headers: {
                'x-goog-api-key': VEO_API_KEY,
                'Content-Type': 'application/json',
            },
        }
    );

    const operationName: string = startRes.data.name;
    if (!operationName) throw new Error('Veo API did not return an operation name');

    // Poll for completion (max 10 minutes)
    const maxAttempts = 60;
    const pollIntervalMs = 10_000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(r => setTimeout(r, pollIntervalMs));

        const pollRes = await axios.get(
            `${VEO_BASE_URL}/operations/${operationName}`,
            {
                headers: { 'x-goog-api-key': VEO_API_KEY },
            }
        );

        const { done, error, response } = pollRes.data;

        if (error) throw new Error(`Veo generation failed: ${JSON.stringify(error)}`);

        if (done && response) {
            const videoUri = response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
            if (!videoUri) throw new Error('Veo response missing video URI');
            return videoUri;
        }
    }

    throw new Error('Veo video generation timed out after 10 minutes');
}

// ─── Image generation (Imagen 3) ─────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function generateImageWithImagen(
    visualPrompt: string,
    aspectRatio: string
): Promise<Buffer> {
    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generate`,
        {
            instances: [{ prompt: visualPrompt }],
            parameters: {
                aspectRatio,
                sampleCount: 1,
                outputMimeType: 'image/jpeg',
            },
        },
        {
            headers: {
                'x-goog-api-key': process.env.GEMINI_API_KEY || '',
                'Content-Type': 'application/json',
            },
        }
    );

    const base64Data = response.data?.predictions?.[0]?.bytesBase64Encoded;
    if (!base64Data) throw new Error('Imagen API did not return image data');
    return Buffer.from(base64Data, 'base64');
}

// ─── S3 upload helpers ────────────────────────────────────────────────────────

async function uploadUrlToS3(sourceUrl: string, s3Key: string, contentType: string): Promise<string> {
    const response = await axios.get(sourceUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
    }));

    return `${S3_PUBLIC_URL}/${BUCKET}/${s3Key}`;
}

async function uploadBufferToS3(buffer: Buffer, s3Key: string, contentType: string): Promise<string> {
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
    }));

    return `${S3_PUBLIC_URL}/${BUCKET}/${s3Key}`;
}

// ─── Job processor ────────────────────────────────────────────────────────────

export async function processGenerateAd(job: Job<GenerateJobPayload>): Promise<void> {
    const { adId, generationType, productMediaIds, brandId, campaignId, platform, format, style, userPrompt } = job.data;

    // Mark as GENERATING
    await adRepo.updateStatus(adId, 'GENERATING');
    await job.updateProgress(10);

    let creativeBrief = '';
    let visualPrompt = '';
    let aspectRatio = '1:1';
    let durationRange: [number, number] | undefined;

    try {
        // Step 1: Build prompt via Gemini
        const promptResult = await buildGenerationPrompt({
            brandId,
            productMediaIds: productMediaIds.length > 0 ? productMediaIds : [],
            platform,
            format,
            generationType,
            style,
            userPrompt,
        });

        creativeBrief = promptResult.creativeBrief;
        visualPrompt = promptResult.visualPrompt;
        aspectRatio = promptResult.aspectRatio;
        durationRange = promptResult.durationRange;

        await job.updateProgress(30);

        const timestamp = Date.now();

        if (generationType === 'VIDEO') {
            // Step 2a: Generate video via Veo
            const durationSeconds = durationRange ? Math.floor((durationRange[0] + durationRange[1]) / 2) : 15;
            const veoVideoUrl = await generateVideoWithVeo(
                visualPrompt,
                aspectRatio,
                durationSeconds,
            );

            await job.updateProgress(70);

            // Step 2b: Download and upload to S3
            const videoS3Key = `generated/videos/${campaignId}/${adId}-${timestamp}.mp4`;
            const publicVideoUrl = await uploadUrlToS3(veoVideoUrl, videoS3Key, 'video/mp4');

            await job.updateProgress(85);

            // Step 2c: Generate thumbnail (use first frame via separate call or use placeholder)
            let thumbnailUrl: string | undefined;
            let thumbnailS3Key: string | undefined;
            try {
                const thumbResult = await generateImageWithImagen(
                    `Single frame thumbnail for: ${visualPrompt.slice(0, 200)}`,
                    aspectRatio
                );
                thumbnailS3Key = `generated/thumbnails/${campaignId}/${adId}-${timestamp}.jpg`;
                thumbnailUrl = await uploadBufferToS3(thumbResult, thumbnailS3Key, 'image/jpeg');
            } catch (thumbErr) {
                console.warn(`[generate-ad] Thumbnail generation failed for ${adId}:`, thumbErr);
            }

            // Step 2d: Update Ad record
            await adRepo.updateGenerated(adId, {
                status: 'READY',
                generatedVideoUrl: publicVideoUrl,
                s3Key: videoS3Key,
                thumbnailUrl,
                thumbnailS3Key,
                creativeBrief,
                visualPrompt,
                promptMetadata: { aspectRatio, durationRange, platform, format },
            });

        } else {
            // Step 3a: Generate image via Imagen 3
            const imageBuffer = await generateImageWithImagen(visualPrompt, aspectRatio);

            await job.updateProgress(70);

            // Step 3b: Upload to S3
            const imageS3Key = `generated/images/${campaignId}/${adId}-${timestamp}.jpg`;
            const publicImageUrl = await uploadBufferToS3(imageBuffer, imageS3Key, 'image/jpeg');

            await job.updateProgress(90);

            // Step 3c: Update Ad record
            await adRepo.updateGenerated(adId, {
                status: 'READY',
                generatedImageUrl: publicImageUrl,
                s3Key: imageS3Key,
                creativeBrief,
                visualPrompt,
                promptMetadata: { aspectRatio, platform, format },
            });
        }

        await job.updateProgress(100);
        console.log(`[generate-ad] ✅ Job ${job.id} complete — Ad ${adId} is READY`);

    } catch (err) {
        console.error(`[generate-ad] ❌ Job ${job.id} failed for Ad ${adId}:`, err);
        await adRepo.updateGenerated(adId, {
            status: 'FAILED',
            creativeBrief: creativeBrief || undefined,
            visualPrompt: visualPrompt || undefined,
        });
        throw err; // Re-throw so BullMQ marks job as failed and triggers retries
    }
}
