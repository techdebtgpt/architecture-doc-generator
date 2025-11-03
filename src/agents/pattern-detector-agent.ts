import { Agent } from './agent.interface';
import { AgentContext, AgentMetadata, AgentPriority, AgentFile } from '../types/agent.types';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { LLMJsonParser } from '../utils/json-parser';
import { getSupportedLanguages } from '../config/language-config';

interface DesignPattern {
  pattern: string;
  usage?: string;
  description?: string;
  files?: string[];
  confidence: number;
}

interface ArchitecturalPattern {
  pattern: string;
  description?: string;
  evidence?: string[];
  impact?: string;
}

interface AntiPattern {
  pattern: string;
  severity: string;
  description: string;
  location: string;
  recommendation: string;
}

/**
 * Agent that detects design patterns, architectural patterns, and anti-patterns
 * Uses self-refinement workflow to iteratively improve pattern detection
 */
export class PatternDetectorAgent extends BaseAgentWorkflow implements Agent {
  public getMetadata(): AgentMetadata {
    return {
      name: 'pattern-detector',
      version: '1.0.0',
      description:
        'Detects design patterns, architectural patterns, and anti-patterns in the codebase',
      priority: AgentPriority.HIGH,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: false,
        dependencies: ['file-structure'], // Needs structure to understand project organization
        supportsIncremental: false,
        estimatedTokens: 8000,
        supportedLanguages: getSupportedLanguages(),
      },
      tags: ['patterns', 'design-patterns', 'best-practices', 'code-quality'],
      outputFilename: 'patterns.md',
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    // Can execute if we have source code files
    const sourceExtensions = ['.ts', '.js', '.py', '.java', '.cs', '.go'];
    return context.files.some((file) =>
      sourceExtensions.some((ext) => file.toLowerCase().endsWith(ext)),
    );
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    return 4000 + context.files.length * 3;
  }

  // Abstract method implementations for BaseAgentWorkflow

  protected getAgentName(): string {
    return 'pattern-detector';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert software architect specializing in pattern detection and analysis.

Analyze the provided codebase and identify:

1. **Design Patterns**: Gang of Four patterns, enterprise patterns, functional patterns
2. **Architectural Patterns**: MVC, MVVM, microservices, event-driven, layered, etc.
3. **Anti-Patterns**: Code smells, architecture smells, performance issues

**Output Format (JSON)**:
\`\`\`json
{
  "summary": "Brief overview of patterns found",
  "designPatterns": [
    {
      "pattern": "Pattern Name",
      "confidence": 0.9,
      "locations": ["file1.ts:123", "file2.ts:456"],
      "description": "How it's implemented"
    }
  ],
  "architecturalPatterns": [
    {
      "pattern": "Pattern Name",
      "confidence": 0.85,
      "evidence": ["Evidence 1", "Evidence 2"],
      "impact": "Positive/Negative impact description"
    }
  ],
  "antiPatterns": [
    {
      "pattern": "Anti-pattern Name",
      "severity": "low|medium|high",
      "locations": ["file.ts:123"],
      "recommendation": "How to fix"
    }
  ],
  "recommendations": ["Actionable improvement 1", "Actionable improvement 2"],
  "warnings": ["Any concerns or notes"]
}
\`\`\`

Focus on providing **evidence-based analysis** with specific file locations and code examples.

${this.getResponseLengthGuidance(_context)}

CRITICAL: You MUST respond with ONLY valid JSON matching the exact schema above. Do NOT include markdown formatting, explanations, or any text outside the JSON object. Start your response with { and end with }.`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const patternData = this.analyzePatternIndicators(context);

    return `Analyze patterns in this project:

**Project**: ${context.projectPath}
**Files**: ${context.files.length} files
**Languages**: ${context.languageHints.map((h) => h.language).join(', ')}

**Pattern Indicators Found**:
${JSON.stringify(patternData, null, 2)}

Detect design patterns, architectural patterns, and anti-patterns with specific evidence.`;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    return this.parseAnalysisResult(analysis);
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    state: { context: unknown },
  ): Promise<string> {
    const context = state.context as AgentContext;
    const patternData = this.analyzePatternIndicators(context);
    return this.formatMarkdownReport(data, patternData);
  }

