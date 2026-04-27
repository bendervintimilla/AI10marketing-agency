'use client'

import React from 'react'

export type StatusVariant =
    | 'DRAFT'
    | 'ACTIVE'
    | 'PAUSED'
    | 'ARCHIVED'
    | 'SCHEDULED'
    | 'FAILED'
    | 'PENDING'
    | 'PROCESSING'

interface BadgeConfig {
    label: string
    classes: string
    dot?: string
}

const STATUS_MAP: Record<StatusVariant, BadgeConfig> = {
    DRAFT: {
        label: 'Draft',
        classes: 'bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30',
        dot: 'bg-slate-400',
    },
    ACTIVE: {
        label: 'Active',
        classes: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
        dot: 'bg-emerald-400',
    },
    PAUSED: {
        label: 'Paused',
        classes: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
        dot: 'bg-amber-400',
    },
    ARCHIVED: {
        label: 'Archived',
        classes: 'bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-500/30',
        dot: 'bg-zinc-400',
    },
    SCHEDULED: {
        label: 'Scheduled',
        classes: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30',
        dot: 'bg-blue-400',
    },
    FAILED: {
        label: 'Failed',
        classes: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
        dot: 'bg-red-400',
    },
    PENDING: {
        label: 'Pending',
        classes: 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30',
        dot: 'bg-orange-400',
    },
    PROCESSING: {
        label: 'Processing',
        classes: 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30',
        dot: 'bg-violet-400 animate-pulse',
    },
}

export interface StatusBadgeProps {
    status: StatusVariant
    showDot?: boolean
    size?: 'sm' | 'md'
}

export function StatusBadge({ status, showDot = true, size = 'md' }: StatusBadgeProps) {
    const config = STATUS_MAP[status] ?? STATUS_MAP.DRAFT

    return (
        <span
            className={[
                'inline-flex items-center gap-1.5 font-medium rounded-full',
                size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
                config.classes,
            ].join(' ')}
        >
            {showDot && (
                <span className={['h-1.5 w-1.5 rounded-full shrink-0', config.dot].join(' ')} />
            )}
            {config.label}
        </span>
    )
}
