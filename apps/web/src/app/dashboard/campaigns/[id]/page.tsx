'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { apiGet, apiPost } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────
type Platform = 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK'
type AdStatus = 'Generating' | 'Pending' | 'Approved' | 'Rejected' | 'Scheduled' | 'Published'
type CampaignStatus = 'Draft' | 'Active' | 'Paused' | 'Completed'
type AdFormat = 'Reel' | 'Story' | 'Post' | 'Carousel'

interface Ad {
    id: string; name: string; platform: Platform; format: AdFormat; status: AdStatus
    thumbnail: string; impressions: number; clicks: number; caption: string
    scheduledAt?: string; publishedAt?: string
}

interface Campaign {
    id: string; name: string; status: CampaignStatus; startDate: string; endDate?: string
    budget: number; spent: number; goal: string; platforms: Platform[]; ads: Ad[]
}

// ── Fallback ──────────────────────────────────────────────────────────
const FALLBACK: Campaign = {
    id: 'cmp_1', name: 'Summer Sale 2026', status: 'Active', goal: 'Conversion',
    startDate: '2026-06-01', endDate: '2026-06-30', budget: 5000, spent: 2340,
    platforms: ['INSTAGRAM', 'TIKTOK'],
    ads: [
        { id: 'ad_1', name: 'Summer Vibes #1', platform: 'INSTAGRAM', format: 'Reel', status: 'Published', thumbnail: 'bg-gradient-to-br from-blue-400 to-cyan-500', impressions: 52000, clicks: 1800, caption: '☀️ Make this summer unforgettable! Our biggest sale is live. Shop now and save up to 40% on all summer essentials. #SummerSale #Lifestyle', publishedAt: '2026-06-02' },
        { id: 'ad_2', name: 'Product Close-up', platform: 'INSTAGRAM', format: 'Post', status: 'Scheduled', thumbnail: 'bg-gradient-to-br from-orange-400 to-red-500', impressions: 0, clicks: 0, caption: 'Quality you can feel. ✨ Introducing our premium summer collection.', scheduledAt: '2026-06-05' },
        { id: 'ad_3', name: 'TikTok Dance', platform: 'TIKTOK', format: 'Reel', status: 'Approved', thumbnail: 'bg-gradient-to-br from-violet-500 to-purple-600', impressions: 0, clicks: 0, caption: 'Join the #SummerSaleChallenge! 🕺 Tag us and win!' },
        { id: 'ad_4', name: 'Story Countdown', platform: 'INSTAGRAM', format: 'Story', status: 'Pending', thumbnail: 'bg-gradient-to-br from-pink-400 to-rose-500', impressions: 0, clicks: 0, caption: '3 Days left 🔥 Don\'t miss out on our biggest sale of the year!' },
        { id: 'ad_5', name: 'Behind the Scenes', platform: 'TIKTOK', format: 'Reel', status: 'Generating', thumbnail: 'bg-gradient-to-br from-emerald-400 to-teal-500', impressions: 0, clicks: 0, caption: '' },
        { id: 'ad_6', name: 'Testimonial', platform: 'INSTAGRAM', format: 'Carousel', status: 'Rejected', thumbnail: 'bg-gradient-to-br from-amber-400 to-yellow-500', impressions: 0, clicks: 0, caption: 'What our customers say about their favourite summer picks 💛' },
    ]
}

