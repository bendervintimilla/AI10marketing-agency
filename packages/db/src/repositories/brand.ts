import { Prisma } from '../generated/prisma/index';
import { prisma } from '../client';

export const brand = {
    create: async (data: Prisma.BrandUncheckedCreateInput) => {
        return prisma.brand.create({ data });
    },

    findById: async (id: string) => {
        return prisma.brand.findUnique({ where: { id } });
    },

    update: async (id: string, data: Prisma.BrandUncheckedUpdateInput) => {
        return prisma.brand.update({ where: { id }, data });
    },

    listByOrg: async (organizationId: string) => {
        return prisma.brand.findMany({ where: { organizationId } });
    },

    delete: async (id: string) => {
        return prisma.brand.delete({ where: { id } });
    },
};
