/**
 * TikTok Publisher (worker copy) — URL pull mode
 */

const API_BASE = 'https://open.tiktokapis.com/v2';

export interface TikTokPublishInput {
    accessToken: string;
    videoUrl: string;
    caption: string;
    hashtags?: string[];
    coverTimestamp?: number;
}

async function apiPost(path: string, accessToken: string, body: unknown): Promise<any> {
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
        throw new Error(`TikTok API error [${path}]: ${JSON.stringify(data.error ?? data)}`);
    }
    return data;
}

async function pollPublishStatus(publishId: string, accessToken: string): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < 180_000) {
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
            throw new Error(`TikTok publish failed: ${status}`);
        }
        await new Promise((r) => setTimeout(r, 8000));
    }
    throw new Error('Timed out waiting for TikTok publish status');
}

export async function publishToTikTok(input: TikTokPublishInput): Promise<{ externalPostId: string }> {
    const { accessToken, videoUrl, caption, hashtags = [], coverTimestamp } = input;

    const fullCaption = hashtags.length
        ? `${caption} ${hashtags.map((h) => `#${h}`).join(' ')}`
        : caption;

    const initRes = await apiPost('/post/publish/video/init/', accessToken, {
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
    });

    const publishId: string = initRes.data?.publish_id;
    if (!publishId) throw new Error('TikTok did not return a publish_id');

    await pollPublishStatus(publishId, accessToken);
    return { externalPostId: publishId };
}
