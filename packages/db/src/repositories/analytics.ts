import { Prisma } from '../generated/prisma/index';
import { prisma } from '../client';

export const analytics = {
    upsert: async (data: Prisma.AnalyticsSnapshotUncheckedCreateInput) => {
        const fetchedDate = data.fetchedAt ? new Date(data.fetchedAt as string | Date) : new Date();
        const dayStart = new Date(fetchedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(fetchedDate);
        dayEnd.setHours(23, 59, 59, 999);

        const existing = await prisma.analyticsSnapshot.findFirst({
            where: {
                adId: data.adId,
                fetchedAt: { gte: dayStart, lt: dayEnd },
            },
        });

        if (existing) {
            return prisma.analyticsSnapshot.update({ where: { id: existing.id }, data });
        }
        return prisma.analyticsSnapshot.create({ data });
    },

    getTimeSeries: async (adId: string, dateRange: { start: Date; end: Date }) => {
        return prisma.analyticsSnapshot.findMany({
            where: {
                adId,
                fetchedAt: { gte: dateRange.start, lte: dateRange.end },
            },
            orderBy: { fetchedAt: 'asc' },
        });
    },
};
