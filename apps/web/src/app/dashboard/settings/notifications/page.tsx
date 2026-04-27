'use client';

import { useState } from 'react';

type Prefs = {
    notifEmailBilling: boolean;
    notifEmailAds: boolean;
    notifInAppBilling: boolean;
    notifInAppAds: boolean;
    autoPilot: boolean;
};

function Toggle({
    enabled,
    onChange,
    label,
    description,
}: {
    enabled: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description?: string;
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-white">{label}</p>
                {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
            </div>
            <button
                type="button"
                onClick={() => onChange(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${enabled ? 'bg-indigo-600' : 'bg-gray-700'
                    }`}
                aria-checked={enabled}
                role="switch"
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );
}

export default function NotificationsPage() {
    const [prefs, setPrefs] = useState<Prefs>({
        notifEmailBilling: true,
        notifEmailAds: true,
        notifInAppBilling: true,
        notifInAppAds: true,
        autoPilot: false,
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const set = (key: keyof Prefs) => (val: boolean) =>
        setPrefs((p) => ({ ...p, [key]: val }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        // TODO: PATCH /api/users/:id/preferences and toggle auto-pilot via Agent 8
        await new Promise((r) => setTimeout(r, 800));
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-white mb-1">Notifications & Preferences</h2>
            <p className="text-gray-400 text-sm mb-8">Control how and when you receive updates</p>

            <form onSubmit={handleSave} className="max-w-lg space-y-8">
                {/* Auto-pilot */}
                <div className="p-5 rounded-xl border border-purple-500/30 bg-purple-500/10">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="font-semibold text-white flex items-center gap-2">
                                🤖 AI Auto-Pilot
                                <span className="text-xs font-normal px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                                    Pro+
                                </span>
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                Let the AI automatically apply recommendations, schedule posts, and optimize your campaigns without manual approval.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => set('autoPilot')(!prefs.autoPilot)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${prefs.autoPilot ? 'bg-purple-600' : 'bg-gray-700'
                                }`}
                            aria-checked={prefs.autoPilot}
                            role="switch"
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${prefs.autoPilot ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Email Notifications */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                        <span className="text-base">📧</span> Email Notifications
                    </h3>
                    <div className="space-y-4">
                        <Toggle
                            enabled={prefs.notifEmailBilling}
                            onChange={set('notifEmailBilling')}
                            label="Billing alerts"
                            description="Payment failures, subscription changes, upcoming renewals"
                        />
                        <div className="border-t border-white/5" />
                        <Toggle
                            enabled={prefs.notifEmailAds}
                            onChange={set('notifEmailAds')}
                            label="Ad activity"
                            description="Generation complete, publishing results, performance reports"
                        />
                    </div>
                </div>

                {/* In-App Notifications */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                        <span className="text-base">🔔</span> In-App Notifications
                    </h3>
                    <div className="space-y-4">
                        <Toggle
                            enabled={prefs.notifInAppBilling}
                            onChange={set('notifInAppBilling')}
                            label="Billing alerts"
                            description="Payment issues and subscription updates"
                        />
                        <div className="border-t border-white/5" />
                        <Toggle
                            enabled={prefs.notifInAppAds}
                            onChange={set('notifInAppAds')}
                            label="Ad generation & publishing"
                            description="Status updates, AI recommendations"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-medium text-white transition-all shadow-lg shadow-indigo-500/20"
                    >
                        {saving ? 'Saving…' : 'Save Preferences'}
                    </button>
                    {saved && <span className="text-sm text-green-400">✓ Preferences saved</span>}
                </div>
            </form>
        </div>
    );
}
