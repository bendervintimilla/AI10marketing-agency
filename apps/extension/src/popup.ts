/**
 * popup.ts — extension UI logic.
 *
 * Two states:
 *  1. login   — user provides AdAgency credentials. Background worker holds the JWT.
 *  2. main    — show captured platform context, brand picker, "Send to brand" action.
 */

interface SessionState {
    token: string | null;
    organizationId: string | null;
    userEmail: string | null;
}

interface Brand {
    id: string;
    name: string;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T | null;

async function send<T = unknown>(msg: any): Promise<T> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(msg, (resp) => resolve(resp as T));
    });
}

async function refresh() {
    const resp = await send<{ ok: boolean; session: SessionState }>({
        kind: 'get_session',
    });
    if (resp?.ok && resp.session?.token) {
        renderMain(resp.session);
    } else {
        renderLogin();
    }
}

function renderLogin() {
    $('login-view')?.classList.remove('hidden');
    $('main-view')?.classList.add('hidden');
}

async function renderMain(_session: SessionState) {
    $('login-view')?.classList.add('hidden');
    $('main-view')?.classList.remove('hidden');

    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    const ctxBlock = $('ctx-block');
    if (ctxBlock && tab[0]?.url) {
        ctxBlock.textContent = `Active tab: ${tab[0].url.slice(0, 80)}`;
    }

    const brandsResp = await send<{ ok: boolean; brands?: Brand[] }>({
        kind: 'list_brands',
    });
    const select = $<HTMLSelectElement>('brand-select');
    if (select) {
        select.replaceChildren();
        if (brandsResp?.ok && brandsResp.brands?.length) {
            for (const b of brandsResp.brands) {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name;
                select.appendChild(opt);
            }
        } else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No brands available';
            select.appendChild(opt);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    $('login-btn')?.addEventListener('click', async () => {
        const email = ($('email') as HTMLInputElement).value.trim();
        const password = ($('password') as HTMLInputElement).value;
        const status = $('login-status');
        if (status) status.textContent = 'Signing in…';
        const resp = await send<{ ok: boolean; error?: string }>({
            kind: 'login',
            email,
            password,
        });
        if (resp?.ok) {
            await refresh();
        } else if (status) {
            status.textContent = resp?.error ?? 'Login failed';
        }
    });

    $('logout-btn')?.addEventListener('click', async () => {
        await send({ kind: 'logout' });
        await refresh();
    });

    $('send-btn')?.addEventListener('click', async () => {
        const status = $('main-status');
        const select = $<HTMLSelectElement>('brand-select');
        if (status) status.textContent = 'Sending…';
        if (!select?.value) {
            if (status) status.textContent = 'Pick a brand first';
            return;
        }
        const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
        const resp = await send<{ ok: boolean; error?: string }>({
            kind: 'capture_context',
            payload: {
                platform: 'meta',
                pageUrl: tab?.url ?? '',
            },
        });
        if (status) status.textContent = resp?.ok ? '✓ Sent' : resp?.error ?? 'Failed';
    });

    refresh();
});
