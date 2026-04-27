'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Simplified representation of the user based on the API response
export interface User {
    userId: string;
    email: string;
    orgId: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, refreshToken: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // On mount, restore auth state from localStorage
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = (newToken: string, refreshToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        // Optional: call API to invalidate refresh token here
    };

    // Basic Token Refresh Logic:
    // In a real app we'd use an interceptor (like axios) or a setInterval to refresh
    // the token just before it expires. For now, this is a simplified stub.
    useEffect(() => {
        if (!token) return;

        const interval = setInterval(async () => {
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken || !user) return;

                const res = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken, userId: user.userId })
                });

                if (res.ok) {
                    const data = await res.json();
                    setToken(data.token);
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('refreshToken', data.refreshToken);
                } else {
                    // If refresh fails, log out
                    logout();
                }
            } catch (err) {
                console.error('Failed to refresh token', err);
            }
        }, 45 * 60 * 1000); // refresh every 45 mins assuming 1h TTL

        return () => clearInterval(interval);
    }, [token, user]);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
