'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Account = {
    id: string;
    platform: 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK';
    handle: string;
    connected: boolean;
    avatar?: string;
};

const PLATFORM_META: Record<string, { label: string; color: string; icon: string }> = {
    INSTAGRAM: { label: 'Instagram', color: 'from-pink-500 to-purple-600', icon: '📸' },
    TIKTOK: { label: 'TikTok', color: 'from-gray-900 to-gray-700', icon: '🎵' },
    FACEBOOK: { label: 'Facebook', color: 'from-blue-600 to-blue-800', icon: '👤' },
};

const MOCK_ACCOUNTS: Account[] = [
    { id: '1', platform: 'INSTAGRAM', handle: '@myagency', connected: true },
    { id: '2', platform: 'TIKTOK', handle: '', connected: false },
    { id: '3', platform: 'FACEBOOK', handle: '', connected: false },
];

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
    const [connecting, setConnecting] = useState<string | null>(null);

    const handleConnect = async (id: string, platform: string) => {
        setConnecting(id);
        try {
            // Redirect to OAuth flow  
            window.location.href = `${API}/publish/auth/${platform.toLowerCase()}`;
        } catch {
            setConnecting(null);
            alert('Failed to start OAuth flow. Make sure the API is running.');
        }
    };

    const handleDisconnect = async (id: string) => {
        try {
            await fetch(`${API}/publish/accounts/${id}`, { method: 'DELETE' });
            setAccounts(prev => prev.map(a => a.id === id ? { ...a, connected: false, handle: '' } : a));
        } catch {
            alert('Failed to disconnect account');
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-white mb-1">Connected Accounts</h2>
            <p className="text-gray-400 text-sm mb-8">Connect your social media platforms to publish ads</p>

            <div className="space-y-4">
                {accounts.map((account) => {
                    const meta = PLATFORM_META[account.platform];
                    return (
                        <div
                            key={account.id}
                            className="flex items-center justify-between p-5 rounded-xl border border-white/10 bg-white/3 hover:bg-white/5 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-xl shadow-lg`}>
                                    {meta.icon}
                                </div>
                                <div>
                                    <p className="font-medium text-white">{meta.label}</p>
                                    {account.connected ? (
                                        <p className="text-sm text-green-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                            Connected · {account.handle}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-500">Not connected</p>
                                    )}
                                </div>
                            </div>

                            {account.connected ? (
                                <button
                                    onClick={() => handleDisconnect(account.id)}
                                    className="px-4 py-2 text-sm border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                                >
                                    Disconnect
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleConnect(account.id, account.platform)}
                                    disabled={connecting === account.id}
                                    className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg transition-all"
                                >
                                    {connecting === account.id ? 'Connecting…' : 'Connect'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-300">
                    💡 Connected accounts allow the AI to auto-publish ads and analyze performance across platforms.
                </p>
            </div>
        </div>
    );
}
