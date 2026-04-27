'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

/* ─── Nav Items ─── */
interface NavItem {
    label: string
    href: string
    icon: React.ReactNode
    badge?: string | number
}

function IconDashboard() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
    )
}
function IconCampaigns() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
        </svg>
    )
}
function IconMedia() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    )
}
function IconAnalytics() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    )
}
function IconAI() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
    )
}
function IconSettings() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    )
}
function IconBell() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
    )
}
function IconMenu() {
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
    )
}
function IconChevronRight() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
    )
}
function IconLogout() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
    )
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <IconDashboard /> },
    { label: 'Brand Audits', href: '/dashboard/audits', icon: <IconAnalytics /> },
    { label: 'Campaigns', href: '/dashboard/campaigns', icon: <IconCampaigns /> },
    { label: 'Media Library', href: '/dashboard/media', icon: <IconMedia /> },
    { label: 'Analytics', href: '/dashboard/analytics', icon: <IconAnalytics /> },
    { label: 'AI Insights', href: '/dashboard/ai-insights', icon: <IconAI />, badge: 7 },
    { label: 'Settings', href: '/dashboard/settings', icon: <IconSettings /> },
]

/* ─── Sidebar ─── */
function Sidebar({ open, onClose, userInitials, userEmail, userName, orgInitials, orgName, userRole, onLogout }: {
    open: boolean; onClose: () => void;
    userInitials: string; userEmail: string; userName: string;
    orgInitials: string; orgName: string; userRole: string;
    onLogout: () => void;
}) {
    const pathname = usePathname()

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard'
        return pathname.startsWith(href)
    }

    return (
        <>
            {/* Mobile backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-[5999] bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={[
                    'fixed inset-y-0 left-0 z-[var(--z-sidebar)] flex flex-col',
                    'w-[var(--sidebar-width)] bg-[var(--color-surface)] border-r border-[var(--color-border)]',
                    'transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                ].join(' ')}
            >
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--color-border)]">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[var(--color-text)]">AdAgency AI</p>
                        <p className="text-[10px] text-[var(--color-text-subtle)] font-medium">Marketing Platform</p>
                    </div>
                </div>

                {/* Org switcher */}
                <div className="px-3 py-3 border-b border-[var(--color-border)]">
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors text-left">
                        <div className="h-8 w-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-violet-400">{orgInitials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--color-text)] truncate">{orgName}</p>
                            <p className="text-[10px] text-[var(--color-text-subtle)]">{userRole} account</p>
                        </div>
                        <svg className="h-4 w-4 text-[var(--color-text-subtle)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                        </svg>
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={[
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                                isActive(item.href)
                                    ? 'bg-violet-600/15 text-violet-400 border border-violet-500/20'
                                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]',
                            ].join(' ')}
                        >
                            <span className={isActive(item.href) ? 'text-violet-400' : 'text-[var(--color-text-subtle)]'}>
                                {item.icon}
                            </span>
                            <span className="flex-1">{item.label}</span>
                            {item.badge !== undefined && (
                                <span className="h-5 min-w-[1.25rem] rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* User footer */}
                <div className="px-3 py-3 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white">{userInitials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--color-text)] truncate">{userName}</p>
                            <p className="text-[10px] text-[var(--color-text-subtle)] truncate">{userEmail}</p>
                        </div>
                        <button onClick={onLogout} className="text-[var(--color-text-subtle)] hover:text-red-400 transition-colors" title="Logout">
                            <IconLogout />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    )
}

/* ─── Breadcrumb ─── */
function Breadcrumb() {
    const pathname = usePathname()
    const segments = pathname.split('/').filter(Boolean)

    const crumbs = segments.map((seg, i) => ({
        label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
        href: '/' + segments.slice(0, i + 1).join('/'),
        isLast: i === segments.length - 1,
    }))

    return (
        <nav className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            {crumbs.map((crumb, i) => (
                <React.Fragment key={crumb.href}>
                    {i > 0 && <span className="text-[var(--color-text-subtle)]"><IconChevronRight /></span>}
                    {crumb.isLast ? (
                        <span className="font-semibold text-[var(--color-text)]">{crumb.label}</span>
                    ) : (
                        <Link href={crumb.href} className="hover:text-[var(--color-text)] transition-colors">
                            {crumb.label}
                        </Link>
                    )}
                </React.Fragment>
            ))}
        </nav>
    )
}