  protected generateSummary(data: Record<string, unknown>): string {
    const summary = data.summary as string | undefined;
    return summary || 'Pattern detection completed';
  }

  private analyzePatternIndicators(context: AgentContext): any {
    const indicators: any = {
      hasModules: false,
      hasServices: false,
      hasControllers: false,
      hasRepositories: false,
      hasFactories: false,
      hasDecorators: false,
      hasMiddleware: false,
      hasObservers: false,
      hasStrategies: false,
      hasSingletons: false,
    };

    // Analyze file names for pattern indicators
    context.files.forEach((file) => {
      const lowerFile = file.toLowerCase();

      if (lowerFile.includes('module')) indicators.hasModules = true;
      if (lowerFile.includes('service')) indicators.hasServices = true;
      if (lowerFile.includes('controller')) indicators.hasControllers = true;
      if (lowerFile.includes('repository') || lowerFile.includes('repo'))
        indicators.hasRepositories = true;
      if (lowerFile.includes('factory')) indicators.hasFactories = true;
      if (lowerFile.includes('decorator')) indicators.hasDecorators = true;
      if (lowerFile.includes('middleware')) indicators.hasMiddleware = true;
      if (lowerFile.includes('observer') || lowerFile.includes('listener'))
        indicators.hasObservers = true;
      if (lowerFile.includes('strategy')) indicators.hasStrategies = true;
      if (lowerFile.includes('singleton')) indicators.hasSingletons = true;
    });

    // Count occurrences
    const patterns: any = {};
    const keywords = [
      'service',
      'controller',
      'repository',
      'factory',
      'strategy',
      'observer',
      'decorator',
      'singleton',
      'adapter',
      'facade',
      'proxy',
      'builder',
      'command',
      'mediator',
    ];

    keywords.forEach((keyword) => {
      patterns[keyword] = context.files.filter((f) => f.toLowerCase().includes(keyword)).length;
    });

    return { indicators, patterns };
  }

  private parseAnalysisResult(result: string): Record<string, unknown> {
    return LLMJsonParser.parse(result, {
      contextName: 'pattern-detector',
      logErrors: true,
      fallback: {
        summary: 'Error parsing analysis result',
        designPatterns: [],
        architecturalPatterns: [],
        antiPatterns: [],
        recommendations: [],
        warnings: ['Failed to parse LLM response as JSON'],
      },
    });
  }

