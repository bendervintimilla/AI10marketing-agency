'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet, apiPost } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'

interface Brand {
    id: string
    name: string
    instagramHandle: string | null
    websiteUrl: string | null
    followerCount: number | null
}

interface AuditRun {
    id: string
    brandId: string
    platform: string
    status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    score: number | null
    grade: string | null
    startedAt: string
    completedAt: string | null
}

const PLATFORM_KEYS = [
    { key: 'INSTAGRAM', tKey: 'audits.platforms.instagram', icon: '📸' },
    { key: 'META', tKey: 'audits.platforms.metaAds', icon: '📘' },
    { key: 'GOOGLE', tKey: 'audits.platforms.googleAds', icon: '🔎' },
    { key: 'TIKTOK', tKey: 'audits.platforms.tiktok', icon: '🎵' },
    { key: 'YOUTUBE', tKey: 'audits.platforms.youtube', icon: '▶️' },
    { key: 'LANDING', tKey: 'audits.platforms.landing', icon: '🌐' },
] as const

export default function AuditsPage() {
    const { t, locale } = useTranslation()
    const [brands, setBrands] = useState<Brand[]>([])
    const [runs, setRuns] = useState<Record<string, AuditRun[]>>({})
    const [loading, setLoading] = useState(true)
    const [running, setRunning] = useState<string | null>(null)

    useEffect(() => {
        loadData()
        const interval = setInterval(loadData, 5000)
        return () => clearInterval(interval)
    }, [])

    async function loadData() {
        try {
            const brandList = await apiGet<Brand[]>('/brands')
            setBrands(brandList)
            const runsMap: Record<string, AuditRun[]> = {}
            await Promise.all(
                brandList.map(async (b) => {
                    runsMap[b.id] = await apiGet<AuditRun[]>(`/brands/${b.id}/audits?limit=10`)
                })
            )
            setRuns(runsMap)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function runAudit(brandId: string, platform: string) {
        setRunning(`${brandId}-${platform}`)
        try {
            // Send the user's current UI locale so the worker generates the
            // report (Claude analysis + section headers) in that language.
            await apiPost('/audits', { brandId, platform, locale })
            await loadData()
        } catch (err: any) {
            alert(`Failed to start audit: ${err.message ?? err}`)
        } finally {
            setRunning(null)
        }
    }

    function getLatestRun(brandId: string, platform: string): AuditRun | null {
        const list = runs[brandId] ?? []
        return list.find((r) => r.platform === platform) ?? null
    }

    if (loading) {
        return (
            <div className="p-8 text-[var(--color-text-muted)]">
                <div className="animate-pulse">{t('audits.loadingBrands')}</div>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[var(--color-text)]">{t('audits.title')}</h1>
                <p className="text-[var(--color-text-muted)] mt-1">
                    {t('audits.subtitle')}
                </p>
                <p className="text-xs text-[var(--color-text-subtle)] mt-2">
                    {brands.length === 1
                        ? t('settings.profile.brandCount', { count: brands.length })
                        : t('settings.profile.brandCountPlural', { count: brands.length })}
                </p>
            </div>

            {brands.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
                    <div className="text-5xl mb-3">🏢</div>
                    <div className="text-[var(--color-text)] font-medium mb-1">{t('audits.noBrands')}</div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {brands.map((brand) => (
                        <div
                            key={brand.id}
                            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg hover:border-violet-500/30 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-[var(--color-text)]">{brand.name}</h2>
                                    <div className="text-sm text-[var(--color-text-muted)] mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                                        {brand.instagramHandle && (
                                            <span>📸 {brand.instagramHandle}</span>
                                        )}
                                        {brand.followerCount && (
                                            <span>{brand.followerCount.toLocaleString()} followers</span>
                                        )}
                                        {brand.websiteUrl && (
                                            <a
                                                href={brand.websiteUrl}
                                                target="_blank"
                                                rel="noopener"
                                                className="text-violet-400 hover:text-violet-300 hover:underline"
                                            >
                                                🌐 site
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {PLATFORM_KEYS.map((p) => {
                                    const run = getLatestRun(brand.id, p.key)
                                    const key = `${brand.id}-${p.key}`
                                    const isRunning =
                                        running === key ||
                                        run?.status === 'QUEUED' ||
                                        run?.status === 'RUNNING'
                                    return (
                                        <div
                                            key={p.key}
                                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-medium text-[var(--color-text)]">
                                                    <span className="mr-1.5">{p.icon}</span>
                                                    {t(p.tKey)}
                                                </div>
                                                {run?.score !== null && run?.score !== undefined && (
                                                    <ScoreBadge score={run.score} grade={run.grade} />
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-xs text-[var(--color-text-muted)]">
                                                    {run ? <RunStatus run={run} /> : t('audits.lastRun') + ': —'}
                                                </div>
                                                <div className="flex gap-2">
                                                    {run?.status === 'COMPLETED' && (
                                                        <Link
                                                            href={`/dashboard/audits/${run.id}`}
                                                            className="text-xs text-violet-400 hover:text-violet-300 hover:underline"
                                                        >
                                                            {t('audits.viewReport')} →
                                                        </Link>
                                                    )}
                                                    <button
                                                        disabled={isRunning}
                                                        onClick={() => runAudit(brand.id, p.key)}
                                                        className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {isRunning ? t('audits.running') : t('audits.runAudit')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function ScoreBadge({ score, grade }: { score: number | null; grade: string | null }) {
    if (score === null) return null
    const color =
        score >= 75
            ? 'bg-green-500/20 text-green-300 border-green-500/30'
            : score >= 60
            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
            : score >= 40
            ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
            : 'bg-red-500/20 text-red-300 border-red-500/30'
    return (
        <span className={`rounded border px-2 py-0.5 text-xs font-bold ${color}`}>
            {Math.round(score)} · {grade}
        </span>
    )
}

function RunStatus({ run }: { run: AuditRun }) {
    if (run.status === 'QUEUED')
        return <span className="text-blue-400">Queued…</span>
    if (run.status === 'RUNNING')
        return <span className="text-blue-400 animate-pulse">Running…</span>
    if (run.status === 'FAILED') return <span className="text-red-400">Failed</span>
    if (!run.completedAt) return <span className="text-[var(--color-text-muted)]">—</span>
    const ago = formatTimeAgo(new Date(run.completedAt))
    return <span className="text-[var(--color-text-muted)]">Last run {ago}</span>
}

function formatTimeAgo(d: Date): string {
    const sec = Math.floor((Date.now() - d.getTime()) / 1000)
    if (sec < 60) return 'just now'
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
    return `${Math.floor(sec / 86400)}d ago`
}
