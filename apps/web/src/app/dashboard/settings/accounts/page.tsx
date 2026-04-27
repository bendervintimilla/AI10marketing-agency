'use client'

import { useEffect, useState } from 'react'
import { apiFetch, apiGet, apiPost } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface ConnectedAccount {
    id: string
    organizationId: string
    platform: 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK'
    accountName: string
    accountId: string
    expiresAt?: string | null
    createdAt: string
}

interface ResolveSummary {
    brandsTotal: number
    matched: { brandId: string; brandName: string; igUsername: string; igUserId: string }[]
    unmatchedBrands: string[]
    unmatchedPages: { pageName: string; igUsername?: string }[]
}

const PLATFORMS: {
    value: 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK'
    label: string
    description: string
}[] = [
    {
        value: 'INSTAGRAM',
        label: 'Instagram + Facebook',
        description:
            'Connect your Meta Business Manager once — we resolve every Page → IG Business Account in your org and unlock audits for all brands.',
    },
    {
        value: 'TIKTOK',
        label: 'TikTok',
        description: 'Connect a TikTok Business account for publishing and audits.',
    },
]

export default function AccountsPage() {
    const { user } = useAuth()
    const orgId = user?.orgId
    const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [connecting, setConnecting] = useState<string | null>(null)
    const [resolving, setResolving] = useState(false)
    const [resolution, setResolution] = useState<ResolveSummary | null>(null)
    const [error, setError] = useState<string | null>(null)

    /* Read URL hash for OAuth return state */
    useEffect(() => {
        if (typeof window === 'undefined') return
        const url = new URL(window.location.href)
        const reso = url.searchParams.get('resolution')
        if (reso) {
            try {
                setResolution(JSON.parse(decodeURIComponent(reso)))
            } catch {}
            url.searchParams.delete('resolution')
            window.history.replaceState({}, '', url.pathname + (url.search ? '?' + url.searchParams.toString() : ''))
        }
    }, [])

    /* Load accounts */
    useEffect(() => {
        if (!orgId) return
        setLoading(true)
        apiGet<ConnectedAccount[]>(`/publish/accounts?orgId=${orgId}`)
            .then((res) => setAccounts(Array.isArray(res) ? res : []))
            .catch(() => setAccounts([]))
            .finally(() => setLoading(false))
    }, [orgId])

    async function connect(platform: 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK') {
        if (!orgId) return
        setConnecting(platform)
        setError(null)
        try {
            const res = await apiPost<{ url: string; state: string }>(
                `/publish/connect/${platform.toLowerCase()}`,
                { orgId }
            )
            window.location.href = res.url
        } catch (e: any) {
            setError(e?.message || 'Failed to start OAuth')
            setConnecting(null)
        }
    }

    async function disconnect(id: string) {
        if (!confirm('Disconnect this account?')) return
        try {
            await apiFetch(`/publish/accounts/${id}`, { method: 'DELETE' })
            setAccounts((prev) => prev.filter((a) => a.id !== id))
        } catch (e: any) {
            setError(e?.message || 'Disconnect failed')
        }
    }

    async function reResolve() {
        if (!orgId) return
        setResolving(true)
        setError(null)
        try {
            const res = await apiPost<ResolveSummary>(
                `/publish/resolve-brand-instagram-ids`,
                { orgId }
            )
            setResolution(res)
        } catch (e: any) {
            setError(e?.message || 'Resolve failed')
        } finally {
            setResolving(false)
        }
    }

    const igAccount = accounts.find((a) => a.platform === 'INSTAGRAM')

    return (
        <div className="space-y-8 max-w-3xl">
            <header>
                <h2 className="text-xl font-semibold text-white mb-1">Connected accounts</h2>
                <p className="text-gray-400 text-sm">
                    Connect Meta and TikTok once per organization — we resolve every brand
                    automatically by matching Page names + IG handles.
                </p>
            </header>

            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}

            {/* Resolution result */}
            {resolution && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-green-300">
                            Resolved {resolution.matched.length} of {resolution.brandsTotal} brands
                        </h3>
                        <button
                            onClick={() => setResolution(null)}
                            className="text-xs text-gray-400 hover:text-white"
                        >
                            dismiss
                        </button>
                    </div>
                    {resolution.matched.length > 0 && (
                        <div className="space-y-1 mb-3 max-h-48 overflow-auto">
                            {resolution.matched.map((m) => (
                                <div
                                    key={m.brandId}
                                    className="flex justify-between text-xs text-gray-300"
                                >
                                    <span className="text-white">{m.brandName}</span>
                                    <span className="text-gray-500">
                                        @{m.igUsername} · {m.igUserId}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {resolution.unmatchedBrands.length > 0 && (
                        <div className="text-xs text-gray-400 mt-2">
                            <strong className="text-yellow-300">Not matched ({resolution.unmatchedBrands.length}):</strong>{' '}
                            {resolution.unmatchedBrands.join(', ')}
                        </div>
                    )}
                    {resolution.unmatchedPages.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                            <strong>Pages without a matching brand:</strong>{' '}
                            {resolution.unmatchedPages
                                .map((p) => p.igUsername || p.pageName)
                                .join(', ')}
                        </div>
                    )}
                </div>
            )}

            {/* Platform cards */}
            <div className="space-y-4">
                {PLATFORMS.map((p) => {
                    const connected = accounts.filter((a) => a.platform === p.value)
                    return (
                        <div
                            key={p.value}
                            className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
                        >
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div>
                                    <h3 className="text-base font-semibold text-white">{p.label}</h3>
                                    <p className="text-xs text-gray-400 mt-1 max-w-md">
                                        {p.description}
                                    </p>
                                </div>
                                <button
                                    onClick={() => connect(p.value)}
                                    disabled={!orgId || connecting === p.value}
                                    className="shrink-0 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                >
                                    {connecting === p.value
                                        ? 'Redirecting…'
                                        : connected.length > 0
                                        ? 'Reconnect'
                                        : 'Connect'}
                                </button>
                            </div>

                            {connected.length > 0 && (
                                <div className="space-y-2">
                                    {connected.map((a) => (
                                        <div
                                            key={a.id}
                                            className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                                        >
                                            <div className="min-w-0">
                                                <div className="text-sm text-white truncate">
                                                    {a.accountName}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono truncate">
                                                    ID {a.accountId}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => disconnect(a.id)}
                                                className="text-xs text-gray-400 hover:text-red-400"
                                            >
                                                Disconnect
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Re-resolve action */}
            {igAccount && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-white">
                                Re-match brands to Instagram accounts
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                                Re-runs the Page → Brand fuzzy match using your stored Meta token.
                                Use this after you add new brands or rename existing ones.
                            </p>
                        </div>
                        <button
                            onClick={reResolve}
                            disabled={resolving}
                            className="shrink-0 rounded-lg border border-white/15 hover:bg-white/5 px-4 py-2 text-sm text-white disabled:opacity-50"
                        >
                            {resolving ? 'Resolving…' : 'Re-resolve'}
                        </button>
                    </div>
                </div>
            )}

            {!loading && !igAccount && (
                <p className="text-xs text-gray-500">
                    No accounts connected yet. Connect Meta to unlock Instagram audits across all
                    your brands.
                </p>
            )}
        </div>
    )
}
