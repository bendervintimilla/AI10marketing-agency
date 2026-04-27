/**
 * background.ts — MV3 service worker.
 *
 * Owns:
 *  - Session JWT (stored in chrome.storage.local, never exposed to content script)
 *  - Forwarding messages from content scripts and popup to the AdAgency API
 *  - Detecting platform pages (Meta, Google, TikTok, LinkedIn) and signaling to
 *    the popup which actions are available.
 *
 * Security model: tokens captured from platform pages NEVER touch the page DOM.
 * The content script only emits structured "context" events; the background
 * worker decides what gets POSTed to our API and adds the user's JWT.
 */

const API_BASE =
    (globalThis as any).ADAGENCY_API_BASE ||
    'https://web-production-41df4.up.railway.app';

interface SessionState {
    token: string | null;
    organizationId: string | null;
    userEmail: string | null;
}

async function getSession(): Promise<SessionState> {
    const data = await chrome.storage.local.get([
        'adagency_token',
        'adagency_org_id',
        'adagency_email',
    ]);
    return {
        token: data.adagency_token ?? null,
        organizationId: data.adagency_org_id ?? null,
        userEmail: data.adagency_email ?? null,
    };
}

async function setSession(s: Partial<SessionState>) {
    const map: Record<string, unknown> = {};
    if (s.token !== undefined) map.adagency_token = s.token;
    if (s.organizationId !== undefined) map.adagency_org_id = s.organizationId;
    if (s.userEmail !== undefined) map.adagency_email = s.userEmail;
    await chrome.storage.local.set(map);
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const session = await getSession();
    const headers = new Headers(init.headers || {});
    if (session.token) headers.set('Authorization', `Bearer ${session.token}`);
    headers.set('Content-Type', 'application/json');
    return fetch(`${API_BASE}${path}`, { ...init, headers });
}

// ── Message router ─────────────────────────────────────────────────────────

type ExtensionMessage =
    | { kind: 'login'; email: string; password: string }
    | { kind: 'logout' }
    | { kind: 'get_session' }
    | { kind: 'list_brands' }
    | { kind: 'capture_context'; payload: CapturedContext }
    | { kind: 'register_asset'; brandId: string; asset: BrandAssetPayload };

interface CapturedContext {
    platform: 'meta' | 'google' | 'tiktok' | 'linkedin';
    pageUrl: string;
    accountId?: string;
    accountName?: string;
    raw?: Record<string, unknown>;
}

interface BrandAssetPayload {
    type: string;
    url: string;
    mimeType: string;
    caption?: string;
    tags?: string[];
}

chrome.runtime.onMessage.addListener((msg: ExtensionMessage, _sender, sendResponse) => {
    (async () => {
        try {
            switch (msg.kind) {
                case 'login': {
                    const r = await fetch(`${API_BASE}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: msg.email, password: msg.password }),
                    });
                    if (!r.ok) {
                        sendResponse({ ok: false, error: `Login failed: ${r.status}` });
                        return;
                    }
                    const data = await r.json();
                    await setSession({
                        token: data.token,
                        organizationId: data.user?.organizationId ?? null,
                        userEmail: data.user?.email ?? msg.email,
                    });
                    sendResponse({ ok: true, session: await getSession() });
                    return;
                }
                case 'logout':
                    await setSession({ token: null, organizationId: null, userEmail: null });
                    sendResponse({ ok: true });
                    return;
                case 'get_session':
                    sendResponse({ ok: true, session: await getSession() });
                    return;
                case 'list_brands': {
                    const r = await apiFetch('/brands');
                    if (!r.ok) {
                        sendResponse({ ok: false, error: `${r.status}` });
                        return;
                    }
                    sendResponse({ ok: true, brands: await r.json() });
                    return;
                }
                case 'capture_context': {
                    // For now, just echo to the popup; in future this will POST
                    // to a /platform-context endpoint that hydrates BrandMemory.
                    console.info('[adagency] captured context:', msg.payload);
                    sendResponse({ ok: true, captured: msg.payload });
                    return;
                }
                case 'register_asset': {
                    const r = await apiFetch(
                        `/brands/${msg.brandId}/memory/assets`,
                        { method: 'POST', body: JSON.stringify(msg.asset) }
                    );
                    if (!r.ok) {
                        sendResponse({ ok: false, error: `${r.status}` });
                        return;
                    }
                    sendResponse({ ok: true, asset: await r.json() });
                    return;
                }
            }
        } catch (err: any) {
            sendResponse({ ok: false, error: err.message ?? String(err) });
        }
    })();
    return true; // keep channel open for async sendResponse
});
