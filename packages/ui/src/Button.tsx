'use client'

import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
    size?: 'xs' | 'sm' | 'md' | 'lg'
    loading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
        'bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white shadow-md shadow-violet-500/20 hover:shadow-violet-500/30',
    secondary:
        'bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)]',
    ghost:
        'hover:bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
    danger:
        'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-md shadow-red-500/20',
    outline:
        'border border-violet-500 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
    xs: 'px-2.5 py-1 text-xs gap-1',
    sm: 'px-3.5 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
}

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    className = '',
    disabled,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={[
                'inline-flex items-center justify-center font-medium rounded-lg',
                'transition-all duration-150 ease-out',
                'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
                variantClasses[variant],
                sizeClasses[size],
                className,
            ].join(' ')}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <svg
                    className="animate-spin h-4 w-4 shrink-0"
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
            ) : (
                leftIcon && <span className="shrink-0">{leftIcon}</span>
            )}
            {children}
            {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </button>
    )
}
