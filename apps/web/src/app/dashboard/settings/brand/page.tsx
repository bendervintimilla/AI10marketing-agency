'use client';

import { useState } from 'react';

const FONTS = ['Inter', 'Roboto', 'Poppins', 'Playfair Display', 'Montserrat', 'Lato', 'Open Sans'];
const VOICE_TONES = ['Professional', 'Friendly', 'Authoritative', 'Playful', 'Inspirational', 'Minimalist', 'Bold'];

export default function BrandPage() {
    const [form, setForm] = useState({
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        fontFamily: 'Inter',
        voiceTone: 'Professional',
        targetAudience: '',
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        // TODO: call API PATCH /api/brand-settings
        await new Promise(r => setTimeout(r, 800));
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-white mb-1">Brand Settings</h2>
            <p className="text-gray-400 text-sm mb-8">Define your brand identity for AI-generated content</p>

            <form onSubmit={handleSave} className="space-y-6 max-w-lg">
                {/* Colors */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Brand Colors</label>
                    <div className="flex gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <div
                                className="w-14 h-14 rounded-xl border-2 border-white/20 cursor-pointer shadow-lg"
                                style={{ backgroundColor: form.primaryColor }}
                            />
                            <input
                                type="color"
                                value={form.primaryColor}
                                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                                className="sr-only"
                                id="primaryColor"
                            />
                            <label htmlFor="primaryColor" className="text-xs text-gray-400 cursor-pointer hover:text-white transition-colors">
                                Primary
                            </label>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div
                                className="w-14 h-14 rounded-xl border-2 border-white/20 cursor-pointer shadow-lg"
                                style={{ backgroundColor: form.secondaryColor }}
                            />
                            <input
                                type="color"
                                value={form.secondaryColor}
                                onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                                className="sr-only"
                                id="secondaryColor"
                            />
                            <label htmlFor="secondaryColor" className="text-xs text-gray-400 cursor-pointer hover:text-white transition-colors">
                                Secondary
                            </label>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Click a swatch to pick a color</p>
                </div>

                {/* Font */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Font Family</label>
                    <div className="grid grid-cols-2 gap-2">
                        {FONTS.map((font) => (
                            <button
                                key={font}
                                type="button"
                                onClick={() => setForm({ ...form, fontFamily: font })}
                                className={`px-4 py-2.5 rounded-xl text-sm border transition-all ${form.fontFamily === font
                                        ? 'border-indigo-500 bg-indigo-500/20 text-white'
                                        : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                    }`}
                                style={{ fontFamily: font }}
                            >
                                {font}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Voice & Tone */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Voice & Tone</label>
                    <div className="flex flex-wrap gap-2">
                        {VOICE_TONES.map((tone) => (
                            <button
                                key={tone}
                                type="button"
                                onClick={() => setForm({ ...form, voiceTone: tone })}
                                className={`px-4 py-2 rounded-full text-sm border transition-all ${form.voiceTone === tone
                                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                                        : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                    }`}
                            >
                                {tone}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Target Audience */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
                    <textarea
                        value={form.targetAudience}
                        onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
                        placeholder="e.g. Small business owners aged 25-45, interested in digital marketing…"
                    />
                </div>

                {/* Preview */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/3">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Preview</p>
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: form.primaryColor }} />
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: form.secondaryColor }} />
                        </div>
                        <p className="text-sm text-gray-300" style={{ fontFamily: form.fontFamily }}>
                            <span className="text-gray-500">{form.voiceTone} voice · </span>
                            {form.fontFamily} font
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-medium text-white transition-all shadow-lg shadow-indigo-500/20"
                    >
                        {saving ? 'Saving…' : 'Save Brand Settings'}
                    </button>
                    {saved && <span className="text-sm text-green-400">✓ Saved successfully</span>}
                </div>
            </form>
        </div>
    );
}
