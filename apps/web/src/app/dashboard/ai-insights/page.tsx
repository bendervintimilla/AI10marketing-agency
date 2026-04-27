'use client'

import React, { useState, useEffect, useRef } from 'react'

// ── Types ────────────────────────────────────────────────────────────
interface Recommendation {
    title: string
    description: string
    type: string
    confidence: number
}
interface Alert {
    title: string
    severity: 'info' | 'warning' | 'critical'
}
interface TopPerformer {
    name: string
    platform: string
    metric: string
    value: string
}
interface InsightData {
    summary: string
    healthScore: number
    topPerformers: TopPerformer[]
    recommendations: Recommendation[]
    alerts: Alert[]
}
interface ChatMessage {
    role: 'user' | 'ai'
    text: string
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// ── Icons ────────────────────────────────────────────────────────────
function IconSparkle() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18 9.75l-.45-1.575a2.25 2.25 0 00-1.575-1.575L14.4 6.15l1.575-.45a2.25 2.25 0 001.575-1.575L18 2.55l.45 1.575a2.25 2.25 0 001.575 1.575l1.575.45-1.575.45a2.25 2.25 0 00-1.575 1.575L18 9.75z" />
        </svg>
    )
}
function IconSend() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
    )
}
function IconRefresh() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
    )
}

// ── Health Score Ring ─────────────────────────────────────────────────
function HealthRing({ score, size = 120 }: { score: number; size?: number }) {
    const radius = (size - 12) / 2
    const circumference = 2 * Math.PI * radius
    const filled = (score / 100) * circumference
    const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={8} opacity={0.3} />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
                    strokeDasharray={`${filled} ${circumference - filled}`}
                    style={{ transition: 'stroke-dasharray 1s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[var(--color-text)]">{score}</span>
                <span className="text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">Health</span>
            </div>
        </div>
    )
}

// ── Recommendation Type Badge ────────────────────────────────────────
const TYPE_CFG: Record<string, { bg: string; text: string }> = {
    Budget: { bg: 'bg-emerald-400/10 border-emerald-400/20', text: 'text-emerald-400' },
    Creative: { bg: 'bg-violet-400/10 border-violet-400/20', text: 'text-violet-400' },
    Targeting: { bg: 'bg-blue-400/10 border-blue-400/20', text: 'text-blue-400' },
    Schedule: { bg: 'bg-amber-400/10 border-amber-400/20', text: 'text-amber-400' },
}

const ALERT_CFG: Record<string, { bg: string; dot: string; text: string }> = {
    info: { bg: 'bg-blue-500/5 border-blue-500/20', dot: 'bg-blue-400', text: 'text-blue-400' },
    warning: { bg: 'bg-amber-500/5 border-amber-500/20', dot: 'bg-amber-400', text: 'text-amber-400' },
    critical: { bg: 'bg-red-500/5 border-red-500/20', dot: 'bg-red-400 animate-pulse', text: 'text-red-400' },
}

// ── Skeleton Loader ──────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse bg-[var(--color-border)] rounded-lg ${className}`} />
}

function InsightsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-[120px] w-[120px] rounded-full" />
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                </div>
                <Skeleton className="h-20 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                        <Skeleton className="h-4 w-1/3 mb-3" />
                        <Skeleton className="h-3 w-full mb-2" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Main Page ────────────────────────────────────────────────────────
