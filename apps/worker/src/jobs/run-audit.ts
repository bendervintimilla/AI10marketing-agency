/**
 * run-audit.ts — BullMQ processor for audit jobs.
 *
 * Receives: { auditRunId, brandId, platform, credentials? }
 * Action:
 *   1. Mark AuditRun.status = RUNNING
 *   2. Spawn Python audit_runner.py with job spec on stdin
 *   3. Parse stdout JSON
 *   4. Persist AuditCheck rows + AuditReport markdown
 *   5. Mark AuditRun.status = COMPLETED with score + grade
 */

import type { Job } from 'bullmq';
import { spawn } from 'child_process';
import path from 'path';
import { prisma } from '@agency/db';
import { decrypt } from '../lib/crypto';
import { analyzeAudit, renderAnalysisMarkdown, reportStrings, AuditAnalysis } from '../agents/audit-agent';

const AUDITS_PATH = path.resolve(__dirname, '../../../audits/src/audit_runner.py');
const PYTHON = process.env.PYTHON_BIN || 'python3';

export interface AuditJobPayload {
    auditRunId: string;
    brandId: string;
    platform: 'INSTAGRAM' | 'META' | 'GOOGLE' | 'TIKTOK' | 'YOUTUBE' | 'LANDING';
    triggeredBy?: string;
    /** UI locale at the time the audit was queued — drives report language. */
    locale?: string;
}

// ─── Run Python audit_runner ──────────────────────────────────────────────────

