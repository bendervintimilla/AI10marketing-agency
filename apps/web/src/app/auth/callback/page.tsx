'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                    <span className="h-6 w-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                </div>
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const [error, setError] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refreshToken');
        const userParam = searchParams.get('user');

        if (token && refreshToken && userParam) {
            try {
                const user = JSON.parse(userParam);
                login(token, refreshToken, user);
                router.push('/dashboard');
            } catch {
                setError('Failed to process login. Please try again.');
                setTimeout(() => router.push('/login'), 2000);
            }
        } else {
            setError('Invalid callback parameters.');
            setTimeout(() => router.push('/login'), 2000);
        }
    }, [searchParams, login, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
            <div className="text-center">
                {error ? (
                    <>
                        <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <p className="text-red-400 text-sm">{error}</p>
                        <p className="text-white/40 text-xs mt-2">Redirecting to login...</p>
                    </>
                ) : (
                    <>
                        <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                            <span className="h-6 w-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                        </div>
                        <p className="text-white/60 text-sm">Signing you in...</p>
                    </>
                )}
            </div>
        </div>
    );
}
