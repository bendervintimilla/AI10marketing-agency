'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/api'

type CampaignStatus = 'Draft' | 'Active' | 'Paused' | 'Completed'
type Platform = 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK'

interface Campaign {
    id: string; name: string; status: CampaignStatus; platforms: Platform[]
    startDate: string; endDate?: string; adsCount: number
    impressions: number; clicks: number; budget: number; spent: number
    goal: 'Awareness' | 'Engagement' | 'Conversion'
}

function fmt(n: number) { return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n) }
function fmtDate(s: string) { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

const STATUS_CFG = {
    Draft: { dot: 'bg-slate-400', badge: 'bg-slate-400/10 text-slate-400 border-slate-400/20' },
    Active: { dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
    Paused: { dot: 'bg-amber-400', badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
    Completed: { dot: 'bg-violet-400', badge: 'bg-violet-400/10 text-violet-400 border-violet-400/20' },
}
const GOAL_COLOR = { Awareness: 'text-blue-400', Engagement: 'text-amber-400', Conversion: 'text-emerald-400' }

function IconPlus() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg> }
function IconSearch() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" /></svg> }
function IconGrid() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg> }
function IconList() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg> }
function IconEye() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }

function IgIcon() { return <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg> }
function TkIcon() { return <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.77 1.52V6.77a4.85 4.85 0 01-1-.08z" /></svg> }
function FbIcon() { return <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg> }

const P_ICONS: Record<Platform, { icon: React.ReactNode; bg: string }> = {
    INSTAGRAM: { icon: <IgIcon />, bg: 'bg-gradient-to-br from-purple-500 to-pink-500' },
    TIKTOK: { icon: <TkIcon />, bg: 'bg-black' },
    FACEBOOK: { icon: <FbIcon />, bg: 'bg-blue-600' },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
    const c = STATUS_CFG[status]
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${c.dot} ${status === 'Active' ? 'animate-pulse' : ''}`} />
            {status}
        </span>
    )
}
function PlatformIcons({ platforms }: { platforms: Platform[] }) {
    return (
        <div className="flex items-center -space-x-1">
            {platforms.map(p => (
                <div key={p} title={p} className={`h-5 w-5 rounded-full flex items-center justify-center text-white ring-1 ring-[var(--color-surface)] ${P_ICONS[p].bg}`}>
                    {P_ICONS[p].icon}
                </div>
            ))}
        </div>
    )
}
function BudgetBar({ spent, total }: { spent: number; total: number }) {
    const pct = total > 0 ? Math.min((spent / total) * 100, 100) : 0
    const col = pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden min-w-[60px]">
                <div className={`h-full rounded-full ${col}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-[var(--color-text-subtle)] tabular-nums whitespace-nowrap">${spent.toLocaleString()}/${total.toLocaleString()}</span>
        </div>
    )
}