function runPython(spec: object, timeoutMs = 120_000): Promise<any> {
    return new Promise((resolve, reject) => {
        const proc = spawn(PYTHON, [AUDITS_PATH], {
            cwd: path.dirname(AUDITS_PATH),
            env: { ...process.env, PYTHONUNBUFFERED: '1' },
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (b) => { stdout += b.toString(); });
        proc.stderr.on('data', (b) => { stderr += b.toString(); });

        const timer = setTimeout(() => {
            proc.kill('SIGKILL');
            reject(new Error(`Python audit timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        proc.on('close', (code) => {
            clearTimeout(timer);
            if (code !== 0) {
                return reject(new Error(`Python exited ${code}: ${stderr.slice(0, 1000)}`));
            }
            try {
                resolve(JSON.parse(stdout));
            } catch (e: any) {
                reject(new Error(`Failed to parse Python output: ${e.message}\n${stdout.slice(0, 500)}`));
            }
        });

        proc.stdin.write(JSON.stringify(spec));
        proc.stdin.end();
    });
}

// ─── Build Python job spec from a Brand record ────────────────────────────────

async function buildSpec(brandId: string, platform: string): Promise<object> {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new Error(`Brand ${brandId} not found`);

    if (platform === 'INSTAGRAM') {
        if (!brand.instagramUserId) {
            throw new Error(`Brand "${brand.name}" has no instagramUserId set — connect Meta in Settings → Accounts.`);
        }

        // Prefer the org's stored Meta token (from OAuth via /publish/connect/instagram).
        // Fall back to the legacy META_ACCESS_TOKEN env var so existing setups keep working.
        let token = process.env.META_ACCESS_TOKEN;
        const account = await prisma.socialAccount.findFirst({
            where: { organizationId: brand.organizationId, platform: 'INSTAGRAM' },
            orderBy: { createdAt: 'desc' },
        });
        if (account?.accessToken) {
            try {
                token = decrypt(account.accessToken);
            } catch {
                // Fall through — env var still works as last resort.
            }
        }
        if (!token) {
            throw new Error(
                'No Meta access token available — connect Facebook in Settings → Accounts.'
            );
        }
        return {
            platform: 'INSTAGRAM',
            ig_user_id: brand.instagramUserId,
            access_token: token,
            brand_name: brand.name,
        };
    }

    if (platform === 'LANDING') {
        if (!brand.websiteUrl) {
            throw new Error(`Brand "${brand.name}" has no websiteUrl set`);
        }
        return {
            platform: 'LANDING',
            url: brand.websiteUrl,
            brand_name: brand.name,
        };
    }

    // Other platforms run in "skill-doc-only mode" — Python returns an empty
    // checklist and the Claude agent does the analysis from BrandMemory + the
    // platform .md skill doc. This unblocks the UI for all platforms even
    // before we have live data fetchers + connected ad accounts for each.
    if (
        platform === 'META' ||
        platform === 'GOOGLE' ||
        platform === 'TIKTOK' ||
        platform === 'YOUTUBE'
    ) {
        return {
            platform,
            brand_name: brand.name,
            // Pass any context the agent can use — website helps platforms
            // like Google Ads where landing page quality matters.
            website_url: brand.websiteUrl ?? null,
        };
    }

    throw new Error(`Platform ${platform} not implemented in MVP`);
}

// ─── Render markdown report from audit result ─────────────────────────────────

function renderMarkdown(result: any, brandName: string, platform: string, locale?: string): string {
    const S = reportStrings(locale);
    const checks = result.checks || [];
    const summary = result.summary || {};
    const score = result.score ?? 0;
    const grade = result.grade ?? 'F';

    const passed = checks.filter((c: any) => c.status === 'PASS');
    const warned = checks.filter((c: any) => c.status === 'WARNING');
    const failed = checks.filter((c: any) => c.status === 'FAIL');

    const lines: string[] = [];
    lines.push(`# ${S.auditTitle(platform, brandName)}`);
    lines.push(`> ${S.generated}: ${new Date().toISOString()}`);
    lines.push('');
    lines.push(`## ${S.scoreLine(score, grade)}`);
    lines.push('');

    // Category breakdown
    const byCat = summary.by_category || {};
    if (Object.keys(byCat).length > 0) {
        lines.push(`### ${S.categoryBreakdown}`);
        lines.push('');
        lines.push(`| ${S.category} | ${S.score} |`);
        lines.push('|---|---|');
        for (const [cat, b] of Object.entries(byCat) as any) {
            lines.push(`| ${cat} | ${b.score ?? 'N/A'}/100 |`);
        }
        lines.push('');
    }

    // Failed checks (most important)
    if (failed.length > 0) {
        lines.push(`## ${S.failedChecks(failed.length)}`);
        lines.push('');
        for (const c of failed) {
            lines.push(`### ${c.check_id} — ${c.message}`);
            lines.push(`*${S.category2}*: ${c.category} · *${S.severity}*: ${c.severity}`);
            if (c.recommendation) {
                lines.push('');
                lines.push(`**${S.fix}**: ${c.recommendation}`);
            }
            lines.push('');
        }
    }

    // Warnings
    if (warned.length > 0) {
        lines.push(`## ${S.warnings(warned.length)}`);
        lines.push('');
        for (const c of warned) {
            lines.push(`- **${c.check_id}**: ${c.message}`);
            if (c.recommendation) lines.push(`  - ${S.fix}: ${c.recommendation}`);
        }
        lines.push('');
    }

    // Passed
    if (passed.length > 0) {
        lines.push(`## ${S.passedChecks(passed.length)}`);
        lines.push('');
        for (const c of passed) {
            lines.push(`- ${c.check_id}: ${c.message}`);
        }
    }

    return lines.join('\n');
}

// ─── Main processor ──────────────────────────────────────────────────────────

export async function processRunAudit(job: Job<AuditJobPayload>) {
    const { auditRunId, brandId, platform, locale } = job.data;
    const startedAt = Date.now();

    console.log(`[run-audit] ▶ ${platform} audit for brand=${brandId} (run=${auditRunId})`);

    // 1. Mark RUNNING
    await prisma.auditRun.update({
        where: { id: auditRunId },
        data: { status: 'RUNNING', startedAt: new Date() },
    });

    try {
        const spec = await buildSpec(brandId, platform);
        const result = await runPython(spec);

        // 2. Persist checks
        const checks = result.checks || [];
        if (checks.length > 0) {
            await prisma.auditCheck.createMany({
                data: checks.map((c: any) => ({
                    auditRunId,
                    checkId: c.check_id,
                    category: c.category,
                    status: c.status,
                    severity: c.severity,
                    message: c.message,
                    evidence: c.evidence ?? undefined,
                    recommendation: c.recommendation ?? null,
                })),
            });
        }

        // 3. Run Claude strategic analysis on top of the deterministic checks.
        //    This is the "agentic skill" layer — Claude loads brand memory,
        //    skill doc, audit history, and writes brand-specific recommendations.
        //    Disabled if ANTHROPIC_API_KEY is missing (analyzeAudit returns null).
        const brand = await prisma.brand.findUniqueOrThrow({ where: { id: brandId } });
        let analysis: AuditAnalysis | null = null;
        try {
            analysis = await analyzeAudit({
                organizationId: brand.organizationId,
                brandId: brand.id,
                brandName: brand.name,
                platform,
                locale,
                rawResult: {
                    score: result.score,
                    grade: result.grade,
                    checks: result.checks,
                    summary: result.summary,
                    raw: result.raw_data ?? result.account ?? null,
                },
            });
            if (analysis) {
                console.log(`[run-audit] 🤖 ai analysis: ${analysis.toolCalls} tool calls in ${analysis.durationMs}ms`);
            }
        } catch (err: any) {
            console.error('[run-audit] ai analysis failed:', err?.message ?? err);
            // Non-fatal: continue with the deterministic-only report.
        }

        // 4. Render + persist markdown report. AI analysis goes ON TOP of the
        //    raw checklist sections so users see the strategic narrative first.
        const checklistMarkdown = renderMarkdown(result, brand.name, platform, locale);
        const markdown = analysis
            ? `${renderAnalysisMarkdown(analysis, locale)}\n---\n\n${checklistMarkdown}`
            : checklistMarkdown;
        await prisma.auditReport.create({
            data: { auditRunId, markdown },
        });

        // 5. Persist AI analysis JSON into AuditRun.summary for the frontend
        //    (frontend can render the structured topActions card without parsing markdown).
        const enrichedSummary = analysis
            ? { ...(result.summary ?? {}), ai: {
                executiveSummary: analysis.executiveSummary,
                topActions: analysis.topActions,
                creativeIdeas: analysis.creativeIdeas,
                trendNotes: analysis.trendNotes,
                toolCalls: analysis.toolCalls,
            } }
            : result.summary;

        // 6. Mark COMPLETED
        await prisma.auditRun.update({
            where: { id: auditRunId },
            data: {
                status: 'COMPLETED',
                score: result.score,
                grade: result.grade,
                summary: enrichedSummary,
                completedAt: new Date(),
                durationMs: Date.now() - startedAt,
            },
        });

        console.log(`[run-audit] ✅ ${brand.name} ${platform}: ${result.score}/100 (${result.grade})`);
        return { score: result.score, grade: result.grade };
    } catch (err: any) {
        console.error(`[run-audit] ❌ failed:`, err.message);
        await prisma.auditRun.update({
            where: { id: auditRunId },
            data: {
                status: 'FAILED',
                errorMessage: err.message?.slice(0, 1000) ?? 'Unknown error',
                completedAt: new Date(),
                durationMs: Date.now() - startedAt,
            },
        });
        throw err;
    }
}
