'use client'

import React from 'react'
import { Button } from './Button'

export interface EmptyStateProps {
    icon?: React.ReactNode
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
    className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
    return (
        <div
            className={[
                'flex flex-col items-center justify-center text-center py-16 px-8',
                'rounded-xl border-2 border-dashed border-[var(--color-border)]',
                className,
            ].join(' ')}
        >
            {icon && (
                <div className="mb-4 text-[var(--color-text-subtle)] opacity-40">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
            {description && (
                <p className="mt-1.5 text-sm text-[var(--color-text-muted)] max-w-sm">{description}</p>
            )}
            {action && (
                <div className="mt-6">
                    <Button onClick={action.onClick}>{action.label}</Button>
                </div>
            )}
        </div>
    )
}
