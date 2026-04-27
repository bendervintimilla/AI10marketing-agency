import { Prisma } from '../generated/prisma/index';
import { prisma } from '../client';

export const campaign = {
    create: async (data: Prisma.CampaignUncheckedCreateInput) => {
        return prisma.campaign.create({ data });
    },

    update: async (id: string, data: Prisma.CampaignUncheckedUpdateInput) => {
        return prisma.campaign.update({ where: { id }, data });
    },

    listByOrg: async (organizationId: string) => {
        return prisma.campaign.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            include: { ads: true },
        });
    },
};
