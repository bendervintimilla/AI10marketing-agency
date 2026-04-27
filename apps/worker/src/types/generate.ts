export interface GenerateJobPayload {
    adId: string;
    generationType: 'VIDEO' | 'IMAGE';
    productMediaIds: string[];
    brandId: string;
    campaignId: string;
    platform: string;
    format: string;
    style?: string;
    userPrompt?: string;
}
