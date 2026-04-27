'use client'

import React, { useEffect, useRef } from 'react'

export interface ModalProps {
    open: boolean
    onClose: () => void
    title?: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    children: React.ReactNode
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]',
}

export function Modal({
    open,
    onClose,
    title,
    description,
    size = 'md',
    children,
}: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handleKey)
            document.body.style.overflow = ''
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
            onClick={(e) => e.target === overlayRef.current && onClose()}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

            {/* Panel */}
            <div
                className={[
                    'relative w-full bg-[var(--color-surface)] rounded-2xl shadow-2xl',
                    'border border-[var(--color-border)] animate-slide-up',
                    sizeClasses[size],
                ].join(' ')}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
            >
                {/* Header */}
                {(title || description) && (
                    <div className="flex items-start justify-between p-6 border-b border-[var(--color-border)]">
                        <div>
                            {title && (
                                <h2 id="modal-title" className="text-lg font-semibold text-[var(--color-text)]">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="ml-4 rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-colors"
                            aria-label="Close"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="p-6">{children}</div>
            </div>
        </div>
    )
}
