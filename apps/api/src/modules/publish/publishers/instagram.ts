/**
 * Instagram Publisher
 * Uses the Instagram Graph API via Meta platform
 *
 * Flow:
 *  1. Create media container (video or image)
 *  2. Poll until container status = FINISHED
 *  3. Publish container
 *  4. Return externalPostId
 */

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

export interface InstagramPublishInput {
    igUserId: string;      // Instagram business account ID
    accessToken: string;   // Page or Instagram access token
    mediaUrl: string;      // Publicly accessible URL of the video or image
    caption: string;
    isVideo: boolean;
    coverUrl?: string;     // Optional thumbnail for videos
}

export interface InstagramPublishResult {
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
        throw new Error(`Instagram API error [${path}]: ${JSON.stringify(data.error ?? data)}`);
    }
    return data;
}

async function graphGet(path: string, token: string): Promise<any> {
    const res = await fetch(`${GRAPH_BASE}/${path}&access_token=${token}`);
    const data = await res.json();
    if (!res.ok || data.error) {
        throw new Error(`Instagram API error [GET ${path}]: ${JSON.stringify(data.error ?? data)}`);
    }
    return data;
}

async function waitForContainerReady(
    igUserId: string,
    creationId: string,
    accessToken: string,
    maxWaitMs = 120_000
): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        const data = await graphGet(
            `${creationId}?fields=status_code,status`,
            accessToken
        );
        if (data.status_code === 'FINISHED') return;
        if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED') {
            throw new Error(`Instagram container failed with status: ${data.status_code}`);
        }
        await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error('Timed out waiting for Instagram media container');
}

export async function publishToInstagram(
    input: InstagramPublishInput
): Promise<InstagramPublishResult> {
    const { igUserId, accessToken, mediaUrl, caption, isVideo, coverUrl } = input;

    // Step 1: Create media container
    const containerBody: Record<string, string> = {
        caption,
        access_token: accessToken,
    };

    if (isVideo) {
        containerBody.media_type = 'REELS';
        containerBody.video_url = mediaUrl;
        if (coverUrl) containerBody.cover_url = coverUrl;
    } else {
        containerBody.image_url = mediaUrl;
    }

    const container = await graphPost(`${igUserId}/media`, containerBody);
    const creationId: string = container.id;

    // Step 2: Poll until ready (videos need processing)
    if (isVideo) {
        await waitForContainerReady(igUserId, creationId, accessToken);
    }

    // Step 3: Publish
    const published = await graphPost(`${igUserId}/media_publish`, {
        creation_id: creationId,
        access_token: accessToken,
    });

    return { externalPostId: published.id };
}

export async function unpublishFromInstagram(
    externalPostId: string,
    accessToken: string
): Promise<void> {
    // Instagram Graph API does not support delete via API for published posts
    // We can only hide (not shown in explore) or delete via the app UI.
    // For API purposes, we mark as deleted in our DB but cannot programmatically remove.
    console.warn(
        `[Instagram] Cannot programmatically delete post ${externalPostId}. ` +
        `Please remove manually from the Instagram app or Business Suite.`
    );
}
