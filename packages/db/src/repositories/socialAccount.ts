import { Prisma } from '../generated/prisma/index';
import { prisma } from '../client';

export const socialAccount = {
    upsert: async (data: {
        orgId: string;
        platform: string;
        accessToken: string;
        refreshToken: string | null;
        expiresAt: Date;
        accountName: string;
        accountId: string;
    }) => {
        return prisma.socialAccount.upsert({
            where: {
                organizationId_platform: {
                    organizationId: data.orgId,
                    platform: data.platform as any,
                },
            },
            create: {
                organizationId: data.orgId,
                platform: data.platform as any,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                expiresAt: data.expiresAt,
                accountName: data.accountName,
                accountId: data.accountId,
            },
            update: {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                expiresAt: data.expiresAt,
                accountName: data.accountName,
                accountId: data.accountId,
            },
        });
    },

    listByOrg: async (orgId: string) => {
        return prisma.socialAccount.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: 'asc' },
        });
    },

    findByOrgAndPlatform: async (orgId: string, platform: string) => {
        return prisma.socialAccount.findUnique({
            where: {
                organizationId_platform: {
                    organizationId: orgId,
                    platform: platform as any,
                },
            },
        });
    },

    deleteByOrgAndPlatform: async (orgId: string, platform: string) => {
        return prisma.socialAccount.delete({
            where: {
                organizationId_platform: {
                    organizationId: orgId,
                    platform: platform as any,
                },
            },
        });
    },
};
