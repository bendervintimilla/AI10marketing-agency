/**
 * TikTok Publisher
 * Uses the TikTok Content Posting API v2
 *
 * Flow:
 *  1. Initialize upload (POST /v2/post/publish/video/init/)
 *  2. Upload video to the provided upload_url
 *  3. Poll publish status
 *  4. Return publish_id as externalPostId
 */

const API_BASE = 'https://open.tiktokapis.com/v2';

export interface TikTokPublishInput {
    accessToken: string;
    videoUrl: string;       // Publicly accessible URL
    caption: string;
    hashtags?: string[];    // Will be appended to caption
    coverTimestamp?: number; // Milliseconds for cover frame
}

export interface TikTokPublishResult {
    externalPostId: string;
}

async function apiPost(
    path: string,
    accessToken: string,
    body: unknown
): Promise<any> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || (data.error?.code && data.error.code !== 'ok')) {
        throw new Error(
            `TikTok API error [${path}]: ${JSON.stringify(data.error ?? data)}`
        );
    }
    return data;
}

async function pollPublishStatus(
    publishId: string,
    accessToken: string,
    maxWaitMs = 180_000
): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        const res = await fetch(`${API_BASE}/post/publish/status/fetch/`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({ publish_id: publishId }),
        });
        const data = await res.json();
        const status: string = data.data?.status ?? '';
        if (status === 'PUBLISH_COMPLETE') return;
        if (status === 'FAILED' || status === 'REMOVE_BY_TIKTOK') {
            throw new Error(`TikTok publish failed with status: ${status}`);
        }
        await new Promise((r) => setTimeout(r, 8000));
    }
    throw new Error('Timed out waiting for TikTok publish status');
}

export async function publishToTikTok(
    input: TikTokPublishInput
): Promise<TikTokPublishResult> {
    const { accessToken, videoUrl, caption, hashtags = [], coverTimestamp } = input;

    const fullCaption = hashtags.length > 0
        ? `${caption} ${hashtags.map((h) => `#${h}`).join(' ')}`
        : caption;

    // Step 1: Initialize video upload via URL pull (server-side pull)
    const initBody: Record<string, unknown> = {
        post_info: {
            title: fullCaption.slice(0, 2200),
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: coverTimestamp ?? 0,
        },
        source_info: {
            source: 'PULL_FROM_URL',
            video_url: videoUrl,
        },
    };

    const initRes = await apiPost('/post/publish/video/init/', accessToken, initBody);
    const publishId: string = initRes.data?.publish_id;

    if (!publishId) {
        throw new Error('TikTok did not return a publish_id');
    }

    // Step 2: Poll status
    await pollPublishStatus(publishId, accessToken);

    return { externalPostId: publishId };
}

export async function unpublishFromTikTok(
    externalPostId: string,
    accessToken: string
): Promise<void> {
    // TikTok Content Posting API does not provide a delete endpoint.
    // Users must delete from the TikTok app.
    console.warn(
        `[TikTok] Cannot programmatically delete post ${externalPostId}. ` +
        `Please remove manually from the TikTok app.`
    );
}
