import { GoogleGenerativeAI } from '@google/generative-ai';
import { brand as brandRepo, mediaAsset as mediaAssetRepo } from '@agency/db';

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

    const brandData = await brandRepo.findById(brandId);
    if (!brandData) throw new Error(`Brand not found: ${brandId}`);

    const mediaAssets = await mediaAssetRepo.listByOrg(brandData.organizationId);
    const selectedAssets = mediaAssets.filter(a => productMediaIds.includes(a.id));

    const constraints = PLATFORM_CONSTRAINTS[platform]?.[format] ?? { aspectRatio: '1:1' };

    const brandContext = [
        `Brand Name: ${brandData.name}`,
        brandData.description ? `Description: ${brandData.description}` : '',
        brandData.voiceTone ? `Voice & Tone: ${brandData.voiceTone}` : '',
        brandData.targetAudience ? `Target Audience: ${brandData.targetAudience}` : '',
        brandData.colors ? `Brand Colors: ${JSON.stringify(brandData.colors)}` : '',
        brandData.fonts ? `Brand Fonts: ${JSON.stringify(brandData.fonts)}` : '',
    ].filter(Boolean).join('\n');

    const mediaContext = selectedAssets.map(a =>
        `- ${a.type}: "${a.filename}" (tags: ${(a.tags || []).join(', ')})${a.metadata ? ` metadata: ${JSON.stringify(a.metadata)}` : ''}`
    ).join('\n') || 'No specific media provided';

    const platformContext = [
        `Platform: ${platform}`,
        `Format: ${format}`,
        `Aspect Ratio: ${constraints.aspectRatio}`,
        constraints.durationRange ? `Duration: ${constraints.durationRange[0]}–${constraints.durationRange[1]} seconds` : '',
        `Generation Type: ${generationType}`,
        style ? `Visual Style: ${style}` : '',
        userPrompt ? `Additional Instructions: ${userPrompt}` : '',
    ].filter(Boolean).join('\n');

    const systemPrompt = `You are an expert creative director specialising in social media advertising. Return ONLY valid JSON, no markdown, no explanation.`;

    const userMessage = `Create an ad concept:

BRAND:
${brandContext}

PRODUCT MEDIA ASSETS:
${mediaContext}

PLATFORM & FORMAT:
${platformContext}

Return JSON with exactly these fields:
{
  "creativeBrief": "2-3 sentence concept description with narrative and emotional hook",
  "visualPrompt": "Detailed 150-250 word prompt optimised for ${generationType === 'VIDEO' ? 'Veo 3.1 video generation' : 'Imagen 3 image generation'}. Include scene, ${generationType === 'VIDEO' ? 'camera movement, transitions, ' : ''}lighting, colour grading, mood, text overlays if any, and brand visual elements."
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([{ text: systemPrompt }, { text: userMessage }]);

    let rawText = result.response.text().trim();
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

    let parsed: { creativeBrief: string; visualPrompt: string };
    try {
        parsed = JSON.parse(rawText);
    } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
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
