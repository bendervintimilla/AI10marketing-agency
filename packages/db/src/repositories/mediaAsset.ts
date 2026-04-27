import { Prisma } from '../generated/prisma/index';
import { prisma } from '../client';

export const mediaAsset = {
    create: async (data: Prisma.MediaAssetUncheckedCreateInput) => {
        return prisma.mediaAsset.create({ data });
    },

    listByOrg: async (organizationId: string) => {
        return prisma.mediaAsset.findMany({
            where: { organizationId },
            orderBy: { uploadedAt: 'desc' },
        });
    },

    delete: async (id: string) => {
        return prisma.mediaAsset.delete({ where: { id } });
    },
};
