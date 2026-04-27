/**
 * Instagram Publisher (worker copy)
 */

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

export interface InstagramPublishInput {
    igUserId: string;
    accessToken: string;
    mediaUrl: string;
    caption: string;
    isVideo: boolean;
    coverUrl?: string;
}

async function graphPost(path: string, body: Record<string, string>): Promise<any> {
    const res = await fetch(`${GRAPH_BASE}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
        throw new Error(`Instagram API error [${path}]: ${JSON.stringify(data.error ?? data)}`);
    }
    return data;
}

async function graphGet(path: string): Promise<any> {
    const res = await fetch(`${GRAPH_BASE}/${path}`);
    const data = await res.json();
    if (!res.ok || data.error) {
        throw new Error(`Instagram GET error [${path}]: ${JSON.stringify(data.error ?? data)}`);
    }
    return data;
}

async function waitForContainerReady(
    creationId: string,
    accessToken: string,
    maxWaitMs = 120_000
): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        const data = await graphGet(`${creationId}?fields=status_code&access_token=${accessToken}`);
        if (data.status_code === 'FINISHED') return;
        if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED') {
            throw new Error(`Instagram container failed: ${data.status_code}`);
        }
        await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error('Timed out waiting for Instagram media container');
}

export async function publishToInstagram(input: InstagramPublishInput): Promise<{ externalPostId: string }> {
    const { igUserId, accessToken, mediaUrl, caption, isVideo, coverUrl } = input;

    const containerBody: Record<string, string> = { caption, access_token: accessToken };
    if (isVideo) {
        containerBody.media_type = 'REELS';
        containerBody.video_url = mediaUrl;
        if (coverUrl) containerBody.cover_url = coverUrl;
    } else {
        containerBody.image_url = mediaUrl;
    }

    const container = await graphPost(`${igUserId}/media`, containerBody);
    if (isVideo) await waitForContainerReady(container.id, accessToken);

    const published = await graphPost(`${igUserId}/media_publish`, {
        creation_id: container.id,
        access_token: accessToken,
    });
    return { externalPostId: published.id };
}
