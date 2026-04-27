'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ── Types ────────────────────────────────────────────────────────────
type Platform = 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK'
type Goal = 'Awareness' | 'Engagement' | 'Conversion'
type AdFormat = 'Reel' | 'Story' | 'Post' | 'Carousel'

interface FormData {
    name: string; goal: Goal; startDate: string; endDate: string; budget: string
    platforms: Platform[]
    mediaIds: string[]
    formats: Partial<Record<Platform, AdFormat[]>>
}

const PLATFORM_FORMATS: Record<Platform, AdFormat[]> = {
    INSTAGRAM: ['Reel', 'Story', 'Post', 'Carousel'],
    TIKTOK: ['Reel', 'Story'],
    FACEBOOK: ['Post', 'Carousel', 'Story'],
}

const STEPS = [
    { id: 1, label: 'Basics' },
    { id: 2, label: 'Platforms' },
    { id: 3, label: 'Content' },
    { id: 4, label: 'Ad Formats' },
    { id: 5, label: 'Review' },
]

// ── Icons ─────────────────────────────────────────────────────────────
function IconBack() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg> }
function IconCheck() { return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> }
function IconPlay() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg> }
function IgIcon() { return <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg> }
function TkIcon() { return <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.77 1.52V6.77a4.85 4.85 0 01-1-.08z" /></svg> }
function FbIcon() { return <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg> }

// ── Step Indicator ────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
    return (
        <div className="flex items-center justify-center gap-0 mb-8">
            {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center gap-1.5">
                        <div className={['h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300',
                            s.id < current ? 'bg-violet-600 border-violet-600 text-white' :
                                s.id === current ? 'border-violet-500 text-violet-400 bg-violet-500/10' :
                                    'border-[var(--color-border)] text-[var(--color-text-subtle)]'
                        ].join(' ')}>
                            {s.id < current ? <IconCheck /> : s.id}
                        </div>
                        <span className={['text-[10px] font-semibold hidden sm:block transition-colors', s.id === current ? 'text-violet-400' : 'text-[var(--color-text-subtle)]'].join(' ')}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div className={['flex-1 h-0.5 mx-2 transition-all duration-500', s.id < current ? 'bg-violet-600' : 'bg-[var(--color-border)]'].join(' ')} style={{ minWidth: 32 }} />
                    )}
                </React.Fragment>
            ))}
        </div>
    )
}

// mock media items
const MOCK_MEDIA = [
    { id: 'med_1', name: 'Summer Beach.mp4', type: 'video', thumb: 'bg-gradient-to-br from-blue-400 to-cyan-500' },
    { id: 'med_2', name: 'Product Hero.jpg', type: 'image', thumb: 'bg-gradient-to-br from-orange-400 to-red-500' },
    { id: 'med_3', name: 'Brand Reel.mp4', type: 'video', thumb: 'bg-gradient-to-br from-violet-500 to-purple-600' },
    { id: 'med_4', name: 'Lifestyle.jpg', type: 'image', thumb: 'bg-gradient-to-br from-emerald-400 to-teal-500' },
    { id: 'med_5', name: 'Sale Banner.jpg', type: 'image', thumb: 'bg-gradient-to-br from-pink-400 to-rose-500' },
    { id: 'med_6', name: 'Story BG.mp4', type: 'video', thumb: 'bg-gradient-to-br from-amber-400 to-yellow-500' },
]

