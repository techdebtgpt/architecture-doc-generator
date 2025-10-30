import { Agent } from './agent.interface';
import {
  AgentContext,
  AgentResult,
  AgentMetadata,
  AgentPriority,
  AgentExecutionOptions,
} from '../types/agent.types';
import { BaseAgentWorkflow } from './base-agent-workflow';
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
        supportedLanguages: [
          'javascript',
          'typescript',
          'python',
          'java',
          'csharp',
          'go',
          'rust',
          'php',
          'ruby',
        ],
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
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    // Always can execute for security analysis
    // But prioritize if security-related files are detected
    const securityIndicators = [
      'auth',
      'jwt',
      'passport',
      'oauth',
      'security',
      'crypto',
      'bcrypt',
      'hash',
      'token',
      'session',
      'login',
      'password',
    ];

    const hasSecurityFiles = context.files.some((file) =>
      securityIndicators.some((indicator) => file.toLowerCase().includes(indicator)),
    );

    return hasSecurityFiles || context.files.length > 10; // Execute if security files or substantial codebase
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    // Base cost + file count estimation
    return 4000 + Math.min(context.files.length * 10, 10000);
  }

  public async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    // Adaptive configuration - agent decides when analysis is complete
    const workflowConfig = {
      maxIterations: 10,
      clarityThreshold: 80, // Security analysis is complex, slightly lower threshold
      minImprovement: 3,
      enableSelfQuestioning: true,
      skipSelfRefinement: false,
      maxQuestionsPerIteration: 3, // Allow more questions for security
      evaluationTimeout: 15000,
    };

    return this.executeWorkflow(
      context,
      workflowConfig,
      options?.runnableConfig as Record<string, unknown> | undefined,
    );
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

Be specific about file locations when identifying issues. Focus on actionable recommendations.`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const securityData = await this.extractSecurityData(context);

    // Sample file contents for security analysis
    const securityRelevantFiles = context.files.filter((file) => {
      const lower = file.toLowerCase();
      return (
        lower.includes('auth') ||
        lower.includes('security') ||
        lower.includes('crypto') ||
        lower.includes('jwt') ||
        lower.includes('passport') ||
        lower.includes('login') ||
        lower.includes('password') ||
        lower.includes('token') ||
        lower.includes('session') ||
        lower.includes('middleware') ||
        lower.includes('guard') ||
        lower.includes('config') ||
        lower.includes('.env')
      );
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

  private parseAnalysisResult(result: string): Record<string, unknown> {
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        summary: 'Failed to parse structured security analysis',
        insights: [],
        securityIssues: [],
        authenticationMechanisms: [],
        strengths: [],
        recommendations: [],
        complianceNotes: [],
        warnings: ['Failed to parse LLM response as JSON'],
      };
    } catch (_error) {
      return {
        summary: 'Error parsing security analysis result',
        insights: [],
        securityIssues: [],
        authenticationMechanisms: [],
        strengths: [],
        recommendations: [],
        complianceNotes: [],
        warnings: [`Parse error: ${(_error as Error).message}`],
      };
    }
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
          markdown += `### ${icon} ${severity.charAt(0).toUpperCase() + severity.slice(1)} Severity\n\n`;

          issues.forEach((issue, idx) => {
            markdown += `#### ${idx + 1}. ${issue.type}\n\n`;
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

    context.files.forEach((file) => {
      const lower = file.toLowerCase();

      // Authentication files
      if (
        lower.includes('auth') ||
        lower.includes('jwt') ||
        lower.includes('passport') ||
        lower.includes('oauth') ||
        lower.includes('login') ||
        lower.includes('session')
      ) {
        authFiles.push(file);
      }

      // Configuration files
      if (
        lower.includes('config') ||
        lower.includes('.env') ||
        lower.includes('settings') ||
        lower.endsWith('.yaml') ||
        lower.endsWith('.yml') ||
        lower.endsWith('.toml')
      ) {
        configFiles.push(file);
      }

      // Potential secret files
      if (
        lower.includes('secret') ||
        lower.includes('key') ||
        lower.includes('credential') ||
        lower.includes('password') ||
        lower.includes('.pem') ||
        lower.includes('.key')
      ) {
        secretFiles.push(file);
      }

      // Database files
      if (
        lower.includes('database') ||
        lower.includes('db') ||
        lower.includes('repository') ||
        lower.includes('dao') ||
        lower.includes('model') ||
        lower.includes('entity') ||
        lower.includes('migration') ||
        lower.includes('schema')
      ) {
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
    const ext = path.extname(filePath).slice(1);
    const extensionMap: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby',
      yml: 'yaml',
      yaml: 'yaml',
      json: 'json',
      toml: 'toml',
    };
    return extensionMap[ext] || ext;
  }
}
