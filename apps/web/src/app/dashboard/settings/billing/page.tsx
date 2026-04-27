'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type PlanKey = 'FREE' | 'PRO' | 'ENTERPRISE';

const PLANS = [
    {
        key: 'FREE' as PlanKey,
        label: 'Free',
        price: '$0',
        period: '',
        color: 'border-gray-600',
        badge: '',
        features: ['1 campaign', '5 ads/month', '2 platforms', 'Basic analytics'],
        cta: null,
    },
    {
        key: 'PRO' as PlanKey,
        label: 'Pro',
        price: '$49',
        period: '/mo',
        color: 'border-indigo-500',
        badge: 'Most Popular',
        features: ['10 campaigns', '100 ads/month', 'All platforms', 'Auto-pilot', 'Full analytics', 'Email reports'],
        cta: 'Upgrade to Pro',
    },
    {
        key: 'ENTERPRISE' as PlanKey,
        label: 'Enterprise',
        price: '$199',
        period: '/mo',
        color: 'border-purple-500',
        badge: '',
        features: ['Unlimited campaigns', 'Unlimited ads', 'Priority generation', 'API access', 'Dedicated support'],
        cta: 'Upgrade to Enterprise',
    },
];

const MOCK_SUB = {
    plan: 'FREE' as PlanKey,
    planLabel: 'Free',
    price: 0,
    status: 'ACTIVE',
    currentPeriodEnd: null,
    usage: { adsGeneratedThisMonth: 3, month: 2, year: 2026 },
    limits: { maxCampaigns: 1, maxAdsPerMonth: 5, autoPilot: false, fullAnalytics: false },
    invoices: [] as { id: string; amount: number; currency: string; status: string; date: number; pdf: string | null }[],
};

function UsageBar({ label, used, max }: { label: string; used: number; max: number | null }) {
    const pct = max === null ? 0 : Math.min((used / max) * 100, 100);
    const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-indigo-500';
    return (
        <div>
            <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-300">{label}</span>
                <span className="text-gray-400">
                    {used} / {max === null ? '∞' : max}
                </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-500`}
                    style={{ width: max === null ? '10%' : `${pct}%` }}
                />
            </div>
        </div>
    );
}

export default function BillingPage() {
    const { user } = useAuth();
    const [sub] = useState(MOCK_SUB);
    const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
    const [loadingPortal, setLoadingPortal] = useState(false);

    const ORG_ID = user?.orgId || '';

    const handleUpgrade = async (plan: PlanKey) => {
        setLoadingPlan(plan);
        try {
            const res = await fetch(`${API_BASE}/billing/create-checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, organizationId: ORG_ID }),
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch {
            alert('Failed to create checkout session. Please try again.');
        } finally {
            setLoadingPlan(null);
        }
    };

    const handlePortal = async () => {
        setLoadingPortal(true);
        try {
            const res = await fetch(`${API_BASE}/billing/portal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId: ORG_ID }),
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch {
            alert('Failed to open billing portal.');
        } finally {
            setLoadingPortal(false);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-white mb-1">Billing & Plans</h2>
            <p className="text-gray-400 text-sm mb-8">Manage your subscription and payment details</p>

            {/* Current Plan Banner */}
            <div className="mb-8 p-5 rounded-xl border border-indigo-500/30 bg-indigo-500/10">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-indigo-400 uppercase tracking-wider mb-1">Current Plan</p>
                        <p className="text-2xl font-bold text-white">{sub.planLabel}</p>
                        {sub.currentPeriodEnd && (
                            <p className="text-sm text-gray-400 mt-1">
                                Next billing: {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                    {sub.plan !== 'FREE' && (
                        <button
                            onClick={handlePortal}
                            disabled={loadingPortal}
                            className="px-4 py-2 text-sm border border-white/20 text-gray-300 rounded-lg hover:bg-white/10 transition-all disabled:opacity-60"
                        >
                            {loadingPortal ? 'Loading…' : 'Manage Billing'}
                        </button>
                    )}
                </div>
            </div>

            {/* Usage Meters */}
            <div className="mb-8 space-y-4">
                <h3 className="text-sm font-semibold text-white">Your Usage This Month</h3>
                <UsageBar
                    label="Ads Generated"
                    used={sub.usage.adsGeneratedThisMonth}
                    max={sub.limits.maxAdsPerMonth}
                />
                <UsageBar
                    label="Active Campaigns"
                    used={0}
                    max={sub.limits.maxCampaigns}
                />
            </div>

            {/* Plan Cards */}
            <div className="mb-8">
                <h3 className="text-sm font-semibold text-white mb-4">Available Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PLANS.map((plan) => {
                        const isCurrentPlan = sub.plan === plan.key;
                        return (
                            <div
                                key={plan.key}
                                className={`relative p-5 rounded-xl border-2 ${plan.color} ${isCurrentPlan ? 'bg-white/5' : 'bg-white/3'} transition-all`}
                            >
                                {plan.badge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="px-3 py-1 text-xs font-medium bg-indigo-500 text-white rounded-full">
                                            {plan.badge}
                                        </span>
                                    </div>
                                )}
                                {isCurrentPlan && (
                                    <div className="absolute -top-3 right-4">
                                        <span className="px-3 py-1 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
                                            Current
                                        </span>
                                    </div>
                                )}

                                <p className="font-semibold text-white mb-1">{plan.label}</p>
                                <p className="text-2xl font-bold text-white mb-4">
                                    {plan.price}<span className="text-sm text-gray-400">{plan.period}</span>
                                </p>

                                <ul className="space-y-2 mb-5">
                                    {plan.features.map((f) => (
                                        <li key={f} className="text-xs text-gray-400 flex items-center gap-2">
                                            <span className="text-green-400">✓</span> {f}
                                        </li>
                                    ))}
                                </ul>

                                {plan.cta && !isCurrentPlan && (
                                    <button
                                        onClick={() => handleUpgrade(plan.key)}
                                        disabled={loadingPlan === plan.key}
                                        className="w-full py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-lg text-white transition-all"
                                    >
                                        {loadingPlan === plan.key ? 'Redirecting…' : plan.cta}
                                    </button>
                                )}
                                {isCurrentPlan && (
                                    <div className="w-full py-2.5 text-sm text-center text-gray-500">Active Plan</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Invoice History */}
            {sub.invoices.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-white mb-4">Invoice History</h3>
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/3">
                                    <th className="text-left text-gray-400 font-medium px-4 py-3">Date</th>
                                    <th className="text-left text-gray-400 font-medium px-4 py-3">Amount</th>
                                    <th className="text-left text-gray-400 font-medium px-4 py-3">Status</th>
                                    <th className="text-right text-gray-400 font-medium px-4 py-3">PDF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sub.invoices.map((inv) => (
                                    <tr key={inv.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                        <td className="px-4 py-3 text-gray-300">{new Date(inv.date * 1000).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-white">${inv.amount} {inv.currency.toUpperCase()}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${inv.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {inv.pdf && (
                                                <a href={inv.pdf} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                                    Download ↗
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {sub.invoices.length === 0 && sub.plan === 'FREE' && (
                <div className="p-4 rounded-xl bg-gray-800/50 border border-white/5 text-center">
                    <p className="text-sm text-gray-500">No invoices yet. Upgrade to a paid plan to see your billing history.</p>
                </div>
            )}
        </div>
    );
}