  private formatMarkdownReport(
    analysis: Record<string, unknown>,
    patternData: Record<string, unknown>,
  ): string {
    // Type-safe accessors
    const summary = analysis.summary as string | undefined;
    const designPatterns = analysis.designPatterns as DesignPattern[] | undefined;
    const architecturalPatterns = analysis.architecturalPatterns as
      | ArchitecturalPattern[]
      | undefined;
    const antiPatterns = analysis.antiPatterns as AntiPattern[] | undefined;
    const recommendations = analysis.recommendations as string[] | undefined;
    const patternCounts = patternData.patterns as Record<string, number> | undefined;

    let markdown = `# 🎨 Design Pattern Analysis

## Overview
${summary || 'Pattern detection analysis completed'}

`;

    // Design Patterns Section
    markdown += `## 🔹 Design Patterns Detected\n\n`;

    if (designPatterns && designPatterns.length > 0) {
      // Group patterns by confidence level
      const highConfidence = designPatterns.filter((p) => p.confidence >= 0.8);
      const mediumConfidence = designPatterns.filter(
        (p) => p.confidence >= 0.5 && p.confidence < 0.8,
      );
      const lowConfidence = designPatterns.filter((p) => p.confidence < 0.5);

      if (highConfidence.length > 0) {
        markdown += `### High Confidence (80%+)\n\n`;
        markdown += this.formatDesignPatternTable(highConfidence);
        markdown += '\n\n';
      }

      if (mediumConfidence.length > 0) {
        markdown += `### Medium Confidence (50-79%)\n\n`;
        markdown += this.formatDesignPatternTable(mediumConfidence);
        markdown += '\n\n';
      }

      if (lowConfidence.length > 0) {
        markdown += `### Possible Patterns (<50%)\n\n`;
        markdown += this.formatDesignPatternTable(lowConfidence);
        markdown += '\n\n';
      }
    } else {
      markdown += `_No specific design patterns detected in the analysis._\n\n`;
    }

    // Architectural Patterns Section
    markdown += `## 🏗️ Architectural Patterns\n\n`;

    if (architecturalPatterns && architecturalPatterns.length > 0) {
      architecturalPatterns.forEach((p) => {
        markdown += `### ${p.pattern}\n\n`;

        if (p.description) {
          markdown += `**Description**: ${p.description}\n\n`;
        }

        if (p.evidence && p.evidence.length > 0) {
          markdown += `**Evidence**:\n`;
          p.evidence.forEach((e: string) => {
            markdown += `- ${e}\n`;
          });
          markdown += '\n';
        }

        if (p.impact) {
          markdown += `**Impact**: ${p.impact}\n\n`;
        }

        markdown += '---\n\n';
      });
    } else {
      markdown += `_No architectural patterns identified._\n\n`;
    }

    // Anti-Patterns Section
    if (antiPatterns && antiPatterns.length > 0) {
      markdown += `## ⚠️ Anti-Patterns & Code Smells\n\n`;

      // Group by severity
      const critical = antiPatterns.filter((ap) => ap.severity === 'high');
      const moderate = antiPatterns.filter((ap) => ap.severity === 'medium');
      const minor = antiPatterns.filter((ap) => ap.severity === 'low');

      const formatAntiPatterns = (patterns: AntiPattern[], title: string) => {
        if (patterns.length === 0) return '';

        let section = `### ${title}\n\n`;
        section += `| Pattern | Location | Recommendation |\n`;
        section += `|---------|----------|----------------|\n`;

        patterns.forEach((ap) => {
          const location =
            ap.location && ap.location !== 'Multiple locations' ? ap.location : 'See description';
          const rec =
            ap.recommendation && ap.recommendation !== 'Review and refactor'
              ? ap.recommendation.substring(0, 80) + (ap.recommendation.length > 80 ? '...' : '')
              : 'Refactor affected code';

          section += `| **${ap.pattern}** | ${location} | ${rec} |\n`;
        });

        return section + '\n';
      };

      if (critical.length > 0) {
        markdown += formatAntiPatterns(critical, '🔴 High Severity');
      }
      if (moderate.length > 0) {
        markdown += formatAntiPatterns(moderate, '🟡 Medium Severity');
      }
      if (minor.length > 0) {
        markdown += formatAntiPatterns(minor, '🟢 Low Severity');
      }
    }

    // Recommendations Section
    markdown += `## 💡 Recommendations\n\n`;

    if (recommendations && recommendations.length > 0) {
      recommendations.forEach((rec: string, index: number) => {
        markdown += `${index + 1}. ${rec}\n`;
      });
    } else {
      markdown += `_No specific recommendations provided._\n`;
    }

    // Pattern Statistics
    if (patternCounts) {
      markdown += `\n## 📊 Pattern Statistics\n\n`;
      markdown += `| Pattern Type | File Count |\n`;
      markdown += `|--------------|------------|\n`;

      Object.entries(patternCounts)
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .forEach(([pattern, count]) => {
          markdown += `| ${pattern.charAt(0).toUpperCase() + pattern.slice(1)} | ${count} |\n`;
        });
    }

    return markdown;
  }

  /**
   * Format design patterns as a clean table
   */
  private formatDesignPatternTable(patterns: DesignPattern[]): string {
    let table = `| Pattern | Confidence | Implementation Details |\n`;
    table += `|---------|------------|------------------------|\n`;

    patterns.forEach((p) => {
      const confidence = `${(p.confidence * 100).toFixed(0)}%`;
      const details = p.description || p.usage || 'Detected in codebase structure';
      const shortDetails = details.length > 60 ? details.substring(0, 57) + '...' : details;

      table += `| **${p.pattern}** | ${confidence} | ${shortDetails} |\n`;
    });

    return table;
  }

  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    const markdown = await this.formatMarkdown(data, state);
    const metadata = this.getMetadata();

    return [
      {
        filename: 'patterns.md',
        content: markdown,
        title: 'Design Patterns Analysis',
        category: 'analysis',
        order: metadata.priority,
      },
    ];
  }
}
