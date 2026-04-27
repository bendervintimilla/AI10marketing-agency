import { FastifyInstance } from 'fastify';
import {
    createCheckoutSession,
    createPortalSession,
    getSubscription,
    handleWebhook,
} from './billing.controller';

export async function billingRoutes(fastify: FastifyInstance) {
    // Webhook MUST use raw body — register before any global JSON parser
    fastify.addContentTypeParser(
        'application/json',
        { parseAs: 'buffer' },
        function (this: any, _: any, body: Buffer, done: Function) {
            try {
                const str = body.toString();
                // Store raw body for Stripe signature verification
                (this as any).rawBody = body;
                done(null, JSON.parse(str));
            } catch (err: any) {
                done(err);
            }
        }
    );

    // POST /billing/webhook  — public, no auth (Stripe calls this)
    fastify.post('/billing/webhook', {
        config: { rawBody: true },
    }, handleWebhook);

    // POST /billing/create-checkout
    fastify.post<{
        Body: { plan: 'PRO' | 'ENTERPRISE'; organizationId: string; successUrl?: string; cancelUrl?: string };
    }>('/billing/create-checkout', {
        schema: {
            body: {
                type: 'object',
                required: ['plan', 'organizationId'],
                properties: {
                    plan: { type: 'string', enum: ['PRO', 'ENTERPRISE'] },
                    organizationId: { type: 'string' },
                    successUrl: { type: 'string' },
                    cancelUrl: { type: 'string' },
                },
            },
        },
    }, createCheckoutSession);

    // GET /billing/subscription
    fastify.get<{ Querystring: { organizationId: string } }>('/billing/subscription', {
        schema: {
            querystring: {
                type: 'object',
                required: ['organizationId'],
                properties: {
                    organizationId: { type: 'string' },
                },
            },
        },
    }, getSubscription);

    // POST /billing/portal
    fastify.post<{
        Body: { organizationId: string; returnUrl?: string };
    }>('/billing/portal', {
        schema: {
            body: {
                type: 'object',
                required: ['organizationId'],
                properties: {
                    organizationId: { type: 'string' },
                    returnUrl: { type: 'string' },
                },
            },
        },
    }, createPortalSession);
}
