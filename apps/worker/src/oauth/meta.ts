/**
 * Meta token refresh helper for the worker.
 * Only the refresh flow is needed here (no auth URL / code exchange).
 */

const TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';

export async function refreshMetaToken(longLivedToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
}> {
    const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        fb_exchange_token: longLivedToken,
    });
    const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to refresh Meta token');
    const data = await res.json() as { access_token: string; expires_in: number };
    return { accessToken: data.access_token, expiresIn: data.expires_in };
}
