import { getGeminiModel } from '../../../lib/gemini';
import { Content } from '@google/generative-ai';

/**
 * Extended Gemini service for AI Brain — adds JSON generation and chat support.
 * Reuses the shared lib/gemini.ts model factory.
 */

export async function generateStructuredContent<T>(prompt: string): Promise<T> {
    const model = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(
        `${prompt}\n\nRespond ONLY with valid JSON. No markdown fences, no commentary.`
    );
    const text = result.response.text().trim();
    // Strip ```json blocks if model includes them despite instruction
    const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/```$/, '').trim();
    return JSON.parse(clean) as T;
}

export async function generateNarrativeContent(prompt: string): Promise<string> {
    const model = getGeminiModel('gemini-2.0-flash');
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}

export async function runChatSession(
    history: Content[],
    userMessage: string
): Promise<string> {
    const model = getGeminiModel('gemini-2.0-flash');
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userMessage);
    return result.response.text().trim();
}
