/**
 * Facebook Publisher (worker copy)
 */

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

export interface FacebookPublishInput {
    pageId: string;
    accessToken: string;
    mediaUrl: string;
    caption: string;
    isVideo: boolean;
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

export async function publishToFacebook(input: FacebookPublishInput): Promise<{ externalPostId: string }> {
    const { pageId, accessToken, mediaUrl, caption, isVideo } = input;

    if (isVideo) {
        const result = await graphPost(`${pageId}/videos`, {
            file_url: mediaUrl,
            description: caption,
            published: 'true',
            access_token: accessToken,
        });
        return { externalPostId: result.id ?? result.post_id };
    } else {
        const result = await graphPost(`${pageId}/photos`, {
            url: mediaUrl,
            caption,
            published: 'true',
            access_token: accessToken,
        });
        return { externalPostId: result.post_id ?? result.id };
    }
}
