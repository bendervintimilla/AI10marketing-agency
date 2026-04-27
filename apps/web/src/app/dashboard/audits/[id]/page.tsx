'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { apiGet } from '@/lib/api'

interface AuditCheck {
    id: string
    checkId: string
    category: string
    status: 'PASS' | 'WARNING' | 'FAIL' | 'NA'
    severity: string
    message: string
    recommendation: string | null
    evidence: any
}

interface AuditRun {
    id: string
    platform: string
    status: string
    score: number | null
    grade: string | null
    summary: any
    completedAt: string | null
    errorMessage: string | null
    brand: { id: string; name: string }
}

export default function AuditDetailPage() {
    const params = useParams()
    const id = params?.id as string

    const [run, setRun] = useState<AuditRun | null>(null)
    const [checks, setChecks] = useState<AuditCheck[]>([])
    const [report, setReport] = useState<string | null>(null)
    const [tab, setTab] = useState<'overview' | 'checks' | 'report'>('overview')

    useEffect(() => {
        if (!id) return
        load()
        const interval = setInterval(load, 4000)
        return () => clearInterval(interval)

        async function load() {
            try {
                const r = await apiGet<AuditRun>(`/audits/${id}`)
                setRun(r)
                if (r.status === 'COMPLETED') {
                    const c = await apiGet<{ checks: AuditCheck[] }>(`/audits/${id}/checks`)
                    setChecks(c.checks)
                    try {
                        const rep = await apiGet<{ markdown: string }>(`/audits/${id}/report`)
                        setReport(rep.markdown)
                    } catch {}
                }
            } catch (err) {
                console.error(err)
            }
        }
    }, [id])

    if (!run) return <div className="p-8 text-[var(--color-text-muted)]">Loading…</div>

    const failed = checks.filter((c) => c.status === 'FAIL')
    const warned = checks.filter((c) => c.status === 'WARNING')
    const passed = checks.filter((c) => c.status === 'PASS')
    const na = checks.filter((c) => c.status === 'NA')

    return (
        <div className="p-2 md:p-4 space-y-6 text-[var(--color-text)]">
            <Link href="/dashboard/audits"
                className="text-sm text-violet-400 hover:text-violet-300 hover:underline">
                ← All audits
            </Link>

            <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold text-[var(--color-text)] truncate">{run.brand.name}</h1>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        {run.platform} audit · {run.status === 'COMPLETED' && run.completedAt
                            ? new Date(run.completedAt).toLocaleString()
                            : run.status}
                    </p>
                </div>
                {run.score !== null && (
                    <ScoreGauge score={run.score} grade={run.grade ?? 'F'} />
                )}
            </div>

            {run.status === 'FAILED' && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                    <strong className="text-red-200">Failed:</strong> {run.errorMessage}
                </div>
            )}

            {(run.status === 'QUEUED' || run.status === 'RUNNING') && (
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-200">
                    <span className="animate-pulse">⏳</span> Audit is {run.status.toLowerCase()}…
                </div>
            )}

            {run.status === 'COMPLETED' && (
                <>
                    <div className="border-b border-[var(--color-border)]">
                        <nav className="flex gap-6">
                            {(['overview', 'checks', 'report'] as const).map((t) => (
                                <button key={t}
                                    onClick={() => setTab(t)}
                                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                                        tab === t
                                            ? 'border-violet-500 text-violet-400'
                                            : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                    }`}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                    {t === 'checks' && (
                                        <span className="ml-2 text-xs bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] px-2 py-0.5 rounded">
                                            {checks.length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {tab === 'overview' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Stat label="Passed" value={passed.length} color="green" />
                                <Stat label="Warnings" value={warned.length} color="yellow" />
                                <Stat label="Failed" value={failed.length} color="red" />
                                <Stat label="N/A" value={na.length} color="gray" />
                            </div>

                            {run.summary?.by_category && (
                                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                                    <h3 className="font-semibold mb-4 text-[var(--color-text)]">Category Scores</h3>
                                    <div className="space-y-3">
                                        {Object.entries(run.summary.by_category).map(([cat, b]: any) => (
                                            <div key={cat}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-[var(--color-text-muted)]">{cat}</span>
                                                    <span className="font-mono text-[var(--color-text)]">{b.score ?? 'N/A'}</span>
                                                </div>
                                                <div className="h-2 bg-[var(--color-surface-raised)] rounded overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-violet-500 to-violet-400"
                                                        style={{ width: `${b.score ?? 0}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {failed.length > 0 && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
                                    <h3 className="font-semibold mb-3 text-red-300">Top Issues to Fix</h3>
                                    <ul className="space-y-3">
                                        {failed.slice(0, 5).map((c) => (
                                            <li key={c.id} className="text-sm">
                                                <strong className="text-[var(--color-text)]">{c.checkId}</strong>
                                                <span className="text-[var(--color-text-muted)]">: {c.message}</span>
                                                {c.recommendation && (
                                                    <div className="text-[var(--color-text-muted)] mt-1">→ {c.recommendation}</div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'checks' && (
                        <div className="space-y-3">
                            {checks.map((c) => (
                                <CheckRow key={c.id} check={c} />
                            ))}
                        </div>
                    )}

                    {tab === 'report' && report && (
                        <pre className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm whitespace-pre-wrap font-sans text-[var(--color-text)] overflow-x-auto">
                            {report}
                        </pre>
                    )}
                </>
            )}
        </div>
    )
}

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
    const color =
        score >= 75 ? '#4ade80' :
        score >= 60 ? '#facc15' :
        score >= 40 ? '#fb923c' : '#f87171'
    return (
        <div className="text-center shrink-0">
            <div className="text-5xl font-bold" style={{ color }}>{Math.round(score)}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">Grade {grade}</div>
        </div>
    )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
        green:  { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
        yellow: { bg: 'bg-amber-500/10',   text: 'text-amber-300',   border: 'border-amber-500/30' },
        red:    { bg: 'bg-red-500/10',     text: 'text-red-300',     border: 'border-red-500/30' },
        gray:   { bg: 'bg-[var(--color-surface-raised)]', text: 'text-[var(--color-text-muted)]', border: 'border-[var(--color-border)]' },
    }
    const c = colors[color]
    return (
        <div className={`rounded-xl border ${c.bg} ${c.border} p-4`}>
            <div className={`text-3xl font-bold ${c.text}`}>{value}</div>
            <div className={`text-sm ${c.text} opacity-80`}>{label}</div>
        </div>
    )
}

function CheckRow({ check }: { check: AuditCheck }) {
    const icon = { PASS: '✅', WARNING: '⚠️', FAIL: '❌', NA: '⊝' }[check.status]
    const styles = {
        PASS:    'bg-emerald-500/5 border-emerald-500/25',
        WARNING: 'bg-amber-500/5 border-amber-500/25',
        FAIL:    'bg-red-500/5 border-red-500/25',
        NA:      'bg-[var(--color-surface)] border-[var(--color-border)]',
    }[check.status]
    return (
        <div className={`rounded-lg border p-4 ${styles}`}>
            <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs text-[var(--color-text-subtle)]">{check.checkId}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                            {check.category}
                        </span>
                        <span className="text-xs text-[var(--color-text-subtle)] uppercase">{check.severity}</span>
                    </div>
                    <div className="text-sm text-[var(--color-text)]">{check.message}</div>
                    {check.recommendation && (
                        <div className="text-xs text-[var(--color-text-muted)] mt-2">→ {check.recommendation}</div>
                    )}
                </div>
            </div>
        </div>
    )
}
