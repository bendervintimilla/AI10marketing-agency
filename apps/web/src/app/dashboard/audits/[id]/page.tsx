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

    if (!run) return <div className="p-8 text-gray-500">Loading…</div>

    const failed = checks.filter((c) => c.status === 'FAIL')
    const warned = checks.filter((c) => c.status === 'WARNING')
    const passed = checks.filter((c) => c.status === 'PASS')
    const na = checks.filter((c) => c.status === 'NA')

    return (
        <div className="p-8 space-y-6">
            <Link href="/dashboard/audits"
                className="text-sm text-blue-600 hover:underline">
                ← All audits
            </Link>

            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{run.brand.name}</h1>
                    <p className="text-gray-500">
                        {run.platform} audit · {run.status === 'COMPLETED' ? new Date(run.completedAt!).toLocaleString() : run.status}
                    </p>
                </div>
                {run.score !== null && (
                    <ScoreGauge score={run.score} grade={run.grade ?? 'F'} />
                )}
            </div>

            {run.status === 'FAILED' && (
                <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-800">
                    <strong>Failed:</strong> {run.errorMessage}
                </div>
            )}

            {(run.status === 'QUEUED' || run.status === 'RUNNING') && (
                <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-blue-800">
                    <span className="animate-pulse">⏳</span> Audit is {run.status.toLowerCase()}…
                </div>
            )}

            {run.status === 'COMPLETED' && (
                <>
                    <div className="border-b">
                        <nav className="flex gap-6">
                            {(['overview', 'checks', 'report'] as const).map((t) => (
                                <button key={t}
                                    onClick={() => setTab(t)}
                                    className={`pb-3 px-1 text-sm font-medium border-b-2 ${
                                        tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                                    }`}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                    {t === 'checks' && (
                                        <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                                            {checks.length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {tab === 'overview' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                                <Stat label="Passed" value={passed.length} color="green" />
                                <Stat label="Warnings" value={warned.length} color="yellow" />
                                <Stat label="Failed" value={failed.length} color="red" />
                                <Stat label="N/A" value={na.length} color="gray" />
                            </div>

                            {run.summary?.by_category && (
                                <div className="rounded-lg border bg-white p-6">
                                    <h3 className="font-semibold mb-4">Category Scores</h3>
                                    <div className="space-y-3">
                                        {Object.entries(run.summary.by_category).map(([cat, b]: any) => (
                                            <div key={cat}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>{cat}</span>
                                                    <span className="font-mono">{b.score ?? 'N/A'}</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded overflow-hidden">
                                                    <div className="h-full bg-blue-500"
                                                        style={{ width: `${b.score ?? 0}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {failed.length > 0 && (
                                <div className="rounded-lg border bg-red-50 p-6">
                                    <h3 className="font-semibold mb-3">Top Issues to Fix</h3>
                                    <ul className="space-y-2">
                                        {failed.slice(0, 5).map((c) => (
                                            <li key={c.id} className="text-sm">
                                                <strong>{c.checkId}</strong>: {c.message}
                                                {c.recommendation && (
                                                    <div className="text-gray-600 mt-1">→ {c.recommendation}</div>
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
                        <pre className="rounded-lg border bg-white p-6 text-sm whitespace-pre-wrap font-sans">
                            {report}
                        </pre>
                    )}
                </>
            )}
        </div>
    )
}

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
    const color = score >= 75 ? '#16a34a' : score >= 60 ? '#ca8a04' : score >= 40 ? '#ea580c' : '#dc2626'
    return (
        <div className="text-center">
            <div className="text-5xl font-bold" style={{ color }}>{Math.round(score)}</div>
            <div className="text-sm text-gray-500">Grade {grade}</div>
        </div>
    )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
    const colors: Record<string, string> = {
        green: 'text-green-700 bg-green-50',
        yellow: 'text-yellow-700 bg-yellow-50',
        red: 'text-red-700 bg-red-50',
        gray: 'text-gray-700 bg-gray-50',
    }
    return (
        <div className={`rounded-lg p-4 ${colors[color]}`}>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm">{label}</div>
        </div>
    )
}

function CheckRow({ check }: { check: AuditCheck }) {
    const icon = { PASS: '✅', WARNING: '⚠️', FAIL: '❌', NA: '⊝' }[check.status]
    const bg = {
        PASS: 'bg-green-50 border-green-200',
        WARNING: 'bg-yellow-50 border-yellow-200',
        FAIL: 'bg-red-50 border-red-200',
        NA: 'bg-gray-50 border-gray-200',
    }[check.status]
    return (
        <div className={`rounded-md border p-4 ${bg}`}>
            <div className="flex items-start gap-3">
                <span className="text-xl">{icon}</span>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-gray-500">{check.checkId}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-white">{check.category}</span>
                        <span className="text-xs text-gray-500">{check.severity}</span>
                    </div>
                    <div className="text-sm">{check.message}</div>
                    {check.recommendation && (
                        <div className="text-xs text-gray-600 mt-2">→ {check.recommendation}</div>
                    )}
                </div>
            </div>
        </div>
    )
}
