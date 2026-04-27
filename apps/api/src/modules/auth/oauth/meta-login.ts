/**
 * Meta (Facebook) OAuth 2.0 helpers for Sign-in
 *
 * Required env vars:
 *   META_APP_ID, META_APP_SECRET, META_LOGIN_REDIRECT_URI
 *
 * This is separate from the publish module's Meta OAuth which requests
 * page management permissions. This login flow only requests basic profile info.
 *
 * Scopes: public_profile, email
 */

const AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';
const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

const SCOPES = ['public_profile', 'email'].join(',');

export function getMetaLoginUrl(state: string): string {
    const params = new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        redirect_uri: process.env.META_LOGIN_REDIRECT_URI!,
        scope: SCOPES,
        response_type: 'code',
        state,
    });
    return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeMetaLoginCode(code: string): Promise<{
    email: string;
    name: string;
    picture: string;
    facebookId: string;
}> {
    const params = new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: process.env.META_LOGIN_REDIRECT_URI!,
        code,
    });

    const tokenRes = await fetch(`${TOKEN_URL}?${params.toString()}`);
    if (!tokenRes.ok) {
        const err = await tokenRes.text();
        throw new Error(`Meta token exchange failed: ${err}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string };

    // Get user profile
    const userRes = await fetch(
        `${GRAPH_BASE}/me?fields=id,name,email,picture.width(200)&access_token=${tokenData.access_token}`
    );
    if (!userRes.ok) throw new Error('Failed to fetch Meta user info');

    const user = await userRes.json() as {
        id: string;
        name: string;
        email?: string;
        picture?: { data?: { url?: string } };
    };

    return {
        email: user.email || `fb_${user.id}@facebook.com`,
        name: user.name,
        picture: user.picture?.data?.url || '',
        facebookId: user.id,
    };
}
