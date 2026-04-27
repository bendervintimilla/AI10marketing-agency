'use client'

import React, { useEffect, useRef, useState } from 'react'

export interface DropdownOption {
    label: string
    value: string
    icon?: React.ReactNode
    disabled?: boolean
    danger?: boolean
    divider?: boolean
}

export interface DropdownProps {
    trigger: React.ReactNode
    options: DropdownOption[]
    onSelect: (value: string) => void
    align?: 'left' | 'right'
}

export function Dropdown({ trigger, options, onSelect, align = 'left' }: DropdownProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    return (
        <div ref={ref} className="relative inline-block">
            <div onClick={() => setOpen((v) => !v)} className="cursor-pointer">
                {trigger}
            </div>

            {open && (
                <div
                    className={[
                        'absolute z-[var(--z-dropdown)] mt-2 w-48 origin-top',
                        'bg-[var(--color-surface)] rounded-xl shadow-2xl',
                        'border border-[var(--color-border)] py-1 animate-slide-up',
                        align === 'right' ? 'right-0' : 'left-0',
                    ].join(' ')}
                >
                    {options.map((opt, i) =>
                        opt.divider ? (
                            <div key={i} className="my-1 border-t border-[var(--color-border)]" />
                        ) : (
                            <button
                                key={opt.value}
                                disabled={opt.disabled}
                                onClick={() => {
                                    if (!opt.disabled) {
                                        onSelect(opt.value)
                                        setOpen(false)
                                    }
                                }}
                                className={[
                                    'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left',
                                    'transition-colors duration-100',
                                    opt.danger
                                        ? 'text-red-400 hover:bg-red-500/10'
                                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]',
                                    opt.disabled && 'opacity-40 cursor-not-allowed',
                                ].join(' ')}
                            >
                                {opt.icon && <span className="shrink-0 h-4 w-4">{opt.icon}</span>}
                                {opt.label}
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    )
}
