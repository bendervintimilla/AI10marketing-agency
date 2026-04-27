'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK'
type SortKey = 'impressions' | 'reach' | 'clicks' | 'ctr' | 'engagementRate' | 'spent'

interface CampaignRow {
    id: string
    name: string
    adCount: number
    impressions: number
    reach: number
    clicks: number
    ctr: number
    engagementRate: number
    spent: number
    sparkline: number[]
    platform: Platform
}

interface TopAd {
    adId: string
    adName: string
    platform: Platform
    impressions: number
    ctr: number
    engagementRate: number
    thumbnailUrl?: string
}

// ─── Mock data (replace with real API calls when backend is live) ─────────────

const TREND_DAYS = 30
const TREND_DATA = Array.from({ length: TREND_DAYS }, (_, i) => ({
    date: new Date(Date.now() - (TREND_DAYS - 1 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    impressions: Math.floor(30000 + Math.random() * 50000 + i * 3000),
    reach: Math.floor(20000 + Math.random() * 30000 + i * 1800),
    clicks: Math.floor(1500 + Math.random() * 3000 + i * 150),
}))

const PLATFORM_DATA: { platform: Platform; color: string; value: number; label: string }[] = [
    { platform: 'INSTAGRAM', color: '#c026d3', value: 48, label: 'Instagram' },
    { platform: 'TIKTOK', color: '#0ea5e9', value: 31, label: 'TikTok' },
    { platform: 'FACEBOOK', color: '#3b82f6', value: 21, label: 'Facebook' },
]

const CAMPAIGN_ROWS: CampaignRow[] = [
    { id: 'c1', name: 'Summer Sale 2025', adCount: 12, impressions: 842000, reach: 620000, clicks: 18400, ctr: 2.18, engagementRate: 4.6, spent: 3200, sparkline: [8, 12, 9, 16, 14, 18, 21], platform: 'INSTAGRAM' },
    { id: 'c2', name: 'Brand Awareness Q1', adCount: 8, impressions: 531000, reach: 410000, clicks: 9800, ctr: 1.84, engagementRate: 3.2, spent: 1900, sparkline: [4, 6, 8, 7, 10, 9, 12], platform: 'TIKTOK' },
    { id: 'c3', name: 'Product Launch March', adCount: 15, impressions: 1240000, reach: 980000, clicks: 34600, ctr: 2.79, engagementRate: 6.1, spent: 5800, sparkline: [10, 14, 18, 16, 22, 26, 30], platform: 'INSTAGRAM' },
    { id: 'c4', name: 'Retargeting Wave 2', adCount: 6, impressions: 210000, reach: 190000, clicks: 6200, ctr: 2.95, engagementRate: 5.4, spent: 1100, sparkline: [5, 6, 7, 8, 9, 10, 11], platform: 'FACEBOOK' },
    { id: 'c5', name: 'Influencer Collab', adCount: 4, impressions: 390000, reach: 340000, clicks: 11200, ctr: 2.87, engagementRate: 7.8, spent: 2200, sparkline: [6, 9, 11, 10, 13, 15, 16], platform: 'TIKTOK' },
]

const TOP_ADS: TopAd[] = [
    { adId: 'a1', adName: 'Summer Vibes Reel #7', platform: 'INSTAGRAM', impressions: 284000, ctr: 3.82, engagementRate: 9.2 },
    { adId: 'a2', adName: 'Product Showcase v4', platform: 'TIKTOK', impressions: 190000, ctr: 3.51, engagementRate: 8.7 },
    { adId: 'a3', adName: 'Behind the Scenes', platform: 'INSTAGRAM', impressions: 142000, ctr: 3.28, engagementRate: 7.9 },
    { adId: 'a4', adName: 'Flash Sale Alert', platform: 'FACEBOOK', impressions: 98000, ctr: 3.12, engagementRate: 6.8 },
    { adId: 'a5', adName: 'Testimonial Cut #3', platform: 'TIKTOK', impressions: 87000, ctr: 2.94, engagementRate: 6.1 },
]

const OVERVIEW_STATS = [
    { label: 'Total Impressions', value: '3.2M', raw: 3217000, change: 28.4, icon: '👁', color: 'from-violet-500/20 to-violet-600/5', border: 'border-violet-500/20', iconBg: 'bg-violet-500/15 text-violet-400' },
    { label: 'Total Reach', value: '2.5M', raw: 2540000, change: 22.1, icon: '📡', color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20', iconBg: 'bg-blue-500/15 text-blue-400' },
    { label: 'Total Clicks', value: '80.2K', raw: 80200, change: 34.8, icon: '🖱', color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/15 text-emerald-400' },
    { label: 'Avg. Engagement', value: '5.46%', raw: 5.46, change: 8.2, icon: '💬', color: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/20', iconBg: 'bg-amber-500/15 text-amber-400' },
]

// ─── Utility ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

function platformColor(p: Platform): string {
    return p === 'INSTAGRAM' ? '#c026d3' : p === 'TIKTOK' ? '#0ea5e9' : '#3b82f6'
}

function platformLabel(p: Platform): string {
    return p === 'INSTAGRAM' ? 'Instagram' : p === 'TIKTOK' ? 'TikTok' : 'Facebook'
}

// ─── Components ───────────────────────────────────────────────────────────────

function Sparkline({ data, color = '#8b5cf6' }: { data: number[]; color?: string }) {
    const w = 72, h = 28
    const min = Math.min(...data), max = Math.max(...data)
    const range = max - min || 1
    const step = w / (data.length - 1)
    const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ')
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function TrendChart({ data }: { data: typeof TREND_DATA }) {
    const w = 900, h = 200, pad = { top: 12, right: 16, bottom: 36, left: 56 }
    const inner = { w: w - pad.left - pad.right, h: h - pad.top - pad.bottom }
    const maxImp = Math.max(...data.map(d => d.impressions))

    const imprPts = data.map((d, i) => {
        const x = (i / (data.length - 1)) * inner.w
        const y = inner.h - (d.impressions / maxImp) * inner.h
        return `${x},${y}`
    }).join(' ')

    const reachPts = data.map((d, i) => {
        const x = (i / (data.length - 1)) * inner.w
        const y = inner.h - (d.reach / maxImp) * inner.h
        return `${x},${y}`
    }).join(' ')

    const ticks = [0, 0.25, 0.5, 0.75, 1]
    const labelEvery = Math.floor(data.length / 5)

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-label="30-day trend chart">
            <defs>
                <linearGradient id="imp-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                </linearGradient>
            </defs>
            <g transform={`translate(${pad.left},${pad.top})`}>
                {/* Grid lines */}
                {ticks.map(t => {
                    const y = inner.h - t * inner.h
                    return (
                        <g key={t}>
                            <line x1={0} y1={y} x2={inner.w} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                            <text x={-8} y={y + 4} fontSize={10} fill="#6b7280" textAnchor="end">
                                {fmt(t * maxImp)}
                            </text>
                        </g>
                    )
                })}
                {/* Area fill */}
                <polygon
                    points={`0,${inner.h} ${imprPts} ${inner.w},${inner.h}`}
                    fill="url(#imp-grad)"
                />
                {/* Reach line */}
                <polyline points={reachPts} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />
                {/* Impressions line */}
                <polyline points={imprPts} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* X labels */}
                {data.filter((_, i) => i % labelEvery === 0).map((d, idx) => {
                    const i = idx * labelEvery
                    const x = (i / (data.length - 1)) * inner.w
                    return (
                        <text key={i} x={x} y={inner.h + 22} fontSize={10} fill="#6b7280" textAnchor="middle">
                            {d.date}
                        </text>
                    )
                })}
            </g>
        </svg>
    )
}

function PieChart({ data }: { data: typeof PLATFORM_DATA }) {
    const total = data.reduce((a, d) => a + d.value, 0)
    let angle = -Math.PI / 2
    const cx = 80, cy = 80, r = 64, gap = 3

    const slices = data.map(d => {
        const sweep = (d.value / total) * 2 * Math.PI
        const a1 = angle + gap / r
        const a2 = angle + sweep - gap / r
        const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
        const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
        const large = sweep > Math.PI ? 1 : 0
        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
        angle += sweep
        return { ...d, path }
    })

    return (
        <div className="flex items-center gap-8">
            <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={2} />
                {slices.map(s => (
                    <path key={s.platform} d={s.path} fill={s.color} opacity={0.9} />
                ))}
                <circle cx={cx} cy={cy} r={38} fill="var(--color-surface)" />
                <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fill="#9ca3af">Total</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize={14} fontWeight="700" fill="#e5e7eb">100%</text>
            </svg>
            <div className="space-y-2.5">
                {data.map(d => (
                    <div key={d.platform} className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-[var(--color-text-muted)] min-w-[72px]">{d.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 min-w-[80px]">
                            <div className="h-full rounded-full" style={{ width: `${d.value}%`, background: d.color }} />
                        </div>
                        <span className="text-xs font-semibold text-[var(--color-text)] tabular-nums">{d.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function PlatformBadge({ platform }: { platform: Platform }) {
    const label = platformLabel(platform)
    const color = platformColor(platform)
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide" style={{ background: `${color}22`, color }}>
            {label}
        </span>
    )
}

function SortableHeader({ label, field, current, dir, onSort }: {
    label: string; field: SortKey; current: SortKey; dir: 'asc' | 'desc'; onSort: (f: SortKey) => void
}) {
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
    const [sortKey, setSortKey] = useState<SortKey>('impressions')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

    const sortedCampaigns = useMemo(() => {
        return [...CAMPAIGN_ROWS].sort((a, b) => {
            const av = a[sortKey], bv = b[sortKey]
            return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
        })
    }, [sortKey, sortDir])

    const handleSort = (field: SortKey) => {
        if (sortKey === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(field)
            setSortDir('desc')
        }
    }

    return (
        <div className="space-y-7 max-w-7xl mx-auto animate-fade-in">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">Analytics</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Last 30 days · Updated every 4 hours</p>
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href="/api/analytics/export/all"
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-violet-500/40 transition-all duration-150"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export CSV
                    </a>
                </div>
            </div>

            {/* ── Overview Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {OVERVIEW_STATS.map((s) => (
                    <div key={s.label} className={`relative rounded-2xl bg-gradient-to-br ${s.color} border ${s.border} p-5 overflow-hidden hover:scale-[1.02] transition-all duration-200`}>
                        <div className="absolute inset-0 bg-[var(--color-surface)] opacity-80 rounded-2xl" />
                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-3">
                                <span className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg ${s.iconBg}`}>
                                    {s.icon}
                                </span>
                                <span className={['flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full', s.change >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'].join(' ')}>
                                    <svg className={['h-3 w-3', s.change < 0 && 'rotate-180'].join(' ')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                    {Math.abs(s.change)}%
                                </span>
                            </div>
                            <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">{s.label}</p>
                            <p className="text-3xl font-black text-[var(--color-text)] tabular-nums leading-none">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Trend Chart + Platform Pie ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-semibold text-[var(--color-text)]">Performance Trend</h2>
                        <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-full bg-violet-500 inline-block" />Impressions</span>
                            <span className="flex items-center gap-1.5"><span className="h-px w-5 bg-cyan-400 border-t-2 border-dashed border-cyan-400 inline-block" />Reach</span>
                        </div>
                    </div>
                    <TrendChart data={TREND_DATA} />
                </div>
                <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                    <h2 className="text-sm font-semibold text-[var(--color-text)] mb-5">Platform Breakdown</h2>
                    <PieChart data={PLATFORM_DATA} />
                    <div className="mt-5 pt-4 border-t border-[var(--color-border)] grid grid-cols-3 gap-2">
                        {PLATFORM_DATA.map(d => (
                            <div key={d.platform} className="text-center">
                                <p className="text-lg font-black text-[var(--color-text)] tabular-nums">{d.value}%</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{d.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Campaign Performance Table ── */}
            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                    <h2 className="text-sm font-semibold text-[var(--color-text)]">Campaign Performance</h2>
                    <p className="text-xs text-[var(--color-text-muted)]">Click any column to sort</p>
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
                                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {sortedCampaigns.map((row) => (
                                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-4 py-3.5">
                                        <div className="flex flex-col gap-1">
                                            <Link href={`/dashboard/analytics/campaign/${row.id}`} className="text-sm font-semibold text-[var(--color-text)] hover:text-violet-400 transition-colors">
                                                {row.name}
                                            </Link>
                                            <PlatformBadge platform={row.platform} />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-sm text-[var(--color-text-muted)]">{row.adCount}</td>
                                    <td className="px-4 py-3.5 text-sm text-[var(--color-text)] tabular-nums font-medium">{fmt(row.impressions)}</td>
                                    <td className="px-4 py-3.5 text-sm text-[var(--color-text-muted)] tabular-nums">{fmt(row.reach)}</td>
                                    <td className="px-4 py-3.5 text-sm text-[var(--color-text-muted)] tabular-nums">{fmt(row.clicks)}</td>
                                    <td className="px-4 py-3.5">
                                        <span className={['text-sm font-semibold tabular-nums', row.ctr >= 2.5 ? 'text-emerald-400' : row.ctr >= 1.5 ? 'text-amber-400' : 'text-red-400'].join(' ')}>
                                            {row.ctr.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 rounded-full bg-white/5 min-w-[48px]">
                                                <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min((row.engagementRate / 10) * 100, 100)}%` }} />
                                            </div>
                                            <span className="text-xs font-semibold text-[var(--color-text-muted)] tabular-nums">{row.engagementRate.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-sm text-[var(--color-text-muted)] tabular-nums">${row.spent.toLocaleString()}</td>
                                    <td className="px-4 py-3.5">
                                        <Sparkline data={row.sparkline} color={platformColor(row.platform)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Top Performing Ads ── */}
            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                    <div>
                        <h2 className="text-sm font-semibold text-[var(--color-text)]">Top Performing Ads</h2>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Ranked by engagement rate</p>
                    </div>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                    {TOP_ADS.map((ad, idx) => (
                        <Link
                            key={ad.adId}
                            href={`/dashboard/analytics/${ad.adId}`}
                            className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors group"
                        >
                            {/* Rank */}
                            <span className={[
                                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                                idx === 0 ? 'bg-amber-400/20 text-amber-400' : idx === 1 ? 'bg-slate-400/20 text-slate-400' : idx === 2 ? 'bg-orange-600/20 text-orange-400' : 'bg-white/5 text-[var(--color-text-muted)]',
                            ].join(' ')}>
                                {idx + 1}
                            </span>

                            {/* Thumbnail placeholder */}
                            <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0" style={{ background: `${platformColor(ad.platform)}22` }}>
                                {ad.thumbnailUrl ? (
                                    <img src={ad.thumbnailUrl} alt={ad.adName} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-lg">
                                        {ad.platform === 'INSTAGRAM' ? '📸' : ad.platform === 'TIKTOK' ? '🎵' : '📘'}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--color-text)] group-hover:text-violet-400 transition-colors truncate">{ad.adName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <PlatformBadge platform={ad.platform} />
                                    <span className="text-xs text-[var(--color-text-muted)]">{fmt(ad.impressions)} impressions</span>
                                </div>
                            </div>

                            {/* Metrics */}
                            <div className="flex items-center gap-6 shrink-0">
                                <div className="text-right">
                                    <p className="text-xs text-[var(--color-text-muted)]">CTR</p>
                                    <p className="text-sm font-bold text-emerald-400 tabular-nums">{ad.ctr.toFixed(2)}%</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-[var(--color-text-muted)]">Eng. Rate</p>
                                    <p className="text-sm font-bold text-violet-400 tabular-nums">{ad.engagementRate.toFixed(1)}%</p>
                                </div>
                                <svg className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