/* ─── Topbar ─── */
function Topbar({ onMenuClick, userInitials, userName, userEmail, onLogout }: {
    onMenuClick: () => void; userInitials: string; userName: string; userEmail: string; onLogout: () => void;
}) {
    const [showNotifications, setShowNotifications] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)

    const notifications = [
        { id: 1, text: 'Campaign "Summer Sale" reached 10K reach', time: '2m ago', unread: true },
        { id: 2, text: 'AI suggests pausing "Ad #42" – low ROAS', time: '15m ago', unread: true },
        { id: 3, text: '"Brand Awareness" campaign approved', time: '1h ago', unread: false },
    ]

    return (
        <header className="sticky top-0 z-40 flex items-center gap-3 px-4 lg:px-6 h-14 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
            {/* Hamburger (mobile only) */}
            <button
                onClick={onMenuClick}
                className="flex lg:hidden items-center justify-center h-8 w-8 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] transition-colors"
            >
                <IconMenu />
            </button>

            {/* Breadcrumb */}
            <div className="flex-1 min-w-0">
                <Breadcrumb />
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
                {/* Notifications */}
                <div className="relative">
                    <button
                        id="notification-bell"
                        onClick={() => { setShowNotifications((v) => !v); setShowUserMenu(false) }}
                        className="relative flex items-center justify-center h-8 w-8 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-colors"
                    >
                        <IconBell />
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border border-[var(--color-surface)]" />
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                                <h3 className="text-sm font-semibold text-[var(--color-text)]">Notifications</h3>
                                <button className="text-xs text-violet-400 hover:text-violet-300">Mark all read</button>
                            </div>
                            <div className="divide-y divide-[var(--color-border)]">
                                {notifications.map((n) => (
                                    <div key={n.id} className={['flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer', n.unread ? 'bg-violet-500/5' : ''].join(' ')}>
                                        {n.unread && <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0 mt-1.5" />}
                                        {!n.unread && <span className="h-2 w-2 shrink-0 mt-1.5" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-[var(--color-text)] leading-relaxed">{n.text}</p>
                                            <p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">{n.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 py-2.5 border-t border-[var(--color-border)]">
                                <button className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-subtle)] w-full text-center">View all notifications</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* User avatar dropdown */}
                <div className="relative">
                    <button
                        id="user-avatar"
                        onClick={() => { setShowUserMenu((v) => !v); setShowNotifications(false) }}
                        className="flex items-center gap-2 h-8 pl-1 pr-2 rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors"
                    >
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-white">{userInitials}</span>
                        </div>
                        <span className="hidden md:block text-xs font-medium text-[var(--color-text-muted)]">{userName}</span>
                        <svg className="h-3.5 w-3.5 text-[var(--color-text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                    </button>

                    {showUserMenu && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
                            <div className="px-4 py-3 border-b border-[var(--color-border)]">
                                <p className="text-sm font-semibold text-[var(--color-text)]">{userName}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">{userEmail}</p>
                            </div>
                            <div className="py-1">
                                {[
                                    { label: 'Profile', href: '/dashboard/settings/profile' },
                                    { label: 'Billing', href: '/dashboard/settings/billing' },
                                    { label: 'Settings', href: '/dashboard/settings' },
                                ].map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setShowUserMenu(false)}
                                        className="block px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                            <div className="py-1 border-t border-[var(--color-border)]">
                                <button
                                    onClick={onLogout}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full text-left"
                                >
                                    <IconLogout />
                                    Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

/* ─── Dashboard Layout ─── */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { user, isLoading, logout } = useAuth()
    const router = useRouter()

    // Auth guard: redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login')
        }
    }, [isLoading, user, router])

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    // derived user info
    const userEmail = user?.email || ''
    const userName = userEmail.split('@')[0] || 'User'
    const userInitials = userName.slice(0, 2).toUpperCase()
    const orgName = 'My Agency' // TODO: fetch org name from API
    const orgInitials = orgName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const userRole = user?.role || 'User'

    // Show nothing while checking auth
    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg)]">
            <Sidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                userInitials={userInitials}
                userEmail={userEmail}
                userName={userName}
                orgInitials={orgInitials}
                orgName={orgName}
                userRole={userRole}
                onLogout={handleLogout}
            />

            {/* Main content offset by sidebar on desktop */}
            <div className="lg:pl-[var(--sidebar-width)] flex flex-col min-h-screen">
                <Topbar
                    onMenuClick={() => setSidebarOpen(true)}
                    userInitials={userInitials}
                    userName={userName}
                    userEmail={userEmail}
                    onLogout={handleLogout}
                />

                <main className="flex-1 p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
