import { Agent } from './agent.interface';
import { AgentContext, AgentMetadata, AgentPriority, AgentFile } from '../types/agent.types';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { LLMJsonParser } from '../utils/json-parser';
import { getSupportedLanguages, getLanguageFromExtension } from '../config/language-config';
import { promises as fs } from 'fs';
import * as path from 'path';
import type {
  PentestAnalysisOutput,
  PentestFinding,
  AttackSurfaceEntry,
  Severity,
  OwaspCategory,
} from '../schemas/pentest-analysis.schema';
import { validatePentestAnalysis } from '../schemas/pentest-analysis.schema';
import { AttackSurfaceService } from '../services/attack-surface.service';
import {
  VulnerabilityDetectionService,
  VulnerabilityScanResult,
  VulnerabilityFinding,
} from '../services/vulnerability-detection.service';
import { normalizePentestPayload } from '../utils/pentest-payload-normalizer';
import { validateLlmFindings } from '../utils/pentest-finding-validator';
import {
  buildFileFlagMap,
  extractSnippetForFile,
  FileFlagMap,
} from '../utils/pentest-snippet-extractor';

// ---------------------------------------------------------------------------
// OWASP category mapping (tool findings → schema enum)
// ---------------------------------------------------------------------------

const VALID_OWASP_CATEGORIES = new Set<OwaspCategory>([
  'A01:2021-Broken_Access_Control',
  'A02:2021-Cryptographic_Failures',
  'A03:2021-Injection',
  'A04:2021-Insecure_Design',
  'A05:2021-Security_Misconfiguration',
  'A06:2021-Vulnerable_and_Outdated_Components',
  'A07:2021-Identification_and_Authentication_Failures',
  'A08:2021-Software_and_Data_Integrity_Failures',
  'A09:2021-Security_Logging_and_Monitoring_Failures',
  'A10:2021-Server-Side_Request_Forgery_SSRF',
  'other',
]);

function normalizeOwaspCategory(cat?: string): OwaspCategory | undefined {
  if (!cat) return undefined;
  if (VALID_OWASP_CATEGORIES.has(cat as OwaspCategory)) return cat as OwaspCategory;
  const l = cat.toLowerCase();
  if (l.includes('a01') || l.includes('access')) return 'A01:2021-Broken_Access_Control';
  if (l.includes('a02') || l.includes('crypt')) return 'A02:2021-Cryptographic_Failures';
  if (l.includes('a03') || l.includes('inject')) return 'A03:2021-Injection';
  if (l.includes('a04') || l.includes('design')) return 'A04:2021-Insecure_Design';
  if (l.includes('a05') || l.includes('misconfig')) return 'A05:2021-Security_Misconfiguration';
  if (l.includes('a06') || l.includes('outdated') || l.includes('vulnerable'))
    return 'A06:2021-Vulnerable_and_Outdated_Components';
  if (l.includes('a07') || l.includes('auth'))
    return 'A07:2021-Identification_and_Authentication_Failures';
  if (l.includes('a08') || l.includes('integrity'))
    return 'A08:2021-Software_and_Data_Integrity_Failures';
  if (l.includes('a09') || l.includes('log'))
    return 'A09:2021-Security_Logging_and_Monitoring_Failures';
  if (l.includes('a10') || l.includes('ssrf')) return 'A10:2021-Server-Side_Request_Forgery_SSRF';
  return undefined;
}

// ---------------------------------------------------------------------------
// Remediation text for deterministic tool findings (no LLM needed)
// ---------------------------------------------------------------------------

function generateToolRemediation(tf: VulnerabilityFinding): string {
  if (tf.type === 'dependency_cve') {
    if (tf.fixedVersion && tf.packageName) {
      return (
        `Update \`${tf.packageName}\` to \`${tf.fixedVersion}\` or later. ` +
        `Run: \`npm install ${tf.packageName}@${tf.fixedVersion}\``
      );
    }
    return `Update \`${tf.packageName ?? 'the affected package'}\` to the latest patched version. Check the advisory for details.`;
  }
  if (tf.type === 'secret') {
    return (
      'Remove the secret from source code immediately and rotate the exposed credential. ' +
      'Use environment variables or a secrets manager (e.g. AWS Secrets Manager, Vault).'
    );
  }
  if (tf.type === 'misconfiguration') {
    return `Review and remediate the misconfiguration identified by ${tf.tool}. Consult the tool documentation for recommended settings.`;
  }
  if (tf.type === 'code_pattern') {
    return (
      'Fix the flagged code pattern following secure coding guidelines for this vulnerability class. ' +
      `Refer to the ${tf.tool} rule documentation for a specific remediation example.`
    );
  }
  return 'Address the identified vulnerability following security best practices.';
}

