import { Agent } from './agent.interface';
import { AgentContext, AgentMetadata, AgentPriority, AgentFile } from '../types/agent.types';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { z } from 'zod';
import { LLMJsonParser } from '../utils/json-parser';

/**
 * Zod schema for structured KPI output
 * Ensures consistent, deterministic metrics across runs
 */
const KPIOutputSchema = z.object({
  healthScore: z.object({
    overall: z.number().min(0).max(100),
    codeQuality: z.number().min(0).max(10),
    testing: z.number().min(0).max(10),
    architecture: z.number().min(0).max(10),
    dependencies: z.number().min(0).max(10),
    complexity: z.number().min(0).max(10),
    rating: z.enum(['excellent', 'good', 'fair', 'poor']),
  }),
  codeOrganization: z.object({
    totalFiles: z.number(),
    codeFiles: z.number(),
    testFiles: z.number(),
    configFiles: z.number(),
    testCoverageRatio: z.number(),
    sizeCategory: z.enum(['small', 'medium', 'large', 'very-large']),
  }),
  insights: z.array(
    z.object({
      category: z.enum([
        'size',
        'testing',
        'patterns',
        'complexity',
        'dependencies',
        'architecture',
        'security',
        'documentation',
      ]),
      severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
      title: z.string(),
      description: z.string(),
      recommendation: z.string(),
    }),
  ),
  recommendations: z.array(
    z.object({
      priority: z.enum(['p1', 'p2', 'p3', 'p4']),
      title: z.string(),
      description: z.string(),
      effort: z.string(),
      impact: z.enum(['critical', 'high', 'medium', 'low']),
    }),
  ),
});

type KPIOutput = z.infer<typeof KPIOutputSchema>;

/**
 * KPI Analyzer Agent
 *
 * Analyzes repository health metrics and generates actionable KPI insights using LLM.
 * Uses structured output (Zod schema) for deterministic, consistent results.
 */
export class KPIAnalyzerAgent extends BaseAgentWorkflow implements Agent {
  /**
   * Get agent metadata
   */
  public getMetadata(): AgentMetadata {
    return {
      name: 'kpi-analyzer',
      version: '1.0.0',
      description:
        'Analyzes repository health metrics (code quality, architecture, testing, dependencies) and generates executive KPI dashboard with LLM-powered insights',
      priority: 80 as AgentPriority, // Medium-high priority - provides overview metrics
      capabilities: {
        supportsParallel: true,
        requiresFileContents: false, // Uses aggregated data from other agents
        estimatedTokens: 4000,
        supportsIncremental: false,
        supportedLanguages: [], // Language-agnostic - works with aggregated metrics
        dependencies: [
          'architecture-analyzer',
          'dependency-analyzer',
          'pattern-detector',
          'security-analyzer',
        ], // Run after other agents to aggregate their insights
      },
      tags: ['metrics', 'kpi', 'health', 'quality', 'dashboard', 'executive-summary'],
    };
  }

  /**
   * Check if agent can execute
   */
  public async canExecute(_context: AgentContext): Promise<boolean> {
    // KPI agent always runs - provides value even with minimal data
    return true;
  }

  /**
   * Estimate token usage
   */
  public async estimateTokens(context: AgentContext): Promise<number> {
    // Base tokens for analysis
    let tokens = 2000; // System prompt + base analysis

    // Add tokens for file statistics
    tokens += Math.min(context.files.length * 2, 500);

    // Add tokens for aggregated agent data (if available)
    tokens += 1500; // Architecture, patterns, dependencies, security insights

    return tokens;
  }

  /**
   * Get agent name for logging
   */
  protected getAgentName(): string {
    return this.getMetadata().name;
  }

  /**
   * Override max tokens for deterministic output
   */
  protected override getMaxOutputTokens(_isQuickMode: boolean, _context: AgentContext): number {
    return 3000; // Fixed size for structured output
  }

