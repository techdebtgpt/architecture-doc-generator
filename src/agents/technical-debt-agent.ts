import { promises as fs } from 'fs';
import * as path from 'path';
import { Agent } from './agent.interface';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { LLMJsonParser } from '../utils/json-parser';
import { AgentContext, AgentFile, AgentMetadata, AgentPriority } from '../types/agent.types';
import { getSupportedLanguages } from '../config/language-config';

interface DebtCategory {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string;
  impact: string;
}

interface DebtHotspot {
  file: string;
  reason: string;
}

export class TechnicalDebtAgent extends BaseAgentWorkflow implements Agent {
  public getMetadata(): AgentMetadata {
    return {
      name: 'technical-debt',
      version: '1.0.0',
      description:
        'Analyzes technical debt hotspots, TODO and FIXME indicators, maintainability risks, and cleanup priorities',
      priority: AgentPriority.MEDIUM,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: true,
        dependencies: [
          'file-structure',
          'dependency-analyzer',
          'pattern-detector',
          'security-analyzer',
          'error-handling-architecture',
          'data-contracts',
        ],
        supportsIncremental: true,
        estimatedTokens: 7000,
        supportedLanguages: getSupportedLanguages(),
      },
      tags: ['technical-debt', 'maintainability', 'todo', 'cleanup', 'hotspots'],
      outputFilename: 'technical-debt.md',
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    return context.files.length > 0;
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    return 3500 + Math.min(context.files.length * 10, 6000);
  }

  protected getAgentName(): string {
    return 'technical-debt';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert software architect focused on identifying and prioritizing technical debt.

Analyze the codebase for maintainability debt, risky shortcuts, architectural erosion, and cleanup priorities.

Return ONLY valid JSON in this exact structure:
{
  "summary": "Short overall assessment",
  "debtScore": 0,
  "categories": [
    {
      "category": "duplication|layering|testing|security|error-handling|data-contracts|dependencies|size",
      "severity": "critical|high|medium|low",
      "evidence": "why this is debt",
      "impact": "business or engineering impact"
    }
  ],
  "hotspots": [
    {
      "file": "relative/path.ts",
      "reason": "why this file is a debt hotspot"
    }
  ],
  "quickWins": ["small high-value improvements"],
  "strategicInitiatives": ["larger refactors or program-level changes"],
  "recommendations": ["prioritized recommendations"]
}

Use available evidence from file structure, TODO and FIXME indicators, large files, architecture smells, and prior agent outputs.

${this.getResponseLengthGuidance(_context)}

CRITICAL: Respond with ONLY valid JSON. Do not include markdown or any text outside the JSON object.`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const metrics = await this.inspectTechnicalDebt(context);
    const previousSummaries = this.getPreviousSummaries(context, [
      'pattern-detector',
      'security-analyzer',
      'error-handling-architecture',
      'data-contracts',
    ]);

    return `Analyze technical debt for this project.

Project: ${context.projectPath}
Total Files: ${context.files.length}
Languages: ${context.languageHints.map((hint) => hint.language).join(', ')}

Debt Indicators:
${JSON.stringify(metrics.indicators, null, 2)}

Potential Hotspots:
${metrics.hotspots.map((hotspot) => `- ${hotspot.file}: ${hotspot.reason}`).join('\n') || '- None detected'}

Relevant Prior Agent Summaries:
${previousSummaries}

Sample Hotspot Files:
${
  metrics.samples
    .map(
      (sample) => `### ${sample.relativePath}
\`\`\`${sample.language}
${sample.content}
\`\`\``,
    )
    .join('\n\n') || 'No hotspot samples available.'
}

Produce a prioritized technical debt assessment with quick wins and strategic initiatives.

Return ONLY the JSON object.`;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    return LLMJsonParser.parse(analysis, {
      contextName: 'technical-debt',
      logErrors: true,
      fallback: {
        summary: 'Technical debt analysis could not be fully parsed.',
        debtScore: 0,
        categories: [],
        hotspots: [],
        quickWins: [],
        strategicInitiatives: [],
        recommendations: [],
      },
    });
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: typeof AgentWorkflowState.State,
  ): Promise<string> {
    const categories = (data.categories as DebtCategory[] | undefined) || [];
    const hotspots = (data.hotspots as DebtHotspot[] | undefined) || [];
    const quickWins = (data.quickWins as string[] | undefined) || [];
    const strategicInitiatives = (data.strategicInitiatives as string[] | undefined) || [];
    const recommendations = (data.recommendations as string[] | undefined) || [];

    let markdown = `# Technical Debt\n\n`;
    markdown += `## Overview\n${(data.summary as string) || 'Analysis completed.'}\n\n`;
    markdown += `## Debt Score\n${(data.debtScore as number | undefined) ?? 0}/100\n\n`;

    markdown += `## Debt Categories\n\n`;
    if (categories.length > 0) {
      for (const category of categories) {
        markdown += `### ${category.severity.toUpperCase()} - ${category.category}\n`;
        markdown += `${category.evidence}\n\nImpact: ${category.impact}\n\n`;
      }
    } else {
      markdown += `No major debt categories were identified.\n\n`;
    }

    markdown += `## Hotspots\n`;
    markdown +=
      hotspots.length > 0
        ? `${hotspots.map((hotspot) => `- ${hotspot.file}: ${hotspot.reason}`).join('\n')}\n\n`
        : 'No concrete hotspots were identified.\n\n';

    markdown += `## Quick Wins\n`;
    markdown +=
      quickWins.length > 0
        ? `${quickWins.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n`
        : '1. Remove stale TODO and FIXME markers tied to already-completed work.\n\n';

    markdown += `## Strategic Initiatives\n`;
    markdown +=
      strategicInitiatives.length > 0
        ? `${strategicInitiatives.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n`
        : '1. Consolidate recurring architectural drift into a tracked refactoring plan.\n\n';

    markdown += `## Recommendations\n`;
    markdown +=
      recommendations.length > 0
        ? `${recommendations.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n`
        : '1. Prioritize debt reduction by impact and blast radius rather than by file age.\n';

    return markdown;
  }

