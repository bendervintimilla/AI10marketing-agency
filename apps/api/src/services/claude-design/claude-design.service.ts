/**
 * claude-design.service.ts — Anthropic Claude as creative director.
 *
 * Claude does NOT render images directly. Instead it acts as the brain:
 *   1. brief()    — turns BrandMemory + user goal into a structured creative brief
 *   2. prompt()   — converts brief into an image-gen prompt optimized for the renderer
 *   3. critique() — evaluates a generated image against brand guidelines, returns
 *                   either approval or specific change requests for regeneration
 *   4. caption()  — writes on-brand copy/caption/hashtags for the final asset
 *
 * Design choices:
 * - Prompt caching is enabled on the system prompt + BrandMemory snapshot, since
 *   those are reused across many generations for the same brand. This typically
 *   saves 70–90% on input tokens.
 * - Model: claude-sonnet-4-6 (good quality/cost balance for creative work). Use
 *   claude-opus-4-7 only when explicitly asked for highest-quality critique.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@agency/db';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const HIGH_QUALITY_MODEL = 'claude-opus-4-7';

export interface BrandMemorySnapshot {
    brandName: string;
    visualIdentity?: unknown;
    voiceProfile?: unknown;
    productCatalog?: unknown;
    audiencePersonas?: unknown;
    competitorRefs?: unknown;
    legalConstraints?: unknown;
    designSystem?: unknown;
    notes?: string | null;
    assetSamples?: Array<{ type: string; caption?: string | null; tags: string[] }>;
}

export async function loadBrandMemoryForClaude(
    organizationId: string,
    brandId: string
): Promise<BrandMemorySnapshot | null> {
    const brand = await prisma.brand.findFirst({
        where: { id: brandId, organizationId },
        include: {
            memory: {
                include: {
                    assets: {
                        take: 20,
                        orderBy: { createdAt: 'desc' },
                        select: { type: true, caption: true, tags: true },
                    },
                },
            },
        },
    });
    if (!brand) return null;

    return {
        brandName: brand.name,
        visualIdentity: brand.memory?.visualIdentity ?? null,
        voiceProfile: brand.memory?.voiceProfile ?? null,
        productCatalog: brand.memory?.productCatalog ?? null,
        audiencePersonas: brand.memory?.audiencePersonas ?? null,
        competitorRefs: brand.memory?.competitorRefs ?? null,
        legalConstraints: brand.memory?.legalConstraints ?? null,
        designSystem: brand.memory?.designSystem ?? null,
        notes: brand.memory?.notes ?? null,
        assetSamples: brand.memory?.assets ?? [],
    };
}

const SYSTEM_PROMPT_BASE = `You are a senior creative director for AdAgency AI. You generate, evaluate, and refine creative assets (images, videos, copy) for client brands.

Your role:
- Translate brand identity into specific, executable creative briefs.
- Generate image-generation prompts that respect brand visual identity, legal constraints, and audience personas.
- Critique generated assets against brand guidelines — be specific about what works and what doesn't.
- Write copy in the brand's voice: tone, vocabulary, banned words.

Hard rules:
- Never violate listed legal constraints (banned claims, regulatory restrictions).
- Never recommend imagery that imitates competitors listed under competitorRefs.
- If the brand has no memory yet, acknowledge it and ask for the missing inputs rather than guessing.
- Output strictly in the JSON schema requested. No prose outside JSON.`;

function buildBrandContextBlock(memory: BrandMemorySnapshot): string {
    return `<brand_memory>
Brand: ${memory.brandName}
Visual identity: ${JSON.stringify(memory.visualIdentity ?? {})}
Voice profile: ${JSON.stringify(memory.voiceProfile ?? {})}
Product catalog: ${JSON.stringify(memory.productCatalog ?? {})}
Audience personas: ${JSON.stringify(memory.audiencePersonas ?? {})}
Competitor refs: ${JSON.stringify(memory.competitorRefs ?? {})}
Legal constraints: ${JSON.stringify(memory.legalConstraints ?? {})}
Design system: ${JSON.stringify(memory.designSystem ?? {})}
Notes: ${memory.notes ?? '(none)'}
Recent assets: ${JSON.stringify(memory.assetSamples ?? [])}
</brand_memory>`;
}

// ─── 1. Brief: BrandMemory + goal → structured brief ─────────────────────────

export interface CreativeBriefRequest {
    memory: BrandMemorySnapshot;
    goal: string; // "Promo for new lunch menu", "Awareness for rooftop bar", etc.
    platform: 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK';
    format: 'REEL' | 'STORY' | 'POST' | 'CAROUSEL';
}

export interface CreativeBrief {
    concept: string;
    mood: string;
    keyMessage: string;
    visualDirection: string;
    callToAction: string;
    targetPersona: string;
    risks: string[];
}

export async function brief(req: CreativeBriefRequest): Promise<CreativeBrief> {
    const message = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: [
            {
                type: 'text',
                text: SYSTEM_PROMPT_BASE,
                cache_control: { type: 'ephemeral' },
            },
            {
                type: 'text',
                text: buildBrandContextBlock(req.memory),
                cache_control: { type: 'ephemeral' },
            },
        ],
        messages: [
            {
                role: 'user',
                content: `Generate a creative brief for this campaign goal on ${req.platform} (${req.format}):

GOAL: ${req.goal}

Output strictly as JSON. EACH field below MUST be a single string (one to three sentences), NOT a nested object:
- concept (string)
- mood (string)
- keyMessage (string)
- visualDirection (string — describe shot, palette, talent, props in prose, NOT an object)
- callToAction (string)
- targetPersona (string)
- risks (array of strings)
Do not nest objects inside these fields. Plain strings only.`,
            },
        ],
    });

    const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
    return parseJson<CreativeBrief>(text);
}

// ─── 2. Prompt: brief → image-gen prompt ─────────────────────────────────────

export interface ImagePromptRequest {
    memory: BrandMemorySnapshot;
    brief: CreativeBrief;
    aspectRatio: '1:1' | '9:16' | '16:9' | '4:5';
    renderer: 'imagen' | 'flux' | 'sdxl';
}

export interface ImagePrompt {
    prompt: string;
    negativePrompt: string;
    styleTokens: string[];
    referenceAssetIds?: string[];
}

export async function prompt(req: ImagePromptRequest): Promise<ImagePrompt> {
    const message = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: [
            {
                type: 'text',
                text: SYSTEM_PROMPT_BASE,
                cache_control: { type: 'ephemeral' },
            },
            {
                type: 'text',
                text: buildBrandContextBlock(req.memory),
                cache_control: { type: 'ephemeral' },
            },
        ],
        messages: [
            {
                role: 'user',
                content: `Convert this brief into an image-generation prompt for ${req.renderer} (aspect ${req.aspectRatio}).

BRIEF:
${JSON.stringify(req.brief, null, 2)}

Output strictly as JSON with keys: prompt (string, ~80 words, photographic when appropriate), negativePrompt (string, things to avoid), styleTokens (string[], terse modifiers).`,
            },
        ],
    });

    const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
    return parseJson<ImagePrompt>(text);
}

// ─── 3. Critique: evaluate generated image ───────────────────────────────────

export interface CritiqueRequest {
    memory: BrandMemorySnapshot;
    brief: CreativeBrief;
    imageUrl: string; // public URL Claude can fetch via image input
    highQuality?: boolean;
}

export interface Critique {
    approved: boolean;
    score: number; // 0-100
    onBrandFindings: string[];
    offBrandFindings: string[];
    regenerationInstructions?: string;
}

export async function critique(req: CritiqueRequest): Promise<Critique> {
    const message = await anthropic.messages.create({
        model: req.highQuality ? HIGH_QUALITY_MODEL : DEFAULT_MODEL,
        max_tokens: 1024,
        system: [
            {
                type: 'text',
                text: SYSTEM_PROMPT_BASE,
                cache_control: { type: 'ephemeral' },
            },
            {
                type: 'text',
                text: buildBrandContextBlock(req.memory),
                cache_control: { type: 'ephemeral' },
            },
        ],
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'url', url: req.imageUrl },
                    },
                    {
                        type: 'text',
                        text: `Critique this generated image against the brand and the brief below.

BRIEF:
${JSON.stringify(req.brief, null, 2)}

Output strictly as JSON with keys: approved (boolean), score (0-100), onBrandFindings (string[]), offBrandFindings (string[]), regenerationInstructions (string, only if NOT approved).`,
                    },
                ],
            },
        ],
    });

    const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
    return parseJson<Critique>(text);
}

// ─── 4. Caption: write on-brand copy ─────────────────────────────────────────

export interface CaptionRequest {
    memory: BrandMemorySnapshot;
    brief: CreativeBrief;
    platform: 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK';
    maxChars?: number;
}

export interface Caption {
    primary: string;
    hashtags: string[];
    altText: string;
}

export async function caption(req: CaptionRequest): Promise<Caption> {
    const max = req.maxChars ?? (req.platform === 'INSTAGRAM' ? 2200 : 300);
    const message = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 768,
        system: [
            {
                type: 'text',
                text: SYSTEM_PROMPT_BASE,
                cache_control: { type: 'ephemeral' },
            },
            {
                type: 'text',
                text: buildBrandContextBlock(req.memory),
                cache_control: { type: 'ephemeral' },
            },
        ],
        messages: [
            {
                role: 'user',
                content: `Write the post copy for ${req.platform} based on the brief.

BRIEF:
${JSON.stringify(req.brief, null, 2)}

Constraints: max ${max} characters for primary, 5-10 hashtags, alt text 100-200 chars. Match the brand voice exactly.

Output strictly as JSON with keys: primary, hashtags (string[]), altText.`,
            },
        ],
    });

    const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
    return parseJson<Caption>(text);
}

// ─── helpers ────────────────────────────────────────────────────────────────

function parseJson<T>(raw: string): T {
    // Claude sometimes wraps JSON in ```json ... ``` fences; strip them.
    const trimmed = raw.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced ? fenced[1] : trimmed;
    try {
        return JSON.parse(candidate) as T;
    } catch (err) {
        throw new Error(`Claude returned non-JSON: ${candidate.slice(0, 200)}`);
    }
}
