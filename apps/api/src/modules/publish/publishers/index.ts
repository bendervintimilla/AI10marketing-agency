/**
 * Publisher Dispatcher
 * Routes publish/unpublish requests to the correct platform publisher.
 */

import { Platform } from '@agency/db';
import type { SocialAccount } from '@agency/db';

import { decrypt } from '../../../lib/crypto';

import { publishToInstagram, unpublishFromInstagram } from './instagram';
import { publishToFacebook, unpublishFromFacebook } from './facebook';
import { publishToTikTok, unpublishFromTikTok } from './tiktok';

export interface AdPublishInput {
    adId: string;
    mediaUrl: string;
    caption: string;
    hashtags?: string[];
    isVideo: boolean;
    thumbnailUrl?: string;
    /** Extra metadata stored on the account (e.g. pageId, igUserId) */
    accountMeta?: Record<string, string>;
}

export interface PublishResult {
    externalPostId: string;
    platform: Platform;
}

/**
 * Dispatch publish to the correct platform.
 * @param platform  Target social platform
 * @param input     Ad publish input data
 * @param account   SocialAccount record from DB (tokens are still encrypted)
 */
export async function publishAd(
    platform: Platform,
    input: AdPublishInput,
    account: SocialAccount
): Promise<PublishResult> {
    const accessToken = decrypt(account.accessToken);

    switch (platform) {
        case Platform.INSTAGRAM: {
            const igUserId = account.accountId;
            const result = await publishToInstagram({
                igUserId,
                accessToken,
                mediaUrl: input.mediaUrl,
                caption: buildCaption(input.caption, input.hashtags),
                isVideo: input.isVideo,
                coverUrl: input.thumbnailUrl,
            });
            return { externalPostId: result.externalPostId, platform };
        }

        case Platform.FACEBOOK: {
            const pageId = account.accountId;
            const result = await publishToFacebook({
                pageId,
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
                coverTimestamp: 0,
            });
            return { externalPostId: result.externalPostId, platform };
        }

        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

/**
 * Dispatch unpublish to the correct platform.
 */
export async function unpublishAd(
    platform: Platform,
    externalPostId: string,
    account: SocialAccount
): Promise<void> {
    const accessToken = decrypt(account.accessToken);

    switch (platform) {
        case Platform.INSTAGRAM:
            await unpublishFromInstagram(externalPostId, accessToken);
            break;
        case Platform.FACEBOOK:
            await unpublishFromFacebook(externalPostId, accessToken);
            break;
        case Platform.TIKTOK:
            await unpublishFromTikTok(externalPostId, accessToken);
            break;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

function buildCaption(caption: string, hashtags?: string[]): string {
    if (!hashtags?.length) return caption;
    return `${caption}\n\n${hashtags.map((h) => `#${h}`).join(' ')}`;
}
