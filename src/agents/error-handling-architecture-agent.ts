import { promises as fs } from 'fs';
import * as path from 'path';
import { Agent } from './agent.interface';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { LLMJsonParser } from '../utils/json-parser';
import { AgentContext, AgentFile, AgentMetadata, AgentPriority } from '../types/agent.types';
import { getSupportedLanguages } from '../config/language-config';

interface ErrorHandlingIssue {
  area: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  files?: string[];
  recommendation: string;
}

interface ErrorHandlingMechanism {
  name: string;
  description: string;
  files?: string[];
}

export class ErrorHandlingArchitectureAgent extends BaseAgentWorkflow implements Agent {
  public getMetadata(): AgentMetadata {
    return {
      name: 'error-handling-architecture',
      version: '1.0.0',
      description:
        'Analyzes error propagation, exception translation, resilience patterns, and boundary-level error handling architecture',
      priority: AgentPriority.MEDIUM,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: true,
        dependencies: ['file-structure', 'pattern-detector', 'flow-visualization'],
        supportsIncremental: true,
        estimatedTokens: 6000,
        supportedLanguages: getSupportedLanguages(),
      },
      tags: ['error-handling', 'exceptions', 'resilience', 'retries', 'boundaries'],
      outputFilename: 'error-handling.md',
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    return context.files.length > 0;
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    return 3000 + Math.min(context.files.length * 8, 5000);
  }

  protected getAgentName(): string {
    return 'error-handling-architecture';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert software architect specializing in error handling and resilience design.

Analyze the project's error handling architecture and describe:
1. Error handling strategy across layers and boundaries
2. Exception translation or transport mapping patterns
3. Resilience mechanisms such as retry, fallback, circuit breaker, timeout, dead-letter handling
4. Logging and observability of failures
5. Architectural risks such as swallowed exceptions, inconsistent error contracts, missing boundary handlers

Return ONLY valid JSON in this exact structure:
{
  "summary": "Short overall assessment",
  "strategy": "How errors are handled across the application",
  "mechanisms": [
    {
      "name": "mechanism name",
      "description": "how it is implemented",
      "files": ["relative/path.ts"]
    }
  ],
  "boundaryLayers": ["presentation", "api", "application", "infrastructure"],
  "translationLayers": ["where domain errors are mapped to transport or persistence errors"],
  "resiliencePatterns": ["retry", "fallback", "timeout"],
  "issues": [
    {
      "area": "api boundary",
      "severity": "critical|high|medium|low",
      "description": "issue description",
      "files": ["relative/path.ts"],
      "recommendation": "what to change"
    }
  ],
  "recommendations": ["actionable recommendation"]
}

Be evidence-based and reference files when possible.

${this.getResponseLengthGuidance(_context)}

CRITICAL: Respond with ONLY valid JSON. Do not include markdown or any text outside the JSON object.`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const analysis = await this.inspectErrorHandlingFiles(context);
    const previousSummaries = this.getPreviousSummaries(context, [
      'pattern-detector',
      'flow-visualization',
      'architecture-analyzer',
    ]);

    const samples = analysis.samples
      .map(
        (sample) => `### ${sample.relativePath}
\`\`\`txt
${sample.content}
\`\`\``,
      )
      .join('\n\n');

