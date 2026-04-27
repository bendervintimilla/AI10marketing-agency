import { Job } from 'bullmq';
import { prisma } from '@agency/db';
import sharp from 'sharp';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import type { FfprobeData } from 'fluent-ffmpeg';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { GoogleGenerativeAI } from '@google/generative-ai';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin',
    },
    endpoint: process.env.AWS_S3_ENDPOINT || 'http://localhost:9000',
    forcePathStyle: true,
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'media-assets';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const processMediaJobHandler = async (job: Job) => {
    const { assetId } = job.data;
    console.log(`Processing media asset ${assetId}`);

    try {
        const asset = await prisma.mediaAsset.findUnique({
            where: { id: assetId }
        });

        if (!asset) {
            throw new Error(`MediaAsset not found: ${assetId}`);
        }

        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'media-'));
        const localFilePath = path.join(tempDir, asset.filename ?? assetId);

        // 1. Download file temporarily from S3
        const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: asset.s3Key,
        });

        const s3Response = await s3Client.send(getCommand);
        if (!s3Response.Body) throw new Error("File not found in S3");

        // Convert readable stream to buffer/file
        const stream = s3Response.Body as NodeJS.ReadableStream;
        const writeStream = fsSync.createWriteStream(localFilePath);
        await new Promise<void>((resolve, reject) => {
            stream.pipe(writeStream).on('finish', () => resolve()).on('error', reject);
        });

        let width = 0, height = 0, duration = 0, size = s3Response.ContentLength || 0;
        const thumbnailPath = path.join(tempDir, 'thumb.webp');
        let tags: string[] = [];

        // 2. Generate thumbnail and extra dimensions
        if (asset.type === 'IMAGE' || asset.fileType?.startsWith('image/')) {
            const image = sharp(localFilePath);
            const metadata = await image.metadata();
            width = metadata.width || 0;
            height = metadata.height || 0;

            await image.resize({ width: 400, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(thumbnailPath);

            // Upload to Gemini for tagging
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const imagePart = {
                    inlineData: {
                        data: Buffer.from(await fs.readFile(localFilePath)).toString("base64"),
                        mimeType: asset.fileType ?? 'image/jpeg'
                    },
                };
                const prompt = "Describe this image with up to 5 comma-separated tags identifying objects, setting, or concepts. Example: 'product photo, coffee mug, white background, modern'. Return ONLY the comma separated tags.";
                const result = await model.generateContent([prompt, imagePart]);
                const responseText = result.response.text();
                tags = responseText.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '');
            } catch (e) {
                console.warn("Gemini tagging failed", e);
            }

        } else if (asset.type === 'VIDEO' || asset.fileType?.startsWith('video/')) {
            await new Promise<void>((resolve, reject) => {
                ffmpeg(localFilePath)
                    .ffprobe((err: Error | null, data: FfprobeData) => {
                        if (err) console.error("FFProbe error", err);
                        if (data && data.streams && data.streams[0]) {
                            width = (data.streams[0] as any).width || 0;
                            height = (data.streams[0] as any).height || 0;
                            duration = data.format.duration || 0;
                        }
                    });

                ffmpeg(localFilePath)
                    .screenshots({
                        timestamps: ['1%'],
                        filename: 'thumb.png',
                        folder: tempDir,
                        size: '400x?'
                    })
                    .on('end', async () => {
                        // Convert to webp
                        await sharp(path.join(tempDir, 'thumb.png'))
                            .webp({ quality: 80 })
                            .toFile(thumbnailPath);
                        resolve();
                    })
                    .on('error', reject);
            });

            // Tagging using the first frame thumbnail
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const imagePart = {
                    inlineData: {
                        data: Buffer.from(await fs.readFile(thumbnailPath)).toString("base64"),
                        mimeType: 'image/webp'
                    },
                };
                const prompt = "Describe this video frame with up to 5 comma-separated tags identifying objects, setting, or concepts. Return ONLY the comma separated tags.";
                const result = await model.generateContent([prompt, imagePart]);
                tags = result.response.text().split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '');
            } catch (e) {
                console.warn("Gemini tagging failed", e);
            }
        }

        // 4. Upload thumbnail to S3
        const thumbKey = `orgs/${asset.organizationId}/thumbnails/${asset.id}.webp`;
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: thumbKey,
            Body: await fs.readFile(thumbnailPath),
            ContentType: 'image/webp',
        }));

        const baseUrl = process.env.AWS_S3_ENDPOINT || 'http://localhost:9000';
        const publicThumbnailUrl = `${baseUrl}/${BUCKET_NAME}/${thumbKey}`;

        // 6. Update DB with metadata, tags, and thumbnailUrl
        await prisma.mediaAsset.update({
            where: { id: assetId },
            data: {
                thumbnailUrl: publicThumbnailUrl,
                metadata: {
                    width,
                    height,
                    duration,
                    size,
                    processedAt: new Date().toISOString()
                },
                tags: tags
            }
        });

        // Cleanup
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log(`Finished processing media asset ${assetId}`);
    } catch (error) {
        console.error(`Failed to process media asset ${assetId}:`, error);
        throw error;
    }
};
