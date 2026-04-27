'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet, apiPost } from '@/lib/api'

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

const platforms = [
    { key: 'INSTAGRAM', label: 'Instagram', icon: '📸' },
    { key: 'LANDING', label: 'Landing', icon: '🌐' },
] as const

export default function AuditsPage() {
    const [brands, setBrands] = useState<Brand[]>([])
    const [runs, setRuns] = useState<Record<string, AuditRun[]>>({})
    const [loading, setLoading] = useState(true)
    const [running, setRunning] = useState<string | null>(null) // brandId+platform key

    useEffect(() => {
        loadData()
        const interval = setInterval(loadData, 5000) // poll for live status
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
            await apiPost('/audits', { brandId, platform })
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
        return <div className="p-8 text-gray-500">Loading audits…</div>
    }

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Brand Audits</h1>
                <p className="text-gray-500 mt-1">
                    Run structural audits on your Instagram accounts and landing pages.
                </p>
            </div>

            {brands.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
                    No brands yet. <Link className="text-blue-600" href="/dashboard/settings">
                        Add a brand →
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {brands.map((brand) => (
                        <div key={brand.id} className="rounded-lg border bg-white p-6 shadow-sm">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold">{brand.name}</h2>
                                    <div className="text-sm text-gray-500 mt-1 flex gap-4">
                                        {brand.instagramHandle && (
                                            <span>📸 {brand.instagramHandle}</span>
                                        )}
                                        {brand.followerCount && (
                                            <span>{brand.followerCount.toLocaleString()} followers</span>
                                        )}
                                        {brand.websiteUrl && (
                                            <a href={brand.websiteUrl} target="_blank"
                                                className="text-blue-600 hover:underline">
                                                🌐 site
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {platforms.map((p) => {
                                    const run = getLatestRun(brand.id, p.key)
                                    const key = `${brand.id}-${p.key}`
                                    const isRunning = running === key ||
                                        run?.status === 'QUEUED' || run?.status === 'RUNNING'
                                    return (
                                        <div key={p.key} className="rounded-md border bg-gray-50 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-medium">
                                                    {p.icon} {p.label}
                                                </div>
                                                {run?.score !== null && run?.score !== undefined && (
                                                    <ScoreBadge score={run.score} grade={run.grade} />
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-xs text-gray-500">
                                                    {run ? <RunStatus run={run} /> : 'Never run'}
                                                </div>
                                                <div className="flex gap-2">
                                                    {run?.status === 'COMPLETED' && (
                                                        <Link href={`/dashboard/audits/${run.id}`}
                                                            className="text-xs text-blue-600 hover:underline">
                                                            View →
                                                        </Link>
                                                    )}
                                                    <button
                                                        disabled={isRunning}
                                                        onClick={() => runAudit(brand.id, p.key)}
                                                        className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50">
                                                        {isRunning ? 'Running…' : 'Run audit'}
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
    const color = score >= 75 ? 'bg-green-100 text-green-800'
        : score >= 60 ? 'bg-yellow-100 text-yellow-800'
        : score >= 40 ? 'bg-orange-100 text-orange-800'
        : 'bg-red-100 text-red-800'
    return (
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${color}`}>
            {Math.round(score)} · {grade}
        </span>
    )
}

function RunStatus({ run }: { run: AuditRun }) {
    if (run.status === 'QUEUED') return <span className="text-blue-500">Queued…</span>
    if (run.status === 'RUNNING') return <span className="text-blue-500 animate-pulse">Running…</span>
    if (run.status === 'FAILED') return <span className="text-red-600">Failed</span>
    if (!run.completedAt) return <span>—</span>
    const ago = formatTimeAgo(new Date(run.completedAt))
    return <span>Last run {ago}</span>
}

function formatTimeAgo(d: Date): string {
    const sec = Math.floor((Date.now() - d.getTime()) / 1000)
    if (sec < 60) return 'just now'
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
    return `${Math.floor(sec / 86400)}d ago`
}
