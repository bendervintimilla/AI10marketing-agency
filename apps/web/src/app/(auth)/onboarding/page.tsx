'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Upload, Image as ImageIcon, Link2 } from 'lucide-react';

const STEPS = [
    { id: 1, title: 'Brand Identity', desc: 'Upload logo & colors' },
    { id: 2, title: 'Connect Socials', desc: 'Link your accounts' },
    { id: 3, title: 'First Product', desc: 'Upload product photos' },
];

export default function OnboardingWizard() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [logo, setLogo] = useState<File | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#6366f1');
    const [socials, setSocials] = useState({ instagram: false, tiktok: false, facebook: false });

    const handleNext = () => {
        if (currentStep < 3) setCurrentStep(prev => prev + 1);
        else handleComplete();
    };

    const handleComplete = async () => {
        setIsSubmitting(true);
        // Simulate finalizing onboarding
        setTimeout(() => {
            setIsSubmitting(false);
            router.push('/dashboard');
        }, 1500);
    };

    return (
        <div className="flex flex-col gap-8 w-full max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header & Progress indicator */}
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-semibold text-white tracking-tight">Let's set you up</h2>
                <div className="flex justify-between items-center relative px-4">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-white/10 -z-10" />
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-500 transition-all duration-500 ease-out -z-10"
                        style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                    />

                    {STEPS.map((step) => {
                        const isCompleted = currentStep > step.id;
                        const isCurrent = currentStep === step.id;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${isCompleted ? 'bg-indigo-500 text-white' :
                                            isCurrent ? 'bg-indigo-600 ring-4 ring-indigo-500/30 text-white' :
                                                'bg-white/10 text-white/40 border border-white/20'
                                        }`}
                                >
                                    {isCompleted ? <Check size={16} /> : step.id}
                                </div>
                                <div className="absolute top-10 whitespace-nowrap">
                                    <p className={`text-xs font-medium ${isCurrent || isCompleted ? 'text-white' : 'text-white/40'}`}>
                                        {step.title}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/10 min-h-[300px]">
                {/* Step 1: Branding */}
                {currentStep === 1 && (
                    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-white/80">Upload your Logo</label>
                            <div className="w-full h-32 border-2 border-dashed border-white/20 rounded-xl hover:bg-white/5 hover:border-indigo-400 transition-colors flex flex-col items-center justify-center cursor-pointer group">
                                <div className="p-3 bg-white/5 rounded-full group-hover:bg-indigo-500/20 group-hover:text-indigo-400 text-white/40 transition-colors">
                                    <Upload size={24} />
                                </div>
                                <p className="text-sm text-white/60 mt-2 font-medium">Click or drag & drop</p>
                                <p className="text-xs text-white/40">SVG, PNG, or JPG (max. 5MB)</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-white/80">Brand Color</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                                />
                                <input
                                    type="text"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="h-11 px-4 flex-1 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Socials */}
                {currentStep === 2 && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-8 duration-300">
                        <p className="text-sm text-white/60 mb-2">Connect your social accounts to import metrics directly into your dashboard.</p>

                        {(['instagram', 'tiktok', 'facebook'] as const).map(platform => (
                            <div key={platform} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                        <Link2 size={18} className="text-white/60" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium capitalize">{platform}</p>
                                        <p className="text-white/40 text-xs">Not connected</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSocials(prev => ({ ...prev, [platform]: !prev[platform] }))}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${socials[platform]
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}
                                >
                                    {socials[platform] ? 'Connected' : 'Connect'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Step 3: Products */}
                {currentStep === 3 && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div className="space-y-1.5 text-center px-4">
                            <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center mx-auto mb-4 border border-fuchsia-500/30">
                                <ImageIcon size={32} />
                            </div>
                            <h3 className="text-white font-medium">Add your first product</h3>
                            <p className="text-sm text-white/60 pb-2">Upload product shots to start generating stunning marketing assets instantly.</p>
                        </div>

                        <div className="w-full h-40 border-2 border-dashed border-white/20 rounded-xl hover:bg-white/5 hover:border-fuchsia-400 transition-colors flex flex-col items-center justify-center cursor-pointer group">
                            <div className="p-3 bg-white/5 rounded-full group-hover:bg-fuchsia-500/20 group-hover:text-fuchsia-400 text-white/40 transition-colors">
                                <Upload size={24} />
                            </div>
                            <p className="text-sm text-white/60 mt-2 font-medium">Upload Product Images</p>
                        </div>
                        <button className="text-white/40 text-sm hover:text-white transition-colors underline">Skip for now</button>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            <div className="flex justify-between items-center pt-6 border-t border-white/10 mt-auto">
                <button
                    onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                    className={`px-6 py-2.5 rounded-xl text-white/70 font-medium hover:text-white hover:bg-white/10 transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'
                        }`}
                >
                    Back
                </button>

                <button
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="px-8 py-2.5 flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                >
                    {isSubmitting ? (
                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : currentStep === 3 ? (
                        'Complete Setup'
                    ) : (
                        'Continue'
                    )}
                </button>
            </div>

        </div>
    );
}
