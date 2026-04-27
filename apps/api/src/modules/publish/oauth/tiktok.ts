/**
 * TikTok for Business OAuth helpers
 *
 * Required env vars:
 *   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI
 *
 * Scopes: video.upload, video.publish, user.info.basic
 *
 * Uses PKCE (code_verifier / code_challenge) as required by TikTok v2 OAuth.
 */

import crypto from 'crypto';

const AUTH_BASE = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const REVOKE_URL = 'https://open.tiktokapis.com/v2/oauth/revoke/';

const SCOPES = ['video.upload', 'video.publish', 'user.info.basic'].join(',');

function generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function getTikTokAuthUrl(state: string): {
    url: string;
    codeVerifier: string;
} {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        scope: SCOPES,
        response_type: 'code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    return { url: `${AUTH_BASE}?${params.toString()}`, codeVerifier };
}

export interface TikTokTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // seconds
    openId: string;
    displayName?: string;
}

export async function exchangeTikTokCode(
    code: string,
    codeVerifier: string
): Promise<TikTokTokens> {
    const body = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
        code_verifier: codeVerifier,
    });

    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`TikTok token exchange failed: ${err}`);
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

export async function revokeTikTokToken(accessToken: string): Promise<void> {
    const body = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        token: accessToken,
    });
    await fetch(REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });
}
