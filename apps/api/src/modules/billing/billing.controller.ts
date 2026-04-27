import { FastifyRequest, FastifyReply } from 'fastify';
import { getStripe, STRIPE_PRICE_IDS } from './stripe';
import { checkPlanLimit, getOrCreateUsageRecord, PLAN_LIMITS } from './plans';
import { prisma, notification } from '@agency/db';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

// ──────────────────────────────────────────────────────────────
// POST /billing/create-checkout
// ──────────────────────────────────────────────────────────────
export async function createCheckoutSession(
    request: FastifyRequest<{
        Body: { plan: 'PRO' | 'ENTERPRISE'; organizationId: string; successUrl?: string; cancelUrl?: string };
    }>,
    reply: FastifyReply
) {
    const { plan, organizationId, successUrl, cancelUrl } = request.body;

    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { stripeCustomerId: true, name: true },
    });

    if (!org) return reply.status(404).send({ error: 'Organization not found' });

    const priceId = STRIPE_PRICE_IDS[plan];
    if (!priceId) {
        return reply.status(400).send({ error: `No Stripe price configured for plan: ${plan}` });
    }

    const session = await getStripe().checkout.sessions.create({
        mode: 'subscription',
        customer: org.stripeCustomerId || undefined,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl || `${WEB_URL}/dashboard/settings/billing?success=1`,
        cancel_url: cancelUrl || `${WEB_URL}/dashboard/settings/billing?canceled=1`,
        metadata: { organizationId, plan },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        customer_creation: org.stripeCustomerId ? undefined : 'always',
    });

    return reply.send({ url: session.url });
}

// ──────────────────────────────────────────────────────────────
// POST /billing/portal
// ──────────────────────────────────────────────────────────────
export async function createPortalSession(
    request: FastifyRequest<{
        Body: { organizationId: string; returnUrl?: string };
    }>,
    reply: FastifyReply
) {
    const { organizationId, returnUrl } = request.body;

    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { stripeCustomerId: true },
    });

    if (!org?.stripeCustomerId) {
        return reply.status(400).send({ error: 'No Stripe customer found for this organization. Upgrade to a paid plan first.' });
    }

    const session = await getStripe().billingPortal.sessions.create({
        customer: org.stripeCustomerId,
        return_url: returnUrl || `${WEB_URL}/dashboard/settings/billing`,
    });

    return reply.send({ url: session.url });
}

// ──────────────────────────────────────────────────────────────
// GET /billing/subscription
// ──────────────────────────────────────────────────────────────
export async function getSubscription(
    request: FastifyRequest<{ Querystring: { organizationId: string } }>,
    reply: FastifyReply
) {
    const { organizationId } = request.query;

    const [org, sub, usage] = await Promise.all([
        prisma.organization.findUnique({
            where: { id: organizationId },
            select: { plan: true, name: true },
        }),
        prisma.subscription.findFirst({ where: { organizationId }, orderBy: { createdAt: 'desc' } }),
        getOrCreateUsageRecord(organizationId),
    ]);

    if (!org) return reply.status(404).send({ error: 'Organization not found' });

    const planLimits = PLAN_LIMITS[org.plan as 'FREE' | 'PRO' | 'ENTERPRISE'];

    // Fetch invoice history if customer exists
    let invoices: { id: string; amount: number; currency: string; status: string; date: number; pdf: string | null }[] = [];
    if (sub) {
        const subData = await getStripe().subscriptions.retrieve(sub.stripeSubscriptionId);
        const stripeInvoices = await getStripe().invoices.list({
            subscription: sub.stripeSubscriptionId,
            limit: 12,
        });
        invoices = stripeInvoices.data.map((inv) => ({
            id: inv.id,
            amount: inv.amount_paid / 100,
            currency: inv.currency,
            status: inv.status || 'unknown',
            date: inv.created,
            pdf: inv.invoice_pdf ?? null,
        }));
    }

    return reply.send({
        plan: org.plan,
        planLabel: planLimits.label,
        price: planLimits.price,
        status: sub?.status || 'ACTIVE',
        currentPeriodEnd: sub?.currentPeriodEnd || null,
        cancelAtPeriodEnd: sub?.cancelAtPeriodEnd || false,
        limits: {
            maxCampaigns: planLimits.maxCampaigns === Infinity ? null : planLimits.maxCampaigns,
            maxAdsPerMonth: planLimits.maxAdsPerMonth === Infinity ? null : planLimits.maxAdsPerMonth,
            autoPilot: planLimits.autoPilot,
            fullAnalytics: planLimits.fullAnalytics,
            emailReports: planLimits.emailReports,
            apiAccess: planLimits.apiAccess,
        },
        usage: {
            adsGeneratedThisMonth: usage.adsGenerated,
            month: usage.month,
            year: usage.year,
        },
        invoices,
    });
}

