import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Returns a Gemini model instance.
 * Using gemini-1.5-flash for cost/speed balance on copy generation tasks.
 */
export function getGeminiModel(modelName = 'gemini-2.0-flash') {
    return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Generates content using Gemini and returns the text response.
 */
export async function generateText(prompt: string, modelName = 'gemini-2.0-flash'): Promise<string> {
    const model = getGeminiModel(modelName);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}
