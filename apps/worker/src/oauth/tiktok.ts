/**
 * TikTok token refresh helper for the worker.
 */

const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';

export interface TikTokTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    openId: string;
    displayName?: string;
}

export async function refreshTikTokToken(refreshToken: string): Promise<TikTokTokens> {
    const body = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
    });

    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`TikTok token refresh failed: ${err}`);
    }

    const data = await res.json() as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        open_id: string;
        display_name?: string;
    };

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        openId: data.open_id,
        displayName: data.display_name,
    };
}
