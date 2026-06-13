import { promises as fs } from 'fs';
import * as path from 'path';
import { Agent } from './agent.interface';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { LLMJsonParser } from '../utils/json-parser';
import { AgentContext, AgentFile, AgentMetadata, AgentPriority } from '../types/agent.types';
import { getSupportedLanguages } from '../config/language-config';

interface ContractType {
  name: string;
  kind: string;
  description: string;
  files?: string[];
}

interface ContractRisk {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  files?: string[];
  recommendation: string;
}

export class DataContractsAgent extends BaseAgentWorkflow implements Agent {
  public getMetadata(): AgentMetadata {
    return {
      name: 'data-contracts',
      version: '1.0.0',
      description:
        'Analyzes DTOs, entities, models, mappers, and contract boundaries between persistence, domain, and transport layers',
      priority: AgentPriority.MEDIUM,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: true,
        dependencies: ['file-structure', 'schema-generator', 'dependency-analyzer'],
        supportsIncremental: true,
        estimatedTokens: 7000,
        supportedLanguages: getSupportedLanguages(),
      },
      tags: ['dto', 'entity', 'model', 'contracts', 'schema', 'mapping'],
      outputFilename: 'data-contracts.md',
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    return context.files.length > 0;
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    return 3500 + Math.min(context.files.length * 10, 6000);
  }

  protected getAgentName(): string {
    return 'data-contracts';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert software architect focused on data contracts and model boundaries.

Analyze how the project structures DTOs, entities, models, schemas, request and response objects, validation layers, and mapping logic.

Return ONLY valid JSON in this exact structure:
{
  "summary": "Short overall assessment",
  "structureOverview": "How data contracts are organized across layers",
  "contractTypes": [
    {
      "name": "UserDto",
      "kind": "dto|entity|model|schema|request|response|mapper",
      "description": "purpose and role",
      "files": ["relative/path.ts"]
    }
  ],
  "boundaries": ["API request boundary", "persistence mapping boundary"],
  "mappingPatterns": ["explicit mappers", "ORM entities reused as DTOs"],
  "validationMechanisms": ["zod", "class-validator", "manual validation"],
  "risks": [
    {
      "type": "contract drift",
      "severity": "critical|high|medium|low",
      "description": "problem description",
      "files": ["relative/path.ts"],
      "recommendation": "what to change"
    }
  ],
  "recommendations": ["actionable recommendation"]
}

Focus on whether the codebase cleanly separates persistence entities, domain models, and transport DTOs.

${this.getResponseLengthGuidance(_context)}

CRITICAL: Respond with ONLY valid JSON. Do not include markdown or any text outside the JSON object.`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const analysis = await this.inspectDataContractFiles(context);
    const previousSummaries = this.getPreviousSummaries(context, [
      'schema-generator',
      'architecture-analyzer',
    ]);

    const samples = analysis.samples
      .map(
        (sample) => `### ${sample.relativePath}
\`\`\`${sample.language}
${sample.content}
\`\`\``,
      )
      .join('\n\n');

