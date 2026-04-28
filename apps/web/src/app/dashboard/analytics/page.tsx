'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'

// ─── Types (match /analytics/org/overview response shape) ────────────────────

type SortKey = 'impressions' | 'reach' | 'clicks' | 'ctr' | 'engagementRate' | 'spent'

interface OrgOverview {
    totals: {
        impressions: number
        reach: number
        clicks: number
        spent: number
        avgCtr: number
        avgEngagementRate: number
    }
    byPlatform: Record<string, { impressions: number; reach: number; spent: number }>
    trendLast30Days: Array<{ date: string; impressions: number; reach: number; clicks: number }>
    topCampaigns: Array<{
        id: string
        name: string
        platform: string
        adCount: number
        impressions: number
        reach: number
        clicks: number
        ctr: number
        engagementRate: number
        spent: number
    }>
    topAds?: Array<{
        adId: string
        adName: string
        platform: string
        impressions: number
        ctr: number
        engagementRate: number
        thumbnailUrl?: string
    }>
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    if (!n) return '0'
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

function platformColor(p: string): string {
    return p === 'INSTAGRAM' ? '#c026d3' : p === 'TIKTOK' ? '#0ea5e9' : p === 'FACEBOOK' || p === 'META' ? '#3b82f6' : p === 'GOOGLE' ? '#10b981' : p === 'YOUTUBE' ? '#ef4444' : '#a78bfa'
}

function platformLabel(p: string): string {
    return p === 'INSTAGRAM' ? 'Instagram' : p === 'TIKTOK' ? 'TikTok' : p === 'FACEBOOK' ? 'Facebook' : p === 'META' ? 'Meta Ads' : p === 'GOOGLE' ? 'Google Ads' : p === 'YOUTUBE' ? 'YouTube' : p
}

// ─── Components ───────────────────────────────────────────────────────────────

function Sparkline({ data, color = '#a78bfa' }: { data: number[]; color?: string }) {
    if (data.length === 0) return null
    const W = 60, H = 22
    const min = Math.min(...data), max = Math.max(...data)
    const range = max - min || 1
    const points = data.map((v, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * W
        const y = H - ((v - min) / range) * H
        return `${x},${y}`
    }).join(' ')
    return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function PlatformBadge({ platform }: { platform: string }) {
    const c = platformColor(platform)
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: `${c}22`, color: c }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
            {platformLabel(platform)}
        </span>
    )
}

function TrendChart({ data }: { data: Array<{ date: string; impressions: number; reach: number }> }) {
    if (data.length === 0) return null
    const W = 600, H = 220, P = 30
    const xs = data.map((_, i) => P + (i / Math.max(data.length - 1, 1)) * (W - 2 * P))
    const allValues = data.flatMap(d => [d.impressions, d.reach])
    const max = Math.max(...allValues, 1)
    const min = 0
    const ys = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P)

    const impressionPoints = data.map((d, i) => `${xs[i]},${ys(d.impressions)}`).join(' ')
    const reachPoints = data.map((d, i) => `${xs[i]},${ys(d.reach)}`).join(' ')

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                <line key={p} x1={P} x2={W - P} y1={P + p * (H - 2 * P)} y2={P + p * (H - 2 * P)} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2,4" />
            ))}
            <polyline points={impressionPoints} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={reachPoints} fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4,4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function PieChart({ data }: { data: { platform: string; value: number; label: string }[] }) {
    const total = data.reduce((s, d) => s + d.value, 0)
    if (total === 0) return null
    const R = 60, C = 80
    let acc = 0
    return (
        <svg width="100%" height={170} viewBox={`0 0 ${C * 2} ${C * 2}`}>
            {data.map(d => {
                const start = (acc / total) * Math.PI * 2 - Math.PI / 2
                const end = ((acc + d.value) / total) * Math.PI * 2 - Math.PI / 2
                acc += d.value
                const x1 = C + Math.cos(start) * R
                const y1 = C + Math.sin(start) * R
                const x2 = C + Math.cos(end) * R
                const y2 = C + Math.sin(end) * R
                const large = d.value / total > 0.5 ? 1 : 0
                return (
                    <path
                        key={d.platform}
                        d={`M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`}
                        fill={platformColor(d.platform)}
                        opacity={0.85}
                    />
                )
            })}
            <circle cx={C} cy={C} r={R * 0.55} fill="var(--color-surface)" />
            <text x={C} y={C - 4} textAnchor="middle" fontSize="11" fill="var(--color-text-muted)" fontWeight="500">Total</text>
            <text x={C} y={C + 14} textAnchor="middle" fontSize="16" fill="var(--color-text)" fontWeight="800" fontFamily="monospace">100%</text>
        </svg>
    )
}