// ── Helpers ───────────────────────────────────────────────────────────
const fmt = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n)
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const AD_STATUS_CFG: Record<AdStatus, { badge: string; dot: string }> = {
    Generating: { badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20', dot: 'bg-amber-400 animate-pulse' },
    Pending: { badge: 'bg-slate-400/10 text-slate-400 border-slate-400/20', dot: 'bg-slate-400' },
    Approved: { badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20', dot: 'bg-blue-400' },
    Rejected: { badge: 'bg-red-400/10 text-red-400 border-red-400/20', dot: 'bg-red-400' },
    Scheduled: { badge: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20', dot: 'bg-cyan-400' },
    Published: { badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', dot: 'bg-emerald-400 animate-pulse' },
}
const CAMP_STATUS_CFG: Record<CampaignStatus, { badge: string; dot: string }> = {
    Draft: { badge: 'bg-slate-400/10 text-slate-400 border-slate-400/20', dot: 'bg-slate-400' },
    Active: { badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', dot: 'bg-emerald-400 animate-pulse' },
    Paused: { badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20', dot: 'bg-amber-400' },
    Completed: { badge: 'bg-violet-400/10 text-violet-400 border-violet-400/20', dot: 'bg-violet-400' },
}
const P_CFG: Record<Platform, { name: string; bg: string }> = {
    INSTAGRAM: { name: 'Instagram', bg: 'bg-gradient-to-br from-purple-500 to-pink-500' },
    TIKTOK: { name: 'TikTok', bg: 'bg-black' },
    FACEBOOK: { name: 'Facebook', bg: 'bg-blue-600' },
}

// ── Icons ─────────────────────────────────────────────────────────────
function IconBack() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg> }
function IconCheck() { return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> }
function IconX() { return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> }
function IconRefresh() { return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg> }
function IconClock() { return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function IconPlay() { return <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg> }
function IconClose() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> }
function IconChart() { return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> }
function IconAI() { return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg> }

// ── Ad Status Badge ───────────────────────────────────────────────────
function AdBadge({ status }: { status: AdStatus }) {
    const c = AD_STATUS_CFG[status]
    return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{status}</span>
}

// ── Ad Slide-over Panel ───────────────────────────────────────────────
function AdSlideOver({ ad, onClose, onAction }: { ad: Ad; onClose: () => void; onAction: (id: string, action: string) => void }) {
    const [caption, setCaption] = useState(ad.caption)
    const [scheduleDate, setScheduleDate] = useState('')
    const ACTIONS: Array<{ label: string; icon: React.ReactNode; action: string; color: string; show: boolean }> = [
        { label: 'Approve', icon: <IconCheck />, action: 'approve', color: 'bg-blue-600 hover:bg-blue-500 text-white', show: ad.status === 'Pending' },
        { label: 'Reject', icon: <IconX />, action: 'reject', color: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30', show: ad.status === 'Pending' || ad.status === 'Approved' },
        { label: 'Regenerate', icon: <IconRefresh />, action: 'regenerate', color: 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30', show: true },
        { label: 'Schedule', icon: <IconClock />, action: 'schedule', color: 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30', show: ad.status === 'Approved' },
    ]
    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-surface)] z-10">
                    <div>
                        <h2 className="font-semibold text-[var(--color-text)] text-sm">{ad.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[var(--color-text-muted)]">{P_CFG[ad.platform].name} · {ad.format}</span>
                            <AdBadge status={ad.status} />
                        </div>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-all"><IconClose /></button>
                </div>

                <div className="flex-1 p-5 space-y-5">
                    {/* Preview */}
                    <div>
                        <p className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">Preview</p>
                        <div className={`${ad.thumbnail} rounded-xl h-48 flex items-center justify-center text-white/60`}>
                            {ad.format === 'Reel' || ad.format === 'Story' ? <IconPlay /> : <div className="text-3xl">🖼</div>}
                        </div>
                    </div>

                    {/* Caption editor */}
                    <div>
                        <p className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">Caption (AI Copy Editor)</p>
                        <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4}
                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 resize-none transition-all" />
                        <p className="text-[10px] text-[var(--color-text-subtle)] mt-1">{caption.length} chars · Agent 6 CopyEditor</p>
                    </div>

                    {/* Metrics if published */}
                    {ad.status === 'Published' && (
                        <div>
                            <p className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">Performance</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[['Impressions', fmt(ad.impressions)], ['Clicks', fmt(ad.clicks)], ['CTR', `${((ad.clicks / Math.max(ad.impressions, 1)) * 100).toFixed(1)}%`], ['Published', ad.publishedAt ? fmtDate(ad.publishedAt) : '—']].map(([l, v]) => (
                                    <div key={l} className="rounded-lg bg-[var(--color-surface-raised)] p-3">
                                        <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider mb-0.5">{l}</p>
                                        <p className="text-sm font-bold text-[var(--color-text)]">{v}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Scheduling */}
                    {ad.status === 'Approved' && (
                        <div>
                            <p className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">Schedule (Agent 7)</p>
                            <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
                        </div>
                    )}

                    {/* Actions */}
                    <div>
                        <p className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">Actions</p>
                        <div className="flex flex-wrap gap-2">
                            {ACTIONS.filter(a => a.show).map(a => (
                                <button key={a.action} onClick={() => onAction(ad.id, a.action)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${a.color}`}>
                                    {a.icon}{a.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

// ── Ads Tab ───────────────────────────────────────────────────────────
function AdsTab({ ads, onAdClick, selected, onToggleSelect, onBulkAction }: {
    ads: Ad[]
    onAdClick: (ad: Ad) => void
    selected: Set<string>
    onToggleSelect: (id: string) => void
    onBulkAction: (action: string) => void
}) {
    return (
        <div className="space-y-4">
            {/* Bulk bar */}
            {selected.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <span className="text-sm font-semibold text-violet-400">{selected.size} selected</span>
                    <div className="flex-1" />
                    {[
                        { label: 'Approve All', action: 'approve-bulk' },
                        { label: 'Schedule All', action: 'schedule-bulk' },
                        { label: 'Pause All', action: 'pause-bulk' },
                    ].map(a => (
                        <button key={a.action} onClick={() => onBulkAction(a.action)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all">
                            {a.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {ads.map(ad => (
                    <div key={ad.id} className="group relative rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-violet-500/40 transition-all overflow-hidden cursor-pointer" onClick={() => onAdClick(ad)}>
                        {/* Select checkbox */}
                        <div className="absolute top-2 left-2 z-10" onClick={e => { e.stopPropagation(); onToggleSelect(ad.id) }}>
                            <div className={['h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all', selected.has(ad.id) ? 'bg-violet-600 border-violet-600 text-white' : 'border-white/60 bg-black/20 opacity-0 group-hover:opacity-100'].join(' ')}>
                                {selected.has(ad.id) && <IconCheck />}
                            </div>
                        </div>

                        {/* Thumbnail */}
                        <div className={`${ad.thumbnail} h-32 flex items-center justify-center text-white/50`}>
                            {ad.status === 'Generating' ? (
                                <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            ) : (ad.format === 'Reel' || ad.format === 'Story') ? <IconPlay /> : null}
                        </div>

                        {/* Info */}
                        <div className="p-3">
                            <p className="text-xs font-semibold text-[var(--color-text)] truncate mb-1">{ad.name}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-[var(--color-text-subtle)]">{P_CFG[ad.platform].name} · {ad.format}</span>
                            </div>
                            <div className="mt-2"><AdBadge status={ad.status} /></div>
                            {ad.impressions > 0 && (
                                <p className="text-[10px] text-[var(--color-text-subtle)] mt-1">{fmt(ad.impressions)} impr · {fmt(ad.clicks)} clicks</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Analytics Tab ─────────────────────────────────────────────────────
function AnalyticsTab() {
    const bars = [{ label: 'Impressions', v: 82, color: 'bg-violet-500' }, { label: 'Clicks', v: 55, color: 'bg-blue-500' }, { label: 'CTR', v: 38, color: 'bg-emerald-500' }, { label: 'ROAS', v: 71, color: 'bg-amber-500' }]
    const days = ['Jun 1', 'Jun 5', 'Jun 10', 'Jun 15', 'Jun 20', 'Jun 25', 'Jun 30']
    const vals = [12000, 28000, 45000, 38000, 62000, 55000, 48000]
    const max = Math.max(...vals)
    return (
        <div className="space-y-6">
            <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center"><IconChart /></div>
                    <div><p className="font-semibold text-[var(--color-text)]">Campaign Performance</p><p className="text-xs text-[var(--color-text-muted)]">Embedded from Agent 10 Analytics</p></div>
                </div>
                {/* Simulated bar chart */}
                <div className="flex items-end gap-2 h-32 mb-3">
                    {days.map((d, i) => (
                        <div key={d} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full bg-violet-500/20 rounded-sm relative overflow-hidden" style={{ height: `${(vals[i] / max) * 100}%`, minHeight: 4 }}>
                                <div className="absolute inset-0 bg-violet-500 opacity-70" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between">
                    {days.map(d => <span key={d} className="text-[9px] text-[var(--color-text-subtle)]">{d}</span>)}
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {bars.map(b => (
                    <div key={b.label} className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
                        <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">{b.label}</p>
                        <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden mb-2">
                            <div className={`h-full ${b.color} rounded-full`} style={{ width: `${b.v}%` }} />
                        </div>
                        <p className="text-lg font-bold text-[var(--color-text)]">{b.v}%</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── AI Insights Tab ───────────────────────────────────────────────────
function InsightsTab() {
    const recs = [
        { id: 1, title: 'Increase TikTok budget by 20%', desc: 'TikTok ads have 2.3x better CTR vs Instagram in your current campaign. Reallocating budget could boost conversions.', confidence: 92, type: 'Budget', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
        { id: 2, title: 'Pause low-performing Story format', desc: 'Instagram Stories are underperforming with 0.4% CTR vs 1.8% benchmark. Consider pausing and reallocating spend.', confidence: 85, type: 'Optimize', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
        { id: 3, title: 'Post at peak engagement times', desc: 'Your audience is most active 7–9 PM EST. Schedule remaining ads in this window for maximum reach.', confidence: 78, type: 'Schedule', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    ]
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0"><IconAI /></div>
                <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">3 AI Recommendations for this Campaign</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Powered by Agent 8 – updated 5 minutes ago</p>
                </div>
            </div>
            {recs.map(r => (
                <div key={r.id} className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${r.color}`}>{r.type}</span>
                            <span className="text-[10px] text-[var(--color-text-subtle)]">{r.confidence}% confidence</span>
                        </div>
                    </div>
                    <h3 className="font-semibold text-[var(--color-text)] text-sm mb-1">{r.title}</h3>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-4">{r.desc}</p>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all">Apply</button>
                        <button className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] transition-all">Dismiss</button>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────
type Tab = 'ads' | 'analytics' | 'insights'

export default function CampaignDetailPage() {
    const params = useParams()
    const campaignId = params?.id as string
    const [campaign, setCampaign] = useState<Campaign>(FALLBACK)
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<Tab>('ads')
    const [selectedAd, setSelectedAd] = useState<Ad | null>(null)
    const [selected, setSelected] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (campaignId) {
            apiGet(`/campaigns/${campaignId}`).then((data: any) => {
                if (data?.id) setCampaign(data)
            }).catch(() => {
                // API not available – keep fallback
            }).finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [campaignId])

    const cfg = CAMP_STATUS_CFG[campaign.status]
    const pct = campaign.budget > 0 ? Math.min((campaign.spent / campaign.budget) * 100, 100) : 0
    const pctColor = pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'

    const toggleSelect = (id: string) => {
        setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
    }
    const handleAdAction = async (id: string, action: string) => {
        const MAP: Partial<Record<string, AdStatus>> = { approve: 'Approved', reject: 'Rejected', schedule: 'Scheduled', regenerate: 'Generating' }
        // Optimistic update
        if (MAP[action]) {
            setCampaign(c => ({ ...c, ads: c.ads.map(a => a.id === id ? { ...a, status: MAP[action]! } : a) }))
        }
        // Call API (fire and forget with graceful failure)
        try {
            await apiPost(`/ads/${id}/${action}`, {})
        } catch {
            // API not available – optimistic update stands
        }
        if (action === 'regenerate') setSelectedAd(null)
    }
    const handleBulkAction = (_action: string) => { setSelected(new Set()) }

    const handleCampaignAction = async (action: string) => {
        const MAP: Partial<Record<string, CampaignStatus>> = { activate: 'Active', pause: 'Paused', complete: 'Completed' }
        if (MAP[action]) {
            setCampaign(c => ({ ...c, status: MAP[action]! }))
            try {
                await apiPost(`/campaigns/${campaignId}/${action}`, {})
            } catch {
                // API not available – optimistic update stands
            }
        }
    }

    const TABS: Array<{ id: Tab; label: string }> = [
        { id: 'ads', label: `Ads (${campaign.ads.length})` },
        { id: 'analytics', label: 'Analytics' },
        { id: 'insights', label: 'AI Insights' },
    ]

    const canActivate = campaign.ads.some(a => a.status === 'Scheduled' || a.status === 'Published')

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Back */}
            <Link href="/dashboard/campaigns" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <IconBack /> All Campaigns
            </Link>

            {/* Header */}
            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-xl font-bold text-[var(--color-text)]">{campaign.name}</h1>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{campaign.status}
                            </span>
                        </div>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            {fmtDate(campaign.startDate)}{campaign.endDate ? ` → ${fmtDate(campaign.endDate)}` : ' → Ongoing'} · {campaign.goal}
                        </p>
                    </div>
                    {/* Campaign actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {campaign.status !== 'Active' && campaign.status !== 'Completed' && (
                            <button onClick={() => handleCampaignAction('activate')} disabled={!canActivate} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">Activate</button>
                        )}
                        {campaign.status === 'Active' && (
                            <button onClick={() => handleCampaignAction('pause')} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all">Pause</button>
                        )}
                        {campaign.status !== 'Completed' && (
                            <button onClick={() => handleCampaignAction('complete')} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] transition-all">Mark Complete</button>
                        )}
                        <Link href={`/dashboard/campaigns/${campaign.id}/edit`} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] transition-all">Edit</Link>
                    </div>
                </div>

                {/* Budget + metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Spent / Budget', value: `$${campaign.spent.toLocaleString()} / $${campaign.budget.toLocaleString()}` },
                        { label: 'Total Ads', value: String(campaign.ads.length) },
                        { label: 'Impressions', value: fmt(campaign.ads.reduce((a, ad) => a + ad.impressions, 0)) },
                        { label: 'Clicks', value: fmt(campaign.ads.reduce((a, ad) => a + ad.clicks, 0)) },
                    ].map(m => (
                        <div key={m.label}>
                            <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider mb-0.5">{m.label}</p>
                            <p className="text-lg font-bold text-[var(--color-text)]">{m.value}</p>
                        </div>
                    ))}
                </div>

                {/* Budget bar */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--color-text-subtle)]">Budget utilisation</span>
                        <span className="text-xs font-semibold text-[var(--color-text)]">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div className={`h-full ${pctColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[var(--color-border)]">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={['px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px', tab === t.id ? 'border-violet-500 text-violet-400' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'].join(' ')}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'ads' && <AdsTab ads={campaign.ads} onAdClick={setSelectedAd} selected={selected} onToggleSelect={toggleSelect} onBulkAction={handleBulkAction} />}
            {tab === 'analytics' && <AnalyticsTab />}
            {tab === 'insights' && <InsightsTab />}

            {/* Slide-over */}
            {selectedAd && (
                <AdSlideOver ad={selectedAd} onClose={() => setSelectedAd(null)} onAction={(id, action) => { handleAdAction(id, action); if (action !== 'regenerate') setSelectedAd(a => a ? { ...a, status: (action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Scheduled') as AdStatus } : null) }} />
            )}
        </div>
    )
}