    return `Analyze data contracts for this project.

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

Identify DTO/entity/model separation, request-response contracts, validation boundaries, mapper patterns, and data drift risks.

Return ONLY the JSON object.`;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    return LLMJsonParser.parse(analysis, {
      contextName: 'data-contracts',
      logErrors: true,
      fallback: {
        summary: 'Data contract analysis could not be fully parsed.',
        structureOverview: 'Unknown',
        contractTypes: [],
        boundaries: [],
        mappingPatterns: [],
        validationMechanisms: [],
        risks: [],
        recommendations: [],
      },
    });
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: typeof AgentWorkflowState.State,
  ): Promise<string> {
    const contractTypes = (data.contractTypes as ContractType[] | undefined) || [];
    const boundaries = (data.boundaries as string[] | undefined) || [];
    const mappingPatterns = (data.mappingPatterns as string[] | undefined) || [];
    const validationMechanisms = (data.validationMechanisms as string[] | undefined) || [];
    const risks = (data.risks as ContractRisk[] | undefined) || [];
    const recommendations = (data.recommendations as string[] | undefined) || [];

    let markdown = `# Data Contracts\n\n`;
    markdown += `## Overview\n${(data.summary as string) || 'Analysis completed.'}\n\n`;
    markdown += `## Structure\n${(data.structureOverview as string) || 'No structure overview provided.'}\n\n`;

    markdown += `## Contract Types\n\n`;
    if (contractTypes.length > 0) {
      for (const contractType of contractTypes) {
        markdown += `### ${contractType.name} (${contractType.kind})\n${contractType.description}\n\n`;
        if (contractType.files && contractType.files.length > 0) {
          markdown += `Files:\n${contractType.files.map((file) => `- ${file}`).join('\n')}\n\n`;
        }
      }
    } else {
      markdown += `No contract types were clearly identified.\n\n`;
    }

    markdown += `## Boundaries\n`;
    markdown +=
      boundaries.length > 0
        ? `${boundaries.map((item) => `- ${item}`).join('\n')}\n\n`
        : 'No explicit contract boundaries identified.\n\n';

    markdown += `## Mapping Patterns\n`;
    markdown +=
      mappingPatterns.length > 0
        ? `${mappingPatterns.map((item) => `- ${item}`).join('\n')}\n\n`
        : 'No mapping patterns identified.\n\n';

    markdown += `## Validation Mechanisms\n`;
    markdown +=
      validationMechanisms.length > 0
        ? `${validationMechanisms.map((item) => `- ${item}`).join('\n')}\n\n`
        : 'No validation mechanisms identified.\n\n';

    markdown += `## Risks\n\n`;
    if (risks.length > 0) {
      for (const risk of risks) {
        markdown += `### ${risk.severity.toUpperCase()} - ${risk.type}\n${risk.description}\n\n`;
        if (risk.files && risk.files.length > 0) {
          markdown += `Files:\n${risk.files.map((file) => `- ${file}`).join('\n')}\n\n`;
        }
        markdown += `Recommendation: ${risk.recommendation}\n\n`;
      }
    } else {
      markdown += `No major contract risks were identified.\n\n`;
    }

    markdown += `## Recommendations\n`;
    markdown +=
      recommendations.length > 0
        ? `${recommendations.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n`
        : '1. Separate transport DTOs from persistence entities where boundaries are currently blurred.\n';

    return markdown;
  }

  protected generateSummary(data: Record<string, unknown>): string {
    return (data.summary as string) || 'Data contract analysis completed';
  }

  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    const markdown = await this.formatMarkdown(data, state);

    return [
      {
        filename: 'data-contracts.md',
        content: markdown,
        title: 'Data Contracts',
        category: 'analysis',
        order: this.getMetadata().priority,
      },
    ];
  }

  private async inspectDataContractFiles(context: AgentContext): Promise<{
    summary: Record<string, number>;
    candidateFiles: string[];
    samples: Array<{ relativePath: string; language: string; content: string }>;
  }> {
    const filePattern =
      /(dto|entity|model|schema|request|response|payload|mapper|mapping|transform|serializer|contract|record)/i;
    const contentPattern =
      /interface\s+\w+|type\s+\w+\s*=|class\s+\w+Dto|class\s+\w+Entity|zod|yup|class-validator|serialize|deserialize|toDto|fromDto|toResponse|fromEntity/i;

    const candidateFiles = context.files.filter((file) => filePattern.test(file)).slice(0, 24);
    const samples = await this.readMatchingFiles(
      context.projectPath,
      candidateFiles,
      contentPattern,
      10,
    );

    return {
      summary: {
        pathMatches: candidateFiles.length,
        sampledMatches: samples.length,
      },
      candidateFiles: candidateFiles.map((file) => path.relative(context.projectPath, file)),
      samples,
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
  ): Promise<Array<{ relativePath: string; language: string; content: string }>> {
    const matches: Array<{ relativePath: string; language: string; content: string }> = [];

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
          language: path.extname(file).replace('.', '') || 'text',
          content: content.substring(0, 1200),
        });
      } catch (error) {
        this.logger.debug('Skipping unreadable data contract file', {
          file,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return matches;
  }
}
