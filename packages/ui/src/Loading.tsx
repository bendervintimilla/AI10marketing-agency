'use client'

import React from 'react'

export interface LoadingSpinnerProps {
    size?: 'xs' | 'sm' | 'md' | 'lg'
    color?: string
    className?: string
}

const sizeMap = { xs: 'h-3 w-3', sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
    return (
        <svg
            className={['animate-spin text-violet-500', sizeMap[size], className].join(' ')}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
        </svg>
    )
}

/* ─── Skeleton Loaders ─── */
export function SkeletonLine({ className = '' }: { className?: string }) {
    return <div className={['h-4 rounded-md skeleton', className].join(' ')} />
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
    return <div className={['rounded-xl skeleton', className].join(' ')} />
}

export function SkeletonCard() {
    return (
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-3">
            <SkeletonLine className="w-1/3" />
            <SkeletonLine className="w-3/4 h-8" />
            <SkeletonLine className="w-1/2" />
        </div>
    )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)]">
                <SkeletonLine className="w-1/4" />
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b border-[var(--color-border)] last:border-0">
                    <SkeletonBlock className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                        <SkeletonLine className="w-1/3" />
                        <SkeletonLine className="w-1/2 h-3" />
                    </div>
                    <SkeletonLine className="w-16 h-6 rounded-full" />
                </div>
            ))}
        </div>
    )
}
