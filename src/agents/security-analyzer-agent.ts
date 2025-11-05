import { Agent } from './agent.interface';
import { AgentContext, AgentMetadata, AgentPriority, AgentFile } from '../types/agent.types';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { LLMJsonParser } from '../utils/json-parser';
import {
  getSupportedLanguages,
  getSecurityKeywords,
  getLanguageFromExtension,
} from '../config/language-config';
import { promises as fs } from 'fs';
import * as path from 'path';

interface SecurityIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file?: string;
  description: string;
  recommendation: string;
}

interface SecurityData {
  hasSecurityFiles: boolean;
  authenticationMechanisms: string[];
  configFiles: string[];
  secretFiles: string[];
  apiEndpoints: number;
  databaseFiles: string[];
}

/**
 * Agent that analyzes security aspects of the codebase
 * Uses self-refinement workflow to iteratively improve security analysis
 */
export class SecurityAnalyzerAgent extends BaseAgentWorkflow implements Agent {
  public getMetadata(): AgentMetadata {
    return {
      name: 'security-analyzer',
      version: '1.0.0',
      description:
        'Analyzes security patterns, authentication, vulnerabilities, and security best practices',
      priority: AgentPriority.MEDIUM,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: true,
        dependencies: ['dependency-analyzer'], // Can use dependency vulnerability info
        supportsIncremental: true,
        estimatedTokens: 5000,
        supportedLanguages: getSupportedLanguages(),
      },
      tags: [
        'security',
        'authentication',
        'authorization',
        'vulnerabilities',
        'secrets',
        'crypto',
        'best-practices',
      ],
      outputFilename: 'security.md',
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    // Always can execute for security analysis
    // But prioritize if security-related files are detected
    const securityIndicators = getSecurityKeywords();

    const hasSecurityFiles = context.files.some((file) =>
      securityIndicators.some((indicator) => file.toLowerCase().includes(indicator)),
    );

    return hasSecurityFiles || context.files.length > 10; // Execute if security files or substantial codebase
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    // Base cost + file count estimation
    return 4000 + Math.min(context.files.length * 10, 10000);
  }

  // Abstract method implementations for BaseAgentWorkflow

