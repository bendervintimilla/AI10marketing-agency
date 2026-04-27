'use client'

import React from 'react'

interface SparklineProps {
    data: number[]
    color?: string
    width?: number
    height?: number
}

function Sparkline({ data, color = '#8b5cf6', width = 80, height = 32 }: SparklineProps) {
    if (!data || data.length < 2) return null
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const step = width / (data.length - 1)

    const points = data.map((v, i) => {
        const x = i * step
        const y = height - ((v - min) / range) * height
        return `${x},${y}`
    })

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
            <polyline
                className="sparkline-path"
                points={points.join(' ')}
                stroke={color}
                fill="none"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export interface MetricCardProps {
    label: string
    value: string | number
    change?: number
    changeLabel?: string
    sparkline?: number[]
    icon?: React.ReactNode
    className?: string
}

export function MetricCard({
    label,
    value,
    change,
    changeLabel,
    sparkline,
    icon,
    className = '',
}: MetricCardProps) {
    const isPositive = change !== undefined && change >= 0
    const isNeutral = change === undefined

    return (
        <div
            className={[
                'rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]',
                'p-5 flex flex-col gap-3 hover:border-violet-500/30 transition-all duration-200',
                'hover:shadow-lg hover:shadow-violet-500/5',
                className,
            ].join(' ')}
        >
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                        {label}
                    </span>
                    <span className="text-3xl font-bold text-[var(--color-text)] leading-none tabular-nums">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </span>
                </div>
                {icon && (
                    <div className="rounded-lg p-2.5 bg-violet-500/10 text-violet-400 shrink-0">
                        {icon}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between">
                {!isNeutral && (
                    <div
                        className={[
                            'flex items-center gap-1 text-xs font-medium',
                            isPositive ? 'text-emerald-400' : 'text-red-400',
                        ].join(' ')}
                    >
                        <svg
                            className={['h-3.5 w-3.5', !isPositive && 'rotate-180'].join(' ')}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        {Math.abs(change!)}%{changeLabel && <span className="text-[var(--color-text-subtle)] font-normal ml-0.5">{changeLabel}</span>}
                    </div>
                )}
                {sparkline && <Sparkline data={sparkline} color={isPositive ? '#34d399' : '#f87171'} />}
            </div>
        </div>
    )
}
