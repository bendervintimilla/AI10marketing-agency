/**
 * audit-agent.ts — Agentic Claude analysis layer on top of raw audit data.
 *
 * The worker spawns the Python audit_runner first to gather raw platform data
 * + run the deterministic checklist. Then this agent takes that result + the
 * brand's BrandMemory + the platform skill doc + past audit history, and runs
 * Claude in an agentic loop with tools to produce:
 *   - Executive summary tailored to the brand
 *   - Top 5 prioritized actions with brand-specific reasoning
 *   - 1-2 concrete creative ideas (caption draft, post angle)
 *   - Persisted "learnings" appended to BrandMemory.notes for future audits
 *
 * Tools exposed to Claude:
 *   - load_brand_memory       → read BrandMemory snapshot
 *   - load_audit_history      → read past N AuditRuns (with their checks) for trend awareness
 *   - load_skill_doc          → read the platform-specific .md skill doc
 *   - record_audit_learning   → append a structured note to BrandMemory.notes
 *   - update_brand_memory     → persist new brand facts surfaced during analysis
 *
 * Multi-tenant safety: every tool is bound to {organizationId, brandId} resolved
 * from the audit job — Claude can't pivot across tenants.
 */
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@agency/db';
import path from 'path';
import { promises as fs } from 'fs';

const ANALYSIS_MODEL = 'claude-sonnet-4-6';
const MAX_TOOL_ROUNDS = 6;

// Resolve skill docs at runtime. Worker is deployed alongside the audits app
// in the monorepo, so paths are relative to the worker root → ../audits/src.
// Falls back gracefully if a doc is missing.
const SKILL_DOC_DIR = path.resolve(__dirname, '../../../audits/src');

type ToolName =
    | 'load_brand_memory'
    | 'load_audit_history'
    | 'load_skill_doc'
    | 'record_audit_learning'
    | 'update_brand_memory';

const TOOLS: Anthropic.Tool[] = [
    {
        name: 'load_brand_memory',
        description:
            'Read the brand memory snapshot for the brand being audited. Includes visual identity, voice profile, audience personas, legal constraints, recent assets, and accumulated audit learnings. Call this FIRST so all recommendations are brand-specific.',
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'load_audit_history',
        description:
            'Read the last N audit runs for this brand on the same platform, including their scores and which checks failed. Use this to detect trends (improving? regressing?) and reference past findings.',
        input_schema: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'How many past runs to load (default 3, max 10).' },
            },
        },
    },
    {
        name: 'load_skill_doc',
        description:
            'Read the platform skill doc (markdown reference) describing every check, threshold, and 2026 algorithm signal. Available docs: instagram-audit, meta-audit, google-audit, tiktok-audit, youtube-audit, linkedin-audit, microsoft-audit, scoring-system, benchmarks, copy-frameworks. Use this to ground recommendations in current platform best practices.',
        input_schema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Doc name without .md extension (e.g. "instagram-audit").',
                },
            },
            required: ['name'],
        },
    },
    {
        name: 'record_audit_learning',
        description:
            'Persist a strategic learning from this audit into BrandMemory so future audits remember it. Use for non-obvious insights ("Negroni\'s Reels watch-through is 32% — below industry 60% threshold; flag again next audit if not improved"). Keep concise (1-2 sentences) and dated.',
        input_schema: {
            type: 'object',
            properties: {
                learning: { type: 'string', description: 'The insight to remember, as a concise sentence.' },
                category: {
                    type: 'string',
                    description: 'Bucket: "content" | "audience" | "monetization" | "growth" | "creative" | "ops".',
                },
            },
            required: ['learning'],
        },
    },
    {
        name: 'update_brand_memory',
        description:
            "Persist new brand facts surfaced during analysis (e.g. you discovered a competitor reference or an audience insight). Same shape as Claude Design's update_brand_memory.",
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
];

