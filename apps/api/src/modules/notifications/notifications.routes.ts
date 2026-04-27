import { FastifyInstance } from 'fastify';
import {
    listNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    notificationStream,
} from './notifications.controller';

export async function notificationRoutes(fastify: FastifyInstance) {
    // GET /notifications
    fastify.get<{ Querystring: { userId: string; includeRead?: string; limit?: string } }>(
        '/notifications',
        listNotifications
    );

    // GET /notifications/stream  (SSE — must be before /:id routes)
    fastify.get<{ Querystring: { userId: string } }>(
        '/notifications/stream',
        {
            config: { disableRequestLogging: true },
        },
        notificationStream
    );

    // PATCH /notifications/:id/read
    fastify.patch<{ Params: { id: string }; Body: { userId: string } }>(
        '/notifications/:id/read',
        {
            schema: {
                params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
                body: { type: 'object', properties: { userId: { type: 'string' } }, required: ['userId'] },
            },
        },
        markNotificationRead
    );

    // PATCH /notifications/read-all
    fastify.patch<{ Body: { userId: string } }>(
        '/notifications/read-all',
        {
            schema: {
                body: { type: 'object', properties: { userId: { type: 'string' } }, required: ['userId'] },
            },
        },
        markAllNotificationsRead
    );
}
