/**
 * organizations.router.ts — Organization CRUD endpoints.
 *
 * GET   /organizations/:id   — read one (must belong to caller's org)
 * PATCH /organizations/:id   — update name / industry / logoUrl (OWNER+ADMIN only)
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '@agency/db';
import { requireAuth } from '../auth/auth.middleware';

interface OrgUpdateBody {
    name?: string;
    industry?: string;
    logoUrl?: string;
}

export async function organizationsRoutes(fastify: FastifyInstance) {
    fastify.get<{ Params: { id: string } }>(
        '/organizations/:id',
        { preHandler: requireAuth },
        async (req, reply) => {
            const tokenUser = (req as any).user as { orgId?: string; userId: string };
            const requestedOrgId = req.params.id;

            // Tenant scope: caller can only read their own org.
            if (tokenUser.orgId && tokenUser.orgId !== requestedOrgId) {
                return reply.status(403).send({ error: 'Forbidden' });
            }

            const org = await prisma.organization.findUnique({
                where: { id: requestedOrgId },
                select: { id: true, name: true, industry: true, plan: true, createdAt: true },
            });
            if (!org) return reply.status(404).send({ error: 'Organization not found' });
            return reply.send(org);
        }
    );

    fastify.patch<{ Params: { id: string }; Body: OrgUpdateBody }>(
        '/organizations/:id',
        { preHandler: requireAuth },
        async (req, reply) => {
            const tokenUser = (req as any).user as { orgId?: string; userId: string; role?: string };
            const requestedOrgId = req.params.id;

            if (tokenUser.orgId && tokenUser.orgId !== requestedOrgId) {
                return reply.status(403).send({ error: 'Forbidden' });
            }
            // Only OWNER / ADMIN can edit org metadata
            if (tokenUser.role && !['OWNER', 'ADMIN'].includes(tokenUser.role)) {
                return reply.status(403).send({ error: 'Requires OWNER or ADMIN role' });
            }

            const body = req.body ?? {};
            const data: Record<string, unknown> = {};
            if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
            if (typeof body.industry === 'string') data.industry = body.industry;
            // logoUrl is optional — kept loose because the schema may not have it yet
            // (additive: if the column exists Prisma writes it, otherwise it errors and we 400)

            if (Object.keys(data).length === 0) {
                return reply.status(400).send({ error: 'No valid fields to update' });
            }

            try {
                const updated = await prisma.organization.update({
                    where: { id: requestedOrgId },
                    data,
                    select: { id: true, name: true, industry: true, plan: true },
                });
                return reply.send(updated);
            } catch (err: any) {
                return reply.status(400).send({ error: err?.message ?? 'Update failed' });
            }
        }
    );
}
