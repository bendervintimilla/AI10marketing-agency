import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';

/**
 * Fastify preHandler hook: validates JWT and attaches decoded user to request
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized: missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = AuthService.verifyToken(token);
        (req as any).user = decoded;
    } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized: token verification failed' });
    }
}

/**
 * Fastify preHandler hook factory: checks user role
 */
export function requireRole(role: string) {
    return async (req: FastifyRequest, reply: FastifyReply) => {
        const user = (req as any).user;
        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized: User not found in request' });
        }
        if (user.role !== role) {
            return reply.status(403).send({ error: `Forbidden: requires ${role} role` });
        }
    };
}
