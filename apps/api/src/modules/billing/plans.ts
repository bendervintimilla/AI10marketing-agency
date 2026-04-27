import { prisma } from '@agency/db';
import { PLAN_LIMITS, PlanType, isWithinLimit } from '@agency/shared';

export { PLAN_LIMITS };

/**
 * Get the current usage record for the org for this month.
 * Creates one if it doesn't exist yet.
 */
export async function getOrCreateUsageRecord(organizationId: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const existing = await prisma.usageRecord.findUnique({
        where: { organizationId_month_year: { organizationId, month, year } },
    });

    if (existing) return existing;

    return prisma.usageRecord.create({
        data: { organizationId, month, year },
    });
}

/**
 * Increment ad generation count for the org's current-month usage record.
 */
export async function incrementAdsGenerated(organizationId: string, count = 1) {
    const now = new Date();
    return prisma.usageRecord.upsert({
        where: {
            organizationId_month_year: {
                organizationId,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
            },
        },
        create: {
            organizationId,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            adsGenerated: count,
        },
        update: { adsGenerated: { increment: count } },
    });
}

/**
 * Check if the org is within its plan limits for a given resource.
 * Throws a 403-friendly error if limit exceeded.
 */
export async function checkPlanLimit(
    organizationId: string,
    resource: 'maxAdsPerMonth' | 'maxCampaigns'
): Promise<void> {
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { plan: true },
    });

    if (!org) throw new Error('Organization not found');

    const plan = org.plan as PlanType;
    const limits = PLAN_LIMITS[plan];

    if (resource === 'maxAdsPerMonth') {
        const usage = await getOrCreateUsageRecord(organizationId);
        if (!isWithinLimit(plan, 'maxAdsPerMonth', usage.adsGenerated)) {
            const limit = limits.maxAdsPerMonth;
            throw Object.assign(
                new Error(
                    `You've reached your plan limit of ${limit} ads this month. Upgrade to ${plan === 'FREE' ? 'Pro' : 'Enterprise'} for more.`
                ),
                { statusCode: 403, code: 'PLAN_LIMIT_EXCEEDED' }
            );
        }
    }

    if (resource === 'maxCampaigns') {
        const campaignCount = await prisma.campaign.count({
            where: { organizationId },
        });
        if (!isWithinLimit(plan, 'maxCampaigns', campaignCount)) {
            const limit = limits.maxCampaigns;
            throw Object.assign(
                new Error(
                    `You've reached your plan limit of ${limit} campaign${limit === 1 ? '' : 's'}. Upgrade to ${plan === 'FREE' ? 'Pro' : 'Enterprise'} for more.`
                ),
                { statusCode: 403, code: 'PLAN_LIMIT_EXCEEDED' }
            );
        }
    }
}
