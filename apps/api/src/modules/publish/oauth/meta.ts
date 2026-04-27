/**
 * Meta (Facebook / Instagram) OAuth 2.0 helpers
 *
 * Required env vars:
 *   META_APP_ID, META_APP_SECRET, META_REDIRECT_URI
 *
 * Scopes: pages_manage_posts, instagram_basic, instagram_content_publish, pages_read_engagement
 */

const BASE_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';
const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

const SCOPES = [
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'pages_read_engagement',
].join(',');

export function getMetaAuthUrl(state: string): string {
    const params = new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        redirect_uri: process.env.META_REDIRECT_URI!,
        scope: SCOPES,
        response_type: 'code',
        state,
    });
    return `${BASE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeMetaCode(code: string): Promise<{
    accessToken: string;
    userId: string;
}> {
    const params = new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: process.env.META_REDIRECT_URI!,
        code,
    });
    const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Meta token exchange failed: ${JSON.stringify(err)}`);
    }
    const data = await res.json() as { access_token: string };

    // Get user id
    const meRes = await fetch(`${GRAPH_BASE}/me?fields=id,name&access_token=${data.access_token}`);
    const me = await meRes.json() as { id: string; name: string };

    return { accessToken: data.access_token, userId: me.id };
}

/**
 * Exchange short-lived user token for a 60-day long-lived token.
 */
export async function getLongLivedToken(shortToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
}> {
    const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        fb_exchange_token: shortToken,
    });
    const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to get long-lived Meta token');
    const data = await res.json() as { access_token: string; expires_in: number };
    return { accessToken: data.access_token, expiresIn: data.expires_in };
}

/**
 * Get Page access token from a user access token. Returns the first managed page.
 */
export async function getPageToken(userId: string, userToken: string): Promise<{
    pageId: string;
    pageName: string;
    pageToken: string;
    instagramAccountId?: string;
}> {
    const res = await fetch(
        `${GRAPH_BASE}/${userId}/accounts?access_token=${userToken}`
    );
    if (!res.ok) throw new Error('Failed to fetch Meta pages');
    const data = await res.json() as {
        data: Array<{ id: string; name: string; access_token: string }>;
    };
    if (!data.data?.length) {
        throw new Error('No Facebook pages found for this account');
    }
    const page = data.data[0];

    // Try to get linked Instagram Business Account
    let instagramAccountId: string | undefined;
    try {
        const igRes = await fetch(
            `${GRAPH_BASE}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const igData = await igRes.json() as { instagram_business_account?: { id: string } };
        instagramAccountId = igData.instagram_business_account?.id;
    } catch {
        // No Instagram account linked
    }

    return {
        pageId: page.id,
        pageName: page.name,
        pageToken: page.access_token,
        instagramAccountId,
    };
}

/**
 * Refresh a long-lived Meta token (returns a new 60-day token).
 * Meta refreshes automatically when you call this within 60 days before expiry.
 */
export async function refreshMetaToken(longLivedToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
}> {
    return getLongLivedToken(longLivedToken);
}
