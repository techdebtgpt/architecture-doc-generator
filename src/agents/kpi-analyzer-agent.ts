import { Agent } from './agent.interface';
import { AgentContext, AgentMetadata, AgentPriority, AgentFile } from '../types/agent.types';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';

/**
 * KPI Analyzer Agent
 *
 * Analyzes repository health metrics and generates actionable KPI insights using LLM.
 * Provides executive-level overview of code quality, architecture, testing, and technical debt.
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
   * Build system prompt
   */
  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert software engineering consultant specializing in repository health analysis and KPI reporting.

Your task is to analyze the provided codebase metrics and generate a comprehensive, executive-level KPI dashboard that provides actionable insights about repository health.

## Analysis Focus

1. **Repository Health Score** (0-100%):
   - Calculate overall health based on: code quality (30%), testing (20%), architecture (20%), dependencies (15%), complexity (15%)
   - Provide clear rating with emoji: 🌟 Excellent (≥80%), ✅ Good (≥60%), ⚠️ Fair (≥40%), ❌ Poor (<40%)

2. **Code Organization**:
   - Analyze file distribution (code vs test vs config)
   - Evaluate test coverage ratio (test files / code files)
   - Assess project size and average file complexity
   - Rate language diversity

3. **Architecture Quality**:
   - Evaluate architectural clarity and pattern usage
   - Assess component organization
   - Identify design pattern strengths
   - Highlight anti-pattern risks

4. **Code Quality Metrics**:
   - Maintainability, reliability, security scores
   - Test coverage percentage
   - Code smells and technical debt assessment
   - Complexity analysis

5. **Dependency Health**:
   - Total dependency count and distribution
   - Outdated packages risk
   - Vulnerability assessment
   - Dependency bloat analysis

6. **Key Insights** (Most Important):
   - Generate 5-8 bullet points with actionable insights
   - Each insight should have emoji + bold title + explanation
   - Focus on: size appropriateness, test coverage quality, pattern usage, architectural clarity, complexity management, dependency health
   - Examples:
     * "📏 **Large codebase** - Consider modularization strategies for better maintainability"
     * "⚠️ **Low test coverage** - Current ratio suggests quality risks; aim for 1 test per 5 code files"
     * "🌟 **Strong pattern usage** - Consistent architectural patterns indicate mature codebase"

## Output Requirements

- **Be specific and quantitative**: Always include numbers and percentages
- **Be actionable**: Every insight should suggest what to do
- **Be honest**: Don't sugarcoat issues - be direct about problems
- **Use emojis effectively**: Visual indicators help executive readability
- **Prioritize impact**: Focus on metrics that matter most for project health
- **Provide complete markdown**: Generate a full, well-formatted markdown document with all sections

## Rating Guidelines

**Health Score Components**:
- Code Quality (0-10): Maintainability, reliability, security
- Test Coverage: Ratio of test files to code files (aim for 20%+)
- Architecture: Clear style + component organization
- Dependencies: Count (<50 good, <100 ok, >100 concerning) + vulnerabilities
- Complexity: Average complexity (≤5 good, ≤10 ok, >10 high)

**Insight Categories**:
- Size: Small (<1K lines), Medium (<10K), Large (<50K), Very Large (≥50K)
- Test Ratio: None (0%), Low (<20%), Medium (20-80%), High (>80%)
- Patterns: Poor (0-2), Good (3-5), Excellent (6+)
- Anti-Patterns: None (0), Few (1-2), Many (3-5), Critical (6+)
- Complexity: Low (≤5), Medium (6-10), High (11-15), Very High (>15)

