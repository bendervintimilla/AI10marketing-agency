'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Notification = {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
};

const TYPE_ICONS: Record<string, string> = {
    AD_GENERATION_COMPLETE: '🎨',
    AD_PUBLISHED: '🚀',
    AI_RECOMMENDATION: '🤖',
    BILLING_ALERT: '💳',
    PAYMENT_FAILED: '⚠️',
    TEAM_INVITE: '👥',
    GENERAL: '🔔',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell({ userId }: { userId: string }) {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Connect to SSE stream
    useEffect(() => {
        if (!userId) return;

        const es = new EventSource(`${API_BASE}/notifications/stream?userId=${userId}`);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setUnreadCount(data.unreadCount || 0);
                if (data.notifications) {
                    setNotifications(data.notifications);
                }
            } catch {
                // ignore parse errors
            }
        };

        es.onerror = () => {
            es.close();
        };

        return () => {
            es.close();
        };
    }, [userId]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchAll = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/notifications?userId=${userId}&includeRead=true&limit=20`);
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const handleOpen = () => {
        setOpen((prev) => !prev);
        if (!open) fetchAll();
    };

    const markRead = async (id: string) => {
        try {
            await fetch(`${API_BASE}/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch {
            // ignore
        }
    };

    const markAllRead = async () => {
        try {
            await fetch(`${API_BASE}/notifications/read-all`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch {
            // ignore
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                id="notification-bell-btn"
                onClick={handleOpen}
                className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 00-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <h3 className="text-sm font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto">
                        {loading && (
                            <div className="py-8 text-center text-gray-500 text-sm">Loading…</div>
                        )}
                        {!loading && notifications.length === 0 && (
                            <div className="py-8 text-center">
                                <div className="text-3xl mb-2">🔔</div>
                                <p className="text-sm text-gray-500">You're all caught up!</p>
                            </div>
                        )}
                        {!loading &&
                            notifications.map((notif) => (
                                <button
                                    key={notif.id}
                                    onClick={() => markRead(notif.id)}
                                    className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${!notif.read ? 'bg-indigo-500/5' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl flex-shrink-0 mt-0.5">
                                            {TYPE_ICONS[notif.type] || '🔔'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-white truncate">{notif.title}</p>
                                                {!notif.read && (
                                                    <span className="w-2 h-2 bg-indigo-400 rounded-full flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                                            <p className="text-xs text-gray-600 mt-1">{timeAgo(notif.createdAt)}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-white/10">
                            <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                                View all notifications →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
