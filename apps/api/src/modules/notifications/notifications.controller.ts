import { FastifyRequest, FastifyReply } from 'fastify';
import { notification } from '@agency/db';

// GET /notifications
export async function listNotifications(
    request: FastifyRequest<{ Querystring: { userId: string; includeRead?: string; limit?: string } }>,
    reply: FastifyReply
) {
    const { userId, includeRead, limit } = request.query;
    if (!userId) return reply.status(400).send({ error: 'userId is required' });

    const notifications = await notification.listByUser(
        userId,
        limit ? parseInt(limit, 10) : 20,
        includeRead === 'true'
    );
    const unreadCount = await notification.countUnread(userId);

    return reply.send({ notifications, unreadCount });
}

// PATCH /notifications/:id/read
export async function markNotificationRead(
    request: FastifyRequest<{ Params: { id: string }; Body: { userId: string } }>,
    reply: FastifyReply
) {
    const { id } = request.params;
    const { userId } = request.body;
    if (!userId) return reply.status(400).send({ error: 'userId is required' });

    const updated = await notification.markRead(id, userId);
    return reply.send(updated);
}

// PATCH /notifications/read-all
export async function markAllNotificationsRead(
    request: FastifyRequest<{ Body: { userId: string } }>,
    reply: FastifyReply
) {
    const { userId } = request.body;
    if (!userId) return reply.status(400).send({ error: 'userId is required' });

    await notification.markAllRead(userId);
    return reply.send({ success: true });
}

// GET /notifications/stream  — Server-Sent Events
export async function notificationStream(
    request: FastifyRequest<{ Querystring: { userId: string } }>,
    reply: FastifyReply
) {
    const { userId } = request.query;
    if (!userId) {
        return reply.status(400).send({ error: 'userId is required' });
    }

    const response = reply.raw;
    response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });

    // Send initial unread count
    const sendEvent = async () => {
        try {
            const unreadCount = await notification.countUnread(userId);
            const recentNotifs = await notification.listByUser(userId, 10, false);
            const data = JSON.stringify({ unreadCount, notifications: recentNotifs });
            response.write(`data: ${data}\n\n`);
        } catch {
            // Client disconnected
        }
    };

    await sendEvent();

    const interval = setInterval(sendEvent, 10_000); // poll every 10s

    request.raw.on('close', () => {
        clearInterval(interval);
        response.end();
    });
}