function SortableHeader({ label, field, current, dir, onSort }: { label: string; field: SortKey; current: SortKey; dir: 'asc' | 'desc'; onSort: (f: SortKey) => void }) {
    const active = current === field
    return (
        <th
            className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--color-text)] transition-colors whitespace-nowrap"
            onClick={() => onSort(field)}
        >
            <span className="flex items-center gap-1">
                {label}
                <svg className={['h-3 w-3 transition-transform', active ? 'text-violet-400' : 'opacity-30', active && dir === 'asc' ? 'rotate-180' : ''].join(' ')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </span>
        </th>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
    const { t } = useTranslation()
    const [sortKey, setSortKey] = useState<SortKey>('impressions')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
    const [overview, setOverview] = useState<OrgOverview | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        apiGet<OrgOverview>('/analytics/org/overview')
            .then((data) => {
                if (!cancelled) setOverview(data)
            })
            .catch((err: any) => {
                if (!cancelled) setError(err?.message || 'Failed to load analytics')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => { cancelled = true }
    }, [])

    const totals = overview?.totals
    const hasData = !!totals && totals.impressions > 0
    const trendData = overview?.trendLast30Days ?? []
    const campaigns = overview?.topCampaigns ?? []
    const topAds = overview?.topAds ?? []

    const platformBreakdown = useMemo(() => {
        if (!overview?.byPlatform) return []
        const totalImpressions = Object.values(overview.byPlatform).reduce((s, p) => s + p.impressions, 0)
        if (totalImpressions === 0) return []
        return Object.entries(overview.byPlatform)
            .map(([platform, v]) => ({
                platform,
                label: platformLabel(platform),
                value: Math.round((v.impressions / totalImpressions) * 100),
            }))
            .sort((a, b) => b.value - a.value)
    }, [overview?.byPlatform])

    const sortedCampaigns = useMemo(() => {
        return [...campaigns].sort((a: any, b: any) => {
            const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0
            return sortDir === 'desc' ? bv - av : av - bv
        })
    }, [campaigns, sortKey, sortDir])

    const handleSort = (field: SortKey) => {
        if (sortKey === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(field); setSortDir('desc') }
    }

    const overviewStats = [
        { label: t('analytics.totals.impressions'), value: fmt(totals?.impressions ?? 0), icon: '👁', color: 'from-violet-500/20 to-violet-600/5', border: 'border-violet-500/20', iconBg: 'bg-violet-500/15 text-violet-400' },
        { label: t('analytics.totals.reach'), value: fmt(totals?.reach ?? 0), icon: '📡', color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20', iconBg: 'bg-blue-500/15 text-blue-400' },
        { label: t('analytics.totals.clicks'), value: fmt(totals?.clicks ?? 0), icon: '🖱', color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/15 text-emerald-400' },
        { label: t('analytics.totals.engagement'), value: totals ? `${(totals.avgEngagementRate ?? 0).toFixed(2)}%` : '0%', icon: '💬', color: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/20', iconBg: 'bg-amber-500/15 text-amber-400' },
    ]

    return (
        <div className="space-y-7 max-w-7xl mx-auto animate-fade-in">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('analytics.title')}</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        {hasData ? t('analytics.subtitleData') : t('analytics.subtitleEmpty')}
                    </p>
                </div>
                {hasData && (
                    <Link
                        href="/api/analytics/export/all"
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-violet-500/40 transition-all duration-150"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        {t('analytics.exportCsv')}
                    </Link>
                )}
            </div>

            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
                    {t('analytics.loadFailed', { error })}
                </div>
            )}

            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 animate-pulse">
                            <div className="h-10 w-10 rounded-xl bg-[var(--color-surface-raised)] mb-3" />
                            <div className="h-3 w-24 rounded bg-[var(--color-surface-raised)] mb-2" />
                            <div className="h-8 w-32 rounded bg-[var(--color-surface-raised)]" />
                        </div>
                    ))}
                </div>
            )}

            {!loading && !hasData && !error && (
                <div className="rounded-2xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] p-12 text-center">
                    <div className="h-14 w-14 mx-auto rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">{t('analytics.empty.title')}</h2>
                    <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto mb-6">
                        {t('analytics.empty.body')}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <Link href="/dashboard/settings/accounts" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition">
                            {t('analytics.empty.connect')}
                        </Link>
                        <Link href="/dashboard/audits" className="px-4 py-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] text-sm font-medium text-[var(--color-text)] transition">
                            {t('analytics.empty.audit')}
                        </Link>
                    </div>
                </div>
            )}

            {!loading && hasData && (
                <>
                    {/* ── Overview Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {overviewStats.map((s) => (
                            <div key={s.label} className={`relative rounded-2xl bg-gradient-to-br ${s.color} border ${s.border} p-5 overflow-hidden transition-all duration-200`}>
                                <div className="absolute inset-0 bg-[var(--color-surface)] opacity-80 rounded-2xl" />
                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg ${s.iconBg}`}>
                                            {s.icon}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">{s.label}</p>
                                    <p className="text-3xl font-black text-[var(--color-text)] tabular-nums leading-none">{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Trend Chart + Platform Pie ── */}
                    {(trendData.length > 0 || platformBreakdown.length > 0) && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {trendData.length > 0 && (
                                <div className="xl:col-span-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                                    <div className="flex items-center justify-between mb-5">
                                        <h2 className="text-sm font-semibold text-[var(--color-text)]">{t('analytics.performanceTrend')}</h2>
                                        <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-full bg-violet-500 inline-block" />Impressions</span>
                                            <span className="flex items-center gap-1.5"><span className="h-px w-5 bg-cyan-400 border-t-2 border-dashed border-cyan-400 inline-block" />Reach</span>
                                        </div>
                                    </div>
                                    <TrendChart data={trendData} />
                                </div>
                            )}
                            {platformBreakdown.length > 0 && (
                                <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                                    <h2 className="text-sm font-semibold text-[var(--color-text)] mb-5">{t('analytics.platformBreakdown')}</h2>
                                    <PieChart data={platformBreakdown} />
                                    <div className="mt-5 pt-4 border-t border-[var(--color-border)] grid grid-cols-3 gap-2">
                                        {platformBreakdown.slice(0, 3).map(d => (
                                            <div key={d.platform} className="text-center">
                                                <p className="text-lg font-black text-[var(--color-text)] tabular-nums">{d.value}%</p>
                                                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{d.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Campaign Performance Table ── */}
                    {campaigns.length > 0 && (
                        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                                <h2 className="text-sm font-semibold text-[var(--color-text)]">{t('analytics.campaignPerformance')}</h2>
                                <p className="text-xs text-[var(--color-text-muted)]">{t('analytics.clickToSort')}</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[800px]">
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)] bg-white/[0.02]">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Campaign</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Ads</th>
                                            <SortableHeader label="Impressions" field="impressions" current={sortKey} dir={sortDir} onSort={handleSort} />
                                            <SortableHeader label="Reach" field="reach" current={sortKey} dir={sortDir} onSort={handleSort} />
                                            <SortableHeader label="Clicks" field="clicks" current={sortKey} dir={sortDir} onSort={handleSort} />
                                            <SortableHeader label="CTR" field="ctr" current={sortKey} dir={sortDir} onSort={handleSort} />
                                            <SortableHeader label="Eng. Rate" field="engagementRate" current={sortKey} dir={sortDir} onSort={handleSort} />
                                            <SortableHeader label="Spent" field="spent" current={sortKey} dir={sortDir} onSort={handleSort} />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {sortedCampaigns.map((row: any) => (
                                            <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-3.5">
                                                    <div className="flex flex-col gap-1">
                                                        <Link href={`/dashboard/campaigns/${row.id}`} className="text-sm font-semibold text-[var(--color-text)] hover:text-violet-400 transition-colors">
                                                            {row.name}
                                                        </Link>
                                                        <PlatformBadge platform={row.platform} />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-[var(--color-text-muted)]">{row.adCount ?? 0}</td>
                                                <td className="px-4 py-3.5 text-sm text-[var(--color-text)] tabular-nums font-medium">{fmt(row.impressions)}</td>
                                                <td className="px-4 py-3.5 text-sm text-[var(--color-text-muted)] tabular-nums">{fmt(row.reach)}</td>
                                                <td className="px-4 py-3.5 text-sm text-[var(--color-text-muted)] tabular-nums">{fmt(row.clicks)}</td>
                                                <td className="px-4 py-3.5">
                                                    <span className={['text-sm font-semibold tabular-nums', row.ctr >= 2.5 ? 'text-emerald-400' : row.ctr >= 1.5 ? 'text-amber-400' : 'text-red-400'].join(' ')}>
                                                        {(row.ctr ?? 0).toFixed(2)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 rounded-full bg-white/5 min-w-[48px]">
                                                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(((row.engagementRate ?? 0) / 10) * 100, 100)}%` }} />
                                                        </div>
                                                        <span className="text-xs font-semibold text-[var(--color-text-muted)] tabular-nums">{(row.engagementRate ?? 0).toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-[var(--color-text-muted)] tabular-nums">${(row.spent ?? 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Top Performing Ads ── */}
                    {topAds.length > 0 && (
                        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                                <div>
                                    <h2 className="text-sm font-semibold text-[var(--color-text)]">{t('analytics.topAds')}</h2>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t('analytics.topAdsHint')}</p>
                                </div>
                            </div>
                            <div className="divide-y divide-[var(--color-border)]">
                                {topAds.map((ad, idx) => (
                                    <Link
                                        key={ad.adId}
                                        href={`/dashboard/analytics/${ad.adId}`}
                                        className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors group"
                                    >
                                        <span className={[
                                            'h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                                            idx === 0 ? 'bg-amber-400/20 text-amber-400' : idx === 1 ? 'bg-slate-400/20 text-slate-400' : idx === 2 ? 'bg-orange-600/20 text-orange-400' : 'bg-white/5 text-[var(--color-text-muted)]',
                                        ].join(' ')}>
                                            {idx + 1}
                                        </span>
                                        <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0" style={{ background: `${platformColor(ad.platform)}22` }}>
                                            {ad.thumbnailUrl ? (
                                                <img src={ad.thumbnailUrl} alt={ad.adName} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-lg">
                                                    {ad.platform === 'INSTAGRAM' ? '📸' : ad.platform === 'TIKTOK' ? '🎵' : '📘'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[var(--color-text)] truncate">{ad.adName}</p>
                                            <PlatformBadge platform={ad.platform} />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-[var(--color-text)] tabular-nums">{fmt(ad.impressions)}</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)]">impressions</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-emerald-400 tabular-nums">{ad.engagementRate.toFixed(1)}%</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)]">engagement</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
