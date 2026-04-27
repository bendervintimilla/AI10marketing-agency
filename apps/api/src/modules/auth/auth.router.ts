import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { handleRegister, handleLogin, handleRefresh, handleLogout, handleMe, handleOAuthLogin } from './auth.controller';
import { requireAuth } from './auth.middleware';
import { getGoogleAuthUrl, exchangeGoogleCode } from './oauth/google';
import { getMetaLoginUrl, exchangeMetaLoginCode } from './oauth/meta-login';
import { rateLimit } from '../../middleware/rate-limit';

// Frontend URL for redirecting after OAuth
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Rate limit: 10 attempts per minute for auth endpoints
const authRateLimit = rateLimit(10, 60_000);

export async function authRoutes(fastify: FastifyInstance) {
    // Standard email/password auth (rate-limited)
    fastify.post('/auth/register', { preHandler: [authRateLimit] }, handleRegister as any);
    fastify.post('/auth/login', { preHandler: [authRateLimit] }, handleLogin as any);
    fastify.post('/auth/refresh', handleRefresh);
    fastify.post('/auth/logout', handleLogout);
    fastify.get('/auth/me', { preHandler: [requireAuth] }, handleMe);

    // ── Google OAuth ──────────────────────────────────────────────────
    fastify.get('/auth/google', async (req: FastifyRequest, reply: FastifyReply) => {
        const state = `google_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const url = getGoogleAuthUrl(state);
        return reply.redirect(url);
    });

    fastify.get<{ Querystring: { code?: string; error?: string; state?: string } }>(
        '/auth/google/callback',
        async (req, reply) => {
            const { code, error } = req.query;
            if (error || !code) {
                return reply.redirect(`${FRONTEND_URL}/login?error=google_denied`);
            }

            try {
                const profile = await exchangeGoogleCode(code);
                const { token, refreshToken, user } = await handleOAuthLogin({
                    email: profile.email,
                    name: profile.name,
                    picture: profile.picture,
                    provider: 'google',
                    providerId: profile.googleId,
                });

                // Redirect to frontend with tokens in URL params
                const params = new URLSearchParams({
                    token,
                    refreshToken,
                    user: JSON.stringify(user),
                });
                return reply.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
            } catch (err: any) {
                console.error('[auth/google] OAuth error:', err.message);
                return reply.redirect(`${FRONTEND_URL}/login?error=google_failed`);
            }
        }
    );

    // ── Meta (Facebook) OAuth ─────────────────────────────────────────
    fastify.get('/auth/meta', async (req: FastifyRequest, reply: FastifyReply) => {
        const state = `meta_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const url = getMetaLoginUrl(state);
        return reply.redirect(url);
    });

    fastify.get<{ Querystring: { code?: string; error?: string; state?: string } }>(
        '/auth/meta/callback',
        async (req, reply) => {
            const { code, error } = req.query;
            if (error || !code) {
                return reply.redirect(`${FRONTEND_URL}/login?error=meta_denied`);
            }

            try {
                const profile = await exchangeMetaLoginCode(code);
                const { token, refreshToken, user } = await handleOAuthLogin({
                    email: profile.email,
                    name: profile.name,
                    picture: profile.picture,
                    provider: 'meta',
                    providerId: profile.facebookId,
                });

                const params = new URLSearchParams({
                    token,
                    refreshToken,
                    user: JSON.stringify(user),
                });
                return reply.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
            } catch (err: any) {
                console.error('[auth/meta] OAuth error:', err.message);
                return reply.redirect(`${FRONTEND_URL}/login?error=meta_failed`);
            }
        }
    );
}
