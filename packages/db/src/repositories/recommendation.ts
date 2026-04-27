import { Prisma, RecStatus } from '../generated/prisma/index';
import { prisma } from '../client';

export const recommendation = {
    create: async (data: Prisma.AIRecommendationUncheckedCreateInput) => {
        return prisma.aIRecommendation.create({ data });
    },

    listPending: async (organizationId: string) => {
        return prisma.aIRecommendation.findMany({
            where: { organizationId, status: 'PENDING' as RecStatus },
            orderBy: { createdAt: 'desc' },
            include: { ad: true },
        });
    },

    listByOrg: async (organizationId: string, status?: string, campaignId?: string) => {
        return prisma.aIRecommendation.findMany({
            where: {
                organizationId,
                ...(status ? { status: status as RecStatus } : {}),
                ...(campaignId ? { campaignId } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: { ad: true },
        });
    },

    findById: async (id: string) => {
        return prisma.aIRecommendation.findUnique({ where: { id }, include: { ad: true } });
    },

    listStaleForAutopilot: async (organizationId: string, maxAgeHours: number) => {
        const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        return prisma.aIRecommendation.findMany({
            where: {
                organizationId,
                status: 'PENDING',
                createdAt: { lte: cutoff },
            },
            orderBy: { createdAt: 'asc' },
            include: { ad: true },
        });
    },

    updateStatus: async (id: string, status: RecStatus | string, executedAt?: Date) => {
        return prisma.aIRecommendation.update({
            where: { id },
            data: {
                status: status as RecStatus,
                ...(executedAt ? { executedAt } : {}),
            },
        });
    },
};


