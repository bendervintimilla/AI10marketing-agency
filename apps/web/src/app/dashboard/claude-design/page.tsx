'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch, apiGet, apiPost } from '@/lib/api'

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface Brand {
    id: string
    name: string
    instagramHandle?: string | null
    followerCount?: number | null
}

interface BrandMemoryRow {
    id: string
    visualIdentity?: any
    voiceProfile?: any
    productCatalog?: any
    audiencePersonas?: any
    competitorRefs?: any
    legalConstraints?: any
    designSystem?: any
    notes?: string | null
}

interface BrandAsset {
    id: string
    type: string
    url: string
    mimeType: string
    width?: number | null
    height?: number | null
    caption?: string | null
    tags?: string[]
    source?: string | null
    createdAt: string
}

const ASSET_TYPES = [
    { value: 'LOGO', label: 'Logo' },
    { value: 'LOGO_VARIANT', label: 'Logo variant' },
    { value: 'PRODUCT_PHOTO', label: 'Product photo' },
    { value: 'LIFESTYLE_PHOTO', label: 'Lifestyle photo' },
    { value: 'BROLL_VIDEO', label: 'B-roll video' },
    { value: 'MOODBOARD', label: 'Moodboard' },
    { value: 'BRAND_GUIDELINES', label: 'Brand guidelines doc' },
    { value: 'BRIEF_DOC', label: 'Brief / doc' },
    { value: 'REFERENCE_AD', label: 'Reference ad' },
    { value: 'COLOR_SWATCH', label: 'Color swatch' },
] as const

type ToolName =
    | 'load_brand_memory'
    | 'update_brand_memory'
    | 'list_brand_assets'
    | 'generate_brief'
    | 'generate_image_prompt'
    | 'critique_image'
    | 'write_caption'

interface ToolEvent {
    name: ToolName
    input: any
    output: any
}

interface ChatTurn {
    role: 'user' | 'assistant'
    text: string
    toolEvents?: ToolEvent[]
    pending?: boolean
}

interface ChatResponse {
    reply: string
    toolEvents: ToolEvent[]
    stopReason: string
}