function CampaignCard({ c }: { c: Campaign }) {
    return (
        <Link href={`/dashboard/campaigns/${c.id}`} className="group block rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-3">
                    <h3 className="text-sm font-semibold text-[var(--color-text)] truncate group-hover:text-violet-400 transition-colors">{c.name}</h3>
                    <p className={`text-xs font-medium mt-0.5 ${GOAL_COLOR[c.goal]}`}>{c.goal}</p>
                </div>
                <StatusBadge status={c.status} />
            </div>
            <div className="flex items-center gap-2 mb-3">
                <PlatformIcons platforms={c.platforms} />
                <span className="text-xs text-[var(--color-text-subtle)]">{c.adsCount} ads</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
                {fmtDate(c.startDate)}{c.endDate ? ` → ${fmtDate(c.endDate)}` : ' → Ongoing'}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider mb-0.5">Impressions</p>
                    <p className="text-sm font-bold text-[var(--color-text)]">{fmt(c.impressions)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider mb-0.5">Clicks</p>
                    <p className="text-sm font-bold text-[var(--color-text)]">{fmt(c.clicks)}</p>
                </div>
            </div>
            <BudgetBar spent={c.spent} total={c.budget} />
        </Link>
    )
}

function CampaignRow({ c }: { c: Campaign }) {
    return (
        <tr className="group hover:bg-[var(--color-surface-raised)] transition-colors">
            <td className="px-4 py-3.5">
                <div>
                    <Link href={`/dashboard/campaigns/${c.id}`} className="text-sm font-semibold text-[var(--color-text)] hover:text-violet-400 transition-colors">{c.name}</Link>
                    <p className={`text-xs mt-0.5 ${GOAL_COLOR[c.goal]}`}>{c.goal}</p>
                </div>
            </td>
            <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
            <td className="px-4 py-3.5"><PlatformIcons platforms={c.platforms} /></td>
            <td className="px-4 py-3.5 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                {fmtDate(c.startDate)}{c.endDate ? ` – ${fmtDate(c.endDate)}` : ' → Ongoing'}
            </td>
            <td className="px-4 py-3.5 text-sm text-[var(--color-text)] tabular-nums text-center">{c.adsCount}</td>
            <td className="px-4 py-3.5 text-sm text-[var(--color-text)] tabular-nums">{fmt(c.impressions)}</td>
            <td className="px-4 py-3.5 text-sm text-[var(--color-text)] tabular-nums">{fmt(c.clicks)}</td>
            <td className="px-4 py-3.5"><BudgetBar spent={c.spent} total={c.budget} /></td>
            <td className="px-4 py-3.5">
                <Link href={`/dashboard/campaigns/${c.id}`} className="flex items-center justify-center h-7 w-7 rounded-lg text-[var(--color-text-subtle)] hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                    <IconEye />
                </Link>
            </td>
        </tr>
    )
}

const FILTERS: Array<'All' | CampaignStatus> = ['All', 'Active', 'Draft', 'Paused', 'Completed']

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState<'All' | CampaignStatus>('All')
    const [view, setView] = useState<'grid' | 'list'>('grid')
    const [search, setSearch] = useState('')

    useEffect(() => {
        apiGet('/campaigns').then((data: any) => {
            // Endpoint returns { campaigns: [...] } but accept a bare array for safety
            const list = Array.isArray(data) ? data : (data?.campaigns ?? [])
            setCampaigns(list)
        }).catch((err: any) => {
            setError(err?.message ?? 'Failed to load campaigns')
            setCampaigns([])
        }).finally(() => setLoading(false))
    }, [])

    const filtered = campaigns.filter(c => {
        const s = filter === 'All' || c.status === filter
        const q = c.name.toLowerCase().includes(search.toLowerCase())
        return s && q
    })

    const counts: Record<string, number> = { All: campaigns.length }
    FILTERS.slice(1).forEach(f => { counts[f] = campaigns.filter(c => c.status === f).length })

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">Campaigns</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                        {campaigns.filter(c => c.status === 'Active').length} active · {campaigns.length} total
                    </p>
                </div>
                <Link href="/dashboard/campaigns/new" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98] shrink-0">
                    <IconPlus /> New Campaign
                </Link>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-1 flex-wrap">
                    {FILTERS.map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={['flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', filter === f ? 'bg-violet-600 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]'].join(' ')}>
                            {f !== 'All' && <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CFG[f as CampaignStatus].dot}`} />}
                            {f} <span className="opacity-60">{counts[f]}</span>
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 flex-1 sm:justify-end">
                    <div className="relative flex-1 sm:flex-none sm:w-56">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"><IconSearch /></span>
                        <input type="text" placeholder="Search campaigns…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all" />
                    </div>
                    <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-1">
                        {(['grid', 'list'] as const).map(m => (
                            <button key={m} onClick={() => setView(m)} title={m} className={['flex items-center justify-center h-7 w-7 rounded-lg transition-all', view === m ? 'bg-violet-600 text-white' : 'text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-raised)]'].join(' ')}>
                                {m === 'grid' ? <IconGrid /> : <IconList />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                    Failed to load campaigns: {error}
                </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4 text-violet-400"><IconPlus /></div>
                    <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">No campaigns found</h3>
                    <p className="text-sm text-[var(--color-text-muted)] mb-6">{search ? `No results for "${search}"` : `No ${filter.toLowerCase()} campaigns yet`}</p>
                    <Link href="/dashboard/campaigns/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all"><IconPlus /> Create Campaign</Link>
                </div>
            )}

            {/* Grid */}
            {view === 'grid' && filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(c => <CampaignCard key={c.id} c={c} />)}
                    <Link href="/dashboard/campaigns/new" className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-violet-500/50 hover:bg-violet-500/5 transition-all p-8 text-center group min-h-[200px]">
                        <div className="h-10 w-10 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 flex items-center justify-center mb-3 text-violet-400 transition-colors"><IconPlus /></div>
                        <p className="text-sm font-semibold text-[var(--color-text-muted)] group-hover:text-violet-400 transition-colors">New Campaign</p>
                    </Link>
                </div>
            )}

            {/* List */}
            {view === 'list' && filtered.length > 0 && (
                <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]/50">
                                    {['Campaign', 'Status', 'Platforms', 'Date Range', 'Ads', 'Impressions', 'Clicks', 'Budget', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filtered.map(c => <CampaignRow key={c.id} c={c} />)}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
