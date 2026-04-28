'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

const TABS = [
    { href: '/dashboard/settings/profile', tKey: 'settings.tabs.profile', icon: '👤' },
    { href: '/dashboard/settings/brand', tKey: 'settings.tabs.brand', icon: '🎨' },
    { href: '/dashboard/settings/accounts', tKey: 'settings.tabs.accounts', icon: '🔗' },
    { href: '/dashboard/settings/team', tKey: 'settings.tabs.team', icon: '👥' },
    { href: '/dashboard/settings/billing', tKey: 'settings.tabs.billing', icon: '💳' },
    { href: '/dashboard/settings/notifications', tKey: 'settings.tabs.notifications', icon: '🔔' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { t } = useTranslation();

    return (
        <div className="min-h-screen text-[var(--color-text)]">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[var(--color-text)]">{t('settings.title')}</h1>
                    <p className="text-[var(--color-text-muted)] mt-1">{t('settings.subtitle')}</p>
                </div>

                <div className="flex gap-8">
                    {/* Sidebar */}
                    <aside className="w-56 flex-shrink-0">
                        <nav className="space-y-1">
                            {TABS.map((tab) => {
                                const active = pathname === tab.href;
                                return (
                                    <Link
                                        key={tab.href}
                                        href={tab.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${active
                                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]'
                                            }`}
                                    >
                                        <span className="text-base">{tab.icon}</span>
                                        {t(tab.tKey)}
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Main content */}
                    <main className="flex-1 min-w-0">
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
