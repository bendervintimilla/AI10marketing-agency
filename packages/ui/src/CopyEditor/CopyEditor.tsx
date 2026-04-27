import React, { useState, useCallback } from 'react';
import type { Platform, CopyOutput } from '@agency/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CopyEditorProps {
    adId: string;
    platform: Platform;
    initialCaption?: string;
    initialHashtags?: string[];
    initialCta?: string;
    /** Endpoint base URL, defaults to /copy */
    apiBase?: string;
    onSave?: (copy: Partial<CopyOutput>) => void;
}

// ─── Platform preview config ──────────────────────────────────────────────────

const PLATFORM_META: Record<Platform, { label: string; captionLimit: number; hashtagLimit: number; color: string; icon: string }> = {
    INSTAGRAM: { label: 'Instagram', captionLimit: 2200, hashtagLimit: 30, color: '#E1306C', icon: '📸' },
    TIKTOK: { label: 'TikTok', captionLimit: 150, hashtagLimit: 10, color: '#010101', icon: '🎵' },
    FACEBOOK: { label: 'Facebook', captionLimit: 63206, hashtagLimit: 10, color: '#1877F2', icon: '👥' },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    container: {
        fontFamily: "'Inter', system-ui, sans-serif",
        maxWidth: 760,
        background: '#111827',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        color: '#F9FAFB',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #1F2937, #111827)',
        borderBottom: '1px solid #374151',
    },
    badge: {
        padding: '4px 12px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    body: { padding: 24 },
    section: { marginBottom: 24 },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    textarea: {
        width: '100%',
        minHeight: 120,
        background: '#1F2937',
        border: '1px solid #374151',
        borderRadius: 10,
        padding: '12px 14px',
        color: '#F9FAFB',
        fontSize: 14,
        lineHeight: 1.6,
        resize: 'vertical',
        outline: 'none',
        transition: 'border-color 0.15s',
        boxSizing: 'border-box',
    },
    hashtagContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        background: '#1F2937',
        border: '1px solid #374151',
        borderRadius: 10,
        padding: 12,
        minHeight: 60,
    },
    chip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        background: '#374151',
        borderRadius: 20,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'background 0.15s',
        userSelect: 'none',
    },
    chipRemove: { color: '#9CA3AF', fontSize: 12, fontWeight: 700 },
    addHashtagRow: { display: 'flex', gap: 8, marginTop: 8 },
    input: {
        flex: 1,
        background: '#1F2937',
        border: '1px solid #374151',
        borderRadius: 8,
        padding: '8px 12px',
        color: '#F9FAFB',
        fontSize: 14,
        outline: 'none',
        transition: 'border-color 0.15s',
    },
    btn: {
        padding: '8px 16px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        transition: 'all 0.15s',
    },
    btnPrimary: { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff' },
    btnSecondary: { background: '#374151', color: '#D1D5DB' },
    btnDanger: { background: '#991B1B', color: '#FCA5A5', fontSize: 12 },
    regenerateRow: { display: 'flex', gap: 8 },
    tabRow: { display: 'flex', gap: 2, marginBottom: 16 },
    tab: {
        padding: '8px 16px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 500,
        transition: 'all 0.15s',
        background: 'transparent',
        color: '#9CA3AF',
    },
    tabActive: { color: '#F9FAFB', background: '#1F2937' },
    previewBox: {
        background: '#1F2937',
        border: '1px solid #374151',
        borderRadius: 10,
        padding: 16,
    },
    previewCaption: { fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#E5E7EB' },
    previewHashtags: { marginTop: 10, fontSize: 13, color: '#60A5FA', lineHeight: 1.6 },
    charCount: { fontSize: 11, color: '#6B7280', textAlign: 'right', marginTop: 4 },
    confidenceBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
    },
    suggestionList: { listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 6 } as React.CSSProperties,
    suggestion: { display: 'flex', gap: 8, background: '#1F2937', borderRadius: 8, padding: '8px 12px', fontSize: 13 },
    footer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderTop: '1px solid #1F2937',
        background: '#0F172A',
    },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const CopyEditor: React.FC<CopyEditorProps> = ({
    adId,
    platform,
    initialCaption = '',
    initialHashtags = [],
    initialCta = '',
    apiBase = '/copy',
    onSave,
}) => {
    const [caption, setCaption] = useState(initialCaption);
    const [hashtags, setHashtags] = useState<string[]>(initialHashtags);
    const [cta, setCta] = useState(initialCta);
    const [newHashtag, setNewHashtag] = useState('');
    const [guidance, setGuidance] = useState('');
    const [activeTab, setActiveTab] = useState<Platform>(platform);
    const [loading, setLoading] = useState(false);
    const [optimizedCaption, setOptimizedCaption] = useState('');
    const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<Array<{ rule: string; suggestion: string }>>([]);
    const [error, setError] = useState('');

    const meta = PLATFORM_META[platform];
    const previewMeta = PLATFORM_META[activeTab];
    const charUsed = caption.length;
    const charmax = meta.captionLimit;

    // ── Hashtag management ────────────────────────────────────────────────────

    const addHashtag = useCallback(() => {
        const tag = newHashtag.trim().startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`;
        if (!tag || tag === '#' || hashtags.includes(tag)) return;
        setHashtags((prev) => [...prev, tag]);
        setNewHashtag('');
    }, [newHashtag, hashtags]);

    const removeHashtag = useCallback((tag: string) => {
        setHashtags((prev) => prev.filter((h) => h !== tag));
    }, []);

    const handleHashtagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); addHashtag(); }
    };

    // ── API calls ─────────────────────────────────────────────────────────────

    const handleGenerate = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${apiBase}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adId }),
            });
            if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
            const data: CopyOutput = await res.json();
            setCaption(data.caption);
            setHashtags(data.hashtags);
            setCta(data.callToAction);
            setOptimizedCaption(data.optimizedCaption);
            setConfidenceScore(data.confidenceScore);
            setSuggestions(data.suggestions);
            onSave?.(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${apiBase}/regenerate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adId, guidance: guidance.trim() || undefined }),
            });
            if (!res.ok) throw new Error(`Regenerate failed: ${res.status}`);
            const data: CopyOutput = await res.json();
            setCaption(data.caption);
            setHashtags(data.hashtags);
            setCta(data.callToAction);
            setOptimizedCaption(data.optimizedCaption);
            setConfidenceScore(data.confidenceScore);
            setSuggestions(data.suggestions);
            setGuidance('');
            onSave?.(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // ── Confidence badge ───────────────────────────────────────────────────────

    const confidenceColor =
        confidenceScore === null ? '#6B7280'
            : confidenceScore >= 80 ? '#10B981'
                : confidenceScore >= 50 ? '#F59E0B'
                    : '#EF4444';

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <span style={{ fontSize: 22 }}>{meta.icon}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Copy Editor</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>Ad ID: {adId}</div>
                </div>
                <span style={{ ...styles.badge, background: meta.color + '22', color: meta.color }}>
                    {meta.label}
                </span>
                {confidenceScore !== null && (
                    <span style={{ ...styles.confidenceBadge, background: confidenceColor + '22', color: confidenceColor }}>
                        ✦ {confidenceScore}% confidence
                    </span>
                )}
            </div>

            <div style={styles.body}>
                {error && (
                    <div style={{ background: '#991B1B22', border: '1px solid #991B1B', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#FCA5A5', fontSize: 13 }}>
                        ⚠ {error}
                    </div>
                )}

                {/* Caption editor */}
                <div style={styles.section}>
                    <label style={styles.label}>Caption</label>
                    <textarea
                        style={styles.textarea}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Your caption will appear here after generation…"
                    />
                    <div style={styles.charCount as React.CSSProperties}>
                        <span style={{ color: charUsed > charmax ? '#EF4444' : undefined }}>
                            {charUsed}
                        </span> / {charmax.toLocaleString()} chars
                    </div>
                </div>

                {/* Call to Action */}
                <div style={styles.section}>
                    <label style={styles.label}>Call to Action</label>
                    <input
                        style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                        value={cta}
                        onChange={(e) => setCta(e.target.value)}
                        placeholder="e.g. Shop now, Learn more, Link in bio"
                    />
                </div>

                {/* Hashtags */}
                <div style={styles.section}>
                    <label style={styles.label}>
                        Hashtags ({hashtags.length}/{previewMeta.hashtagLimit})
                    </label>
                    <div style={styles.hashtagContainer}>
                        {hashtags.map((tag) => (
                            <span key={tag} style={styles.chip} onClick={() => removeHashtag(tag)}>
                                {tag}
                                <span style={styles.chipRemove}>×</span>
                            </span>
                        ))}
                    </div>
                    <div style={styles.addHashtagRow}>
                        <input
                            style={styles.input}
                            value={newHashtag}
                            onChange={(e) => setNewHashtag(e.target.value)}
                            onKeyDown={handleHashtagKeyDown}
                            placeholder="Add hashtag (press Enter)"
                        />
                        <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={addHashtag}>
                            Add
                        </button>
                    </div>
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div style={styles.section}>
                        <label style={styles.label}>Optimization Tips</label>
                        <ul style={styles.suggestionList}>
                            {suggestions.map((s) => (
                                <li key={s.rule} style={styles.suggestion}>
                                    <span style={{ color: '#F59E0B' }}>⚡</span>
                                    <div>
                                        <strong style={{ fontSize: 12, color: '#9CA3AF' }}>{s.rule}</strong>
                                        <p style={{ margin: 0, marginTop: 2, color: '#D1D5DB' }}>{s.suggestion}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Platform Preview */}
                <div style={styles.section}>
                    <label style={styles.label}>Platform Preview</label>
                    <div style={styles.tabRow}>
                        {(Object.keys(PLATFORM_META) as Platform[]).map((p) => (
                            <button
                                key={p}
                                style={{ ...styles.tab, ...(activeTab === p ? styles.tabActive : {}) }}
                                onClick={() => setActiveTab(p)}
                            >
                                {PLATFORM_META[p].icon} {PLATFORM_META[p].label}
                            </button>
                        ))}
                    </div>
                    <div style={styles.previewBox}>
                        <div style={{ ...styles.badge, display: 'inline-block', marginBottom: 10, background: PLATFORM_META[activeTab].color + '22', color: PLATFORM_META[activeTab].color }}>
                            {PLATFORM_META[activeTab].label} Preview
                        </div>
                        {activeTab === 'TIKTOK' && caption.length > 150 ? (
                            <p style={{ ...styles.previewCaption, color: '#60A5FA', margin: 0 }}>
                                {caption.substring(0, 147)}…
                                <span style={{ color: '#6B7280', fontSize: 12 }}> (truncated for TikTok)</span>
                            </p>
                        ) : (
                            <p style={{ ...styles.previewCaption, margin: 0 }}>{caption || <span style={{ color: '#4B5563' }}>Caption will appear here…</span>}</p>
                        )}
                        {hashtags.length > 0 && (
                            <p style={styles.previewHashtags}>
                                {hashtags.slice(0, PLATFORM_META[activeTab].hashtagLimit).join(' ')}
                            </p>
                        )}
                        {cta && (
                            <div style={{ marginTop: 12, padding: '8px 14px', background: PLATFORM_META[activeTab].color + '22', borderRadius: 8, fontSize: 13, fontWeight: 600, color: PLATFORM_META[activeTab].color, display: 'inline-block' }}>
                                {cta}
                            </div>
                        )}
                    </div>
                </div>

                {/* Optimized caption hint */}
                {optimizedCaption && optimizedCaption !== caption && (
                    <div style={styles.section}>
                        <label style={styles.label}>Optimized Version Available</label>
                        <div style={{ ...styles.previewBox, borderColor: '#6366F133' }}>
                            <p style={{ ...styles.previewCaption, margin: 0, color: '#A5B4FC' }}>{optimizedCaption}</p>
                            <button
                                style={{ ...styles.btn, ...styles.btnPrimary, marginTop: 10, fontSize: 12 }}
                                onClick={() => setCaption(optimizedCaption)}
                            >
                                Apply Optimized Version
                            </button>
                        </div>
                    </div>
                )}

                {/* Regenerate */}
                <div style={styles.section}>
                    <label style={styles.label}>Regenerate with Guidance</label>
                    <div style={styles.regenerateRow}>
                        <input
                            style={styles.input}
                            value={guidance}
                            onChange={(e) => setGuidance(e.target.value)}
                            placeholder={`e.g. "make it funnier", "add urgency", "use a question hook"`}
                            onKeyDown={(e) => e.key === 'Enter' && handleRegenerate()}
                        />
                        <button
                            style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}
                            onClick={handleRegenerate}
                            disabled={loading}
                        >
                            {loading ? '…' : '↺ Regenerate'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={styles.footer}>
                <button
                    style={{ ...styles.btn, ...styles.btnSecondary, opacity: loading ? 0.7 : 1 }}
                    onClick={handleGenerate}
                    disabled={loading}
                >
                    {loading ? 'Generating…' : '✦ Generate Copy'}
                </button>
                <button
                    style={{ ...styles.btn, ...styles.btnPrimary }}
                    onClick={() => onSave?.({ caption, hashtags, callToAction: cta })}
                >
                    Save Copy
                </button>
            </div>
        </div>
    );
};

export default CopyEditor;
