import { Prisma } from '../generated/prisma/index';
import { prisma } from '../client';

export const notification = {
    create: async (data: {
        userId: string;
        type: string;
        title: string;
        message: string;
        payload?: Record<string, unknown>;
    }) => {
        return prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                payload: (data.payload ?? undefined) as any,
            },
        });
    },

    listByUser: async (userId: string, limit = 20, includeRead = false) => {
        return prisma.notification.findMany({
            where: {
                userId,
                ...(includeRead ? {} : { readAt: null }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    },

    countUnread: async (userId: string) => {
        return prisma.notification.count({
            where: { userId, readAt: null },
        });
    },

    markRead: async (id: string, userId: string) => {
        return prisma.notification.update({
            where: { id, userId },
            data: { readAt: new Date() },
        });
    },

    markAllRead: async (userId: string) => {
        return prisma.notification.updateMany({
            where: { userId, readAt: null },
            data: { readAt: new Date() },
        });
    },
};
