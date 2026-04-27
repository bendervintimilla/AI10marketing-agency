/**
 * Startup environment validation.
 * Call this before the server starts to fail fast with clear messages.
 */

interface EnvVar {
    name: string;
    required: boolean;
    description: string;
}

const ENV_VARS: EnvVar[] = [
    // Critical — app won't function without these
    { name: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },
    { name: 'REDIS_URL', required: true, description: 'Redis connection URL' },
    { name: 'JWT_SECRET', required: true, description: 'Secret key for JWT signing' },

    // Recommended — features are degraded without these
    { name: 'GEMINI_API_KEY', required: false, description: 'Google Gemini API key for AI features' },
    { name: 'FRONTEND_URL', required: false, description: 'Frontend URL for OAuth redirects' },
    { name: 'AWS_S3_BUCKET_NAME', required: false, description: 'S3 bucket for media storage' },

    // Optional — billing & social features
    { name: 'STRIPE_SECRET_KEY', required: false, description: 'Stripe API key (billing disabled without it)' },
    { name: 'META_APP_ID', required: false, description: 'Meta App ID for Instagram/Facebook publishing' },
    { name: 'TIKTOK_CLIENT_KEY', required: false, description: 'TikTok client key for publishing' },
    { name: 'TOKEN_ENCRYPTION_KEY', required: false, description: 'Encryption key for social account tokens' },
];

export function validateEnv(): void {
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const v of ENV_VARS) {
        const value = process.env[v.name];
        const isPlaceholder = value?.startsWith('your_') || value?.startsWith('change-me');

        if (v.required) {
            if (!value || isPlaceholder) {
                missing.push(`  ✗ ${v.name} — ${v.description}`);
            }
        } else {
            if (!value || isPlaceholder) {
                warnings.push(`  ⚠ ${v.name} — ${v.description} (feature will be disabled)`);
            }
        }
    }

    if (warnings.length > 0) {
        console.warn('\n⚠  Optional env vars not configured:\n' + warnings.join('\n') + '\n');
    }

    if (missing.length > 0) {
        console.error(
            '\n✗  Required environment variables are missing or have placeholder values:\n' +
            missing.join('\n') +
            '\n\nCopy .env.example to .env and fill in the values.\n'
        );
        process.exit(1);
    }
}
