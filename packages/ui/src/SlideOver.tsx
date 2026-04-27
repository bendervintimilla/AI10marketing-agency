'use client'

import React, { useEffect, useRef } from 'react'

export interface SlideOverProps {
    open: boolean
    onClose: () => void
    title?: string
    side?: 'right' | 'left'
    size?: 'sm' | 'md' | 'lg'
    children: React.ReactNode
}

const sizeClasses: Record<NonNullable<SlideOverProps['size']>, string> = {
    sm: 'max-w-xs',
    md: 'max-w-md',
    lg: 'max-w-2xl',
}

export function SlideOver({
    open,
    onClose,
    title,
    side = 'right',
    size = 'md',
    children,
}: SlideOverProps) {
    useEffect(() => {
        if (!open) return
        const handleKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', handleKey)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handleKey)
            document.body.style.overflow = ''
        }
    }, [open, onClose])

    return (
        <>
            {/* Backdrop */}
            <div
                className={[
                    'fixed inset-0 z-[var(--z-modal)] transition-opacity duration-300',
                    open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
                ].join(' ')}
                onClick={onClose}
            >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            </div>

            {/* Panel */}
            <div
                className={[
                    'fixed inset-y-0 z-[calc(var(--z-modal)+1)] flex w-full flex-col',
                    'bg-[var(--color-surface)] shadow-2xl border-[var(--color-border)]',
                    'transition-transform duration-300 ease-out',
                    sizeClasses[size],
                    side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
                    open
                        ? 'translate-x-0'
                        : side === 'right'
                            ? 'translate-x-full'
                            : '-translate-x-full',
                ].join(' ')}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
                    {title && (
                        <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
                    )}
                    <button
                        onClick={onClose}
                        className="ml-auto rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] transition-colors"
                        aria-label="Close"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">{children}</div>
            </div>
        </>
    )
}
