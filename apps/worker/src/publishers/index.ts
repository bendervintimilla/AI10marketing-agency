/**
 * Publisher Dispatcher (worker copy)
 * Decrypts token and routes to the correct platform publisher.
 */

import { Platform } from '@agency/db';
import type { SocialAccount } from '@agency/db';
import { decrypt } from '../lib/crypto';
import { publishToInstagram } from './instagram';
import { publishToFacebook } from './facebook';
import { publishToTikTok } from './tiktok';

export interface AdPublishInput {
    adId: string;
    mediaUrl: string;
    caption: string;
    hashtags?: string[];
    isVideo: boolean;
    thumbnailUrl?: string;
}

export interface PublishResult {
    externalPostId: string;
    platform: Platform;
}

function buildCaption(caption: string, hashtags?: string[]): string {
    if (!hashtags?.length) return caption;
    return `${caption}\n\n${hashtags.map((h) => `#${h}`).join(' ')}`;
}

export async function publishAd(
    platform: Platform,
    input: AdPublishInput,
    account: SocialAccount
): Promise<PublishResult> {
    const accessToken = decrypt(account.accessToken);

    switch (platform) {
        case Platform.INSTAGRAM: {
            const result = await publishToInstagram({
                igUserId: account.accountId,
                accessToken,
                mediaUrl: input.mediaUrl,
                caption: buildCaption(input.caption, input.hashtags),
                isVideo: input.isVideo,
                coverUrl: input.thumbnailUrl,
            });
            return { externalPostId: result.externalPostId, platform };
        }

        case Platform.FACEBOOK: {
            const result = await publishToFacebook({
                pageId: account.accountId,
                accessToken,
                mediaUrl: input.mediaUrl,
                caption: buildCaption(input.caption, input.hashtags),
                isVideo: input.isVideo,
            });
            return { externalPostId: result.externalPostId, platform };
        }

        case Platform.TIKTOK: {
            const result = await publishToTikTok({
                accessToken,
                videoUrl: input.mediaUrl,
                caption: input.caption,
                hashtags: input.hashtags,
            });
            return { externalPostId: result.externalPostId, platform };
        }

        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}
