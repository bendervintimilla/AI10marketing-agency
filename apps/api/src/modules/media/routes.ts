import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@agency/db';
import {
    generatePresignedUploadUrl,
    generatePresignedDownloadUrl,
    deleteObject
} from '../../services/s3';
import { mediaQueue } from './queue';

interface UploadUrlBody { orgId: string; filename: string; type: string; assetType: string }
interface BulkUploadBody { orgId: string; files: { filename: string; type: string; assetType: string }[] }
interface ConfirmBody { orgId: string; key: string; filename: string; fileType: string; assetType: string }
interface MediaQuery { orgId: string; type?: string }
interface MediaParams { id: string }

export async function mediaRoutes(fastify: FastifyInstance) {
    // POST /media/upload-url
    fastify.post<{ Body: UploadUrlBody }>('/media/upload-url', async (req, reply) => {
        try {
            const { orgId, filename, type, assetType } = req.body;
            if (!orgId || !filename || !type || !assetType) {
                return reply.status(400).send({ error: 'Missing required fields' });
            }
            const uuid = uuidv4();
            const { url, key } = await generatePresignedUploadUrl(orgId, filename, type, uuid);
            return reply.send({ url, key, assetId: uuid });
        } catch (error) {
            req.log.error(error, 'Error generating upload URL');
            return reply.status(500).send({ error: 'Failed to generate upload URL' });
        }
    });

    // POST /media/bulk-upload
    fastify.post<{ Body: BulkUploadBody }>('/media/bulk-upload', async (req, reply) => {
        try {
            const { orgId, files } = req.body;
            if (!orgId || !files || !Array.isArray(files)) {
                return reply.status(400).send({ error: 'Invalid payload' });
            }
            const urls = await Promise.all(
                files.map(async (f) => {
                    const uuid = uuidv4();
                    const { url, key } = await generatePresignedUploadUrl(orgId, f.filename, f.type, uuid);
                    return { filename: f.filename, url, key, assetId: uuid };
                })
            );
            return reply.send({ urls });
        } catch (error) {
            req.log.error(error, 'Error in bulk upload');
            return reply.status(500).send({ error: 'Failed to generate bulk upload URLs' });
        }
    });

    // POST /media/confirm
    fastify.post<{ Body: ConfirmBody }>('/media/confirm', async (req, reply) => {
        try {
            const { orgId, key, filename, fileType, assetType } = req.body;
            if (!orgId || !key || !filename || !fileType || !assetType) {
                return reply.status(400).send({ error: 'Missing required fields' });
            }
            const baseUrl = process.env.AWS_S3_ENDPOINT || 'http://localhost:9000';
            const bucket = process.env.AWS_S3_BUCKET_NAME || 'media-assets';
            const publicUrl = `${baseUrl}/${bucket}/${key}`;

            const mediaAsset = await prisma.mediaAsset.create({
                data: {
                    organizationId: orgId,
                    s3Key: key,
                    filename,
                    fileType,
                    type: assetType as any,
                    url: publicUrl,
                    tags: [],
                }
            });

            await mediaQueue.add('process-media', { assetId: mediaAsset.id });
            return reply.send({ success: true, asset: mediaAsset });
        } catch (error) {
            req.log.error(error, 'Error confirming media');
            return reply.status(500).send({ error: 'Failed to confirm media upload' });
        }
    });

    // GET /media
    fastify.get<{ Querystring: MediaQuery }>('/media', async (req, reply) => {
        try {
            const orgId = req.query.orgId;
            const assetType = req.query.type;
            if (!orgId) {
                return reply.status(400).send({ error: 'orgId is required' });
            }
            const whereClause: any = { organizationId: orgId, deletedAt: null };
            if (assetType) whereClause.type = assetType;

            const assets = await prisma.mediaAsset.findMany({
                where: whereClause,
                orderBy: { uploadedAt: 'desc' }
            });
            return reply.send({ assets });
        } catch (error) {
            req.log.error(error, 'Error fetching media assets');
            return reply.status(500).send({ error: 'Failed to fetch media assets' });
        }
    });

    // DELETE /media/:id
    fastify.delete<{ Params: MediaParams }>('/media/:id', async (req, reply) => {
        try {
            const { id } = req.params;
            const asset = await prisma.mediaAsset.update({
                where: { id },
                data: { deletedAt: new Date() }
            });
            return reply.send({ success: true, id: asset.id });
        } catch (error) {
            req.log.error(error, 'Error deleting media asset');
            return reply.status(500).send({ error: 'Failed to delete media asset' });
        }
    });
}
