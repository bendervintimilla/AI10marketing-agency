'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { apiGet } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'

/* ─── Icons ─── */
function IconCampaign() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
        </svg>
    )
}
function IconImage() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    )
}
function IconBrain() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
    )
}
function IconPlus() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    )
}
function IconCheck() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    )
}
function IconInstagram() {
    return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
    )
}
function IconTikTok() {
    return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.77 1.52V6.77a4.85 4.85 0 01-1-.08z" />
        </svg>
    )
}

/* ─── Stat Card ─── */
interface StatCardProps {
    label: string
    value: string
    changeLabel: string
    icon: React.ReactNode
    iconColor: string
    secondaryLabel?: string
}

function StatCard({ label, value, changeLabel, icon, iconColor, secondaryLabel }: StatCardProps) {
    return (
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
                <div className={['rounded-lg p-2.5 shrink-0', iconColor].join(' ')}>
                    {icon}
                </div>
                {secondaryLabel && (
                    <span className="text-[10px] font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)]">
                        {secondaryLabel}
                    </span>
                )}
            </div>
            <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                {label}
            </p>
            <p className="text-3xl font-black text-[var(--color-text)] tabular-nums leading-none mb-2">
                {value}
            </p>
            <p className="text-xs text-[var(--color-text-subtle)] font-normal">{changeLabel}</p>
        </div>
    )
}

/* ─── Checklist Item ─── */
function ChecklistItem({
    label,
    done,
    onToggle,
    href,
    startLabel,
}: {
    startLabel: string
    label: string
    done: boolean
    onToggle: () => void
    href: string
}) {
    return (
        <div className="flex items-center gap-3 py-2.5">
            <button
                onClick={onToggle}
                className={[
                    'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200',
                    done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-[var(--color-border)] hover:border-violet-400',
                ].join(' ')}
            >
                {done && <IconCheck />}
            </button>
            <Link
                href={href}
                className={[
                    'text-sm flex-1 transition-colors',
                    done ? 'line-through text-[var(--color-text-subtle)]' : 'text-[var(--color-text)] hover:text-violet-400',
                ].join(' ')}
            >
                {label}
            </Link>
            {!done && (
                <Link href={href} className="text-xs text-violet-400 hover:text-violet-300 shrink-0 font-medium">
                    {startLabel}
                </Link>
            )}
        </div>
    )
}

