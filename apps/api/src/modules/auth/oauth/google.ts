/**
 * Google OAuth 2.0 helpers for Sign-in
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 *
 * Scopes: openid, email, profile
 */

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const SCOPES = ['openid', 'email', 'profile'].join(' ');

export function getGoogleAuthUrl(state: string): string {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        scope: SCOPES,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        state,
    });
    return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<{
    email: string;
    name: string;
    picture: string;
    googleId: string;
}> {
    const body = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        code,
        grant_type: 'authorization_code',
    });

    const tokenRes = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!tokenRes.ok) {
        const err = await tokenRes.text();
        throw new Error(`Google token exchange failed: ${err}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string };

    // Get user profile
    const userRes = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) throw new Error('Failed to fetch Google user info');

    const user = await userRes.json() as {
        id: string;
        email: string;
        name: string;
        picture: string;
    };

    return {
        email: user.email,
        name: user.name,
        picture: user.picture,
        googleId: user.id,
    };
}
