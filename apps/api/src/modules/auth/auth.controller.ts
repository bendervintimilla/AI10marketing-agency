import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { RedisCache } from './redis.service';
import { prisma } from '@agency/db';

interface RegisterBody { email: string; password: string; orgName: string }
interface LoginBody { email: string; password: string }
interface RefreshBody { refreshToken: string; userId: string }
interface LogoutBody { refreshToken?: string; userId?: string }

export async function handleRegister(req: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
    const { email, password, orgName } = req.body;
    if (!email || !password || !orgName) {
        return reply.status(400).send({ error: 'Missing required fields' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
    }

    const hashedPassword = await AuthService.hashPassword(password);

    const org = await prisma.organization.create({ data: { name: orgName } });
    const user = await prisma.user.create({
        data: { email, passwordHash: hashedPassword, organizationId: org.id, role: 'OWNER' },
    });

    const payload = { userId: user.id, email: user.email, orgId: org.id, role: user.role };
    const token = AuthService.generateToken(payload);
    const refreshToken = AuthService.generateRefreshToken();

    await RedisCache.storeRefreshToken(user.id, refreshToken);

    return reply.status(201).send({ token, refreshToken, user: payload });
}

export async function handleLogin(req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
    const { email, password } = req.body;
    if (!email || !password) {
        return reply.status(400).send({ error: 'Missing required fields' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const isValid = await AuthService.comparePassword(password, user.passwordHash);
    if (!isValid) {
        return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const payload = { userId: user.id, email: user.email, orgId: user.organizationId, role: user.role };
    const token = AuthService.generateToken(payload);
    const refreshToken = AuthService.generateRefreshToken();

    await RedisCache.storeRefreshToken(user.id, refreshToken);

    return reply.status(200).send({ token, refreshToken, user: payload });
}

export async function handleRefresh(req: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) {
    const { refreshToken, userId } = req.body;
    if (!refreshToken || !userId) {
        return reply.status(400).send({ error: 'Missing token or userId' });
    }

    const isValid = await RedisCache.isValidRefreshToken(userId, refreshToken);
    if (!isValid) {
        return reply.status(403).send({ error: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return reply.status(404).send({ error: 'User not found' });
    }

    const payload = { userId: user.id, email: user.email, orgId: user.organizationId, role: user.role };
    const token = AuthService.generateToken(payload);
    const newRefreshToken = AuthService.generateRefreshToken();

    await RedisCache.invalidateRefreshToken(userId, refreshToken);
    await RedisCache.storeRefreshToken(userId, newRefreshToken);

    return reply.status(200).send({ token, refreshToken: newRefreshToken });
}

export async function handleLogout(req: FastifyRequest<{ Body: LogoutBody }>, reply: FastifyReply) {
    const { refreshToken, userId } = req.body;
    if (refreshToken && userId) {
        await RedisCache.invalidateRefreshToken(userId, refreshToken);
    }
    return reply.status(200).send({ message: 'Logged out successfully' });
}

export async function handleMe(req: FastifyRequest, reply: FastifyReply) {
    const tokenUser = (req as any).user;
    if (!tokenUser) {
        return reply.status(401).send({ error: 'Not authenticated' });
    }

    // Hydrate from DB so org name + role are always fresh
    const dbUser = await prisma.user.findUnique({
        where: { id: tokenUser.userId },
        include: { organization: { select: { id: true, name: true, industry: true, plan: true } } },
    });

    if (!dbUser) {
        return reply.status(404).send({ error: 'User no longer exists' });
    }

    return reply.status(200).send({
        user: {
            userId: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            orgId: dbUser.organizationId,
        },
        organization: dbUser.organization,
    });
}

/**
 * OAuth Login — creates or finds a user by their social provider ID.
 * Called from the auth router after OAuth callback — not a direct route handler.
 */
export async function handleOAuthLogin(profile: {
    email: string;
    name: string;
    picture?: string;
    provider: 'google' | 'meta';
    providerId: string;
}): Promise<{ token: string; refreshToken: string; user: any }> {
    // Check if user already exists by email
    let user: any = await prisma.user.findUnique({ where: { email: profile.email } });

    if (!user) {
        // Auto-register the user with OAuth
        const org = await prisma.organization.create({
            data: { name: `${profile.name}'s Org` },
        });
        user = await prisma.user.create({
            data: {
                email: profile.email,
                passwordHash: '', // OAuth users have no password
                name: profile.name,
                role: 'OWNER',
                organizationId: org.id,
            },
        });
        console.log(`[auth] Created OAuth user: ${profile.email} via ${profile.provider}`);
    }

    const payload = { userId: user.id, email: user.email, orgId: user.organizationId, role: user.role, name: user.name || profile.name };
    const token = AuthService.generateToken(payload);
    const refreshToken = AuthService.generateRefreshToken();

    await RedisCache.storeRefreshToken(user.id, refreshToken);

    return { token, refreshToken, user: payload };
}
