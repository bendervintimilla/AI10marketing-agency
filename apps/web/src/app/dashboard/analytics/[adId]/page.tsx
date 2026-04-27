'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type SeriesKey = 'impressions' | 'clicks' | 'engagementRate'

interface DayData {
    date: string
    impressions: number
    clicks: number
    engagementRate: number
}

interface AIAnnotation {
    id: string
    type: string
    message: string
    status: 'PENDING' | 'ACCEPTED' | 'DISMISSED'
    createdAt: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const DAYS = 30
const TIME_SERIES: DayData[] = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(Date.now() - (DAYS - 1 - i) * 86400000)
    return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        impressions: Math.floor(8000 + Math.random() * 12000 + i * 400),
        clicks: Math.floor(200 + Math.random() * 600 + i * 18),
        engagementRate: parseFloat((3.5 + Math.random() * 4 + i * 0.08).toFixed(2)),
    }
})

const CAMPAIGN_AVGS = {
    impressions: 7200,
    reach: 5800,
    ctr: 2.14,
    engagementRate: 4.3,
}

const AD_LATEST = {
    adName: 'Summer Vibes Reel #7',
    platform: 'INSTAGRAM' as const,
    campaignName: 'Summer Sale 2025',
    impressions: TIME_SERIES[DAYS - 1].impressions,
    reach: Math.floor(TIME_SERIES[DAYS - 1].impressions * 0.78),
    ctr: (TIME_SERIES[DAYS - 1].clicks / TIME_SERIES[DAYS - 1].impressions * 100),
    engagementRate: TIME_SERIES[DAYS - 1].engagementRate,
    spent: 298,
}

// Heatmap: 7 rows (days) × 24 cols (hours) — random performance scores 0-1
const HEATMAP: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => Math.random())
)
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => i === 0 ? '12a' : i === 12 ? '12p' : i < 12 ? `${i}a` : `${i - 12}p`)
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const AI_ANNOTATIONS: AIAnnotation[] = [
    { id: 'r1', type: 'PAUSE', message: 'CTR has declined 18% over the last 3 days — consider pausing this ad.', status: 'PENDING', createdAt: '2 hours ago' },
    { id: 'r2', type: 'BUDGET', message: 'This ad outperforms campaign average by 43%. Increasing daily budget could scale results.', status: 'PENDING', createdAt: '6 hours ago' },
    { id: 'r3', type: 'TIMING', message: 'Peak engagement is Tuesday 7–9 PM. Reschedule future variants for this window.', status: 'ACCEPTED', createdAt: '1 day ago' },
]

