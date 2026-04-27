# AdAgency AI Connector

Chrome extension (Manifest V3) that captures ads-platform context and sends it
to your AdAgency dashboard. Acts as a thin bridge for tasks where the platform
APIs do not expose what we need (e.g. Ad Library snapshots, internal reports).

## Architecture

```
┌─────────────────────────┐
│  Platform page          │  e.g. Meta Business, Google Ads, TikTok Ads
│  (content.ts)           │ ─── reads safe context (account id, page name)
└────────────┬────────────┘
             │ chrome.runtime.sendMessage
             ▼
┌─────────────────────────┐
│  Background SW          │  holds the JWT (chrome.storage.local)
│  (background.ts)        │ ─── posts to AdAgency API
└────────────┬────────────┘
             │ HTTPS + Authorization header
             ▼
┌─────────────────────────┐
│  AdAgency API           │  /brands, /brands/:id/memory/assets, etc.
└─────────────────────────┘
```

## Security

- Tokens, cookies, and localStorage from platform pages are NEVER read.
- JWT lives in `chrome.storage.local` only — never exposed to the page.
- All API traffic uses HTTPS with `Authorization: Bearer <jwt>`.
- The user must explicitly click "Send context" — nothing is auto-uploaded.

## Build

```bash
pnpm install
pnpm --filter @agency/extension build
# → produces ./dist/  (load as unpacked in chrome://extensions)
```

## Roadmap

1. ✅ MV3 scaffold, login, brand list, context capture
2. ⏳ OAuth-bridge popups for Meta, Google, TikTok, LinkedIn
3. ⏳ Asset capture: right-click image → "Save to BrandAsset"
4. ⏳ Push notification when an audit finishes