  protected getAgentName(): string {
    return 'security-analyzer';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert security architect analyzing codebase security patterns and vulnerabilities.

Your task is to analyze security aspects and provide comprehensive insights about:

1. **Authentication & Authorization**: Mechanisms used, implementation quality, security gaps
2. **Security Anti-patterns**: Common vulnerabilities (SQL injection, XSS, CSRF, hardcoded secrets, etc.)
3. **Cryptography**: Encryption usage, hashing algorithms, key management
4. **Data Protection**: Sensitive data handling, PII management, data flow
5. **API Security**: Endpoint security, rate limiting, input validation
6. **Configuration Security**: Environment variables, secrets management, secure defaults
7. **Dependency Vulnerabilities**: Known CVEs in dependencies (if available)

For each security issue found, assess severity: critical, high, medium, low, or info.

Provide your analysis in this JSON format:
{
  "summary": "Overall security posture assessment",
  "insights": ["insight1", "insight2", ...],
  "securityIssues": [
    {
      "type": "vulnerability_type",
      "severity": "critical|high|medium|low|info",
      "description": "What the issue is",
      "recommendation": "How to fix it",
      "files": ["affected/file.ts"]
    }
  ],
  "authenticationMechanisms": ["JWT", "OAuth2", "Session-based", ...],
  "strengths": ["strength1", "strength2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "complianceNotes": ["GDPR considerations", "OWASP alignment", ...]
}

Be specific about file locations when identifying issues. Focus on actionable recommendations.

${this.getResponseLengthGuidance(_context)}

CRITICAL: You MUST respond with ONLY valid JSON matching the exact schema above. Do NOT include markdown formatting, explanations, or any text outside the JSON object. Start your response with { and end with }.`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const securityData = await this.extractSecurityData(context);

    // Discover project-specific security patterns using LLM
    const projectSecurityPatterns = await this.discoverSecurityPatterns(context);

    // Combine base keywords with discovered patterns
    const baseKeywords = getSecurityKeywords();
    const allSecurityKeywords = [...new Set([...baseKeywords, ...projectSecurityPatterns])];

    const securityRelevantFiles = context.files.filter((file) => {
      const lower = file.toLowerCase();
      return allSecurityKeywords.some((keyword) => lower.includes(keyword));
    });

    const fileContents = await this.readSecurityFiles(
      context.projectPath,
      securityRelevantFiles.slice(0, 15), // Limit to avoid token overflow
    );

    const content = `Analyze the security aspects of this project:

**Project**: ${context.projectPath}
**Total Files**: ${context.files.length}
**Security-Relevant Files Detected**: ${securityRelevantFiles.length}

**Detected Languages**: ${context.languageHints.map((h) => h.language).join(', ')}

**Security File Categories**:
- Authentication files: ${securityData.authenticationMechanisms.length}
- Configuration files: ${securityData.configFiles.length}
- Database interaction files: ${securityData.databaseFiles.length}
- Potential secret files: ${securityData.secretFiles.length}

**Sample Security-Relevant Files** (${Math.min(fileContents.length, 15)} shown):
${fileContents
  .map(
    (fc) => `
### ${fc.relativePath}
\`\`\`${this.getFileExtension(fc.relativePath)}
${fc.content.substring(0, 800)}${fc.content.length > 800 ? '\n... (truncated)' : ''}
\`\`\`
`,
  )
  .join('\n')}

**Key Files to Review**:
${securityRelevantFiles
  .slice(0, 20)
  .map((f) => `- ${path.relative(context.projectPath, f)}`)
  .join('\n')}

Please perform a comprehensive security analysis:
1. Identify authentication and authorization mechanisms
2. Detect security anti-patterns and vulnerabilities
3. Check for hardcoded secrets, weak crypto, injection vulnerabilities
4. Assess API security and input validation
5. Review configuration security
6. Provide specific, actionable recommendations with file references`;

    return content;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    return this.parseAnalysisResult(analysis);
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: Record<string, unknown>,
  ): Promise<string> {
    return this.formatMarkdownReport(data);
  }

  protected generateSummary(data: Record<string, unknown>): string {
    const analysis = data as { summary?: string };
    return analysis.summary || 'Security analysis completed';
  }

  // Helper methods

  /**
   * Uses LLM to discover project-specific security patterns based on:
   * - Project type (web, mobile, blockchain, IoT, etc.)
   * - Detected frameworks and libraries
   * - File structure patterns
   * Returns additional keywords to look for in security-relevant files
   */
  private async discoverSecurityPatterns(context: AgentContext): Promise<string[]> {
    try {
      const model = this.llmService.getChatModel({ temperature: 0.1, maxTokens: 500 });

      // Sample a few representative files to understand project type
      const sampleFiles = context.files
        .slice(0, 30)
        .map((f) => path.relative(context.projectPath, f))
        .join('\n');

      const frameworks = context.languageHints.map((hint) => hint.framework).join(', ');

      const prompt = `Given this project structure, identify security-relevant keywords specific to this project type:

**Languages**: ${context.languageHints.map((h) => h.language).join(', ')}
**Frameworks**: ${frameworks || 'Unknown'}
**Sample Files** (first 30):
${sampleFiles}

Based on the project type (web app, API, mobile, blockchain, IoT, desktop, etc.), what additional security-related file/folder naming patterns should we look for?

Examples:
- Web apps: "cors", "helmet", "csrf", "xss", "sanitize"
- Blockchain: "wallet", "contract", "transaction", "signature"
- Mobile: "keychain", "biometric", "permission"
- IoT: "device", "mqtt", "certificate"

Return ONLY a JSON array of 5-10 lowercase keywords/patterns specific to this project:
["keyword1", "keyword2", ...]`;

      const response = await model.invoke(prompt, { runName: 'security-pattern-discovery' });
      const content = typeof response.content === 'string' ? response.content : '';

      // Parse JSON array from response
      const parsed = LLMJsonParser.parse<string[]>(content, {
        contextName: 'security-pattern-discovery',
        logErrors: false,
        fallback: [],
      });

      this.logger.debug('Discovered project-specific security patterns', {
        patterns: parsed,
      });

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      // Fallback: return empty array if discovery fails
      this.logger.debug('Failed to discover security patterns, using base keywords only', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private parseAnalysisResult(result: string): Record<string, unknown> {
    return LLMJsonParser.parse(result, {
      contextName: 'security-analyzer',
      logErrors: true,
      fallback: {
        summary: 'Error parsing security analysis result',
        insights: [],
        securityIssues: [],
        authenticationMechanisms: [],
        strengths: [],
        recommendations: [],
        complianceNotes: [],
        warnings: ['Failed to parse LLM response as JSON'],
      },
    });
  }

  private formatMarkdownReport(data: Record<string, unknown>): string {
    const summary = (data.summary as string) || 'Security analysis completed';
    const insights = (data.insights as string[]) || [];
    const securityIssues = (data.securityIssues as SecurityIssue[]) || [];
    const authMechanisms = (data.authenticationMechanisms as string[]) || [];
    const strengths = (data.strengths as string[]) || [];
    const recommendations = (data.recommendations as string[]) || [];
    const complianceNotes = (data.complianceNotes as string[]) || [];

    let markdown = `# Security Analysis\n\n`;
    markdown += `## Summary\n\n${summary}\n\n`;

    // Security Score
    const criticalCount = securityIssues.filter((i) => i.severity === 'critical').length;
    const highCount = securityIssues.filter((i) => i.severity === 'high').length;
    const mediumCount = securityIssues.filter((i) => i.severity === 'medium').length;
    const lowCount = securityIssues.filter((i) => i.severity === 'low').length;

    markdown += `## Security Overview\n\n`;
    markdown += `| Severity | Count |\n`;
    markdown += `|----------|-------|\n`;
    markdown += `| 🔴 Critical | ${criticalCount} |\n`;
    markdown += `| 🟠 High | ${highCount} |\n`;
    markdown += `| 🟡 Medium | ${mediumCount} |\n`;
    markdown += `| 🟢 Low | ${lowCount} |\n\n`;

    // Authentication & Authorization
    if (authMechanisms.length > 0) {
      markdown += `## Authentication & Authorization\n\n`;
      authMechanisms.forEach((mechanism) => {
        markdown += `- ${mechanism}\n`;
      });
      markdown += `\n`;
    }

    // Security Issues
    if (securityIssues.length > 0) {
      markdown += `## Security Issues\n\n`;

      // Group by severity
      const grouped = {
        critical: securityIssues.filter((i) => i.severity === 'critical'),
        high: securityIssues.filter((i) => i.severity === 'high'),
        medium: securityIssues.filter((i) => i.severity === 'medium'),
        low: securityIssues.filter((i) => i.severity === 'low'),
        info: securityIssues.filter((i) => i.severity === 'info'),
      };

      for (const [severity, issues] of Object.entries(grouped)) {
        if (issues.length > 0) {
          const icon =
            severity === 'critical'
              ? '🔴'
              : severity === 'high'
                ? '🟠'
                : severity === 'medium'
                  ? '🟡'
                  : severity === 'low'
                    ? '🟢'
                    : 'ℹ️';
          markdown += `#### ${icon} ${severity.charAt(0).toUpperCase() + severity.slice(1)} Severity\n\n`;

          issues.forEach((issue, idx) => {
            markdown += `##### ${idx + 1}. ${issue.type}\n\n`;
            markdown += `**Description**: ${issue.description}\n\n`;
            if (issue.file) {
              markdown += `**File**: \`${issue.file}\`\n\n`;
            }
            markdown += `**Recommendation**: ${issue.recommendation}\n\n`;
          });
        }
      }
    }

    // Strengths
    if (strengths.length > 0) {
      markdown += `## Security Strengths\n\n`;
      strengths.forEach((strength) => {
        markdown += `- ✅ ${strength}\n`;
      });
      markdown += `\n`;
    }

    // Key Insights
    if (insights.length > 0) {
      markdown += `## Key Insights\n\n`;
      insights.forEach((insight) => {
        markdown += `- ${insight}\n`;
      });
      markdown += `\n`;
    }

    // Recommendations
    if (recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      recommendations.forEach((rec, idx) => {
        markdown += `${idx + 1}. ${rec}\n`;
      });
      markdown += `\n`;
    }

    // Compliance Notes
    if (complianceNotes.length > 0) {
      markdown += `## Compliance & Standards\n\n`;
      complianceNotes.forEach((note) => {
        markdown += `- ${note}\n`;
      });
      markdown += `\n`;
    }

    markdown += `---\n\n`;
    markdown += `*Security analysis is not a substitute for professional security audit. `;
    markdown += `Always conduct thorough security testing and follow industry best practices.*\n`;

    return markdown;
  }

  // Helper methods

  private async extractSecurityData(context: AgentContext): Promise<SecurityData> {
    const authFiles: string[] = [];
    const configFiles: string[] = [];
    const secretFiles: string[] = [];
    const databaseFiles: string[] = [];

    // Get centralized keywords
    const authKeywords = ['auth', 'jwt', 'passport', 'oauth', 'login', 'session', 'token'];
    const configKeywords = ['config', '.env', 'settings', '.yaml', '.yml', '.toml'];
    const secretKeywords = ['secret', 'key', 'credential', 'password', '.pem'];
    const databaseKeywords = [
      'database',
      'db',
      'repository',
      'dao',
      'model',
      'entity',
      'migration',
      'schema',
    ];

    context.files.forEach((file) => {
      const lower = file.toLowerCase();

      // Authentication files
      if (authKeywords.some((keyword) => lower.includes(keyword))) {
        authFiles.push(file);
      }

      // Configuration files
      if (configKeywords.some((keyword) => lower.includes(keyword) || lower.endsWith(keyword))) {
        configFiles.push(file);
      }

      // Potential secret files
      if (secretKeywords.some((keyword) => lower.includes(keyword))) {
        secretFiles.push(file);
      }

      // Database files
      if (databaseKeywords.some((keyword) => lower.includes(keyword))) {
        databaseFiles.push(file);
      }
    });

    return {
      hasSecurityFiles: authFiles.length > 0 || configFiles.length > 0,
      authenticationMechanisms: authFiles,
      configFiles,
      secretFiles,
      apiEndpoints: 0, // Would need deeper analysis
      databaseFiles,
    };
  }

  private async readSecurityFiles(
    projectPath: string,
    files: string[],
  ): Promise<Array<{ relativePath: string; content: string }>> {
    const results: Array<{ relativePath: string; content: string }> = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative(projectPath, file);
        results.push({ relativePath, content });
      } catch (error) {
        // Skip files that can't be read (binary, permission issues, etc.)
        this.logger.debug(`Skipping unreadable file: ${file}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
    }

    return results;
  }

  private getFileExtension(filePath: string): string {
    return getLanguageFromExtension(filePath);
  }

  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    const markdown = await this.formatMarkdown(data, state);
    const metadata = this.getMetadata();

    return [
      {
        filename: 'security.md',
        content: markdown,
        title: 'Security Analysis',
        category: 'security',
        order: metadata.priority,
      },
    ];
  }
}
