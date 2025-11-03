import { Agent } from './agent.interface';
import { AgentContext, AgentMetadata, AgentPriority, AgentFile } from '../types/agent.types';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { LLMJsonParser } from '../utils/json-parser';
import { getSupportedLanguages } from '../config/language-config';

interface DesignPattern {
  pattern: string;
  usage?: string;
  files?: string[];
  confidence: number;
}

interface ArchitecturalPattern {
  pattern: string;
  description: string;
  evidence?: string[];
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

Focus on providing **evidence-based analysis** with specific file locations and code examples.`;
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
    const indicators = patternData.indicators as Record<string, unknown> | undefined;

    return `# 🎨 Pattern Detection Analysis

## Overview
${summary || 'Pattern detection analysis completed'}

## Design Patterns Detected

${
  designPatterns && designPatterns.length > 0
    ? designPatterns
        .map(
          (p) => `### ${p.pattern}
**Usage**: ${p.usage}
**Confidence**: ${(p.confidence * 100).toFixed(0)}%
**Files**: ${p.files?.join(', ') || 'Multiple files'}
`,
        )
        .join('\n')
    : '_No specific design patterns detected_'
}

## Architectural Patterns

${
  architecturalPatterns && architecturalPatterns.length > 0
    ? architecturalPatterns
        .map(
          (p) => `### ${p.pattern}
${p.description}

**Evidence**:
${p.evidence?.map((e: string) => `- ${e}`).join('\n') || ''}
`,
        )
        .join('\n')
    : '_No architectural patterns identified_'
}

${
  antiPatterns && antiPatterns.length > 0
    ? `
## ⚠️ Anti-Patterns & Code Smells

${antiPatterns
  .map(
    (ap) => `### ${ap.pattern} (${ap.severity.toUpperCase()})
**Description**: ${ap.description}
**Location**: ${ap.location}
**Recommendation**: ${ap.recommendation}
`,
  )
  .join('\n')}
`
    : ''
}

## 💡 Recommendations

${(recommendations || []).map((rec: string, index: number) => `${index + 1}. ${rec}`).join('\n')}

---
**Pattern Indicators Found**: ${
      indicators
        ? Object.entries(indicators)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(', ')
        : 'None'
    }`;
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