  /**
   * Build system prompt for structured JSON output
   */
  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert software engineering consultant specializing in repository health analysis and KPI reporting.

Your task is to analyze the provided codebase metrics and generate a **structured JSON object** with repository health scores and actionable insights.

## Output Schema

You MUST return valid JSON matching this exact structure:

\`\`\`json
{
  "healthScore": {
    "overall": <0-100>,
    "codeQuality": <0-10>,
    "testing": <0-10>,
    "architecture": <0-10>,
    "dependencies": <0-10>,
    "complexity": <0-10>,
    "rating": "excellent" | "good" | "fair" | "poor"
  },
  "codeOrganization": {
    "totalFiles": <number>,
    "codeFiles": <number>,
    "testFiles": <number>,
    "configFiles": <number>,
    "testCoverageRatio": <number>,
    "sizeCategory": "small" | "medium" | "large" | "very-large"
  },
  "insights": [
    {
      "category": "size" | "testing" | "patterns" | "complexity" | "dependencies" | "architecture" | "security" | "documentation",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "title": "Short title (3-5 words)",
      "description": "What is the issue",
      "recommendation": "What to do about it"
    }
  ],
  "recommendations": [
    {
      "priority": "p1" | "p2" | "p3" | "p4",
      "title": "Action item title",
      "description": "Detailed description",
      "effort": "Time estimate (e.g., '4-8 hours', '1-2 sprints')",
      "impact": "critical" | "high" | "medium" | "low"
    }
  ]
}
\`\`\`

## Scoring Guidelines

**Overall Health** (0-100):
- Code Quality (30%): codeQuality * 3
- Testing (20%): testing * 2
- Architecture (20%): architecture * 2
- Dependencies (15%): dependencies * 1.5
- Complexity (15%): complexity * 1.5

**Component Scores** (0-10 each):
- **Code Quality**: Maintainability + reliability + security indicators
- **Testing**: Test-to-code ratio (0.2 = 10, 0.1 = 5, 0.05 = 3, 0 = 0)
- **Architecture**: Pattern usage + organization clarity
- **Dependencies**: Total count (0-50 = 10, 51-100 = 7, 101-200 = 5, 200+ = 3)
- **Complexity**: Average complexity (≤5 = 10, 6-10 = 7, 11-15 = 4, 15+ = 2)

**Rating** (based on overall score):
- excellent: ≥80
- good: 60-79
- fair: 40-59
- poor: <40

**Size Category**:
- small: <1,000 files
- medium: 1,000-3,000 files
- large: 3,001-10,000 files
- very-large: >10,000 files

**Insight Categories** (generate 5-8 insights):
1. **Size**: Project scale appropriateness
2. **Testing**: Test coverage quality and ratio
3. **Patterns**: Design pattern usage
4. **Complexity**: Code complexity management
5. **Dependencies**: Dependency health and bloat
6. **Architecture**: Architectural clarity
7. **Security**: Security posture
8. **Documentation**: Documentation coverage

## Critical Rules

1. **Return ONLY valid JSON** - no markdown, no explanations, no code blocks
2. **Use precise numbers** - calculate scores based on provided metrics
3. **Be consistent** - same input should give same output
4. **Be actionable** - every insight must have a clear recommendation
5. **Prioritize** - order insights by severity (critical → high → medium → low → info)

Generate the JSON object now.`;
  }

  /**
   * Build human prompt with project metrics
   */
  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const stats = this.calculateFileStatistics(context);

    return `Analyze this repository and return JSON with health scores and insights:

## Repository Metrics

Project: ${context.projectPath}
Total Files: ${stats.totalFiles}
Code Files: ${stats.codeFiles}
Test Files: ${stats.testFiles}
Config Files: ${stats.configFiles}
Languages: ${stats.languages.join(', ')}
Test-to-Code Ratio: ${(stats.testFiles / Math.max(stats.codeFiles, 1)).toFixed(2)}

## Instructions

Calculate health scores based on the metrics above and return a JSON object matching the schema provided in the system prompt.

Focus on:
1. Realistic test coverage assessment (test-to-code ratio)
2. Project size category (total files)
3. Language diversity impact
4. Actionable insights with clear recommendations

Return ONLY the JSON object - no markdown, no explanations.`;
  }

  /**
   * Parse LLM analysis output using Zod schema
   */
  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    try {
      // Parse JSON from LLM response
      const parsed = LLMJsonParser.parse<KPIOutput>(analysis, {
        contextName: 'kpi-analyzer',
        logErrors: true,
      });

      // Validate with Zod schema
      const validated = KPIOutputSchema.parse(parsed);

      return validated as Record<string, unknown>;
    } catch (error) {
      this.logger.warn('Failed to parse KPI analysis, using fallback', {
        error: error instanceof Error ? error.message : String(error),
        preview: analysis.substring(0, 200),
      });

      // Fallback to minimal valid structure
      return {
        healthScore: {
          overall: 0,
          codeQuality: 0,
          testing: 0,
          architecture: 0,
          dependencies: 0,
          complexity: 0,
          rating: 'poor',
        },
        codeOrganization: {
          totalFiles: 0,
          codeFiles: 0,
          testFiles: 0,
          configFiles: 0,
          testCoverageRatio: 0,
          sizeCategory: 'small',
        },
        insights: [
          {
            category: 'architecture',
            severity: 'critical',
            title: 'Analysis Failed',
            description: 'KPI analysis could not be completed due to parsing errors',
            recommendation: 'Re-run analysis with verbose logging to diagnose the issue',
          },
        ],
        recommendations: [],
        hasMinimalData: true,
      };
    }
  }

  /**
   * Generate summary from parsed data
   */
  protected generateSummary(data: Record<string, unknown>): string {
    const healthScore = data.healthScore as KPIOutput['healthScore'];
    const insights = data.insights as KPIOutput['insights'];

    if (!healthScore || !insights) {
      return 'KPI analysis incomplete';
    }

    const rating = this.getRatingEmoji(healthScore.rating);
    return `Repository health: ${healthScore.overall}% (${rating} ${healthScore.rating}). ${insights.length} insights generated.`;
  }

  /**
   * Get emoji for rating
   */
  private getRatingEmoji(rating: string): string {
    const emojiMap: Record<string, string> = {
      excellent: '🌟',
      good: '✅',
      fair: '⚠️',
      poor: '❌',
    };
    return emojiMap[rating] || '❓';
  }

  /**
   * Format markdown output from structured data
   */
  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: typeof AgentWorkflowState.State,
  ): Promise<string> {
    // Check for minimal data fallback
    if (data.hasMinimalData) {
      return this.formatMinimalMarkdown();
    }

    const healthScore = data.healthScore as KPIOutput['healthScore'];
    const codeOrg = data.codeOrganization as KPIOutput['codeOrganization'];
    const insights = data.insights as KPIOutput['insights'];
    const recommendations = data.recommendations as KPIOutput['recommendations'];

    if (!healthScore || !codeOrg || !insights) {
      return this.formatMinimalMarkdown();
    }

    const rating = this.getRatingEmoji(healthScore.rating);

    let content = `# 📊 Repository KPI Dashboard\n\n`;
    content += `## 🎯 Overall Health Score\n\n`;
    content += `**${healthScore.overall}/100** ${rating} ${healthScore.rating.toUpperCase()}\n\n`;

    content += `| Component | Score | Weight |\n`;
    content += `|-----------|-------|--------|\n`;
    content += `| Code Quality | ${healthScore.codeQuality}/10 | 30% |\n`;
    content += `| Testing | ${healthScore.testing}/10 | 20% |\n`;
    content += `| Architecture | ${healthScore.architecture}/10 | 20% |\n`;
    content += `| Dependencies | ${healthScore.dependencies}/10 | 15% |\n`;
    content += `| Complexity | ${healthScore.complexity}/10 | 15% |\n\n`;

    content += `## 📁 Code Organization\n\n`;
    content += `- **Total Files**: ${codeOrg.totalFiles.toLocaleString()}\n`;
    content += `- **Code Files**: ${codeOrg.codeFiles.toLocaleString()}\n`;
    content += `- **Test Files**: ${codeOrg.testFiles.toLocaleString()}\n`;
    content += `- **Config Files**: ${codeOrg.configFiles.toLocaleString()}\n`;
    content += `- **Test Coverage Ratio**: ${codeOrg.testCoverageRatio.toFixed(2)}:1\n`;
    content += `- **Size Category**: ${codeOrg.sizeCategory}\n\n`;

    content += `## 💡 Key Insights\n\n`;
    const sortedInsights = [...insights].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    sortedInsights.forEach((insight) => {
      const severityEmoji = this.getSeverityEmoji(insight.severity);
      content += `### ${severityEmoji} ${insight.title}\n\n`;
      content += `**Category**: ${insight.category} | **Severity**: ${insight.severity}\n\n`;
      content += `${insight.description}\n\n`;
      content += `**Recommendation**: ${insight.recommendation}\n\n`;
    });

    if (recommendations && recommendations.length > 0) {
      content += `## 📋 Recommendations\n\n`;

      const grouped = this.groupRecommendationsByPriority(recommendations);

      (['p1', 'p2', 'p3', 'p4'] as const).forEach((priority) => {
        const items = grouped[priority];
        if (items.length > 0) {
          content += `### Priority ${priority.toUpperCase()}\n\n`;
          items.forEach((rec) => {
            const impactEmoji = this.getImpactEmoji(rec.impact);
            content += `#### ${impactEmoji} ${rec.title}\n\n`;
            content += `${rec.description}\n\n`;
            content += `- **Effort**: ${rec.effort}\n`;
            content += `- **Impact**: ${rec.impact}\n\n`;
          });
        }
      });
    }

    content += `---\n\n`;
    content += `*Generated by KPI Analyzer v${this.getMetadata().version}*\n`;

    return content;
  }

  /**
   * Format minimal markdown for failed analysis
   */
  private formatMinimalMarkdown(): string {
    return `# 📊 Repository KPI Dashboard

## ⚠️ Analysis Incomplete

Unable to generate comprehensive KPI metrics. This may indicate:
- Parsing errors in the analysis pipeline
- Insufficient project data
- LLM response formatting issues

Please re-run the analysis or check logs for details.

---

*Generated by KPI Analyzer v${this.getMetadata().version}*
`;
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    const emojiMap: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
      info: 'ℹ️',
    };
    return emojiMap[severity] || '❓';
  }

  /**
   * Get emoji for impact level
   */
  private getImpactEmoji(impact: string): string {
    const emojiMap: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };
    return emojiMap[impact] || '❓';
  }

  /**
   * Group recommendations by priority
   */
  private groupRecommendationsByPriority(
    recommendations: KPIOutput['recommendations'],
  ): Record<'p1' | 'p2' | 'p3' | 'p4', KPIOutput['recommendations']> {
    return {
      p1: recommendations.filter((r) => r.priority === 'p1'),
      p2: recommendations.filter((r) => r.priority === 'p2'),
      p3: recommendations.filter((r) => r.priority === 'p3'),
      p4: recommendations.filter((r) => r.priority === 'p4'),
    };
  }

  /**
   * Generate agent files
   */
  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    // Skip file generation if we have minimal/no data
    if (data.hasMinimalData) {
      this.logger.warn('Skipping KPI file generation due to insufficient data');
      return [];
    }

    const markdown = await this.formatMarkdown(data, state);

    // Additional validation: Check if markdown has substantial content
    // Minimum: header + at least 100 characters of meaningful content
    if (markdown.length < 150) {
      this.logger.warn('Skipping KPI file generation due to minimal content', {
        contentLength: markdown.length,
      });
      return [];
    }

    return [
      {
        filename: 'kpi.md',
        content: markdown,
        title: 'Repository KPI',
        category: 'metrics',
        order: this.getMetadata().priority,
      },
    ];
  }

  /**
   * Helper: Calculate file statistics
   */
  private calculateFileStatistics(context: AgentContext): {
    totalFiles: number;
    codeFiles: number;
    testFiles: number;
    configFiles: number;
    totalLines: number;
    totalSize: number;
    languages: string[];
  } {
    const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.go'];
    const testPatterns = [
      /\.test\./,
      /\.spec\./,
      /__tests__/,
      /test\//,
      /tests\//,
      /spec\//,
      /specs\//,
    ];
    const configExtensions = ['.json', '.yaml', '.yml', '.toml', '.ini', '.config.ts'];

    let codeFiles = 0;
    let testFiles = 0;
    let configFiles = 0;
    const languageSet = new Set<string>();

    for (const file of context.files) {
      const isCode = codeExtensions.some((ext) => file.endsWith(ext));
      const isTest = testPatterns.some((pattern) => pattern.test(file));
      const isConfig = configExtensions.some((ext) => file.endsWith(ext));

      if (isTest) testFiles++;
      else if (isCode) codeFiles++;
      else if (isConfig) configFiles++;

      // Extract language
      const ext = file.split('.').pop();
      if (ext) languageSet.add(ext);
    }

    return {
      totalFiles: context.files.length,
      codeFiles,
      testFiles,
      configFiles,
      totalLines: 0, // Would need file content to calculate
      totalSize: 0, // Would need file stats
      languages: Array.from(languageSet).slice(0, 5), // Top 5 languages
    };
  }
}
