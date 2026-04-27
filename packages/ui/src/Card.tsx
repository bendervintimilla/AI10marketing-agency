'use client'

import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'elevated' | 'outline'
    padding?: 'none' | 'sm' | 'md' | 'lg'
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
    default:
        'bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm',
    glass:
        'bg-white/5 dark:bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-xl',
    elevated:
        'bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg',
    outline:
        'border-2 border-[var(--color-border-strong)] bg-transparent',
}

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
}

export function Card({
    variant = 'default',
    padding = 'md',
    className = '',
    children,
    ...props
}: CardProps) {
    return (
        <div
            className={[
                'rounded-xl',
                variantClasses[variant],
                paddingClasses[padding],
                className,
            ].join(' ')}
            {...props}
        >
            {children}
        </div>
    )
}

export function CardHeader({
    className = '',
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={['flex items-center justify-between mb-4', className].join(' ')}
            {...props}
        >
            {children}
        </div>
    )
}

export function CardTitle({
    className = '',
    children,
    ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={['text-base font-semibold text-[var(--color-text)]', className].join(' ')}
            {...props}
        >
            {children}
        </h3>
    )
}