const SYSTEM_PROMPT = `You are a senior digital marketing strategist embedded in AI10 Marketing Agency. You receive raw audit data from the platform's API + a deterministic checklist score, and your job is to turn it into a strategic, brand-specific report.

Your operating principles:
1. ALWAYS call load_brand_memory FIRST so every recommendation is grounded in the brand's voice, audience, and constraints.
2. Call load_skill_doc for the platform under audit so you cite the right thresholds + 2026 algorithm signals.
3. Call load_audit_history when the brand has had previous audits — show trend awareness ("Reels adoption improved from 18% to 31% since last audit").
4. Use record_audit_learning to persist 1-3 non-obvious insights so the next audit can build on them. Make them DATED and SPECIFIC.
5. Never invent data. If a metric isn't in the raw payload, say so or skip it.
6. Recommendations must be CONCRETE: not "post more Reels" — write "Aim for 4 Reels/week, prioritizing Tuesday 7-9 PM (your audience peak per IG Insights)".
7. Tie every recommendation back to a specific check ID from the checklist (IG-C1, etc.) so the report ties to the structured score.
8. Respect legal_constraints from BrandMemory — if the brand banned a word/claim, never use it in suggested copy.

Output format (you produce this on the FINAL turn after tool use is done — return as a single JSON object):
{
  "executiveSummary": "2-3 paragraph strategic overview tailored to the brand. Reference industry, competitors if known, and the brand's specific situation.",
  "topActions": [
    {
      "priority": 1,
      "checkRefs": ["IG-C1", "IG-C9"],
      "title": "Short imperative title",
      "rationale": "Why this matters for this brand specifically (not generic).",
      "specificSteps": ["Step 1", "Step 2", "Step 3"],
      "expectedImpact": "Measurable outcome (e.g. '+15% Reel reach in 30 days')"
    }
  ],
  "creativeIdeas": [
    {
      "format": "REEL | STORY | CAROUSEL | POST",
      "concept": "1-2 sentence creative concept on-brand for this account",
      "captionDraft": "Caption respecting voice + length limits",
      "hashtagSuggestion": ["3-5 relevant tags"]
    }
  ],
  "trendNotes": "If audit history was loaded: 1-2 sentences on trend (improving/regressing/flat).",
  "learnings": ["Bullet list of strategic learnings worth remembering"]
}

Top actions: 3-5 items, ordered by priority (1 = highest). Creative ideas: 1-2 items, only if the data supports them. If you can't produce a high-quality idea, omit creativeIdeas entirely.

Output ONLY the JSON object on your final turn — no prose around it.`;

const SAFE_DOC_NAMES = new Set([
    'instagram-audit',
    'meta-audit',
    'google-audit',
    'tiktok-audit',
    'youtube-audit',
    'linkedin-audit',
    'microsoft-audit',
    'scoring-system',
    'benchmarks',
    'copy-frameworks',
    'budget-allocation',
    'bidding-strategies',
    'compliance',
    'conversion-tracking',
    'meta-creative-specs',
    'google-creative-specs',
    'tiktok-creative-specs',
    'linkedin-creative-specs',
    'youtube-creative-specs',
    'microsoft-creative-specs',
    'platform-specs',
    'voice-to-style',
    'brand-dna-template',
    'mcp-integration',
    'image-providers',
    'additional-platforms',
    'gaql-notes',
]);

interface AgentContext {
    organizationId: string;
    brandId: string;
    platform: string;
}

