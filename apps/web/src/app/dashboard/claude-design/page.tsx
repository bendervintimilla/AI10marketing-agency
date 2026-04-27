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

            <ClaudeDesignStyles />
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

/* ─── Styles (Claude.ai aesthetic) ─────────────────────────────────────── */

function ClaudeDesignStyles() {
    return (
        <style jsx global>{`
            @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&display=swap');

            .cd-root {
                --cd-bg: #faf7f2;
                --cd-bg-warm: #f3ede2;
                --cd-surface: #ffffff;
                --cd-ink: #1a1614;
                --cd-ink-soft: #4a423d;
                --cd-ink-mute: #8a7f76;
                --cd-line: #e6dfd2;
                --cd-line-soft: #efe9dc;
                --cd-accent: #cc785c;
                --cd-accent-deep: #a35a44;
                --cd-accent-soft: #f4e7df;
                --cd-pos: #4a7c59;
                --cd-neg: #b85c4f;

                margin: -1rem;
                background: radial-gradient(circle at 20% 0%, var(--cd-bg-warm), var(--cd-bg) 60%);
                color: var(--cd-ink);
                min-height: calc(100vh - 56px);
                font-family: 'Inter', system-ui, sans-serif;
            }
            @media (min-width: 1024px) {
                .cd-root {
                    margin: -1.5rem;
                }
            }
            .cd-root * {
                border-color: var(--cd-line);
            }
            .dark .cd-root {
                color-scheme: light;
            }

            .cd-shell {
                display: grid;
                grid-template-columns: 1fr;
                min-height: calc(100vh - 56px);
            }
            @media (min-width: 1100px) {
                .cd-shell:has(.cd-mem) {
                    grid-template-columns: 1fr 360px;
                }
            }

            .cd-main {
                display: flex;
                flex-direction: column;
                min-height: calc(100vh - 56px);
                max-width: 920px;
                width: 100%;
                margin: 0 auto;
                padding: 0;
            }

            /* Header */
            .cd-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.1rem 1.5rem;
                border-bottom: 1px solid var(--cd-line-soft);
                position: sticky;
                top: 0;
                background: rgba(250, 247, 242, 0.85);
                backdrop-filter: blur(12px);
                z-index: 10;
            }
            .cd-header-left {
                display: flex;
                gap: 0.85rem;
                align-items: center;
            }
            .cd-mark {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                background: var(--cd-ink);
                color: var(--cd-bg);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .cd-brand-eyebrow {
                font-size: 0.7rem;
                font-weight: 600;
                color: var(--cd-ink-mute);
                text-transform: uppercase;
                letter-spacing: 0.06em;
            }
            .cd-brand-line {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .cd-brand-select {
                background: transparent;
                border: 0;
                font-family: 'Source Serif 4', Charter, Georgia, serif;
                font-size: 1.15rem;
                font-weight: 500;
                color: var(--cd-ink);
                cursor: pointer;
                padding: 0;
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a7f76' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right center;
                padding-right: 1.2rem;
            }
            .cd-brand-meta {
                font-size: 0.82rem;
                color: var(--cd-ink-mute);
            }
            .cd-memory-toggle {
                display: inline-flex;
                gap: 0.35rem;
                align-items: center;
                padding: 0.45rem 0.85rem;
                border: 1px solid var(--cd-line);
                border-radius: 999px;
                background: transparent;
                color: var(--cd-ink-soft);
                font-size: 0.82rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                font-family: inherit;
            }
            .cd-memory-toggle:hover {
                border-color: var(--cd-ink-soft);
                color: var(--cd-ink);
            }
            .cd-memory-toggle.is-active {
                background: var(--cd-accent-soft);
                border-color: var(--cd-accent);
                color: var(--cd-accent-deep);
            }

            /* Thread */
            .cd-thread {
                flex: 1;
                overflow-y: auto;
                padding: 2rem 1.5rem 1rem;
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            /* Empty */
            .cd-empty {
                max-width: 560px;
                margin: 4rem auto 0;
                text-align: left;
            }
            .cd-empty-mark {
                display: inline-flex;
                width: 56px;
                height: 56px;
                border-radius: 14px;
                background: var(--cd-ink);
                color: var(--cd-bg);
                align-items: center;
                justify-content: center;
                margin-bottom: 1.5rem;
            }
            .cd-empty-title {
                font-family: 'Source Serif 4', Charter, Georgia, serif;
                font-weight: 500;
                font-size: clamp(2.2rem, 4.5vw, 3rem);
                line-height: 1.1;
                letter-spacing: -0.02em;
                margin: 0 0 0.85rem;
            }
            .cd-empty-lede {
                font-size: 1.02rem;
                line-height: 1.55;
                color: var(--cd-ink-soft);
                margin: 0 0 1.75rem;
            }
            .cd-empty-starters {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            .cd-starter {
                background: var(--cd-surface);
                border: 1px solid var(--cd-line);
                border-radius: 12px;
                padding: 0.8rem 1rem;
                font-size: 0.92rem;
                color: var(--cd-ink-soft);
                text-align: left;
                cursor: pointer;
                transition: all 0.15s ease;
                font-family: inherit;
            }
            .cd-starter:hover {
                border-color: var(--cd-accent);
                color: var(--cd-ink);
                background: var(--cd-accent-soft);
            }

            /* Turns */
            .cd-turn {
                display: flex;
                gap: 0.75rem;
            }
            .cd-turn-user {
                justify-content: flex-end;
            }
            .cd-turn-assistant {
                justify-content: flex-start;
            }
            .cd-avatar {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: var(--cd-ink);
                color: var(--cd-bg);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                margin-top: 0.1rem;
            }
            .cd-bubble {
                background: var(--cd-bg-warm);
                color: var(--cd-ink);
                padding: 0.7rem 1rem;
                border-radius: 14px;
                max-width: 70%;
                font-size: 0.95rem;
                line-height: 1.5;
                white-space: pre-wrap;
                word-break: break-word;
            }
            .cd-bubble-assistant {
                background: transparent;
                padding: 0;
                max-width: 100%;
                color: var(--cd-ink);
            }
            .cd-turn-body {
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
                max-width: calc(100% - 40px);
                flex: 1;
            }

            /* Thinking dots */
            .cd-thinking {
                display: flex;
                gap: 4px;
                padding: 0.4rem 0;
            }
            .cd-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--cd-ink-mute);
                animation: cd-bounce 1.2s infinite ease-in-out;
            }
            .cd-dot:nth-child(2) { animation-delay: 0.15s; }
            .cd-dot:nth-child(3) { animation-delay: 0.3s; }
            @keyframes cd-bounce {
                0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
                40% { opacity: 1; transform: translateY(-3px); }
            }

            /* Tool artifact card */
            .cd-tool {
                background: var(--cd-surface);
                border: 1px solid var(--cd-line);
                border-radius: 14px;
                overflow: hidden;
            }
            .cd-tool-mem {
                background: var(--cd-accent-soft);
                border-color: var(--cd-accent);
            }
            .cd-tool-err {
                background: rgba(184, 92, 79, 0.06);
                border-color: rgba(184, 92, 79, 0.3);
                color: var(--cd-neg);
            }
            .cd-tool-head {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.7rem 1rem;
                border-bottom: 1px solid var(--cd-line-soft);
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--cd-ink);
            }
            .cd-tool-mem .cd-tool-head {
                color: var(--cd-accent-deep);
                border-color: rgba(204, 120, 92, 0.2);
            }
            .cd-tool-icon {
                color: var(--cd-accent-deep);
                font-size: 1rem;
            }
            .cd-tool-sub {
                font-weight: 400;
                color: var(--cd-ink-mute);
                font-size: 0.8rem;
                margin-left: auto;
            }
            .cd-tool-body {
                padding: 0.9rem 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .cd-tool-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.85rem;
            }
            @media (max-width: 640px) {
                .cd-tool-grid {
                    grid-template-columns: 1fr;
                }
            }

            .cd-tool-fields {
                display: flex;
                flex-wrap: wrap;
                gap: 0.35rem;
            }

            .cd-bf-label {
                font-size: 0.7rem;
                font-weight: 600;
                color: var(--cd-ink-mute);
                text-transform: uppercase;
                letter-spacing: 0.06em;
                margin-bottom: 0.3rem;
            }
            .cd-bf-value {
                font-size: 0.92rem;
                line-height: 1.5;
                color: var(--cd-ink-soft);
                white-space: pre-wrap;
            }
            .cd-bf.is-large .cd-bf-value {
                font-family: 'Source Serif 4', Georgia, serif;
                font-size: 1.15rem;
                line-height: 1.45;
                color: var(--cd-ink);
            }

            /* Copy block */
            .cd-cp {
                background: var(--cd-bg);
                border: 1px solid var(--cd-line-soft);
                border-radius: 10px;
                padding: 0.75rem 0.9rem;
            }
            .cd-cp.is-subtle {
                background: transparent;
            }
            .cd-cp-head {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.35rem;
            }
            .cd-cp-label {
                font-size: 0.7rem;
                font-weight: 600;
                color: var(--cd-ink-mute);
                text-transform: uppercase;
                letter-spacing: 0.06em;
            }
            .cd-cp-btn {
                background: transparent;
                border: 0;
                color: var(--cd-accent-deep);
                font-size: 0.78rem;
                font-weight: 500;
                cursor: pointer;
            }
            .cd-cp-btn:hover {
                text-decoration: underline;
            }
            .cd-cp-text {
                font-size: 0.9rem;
                line-height: 1.55;
                color: var(--cd-ink);
                white-space: pre-wrap;
                word-break: break-word;
            }
            .cd-cp.is-large .cd-cp-text {
                font-family: 'Source Serif 4', Georgia, serif;
                font-size: 1.05rem;
                line-height: 1.5;
            }

            /* Tokens */
            .cd-tokens {
                display: flex;
                flex-wrap: wrap;
                gap: 0.3rem;
            }
            .cd-token {
                background: var(--cd-bg-warm);
                color: var(--cd-ink-soft);
                padding: 0.2rem 0.55rem;
                border-radius: 5px;
                font-size: 0.74rem;
                font-family: 'JetBrains Mono', ui-monospace, monospace;
            }

            /* Memory flags */
            .cd-mem-flags {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4rem;
            }
            .cd-mem-flag {
                font-size: 0.75rem;
                color: var(--cd-ink-mute);
                padding: 0.18rem 0.5rem;
                border-radius: 999px;
                background: var(--cd-bg);
            }
            .cd-mem-flag.has {
                color: var(--cd-pos);
                background: rgba(74, 124, 89, 0.08);
            }
            .cd-mem-flag.miss {
                color: var(--cd-ink-mute);
            }

            /* Critique */
            .cd-pill {
                margin-left: auto;
                padding: 0.18rem 0.55rem;
                border-radius: 999px;
                font-size: 0.7rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .cd-pill.pos {
                background: rgba(74, 124, 89, 0.12);
                color: var(--cd-pos);
            }
            .cd-pill.neg {
                background: rgba(184, 92, 79, 0.12);
                color: var(--cd-neg);
            }
            .cd-critique-row {
                display: grid;
                grid-template-columns: 110px 1fr;
                gap: 1rem;
            }
            @media (max-width: 600px) {
                .cd-critique-row {
                    grid-template-columns: 1fr;
                }
            }
            .cd-score {
                background: var(--cd-bg);
                border-radius: 10px;
                padding: 0.85rem;
                text-align: center;
            }
            .cd-score.pos {
                background: rgba(74, 124, 89, 0.08);
            }
            .cd-score.neg {
                background: rgba(184, 92, 79, 0.08);
            }
            .cd-score-num {
                font-family: 'Source Serif 4', Georgia, serif;
                font-size: 2rem;
                font-weight: 500;
                color: var(--cd-ink);
                line-height: 1;
            }
            .cd-score-label {
                font-size: 0.7rem;
                color: var(--cd-ink-mute);
                margin-top: 0.3rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .cd-finding-title {
                font-size: 0.72rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 0.3rem;
            }
            .cd-pos { color: var(--cd-pos); }
            .cd-neg { color: var(--cd-neg); }
            .cd-neutral { color: var(--cd-ink-mute); }
            .cd-finding-list {
                margin: 0;
                padding-left: 1.1rem;
                font-size: 0.88rem;
                color: var(--cd-ink-soft);
                line-height: 1.5;
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            /* Asset grid */
            .cd-asset-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 0.5rem;
            }
            .cd-asset {
                background: var(--cd-bg);
                border: 1px solid var(--cd-line-soft);
                border-radius: 8px;
                padding: 0.5rem;
                font-size: 0.78rem;
                color: var(--cd-ink-soft);
                text-decoration: none;
                display: flex;
                flex-direction: column;
                gap: 0.2rem;
            }
            .cd-asset-type {
                font-size: 0.68rem;
                font-weight: 600;
                color: var(--cd-accent-deep);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .cd-asset-cap {
                font-size: 0.78rem;
                color: var(--cd-ink-soft);
                line-height: 1.35;
            }

            /* Details */
            .cd-details {
                font-size: 0.82rem;
                color: var(--cd-ink-mute);
            }
            .cd-details summary {
                cursor: pointer;
                color: var(--cd-ink-soft);
            }
            .cd-pre {
                background: var(--cd-bg);
                padding: 0.6rem 0.8rem;
                border-radius: 8px;
                font-size: 0.75rem;
                overflow-x: auto;
                color: var(--cd-ink-soft);
                font-family: 'JetBrains Mono', ui-monospace, monospace;
                margin-top: 0.4rem;
            }

            /* Composer */
            .cd-composer {
                padding: 1rem 1.5rem 1.5rem;
                background: linear-gradient(to top, var(--cd-bg) 60%, transparent);
                position: sticky;
                bottom: 0;
            }
            .cd-textarea {
                width: 100%;
                background: var(--cd-surface);
                border: 1px solid var(--cd-line);
                border-radius: 16px;
                padding: 0.9rem 1rem 0.7rem;
                font-size: 0.95rem;
                line-height: 1.5;
                color: var(--cd-ink);
                resize: none;
                font-family: inherit;
                outline: none;
                transition: border-color 0.15s ease, box-shadow 0.15s ease;
            }
            .cd-textarea:focus {
                border-color: var(--cd-accent);
                box-shadow: 0 0 0 3px var(--cd-accent-soft);
            }
            .cd-textarea:disabled {
                opacity: 0.5;
            }
            .cd-composer-foot {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 0.5rem;
                padding: 0 0.2rem;
            }
            .cd-hint {
                font-size: 0.74rem;
                color: var(--cd-ink-mute);
            }
            .cd-send {
                width: 34px;
                height: 34px;
                border-radius: 50%;
                background: var(--cd-ink);
                color: var(--cd-bg);
                border: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.15s ease;
            }
            .cd-send:hover:not(:disabled) {
                background: var(--cd-accent-deep);
            }
            .cd-send:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
            .cd-spinner {
                width: 14px;
                height: 14px;
                border: 1.5px solid currentColor;
                border-top-color: transparent;
                border-radius: 50%;
                animation: cd-spin 0.7s linear infinite;
            }
            @keyframes cd-spin {
                to { transform: rotate(360deg); }
            }

            /* Error */
            .cd-error {
                background: rgba(184, 92, 79, 0.08);
                border: 1px solid rgba(184, 92, 79, 0.25);
                color: var(--cd-neg);
                border-radius: 10px;
                padding: 0.55rem 0.85rem;
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .cd-error-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--cd-neg);
            }

            /* Memory side panel */
            .cd-mem {
                border-left: 1px solid var(--cd-line);
                background: var(--cd-bg);
                display: flex;
                flex-direction: column;
                position: sticky;
                top: 0;
                max-height: calc(100vh - 56px);
                overflow: hidden;
            }
            .cd-mem-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1rem 1.25rem;
                border-bottom: 1px solid var(--cd-line-soft);
            }
            .cd-mem-title {
                display: inline-flex;
                gap: 0.4rem;
                align-items: center;
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--cd-ink);
            }
            .cd-mem-close {
                background: transparent;
                border: 0;
                font-size: 1.4rem;
                color: var(--cd-ink-mute);
                cursor: pointer;
                line-height: 1;
            }
            .cd-mem-close:hover {
                color: var(--cd-ink);
            }
            .cd-mem-body {
                overflow-y: auto;
                padding: 1rem 1.25rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
                font-size: 0.85rem;
            }
            .cd-mem-empty {
                color: var(--cd-ink-mute);
                font-style: italic;
            }
            .cd-mem-block-title {
                font-size: 0.7rem;
                font-weight: 700;
                color: var(--cd-ink-mute);
                text-transform: uppercase;
                letter-spacing: 0.06em;
                margin-bottom: 0.35rem;
            }
            .cd-mem-block.is-empty .cd-mem-empty-line {
                color: var(--cd-ink-mute);
                font-style: italic;
                margin: 0;
            }
            .cd-mem-pre {
                background: var(--cd-surface);
                padding: 0.6rem 0.75rem;
                border-radius: 8px;
                font-size: 0.74rem;
                color: var(--cd-ink-soft);
                font-family: 'JetBrains Mono', ui-monospace, monospace;
                white-space: pre-wrap;
                word-break: break-word;
                margin: 0;
                max-height: 220px;
                overflow-y: auto;
            }
            .cd-mem-notes {
                color: var(--cd-ink-soft);
                line-height: 1.5;
                margin: 0;
            }
            .cd-mem-foot {
                font-size: 0.74rem;
                color: var(--cd-ink-mute);
                font-style: italic;
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid var(--cd-line-soft);
            }
        `}</style>
    )
}