Generate a complete markdown document (NOT JSON) with the KPI dashboard. Include all sections with proper formatting, headings, tables, and bullet points.`;
  }

  /**
   * Build human prompt with project context
   */
  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    let prompt = `Analyze the following repository and generate a comprehensive KPI dashboard:\n\n`;

    // Project overview
    prompt += `## Project: ${context.projectPath}\n\n`;

    // File statistics
    const stats = this.calculateFileStatistics(context);
    prompt += `### File Statistics\n\n`;
    prompt += `- **Total Files**: ${stats.totalFiles}\n`;
    prompt += `- **Code Files**: ${stats.codeFiles}\n`;
    prompt += `- **Test Files**: ${stats.testFiles}\n`;
    prompt += `- **Config Files**: ${stats.configFiles}\n`;
    prompt += `- **Total Lines**: ${stats.totalLines.toLocaleString()}\n`;
    prompt += `- **Project Size**: ${this.formatFileSize(stats.totalSize)}\n`;
    prompt += `- **Languages**: ${stats.languages.join(', ')}\n\n`;

    prompt += `### Analysis Requirements\n\n`;
    prompt += `Generate a **complete markdown document** with the following sections:\n\n`;
    prompt += `1. **Repository Health Score** - Overall score (0-100%) with emoji rating\n`;
    prompt += `2. **Code Organization** - File distribution analysis, test coverage ratio\n`;
    prompt += `3. **Architecture Quality** - Patterns, organization, design principles\n`;
    prompt += `4. **Code Quality Metrics** - Maintainability, reliability, security\n`;
    prompt += `5. **Dependency Health** - Package counts, vulnerabilities, risks\n`;
    prompt += `6. **Key Insights** - 5-8 actionable recommendations with emojis\n\n`;
    prompt += `7. **Recommendations** - Prioritized action items for improvement\n\n`;
    prompt += `Use markdown headers (##, ###), bullet points, tables, and emojis for visual appeal.\n`;
    prompt += `Focus on what matters most: test coverage, architectural clarity, code complexity, dependency management, and technical debt.\n\n`;
    prompt += `Provide your response as a complete markdown document ready to save to kpi.md.`;

    return prompt;
  }

  /**
   * Parse LLM analysis output
   */
  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    try {
      const trimmedAnalysis = analysis.trim();

      // Check if we have meaningful content (at least 100 chars and some markdown structure)
      const hasContent =
        trimmedAnalysis.length > 100 &&
        (trimmedAnalysis.includes('#') || trimmedAnalysis.includes('**'));

      if (!hasContent) {
        this.logger.warn('KPI analysis has insufficient content', {
          length: trimmedAnalysis.length,
          preview: trimmedAnalysis.substring(0, 100),
        });
        return {
          healthScore: 0,
          insights: [],
          rawAnalysis: trimmedAnalysis,
          hasMinimalData: true,
        };
      }

      // Extract key metrics for summary
      const healthScore = this.extractNumber(trimmedAnalysis, /health\s*score[:\s]+(\d+)/i) || 0;
      const insights = this.extractInsights(trimmedAnalysis);

      return {
        healthScore,
        insights,
        rawAnalysis: trimmedAnalysis,
        hasMinimalData: false,
      };
    } catch (error) {
      this.logger.warn('Failed to parse KPI analysis', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        healthScore: 0,
        insights: [],
        rawAnalysis: analysis.trim() || 'No analysis generated',
        hasMinimalData: true,
      };
    }
  }

  /**
   * Generate summary from parsed data
   */
  protected generateSummary(data: Record<string, unknown>): string {
    const healthScore = (data.healthScore as number) || 0;
    const insightCount = ((data.insights as string[]) || []).length;

    return `Repository health score: ${healthScore}%. Generated ${insightCount} actionable insights for improvement.`;
  }

  /**
   * Format markdown output (backwards compatibility)
   */
  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: typeof AgentWorkflowState.State,
  ): Promise<string> {
    let content = `# 📊 Repository KPI Dashboard\n\n`;

    // Check if we have meaningful data
    if (data.hasMinimalData) {
      content += `## ⚠️ Insufficient Data\n\n`;
      content += `Unable to generate comprehensive KPI metrics. This may occur if:\n`;
      content += `- The project structure is minimal\n`;
      content += `- Analysis could not extract sufficient metrics\n`;
      content += `- LLM response was incomplete\n\n`;
      content += `**Raw Analysis:**\n${data.rawAnalysis || 'No data available'}\n`;
      return content;
    }

    if (data.rawAnalysis && typeof data.rawAnalysis === 'string' && data.rawAnalysis.length > 100) {
      // If we have substantial raw analysis, use it
      content += `${data.rawAnalysis}\n\n`;
    } else {
      // Otherwise, structure the output
      content += `## Health Score\n\n`;
      content += `**Overall Score**: ${data.healthScore || 0}%\n\n`;

      if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
        content += `## Key Insights\n\n`;
        (data.insights as string[]).forEach((insight) => {
          content += `- ${insight}\n`;
        });
        content += `\n`;
      }
    }

    return content;
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

  /**
   * Helper: Extract number from text
   */
  private extractNumber(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Helper: Extract insights from markdown
   */
  private extractInsights(text: string): string[] {
    const insights: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        insights.push(line.trim().substring(2));
      }
    }

    return insights;
  }

  /**
   * Helper: Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
