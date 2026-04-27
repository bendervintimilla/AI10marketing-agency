const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Auth-aware fetch wrapper that attaches the JWT token and handles 401s.
 */
export async function apiFetch<T = any>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    // Handle 401 — token expired or invalid (but NOT on auth routes like login/register)
    const isAuthRoute = path.startsWith('/auth/');
    if (res.status === 401 && !isAuthRoute && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired');
    }

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return res.json();
}

/**
 * Shorthand for GET requests
 */
export function apiGet<T = any>(path: string): Promise<T> {
    return apiFetch<T>(path, { method: 'GET' });
}

/**
 * Shorthand for POST requests
 */
export function apiPost<T = any>(path: string, body?: any): Promise<T> {
    return apiFetch<T>(path, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
    });
}

/**
 * Shorthand for PATCH requests
 */
export function apiPatch<T = any>(path: string, body?: any): Promise<T> {
    return apiFetch<T>(path, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
    });
}

/**
 * Shorthand for DELETE requests
 */
export function apiDelete<T = any>(path: string): Promise<T> {
    return apiFetch<T>(path, { method: 'DELETE' });
}
