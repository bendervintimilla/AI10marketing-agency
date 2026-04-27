import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin',
    },
    endpoint: process.env.AWS_S3_ENDPOINT || 'http://localhost:9000',
    forcePathStyle: true, // Required for MinIO
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'media-assets';

export const generatePresignedUploadUrl = async (
    orgId: string,
    filename: string,
    type: string,
    uuid: string
): Promise<{ url: string; key: string }> => {
    const extMatch = filename.match(/\.([^\.]+)$/);
    const ext = extMatch ? extMatch[1] : '';
    const key = `orgs/${orgId}/${type}/${uuid}${ext ? `.${ext}` : ''}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: getContentType(filename),
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return { url, key };
};

export const generatePresignedDownloadUrl = async (key: string): Promise<string> => {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

export const deleteObject = async (key: string): Promise<void> => {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    await s3Client.send(command);
};

const getContentType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'gif':
            return 'image/gif';
        case 'webp':
            return 'image/webp';
        case 'mp4':
            return 'video/mp4';
        case 'webm':
            return 'video/webm';
        case 'svg':
            return 'image/svg+xml';
        default:
            return 'application/octet-stream';
    }
};
