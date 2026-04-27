import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Lazy Stripe singleton — only throws when billing features are actually used
 * without STRIPE_SECRET_KEY, not at import / startup time.
 */
export function getStripe(): Stripe {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
            throw new Error(
                'STRIPE_SECRET_KEY is not set. Configure it in .env to use billing features.'
            );
        }
        _stripe = new Stripe(key, {
            apiVersion: '2023-10-16',
            typescript: true,
        });
    }
    return _stripe;
}

/** @deprecated – use getStripe() instead for lazy init */
export const stripe = undefined as unknown as Stripe;

export const STRIPE_PRICE_IDS = {
    PRO: process.env.STRIPE_PRICE_ID_PRO || '',
    ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
} as const;
