import { Prisma, AdStatus } from '../generated/prisma/index';
import { prisma } from '../client';

export const ad = {
    create: async (data: Prisma.AdUncheckedCreateInput) => {
        return prisma.ad.create({ data });
    },

    update: async (id: string, data: Prisma.AdUncheckedUpdateInput) => {
        return prisma.ad.update({
            where: { id },
            data,
        });
    },

    updateStatus: async (id: string, status: AdStatus) => {
        return prisma.ad.update({
            where: { id },
            // Use unchecked update to avoid `promptMetadata` Json type mismatch
            data: { status } as Prisma.AdUncheckedUpdateInput,
        });
    },

    findById: async (id: string) => {
        return prisma.ad.findUnique({ where: { id } });
    },

    findByJobId: async (jobId: string) => {
        return prisma.ad.findFirst({ where: { jobId } });
    },

    listByCampaign: async (campaignId: string) => {
        return prisma.ad.findMany({
            where: { campaignId },
            orderBy: { scheduledAt: 'asc' },
            include: {
                analytics: {
                    orderBy: { fetchedAt: 'desc' },
                    take: 1,
                },
            },
        });
    },

    updateGenerated: async (id: string, data: {
        status: string;
        generatedVideoUrl?: string;
        generatedImageUrl?: string;
        s3Key?: string;
        thumbnailUrl?: string;
        thumbnailS3Key?: string;
        creativeBrief?: string;
        visualPrompt?: string;
        promptMetadata?: object;
    }) => {
        return prisma.ad.update({
            where: { id },
            data: data as Prisma.AdUncheckedUpdateInput,
        });
    },
};