// ──────────────────────────────────────────────────────────────
// POST /billing/webhook  (raw body — no JSON parsing)
// ──────────────────────────────────────────────────────────────
export async function handleWebhook(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const sig = request.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: import('stripe').Stripe.Event;
    try {
        event = getStripe().webhooks.constructEvent(
            (request as any).rawBody || Buffer.from(JSON.stringify(request.body)),
            sig,
            webhookSecret
        );
    } catch (err: any) {
        request.log.error('Webhook signature verification failed:', err.message);
        return reply.status(400).send({ error: `Webhook Error: ${err.message}` });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as import('stripe').Stripe.Checkout.Session);
                break;
            case 'invoice.paid':
                await handleInvoicePaid(event.data.object as import('stripe').Stripe.Invoice);
                break;
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object as import('stripe').Stripe.Invoice);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as import('stripe').Stripe.Subscription);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as import('stripe').Stripe.Subscription);
                break;
            default:
                request.log.info(`Unhandled webhook event: ${event.type}`);
        }
    } catch (err: any) {
        request.log.error('Webhook handler error:', err.message);
        return reply.status(500).send({ error: 'Webhook processing failed' });
    }

    return reply.send({ received: true });
}

// ──────────────────────────────────────────────────────────────
// Webhook event handlers
// ──────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: import('stripe').Stripe.Checkout.Session) {
    const organizationId = session.metadata?.organizationId;
    const plan = session.metadata?.plan as 'PRO' | 'ENTERPRISE';

    if (!organizationId || !plan || !session.subscription) return;

    const stripeSubscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;

    const sub = await getStripe().subscriptions.retrieve(stripeSubscriptionId);

    // Store or update stripeCustomerId on org
    await prisma.organization.update({
        where: { id: organizationId },
        data: {
            plan,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        },
    });

    await prisma.subscription.upsert({
        where: { stripeSubscriptionId },
        create: {
            organizationId,
            stripeSubscriptionId,
            stripePriceId: sub.items.data[0].price.id,
            plan,
            status: 'ACTIVE',
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
        update: {
            plan,
            status: 'ACTIVE',
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
    });
}

async function handleInvoicePaid(invoice: import('stripe').Stripe.Invoice) {
    const stripeSubscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

    if (!stripeSubscriptionId) return;

    const sub = await getStripe().subscriptions.retrieve(stripeSubscriptionId);

    await prisma.subscription.update({
        where: { stripeSubscriptionId },
        data: {
            status: 'ACTIVE',
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
    }).catch(() => { /* subscription might not exist yet, handled by checkout.completed */ });
}

async function handleInvoicePaymentFailed(invoice: import('stripe').Stripe.Invoice) {
    const stripeSubscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

    if (!stripeSubscriptionId) return;

    const dbSub = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId },
        select: { organizationId: true },
    });

    if (!dbSub) return;

    await prisma.subscription.update({
        where: { stripeSubscriptionId },
        data: { status: 'PAST_DUE' },
    });

    // Notify org owner about failed payment
    const owner = await prisma.user.findFirst({
        where: { organizationId: dbSub.organizationId, role: 'OWNER' },
        select: { id: true },
    });

    if (owner) {
        await notification.create({
            userId: owner.id,
            type: 'PAYMENT_FAILED',
            title: 'Payment Failed',
            message: `Your payment of ${invoice.amount_due / 100} ${invoice.currency.toUpperCase()} failed. Please update your payment method to continue your subscription.`,
            payload: { invoiceId: invoice.id, amount: invoice.amount_due },
        });
    }
}

async function handleSubscriptionDeleted(sub: import('stripe').Stripe.Subscription) {
    const dbSub = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: sub.id },
        select: { organizationId: true },
    });

    if (!dbSub) return;

    await Promise.all([
        prisma.subscription.update({
            where: { stripeSubscriptionId: sub.id },
            data: { status: 'CANCELED' },
        }),
        prisma.organization.update({
            where: { id: dbSub.organizationId },
            data: { plan: 'FREE' },
        }),
    ]);

    const owner = await prisma.user.findFirst({
        where: { organizationId: dbSub.organizationId, role: 'OWNER' },
        select: { id: true },
    });

    if (owner) {
        await notification.create({
            userId: owner.id,
            type: 'BILLING_ALERT',
            title: 'Subscription Canceled',
            message: 'Your subscription has been canceled. Your account has been downgraded to the Free plan.',
            payload: { subscriptionId: sub.id },
        });
    }
}

async function handleSubscriptionUpdated(sub: import('stripe').Stripe.Subscription) {
    const status = sub.status as 'trialing' | 'active' | 'past_due' | 'canceled';
    const statusMap: Record<string, 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'> = {
        trialing: 'TRIALING',
        active: 'ACTIVE',
        past_due: 'PAST_DUE',
        canceled: 'CANCELED',
    };

    await prisma.subscription.update({
        where: { stripeSubscriptionId: sub.id },
        data: {
            status: statusMap[status] || 'ACTIVE',
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
    }).catch(() => { });
}
