'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
    { href: '/dashboard/settings/profile', label: 'Profile', icon: '👤' },
    { href: '/dashboard/settings/brand', label: 'Brand', icon: '🎨' },
    { href: '/dashboard/settings/accounts', label: 'Accounts', icon: '🔗' },
    { href: '/dashboard/settings/team', label: 'Team', icon: '👥' },
    { href: '/dashboard/settings/billing', label: 'Billing', icon: '💳' },
    { href: '/dashboard/settings/notifications', label: 'Notifications', icon: '🔔' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Settings</h1>
                    <p className="text-gray-400 mt-1">Manage your organization, billing, and preferences</p>
                </div>

                <div className="flex gap-8">
                    {/* Sidebar */}
                    <aside className="w-56 flex-shrink-0">
                        <nav className="space-y-1">
                            {tabs.map((tab) => {
                                const active = pathname === tab.href;
                                return (
                                    <Link
                                        key={tab.href}
                                        href={tab.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${active
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <span className="text-base">{tab.icon}</span>
                                        {tab.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Main content */}
                    <main className="flex-1 min-w-0">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
