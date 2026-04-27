import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] flex justify-center items-center p-4">
            {/* Background ambient light effects */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[150px] pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-600/20 blur-[150px] pointer-events-none" />

            {/* Main Container */}
            <div className="relative w-full max-w-md bg-white/5 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-8 z-10">
                <div className="flex justify-center mb-8 pb-4 border-b border-white/10">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-fuchsia-400">
                        AgencyOS
                    </h1>
                </div>

                {children}

            </div>
        </div>
    );
}