const STARTERS = [
    'Brief a Reel for Negroni Quito promoting weekend cocktails',
    'My brand voice is warm, witty, never salesy. Save that.',
    'Critique this Story I generated [paste image URL]',
    'Write a feed post caption for our new lunch menu launch',
]

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function ClaudeDesignPage() {
    const [brands, setBrands] = useState<Brand[]>([])
    const [brandId, setBrandId] = useState<string>('')
    const [memory, setMemory] = useState<BrandMemoryRow | null>(null)
    const [assets, setAssets] = useState<BrandAsset[]>([])
    const [projectOpen, setProjectOpen] = useState(false)
    const [thread, setThread] = useState<ChatTurn[]>([])
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    /* Load brands */
    useEffect(() => {
        apiGet<Brand[]>('/brands')
            .then((res) => {
                setBrands(res)
                if (res.length > 0) setBrandId(res[0].id)
            })
            .catch((err) => setError(err.message || 'Failed to load brands'))
    }, [])

    /* Load brand memory + assets whenever brand changes; reset thread */
    useEffect(() => {
        if (!brandId) return
        setThread([])
        setMemory(null)
        setAssets([])
        apiGet<BrandMemoryRow>(`/brands/${brandId}/memory`)
            .then((res) => setMemory(res))
            .catch(() => setMemory(null))
        apiGet<BrandAsset[]>(`/brands/${brandId}/memory/assets`)
            .then((res) => setAssets(Array.isArray(res) ? res : []))
            .catch(() => setAssets([]))
    }, [brandId])

    async function refreshAssets() {
        if (!brandId) return
        const res = await apiGet<BrandAsset[]>(`/brands/${brandId}/memory/assets`).catch(
            () => []
        )
        setAssets(Array.isArray(res) ? res : [])
    }

    async function refreshMemory() {
        if (!brandId) return
        const res = await apiGet<BrandMemoryRow>(`/brands/${brandId}/memory`).catch(
            () => null
        )
        if (res) setMemory(res)
    }

    async function addResource(args: {
        type: string
        url: string
        caption?: string
        tags?: string[]
    }) {
        if (!brandId) return
        const mimeType = guessMimeType(args.url)
        await apiPost(`/brands/${brandId}/memory/assets`, {
            type: args.type,
            url: args.url,
            mimeType,
            caption: args.caption,
            tags: args.tags ?? [],
            source: 'manual_url',
        })
        await refreshAssets()
    }

    async function deleteResource(id: string) {
        if (!brandId) return
        await apiFetch(`/brands/${brandId}/memory/assets/${id}`, { method: 'DELETE' })
        setAssets((prev) => prev.filter((a) => a.id !== id))
    }

    async function saveNotes(notes: string) {
        if (!brandId) return
        await apiFetch(`/brands/${brandId}/memory`, {
            method: 'PUT',
            body: JSON.stringify({ notes }),
        })
        await refreshMemory()
    }

    /* Auto-scroll on new messages */
    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
        })
    }, [thread])

    const selectedBrand = useMemo(
        () => brands.find((b) => b.id === brandId) || null,
        [brands, brandId]
    )

    async function send(text: string) {
        if (!brandId || !text.trim() || sending) return
        setError(null)
        const userTurn: ChatTurn = { role: 'user', text }
        const placeholder: ChatTurn = { role: 'assistant', text: '', pending: true }
        const next = [...thread, userTurn, placeholder]
        setThread(next)
        setInput('')
        setSending(true)

        const messagesForApi = next
            .filter((t) => !t.pending && t.text.trim())
            .map((t) => ({ role: t.role, content: t.text }))

        try {
            const res = await apiPost<ChatResponse>(
                `/brands/${brandId}/claude-design/chat`,
                { messages: messagesForApi }
            )
            setThread((prev) => {
                const copy = [...prev]
                const idx = copy.findLastIndex((t) => t.pending)
                if (idx !== -1) {
                    copy[idx] = {
                        role: 'assistant',
                        text: res.reply || '',
                        toolEvents: res.toolEvents,
                    }
                }
                return copy
            })

            // If memory was updated by Claude, refresh
            if (res.toolEvents.some((e) => e.name === 'update_brand_memory')) {
                apiGet<BrandMemoryRow>(`/brands/${brandId}/memory`)
                    .then((m) => setMemory(m))
                    .catch(() => {})
            }
        } catch (err: any) {
            setError(err.message || 'Chat failed')
            setThread((prev) => prev.filter((t) => !t.pending))
        } finally {
            setSending(false)
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        send(input)
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send(input)
        }
    }

    return (
        <div className="cd-root">
            <div className="cd-shell">
                {/* Main chat column */}
                <div className="cd-main">
                    <Header
                        brands={brands}
                        brandId={brandId}
                        onChangeBrand={setBrandId}
                        selectedBrand={selectedBrand}
                        onToggleProject={() => setProjectOpen((v) => !v)}
                        projectOpen={projectOpen}
                        assetCount={assets.length}
                    />

                    <div className="cd-thread" ref={scrollRef}>
                        {thread.length === 0 && (
                            <EmptyState
                                brandName={selectedBrand?.name}
                                onPick={(t) => send(t)}
                            />
                        )}
                        {thread.map((turn, i) => (
                            <Turn key={i} turn={turn} />
                        ))}
                        {error && (
                            <div className="cd-error">
                                <span className="cd-error-dot" /> {error}
                            </div>
                        )}
                    </div>

                    <Composer
                        value={input}
                        onChange={setInput}
                        onSubmit={handleSubmit}
                        onKeyDown={handleKeyDown}
                        sending={sending}
                        disabled={!brandId}
                        brandName={selectedBrand?.name}
                    />
                </div>

                {/* Project panel (memory + resources + notes) */}
                {projectOpen && (
                    <ProjectPanel
                        memory={memory}
                        assets={assets}
                        brandName={selectedBrand?.name}
                        onClose={() => setProjectOpen(false)}
                        onAddResource={addResource}
                        onDeleteResource={deleteResource}
                        onSaveNotes={saveNotes}
                    />
                )}
            </div>

        </div>
    )
}