  protected generateSummary(data: Record<string, unknown>): string {
    return (data.summary as string) || 'Technical debt analysis completed';
  }

  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    const markdown = await this.formatMarkdown(data, state);

    return [
      {
        filename: 'technical-debt.md',
        content: markdown,
        title: 'Technical Debt',
        category: 'analysis',
        order: this.getMetadata().priority,
      },
    ];
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

  private async inspectTechnicalDebt(context: AgentContext): Promise<{
    indicators: Record<string, number>;
    hotspots: DebtHotspot[];
    samples: Array<{ relativePath: string; language: string; content: string }>;
  }> {
    const filesToScan = context.files.slice(0, 120);
    let todoCount = 0;
    let fixmeCount = 0;
    let hackCount = 0;
    const hotspotCandidates: Array<{ file: string; reason: string; lines: number }> = [];

    for (const file of filesToScan) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n').length;

        todoCount += (content.match(/TODO/gi) || []).length;
        fixmeCount += (content.match(/FIXME/gi) || []).length;
        hackCount += (content.match(/HACK|XXX|TEMP/gi) || []).length;

        if (lines >= 300 || /TODO|FIXME|HACK|XXX|TEMP/i.test(content)) {
          hotspotCandidates.push({
            file,
            reason:
              lines >= 300
                ? `Large file with ${lines} lines`
                : 'Contains TODO, FIXME, or other debt markers',
            lines,
          });
        }
      } catch (error) {
        this.logger.debug('Skipping unreadable technical debt file', {
          file,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const hotspots = hotspotCandidates
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 8)
      .map((candidate) => ({
        file: path.relative(context.projectPath, candidate.file),
        reason: candidate.reason,
      }));

    const samples = await this.readHotspotSamples(
      context.projectPath,
      hotspotCandidates.slice(0, 5),
    );

    return {
      indicators: {
        todoCount,
        fixmeCount,
        hackCount,
        hotspotCount: hotspots.length,
      },
      hotspots,
      samples,
    };
  }

  private async readHotspotSamples(
    projectPath: string,
    hotspots: Array<{ file: string }>,
  ): Promise<Array<{ relativePath: string; language: string; content: string }>> {
    const samples: Array<{ relativePath: string; language: string; content: string }> = [];

    for (const hotspot of hotspots) {
      try {
        const content = await fs.readFile(hotspot.file, 'utf-8');
        samples.push({
          relativePath: path.relative(projectPath, hotspot.file),
          language: path.extname(hotspot.file).replace('.', '') || 'text',
          content: content.substring(0, 1200),
        });
      } catch (error) {
        this.logger.debug('Skipping unreadable technical debt hotspot sample', {
          file: hotspot.file,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return samples;
  }
}
