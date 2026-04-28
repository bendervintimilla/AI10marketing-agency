'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPatch } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

const INDUSTRIES = [
    'Hospitality & Restaurants', 'Retail & E-commerce', 'Health & Wellness', 'Food & Beverage',
    'Fashion & Apparel', 'Technology', 'Financial Services', 'Real Estate', 'Education',
    'Entertainment', 'Travel & Hospitality', 'Non-profit', 'Other',
];

interface OrgPayload {
    organization?: { id: string; name: string; industry?: string };
}

interface BrandRow {
    id: string;
    name: string;
    instagramHandle?: string | null;
    websiteUrl?: string | null;
    followerCount?: number | null;
}

export default function ProfilePage() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [form, setForm] = useState({ name: '', industry: '' });
    const [brands, setBrands] = useState<BrandRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            apiGet<OrgPayload>('/auth/me').catch(() => ({} as OrgPayload)),
            apiGet<BrandRow[]>('/brands').catch(() => [] as BrandRow[]),
        ]).then(([me, brandList]) => {
            if (cancelled) return;
            const org = me.organization;
            if (org) {
                setForm({ name: org.name ?? '', industry: org.industry ?? '' });
            }
            setBrands(Array.isArray(brandList) ? brandList : []);
        }).finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.orgId) return;
        setSaving(true);
        setError('');
        try {
            await apiPatch(`/organizations/${user.orgId}`, {
                name: form.name,
                industry: form.industry,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('settings.profile.saveError'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-10">
            {/* ── Org-level profile (the agency itself) ── */}
            <section>
                <h2 className="text-xl font-semibold text-[var(--color-text)] mb-1">{t('settings.profile.agencyTitle')}</h2>
                <p className="text-[var(--color-text-muted)] text-sm mb-6">
                    {t('settings.profile.agencyHint')}
                </p>

                {loading ? (
                    <div className="h-32 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse" />
                ) : (
                    <form onSubmit={handleSave} className="space-y-6 max-w-lg">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">{t('settings.profile.logo')}</label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-2xl">
                                    🏢
                                </div>
                                <button
                                    type="button"
                                    className="px-4 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-colors"
                                    disabled
                                    title={t('common.comingSoon')}
                                >
                                    {t('settings.profile.uploadLogo')}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">{t('settings.profile.agencyName')}</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all"
                                placeholder={t('settings.profile.agencyNamePlaceholder')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">{t('settings.profile.industry')}</label>
                            <select
                                value={form.industry}
                                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
                            >
                                <option value="">{t('settings.profile.industryPlaceholder')}</option>
                                {INDUSTRIES.map((ind) => (
                                    <option key={ind} value={ind}>{ind}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-4 pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 rounded-xl text-sm font-medium text-white transition-all shadow-lg shadow-violet-500/20"
                            >
                                {saving ? t('common.saving') : t('common.saveChanges')}
                            </button>
                            {saved && (
                                <span className="text-sm text-emerald-400 flex items-center gap-1">✓ {t('common.saved')}</span>
                            )}
                            {error && (
                                <span className="text-sm text-red-400">{error}</span>
                            )}
                        </div>
                    </form>
                )}
            </section>

            {/* ── Brand/Venue profiles ── */}
            <section>
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-semibold text-[var(--color-text)]">{t('settings.profile.brandsTitle')}</h2>
                    <span className="text-xs text-[var(--color-text-subtle)]">
                        {brands.length === 1
                            ? t('settings.profile.brandCount', { count: brands.length })
                            : t('settings.profile.brandCountPlural', { count: brands.length })}
                    </span>
                </div>
                <p className="text-[var(--color-text-muted)] text-sm mb-5">
                    {t('settings.profile.brandsHint')}
                </p>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-20 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse" />
                        ))}
                    </div>
                ) : brands.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
                        <p className="text-sm text-[var(--color-text-muted)] mb-3">{t('settings.profile.noBrands')}</p>
                        <Link
                            href="/dashboard/claude-design"
                            className="inline-flex items-center px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition"
                        >
                            {t('settings.profile.addFirst')}
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {brands.map((b) => (
                            <Link
                                key={b.id}
                                href={`/dashboard/claude-design?brand=${b.id}`}
                                className="flex items-center gap-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 hover:border-violet-500/40 hover:bg-[var(--color-surface-raised)] transition-all group"
                            >
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500/30 to-pink-500/30 flex items-center justify-center text-sm font-bold text-white shrink-0">
                                    {b.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[var(--color-text)] truncate">{b.name}</p>
                                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                                        {b.instagramHandle ? `@${b.instagramHandle}` : t('settings.profile.noHandle')}
                                        {b.websiteUrl ? ` · ${new URL(b.websiteUrl).hostname}` : ''}
                                    </p>
                                </div>
                                <span className="text-xs text-[var(--color-text-subtle)] group-hover:text-violet-400 shrink-0 transition-colors">
                                    {t('settings.profile.edit')}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
