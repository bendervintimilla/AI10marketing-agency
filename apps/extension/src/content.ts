/**
 * content.ts — runs on supported ads-platform pages.
 *
 * Detects which platform the user is on and extracts safe, non-sensitive
 * context (account name, account id, page URL) that the user can OPT-IN to
 * send to AdAgency by clicking the extension popup.
 *
 * IMPORTANT: this script DOES NOT read tokens, cookies, or localStorage from
 * the platform page. Token capture happens via the popup's explicit "connect"
 * flow that opens the platform's OAuth consent screen — never silently.
 */

interface DetectedContext {
    platform: 'meta' | 'google' | 'tiktok' | 'linkedin' | null;
    pageUrl: string;
    accountId?: string;
    accountName?: string;
}

function detectMeta(): DetectedContext | null {
    if (!location.hostname.includes('facebook.com')) return null;
    const accountId = new URL(location.href).searchParams.get('act') ?? undefined;
    const nameEl = document.querySelector<HTMLElement>(
        '[data-testid="account-switcher__currently-selected"]'
    );
    return {
        platform: 'meta',
        pageUrl: location.href,
        accountId: accountId ? `act_${accountId}` : undefined,
        accountName: nameEl?.innerText?.trim(),
    };
}

function detectGoogle(): DetectedContext | null {
    if (!location.hostname.includes('ads.google.com')) return null;
    return {
        platform: 'google',
        pageUrl: location.href,
        // Google Ads URLs include the customer id in the path
        accountId: location.pathname.match(/\/aw\/(\d+)\//)?.[1],
    };
}

function detectTikTok(): DetectedContext | null {
    if (!location.hostname.includes('ads.tiktok.com')) return null;
    return {
        platform: 'tiktok',
        pageUrl: location.href,
        accountId:
            new URL(location.href).searchParams.get('aadvid') ??
            new URL(location.href).searchParams.get('advid') ??
            undefined,
    };
}

function detectLinkedIn(): DetectedContext | null {
    if (!location.hostname.includes('linkedin.com')) return null;
    if (!location.pathname.includes('/campaignmanager')) return null;
    return {
        platform: 'linkedin',
        pageUrl: location.href,
        accountId: location.pathname.match(/\/accounts\/(\d+)/)?.[1],
    };
}

function detect(): DetectedContext {
    return (
        detectMeta() ??
        detectGoogle() ??
        detectTikTok() ??
        detectLinkedIn() ?? {
            platform: null,
            pageUrl: location.href,
        }
    );
}

// Stash detection on a global so the popup can read it via chrome.scripting
const detected = detect();
if (detected.platform) {
    chrome.runtime.sendMessage({
        kind: 'capture_context',
        payload: {
            platform: detected.platform,
            pageUrl: detected.pageUrl,
            accountId: detected.accountId,
            accountName: detected.accountName,
        },
    });
}