async function executeTool(
    name: ToolName,
    input: any,
    ctx: AgentContext
): Promise<any> {
    switch (name) {
        case 'load_brand_memory': {
            const memory = await prisma.brandMemory.findUnique({
                where: { brandId: ctx.brandId },
                include: {
                    assets: {
                        take: 12,
                        orderBy: { createdAt: 'desc' },
                        select: { type: true, caption: true, tags: true },
                    },
                },
            });
            if (!memory) return { exists: false };
            return {
                exists: true,
                visualIdentity: memory.visualIdentity,
                voiceProfile: memory.voiceProfile,
                productCatalog: memory.productCatalog,
                audiencePersonas: memory.audiencePersonas,
                competitorRefs: memory.competitorRefs,
                legalConstraints: memory.legalConstraints,
                designSystem: memory.designSystem,
                notes: memory.notes ?? '',
                recentAssets: memory.assets,
            };
        }

        case 'load_audit_history': {
            const limit = Math.min(input.limit ?? 3, 10);
            const runs = await prisma.auditRun.findMany({
                where: {
                    brandId: ctx.brandId,
                    platform: ctx.platform as any,
                    status: 'COMPLETED' as any,
                },
                orderBy: { startedAt: 'desc' },
                take: limit,
                include: {
                    checks: {
                        where: { status: 'FAIL' as any },
                        select: {
                            checkId: true,
                            category: true,
                            severity: true,
                            message: true,
                        },
                    },
                },
            });
            return runs.map((r) => ({
                runId: r.id,
                startedAt: r.startedAt,
                score: r.score,
                grade: r.grade,
                summary: r.summary,
                failedChecks: r.checks,
            }));
        }

        case 'load_skill_doc': {
            const docName = String(input.name ?? '').toLowerCase().trim();
            if (!SAFE_DOC_NAMES.has(docName)) {
                return { error: `Unknown skill doc: ${docName}. Available: ${Array.from(SAFE_DOC_NAMES).slice(0, 10).join(', ')}…` };
            }
            try {
                const filePath = path.join(SKILL_DOC_DIR, `${docName}.md`);
                const content = await fs.readFile(filePath, 'utf-8');
                // Cap size — skill docs can be huge; first ~12K chars is the meat (categories + thresholds)
                return { name: docName, content: content.slice(0, 12_000) };
            } catch (err: any) {
                return { error: `Failed to read skill doc: ${err?.message ?? 'unknown'}` };
            }
        }

        case 'record_audit_learning': {
            const learning = String(input.learning ?? '').trim();
            const category = String(input.category ?? 'general').trim();
            if (!learning) return { error: 'learning is required' };

            const stamp = new Date().toISOString().slice(0, 10);
            const line = `\n[${stamp}] [audit-${ctx.platform.toLowerCase()}/${category}] ${learning}`;

            const existing = await prisma.brandMemory.findUnique({
                where: { brandId: ctx.brandId },
                select: { id: true, notes: true, organizationId: true },
            });

            if (existing) {
                const merged = ((existing.notes ?? '') + line).slice(-12_000); // keep last 12K chars
                await prisma.brandMemory.update({
                    where: { id: existing.id },
                    data: { notes: merged },
                });
            } else {
                await prisma.brandMemory.create({
                    data: {
                        organizationId: ctx.organizationId,
                        brandId: ctx.brandId,
                        notes: line.trim(),
                    },
                });
            }
            return { ok: true };
        }

        case 'update_brand_memory': {
            const allowed = [
                'visualIdentity', 'voiceProfile', 'productCatalog',
                'audiencePersonas', 'competitorRefs', 'legalConstraints',
                'designSystem', 'notes',
            ] as const;
            const data: Record<string, unknown> = {};
            for (const k of allowed) {
                if (k in input) data[k] = input[k];
            }
            await prisma.brandMemory.upsert({
                where: { brandId: ctx.brandId },
                create: {
                    organizationId: ctx.organizationId,
                    brandId: ctx.brandId,
                    ...data,
                },
                update: data,
            });
            return { ok: true, fieldsUpdated: Object.keys(data) };
        }

        default:
            return { error: `Unknown tool: ${name}` };
    }
}

export interface AuditAnalysisInput {
    organizationId: string;
    brandId: string;
    brandName: string;
    platform: string;
    /**
     * BCP-47-ish locale. Currently only 'en' and 'es' produce translated output.
     * Anything else falls back to English.
     */
    locale?: string;
    rawResult: {
        score?: number;
        grade?: string;
        checks?: Array<{
            check_id: string;
            category: string;
            status: string;
            severity: string;
            message: string;
            recommendation?: string | null;
            evidence?: any;
        }>;
        summary?: any;
        // Raw platform data the Python fetcher gathered (whatever shape — we
        // pass through to Claude as context).
        raw?: any;
    };
}

export interface AuditAnalysis {
    executiveSummary: string;
    topActions: Array<{
        priority: number;
        checkRefs: string[];
        title: string;
        rationale: string;
        specificSteps: string[];
        expectedImpact: string;
    }>;
    creativeIdeas?: Array<{
        format: string;
        concept: string;
        captionDraft: string;
        hashtagSuggestion?: string[];
    }>;
    trendNotes?: string;
    learnings?: string[];
    // Diagnostics
    toolCalls: number;
    durationMs: number;
}

/**
 * Returns null if the agent is disabled (no API key) so the caller can fall
 * back to the legacy plain output.
 */