/* ─── Page ─── */
export default function DashboardPage() {
    const { user } = useAuth()
    const { t } = useTranslation()
    const userName = (user?.email?.split('@')[0] || 'there')
    const hour = new Date().getHours()
    const greeting = hour < 12 ? t('dashboard.greetingMorning')
        : hour < 18 ? t('dashboard.greetingAfternoon')
            : t('dashboard.greetingEvening')

    const [stats, setStats] = useState<{ activeCampaigns: number; adsPublished: number; totalAdsPublished: number; totalReach: number; aiRecs: number; brandCount: number } | null>(null)
    const [brandCount, setBrandCount] = useState<number>(0)
    const [recentAudits, setRecentAudits] = useState<any[]>([])

    useEffect(() => {
        apiGet('/analytics/dashboard-stats').then(data => {
            setStats(data)
        }).catch(() => { /* default zeros */ })

        apiGet<any[]>('/brands').then(brands => {
            setBrandCount(brands.length)
            // For each brand, get its latest audit run
            return Promise.all(
                brands.slice(0, 10).map((b: any) =>
                    apiGet<any[]>(`/brands/${b.id}/audits?limit=2`).then(runs =>
                        runs.map(r => ({ ...r, brandName: b.name }))
                    ).catch(() => [])
                )
            )
        }).then(allRuns => {
            if (!allRuns) return
            const flat = allRuns.flat().sort((a, b) =>
                new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
            ).slice(0, 5)
            setRecentAudits(flat)
        }).catch(() => { /* nothing */ })
    }, [])

    // Real-state checklist — each item is "done" only when we observe the signal
    // in the API. Falls back to false until the relevant fetch resolves so the
    // user never sees a green check for work they haven't actually done.
    const [signals, setSignals] = useState({
        hasSocialAccount: false,
        hasBrandMemory: false,
        hasCampaign: false,
        hasMedia: false,
        hasReviewedAudit: false,
    })

    useEffect(() => {
        if (!user?.orgId) return
        const orgId = user.orgId
        // Fire all checks in parallel; each silently falls back to false on error.
        Promise.all([
            apiGet<any[]>(`/publish/accounts?orgId=${orgId}`).catch(() => []),
            apiGet<any[]>('/brands').catch(() => []),
            apiGet<any[]>('/campaigns').catch(() => []),
            apiGet<{ assets?: any[] }>(`/media?orgId=${orgId}`).catch(() => ({ assets: [] })),
        ]).then(([accounts, brands, campaigns, media]) => {
            const hasMemory = brands.some((b: any) => b.memoryId || b.memory)
            setSignals({
                hasSocialAccount: Array.isArray(accounts) && accounts.length > 0,
                hasBrandMemory: hasMemory,
                hasCampaign: Array.isArray(campaigns) && campaigns.length > 0,
                hasMedia: !!(media as any)?.assets?.length,
                hasReviewedAudit: false,
            })
        }).catch(() => { /* leave defaults */ })
    }, [user?.orgId])

    const checklistItems = [
        { id: 'connect', label: t('dashboard.checklist.connectAccounts'), done: signals.hasSocialAccount, href: '/dashboard/settings/accounts' },
        { id: 'brand', label: t('dashboard.checklist.uploadAssets'), done: signals.hasBrandMemory, href: '/dashboard/claude-design' },
        { id: 'campaign', label: t('dashboard.checklist.createCampaign'), done: signals.hasCampaign, href: '/dashboard/campaigns/new' },
        { id: 'media', label: t('dashboard.checklist.uploadLibrary'), done: signals.hasMedia, href: '/dashboard/media' },
        { id: 'audit', label: t('dashboard.checklist.runAudit'), done: recentAudits.length > 0, href: '/dashboard/audits' },
    ]

    const toggleItem = (_id: string) => {
        // Checklist is now derived from real state — toggling is a no-op.
        // Items resolve automatically once the user completes the underlying action.
    }

    const completedCount = checklistItems.filter((i) => i.done).length
    const progress = (completedCount / checklistItems.length) * 100

    const STATS: StatCardProps[] = [
        {
            label: t('dashboard.stats.brands'),
            value: String(brandCount),
            changeLabel: brandCount === 1 ? t('dashboard.stats.brandsHintSingular') : t('dashboard.stats.brandsHint'),
            icon: <IconCampaign />,
            iconColor: 'bg-violet-500/10 text-violet-400',
        },
        {
            label: t('dashboard.stats.adsPublished'),
            value: stats ? String(stats.adsPublished) : '0',
            changeLabel: t('dashboard.stats.adsPublishedHint'),
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
            ),
            iconColor: 'bg-blue-500/10 text-blue-400',
            secondaryLabel: stats && stats.totalAdsPublished > stats.adsPublished
                ? t('dashboard.stats.adsPublishedAllTime', { count: stats.totalAdsPublished })
                : undefined,
        },
        {
            label: t('dashboard.stats.totalReach'),
            value: stats?.totalReach
                ? stats.totalReach >= 1_000_000
                    ? `${(stats.totalReach / 1e6).toFixed(1)}M`
                    : stats.totalReach >= 1_000
                        ? `${(stats.totalReach / 1e3).toFixed(1)}K`
                        : String(stats.totalReach)
                : '—',
            changeLabel: t('dashboard.stats.totalReachHint'),
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
            ),
            iconColor: 'bg-emerald-500/10 text-emerald-400',
        },
        {
            label: t('dashboard.stats.auditIssues'),
            value: stats ? String(stats.aiRecs) : '0',
            changeLabel: t('dashboard.stats.auditIssuesHint'),
            icon: <IconBrain />,
            iconColor: 'bg-amber-500/10 text-amber-400',
        },
    ]

    function timeAgo(d: string | Date): string {
        const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
        if (sec < 60) return 'just now'
        if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
        if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
        return `${Math.floor(sec / 86400)}d ago`
    }

    const ACTIVITY = recentAudits.length > 0 ? recentAudits.map((r) => {
        const statusBadge = {
            COMPLETED: { label: r.score !== null ? `${t('audits.score')} ${Math.round(r.score)}` : t('common.completed'), color: 'bg-emerald-500/15 text-emerald-400' },
            RUNNING: { label: t('common.running'), color: 'bg-blue-500/15 text-blue-400' },
            QUEUED: { label: t('common.queued'), color: 'bg-blue-500/15 text-blue-400' },
            FAILED: { label: t('common.failed'), color: 'bg-red-500/15 text-red-400' },
        }[r.status as 'COMPLETED' | 'RUNNING' | 'QUEUED' | 'FAILED'] || { label: r.status, color: 'bg-gray-500/15 text-gray-400' }
        return {
            id: r.id,
            type: 'audit',
            icon: r.platform === 'INSTAGRAM' ? <IconInstagram /> : <IconBrain />,
            iconBg: r.platform === 'INSTAGRAM' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-violet-500/15 text-violet-400',
            text: `${r.platform} audit · "${r.brandName}"`,
            meta: timeAgo(r.startedAt),
            badge: statusBadge.label,
            badgeColor: statusBadge.color,
        }
    }) : [
        {
            id: 'empty',
            type: 'empty',
            icon: <IconBrain />,
            iconBg: 'bg-violet-500/15 text-violet-400',
            text: t('dashboard.noAudits'),
            meta: '',
            badge: t('dashboard.getStarted'),
            badgeColor: 'bg-violet-500/15 text-violet-400',
        },
    ]

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
            {/* Page header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">
                        {greeting}, {userName} 👋
                    </h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        {t('dashboard.subtitle')}
                    </p>
                </div>
                <Link
                    href="/dashboard/campaigns/new"
                    className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all duration-150 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
                >
                    <IconPlus />
                    {t('dashboard.newCampaign')}
                </Link>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {STATS.map((s) => (
                    <StatCard key={s.label} {...s} />
                ))}
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Activity feed */}
                <div className="xl:col-span-2">
                    <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                            <h2 className="text-sm font-semibold text-[var(--color-text)]">{t('dashboard.recentActivity')}</h2>
                            <Link href="/dashboard/audits" className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors">
                                {t('common.viewAll')}
                            </Link>
                        </div>
                        <div className="divide-y divide-[var(--color-border)]">
                            {ACTIVITY.map((a) => {
                                const isAudit = a.type === 'audit'
                                const href = isAudit ? `/dashboard/audits/${a.id}` : '/dashboard/audits'
                                const className = 'flex items-start gap-3.5 px-5 py-4 hover:bg-[var(--color-bg-subtle)] transition-colors'
                                const inner = (
                                    <>
                                        <div className={['h-8 w-8 rounded-lg flex items-center justify-center shrink-0', a.iconBg].join(' ')}>
                                            {a.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[var(--color-text)] leading-snug">{a.text}</p>
                                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{a.meta}</p>
                                        </div>
                                        <span className={['shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide', a.badgeColor].join(' ')}>
                                            {a.badge}
                                        </span>
                                    </>
                                )
                                return isAudit ? (
                                    <Link key={a.id} href={href} className={className}>{inner}</Link>
                                ) : (
                                    <div key={a.id} className={className}>{inner}</div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                    {/* Quick actions */}
                    <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">{t('dashboard.quickActions')}</h2>
                        <div className="space-y-2">
                            {[
                                {
                                    href: '/dashboard/campaigns/new',
                                    icon: <IconPlus />,
                                    label: t('dashboard.newCampaign'),
                                    color: 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20',
                                },
                                {
                                    href: '/dashboard/media',
                                    icon: <IconImage />,
                                    label: t('dashboard.uploadMedia'),
                                    color: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
                                },
                                {
                                    href: '/dashboard/audits',
                                    icon: <IconBrain />,
                                    label: t('dashboard.reviewAudits'),
                                    color: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
                                    badge: stats && stats.aiRecs > 0 ? String(stats.aiRecs) : undefined,
                                },
                            ].map((action) => (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    className={[
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                                        action.color,
                                    ].join(' ')}
                                >
                                    <span className="shrink-0">{action.icon}</span>
                                    <span className="flex-1">{action.label}</span>
                                    {action.badge && (
                                        <span className="h-5 min-w-[1.25rem] rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                                            {action.badge}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Getting Started Checklist */}
                    <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-[var(--color-text)]">{t('dashboard.gettingStarted')}</h2>
                            <span className="text-xs text-violet-400 font-semibold">
                                {completedCount}/{checklistItems.length}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 rounded-full bg-[var(--color-border)] mb-4 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <div className="divide-y divide-[var(--color-border)]">
                            {checklistItems.map((item) => (
                                <ChecklistItem
                                    key={item.id}
                                    label={item.label}
                                    done={item.done}
                                    onToggle={() => toggleItem(item.id)}
                                    href={item.href}
                                    startLabel={t('dashboard.checklist.start')}
                                />
                            ))}
                        </div>

                        {completedCount === checklistItems.length && (
                            <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-center">
                                <p className="text-xs font-semibold text-emerald-400">
                                    🎉 All set! You're ready to crush it.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