export default function AIInsightsPage() {
    const [insights, setInsights] = useState<InsightData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Recommendation state — buttons mark items locally so the user gets immediate feedback.
    // We don't have a /ai/recommendations/apply endpoint yet, so apply is local-only.
    const [appliedIdx, setAppliedIdx] = useState<Set<number>>(new Set())
    const [dismissedIdx, setDismissedIdx] = useState<Set<number>>(new Set())
    const [toast, setToast] = useState<string | null>(null)

    // Chat state
    const [chatOpen, setChatOpen] = useState(false)
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { role: 'ai', text: "Hi! I'm your AI marketing assistant. Ask me anything about campaign strategy, ad performance, or optimization tips." },
    ])
    const [chatInput, setChatInput] = useState('')
    const [chatLoading, setChatLoading] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)

    function showToast(msg: string) {
        setToast(msg)
        window.setTimeout(() => setToast(null), 2400)
    }
    function applyRecommendation(i: number) {
        setAppliedIdx(prev => new Set(prev).add(i))
        showToast('Recommendation marked as applied')
    }
    function dismissRecommendation(i: number) {
        setDismissedIdx(prev => new Set(prev).add(i))
        showToast('Recommendation dismissed')
    }

    const fetchInsights = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${API}/ai/insights/overview`)
            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'Failed to fetch insights')
            setInsights(data.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load AI insights')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchInsights() }, [])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatMessages])

    const sendChat = async () => {
        if (!chatInput.trim() || chatLoading) return
        const userMsg = chatInput.trim()
        setChatInput('')
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }])
        setChatLoading(true)
        try {
            const res = await fetch(`${API}/ai/chat/quick`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg }),
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.error)
            setChatMessages(prev => [...prev, { role: 'ai', text: data.data.response }])
        } catch {
            setChatMessages(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't process that. Please try again." }])
        } finally {
            setChatLoading(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white">
                            <IconSparkle />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--color-text)]">AI Insights</h1>
                            <p className="text-sm text-[var(--color-text-muted)]">Powered by Gemini — real-time marketing intelligence</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchInsights}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] transition-all disabled:opacity-50"
                    >
                        <IconRefresh /> Regenerate
                    </button>
                    <button
                        onClick={() => setChatOpen(!chatOpen)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${chatOpen
                            ? 'bg-violet-600 text-white'
                            : 'bg-violet-600/10 text-violet-400 border border-violet-500/20 hover:bg-violet-600/20'
                            }`}
                    >
                        <IconSparkle /> AI Chat
                    </button>
                </div>
            </div>

            <div className="flex gap-6">
                {/* Main content */}
                <div className={`flex-1 min-w-0 space-y-6 transition-all ${chatOpen ? 'max-w-[calc(100%-380px)]' : ''}`}>
                    {loading ? (
                        <InsightsSkeleton />
                    ) : error ? (
                        <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-8 text-center">
                            <p className="text-red-400 font-semibold mb-2">Failed to generate insights</p>
                            <p className="text-sm text-[var(--color-text-muted)] mb-4">{error}</p>
                            <button onClick={fetchInsights} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-all">
                                Retry
                            </button>
                        </div>
                    ) : insights ? (
                        <>
                            {/* Health Score + Summary */}
                            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
                                <div className="flex flex-col sm:flex-row items-start gap-6">
                                    <div className="shrink-0">
                                        <HealthRing score={insights.healthScore} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-3">
                                            <h2 className="text-lg font-bold text-[var(--color-text)]">Overall Performance</h2>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                                AI Generated
                                            </span>
                                        </div>
                                        <div className="text-sm text-[var(--color-text-muted)] leading-relaxed prose-sm"
                                            dangerouslySetInnerHTML={{
                                                __html: insights.summary
                                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--color-text)] font-semibold">$1</strong>')
                                                    .replace(/\n/g, '<br />')
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Alerts */}
                            {insights.alerts.length > 0 && (
                                <div className="space-y-2">
                                    {insights.alerts.map((alert, i) => {
                                        const cfg = ALERT_CFG[alert.severity] || ALERT_CFG.info
                                        return (
                                            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg}`}>
                                                <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                                                <p className={`text-sm font-medium ${cfg.text}`}>{alert.title}</p>
                                                <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${cfg.text} opacity-60`}>
                                                    {alert.severity}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Top Performers */}
                            {insights.topPerformers.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--color-text)] mb-3 uppercase tracking-wider">Top Performers</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {insights.topPerformers.map((perf, i) => (
                                            <div key={i} className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 hover:border-violet-500/30 transition-all">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-[var(--color-text)]">{perf.name}</span>
                                                    <span className="text-[10px] font-semibold text-[var(--color-text-subtle)] px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)]">
                                                        {perf.platform}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider mb-1">{perf.metric}</p>
                                                <p className="text-lg font-bold text-violet-400">{perf.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Recommendations */}
                            <div>
                                <h3 className="text-sm font-bold text-[var(--color-text)] mb-3 uppercase tracking-wider">AI Recommendations</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {insights.recommendations
                                        .map((rec, i) => ({ rec, i }))
                                        .filter(({ i }) => !dismissedIdx.has(i))
                                        .map(({ rec, i }) => {
                                        const cfg = TYPE_CFG[rec.type] || TYPE_CFG.Budget
                                        const isApplied = appliedIdx.has(i)
                                        return (
                                            <div key={i} className={`rounded-xl bg-[var(--color-surface)] border p-5 transition-all ${
                                                isApplied
                                                    ? 'border-emerald-500/40'
                                                    : 'border-[var(--color-border)] hover:border-violet-500/30'
                                            }`}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text}`}>
                                                        {rec.type}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--color-text-subtle)]">{rec.confidence}% confidence</span>
                                                    {isApplied && (
                                                        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                            ✓ Applied
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-semibold text-sm text-[var(--color-text)] mb-1.5">{rec.title}</h4>
                                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-4">{rec.description}</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => applyRecommendation(i)}
                                                        disabled={isApplied}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:bg-emerald-600 disabled:cursor-default"
                                                    >
                                                        {isApplied ? 'Applied' : 'Apply'}
                                                    </button>
                                                    <button
                                                        onClick={() => dismissRecommendation(i)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-all"
                                                    >
                                                        Dismiss
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Chat Panel */}
                {chatOpen && (
                    <div className="w-[360px] shrink-0 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col h-[calc(100vh-180px)] sticky top-20">
                        {/* Chat header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white">
                                <IconSparkle />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-[var(--color-text)]">AI Marketing Assistant</p>
                                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                                </p>
                            </div>
                            <button onClick={() => setChatOpen(false)} className="text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-violet-600 text-white rounded-br-md'
                                        : 'bg-[var(--color-surface-raised)] text-[var(--color-text)] rounded-bl-md border border-[var(--color-border)]'
                                        }`}
                                        dangerouslySetInnerHTML={{
                                            __html: msg.text
                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                .replace(/\n/g, '<br />')
                                        }}
                                    />
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-[var(--color-surface-raised)] px-4 py-3 rounded-2xl rounded-bl-md border border-[var(--color-border)]">
                                        <div className="flex gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-[var(--color-border)]">
                            <div className="flex items-center gap-2 bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)] px-3 py-1.5 focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all">
                                <input
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                                    placeholder="Ask about marketing strategy…"
                                    className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none py-1.5"
                                />
                                <button
                                    onClick={sendChat}
                                    disabled={!chatInput.trim() || chatLoading}
                                    className="h-8 w-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                >
                                    <IconSend />
                                </button>
                            </div>
                            <p className="text-[10px] text-[var(--color-text-subtle)] text-center mt-1.5">Powered by Gemini AI</p>
                        </div>
                    </div>
                )}
            </div>

            {toast && (
                <div className="fixed bottom-6 right-6 z-[var(--z-toast)] rounded-xl border border-violet-500/30 bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] shadow-2xl backdrop-blur animate-slide-up">
                    {toast}
                </div>
            )}
        </div>
    )
}