// ---------------------------------------------------------------------------
// Deduplication: does an LLM finding overlap with a tool finding?
// ---------------------------------------------------------------------------

function normPath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase().trim();
}

/**
 * Returns true if the LLM finding appears to describe the same issue as a
 * deterministic tool finding. Criteria (any match → duplicate):
 *   1. CVE ID appears in the LLM finding's text.
 *   2. Same package name + similar title keywords.
 *   3. Same file + nearby line (±10) + shared significant title word.
 */
function isDuplicateOfToolFinding(
  llm: PentestFinding,
  toolFinding: PentestFinding,
  origTf: VulnerabilityFinding,
): boolean {
  const llmText = (
    (llm.title ?? '') +
    ' ' +
    (llm.description ?? '') +
    ' ' +
    (llm.evidence ?? '')
  ).toLowerCase();

  // Tier 1: CVE match
  if (origTf.cve && llmText.includes(origTf.cve.toLowerCase())) return true;

  // Tier 2: Package name + shared title keyword
  if (origTf.packageName) {
    const pkg = origTf.packageName.toLowerCase();
    if (llmText.includes(pkg)) {
      const tfWords = origTf.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(' ')
        .filter((w) => w.length > 4);
      if (tfWords.some((w) => llmText.includes(w))) return true;
    }
  }

  // Tier 3: Same file + nearby line + shared title word
  if (llm.file && toolFinding.file) {
    const llmFile = normPath(llm.file);
    const tfFile = normPath(toolFinding.file);
    const sameFile =
      llmFile === tfFile ||
      llmFile.endsWith('/' + tfFile) ||
      tfFile.endsWith('/' + llmFile) ||
      path.basename(llmFile) === path.basename(tfFile);

    if (sameFile) {
      const withinLines =
        llm.line != null && toolFinding.line != null && Math.abs(llm.line - toolFinding.line) <= 10;
      const tfWords = (toolFinding.title ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(' ')
        .filter((w) => w.length > 5);
      const titleOverlap = tfWords.some(
        (w) => llmText.includes(w) || (llm.title ?? '').toLowerCase().includes(w),
      );
      if (withinLines || titleOverlap) return true;
    }
  }

  return false;
}

/**
 * Agent that performs penetration testing analysis on the codebase.
 *
 * Architecture — Dual-path finding pipeline:
 *
 *   Path A (deterministic): Tool findings (Trivy, Semgrep, npm audit, built-in)
 *     → converted directly to PentestFinding[] with confidence 95 and
 *       evidenceSource 'tool'. These bypass the LLM and are guaranteed in the output.
 *
 *   Path B (LLM-enriched): The LLM receives the endpoints table, targeted code snippets,
 *     and the tool tables (framed as "already included") and is asked ONLY to add
 *     findings that static tools cannot detect (business logic, IDOR, auth flows, etc.).
 *     LLM output is validated by validateLlmFindings() before merging.
 *
 *   Merge: deterministic tool findings + validated LLM-additive findings, deduplicated.
 */
export class PenetrationTestingAgent extends BaseAgentWorkflow implements Agent {
  private discoveredAttackSurfaces: AttackSurfaceEntry[] = [];
  private vulnScanResult: VulnerabilityScanResult | null = null;
  /** Deterministic Path A findings converted from raw tool output. */
  private deterministicFindings: PentestFinding[] = [];
  /** VulnerabilityFinding[] parallel to deterministicFindings (needed for dedup). */
  private rawToolFindings: VulnerabilityFinding[] = [];
  /** Project file list cached from the context so parseAnalysis() can verify file citations. */
  private projectFiles: string[] = [];

  private readonly attackSurfaceService = new AttackSurfaceService();
  private readonly vulnDetectionService = new VulnerabilityDetectionService();

  public getMetadata(): AgentMetadata {
    return {
      name: 'penetration-testing',
      version: '2.0.0',
      description:
        'Identifies attack surfaces, vulnerabilities, and maps findings to OWASP Top 10 for penetration testing',
      priority: AgentPriority.MEDIUM,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: true,
        dependencies: ['security-analyzer', 'dependency-analyzer'],
        supportsIncremental: true,
        estimatedTokens: 6000,
        supportedLanguages: getSupportedLanguages(),
      },
      tags: [
        'pentest',
        'security',
        'owasp',
        'vulnerabilities',
        'attack-surface',
        'threat-modeling',
      ],
      outputFilename: 'pentest-findings.md',
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    const pentestIndicators = [
      'route',
      'api',
      'auth',
      'controller',
      'handler',
      'middleware',
      'config',
      'env',
    ];
    const hasRelevantFiles = context.files.some((file) =>
      pentestIndicators.some((indicator) => file.toLowerCase().includes(indicator)),
    );
    return hasRelevantFiles || context.files.length > 10;
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    return 5000 + Math.min(context.files.length * 12, 12000);
  }

  public async execute(
    context: AgentContext,
    options?: import('../types/agent.types').AgentExecutionOptions,
  ): Promise<import('../types/agent.types').AgentResult> {
    // Run the base workflow (LLM call → parseAnalysis → refinement loop).
    const result = await super.execute(context, options);

    // -----------------------------------------------------------------------
    // Dual-path merge: Deterministic tool findings (Path A) + validated LLM
    // additive findings (Path B) → combined, deduplicated.
    // -----------------------------------------------------------------------
    const llmFindings =
      ((result.data as Record<string, unknown>).findings as PentestFinding[]) ?? [];
    const allFindings = this.mergeAndDeduplicateFindings(this.deterministicFindings, llmFindings);

    const mergedData: Record<string, unknown> = {
      ...(result.data as Record<string, unknown>),
      findings: allFindings,
      metadata: {
        ...((result.data as Record<string, unknown>).metadata ?? {}),
        totalFindings: allFindings.length,
        criticalCount: allFindings.filter((f) => f.severity === 'critical').length,
        highCount: allFindings.filter((f) => f.severity === 'high').length,
      },
    };

    const merged = this.mergeAttackSurfaces(mergedData);

    // Regenerate pentest-findings.md from merged data so the report includes both
    // deterministic tool findings and LLM-additive findings (base workflow only had LLM data).
    const filesWithMergedReport = this.replacePentestReportContent(result.files ?? [], merged);

    return {
      ...result,
      data: merged,
      files: filesWithMergedReport,
    };
  }

  /**
   * Replace the pentest-findings.md file content with the report built from merged data
   * (deterministic tool findings + validated LLM findings). The base workflow generates
   * the markdown from LLM-only data; we must overwrite it so the written report is complete.
   */
  private replacePentestReportContent(
    files: AgentFile[],
    mergedData: Record<string, unknown>,
  ): AgentFile[] {
    const markdown = this.formatPentestMarkdown(mergedData as unknown as PentestAnalysisOutput);
    return files.map((file) =>
      file.filename === 'pentest-findings.md' ? { ...file, content: markdown } : file,
    );
  }

  protected getAgentName(): string {
    return 'penetration-testing';
  }

  // -------------------------------------------------------------------------
  // System prompt — LLM role: ADDITIVE analyst, not generator
  // -------------------------------------------------------------------------

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert penetration tester reviewing a codebase to identify security vulnerabilities that STATIC ANALYSIS TOOLS CANNOT DETECT.

CONTEXT: Static tools (Semgrep, Trivy, npm audit, built-in secret scanner) have already analyzed this project. Their findings are ALREADY included in the final security report and will appear alongside your output. You must NOT repeat, rephrase, or duplicate any of those tool-detected findings.

YOUR TASK — add ONLY findings that require human-like code reasoning:
- Business logic flaws (e.g. IDOR — insecure direct object references, broken object-level authorization)
- Authentication/authorization gaps visible in the code flow (e.g. unguarded admin routes, missing auth middleware on sensitive endpoints, privilege escalation paths)
- Missing security controls visible in the endpoints table (e.g. no rate limiting on login/register endpoints, missing CSRF on state-changing routes, unauthenticated sensitive operations)
- Insecure data flows visible in snippets (e.g. unsanitized user input reaching queries/commands, stack traces exposed in error responses, PII logged in plain text)
- Dangerous code patterns the tools did not flag (e.g. eval() with user input, unsafe deserialization, prototype pollution, insecure regex)
- Sensitive data/config exposure (e.g. verbose error messages, exposed debug endpoints, API docs without auth)
- Session and token management issues (e.g. missing token expiry, insecure storage, logout not invalidating server-side session)

DO NOT ADD findings for:
- CVEs or package vulnerabilities (already covered by Trivy/npm audit in the tool tables)
- Known-secret patterns already detected (AWS keys, GitHub tokens, PEM keys — already covered by built-in + Trivy)
- Standard Semgrep-detected patterns already in the code-level findings table

**JSON output rules (your response is parsed by code):**
- Every finding must have: id (string), title (string), severity (exactly one of: critical, high, medium, low, info), description (string), recommendation (string).
- attackSurfaces: use the discovered endpoints table; add auth/rate-limit/validation based on code.
- recommendations: array of strings. metadata: include totalFindings, criticalCount, highCount as numbers.

**Exact shape (copy this structure):**
{
  "summary": "Executive summary covering tool-detected and code-analysis findings combined (2-4 sentences).",
  "findings": [
    {
      "id": "llm-1",
      "title": "Short title",
      "severity": "high",
      "owaspCategory": "A01:2021-Broken_Access_Control",
      "description": "What was found.",
      "evidence": "Where in the code — specific file, line, or code pattern.",
      "recommendation": "How to fix.",
      "file": "path/to/file.js",
      "line": 10,
      "evidenceSource": "snippet",
      "confidence": 80
    }
  ],
  "attackSurfaces": [{"path": "/api/foo", "method": "POST", "authRequired": false, "rateLimited": false, "inputValidation": true}],
  "privilegedRoutes": [{"path": "/admin", "role": "admin"}],
  "recommendations": ["First recommendation.", "Second recommendation."],
  "metadata": {"totalFindings": 3, "criticalCount": 0, "highCount": 1}
}

**evidenceSource rules (REQUIRED on every finding):**
- "snippet"  → finding is based on a code pattern visible in the provided file snippets. Include the file name and approximate line.
- "endpoint" → finding is based on the discovered endpoints table (e.g. missing auth, missing rate limit). Reference the path.
- "inferred" → you cannot point to any specific snippet or endpoint row. Use sparingly; keep confidence ≤ 50 for inferred findings.

**confidence rules (REQUIRED, 0–100):**
- 70–89  → clearly visible in the provided snippet.
- 50–69  → pattern visible in endpoints table or partial snippet evidence.
- < 50   → inferred; no direct evidence. Do not assign severity higher than "medium" if confidence < 50.

Be specific: real file paths and line numbers from the snippets. Severity only: critical, high, medium, low, info.

If the tool findings already cover everything you can observe in the snippets and endpoints, return an empty findings array — quality over quantity. Do NOT invent findings to fill a quota.

${this.getResponseLengthGuidance(_context)}

CRITICAL: Output ONLY the JSON object. No markdown, no code fence, no explanation. Start with { and end with }.`;
  }

  // -------------------------------------------------------------------------
  // Human prompt — targeted snippets + "already included" framing for tool tables
  // -------------------------------------------------------------------------

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    // Guard: run the scan only once (refinement loops call buildHumanPrompt again).
    if (!this.vulnScanResult) {
      this.projectFiles = context.files;
      this.discoveredAttackSurfaces = await this.attackSurfaceService.discoverEndpoints(
        context.projectPath,
        context.files,
      );
      this.vulnScanResult = await this.vulnDetectionService.scan(
        context.projectPath,
        context.files,
      );
      // Convert tool findings to Path A (deterministic) findings immediately.
      this.rawToolFindings = this.vulnScanResult.findings;
      this.deterministicFindings = this.convertToolFindingsToOutput(this.rawToolFindings);
    }

    // Build file flag map so we extract regions around flagged lines.
    const flagMap: FileFlagMap = buildFileFlagMap(this.rawToolFindings);

    // File selection order (priority highest → lowest):
    //   1. package.json (dependency context)
    //   2. Tool-flagged files (grounded evidence for targeted extraction)
    //   3. Route/security files (attack surface context)
    const routeAndSecurityFiles = context.files.filter((file) => {
      const lower = file.toLowerCase();
      return (
        lower.includes('route') ||
        lower.includes('api') ||
        lower.includes('auth') ||
        lower.includes('controller') ||
        lower.includes('handler') ||
        lower.includes('middleware') ||
        lower.includes('config') ||
        lower.includes('.env') ||
        lower.includes('app.') ||
        lower.includes('server.')
      );
    });

    const packageJson = context.files.find((f) => f.toLowerCase().endsWith('package.json'));

    const toolFlaggedFiles: string[] =
      this.rawToolFindings.length > 0
        ? [
            ...new Set(
              this.rawToolFindings
                .map((f) => f.file)
                .filter((fPath): fPath is string => !!fPath)
                .map((fPath) =>
                  path.isAbsolute(fPath) ? fPath : path.join(context.projectPath, fPath),
                )
                .filter((fPath) => context.files.includes(fPath)),
            ),
          ]
        : [];

    const candidateFiles = [
      ...(packageJson ? [packageJson] : []),
      ...toolFlaggedFiles.filter((f) => f !== packageJson),
      ...routeAndSecurityFiles.filter((f) => f !== packageJson && !toolFlaggedFiles.includes(f)),
    ];
    const filesToRead = candidateFiles.slice(0, 20);

    // Read file contents and apply smart snippet extraction.
    const fileContents = await this.readFilesWithTargetedExtraction(
      context.projectPath,
      filesToRead,
      flagMap,
    );

    // Discovered endpoints table
    const discoveredTable =
      this.discoveredAttackSurfaces.length > 0
        ? `\n**Discovered endpoints (static analysis)** – flag missing auth/rate limiting, CSRF, CORS, security headers:\n| Path | Method | Auth | Rate limit | Validation | CSRF | CORS | Headers | Privileged | Upload | File |\n|------|--------|------|------------|------------|------|------|---------|------------|--------|------|\n${this.discoveredAttackSurfaces
            .slice(0, 80)
            .map(
              (e) =>
                `| ${e.path} | ${e.method ?? '-'} | ${e.authRequired ? (e.authType ?? 'yes') : 'no'} | ${e.rateLimited ? 'yes' : 'no'} | ${e.inputValidation ? 'yes' : 'no'} | ${e.csrfProtected ? 'yes' : 'no'} | ${e.corsConfigured ? 'yes' : 'no'} | ${e.securityHeaders ? 'yes' : 'no'} | ${e.isPrivileged ? 'yes' : 'no'} | ${e.isFileUpload ? 'yes' : 'no'} | ${e.sourceFile ?? '-'} |`,
            )
            .join('\n')}\n`
        : '';

    // Tool findings formatted with "already included" framing.
    const toolSection = this.formatToolSectionForPrompt(this.vulnScanResult);

    return `Analyze this project for additional security vulnerabilities beyond what static tools already detected.

**Project**: ${context.projectPath}
**Total files**: ${context.files.length}
**Route/security-relevant files**: ${routeAndSecurityFiles.length}
**Discovered endpoints (count)**: ${this.discoveredAttackSurfaces.length}
${discoveredTable}
**Languages**: ${context.languageHints.map((h) => h.language).join(', ')}

**Code snippets** (up to 20 files; tool-flagged files use targeted region extraction):
${fileContents
  .map(
    (fc) => `
### ${fc.relativePath}${fc.isTargeted ? ' ⚑ (tool-flagged — targeted region)' : ''}
\`\`\`${this.getFileExtension(fc.relativePath)}
${fc.content}
\`\`\`
`,
  )
  .join('\n')}

**Other key paths to consider**:
${routeAndSecurityFiles
  .slice(0, 25)
  .map((f) => `- ${path.relative(context.projectPath, f)}`)
  .join('\n')}

${toolSection}

Produce the JSON analysis: summary (covering both tool-detected + your new findings), your ADDITIONAL findings only (not already in tools above), attackSurfaces (from discovered endpoints table), privilegedRoutes, recommendations, metadata (counts include ONLY your additional findings here — tool findings are added separately in the report).`;
  }

  // -------------------------------------------------------------------------
  // parseAnalysis — schema validation + post-LLM deterministic validation
  // -------------------------------------------------------------------------

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    const parsed = LLMJsonParser.parse<unknown>(analysis, {
      contextName: 'penetration-testing',
      logErrors: true,
      fallback: this.getFallbackOutput(),
    });

    const normalized = normalizePentestPayload(parsed);
    const validation = validatePentestAnalysis(normalized);

    const rawFindings: PentestFinding[] = validation.success
      ? validation.data.findings
      : (validation.fallback.findings ?? []);

    const baseData = validation.success ? validation.data : validation.fallback;

    if (!validation.success) {
      this.logger.warn('Pentest output validation had issues', { errors: validation.errors });
    }

    // Apply post-LLM deterministic validation (rejects/downgrades hallucinations).
    const validationResult = validateLlmFindings(
      rawFindings,
      this.rawToolFindings,
      this.projectFiles,
    );

    if (validationResult.stats.rejected > 0 || validationResult.stats.sourceDowngraded > 0) {
      this.logger.info('Pentest post-LLM validation applied', {
        total: validationResult.stats.total,
        rejected: validationResult.stats.rejected,
        sourceDowngraded: validationResult.stats.sourceDowngraded,
        fileFlagged: validationResult.stats.fileFlagged,
        severityCapped: validationResult.stats.severityCapped,
      });
    }

    return {
      ...(baseData as unknown as Record<string, unknown>),
      findings: validationResult.validated,
    };
  }

  // -------------------------------------------------------------------------
  // formatMarkdown / generateSummary / generateFiles (unchanged contract)
  // -------------------------------------------------------------------------

  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: Record<string, unknown>,
  ): Promise<string> {
    return this.formatPentestMarkdown(data as unknown as PentestAnalysisOutput);
  }

  protected generateSummary(data: Record<string, unknown>): string {
    const out = data as unknown as PentestAnalysisOutput;
    return out.summary || 'Penetration testing analysis completed.';
  }

  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    const merged = this.mergeAttackSurfaces(data);
    const markdown = await this.formatMarkdown(merged, state);
    const metadata = this.getMetadata();
    return [
      {
        filename: 'pentest-findings.md',
        content: markdown,
        title: 'Penetration Testing Findings',
        category: 'security',
        order: metadata.priority,
      },
    ];
  }

  // -------------------------------------------------------------------------
  // Dual-path merge: deterministic tool findings + validated LLM findings
  // -------------------------------------------------------------------------

  /**
   * Convert raw VulnerabilityFinding[] (from tool pipeline) into PentestFinding[]
   * with deterministic confidence (95) and evidenceSource 'tool'.
   * These findings bypass the LLM entirely.
   */
  private convertToolFindingsToOutput(toolFindings: VulnerabilityFinding[]): PentestFinding[] {
    return toolFindings.map(
      (tf, idx): PentestFinding =>
        ({
          id: `tf-${tf.id ?? `${tf.tool}-${idx + 1}`}`,
          title: tf.title,
          severity: tf.severity as Severity,
          owaspCategory: normalizeOwaspCategory(tf.owaspCategory),
          description: tf.description,
          evidence:
            tf.evidence ??
            (tf.packageName
              ? `${tf.packageName}@${tf.installedVersion ?? '?'}${tf.cve ? ` (${tf.cve})` : ''}`
              : undefined),
          file: tf.file,
          line: tf.line,
          recommendation: generateToolRemediation(tf),
          cve: tf.cve,
          cvssScore: tf.cvssScore,
          // Cast through unknown to satisfy the interface (evidenceSource added as string property).
          ...({ evidenceSource: 'tool', confidence: 95 } as unknown as Record<string, unknown>),
        }) as PentestFinding,
    );
  }

  /**
   * Merge deterministic tool findings (Path A) with validated LLM-additive findings
   * (Path B), deduplicating any LLM findings that overlap with tool findings.
   *
   * Tool findings always win when a duplicate is detected.
   */
  private mergeAndDeduplicateFindings(
    toolFindings: PentestFinding[],
    llmFindings: PentestFinding[],
  ): PentestFinding[] {
    const result: PentestFinding[] = [...toolFindings];
    let deduped = 0;

    for (const lf of llmFindings) {
      const isDup = toolFindings.some((tf, idx) =>
        isDuplicateOfToolFinding(lf, tf, this.rawToolFindings[idx] ?? ({} as VulnerabilityFinding)),
      );
      if (!isDup) {
        result.push(lf);
      } else {
        deduped++;
      }
    }

    if (deduped > 0) {
      this.logger.info(
        `Deduplication removed ${deduped} LLM finding(s) that duplicated tool output.`,
      );
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Merge static attack surfaces with LLM-reported attack surfaces
  // -------------------------------------------------------------------------

  private mergeAttackSurfaces(data: Record<string, unknown>): Record<string, unknown> {
    const llmSurfaces = (data.attackSurfaces as AttackSurfaceEntry[] | undefined) ?? [];
    const key = (e: AttackSurfaceEntry) => `${e.method ?? '*'}:${e.path}`;
    const byKey = new Map<string, AttackSurfaceEntry>();
    for (const e of this.discoveredAttackSurfaces) {
      byKey.set(key(e), { ...e });
    }
    for (const e of llmSurfaces) {
      const k = key(e);
      const existing = byKey.get(k);
      if (existing) {
        byKey.set(k, {
          ...existing,
          ...e,
          path: existing.path,
          method: existing.method ?? e.method,
        });
      } else {
        byKey.set(k, e);
      }
    }
    return { ...data, attackSurfaces: Array.from(byKey.values()) };
  }

  // -------------------------------------------------------------------------
  // Tool section for human prompt — "already included" framing
  // -------------------------------------------------------------------------

  private formatToolSectionForPrompt(scan: VulnerabilityScanResult): string {
    if (scan.findings.length === 0) {
      const toolLine = this.vulnDetectionService.formatForPrompt(scan);
      return toolLine ? toolLine : '';
    }

    const rawSection = this.vulnDetectionService.formatForPrompt(scan);
    if (!rawSection) return '';

    return (
      `\n---\n` +
      `⚠️  ALREADY INCLUDED IN FINAL REPORT — DO NOT REPEAT OR REPHRASE:\n` +
      `The findings in the tables below are deterministically extracted from tool output and\n` +
      `are guaranteed to appear in the report. Your job is to ADD only vulnerabilities these\n` +
      `tools could not detect (business logic, IDOR, auth flows, etc.).\n` +
      rawSection
    );
  }

  // -------------------------------------------------------------------------
  // File reading with smart snippet extraction
  // -------------------------------------------------------------------------

  private async readFilesWithTargetedExtraction(
    projectPath: string,
    files: string[],
    flagMap: FileFlagMap,
  ): Promise<Array<{ relativePath: string; content: string; isTargeted: boolean }>> {
    const results: Array<{ relativePath: string; content: string; isTargeted: boolean }> = [];
    for (const file of files) {
      try {
        const raw = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative(projectPath, file);
        const snippet = extractSnippetForFile(raw, relativePath, flagMap);
        results.push({
          relativePath: snippet.relativePath,
          content: snippet.content,
          isTargeted: snippet.isTargeted,
        });
      } catch {
        continue;
      }
    }
    return results;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private getFallbackOutput(): PentestAnalysisOutput {
    return {
      summary: 'Penetration testing analysis could not be parsed.',
      findings: [],
      recommendations: ['Re-run the analysis to get structured findings.'],
      metadata: { totalFindings: 0, criticalCount: 0, highCount: 0 },
    };
  }

  private formatPentestMarkdown(data: PentestAnalysisOutput): string {
    const {
      summary,
      findings,
      attackSurfaces = [],
      privilegedRoutes = [],
      recommendations,
      metadata,
    } = data;

    let md = `# Penetration Testing Findings\n\n`;
    md += `## Summary\n\n${summary}\n\n`;

    if (metadata?.totalFindings !== undefined || metadata?.criticalCount !== undefined) {
      md += `## Overview\n\n`;
      md += `| Metric | Count |\n|--------|-------|\n`;
      if (metadata.totalFindings != null) md += `| Total findings | ${metadata.totalFindings} |\n`;
      if (metadata.criticalCount != null) md += `| Critical | ${metadata.criticalCount} |\n`;
      if (metadata.highCount != null) md += `| High | ${metadata.highCount} |\n`;
      md += `\n`;
    }

    if (findings.length > 0) {
      md += `## Findings by Severity\n\n`;
      const bySeverity: Record<Severity, PentestFinding[]> = {
        critical: [],
        high: [],
        medium: [],
        low: [],
        info: [],
      };
      for (const f of findings) {
        if (bySeverity[f.severity]) bySeverity[f.severity].push(f);
      }
      const order: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
      const icons: Record<Severity, string> = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
        info: 'ℹ️',
      };
      for (const sev of order) {
        const list = bySeverity[sev];
        if (list.length === 0) continue;
        md += `### ${icons[sev]} ${sev.charAt(0).toUpperCase() + sev.slice(1)}\n\n`;
        for (let i = 0; i < list.length; i++) {
          const f = list[i];
          const src = (f as unknown as Record<string, unknown>).evidenceSource as
            | string
            | undefined;
          const conf = (f as unknown as Record<string, unknown>).confidence as number | undefined;
          const srcBadge =
            src === 'tool'
              ? ' `[tool]`'
              : src === 'snippet'
                ? ' `[code]`'
                : src === 'endpoint'
                  ? ' `[endpoint]`'
                  : '';
          md += `#### ${i + 1}. ${f.title}${srcBadge}\n\n`;
          md += `**Description**: ${f.description}\n\n`;
          if (f.owaspCategory) md += `**OWASP**: ${f.owaspCategory}\n\n`;
          if (f.cve)
            md += `**CVE**: ${f.cve}${f.cvssScore != null ? ` (CVSS ${f.cvssScore})` : ''}\n\n`;
          if (f.file)
            md += `**File**: \`${f.file}\`${f.line != null ? ` (line ${f.line})` : ''}\n\n`;
          if (f.evidence) md += `**Evidence**: ${f.evidence}\n\n`;
          if (f.codeSnippet) md += `\`\`\`\n${f.codeSnippet}\n\`\`\`\n\n`;
          md += `**Recommendation**: ${f.recommendation}\n\n`;
          if (conf != null) md += `*Confidence: ${conf}/100 · Source: ${src ?? 'inferred'}*\n\n`;
        }
      }
    }

    if (attackSurfaces.length > 0) {
      md += `## Attack Surfaces\n\n`;
      md += `| Path | Method | Auth | Rate limit | Validation | CSRF | CORS | Headers | Privileged | Upload |\n`;
      md += `|------|--------|------|------------|------------|------|------|---------|------------|--------|\n`;
      for (const a of attackSurfaces.slice(0, 50)) {
        md += `| ${a.path} | ${a.method ?? '-'} | ${a.authRequired ? (a.authType ?? 'yes') : 'no'} | ${a.rateLimited ? 'yes' : 'no'} | ${a.inputValidation ? 'yes' : 'no'} | ${a.csrfProtected ? 'yes' : 'no'} | ${a.corsConfigured ? 'yes' : 'no'} | ${a.securityHeaders ? 'yes' : 'no'} | ${a.isPrivileged ? 'yes' : 'no'} | ${a.isFileUpload ? 'yes' : 'no'} |\n`;
      }
      if (attackSurfaces.length > 50) md += `\n*... and ${attackSurfaces.length - 50} more.*\n`;
      md += `\n`;
    }

    if (privilegedRoutes.length > 0) {
      md += `## Privileged Routes\n\n`;
      for (const r of privilegedRoutes) {
        md += `- **${r.path}**${r.role ? ` (role: ${r.role})` : ''}${r.description ? ` - ${r.description}` : ''}\n`;
      }
      md += `\n`;
    }

    if (recommendations.length > 0) {
      md += `## Recommendations\n\n`;
      recommendations.forEach((rec, idx) => {
        md += `${idx + 1}. ${rec}\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;
    md += `*Generated by ArchDoc Penetration Testing Agent. Tool-detected findings marked \`[tool]\`; code-analysis findings marked \`[code]\` or \`[endpoint]\`. Not a substitute for a full security audit.*\n`;
    return md;
  }

  private getFileExtension(filePath: string): string {
    return getLanguageFromExtension(filePath);
  }
}
