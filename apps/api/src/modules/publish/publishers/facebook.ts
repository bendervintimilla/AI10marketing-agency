/**
 * Facebook Publisher
 * Uses the Facebook Graph API (Page Videos / Photos)
 *
 * Flow:
 *  1. POST video or photo to the page feed
 *  2. Return externalPostId
 */

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

export interface FacebookPublishInput {
    pageId: string;
    accessToken: string; // Page access token
    mediaUrl: string;    // Publicly accessible URL
    caption: string;
    isVideo: boolean;
}

export interface FacebookPublishResult {
    externalPostId: string;
}

async function graphPost(path: string, body: Record<string, string>): Promise<any> {
    const res = await fetch(`${GRAPH_BASE}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
        throw new Error(`Facebook API error [${path}]: ${JSON.stringify(data.error ?? data)}`);
    }
    return data;
}

export async function publishToFacebook(
    input: FacebookPublishInput
): Promise<FacebookPublishResult> {
    const { pageId, accessToken, mediaUrl, caption, isVideo } = input;

    if (isVideo) {
        // Schedule video upload
        const result = await graphPost(`${pageId}/videos`, {
            file_url: mediaUrl,
            description: caption,
            published: 'true',
            access_token: accessToken,
        });
        // Facebook returns { id } or { post_id }
        return { externalPostId: result.id ?? result.post_id };
    } else {
        // Photo post
        const result = await graphPost(`${pageId}/photos`, {
            url: mediaUrl,
            caption,
            published: 'true',
            access_token: accessToken,
        });
        return { externalPostId: result.post_id ?? result.id };
    }
}

export async function unpublishFromFacebook(
    externalPostId: string,
    accessToken: string
): Promise<void> {
    const res = await fetch(`${GRAPH_BASE}/${externalPostId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Failed to delete Facebook post: ${JSON.stringify(err)}`);
    }
}