const SERIES_CONFIG: Record<SeriesKey, { label: string; color: string; format: (v: number) => string }> = {
    impressions: { label: 'Impressions', color: '#7c3aed', format: v => v.toLocaleString() },
    clicks: { label: 'Clicks', color: '#06b6d4', format: v => v.toLocaleString() },
    engagementRate: { label: 'Eng. Rate', color: '#10b981', format: v => `${v.toFixed(2)}%` },
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function heatColor(score: number): string {
    if (score < 0.2) return 'rgba(124,58,237,0.05)'
    if (score < 0.4) return 'rgba(124,58,237,0.2)'
    if (score < 0.6) return 'rgba(124,58,237,0.45)'
    if (score < 0.8) return 'rgba(124,58,237,0.7)'
    return 'rgba(124,58,237,0.95)'
}

function fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

// ─── Multi-series Line Chart ──────────────────────────────────────────────────

function TimeSeriesChart({
    data,
    activeSeries,
    annotations,
}: {
    data: DayData[]
    activeSeries: Set<SeriesKey>
    annotations: AIAnnotation[]
}) {
    const W = 900, H = 260, pad = { top: 16, right: 16, bottom: 40, left: 56 }
    const inner = { w: W - pad.left - pad.right, h: H - pad.top - pad.bottom }

    // Scale each series independently (normalise to 0-1 for layout, label raw values)
    const seriesLines = (Object.keys(SERIES_CONFIG) as SeriesKey[])
        .filter(k => activeSeries.has(k))
        .map(k => {
            const vals = data.map(d => d[k])
            const min = Math.min(...vals), max = Math.max(...vals)
            const range = max - min || 1
            const pts = vals.map((v, i) => {
                const x = (i / (data.length - 1)) * inner.w
                const y = inner.h - ((v - min) / range) * inner.h
                return `${x},${y}`
            }).join(' ')
            return { key: k, pts, color: SERIES_CONFIG[k].color, min, max }
        })

    const labelEvery = Math.floor(data.length / 6)

    // AI annotation points (map by idx within last 10 days)
    const annotationIndices = [DAYS - 3, DAYS - 7, DAYS - 12]

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Ad performance time series">
            <defs>
                {seriesLines.map(s => (
                    <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                    </linearGradient>
                ))}
            </defs>
            <g transform={`translate(${pad.left},${pad.top})`}>
                {/* Grid */}
                {[0, 0.25, 0.5, 0.75, 1].map(t => {
                    const y = t * inner.h
                    return <line key={t} x1={0} y1={y} x2={inner.w} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                })}
                {/* Series */}
                {seriesLines.map(s => {
                    const areaPts = `0,${inner.h} ${s.pts} ${inner.w},${inner.h}`
                    return (
                        <g key={s.key}>
                            <polygon points={areaPts} fill={`url(#grad-${s.key})`} />
                            <polyline points={s.pts} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                    )
                })}
                {/* AI annotation markers */}
                {annotations.slice(0, 3).map((ann, idx) => {
                    const di = annotationIndices[idx]
                    if (di === undefined || !activeSeries.has('impressions')) return null
                    const vals = data.map(d => d.impressions)
                    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1
                    const x = (di / (data.length - 1)) * inner.w
                    const y = inner.h - ((vals[di] - min) / range) * inner.h - 8
                    return (
                        <g key={ann.id}>
                            <circle cx={x} cy={y + 8} r={5} fill="#fbbf24" opacity={0.9} />
                            <text x={x} y={y - 2} textAnchor="middle" fontSize={9} fill="#fbbf24" fontWeight="700">AI</text>
                        </g>
                    )
                })}
                {/* X labels */}
                {data.filter((_, i) => i % labelEvery === 0).map((d, idx) => {
                    const i = idx * labelEvery
                    const x = (i / (data.length - 1)) * inner.w
                    return <text key={i} x={x} y={inner.h + 24} fontSize={10} fill="#6b7280" textAnchor="middle">{d.date}</text>
                })}
            </g>
        </svg>
    )
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

function Heatmap() {
    const cellW = 22, cellH = 22, rowLabelW = 32
    const W = rowLabelW + 24 * cellW + 4
    const H = 7 * cellH + 32

    return (
        <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" aria-label="Performance heatmap by hour and day">
                {/* Hour labels */}
                {HOUR_LABELS.map((lbl, h) => (
                    <text key={h} x={rowLabelW + h * cellW + cellW / 2} y={12} textAnchor="middle" fontSize={8} fill="#6b7280">{lbl}</text>
                ))}
                {/* Rows */}
                {HEATMAP.map((row, dayIdx) => (
                    <g key={dayIdx} transform={`translate(0,${dayIdx * cellH + 18})`}>
                        <text x={rowLabelW - 4} y={cellH / 2 + 4} textAnchor="end" fontSize={9} fill="#6b7280">{DAY_LABELS[dayIdx]}</text>
                        {row.map((score, hour) => (
                            <g key={hour}>
                                <rect
                                    x={rowLabelW + hour * cellW + 1}
                                    y={1}
                                    width={cellW - 2}
                                    height={cellH - 2}
                                    fill={heatColor(score)}
                                    rx={3}
                                />
                            </g>
                        ))}
                    </g>
                ))}
                {/* Legend */}
                <g transform={`translate(${rowLabelW},${7 * cellH + 24})`}>
                    <text x={0} y={6} fontSize={9} fill="#6b7280">Low</text>
                    {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => (
                        <rect key={i} x={28 + i * 16} y={0} width={14} height={8} fill={heatColor(v)} rx={2} />
                    ))}
                    <text x={108} y={6} fontSize={9} fill="#6b7280">High</text>
                </g>
            </svg>
        </div>
    )
}

