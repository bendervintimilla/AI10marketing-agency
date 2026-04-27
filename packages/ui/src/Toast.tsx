'use client'

import React, { createContext, useCallback, useContext, useReducer } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: string
    type: ToastType
    title: string
    message?: string
    duration?: number
}

interface ToastContextValue {
    toasts: Toast[]
    toast: (opts: Omit<Toast, 'id'>) => void
    dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>({
    toasts: [],
    toast: () => { },
    dismiss: () => { },
})

type Action =
    | { type: 'ADD'; toast: Toast }
    | { type: 'REMOVE'; id: string }

function reducer(state: Toast[], action: Action): Toast[] {
    switch (action.type) {
        case 'ADD':
            return [action.toast, ...state].slice(0, 5)
        case 'REMOVE':
            return state.filter((t) => t.id !== action.id)
        default:
            return state
    }
}

const ICONS: Record<ToastType, React.ReactNode> = {
    success: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    ),
    error: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    warning: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
    ),
    info: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
}

const TYPE_CLASSES: Record<ToastType, string> = {
    success: 'text-emerald-400 bg-emerald-500/10',
    error: 'text-red-400 bg-red-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    info: 'text-blue-400 bg-blue-500/10',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, dispatch] = useReducer(reducer, [])

    const dismiss = useCallback((id: string) => {
        dispatch({ type: 'REMOVE', id })
    }, [])

    const toast = useCallback(
        (opts: Omit<Toast, 'id'>) => {
            const id = Math.random().toString(36).slice(2)
            dispatch({ type: 'ADD', toast: { ...opts, id } })
            const duration = opts.duration ?? 4000
            if (duration > 0) {
                setTimeout(() => dispatch({ type: 'REMOVE', id }), duration)
            }
        },
        []
    )

    return (
        <ToastContext.Provider value={{ toasts, toast, dismiss }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={[
                            'pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl',
                            'bg-[var(--color-surface)] border border-[var(--color-border)]',
                            'shadow-2xl max-w-sm w-full animate-slide-up',
                        ].join(' ')}
                    >
                        <div className={['rounded-full p-1 shrink-0', TYPE_CLASSES[t.type]].join(' ')}>
                            {ICONS[t.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text)]">{t.title}</p>
                            {t.message && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t.message}</p>
                            )}
                        </div>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="shrink-0 text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export const useToast = () => useContext(ToastContext)