export async function analyzeAudit(
    input: AuditAnalysisInput
): Promise<AuditAnalysis | null> {
    if (!process.env.ANTHROPIC_API_KEY) return null;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const start = Date.now();

    const ctx: AgentContext = {
        organizationId: input.organizationId,
        brandId: input.brandId,
        platform: input.platform,
    };

    const locale = (input.locale ?? 'en').toLowerCase().slice(0, 2);
    const langInstruction = locale === 'es'
        ? '\n\nLANGUAGE: Write ALL output values (executiveSummary, topActions[].title/rationale/specificSteps/expectedImpact, creativeIdeas[].concept/captionDraft, trendNotes, learnings) in neutral Latin American Spanish (Ecuador style — use "tú", "avísame", "configuración"; do NOT use Argentinian voseo or Iberian "vosotros"). Field names in the JSON stay in English. Citations of check IDs (IG-C1, etc.) stay verbatim.'
        : '\n\nLANGUAGE: Write all output values in English.';

    // Initial user message: hand Claude the audit payload + a clear ask.
    const userPayload = {
        brandName: input.brandName,
        platform: input.platform,
        deterministicScore: input.rawResult.score,
        deterministicGrade: input.rawResult.grade,
        checks: input.rawResult.checks ?? [],
        summary: input.rawResult.summary ?? null,
        rawDataExcerpt: input.rawResult.raw ? JSON.stringify(input.rawResult.raw).slice(0, 8_000) : null,
    };

    const conversation: any[] = [
        {
            role: 'user',
            content:
                `Please analyze this ${input.platform} audit for "${input.brandName}".\n\n` +
                `<audit_data>\n${JSON.stringify(userPayload, null, 2).slice(0, 30_000)}\n</audit_data>\n\n` +
                `Use your tools to load brand memory, the relevant skill doc, and past audit history. Then return the analysis JSON described in your system prompt. Persist 1-2 strategic learnings via record_audit_learning before finishing.`,
        },
    ];

    let toolCalls = 0;
    let finalText = '';

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await anthropic.messages.create({
            model: ANALYSIS_MODEL,
            max_tokens: 4096,
            system: [
                {
                    type: 'text',
                    text: SYSTEM_PROMPT,
                    cache_control: { type: 'ephemeral' },
                },
                {
                    type: 'text',
                    text: langInstruction,
                },
            ],
            tools: TOOLS,
            messages: conversation,
        });

        conversation.push({ role: 'assistant', content: response.content });

        const toolUses = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        );
        const textBlocks = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join('\n');
        if (textBlocks) finalText = textBlocks;

        if (toolUses.length === 0 || response.stop_reason === 'end_turn') {
            break;
        }

        const toolResults: any[] = [];
        for (const tu of toolUses) {
            toolCalls++;
            const out = await executeTool(tu.name as ToolName, tu.input, ctx).catch((err: any) => ({
                error: err?.message ?? 'tool_failed',
            }));
            toolResults.push({
                type: 'tool_result',
                tool_use_id: tu.id,
                content: JSON.stringify(out).slice(0, 80_000),
            });
        }
        conversation.push({ role: 'user', content: toolResults });
    }

    // Parse the final JSON. Claude sometimes wraps it in ```json fences — strip those.
    const cleaned = finalText
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/\s*```\s*$/m, '')
        .trim();

    let parsed: AuditAnalysis;
    try {
        const obj = JSON.parse(cleaned);
        parsed = {
            executiveSummary: String(obj.executiveSummary ?? ''),
            topActions: Array.isArray(obj.topActions) ? obj.topActions : [],
            creativeIdeas: Array.isArray(obj.creativeIdeas) ? obj.creativeIdeas : undefined,
            trendNotes: typeof obj.trendNotes === 'string' ? obj.trendNotes : undefined,
            learnings: Array.isArray(obj.learnings) ? obj.learnings : undefined,
            toolCalls,
            durationMs: Date.now() - start,
        };
    } catch {
        // If Claude failed to produce valid JSON, surface a minimal analysis using the prose.
        parsed = {
            executiveSummary: finalText.slice(0, 2000) || 'Claude analysis failed to produce structured output.',
            topActions: [],
            toolCalls,
            durationMs: Date.now() - start,
        };
    }

    return parsed;
}

// Per-locale header strings used by both renderAnalysisMarkdown (Claude
// section) and renderChecklistMarkdown (deterministic Python section).
// English is the fallback for any unknown locale.
const REPORT_STR = {
    en: {
        aiAnalysis: '🤖 AI Strategic Analysis',
        noSummary: '_(no summary)_',
        trend: 'Trend',
        topPriorityActions: 'Top Priority Actions',
        tiedToChecks: 'Tied to checks',
        why: 'Why',
        steps: 'Steps',
        expectedImpact: 'Expected impact',
        creativeIdeas: 'Creative Ideas',
        tags: 'Tags',
        learnings: 'Learnings recorded',
        diagnostics: (n: number, ms: number) => `AI analysis · ${n} tool calls · ${ms}ms`,
        // checklist
        auditTitle: (platform: string, brand: string) => `${platform} Audit — ${brand}`,
        generated: 'Generated',
        scoreLine: (s: number, g: string) => `Score: ${s}/100 (Grade ${g})`,
        categoryBreakdown: 'Category Breakdown',
        category: 'Category',
        score: 'Score',
        failedChecks: (n: number) => `❌ Failed Checks (${n})`,
        warnings: (n: number) => `⚠️  Warnings (${n})`,
        passedChecks: (n: number) => `✅ Passed Checks (${n})`,
        category2: 'Category',
        severity: 'Severity',
        fix: 'Fix',
    },
    es: {
        aiAnalysis: '🤖 Análisis estratégico AI',
        noSummary: '_(sin resumen)_',
        trend: 'Tendencia',
        topPriorityActions: 'Acciones prioritarias',
        tiedToChecks: 'Atado a los checks',
        why: 'Por qué',
        steps: 'Pasos',
        expectedImpact: 'Impacto esperado',
        creativeIdeas: 'Ideas creativas',
        tags: 'Tags',
        learnings: 'Aprendizajes registrados',
        diagnostics: (n: number, ms: number) => `Análisis AI · ${n} llamadas a herramientas · ${ms}ms`,
        // checklist
        auditTitle: (platform: string, brand: string) => `Auditoría ${platform} — ${brand}`,
        generated: 'Generado',
        scoreLine: (s: number, g: string) => `Puntaje: ${s}/100 (Nota ${g})`,
        categoryBreakdown: 'Desglose por categoría',
        category: 'Categoría',
        score: 'Puntaje',
        failedChecks: (n: number) => `❌ Checks fallidos (${n})`,
        warnings: (n: number) => `⚠️  Advertencias (${n})`,
        passedChecks: (n: number) => `✅ Checks aprobados (${n})`,
        category2: 'Categoría',
        severity: 'Severidad',
        fix: 'Solución',
    },
} as const;

export function reportStrings(locale?: string) {
    const key = (locale ?? 'en').toLowerCase().slice(0, 2);
    return key === 'es' ? REPORT_STR.es : REPORT_STR.en;
}

/**
 * Render the agent analysis into the markdown that gets persisted to AuditReport.
 * Caller still adds the deterministic-checks sections (Failed/Warning/Passed) to it.
 */
export function renderAnalysisMarkdown(a: AuditAnalysis, locale?: string): string {
    const S = reportStrings(locale);
    const lines: string[] = [];
    lines.push(`## ${S.aiAnalysis}`);
    lines.push('');
    lines.push(a.executiveSummary || S.noSummary);
    lines.push('');

    if (a.trendNotes) {
        lines.push(`_${S.trend}: ${a.trendNotes}_`);
        lines.push('');
    }

    if (a.topActions.length > 0) {
        lines.push(`### ${S.topPriorityActions}`);
        lines.push('');
        for (const act of a.topActions) {
            lines.push(`#### ${act.priority}. ${act.title}`);
            if (act.checkRefs?.length) {
                lines.push(`*${S.tiedToChecks}*: ${act.checkRefs.join(', ')}`);
            }
            lines.push('');
            if (act.rationale) lines.push(`**${S.why}**: ${act.rationale}`);
            lines.push('');
            if (act.specificSteps?.length) {
                lines.push(`**${S.steps}**:`);
                for (const s of act.specificSteps) lines.push(`- ${s}`);
                lines.push('');
            }
            if (act.expectedImpact) lines.push(`**${S.expectedImpact}**: ${act.expectedImpact}`);
            lines.push('');
        }
    }

    if (a.creativeIdeas && a.creativeIdeas.length > 0) {
        lines.push(`### ${S.creativeIdeas}`);
        lines.push('');
        for (const idea of a.creativeIdeas) {
            lines.push(`**${idea.format}** — ${idea.concept}`);
            if (idea.captionDraft) {
                lines.push('');
                lines.push('> ' + idea.captionDraft.replace(/\n/g, '\n> '));
            }
            if (idea.hashtagSuggestion?.length) {
                lines.push('');
                lines.push(`${S.tags}: ${idea.hashtagSuggestion.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}`);
            }
            lines.push('');
        }
    }

    if (a.learnings && a.learnings.length > 0) {
        lines.push(`### ${S.learnings}`);
        for (const l of a.learnings) lines.push(`- ${l}`);
        lines.push('');
    }

    lines.push(`<sub>${S.diagnostics(a.toolCalls, a.durationMs)}</sub>`);
    lines.push('');
    return lines.join('\n');
}