    return `Analyze error handling architecture for this project.

Project: ${context.projectPath}
Total Files: ${context.files.length}
Languages: ${context.languageHints.map((hint) => hint.language).join(', ')}

Heuristic Signals:
${JSON.stringify(analysis.summary, null, 2)}

Candidate Files:
${analysis.candidateFiles.map((file) => `- ${file}`).join('\n') || '- None detected'}

Relevant Prior Agent Summaries:
${previousSummaries}

Sample Contents:
${samples || 'No representative files could be sampled.'}

Identify boundary handlers, transport mapping, retry or fallback patterns, swallowed exceptions, and consistency problems.

Return ONLY the JSON object.`;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    return LLMJsonParser.parse(analysis, {
      contextName: 'error-handling-architecture',
      logErrors: true,
      fallback: {
        summary: 'Error handling architecture analysis could not be fully parsed.',
        strategy: 'Unknown',
        mechanisms: [],
        boundaryLayers: [],
        translationLayers: [],
        resiliencePatterns: [],
        issues: [],
        recommendations: [],
      },
    });
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: typeof AgentWorkflowState.State,
  ): Promise<string> {
    const mechanisms = (data.mechanisms as ErrorHandlingMechanism[] | undefined) || [];
    const issues = (data.issues as ErrorHandlingIssue[] | undefined) || [];
    const boundaryLayers = (data.boundaryLayers as string[] | undefined) || [];
    const translationLayers = (data.translationLayers as string[] | undefined) || [];
    const resiliencePatterns = (data.resiliencePatterns as string[] | undefined) || [];
    const recommendations = (data.recommendations as string[] | undefined) || [];

    let markdown = `# Error Handling Architecture\n\n`;
    markdown += `## Overview\n${(data.summary as string) || 'Analysis completed.'}\n\n`;
    markdown += `## Strategy\n${(data.strategy as string) || 'No strategy summary provided.'}\n\n`;

    markdown += `## Boundary Layers\n`;
    markdown +=
      boundaryLayers.length > 0
        ? `${boundaryLayers.map((item) => `- ${item}`).join('\n')}\n\n`
        : 'No clear boundary layers identified.\n\n';

    markdown += `## Translation Layers\n`;
    markdown +=
      translationLayers.length > 0
        ? `${translationLayers.map((item) => `- ${item}`).join('\n')}\n\n`
        : 'No explicit error translation layers identified.\n\n';

    markdown += `## Resilience Patterns\n`;
    markdown +=
      resiliencePatterns.length > 0
        ? `${resiliencePatterns.map((item) => `- ${item}`).join('\n')}\n\n`
        : 'No resilience patterns identified.\n\n';

    markdown += `## Mechanisms\n\n`;
    if (mechanisms.length > 0) {
      for (const mechanism of mechanisms) {
        markdown += `### ${mechanism.name}\n${mechanism.description}\n\n`;
        if (mechanism.files && mechanism.files.length > 0) {
          markdown += `Files:\n${mechanism.files.map((file) => `- ${file}`).join('\n')}\n\n`;
        }
      }
    } else {
      markdown += `No error handling mechanisms identified.\n\n`;
    }

    markdown += `## Risks\n\n`;
    if (issues.length > 0) {
      for (const issue of issues) {
        markdown += `### ${issue.severity.toUpperCase()} - ${issue.area}\n${issue.description}\n\n`;
        if (issue.files && issue.files.length > 0) {
          markdown += `Files:\n${issue.files.map((file) => `- ${file}`).join('\n')}\n\n`;
        }
        markdown += `Recommendation: ${issue.recommendation}\n\n`;
      }
    } else {
      markdown += `No material error handling risks were identified.\n\n`;
    }

    markdown += `## Recommendations\n`;
    markdown +=
      recommendations.length > 0
        ? `${recommendations.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n`
        : '1. Standardize error contracts across boundaries.\n';

    return markdown;
  }

  protected generateSummary(data: Record<string, unknown>): string {
    return (data.summary as string) || 'Error handling architecture analysis completed';
  }

  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    const markdown = await this.formatMarkdown(data, state);

    return [
      {
        filename: 'error-handling.md',
        content: markdown,
        title: 'Error Handling Architecture',
        category: 'analysis',
        order: this.getMetadata().priority,
      },
    ];
  }

  private async inspectErrorHandlingFiles(context: AgentContext): Promise<{
    summary: Record<string, number>;
    candidateFiles: string[];
    samples: Array<{ relativePath: string; content: string }>;
  }> {
    const filePattern =
      /(error|exception|middleware|filter|handler|retry|fallback|timeout|resilien|boundary|interceptor|problem)/i;
    const contentPattern =
      /try\s*\{|catch\s*\(|throw\s+new\s+|throw\s+|next\s*\(|logger\.(error|warn)|console\.error|Promise\.reject|Result<|Either<|onError|handleError/i;

    const candidateFiles = context.files.filter((file) => filePattern.test(file)).slice(0, 20);
    const contentMatches = await this.readMatchingFiles(
      context.projectPath,
      context.files.slice(0, 120),
      contentPattern,
      8,
    );

    return {
      summary: {
        pathMatches: candidateFiles.length,
        contentMatches: contentMatches.length,
      },
      candidateFiles: candidateFiles.map((file) => path.relative(context.projectPath, file)),
      samples: contentMatches,
    };
  }

  private getPreviousSummaries(context: AgentContext, agentNames: string[]): string {
    const summaries = agentNames
      .map((name) => {
        const result = context.previousResults.get(name);
        if (!result?.summary) {
          return null;
        }
        return `- ${name}: ${result.summary}`;
      })
      .filter((value): value is string => Boolean(value));

    return summaries.length > 0 ? summaries.join('\n') : '- No previous summaries available';
  }

  private async readMatchingFiles(
    projectPath: string,
    files: string[],
    pattern: RegExp,
    limit: number,
  ): Promise<Array<{ relativePath: string; content: string }>> {
    const matches: Array<{ relativePath: string; content: string }> = [];

    for (const file of files) {
      if (matches.length >= limit) {
        break;
      }

      try {
        const content = await fs.readFile(file, 'utf-8');
        if (!pattern.test(content)) {
          continue;
        }

        matches.push({
          relativePath: path.relative(projectPath, file),
          content: content.substring(0, 1200),
        });
      } catch (error) {
        this.logger.debug('Skipping unreadable error handling file', {
          file,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return matches;
  }
}
