'use client'

import React, { useCallback, useState } from 'react'

export interface Column<T> {
    key: keyof T | string
    label: string
    render?: (row: T) => React.ReactNode
    sortable?: boolean
    width?: string
}

export interface DataTableProps<T extends { id: string | number }> {
    data: T[]
    columns: Column<T>[]
    searchable?: boolean
    searchPlaceholder?: string
    pageSize?: number
    emptyMessage?: string
    loading?: boolean
    onRowClick?: (row: T) => void
}

type SortDirection = 'asc' | 'desc' | null

export function DataTable<T extends { id: string | number }>({
    data,
    columns,
    searchable = true,
    searchPlaceholder = 'Search…',
    pageSize = 10,
    emptyMessage = 'No results found',
    loading = false,
    onRowClick,
}: DataTableProps<T>) {
    const [search, setSearch] = useState('')
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<SortDirection>(null)
    const [page, setPage] = useState(1)

    const handleSort = useCallback(
        (key: string) => {
            if (sortKey === key) {
                setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'))
                if (sortDir === 'desc') setSortKey(null)
            } else {
                setSortKey(key)
                setSortDir('asc')
            }
            setPage(1)
        },
        [sortKey, sortDir]
    )

    const filtered = data.filter((row) => {
        if (!search) return true
        return Object.values(row as Record<string, unknown>)
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase())
    })

    const sorted = [...filtered].sort((a, b) => {
        if (!sortKey || !sortDir) return 0
        const av = (a as Record<string, unknown>)[sortKey]
        const bv = (b as Record<string, unknown>)[sortKey]
        if (av === bv) return 0
        const cmp = av! < bv! ? -1 : 1
        return sortDir === 'asc' ? cmp : -cmp
    })

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

    const SortIcon = ({ col }: { col: Column<T> }) => {
        const isActive = sortKey === col.key
        return (
            <span className="ml-1.5 inline-flex flex-col gap-0.5 opacity-40 group-hover:opacity-80 transition-opacity">
                <span className={['block h-0 w-0 border-x-4 border-x-transparent border-b-4',
                    isActive && sortDir === 'asc' ? 'border-b-violet-400 opacity-100' : 'border-b-current'].join(' ')} />
                <span className={['block h-0 w-0 border-x-4 border-x-transparent border-t-4',
                    isActive && sortDir === 'desc' ? 'border-t-violet-400 opacity-100' : 'border-t-current'].join(' ')} />
            </span>
        )
    }

    return (
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
            {searchable && (
                <div className="p-4 border-b border-[var(--color-border)]">
                    <div className="relative max-w-xs">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                            placeholder={searchPlaceholder}
                            className="w-full pl-9 pr-3 py-2 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        />
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <svg className="animate-spin h-6 w-6 text-violet-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-full text-sm">
                        <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
                            <tr>
                                {columns.map((col) => (
                                    <th
                                        key={String(col.key)}
                                        className={[
                                            'px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap',
                                            col.sortable ? 'cursor-pointer select-none group hover:text-[var(--color-text)] transition-colors' : '',
                                            col.width ?? '',
                                        ].join(' ')}
                                        onClick={() => col.sortable && handleSort(String(col.key))}
                                    >
                                        <span className="inline-flex items-center">
                                            {col.label}
                                            {col.sortable && <SortIcon col={col} />}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="text-center py-12 text-[var(--color-text-muted)]">
                                        {emptyMessage}
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((row) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => onRowClick?.(row)}
                                        className={[
                                            'transition-colors duration-100',
                                            onRowClick ? 'cursor-pointer hover:bg-[var(--color-surface-raised)]' : 'hover:bg-[var(--color-bg-subtle)]',
                                        ].join(' ')}
                                    >
                                        {columns.map((col) => (
                                            <td key={String(col.key)} className="px-4 py-3.5 text-[var(--color-text)]">
                                                {col.render
                                                    ? col.render(row)
                                                    : String((row as Record<string, unknown>)[String(col.key)] ?? '—')}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-muted)]">
                        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-2 py-1 rounded text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            ←
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                            const p = i + 1
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={[
                                        'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                                        page === p
                                            ? 'bg-violet-600 text-white'
                                            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]',
                                    ].join(' ')}
                                >
                                    {p}
                                </button>
                            )
                        })}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-2 py-1 rounded text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            →
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
