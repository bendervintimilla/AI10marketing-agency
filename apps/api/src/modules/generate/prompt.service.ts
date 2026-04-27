import { GoogleGenerativeAI } from '@google/generative-ai';
import { brand as brandRepo } from '@agency/db';
import { mediaAsset as mediaAssetRepo } from '@agency/db';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/** Platform-specific constraints */
const PLATFORM_CONSTRAINTS: Record<string, Record<string, { aspectRatio: string; durationRange?: [number, number] }>> = {
    INSTAGRAM: {
        REEL: { aspectRatio: '9:16', durationRange: [15, 30] },
        STORY: { aspectRatio: '9:16', durationRange: [5, 15] },
        POST: { aspectRatio: '1:1' },
        CAROUSEL: { aspectRatio: '1:1' },
    },
    TIKTOK: {
        REEL: { aspectRatio: '9:16', durationRange: [15, 60] },
        STORY: { aspectRatio: '9:16', durationRange: [5, 15] },
        POST: { aspectRatio: '9:16' },
        CAROUSEL: { aspectRatio: '9:16' },
    },
    FACEBOOK: {
        REEL: { aspectRatio: '16:9', durationRange: [15, 60] },
        STORY: { aspectRatio: '9:16', durationRange: [5, 15] },
        POST: { aspectRatio: '1:1' },
        CAROUSEL: { aspectRatio: '1:1' },
    },
};

export interface PromptResult {
    creativeBrief: string;
    visualPrompt: string;
    aspectRatio: string;
    durationRange?: [number, number];
}

export interface BuildPromptOptions {
    brandId: string;
    productMediaIds: string[];
    platform: string;
    format: string;
    generationType: 'VIDEO' | 'IMAGE';
    style?: string;
    userPrompt?: string;
}

export async function buildGenerationPrompt(opts: BuildPromptOptions): Promise<PromptResult> {
    const { brandId, productMediaIds, platform, format, generationType, style, userPrompt } = opts;

    // Load brand profile
    const brandData = await brandRepo.findById(brandId);
    if (!brandData) throw new Error(`Brand not found: ${brandId}`);

    // Load media asset metadata
    const mediaAssets = await mediaAssetRepo.listByOrg(brandData.organizationId);
    const selectedAssets = mediaAssets.filter(a => productMediaIds.includes(a.id));

    // Get platform constraints
    const constraints = PLATFORM_CONSTRAINTS[platform]?.[format] ?? { aspectRatio: '1:1' };

    // Build context string for Gemini
    const brandContext = `
Brand Name: ${brandData.name}
${brandData.description ? `Description: ${brandData.description}` : ''}
${brandData.voiceTone ? `Voice & Tone: ${brandData.voiceTone}` : ''}
${brandData.targetAudience ? `Target Audience: ${brandData.targetAudience}` : ''}
${brandData.colors ? `Brand Colors: ${JSON.stringify(brandData.colors)}` : ''}
${brandData.fonts ? `Brand Fonts: ${JSON.stringify(brandData.fonts)}` : ''}
`.trim();

    const mediaContext = selectedAssets.map(a =>
        `- ${a.type}: "${a.filename}" (tags: ${(a.tags || []).join(', ')})${a.metadata ? ` metadata: ${JSON.stringify(a.metadata)}` : ''}`
    ).join('\n');

    const platformContext = `
Platform: ${platform}
Format: ${format}
Aspect Ratio: ${constraints.aspectRatio}
${constraints.durationRange ? `Duration: ${constraints.durationRange[0]}–${constraints.durationRange[1]} seconds` : ''}
Generation Type: ${generationType}
${style ? `Visual Style: ${style}` : ''}
${userPrompt ? `Additional Instructions: ${userPrompt}` : ''}
`.trim();

    const systemPrompt = `You are an expert creative director specializing in social media advertising. 
You create compelling ad concepts that convert viewers into customers.
You understand visual storytelling, brand consistency, and platform-specific best practices.
Return ONLY valid JSON, no markdown, no explanation.`;

    const userMessage = `Create an ad concept for the following brief:

BRAND:
${brandContext}

PRODUCT MEDIA ASSETS AVAILABLE:
${mediaContext || 'No specific media provided'}

PLATFORM & FORMAT:
${platformContext}

Return a JSON object with exactly these fields:
{
  "creativeBrief": "A 2-3 sentence description of the ad concept, narrative arc, and emotional hook",
  "visualPrompt": "A detailed, technically precise prompt optimized for ${generationType === 'VIDEO' ? 'Veo 3.1 video generation' : 'image generation AI'}. Include: scene description, camera movement${generationType === 'VIDEO' ? ', transitions' : ''}, lighting, color grading, mood, text overlays if any, and brand visual elements. Be specific and evocative. 150–250 words."
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
        { text: systemPrompt },
        { text: userMessage },
    ]);

    const rawText = result.response.text().trim();

    // Strip potential markdown code fences
    const jsonText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');

    let parsed: { creativeBrief: string; visualPrompt: string };
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        // Fallback: extract JSON object from the text
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Gemini returned invalid JSON for prompt generation');
        parsed = JSON.parse(match[0]);
    }

    return {
        creativeBrief: parsed.creativeBrief,
        visualPrompt: parsed.visualPrompt,
        aspectRatio: constraints.aspectRatio,
        durationRange: constraints.durationRange,
    };
}
