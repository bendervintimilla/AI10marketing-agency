'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiPatch } from '@/lib/api';

const INDUSTRIES = [
    'Technology', 'Retail & E-commerce', 'Health & Wellness', 'Food & Beverage',
    'Fashion & Apparel', 'Financial Services', 'Real Estate', 'Education',
    'Entertainment', 'Travel & Hospitality', 'Non-profit', 'Other',
];

export default function ProfilePage() {
    const { user } = useAuth();
    const [form, setForm] = useState({ name: 'My Agency', industry: 'Technology', logo: '' });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await apiPatch(`/organizations/${user?.orgId}`, { name: form.name, industry: form.industry });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-white mb-1">Organization Profile</h2>
            <p className="text-gray-400 text-sm mb-8">Update your organization's public information</p>

            <form onSubmit={handleSave} className="space-y-6 max-w-lg">
                {/* Logo */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Logo</label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-2xl">
                            🏢
                        </div>
                        <button
                            type="button"
                            className="px-4 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-colors"
                        >
                            Upload Logo
                        </button>
                    </div>
                </div>

                {/* Organization Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="Your agency name"
                    />
                </div>

                {/* Industry */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Industry</label>
                    <select
                        value={form.industry}
                        onChange={(e) => setForm({ ...form, industry: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                        {INDUSTRIES.map((ind) => (
                            <option key={ind} value={ind}>{ind}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-medium text-white transition-all shadow-lg shadow-indigo-500/20"
                    >
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    {saved && (
                        <span className="text-sm text-green-400 flex items-center gap-1">
                            ✓ Saved successfully
                        </span>
                    )}
                </div>
            </form>
        </div>
    );
}