// ── Step 1: Basics ────────────────────────────────────────────────────
function Step1({ data, set }: { data: FormData; set: (d: Partial<FormData>) => void }) {
    const GOALS: Array<{ id: Goal; desc: string; color: string }> = [
        { id: 'Awareness', desc: 'Reach new audiences & build brand recognition', color: 'text-blue-400 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10' },
        { id: 'Engagement', desc: 'Drive likes, comments, shares & interactions', color: 'text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' },
        { id: 'Conversion', desc: 'Generate leads, sales or app installs', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10' },
    ]
    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Campaign Name *</label>
                <input type="text" placeholder="e.g. Summer Sale 2026" value={data.name} onChange={e => set({ name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all text-sm" />
            </div>
            <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">Campaign Goal *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {GOALS.map(g => (
                        <button key={g.id} onClick={() => set({ goal: g.id })} className={['p-4 rounded-xl border-2 text-left transition-all', data.goal === g.id ? `${g.color} !border-current` : `border-[var(--color-border)] hover:border-[var(--color-border-strong)] ${g.color}`].join(' ')}>
                            <p className="font-semibold text-sm mb-1">{g.id}</p>
                            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{g.desc}</p>
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Start Date *</label>
                    <input type="date" value={data.startDate} onChange={e => set({ startDate: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">End Date</label>
                    <input type="date" value={data.endDate} onChange={e => set({ endDate: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all text-sm" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Total Budget (USD) *</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] font-medium">$</span>
                    <input type="number" placeholder="5000" value={data.budget} onChange={e => set({ budget: e.target.value })} min="0"
                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all text-sm" />
                </div>
            </div>
        </div>
    )
}

// ── Step 2: Platforms ────────────────────────────────────────────────
function Step2({ data, set }: { data: FormData; set: (d: Partial<FormData>) => void }) {
    const PLAT: Array<{ id: Platform; icon: React.ReactNode; name: string; desc: string; bg: string }> = [
        { id: 'INSTAGRAM', icon: <IgIcon />, name: 'Instagram', desc: 'Reels, Stories, Posts & Carousels', bg: 'bg-gradient-to-br from-purple-500 to-pink-500' },
        { id: 'TIKTOK', icon: <TkIcon />, name: 'TikTok', desc: 'Short-form vertical video content', bg: 'bg-black' },
        { id: 'FACEBOOK', icon: <FbIcon />, name: 'Facebook', desc: 'News Feed posts & Stories', bg: 'bg-blue-600' },
    ]
    const toggle = (p: Platform) => {
        const cur = data.platforms
        set({ platforms: cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p] })
    }
    return (
        <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-muted)]">Select the platforms where your ads will be published. You can select multiple.</p>
            {PLAT.map(p => {
                const on = data.platforms.includes(p.id)
                return (
                    <button key={p.id} onClick={() => toggle(p.id)} className={['w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left', on ? 'border-violet-500 bg-violet-500/5' : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'].join(' ')}>
                        <div className={`h-12 w-12 rounded-xl ${p.bg} flex items-center justify-center text-white shrink-0`}>{p.icon}</div>
                        <div className="flex-1">
                            <p className="font-semibold text-[var(--color-text)]">{p.name}</p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{p.desc}</p>
                        </div>
                        <div className={['h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0', on ? 'border-violet-500 bg-violet-500 text-white' : 'border-[var(--color-border)]'].join(' ')}>
                            {on && <IconCheck />}
                        </div>
                    </button>
                )
            })}
        </div>
    )
}

// ── Step 3: Content ───────────────────────────────────────────────────
function Step3({ data, set }: { data: FormData; set: (d: Partial<FormData>) => void }) {
    const [tab, setTab] = useState<'existing' | 'generate'>('existing')
    const [generating, setGenerating] = useState(false)
    const toggle = (id: string) => {
        set({ mediaIds: data.mediaIds.includes(id) ? data.mediaIds.filter(x => x !== id) : [...data.mediaIds, id] })
    }
    const handleGenerate = () => { setGenerating(true); setTimeout(() => setGenerating(false), 2500) }
    return (
        <div className="space-y-4">
            <div className="flex rounded-xl border border-[var(--color-border)] p-1 bg-[var(--color-surface)] w-fit">
                {(['existing', 'generate'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} className={['px-4 py-2 rounded-lg text-sm font-semibold transition-all', tab === t ? 'bg-violet-600 text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]'].join(' ')}>
                        {t === 'existing' ? 'Choose from Library' : 'AI Generate'}
                    </button>
                ))}
            </div>

            {tab === 'existing' && (
                <div>
                    <p className="text-sm text-[var(--color-text-muted)] mb-3">Select media to use in your campaign. Multiple files supported.</p>
                    <div className="grid grid-cols-3 gap-3">
                        {MOCK_MEDIA.map(m => {
                            const sel = data.mediaIds.includes(m.id)
                            return (
                                <button key={m.id} onClick={() => toggle(m.id)} className={['rounded-xl overflow-hidden border-2 transition-all relative group', sel ? 'border-violet-500' : 'border-[var(--color-border)] hover:border-violet-500/40'].join(' ')}>
                                    <div className={`h-20 w-full ${m.thumb} flex items-center justify-center`}>
                                        {m.type === 'video' && <IconPlay />}
                                    </div>
                                    <div className="p-2 bg-[var(--color-surface)]">
                                        <p className="text-[10px] text-[var(--color-text-muted)] truncate">{m.name}</p>
                                    </div>
                                    {sel && <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-violet-600 text-white flex items-center justify-center"><IconCheck /></div>}
                                </button>
                            )
                        })}
                    </div>
                    {data.mediaIds.length > 0 && <p className="text-xs text-violet-400 font-semibold mt-2">{data.mediaIds.length} file(s) selected</p>}
                </div>
            )}

            {tab === 'generate' && (
                <div className="rounded-xl border border-[var(--color-border)] p-6 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4 text-violet-400">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                    </div>
                    <h3 className="font-semibold text-[var(--color-text)] mb-1">AI Content Generation</h3>
                    <p className="text-sm text-[var(--color-text-muted)] mb-4 leading-relaxed">Our AI will generate custom ad creatives tailored to your campaign goal and selected platforms.</p>
                    <button onClick={handleGenerate} disabled={generating} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/20">
                        {generating ? (
                            <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Generating…</>
                        ) : 'Trigger AI Generation →'}
                    </button>
                    {generating && <p className="text-xs text-violet-400 mt-3">This will run after campaign creation via the generation queue.</p>}
                </div>
            )}
        </div>
    )
}

// ── Step 4: Ad Formats ────────────────────────────────────────────────
function Step4({ data, set }: { data: FormData; set: (d: Partial<FormData>) => void }) {
    const P_ICONS: Record<Platform, { icon: React.ReactNode; bg: string; name: string }> = {
        INSTAGRAM: { icon: <IgIcon />, bg: 'bg-gradient-to-br from-purple-500 to-pink-500', name: 'Instagram' },
        TIKTOK: { icon: <TkIcon />, bg: 'bg-black', name: 'TikTok' },
        FACEBOOK: { icon: <FbIcon />, bg: 'bg-blue-600', name: 'Facebook' },
    }
    const toggleFmt = (p: Platform, f: AdFormat) => {
        const cur = data.formats[p] || []
        set({ formats: { ...data.formats, [p]: cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f] } })
    }
    return (
        <div className="space-y-5">
            <p className="text-sm text-[var(--color-text-muted)]">Choose the ad formats for each selected platform.</p>
            {data.platforms.map(p => {
                const pi = P_ICONS[p]
                return (
                    <div key={p} className="rounded-xl border border-[var(--color-border)] p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`h-8 w-8 rounded-lg ${pi.bg} flex items-center justify-center text-white shrink-0`}>{pi.icon}</div>
                            <p className="font-semibold text-[var(--color-text)]">{pi.name}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {PLATFORM_FORMATS[p].map(f => {
                                const on = (data.formats[p] || []).includes(f)
                                return (
                                    <button key={f} onClick={() => toggleFmt(p, f)} className={['px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all', on ? 'bg-violet-600 border-violet-600 text-white' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-violet-500/50 hover:text-violet-400'].join(' ')}>
                                        {f}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ── Step 5: Review ────────────────────────────────────────────────────
function Step5({ data, onLaunch, launching }: { data: FormData; onLaunch: () => void; launching: boolean }) {
    const P_NAMES: Record<Platform, string> = { INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', FACEBOOK: 'Facebook' }
    const totalFormats = Object.values(data.formats).reduce((a, v) => a + (v?.length || 0), 0)

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                {[
                    ['Campaign Name', data.name || '—'],
                    ['Goal', data.goal],
                    ['Date Range', `${data.startDate || '—'} → ${data.endDate || 'Ongoing'}`],
                    ['Budget', data.budget ? `$${Number(data.budget).toLocaleString()}` : '—'],
                    ['Platforms', data.platforms.map(p => P_NAMES[p]).join(', ') || '—'],
                    ['Media Files', data.mediaIds.length ? `${data.mediaIds.length} selected` : 'AI Generate'],
                    ['Ad Formats', `${totalFormats} format${totalFormats !== 1 ? 's' : ''} across ${data.platforms.length} platform${data.platforms.length !== 1 ? 's' : ''}`],
                ].map(([label, value], i) => (
                    <div key={i} className={['flex items-center justify-between px-5 py-3.5', i < 6 ? 'border-b border-[var(--color-border)]' : ''].join(' ')}>
                        <span className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">{label}</span>
                        <span className="text-sm font-medium text-[var(--color-text)] text-right max-w-[60%]">{value}</span>
                    </div>
                ))}
            </div>

            {launching && (
                <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <svg className="h-5 w-5 text-violet-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        <p className="text-sm font-semibold text-violet-400">Generating ads…</p>
                    </div>
                    <div className="space-y-2">
                        {['Creating campaign', 'Queuing AI generation', 'Allocating budget'].map((step, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                                <div className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
                                {step}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button onClick={onLaunch} disabled={launching} className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm transition-all duration-200 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40 hover:scale-[1.01] disabled:opacity-60 disabled:scale-100">
                {launching ? (
                    <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Launching…</>
                ) : '🚀 Generate Ads & Launch Campaign'}
            </button>
        </div>
    )
}

// ── Main Wizard ───────────────────────────────────────────────────────
const DEFAULT: FormData = { name: '', goal: 'Awareness', startDate: '', endDate: '', budget: '', platforms: [], mediaIds: [], formats: {} }

export default function NewCampaignPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [form, setForm] = useState<FormData>(DEFAULT)
    const [launching, setLaunching] = useState(false)

    const patch = (d: Partial<FormData>) => setForm(f => ({ ...f, ...d }))

    const canNext = () => {
        if (step === 1) return !!form.name && !!form.startDate && !!form.budget
        if (step === 2) return form.platforms.length > 0
        if (step === 3) return true
        if (step === 4) return form.platforms.every(p => (form.formats[p]?.length || 0) > 0)
        return true
    }

    const handleLaunch = async () => {
        setLaunching(true)
        try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
            await fetch(`${API}/generate/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignName: form.name,
                    goal: form.goal,
                    startDate: form.startDate,
                    endDate: form.endDate,
                    budget: Number(form.budget),
                    platforms: form.platforms,
                    mediaIds: form.mediaIds,
                    formats: form.formats,
                }),
            })
            router.push('/dashboard/campaigns')
        } catch (err) {
            console.error('Failed to launch campaign:', err)
            setLaunching(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Back link */}
            <Link href="/dashboard/campaigns" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors mb-6">
                <IconBack /> Back to Campaigns
            </Link>

            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 sm:p-8">
                {/* Title */}
                <div className="text-center mb-8">
                    <h1 className="text-xl font-bold text-[var(--color-text)]">Create New Campaign</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Follow the steps to set up and launch your campaign</p>
                </div>

                <StepBar current={step} />

                {/* Step content */}
                <div className="min-h-[300px]">
                    {step === 1 && <Step1 data={form} set={patch} />}
                    {step === 2 && <Step2 data={form} set={patch} />}
                    {step === 3 && <Step3 data={form} set={patch} />}
                    {step === 4 && <Step4 data={form} set={patch} />}
                    {step === 5 && <Step5 data={form} onLaunch={handleLaunch} launching={launching} />}
                </div>

                {/* Nav buttons */}
                {step < 5 && (
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-border)]">
                        <button onClick={() => setStep(s => s - 1)} disabled={step === 1} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            <IconBack /> Back
                        </button>
                        <div className="flex items-center gap-1">
                            {STEPS.map(s => (
                                <div key={s.id} className={['h-1.5 rounded-full transition-all duration-300', s.id === step ? 'w-6 bg-violet-500' : s.id < step ? 'w-3 bg-violet-600' : 'w-3 bg-[var(--color-border)]'].join(' ')} />
                            ))}
                        </div>
                        <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]">
                            {step === 4 ? 'Review' : 'Continue'} →
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
