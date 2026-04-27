/**
 * claude-design.chat.ts — Conversational creative director with tool use.
 *
 * This is the engine behind /brands/:brandId/claude-design/chat. It runs Claude
 * in an agentic loop where Claude decides which scripts to invoke:
 *
 *   - load_brand_memory     → reads BrandMemory (visual identity, voice, etc.)
 *   - update_brand_memory   → writes/updates fields in BrandMemory
 *   - generate_brief        → calls brief() service
 *   - generate_image_prompt → calls prompt() service
 *   - critique_image        → calls critique() service
 *   - write_caption         → calls caption() service
 *   - list_brand_assets     → reads BrandAsset rows
 *
 * Prompt caching is enabled on the system prompt + brand memory snapshot.
 * Multi-tenant safety: every tool call is bound to {organizationId, brandId}
 * resolved from the JWT — Claude can't pivot to another tenant.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@agency/db';
import {
    brief,
    prompt,
    critique,
    caption,
    loadBrandMemoryForClaude,
    BrandMemorySnapshot,
} from './claude-design.service';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CHAT_MODEL = 'claude-sonnet-4-6';
const MAX_TOOL_ROUNDS = 8;

type ToolName =
    | 'load_brand_memory'
    | 'update_brand_memory'
    | 'list_brand_assets'
    | 'generate_brief'
    | 'generate_image_prompt'
    | 'critique_image'
    | 'write_caption';

const TOOLS: Anthropic.Tool[] = [
    {
        name: 'load_brand_memory',
        description:
            'Read the brand memory snapshot (visual identity, voice profile, personas, legal constraints, design system, recent assets). Call this before any creative work to ground outputs in the brand.',
        input_schema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'update_brand_memory',
        description:
            "Persist new facts the user shares about the brand into BrandMemory so future sessions remember them. Pass only the fields that should change. Each field is an object/array; merging is shallow at the top level — you replace the entire field.",
        input_schema: {
            type: 'object',
            properties: {
                visualIdentity: { type: 'object' },
                voiceProfile: { type: 'object' },
                productCatalog: { type: 'object' },
                audiencePersonas: { type: 'array' },
                competitorRefs: { type: 'array' },
                legalConstraints: { type: 'object' },
                designSystem: { type: 'object' },
                notes: { type: 'string' },
            },
        },
    },
    {
        name: 'list_brand_assets',
        description:
            'List recent uploaded brand assets (logos, photos, b-roll). Useful when the user references "the lobster shot" or "our logo".',
        input_schema: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Max rows (default 20).' },
                type: {
                    type: 'string',
                    description: 'Optional asset type filter (LOGO, PHOTO, VIDEO, ICON, FONT_SAMPLE).',
                },
            },
        },
    },
    {
        name: 'generate_brief',
        description:
            'Produce a structured creative brief (concept, mood, key message, visual direction, CTA, persona, risks) for a campaign goal on a platform/format.',
        input_schema: {
            type: 'object',
            properties: {
                goal: { type: 'string' },
                platform: { type: 'string', enum: ['INSTAGRAM', 'TIKTOK', 'FACEBOOK'] },
                format: { type: 'string', enum: ['REEL', 'STORY', 'POST', 'CAROUSEL'] },
            },
            required: ['goal', 'platform', 'format'],
        },
    },
    {
        name: 'generate_image_prompt',
        description:
            'Convert a creative brief into an image-generation prompt optimized for the chosen renderer + aspect ratio.',
        input_schema: {
            type: 'object',
            properties: {
                brief: { type: 'object', description: 'The brief object from generate_brief.' },
                aspectRatio: { type: 'string', enum: ['1:1', '9:16', '16:9', '4:5'] },
                renderer: { type: 'string', enum: ['imagen', 'flux', 'sdxl'] },
            },
            required: ['brief', 'aspectRatio', 'renderer'],
        },
    },
    {
        name: 'critique_image',
        description:
            'Evaluate a generated image URL against the brand and brief. Returns score, on/off-brand findings, regeneration instructions.',
        input_schema: {
            type: 'object',
            properties: {
                brief: { type: 'object' },
                imageUrl: { type: 'string' },
                highQuality: { type: 'boolean' },
            },
            required: ['brief', 'imageUrl'],
        },
    },
    {
        name: 'write_caption',
        description: 'Write the post copy for a brief on a given platform: primary copy, hashtags, alt text.',
        input_schema: {
            type: 'object',
            properties: {
                brief: { type: 'object' },
                platform: { type: 'string', enum: ['INSTAGRAM', 'TIKTOK', 'FACEBOOK'] },
                maxChars: { type: 'number' },
            },
            required: ['brief', 'platform'],
        },
    },
];

const CHAT_SYSTEM_PROMPT = `You are Claude Design, a senior creative director embedded in AI10 Marketing Agency. You collaborate with marketing teams to produce on-brand campaigns end-to-end.

Working style:
- Be concise and decisive. Default to action over questions when the brief is clear.
- ALWAYS call load_brand_memory at the start of a fresh conversation, OR before any creative output, to ground in the brand.
- When the user shares new brand facts ("our voice is playful", "we banned the word 'fresh'", "Negroni's primary color is #C5A572"), call update_brand_memory to persist them.
- When producing creative, chain tools: brief → prompt → (user picks an image renderer or pastes URL) → critique → caption.
- Reference past assets via list_brand_assets when the user mentions "previous post" or "our usual style".
- Never violate legal_constraints loaded from memory.
- Keep replies short between tool calls; the heavy lifting is in the tools.

Output style:
- Use plain markdown for chat replies. Tool outputs render as cards in the UI — don't repeat their content verbatim, just narrate what you did.
- For brief/prompt/critique/caption, the tool already returns structured JSON — say "Brief generated" or "Caption written" rather than re-listing the fields.`;

interface ChatMessage {
    role: 'user' | 'assistant';
    content: any; // string | content blocks
}

export interface ChatRequest {
    organizationId: string;
    brandId: string;
    userId: string;
    messages: { role: 'user' | 'assistant'; content: string | any }[];
}

export interface ChatToolEvent {
    name: ToolName;
    input: any;
    output: any;
}

export interface ChatResponse {
    reply: string;
    toolEvents: ChatToolEvent[];
    stopReason: string;
}

async function executeTool(
    name: ToolName,
    input: any,
    ctx: { organizationId: string; brandId: string; userId: string }
): Promise<any> {
    const memory = await loadBrandMemoryForClaude(ctx.organizationId, ctx.brandId);
    if (!memory && name !== 'load_brand_memory' && name !== 'update_brand_memory') {
        return { error: 'Brand not found or memory empty.' };
    }

    switch (name) {
        case 'load_brand_memory': {
            return memory ?? { error: 'Memory not initialized.' };
        }

        case 'update_brand_memory': {
            const allowed = [
                'visualIdentity',
                'voiceProfile',
                'productCatalog',
                'audiencePersonas',
                'competitorRefs',
                'legalConstraints',
                'designSystem',
                'notes',
            ] as const;
            const data: Record<string, unknown> = {};
            for (const k of allowed) {
                if (k in input) data[k] = input[k];
            }
            const row = await prisma.brandMemory.upsert({
                where: { brandId: ctx.brandId },
                create: {
                    organizationId: ctx.organizationId,
                    brandId: ctx.brandId,
                    ...data,
                },
                update: data,
            });
            await prisma.brandMemoryEvent
                .create({
                    data: {
                        organizationId: row.organizationId,
                        brandMemoryId: row.id,
                        actorId: ctx.userId,
                        action: 'WRITE',
                        context: { agent: 'claude-design-chat', fields: Object.keys(data) },
                    },
                })
                .catch(() => {});
            return { ok: true, fieldsUpdated: Object.keys(data) };
        }

        case 'list_brand_assets': {
            const memRow = await prisma.brandMemory.findUnique({
                where: { brandId: ctx.brandId },
            });
            if (!memRow) return [];
            const limit = Math.min(input.limit ?? 20, 50);
            const assets = await prisma.brandAsset.findMany({
                where: {
                    organizationId: memRow.organizationId,
                    brandMemoryId: memRow.id,
                    ...(input.type ? { type: input.type } : {}),
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                select: {
                    id: true,
                    type: true,
                    url: true,
                    caption: true,
                    tags: true,
                    width: true,
                    height: true,
                    createdAt: true,
                },
            });
            return assets;
        }

        case 'generate_brief': {
            return await brief({
                memory: memory as BrandMemorySnapshot,
                goal: input.goal,
                platform: input.platform,
                format: input.format,
            });
        }

        case 'generate_image_prompt': {
            return await prompt({
                memory: memory as BrandMemorySnapshot,
                brief: input.brief,
                aspectRatio: input.aspectRatio,
                renderer: input.renderer,
            });
        }

        case 'critique_image': {
            return await critique({
                memory: memory as BrandMemorySnapshot,
                brief: input.brief,
                imageUrl: input.imageUrl,
                highQuality: !!input.highQuality,
            });
        }

        case 'write_caption': {
            return await caption({
                memory: memory as BrandMemorySnapshot,
                brief: input.brief,
                platform: input.platform,
                maxChars: input.maxChars,
            });
        }

        default:
            return { error: `Unknown tool: ${name}` };
    }
}

export async function chat(req: ChatRequest): Promise<ChatResponse> {
    const memory = await loadBrandMemoryForClaude(req.organizationId, req.brandId);
    const brandContext = memory
        ? `<brand_context>\nBrand: ${memory.brandName}\nMemory snapshot loaded — call load_brand_memory if you need full details.\n</brand_context>`
        : '<brand_context>No brand memory yet.</brand_context>';

    const conversation: ChatMessage[] = req.messages.map((m) => ({
        role: m.role,
        content: m.content,
    }));

    const toolEvents: ChatToolEvent[] = [];
    let finalText = '';
    let stopReason = 'end_turn';

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await anthropic.messages.create({
            model: CHAT_MODEL,
            max_tokens: 2048,
            system: [
                {
                    type: 'text',
                    text: CHAT_SYSTEM_PROMPT,
                    cache_control: { type: 'ephemeral' },
                },
                {
                    type: 'text',
                    text: brandContext,
                    cache_control: { type: 'ephemeral' },
                },
            ],
            tools: TOOLS,
            messages: conversation as any,
        });

        stopReason = response.stop_reason ?? 'end_turn';

        // Append assistant response to conversation
        conversation.push({ role: 'assistant', content: response.content });

        const toolUses = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        );

        // Capture any text the assistant produced this round
        const textBlocks = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join('\n');
        if (textBlocks) finalText = textBlocks;

        if (toolUses.length === 0 || stopReason === 'end_turn') {
            break;
        }

        // Execute each tool call and feed the results back
        const toolResults: any[] = [];
        for (const tu of toolUses) {
            const output = await executeTool(tu.name as ToolName, tu.input, {
                organizationId: req.organizationId,
                brandId: req.brandId,
                userId: req.userId,
            }).catch((err: any) => ({
                error: err?.message ?? 'tool_failed',
            }));

            toolEvents.push({ name: tu.name as ToolName, input: tu.input, output });

            toolResults.push({
                type: 'tool_result',
                tool_use_id: tu.id,
                content: JSON.stringify(output).slice(0, 80_000),
            });
        }

        conversation.push({ role: 'user', content: toolResults });
    }

    return { reply: finalText, toolEvents, stopReason };
}