/* ─── Header ────────────────────────────────────────────────────────────── */

function Header({
    brands,
    brandId,
    onChangeBrand,
    selectedBrand,
    onToggleProject,
    projectOpen,
    assetCount,
}: {
    brands: Brand[]
    brandId: string
    onChangeBrand: (id: string) => void
    selectedBrand: Brand | null
    onToggleProject: () => void
    projectOpen: boolean
    assetCount: number
}) {
    return (
        <header className="cd-header">
            <div className="cd-header-left">
                <div className="cd-mark">
                    <SparkleIcon />
                </div>
                <div>
                    <div className="cd-brand-eyebrow">Claude Design</div>
                    <div className="cd-brand-line">
                        <select
                            className="cd-brand-select"
                            value={brandId}
                            onChange={(e) => onChangeBrand(e.target.value)}
                        >
                            {brands.length === 0 && <option>Loading…</option>}
                            {brands.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                        {selectedBrand?.instagramHandle && (
                            <span className="cd-brand-meta">
                                {selectedBrand.instagramHandle}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <button
                type="button"
                onClick={onToggleProject}
                className={`cd-memory-toggle ${projectOpen ? 'is-active' : ''}`}
            >
                <BrainIcon />
                Project
                {assetCount > 0 && <span className="cd-count">{assetCount}</span>}
            </button>
        </header>
    )
}

/* ─── Empty state ───────────────────────────────────────────────────────── */

function EmptyState({
    brandName,
    onPick,
}: {
    brandName?: string
    onPick: (t: string) => void
}) {
    return (
        <div className="cd-empty">
            <div className="cd-empty-mark">
                <SparkleIcon />
            </div>
            <h1 className="cd-empty-title">
                Hi, I&apos;m Claude Design.
            </h1>
            <p className="cd-empty-lede">
                A creative director that learns {brandName || 'your brand'} over time and
                ships briefs, prompts, critiques, and copy on demand.
            </p>
            <div className="cd-empty-starters">
                {STARTERS.map((s) => (
                    <button
                        key={s}
                        type="button"
                        className="cd-starter"
                        onClick={() => onPick(s)}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    )
}

/* ─── Turn ──────────────────────────────────────────────────────────────── */

function Turn({ turn }: { turn: ChatTurn }) {
    if (turn.role === 'user') {
        return (
            <div className="cd-turn cd-turn-user">
                <div className="cd-bubble">{turn.text}</div>
            </div>
        )
    }

    return (
        <div className="cd-turn cd-turn-assistant">
            <div className="cd-avatar">
                <SparkleIcon small />
            </div>
            <div className="cd-turn-body">
                {turn.pending && (
                    <div className="cd-thinking">
                        <span className="cd-dot" />
                        <span className="cd-dot" />
                        <span className="cd-dot" />
                    </div>
                )}

                {turn.toolEvents?.map((evt, i) => (
                    <ToolArtifact key={i} event={evt} />
                ))}

                {turn.text && <div className="cd-bubble cd-bubble-assistant">{turn.text}</div>}
            </div>
        </div>
    )
}

/* ─── Tool artifacts (inline cards per tool output) ─────────────────────── */

function ToolArtifact({ event }: { event: ToolEvent }) {
    const { name, input, output } = event

    if (output?.error) {
        return (
            <div className="cd-tool cd-tool-err">
                <div className="cd-tool-head">
                    <ToolIcon name={name} /> {labelForTool(name)} failed
                </div>
                <div className="cd-tool-body">{String(output.error)}</div>
            </div>
        )
    }

    switch (name) {
        case 'load_brand_memory':
            return (
                <div className="cd-tool">
                    <div className="cd-tool-head">
                        <ToolIcon name={name} /> Loaded brand memory
                        <span className="cd-tool-sub">
                            {output?.brandName || ''}
                        </span>
                    </div>
                    <div className="cd-tool-body">
                        <MemoryFlags memory={output} />
                    </div>
                </div>
            )

        case 'update_brand_memory':
            return (
                <div className="cd-tool cd-tool-mem">
                    <div className="cd-tool-head">
                        <ToolIcon name={name} /> Memory updated
                    </div>
                    <div className="cd-tool-body">
                        <div className="cd-tool-fields">
                            {(output?.fieldsUpdated || []).map((f: string) => (
                                <span key={f} className="cd-token">{f}</span>
                            ))}
                        </div>
                        <details className="cd-details">
                            <summary>What was saved</summary>
                            <pre className="cd-pre">
                                {JSON.stringify(input, null, 2)}
                            </pre>
                        </details>
                    </div>
                </div>
            )

        case 'list_brand_assets':
            return (
                <div className="cd-tool">
                    <div className="cd-tool-head">
                        <ToolIcon name={name} /> Brand assets ({output?.length || 0})
                    </div>
                    <div className="cd-tool-body">
                        <div className="cd-asset-grid">
                            {(output || []).slice(0, 8).map((a: any) => (
                                <a
                                    key={a.id}
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="cd-asset"
                                >
                                    <span className="cd-asset-type">{a.type}</span>
                                    {a.caption && (
                                        <span className="cd-asset-cap">{a.caption}</span>
                                    )}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )

        case 'generate_brief':
            return (
                <div className="cd-tool cd-tool-brief">
                    <div className="cd-tool-head">
                        <ToolIcon name={name} /> Creative brief
                        <span className="cd-tool-sub">
                            {input.platform?.toLowerCase()} · {input.format?.toLowerCase()}
                        </span>
                    </div>
                    <div className="cd-tool-body">
                        <BriefField label="Concept" value={output.concept} large />
                        <div className="cd-tool-grid">
                            <BriefField label="Mood" value={output.mood} />
                            <BriefField label="Key message" value={output.keyMessage} />
                            <BriefField label="Visual direction" value={output.visualDirection} />
                            <BriefField label="Call to action" value={output.callToAction} />
                            <BriefField label="Persona" value={output.targetPersona} />
                            {output.risks?.length > 0 && (
                                <BriefField
                                    label="Risks"
                                    value={output.risks.map((r: string) => `• ${r}`).join('\n')}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )

        case 'generate_image_prompt':
            return (
                <div className="cd-tool">
                    <div className="cd-tool-head">
                        <ToolIcon name={name} /> Image prompt
                        <span className="cd-tool-sub">
                            {input.renderer} · {input.aspectRatio}
                        </span>
                    </div>
                    <div className="cd-tool-body">
                        <CopyBlock label="Prompt" text={output.prompt} />
                        {output.negativePrompt && (
                            <CopyBlock
                                label="Negative prompt"
                                text={output.negativePrompt}
                                subtle
                            />
                        )}
                        {output.styleTokens?.length > 0 && (
                            <div className="cd-tokens">
                                {output.styleTokens.map((t: string) => (
                                    <span key={t} className="cd-token">{t}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )

        case 'critique_image':
            return (
                <div className="cd-tool">
                    <div className="cd-tool-head">
                        <ToolIcon name={name} /> Critique
                        <span className={`cd-pill ${output.approved ? 'pos' : 'neg'}`}>
                            {output.approved ? 'Approved' : 'Needs revisions'}
                        </span>
                    </div>
                    <div className="cd-tool-body">
                        <div className="cd-critique-row">
                            <div className={`cd-score ${output.approved ? 'pos' : 'neg'}`}>
                                <div className="cd-score-num">{output.score}</div>
                                <div className="cd-score-label">on-brand</div>
                            </div>
                            <div className="cd-critique-findings">
                                {output.onBrandFindings?.length > 0 && (
                                    <FindingList
                                        title="What's working"
                                        items={output.onBrandFindings}
                                        tone="pos"
                                    />
                                )}
                                {output.offBrandFindings?.length > 0 && (
                                    <FindingList
                                        title="Off-brand"
                                        items={output.offBrandFindings}
                                        tone="neg"
                                    />
                                )}
                                {output.regenerationInstructions && (
                                    <FindingList
                                        title="Regenerate with"
                                        items={[output.regenerationInstructions]}
                                        tone="neutral"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )

        case 'write_caption':
            return (
                <div className="cd-tool">
                    <div className="cd-tool-head">
                        <ToolIcon name={name} /> Caption
                        <span className="cd-tool-sub">{input.platform?.toLowerCase()}</span>
                    </div>
                    <div className="cd-tool-body">
                        <CopyBlock label="Primary copy" text={output.primary} large />
                        {output.hashtags?.length > 0 && (
                            <CopyBlock
                                label="Hashtags"
                                text={output.hashtags.join(' ')}
                            />
                        )}
                        {output.altText && (
                            <CopyBlock label="Alt text" text={output.altText} subtle />
                        )}
                    </div>
                </div>
            )

        default:
            return null
    }
}

function labelForTool(name: ToolName): string {
    return (
        {
            load_brand_memory: 'Load brand memory',
            update_brand_memory: 'Update memory',
            list_brand_assets: 'List assets',
            generate_brief: 'Brief',
            generate_image_prompt: 'Image prompt',
            critique_image: 'Critique',
            write_caption: 'Caption',
        } as Record<ToolName, string>
    )[name]
}

function ToolIcon({ name }: { name: ToolName }) {
    const map: Record<ToolName, string> = {
        load_brand_memory: '◐',
        update_brand_memory: '✎',
        list_brand_assets: '▦',
        generate_brief: '✦',
        generate_image_prompt: '✺',
        critique_image: '◉',
        write_caption: '✍',
    }
    return <span className="cd-tool-icon">{map[name] || '·'}</span>
}

/* ─── Building blocks ──────────────────────────────────────────────────── */

function BriefField({
    label,
    value,
    large,
}: {
    label: string
    value: any
    large?: boolean
}) {
    return (
        <div className={`cd-bf ${large ? 'is-large' : ''}`}>
            <div className="cd-bf-label">{label}</div>
            <div className="cd-bf-value">{renderValue(value)}</div>
        </div>
    )
}

/** Tolerant renderer: strings render as text, arrays as bullets,
 *  objects as labeled rows. Prevents React error #31 when Claude
 *  returns richer-than-expected JSON. */
function renderValue(v: any): React.ReactNode {
    if (v === null || v === undefined) return <span className="cd-empty-value">—</span>
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
    if (Array.isArray(v)) {
        return (
            <ul className="cd-mini-list">
                {v.map((item, i) => (
                    <li key={i}>{renderValue(item)}</li>
                ))}
            </ul>
        )
    }
    if (typeof v === 'object') {
        return (
            <div className="cd-mini-obj">
                {Object.entries(v).map(([k, val]) => (
                    <div key={k} className="cd-mini-row">
                        <span className="cd-mini-key">{prettyKey(k)}</span>
                        <span className="cd-mini-val">{renderValue(val)}</span>
                    </div>
                ))}
            </div>
        )
    }
    return JSON.stringify(v)
}

function prettyKey(k: string): string {
    return k
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, (s) => s.toUpperCase())
        .trim()
}

function valueToText(v: any): string {
    if (v === null || v === undefined) return ''
    if (typeof v === 'string') return v
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v, null, 2)
}

function CopyBlock({
    label,
    text,
    subtle,
    large,
}: {
    label: string
    text: any
    subtle?: boolean
    large?: boolean
}) {
    const [copied, setCopied] = useState(false)
    const safeText = valueToText(text)
    const onCopy = () => {
        navigator.clipboard.writeText(safeText).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        })
    }
    return (
        <div className={`cd-cp ${subtle ? 'is-subtle' : ''} ${large ? 'is-large' : ''}`}>
            <div className="cd-cp-head">
                <span className="cd-cp-label">{label}</span>
                <button type="button" onClick={onCopy} className="cd-cp-btn">
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <div className="cd-cp-text">{text}</div>
        </div>
    )
}

function FindingList({
    title,
    items,
    tone,
}: {
    title: string
    items: any[]
    tone: 'pos' | 'neg' | 'neutral'
}) {
    return (
        <div className="cd-finding">
            <div className={`cd-finding-title cd-${tone}`}>{title}</div>
            <ul className="cd-finding-list">
                {(items || []).map((item, i) => (
                    <li key={i}>{renderValue(item)}</li>
                ))}
            </ul>
        </div>
    )
}

/* ─── Composer ──────────────────────────────────────────────────────────── */

function Composer({
    value,
    onChange,
    onSubmit,
    onKeyDown,
    sending,
    disabled,
    brandName,
}: {
    value: string
    onChange: (s: string) => void
    onSubmit: (e: React.FormEvent) => void
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
    sending: boolean
    disabled?: boolean
    brandName?: string
}) {
    return (
        <form className="cd-composer" onSubmit={onSubmit}>
            <textarea
                className="cd-textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                    brandName
                        ? `Ask Claude about ${brandName} — briefs, prompts, critiques, captions…`
                        : 'Pick a brand to start'
                }
                rows={3}
                disabled={disabled}
            />
            <div className="cd-composer-foot">
                <span className="cd-hint">Enter to send · Shift+Enter for newline</span>
                <button
                    type="submit"
                    className="cd-send"
                    disabled={disabled || sending || !value.trim()}
                >
                    {sending ? <Spinner /> : <ArrowUpIcon />}
                </button>
            </div>
        </form>
    )
}

/* ─── Project side panel (memory + resources + notes) ───────────────────── */

type ProjectTab = 'memory' | 'resources' | 'notes'

function ProjectPanel({
    memory,
    assets,
    brandName,
    onClose,
    onAddResource,
    onDeleteResource,
    onSaveNotes,
}: {
    memory: BrandMemoryRow | null
    assets: BrandAsset[]
    brandName?: string
    onClose: () => void
    onAddResource: (a: { type: string; url: string; caption?: string; tags?: string[] }) => Promise<void>
    onDeleteResource: (id: string) => Promise<void>
    onSaveNotes: (notes: string) => Promise<void>
}) {
    const [tab, setTab] = useState<ProjectTab>('resources')

    return (
        <aside className="cd-mem">
            <div className="cd-mem-head">
                <div className="cd-mem-title">
                    <BrainIcon /> Project · {brandName || ''}
                </div>
                <button type="button" onClick={onClose} className="cd-mem-close">×</button>
            </div>
            <div className="cd-tabs">
                {(['resources', 'memory', 'notes'] as ProjectTab[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`cd-tab ${tab === t ? 'is-active' : ''}`}
                    >
                        {t === 'resources'
                            ? `Resources${assets.length ? ` · ${assets.length}` : ''}`
                            : t === 'memory'
                            ? 'Memory'
                            : 'Notes'}
                    </button>
                ))}
            </div>
            <div className="cd-mem-body">
                {tab === 'resources' && (
                    <ResourcesTab
                        assets={assets}
                        onAdd={onAddResource}
                        onDelete={onDeleteResource}
                    />
                )}
                {tab === 'memory' && <MemoryTab memory={memory} />}
                {tab === 'notes' && (
                    <NotesTab notes={memory?.notes || ''} onSave={onSaveNotes} />
                )}
            </div>
            <p className="cd-mem-foot">
                Claude reads & writes everything here during chat — including resources & notes.
            </p>
        </aside>
    )
}

function MemoryTab({ memory }: { memory: BrandMemoryRow | null }) {
    if (!memory) return <p className="cd-mem-empty">Loading…</p>
    return (
        <div className="cd-mem-stack">
            <MemoryBlock title="Visual identity" data={memory.visualIdentity} />
            <MemoryBlock title="Voice profile" data={memory.voiceProfile} />
            <MemoryBlock title="Audience personas" data={memory.audiencePersonas} />
            <MemoryBlock title="Product catalog" data={memory.productCatalog} />
            <MemoryBlock title="Competitor refs" data={memory.competitorRefs} />
            <MemoryBlock title="Legal constraints" data={memory.legalConstraints} />
            <MemoryBlock title="Design system" data={memory.designSystem} />
        </div>
    )
}

function NotesTab({
    notes,
    onSave,
}: {
    notes: string
    onSave: (n: string) => Promise<void>
}) {
    const [draft, setDraft] = useState(notes)
    const [saving, setSaving] = useState(false)
    const [savedAt, setSavedAt] = useState<number | null>(null)

    useEffect(() => {
        setDraft(notes)
    }, [notes])

    const dirty = draft !== notes

    async function handleSave() {
        setSaving(true)
        try {
            await onSave(draft)
            setSavedAt(Date.now())
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="cd-notes">
            <p className="cd-mem-help">
                Free-form notes. Drop in URLs, do/don&apos;ts, brand stories, anything Claude
                should remember.
            </p>
            <textarea
                className="cd-notes-area"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="e.g. Always reference the rooftop view. Avoid mentioning competitors. Logo wordmark only on light backgrounds."
                rows={12}
            />
            <div className="cd-notes-actions">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || saving}
                    className="cd-btn-save"
                >
                    {saving ? 'Saving…' : dirty ? 'Save notes' : savedAt ? 'Saved' : 'Up to date'}
                </button>
            </div>
        </div>
    )
}

function ResourcesTab({
    assets,
    onAdd,
    onDelete,
}: {
    assets: BrandAsset[]
    onAdd: (a: { type: string; url: string; caption?: string; tags?: string[] }) => Promise<void>
    onDelete: (id: string) => Promise<void>
}) {
    const [showAdd, setShowAdd] = useState(assets.length === 0)
    const [type, setType] = useState<string>('PRODUCT_PHOTO')
    const [url, setUrl] = useState('')
    const [caption, setCaption] = useState('')
    const [tagsRaw, setTagsRaw] = useState('')
    const [adding, setAdding] = useState(false)
    const [err, setErr] = useState<string | null>(null)

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!url.trim()) return
        setAdding(true)
        setErr(null)
        try {
            await onAdd({
                type,
                url: url.trim(),
                caption: caption.trim() || undefined,
                tags: tagsRaw
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
            })
            setUrl('')
            setCaption('')
            setTagsRaw('')
        } catch (e: any) {
            setErr(e?.message || 'Failed to add resource')
        } finally {
            setAdding(false)
        }
    }

    const isImage = (mime: string) => mime?.startsWith('image/')

    return (
        <div className="cd-res">
            {assets.length === 0 && (
                <p className="cd-mem-help">
                    No resources yet. Add reference images, brand docs, or links Claude should
                    use when designing.
                </p>
            )}

            {assets.length > 0 && (
                <div className="cd-res-grid">
                    {assets.map((a) => (
                        <div key={a.id} className="cd-res-card">
                            {isImage(a.mimeType) ? (
                                <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="cd-res-thumb"
                                    style={{ backgroundImage: `url(${a.url})` }}
                                />
                            ) : (
                                <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="cd-res-thumb cd-res-thumb-doc"
                                >
                                    <FileIcon />
                                </a>
                            )}
                            <div className="cd-res-meta">
                                <div className="cd-res-type">
                                    {ASSET_TYPES.find((t) => t.value === a.type)?.label || a.type}
                                </div>
                                {a.caption && (
                                    <div className="cd-res-cap">{a.caption}</div>
                                )}
                                {a.tags && a.tags.length > 0 && (
                                    <div className="cd-res-tags">
                                        {a.tags.slice(0, 3).map((t) => (
                                            <span key={t} className="cd-token">{t}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                className="cd-res-del"
                                onClick={() => onDelete(a.id)}
                                title="Remove"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {!showAdd && (
                <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="cd-btn-add"
                >
                    + Add resource
                </button>
            )}

            {showAdd && (
                <form className="cd-res-form" onSubmit={submit}>
                    <div className="cd-mem-block-title">New resource</div>
                    <label className="cd-field">
                        <span className="cd-field-label">Type</span>
                        <select
                            className="cd-input"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            {ASSET_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="cd-field">
                        <span className="cd-field-label">URL (image, Drive, Dropbox, web)</span>
                        <input
                            type="url"
                            required
                            className="cd-input"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://..."
                        />
                    </label>
                    <label className="cd-field">
                        <span className="cd-field-label">Caption</span>
                        <input
                            type="text"
                            className="cd-input"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="What is this and why does it matter?"
                        />
                    </label>
                    <label className="cd-field">
                        <span className="cd-field-label">Tags (comma-separated)</span>
                        <input
                            type="text"
                            className="cd-input"
                            value={tagsRaw}
                            onChange={(e) => setTagsRaw(e.target.value)}
                            placeholder="rooftop, golden-hour, signature-cocktail"
                        />
                    </label>
                    {err && <p className="cd-error-line">{err}</p>}
                    <div className="cd-res-form-actions">
                        <button
                            type="button"
                            onClick={() => setShowAdd(false)}
                            className="cd-btn-cancel"
                        >
                            Cancel
                        </button>
                        <button type="submit" disabled={adding} className="cd-btn-save">
                            {adding ? 'Adding…' : 'Add resource'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}

function FileIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    )
}

function guessMimeType(url: string): string {
    const lower = url.toLowerCase().split('?')[0]
    if (lower.match(/\.(png)$/)) return 'image/png'
    if (lower.match(/\.(jpe?g)$/)) return 'image/jpeg'
    if (lower.match(/\.(gif)$/)) return 'image/gif'
    if (lower.match(/\.(webp)$/)) return 'image/webp'
    if (lower.match(/\.(svg)$/)) return 'image/svg+xml'
    if (lower.match(/\.(mp4|mov|webm)$/)) return 'video/mp4'
    if (lower.match(/\.(pdf)$/)) return 'application/pdf'
    if (lower.match(/\.(docx?)$/)) return 'application/msword'
    return 'application/octet-stream'
}

function MemoryBlock({ title, data }: { title: string; data: any }) {
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return (
            <div className="cd-mem-block is-empty">
                <div className="cd-mem-block-title">{title}</div>
                <p className="cd-mem-empty-line">— not set —</p>
            </div>
        )
    }
    return (
        <div className="cd-mem-block">
            <div className="cd-mem-block-title">{title}</div>
            <pre className="cd-mem-pre">{JSON.stringify(data, null, 2)}</pre>
        </div>
    )
}

function MemoryFlags({ memory }: { memory: any }) {
    if (!memory) return null
    const fields = [
        ['Visual identity', memory.visualIdentity],
        ['Voice profile', memory.voiceProfile],
        ['Audience', memory.audiencePersonas],
        ['Products', memory.productCatalog],
        ['Legal', memory.legalConstraints],
        ['Design system', memory.designSystem],
        ['Notes', memory.notes],
        ['Asset samples', memory.assetSamples],
    ] as const
    return (
        <div className="cd-mem-flags">
            {fields.map(([label, val]) => {
                const has = !!val && (Array.isArray(val) ? val.length > 0 : true)
                return (
                    <span
                        key={label}
                        className={`cd-mem-flag ${has ? 'has' : 'miss'}`}
                    >
                        {has ? '●' : '○'} {label}
                    </span>
                )
            })}
        </div>
    )
}

/* ─── Icons ─────────────────────────────────────────────────────────────── */

function SparkleIcon({ small }: { small?: boolean }) {
    const s = small ? 14 : 18
    return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.4L12 17l-1.9-5.6L4.5 10l5.6-1.4L12 3z" />
        </svg>
    )
}

function BrainIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v.5a2.5 2.5 0 0 0-2 2.45 2.5 2.5 0 0 0 0 4.1V14a2.5 2.5 0 0 0 2.5 2.5h0a2.5 2.5 0 0 0 2.5 2.5h0a2.5 2.5 0 0 0 2.5-2.5V4.5A2.5 2.5 0 0 0 9.5 2Z" />
            <path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v.5a2.5 2.5 0 0 1 2 2.45 2.5 2.5 0 0 1 0 4.1V14a2.5 2.5 0 0 1-2.5 2.5h0a2.5 2.5 0 0 1-2.5 2.5h0a2.5 2.5 0 0 1-2.5-2.5V4.5A2.5 2.5 0 0 1 14.5 2Z" />
        </svg>
    )
}

function ArrowUpIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
    )
}

function Spinner() {
    return <span className="cd-spinner" aria-hidden />
}
