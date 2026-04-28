/**
 * Lightweight i18n for the dashboard.
 *
 * Why custom (not next-intl/react-i18next):
 *   - Single nested-JSON dictionary, no loader/middleware ceremony.
 *   - Works inside any client component via useTranslation().
 *   - Persists choice in localStorage; falls back to navigator.language.
 *
 * Adding a new string:
 *   1. Add the key to en.json
 *   2. Add the same key to es.json
 *   3. Use t('section.key') in the component
 *   4. For variables: t('foo.bar', { name: 'Juan' }) and write "{name}" in the JSON
 *
 * Missing keys fall back to the key itself so the page never blanks out.
 */
'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from './locales/en.json'
import es from './locales/es.json'

export type Locale = 'en' | 'es'

const DICTIONARIES: Record<Locale, any> = { en, es }
const STORAGE_KEY = 'ai10:locale'

interface LocaleContextValue {
    locale: Locale
    setLocale: (l: Locale) => void
    t: (key: string, vars?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue>({
    locale: 'en',
    setLocale: () => { },
    t: (key) => key,
})

function detectInitial(): Locale {
    if (typeof window === 'undefined') return 'en'
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored === 'en' || stored === 'es') return stored
    const nav = (window.navigator?.language ?? '').toLowerCase()
    return nav.startsWith('es') ? 'es' : 'en'
}

function lookup(dict: any, key: string): string | null {
    const parts = key.split('.')
    let cur: any = dict
    for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
        else return null
    }
    return typeof cur === 'string' ? cur : null
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
    if (!vars) return template
    return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en')

    useEffect(() => {
        setLocaleState(detectInitial())
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') return
        document.documentElement.lang = locale
    }, [locale])

    const setLocale = useCallback((l: Locale) => {
        setLocaleState(l)
        if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, l)
    }, [])

    const t = useCallback((key: string, vars?: Record<string, string | number>) => {
        const dict = DICTIONARIES[locale]
        const fallback = DICTIONARIES.en
        const raw = lookup(dict, key) ?? lookup(fallback, key) ?? key
        return interpolate(raw, vars)
    }, [locale])

    const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t])

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useTranslation() {
    return useContext(LocaleContext)
}
