'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPost } from '@/lib/api'

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
    const [memoryOpen, setMemoryOpen] = useState(false)
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

    /* Load brand memory whenever brand changes; reset thread */
    useEffect(() => {
        if (!brandId) return
        setThread([])
        setMemory(null)
        apiGet<BrandMemoryRow>(`/brands/${brandId}/memory`)
            .then((res) => setMemory(res))
            .catch(() => setMemory(null))
    }, [brandId])

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
                        onToggleMemory={() => setMemoryOpen((v) => !v)}
                        memoryOpen={memoryOpen}
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

                {/* Memory panel */}
                {memoryOpen && (
                    <MemoryPanel
                        memory={memory}
                        onClose={() => setMemoryOpen(false)}
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
    onToggleMemory,
    memoryOpen,
}: {
    brands: Brand[]
    brandId: string
    onChangeBrand: (id: string) => void
    selectedBrand: Brand | null
    onToggleMemory: () => void
    memoryOpen: boolean
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
                onClick={onToggleMemory}
                className={`cd-memory-toggle ${memoryOpen ? 'is-active' : ''}`}
            >
                <BrainIcon />
                Memory
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
    value: string
    large?: boolean
}) {
    return (
        <div className={`cd-bf ${large ? 'is-large' : ''}`}>
            <div className="cd-bf-label">{label}</div>
            <div className="cd-bf-value">{value}</div>
        </div>
    )
}

function CopyBlock({
    label,
    text,
    subtle,
    large,
}: {
    label: string
    text: string
    subtle?: boolean
    large?: boolean
}) {
    const [copied, setCopied] = useState(false)
    const onCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
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
    items: string[]
    tone: 'pos' | 'neg' | 'neutral'
}) {
    return (
        <div className="cd-finding">
            <div className={`cd-finding-title cd-${tone}`}>{title}</div>
            <ul className="cd-finding-list">
                {items.map((item, i) => (
                    <li key={i}>{item}</li>
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

/* ─── Memory side panel ─────────────────────────────────────────────────── */

function MemoryPanel({
    memory,
    onClose,
}: {
    memory: BrandMemoryRow | null
    onClose: () => void
}) {
    return (
        <aside className="cd-mem">
            <div className="cd-mem-head">
                <div className="cd-mem-title">
                    <BrainIcon /> Brand memory
                </div>
                <button type="button" onClick={onClose} className="cd-mem-close">×</button>
            </div>
            <div className="cd-mem-body">
                {!memory && <p className="cd-mem-empty">Loading…</p>}
                {memory && (
                    <>
                        <MemoryBlock title="Visual identity" data={memory.visualIdentity} />
                        <MemoryBlock title="Voice profile" data={memory.voiceProfile} />
                        <MemoryBlock title="Audience personas" data={memory.audiencePersonas} />
                        <MemoryBlock title="Product catalog" data={memory.productCatalog} />
                        <MemoryBlock title="Competitor refs" data={memory.competitorRefs} />
                        <MemoryBlock title="Legal constraints" data={memory.legalConstraints} />
                        <MemoryBlock title="Design system" data={memory.designSystem} />
                        {memory.notes && (
                            <div className="cd-mem-block">
                                <div className="cd-mem-block-title">Notes</div>
                                <p className="cd-mem-notes">{memory.notes}</p>
                            </div>
                        )}
                    </>
                )}
                <p className="cd-mem-foot">
                    Claude reads & writes this memory automatically during chat.
                </p>
            </div>
        </aside>
    )
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
