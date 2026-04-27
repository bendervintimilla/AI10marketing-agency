'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiPost } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function GoogleIcon() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

function MetaIcon() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-8"><span className="h-6 w-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>}>
            <LoginContent />
        </Suspense>
    );
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Check for OAuth errors from callback
    const oauthError = searchParams.get('error');
    const errorMessages: Record<string, string> = {
        google_denied: 'Google sign-in was cancelled',
        google_failed: 'Google sign-in failed. Please try again.',
        meta_denied: 'Meta sign-in was cancelled',
        meta_failed: 'Meta sign-in failed. Please try again.',
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const data = await apiPost('/auth/login', { email, password });
            login(data.token, data.refreshToken, data.user);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = `${API_BASE}/auth/google`;
    };

    const handleMetaLogin = () => {
        window.location.href = `${API_BASE}/auth/meta`;
    };

    const displayError = error || (oauthError && errorMessages[oauthError]) || '';

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
                <h2 className="text-3xl font-semibold text-white tracking-tight">Welcome back</h2>
                <p className="text-white/60 text-sm mt-2">Sign in to your account to continue</p>
            </div>

            {displayError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {displayError}
                </div>
            )}

            {/* Social Login Buttons */}
            <div className="flex flex-col gap-3">
                <button
                    onClick={handleGoogleLogin}
                    className="w-full h-11 flex items-center justify-center gap-3 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/20 text-white font-medium rounded-xl transition-all active:scale-[0.98]"
                >
                    <GoogleIcon />
                    <span className="text-sm">Continue with Google</span>
                </button>

                <button
                    onClick={handleMetaLogin}
                    className="w-full h-11 flex items-center justify-center gap-3 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/20 hover:border-[#1877F2]/30 text-[#1877F2] font-medium rounded-xl transition-all active:scale-[0.98]"
                >
                    <MetaIcon />
                    <span className="text-sm">Continue with Meta</span>
                </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/40 uppercase tracking-wider font-medium">or</span>
                <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-white/80" htmlFor="email">Email address</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white/15"
                        placeholder="you@company.com"
                        required
                    />
                </div>

                <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-white/80" htmlFor="password">Password</label>
                        <Link href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                            Forgot password?
                        </Link>
                    </div>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white/15"
                        placeholder="••••••••"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 mt-2 flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                >
                    {isLoading ? (
                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        'Sign in with email'
                    )}
                </button>
            </form>

            <div className="text-center mt-1">
                <p className="text-sm text-white/60">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
    );
}
