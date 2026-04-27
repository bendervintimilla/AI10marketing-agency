import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { RedisCache } from './redis.service';

// In-memory store until Prisma DB is connected
// Seed a default user so login works after restart (password: "password123")
const SEED_ORG = { id: 'org_seed_1', name: 'My Agency' };
const SEED_USER = {
    id: 'usr_seed_1',
    email: 'gabrielevanadia@gmail.com',
    // bcrypt hash of "password123" (10 rounds)
    password: '$2b$10$placeholder',
    orgId: 'org_seed_1',
    role: 'ADMIN',
};

const mockUsers: any[] = [];
const mockOrgs: any[] = [];

// Pre-hash the password and inject the seed user at module load
(async () => {
    SEED_USER.password = await AuthService.hashPassword('password123');
    mockUsers.push(SEED_USER);
    mockOrgs.push(SEED_ORG);
    console.log('[auth] Seeded demo user: gabrielevanadia@gmail.com / password123');
})();

interface RegisterBody { email: string; password: string; orgName: string }
interface LoginBody { email: string; password: string }
interface RefreshBody { refreshToken: string; userId: string }
interface LogoutBody { refreshToken?: string; userId?: string }

export async function handleRegister(req: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
    const { email, password, orgName } = req.body;
    if (!email || !password || !orgName) {
        return reply.status(400).send({ error: 'Missing required fields' });
    }

    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
    }

    const hashedPassword = await AuthService.hashPassword(password);

    const newOrg = { id: `org_${Date.now()}`, name: orgName };
    const newUser = { id: `usr_${Date.now()}`, email, password: hashedPassword, orgId: newOrg.id, role: 'ADMIN' };

    mockOrgs.push(newOrg);
    mockUsers.push(newUser);

    const payload = { userId: newUser.id, email: newUser.email, orgId: newUser.orgId, role: newUser.role };
    const token = AuthService.generateToken(payload);
    const refreshToken = AuthService.generateRefreshToken();

    await RedisCache.storeRefreshToken(newUser.id, refreshToken);

    return reply.status(201).send({ token, refreshToken, user: payload });
}

export async function handleLogin(req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
    const { email, password } = req.body;
    if (!email || !password) {
        return reply.status(400).send({ error: 'Missing required fields' });
    }

    const user = mockUsers.find(u => u.email === email);
    if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const isValid = await AuthService.comparePassword(password, user.password);
    if (!isValid) {
        return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const payload = { userId: user.id, email: user.email, orgId: user.orgId, role: user.role };
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

    const user = mockUsers.find(u => u.id === userId);
    if (!user) {
        return reply.status(404).send({ error: 'User not found' });
    }

    const payload = { userId: user.id, email: user.email, orgId: user.orgId, role: user.role };
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
    const user = (req as any).user;
    if (!user) {
        return reply.status(401).send({ error: 'Not authenticated' });
    }
    return reply.status(200).send({ user });
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
    let user = mockUsers.find(u => u.email === profile.email);

    if (!user) {
        // Auto-register the user with OAuth
        const newOrg = { id: `org_${Date.now()}`, name: `${profile.name}'s Org` };
        user = {
            id: `usr_${Date.now()}`,
            email: profile.email,
            password: null, // No password for OAuth users
            orgId: newOrg.id,
            role: 'ADMIN',
            name: profile.name,
            picture: profile.picture,
            provider: profile.provider,
            providerId: profile.providerId,
        };
        mockOrgs.push(newOrg);
        mockUsers.push(user);
        console.log(`[auth] Created OAuth user: ${profile.email} via ${profile.provider}`);
    }

    const payload = { userId: user.id, email: user.email, orgId: user.orgId, role: user.role, name: user.name || profile.name };
    const token = AuthService.generateToken(payload);
    const refreshToken = AuthService.generateRefreshToken();

    await RedisCache.storeRefreshToken(user.id, refreshToken);

    return { token, refreshToken, user: payload };
}