// ─── Comparison Bar ───────────────────────────────────────────────────────────

function ComparisonRow({ label, adValue, campaignValue, format }: {
    label: string; adValue: number; campaignValue: number; format: (v: number) => string
}) {
    const max = Math.max(adValue, campaignValue) * 1.1
    const adPct = (adValue / max) * 100
    const campPct = (campaignValue / max) * 100
    const better = adValue >= campaignValue

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-muted)] font-medium">{label}</span>
                <div className="flex items-center gap-3">
                    <span className="text-[var(--color-text-muted)]">Campaign avg: {format(campaignValue)}</span>
                    <span className={['font-bold tabular-nums', better ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                        This ad: {format(adValue)}
                    </span>
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-400 w-16 text-right shrink-0">This ad</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${adPct}%` }} />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--color-text-muted)] w-16 text-right shrink-0">Campaign</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-white/20 transition-all duration-700" style={{ width: `${campPct}%` }} />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdAnalyticsPage() {
    const params = useParams()
    const adId = params.adId as string
    const [activeSeries, setActiveSeries] = useState<Set<SeriesKey>>(new Set<SeriesKey>(['impressions', 'clicks', 'engagementRate'] as SeriesKey[]))
    const [annotations, setAnnotations] = useState<AIAnnotation[]>(AI_ANNOTATIONS)
    const [toast, setToast] = useState<string | null>(null)

    const updateAnnotation = (id: string, status: 'ACCEPTED' | 'DISMISSED') => {
        setAnnotations(prev => prev.map(a => a.id === id ? { ...a, status } : a))
        setToast(status === 'ACCEPTED' ? 'Recommendation accepted' : 'Recommendation dismissed')
        window.setTimeout(() => setToast(null), 2400)
    }

    const toggleSeries = (k: SeriesKey) => {
        setActiveSeries(prev => {
            const next = new Set(prev)
            if (next.has(k)) {
                if (next.size > 1) next.delete(k)
            } else {
                next.add(k)
            }
            return next
        })
    }

    const platformColor = AD_LATEST.platform === 'INSTAGRAM' ? '#c026d3' : AD_LATEST.platform === 'TIKTOK' ? '#0ea5e9' : '#3b82f6'

    return (
        <div className="space-y-7 max-w-7xl mx-auto animate-fade-in">
            {/* ── Header ── */}
            <div className="flex items-start gap-4">
                <Link href="/dashboard/analytics" className="mt-1 flex items-center justify-center h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">{AD_LATEST.campaignName} ·</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide" style={{ background: `${platformColor}22`, color: platformColor }}>
                            {AD_LATEST.platform}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">{AD_LATEST.adName}</h1>
                </div>
                <a href={`/api/analytics/ad/${adId}/export`} className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-violet-500/40 transition-all">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export
                </a>
            </div>

            {/* ── Metric Summary Row ── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { label: 'Impressions', value: fmt(AD_LATEST.impressions), sub: `Campaign avg: ${fmt(CAMPAIGN_AVGS.impressions)}`, better: AD_LATEST.impressions > CAMPAIGN_AVGS.impressions },
                    { label: 'Reach', value: fmt(AD_LATEST.reach), sub: `Campaign avg: ${fmt(CAMPAIGN_AVGS.reach)}`, better: AD_LATEST.reach > CAMPAIGN_AVGS.reach },
                    { label: 'CTR', value: `${AD_LATEST.ctr.toFixed(2)}%`, sub: `Campaign avg: ${CAMPAIGN_AVGS.ctr.toFixed(2)}%`, better: AD_LATEST.ctr > CAMPAIGN_AVGS.ctr },
                    { label: 'Engagement Rate', value: `${AD_LATEST.engagementRate.toFixed(2)}%`, sub: `Campaign avg: ${CAMPAIGN_AVGS.engagementRate.toFixed(2)}%`, better: AD_LATEST.engagementRate > CAMPAIGN_AVGS.engagementRate },
                ].map(m => (
                    <div key={m.label} className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
                        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">{m.label}</p>
                        <p className="text-2xl font-black text-[var(--color-text)] tabular-nums">{m.value}</p>
                        <p className={['text-xs mt-1.5 font-medium', m.better ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                            {m.better ? '↑' : '↓'} {m.sub}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Time-Series Chart ── */}
            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-semibold text-[var(--color-text)]">Performance Over Time</h2>
                    <div className="flex items-center gap-3">
                        {(Object.keys(SERIES_CONFIG) as SeriesKey[]).map(k => {
                            const cfg = SERIES_CONFIG[k]
                            const active = activeSeries.has(k)
                            return (
                                <button
                                    key={k}
                                    id={`series-toggle-${k}`}
                                    onClick={() => toggleSeries(k)}
                                    className={['flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all', active ? 'text-white' : 'text-[var(--color-text-muted)] bg-white/5'].join(' ')}
                                    style={active ? { background: `${cfg.color}33`, color: cfg.color } : {}}
                                >
                                    <span className="h-2 w-2 rounded-full" style={{ background: active ? cfg.color : '#4b5563' }} />
                                    {cfg.label}
                                </button>
                            )
                        })}
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                            AI annotations
                        </span>
                    </div>
                </div>
                <TimeSeriesChart data={TIME_SERIES} activeSeries={activeSeries} annotations={annotations} />
            </div>

            {/* ── Comparison + Heatmap ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Comparison vs campaign avg */}
                <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                    <h2 className="text-sm font-semibold text-[var(--color-text)] mb-5">vs. Campaign Average</h2>
                    <div className="space-y-5">
                        <ComparisonRow label="Impressions" adValue={AD_LATEST.impressions} campaignValue={CAMPAIGN_AVGS.impressions} format={fmt} />
                        <ComparisonRow label="CTR" adValue={AD_LATEST.ctr} campaignValue={CAMPAIGN_AVGS.ctr} format={v => `${v.toFixed(2)}%`} />
                        <ComparisonRow label="Engagement Rate" adValue={AD_LATEST.engagementRate} campaignValue={CAMPAIGN_AVGS.engagementRate} format={v => `${v.toFixed(2)}%`} />
                        <ComparisonRow label="Reach" adValue={AD_LATEST.reach} campaignValue={CAMPAIGN_AVGS.reach} format={fmt} />
                    </div>
                </div>

                {/* Heatmap */}
                <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                    <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">Performance Heatmap</h2>
                    <p className="text-xs text-[var(--color-text-muted)] mb-4">Engagement rate by hour of day & day of week</p>
                    <Heatmap />
                </div>
            </div>

            {/* ── AI Annotations Panel ── */}
            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)]">
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-500/15 text-amber-400 text-sm">🤖</span>
                    <div>
                        <h2 className="text-sm font-semibold text-[var(--color-text)]">AI Recommendations</h2>
                        <p className="text-xs text-[var(--color-text-muted)]">Powered by Agent 8 · Based on your analytics data</p>
                    </div>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                    {annotations.map(ann => {
                        const typeColor = ann.type === 'PAUSE' ? { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' }
                            : ann.type === 'BUDGET' ? { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' }
                                : { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' }

                        return (
                            <div key={ann.id} className={['flex items-start gap-4 px-5 py-4 border-l-2', typeColor.border].join(' ')}>
                                <span className={['flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', typeColor.bg, typeColor.text].join(' ')}>
                                    {ann.type}
                                </span>
                                <div className="flex-1">
                                    <p className="text-sm text-[var(--color-text)] leading-relaxed">{ann.message}</p>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{ann.createdAt}</p>
                                </div>
                                {ann.status === 'PENDING' && (
                                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                                        <button
                                            onClick={() => updateAnnotation(ann.id, 'ACCEPTED')}
                                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => updateAnnotation(ann.id, 'DISMISSED')}
                                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10 transition-colors"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                )}
                                {ann.status !== 'PENDING' && (
                                    <span className={['px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase', ann.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-[var(--color-text-muted)]'].join(' ')}>
                                        {ann.status}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-6 right-6 z-[var(--z-toast)] rounded-xl border border-violet-500/30 bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] shadow-2xl backdrop-blur animate-slide-up">
                    {toast}
                </div>
            )}
        </div>
    )
}
