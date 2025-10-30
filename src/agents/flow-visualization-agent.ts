import { Agent } from './agent.interface';
import {
  AgentContext,
  AgentResult,
  AgentMetadata,
  AgentPriority,
  AgentExecutionOptions,
} from '../types/agent.types';
import { BaseAgentWorkflow } from './base-agent-workflow';

/**
 * Flow types that can be visualized
 */
export enum FlowType {
  DATA_FLOW = 'data-flow',
  PROCESS_FLOW = 'process-flow',
  AUTHENTICATION_FLOW = 'authentication-flow',
  API_FLOW = 'api-flow',
  COMPONENT_FLOW = 'component-flow',
}

/**
 * Flow visualization result
 */
export interface FlowVisualization {
  type: FlowType;
  title: string;
  description: string;
  diagram: string; // Mermaid syntax
  insights: string[];
}

/**
 * Agent that analyzes and visualizes data flows, process flows, and component interactions
 * Uses self-refinement workflow to iteratively improve flow diagrams
 */
export class FlowVisualizationAgent extends BaseAgentWorkflow implements Agent {
  public getMetadata(): AgentMetadata {
    return {
      name: 'flow-visualization',
      version: '1.0.0',
      description:
        'Analyzes and visualizes data flows, process flows, authentication flows, and component interactions using Mermaid diagrams',
      priority: AgentPriority.MEDIUM,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: true,
        dependencies: ['file-structure'],
        supportsIncremental: false,
        estimatedTokens: 8000,
        supportedLanguages: ['typescript', 'javascript', 'java', 'python', 'csharp'],
      },
      tags: ['flow', 'visualization', 'mermaid', 'architecture', 'diagrams'],
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    // Can execute if there are code files to analyze
    const codeFiles = context.files.filter((f) => /\.(ts|js|tsx|jsx|java|py|cs)$/.test(f));
    return codeFiles.length > 0;
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    const codeFiles = context.files.filter((f) => /\.(ts|js|tsx|jsx|java|py|cs)$/.test(f));

    // Estimate tokens based on files that might contain flows
    const flowRelevantFiles = codeFiles.filter(
      (f) =>
        f.includes('controller') ||
        f.includes('service') ||
        f.includes('repository') ||
        f.includes('processor') ||
        f.includes('handler') ||
        f.includes('guard') ||
        f.includes('auth') ||
        f.includes('middleware'),
    );

    // Base cost + per flow analysis
    return 3000 + Math.min(flowRelevantFiles.length, 20) * 400;
  }

  public async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    // Configure adaptive refinement workflow
    // Agent will refine until clarity score >= 85 (high bar for quality)
    // Not hardcoded iterations - agent self-determines completion
    const workflowConfig = {
      maxIterations: 10, // High limit - agent decides when satisfied
      clarityThreshold: 85, // High bar ensures comprehensive flow visualization
      minImprovement: 3, // Accept small incremental improvements
      enableSelfQuestioning: true,
      maxQuestionsPerIteration: 2, // Focused, specific questions
    };

    return this.executeWorkflow(
      context,
      workflowConfig,
      options?.runnableConfig as Record<string, unknown> | undefined,
    );
  }

  // Abstract method implementations

  protected getAgentName(): string {
    return 'flow-visualization';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert software architect specializing in flow visualization and process mapping.

Analyze the provided codebase and create **Mermaid diagrams** for:

1. **Data Flows**: How data moves through the system
2. **Process Flows**: Business logic and workflow sequences
3. **Authentication Flows**: Login, authorization, token management
4. **API Flows**: Request/response cycles, middleware chains
5. **Component Flows**: Interaction between major components

**Output Format (JSON)**:
\`\`\`json
{
  "summary": "Brief overview of flows detected",
  "flows": [
    {
      "type": "data-flow|process-flow|authentication-flow|api-flow|component-flow",
      "title": "Flow Name",
      "description": "What this flow represents",
      "diagram": "graph TD\\n  A[Start] --> B[Step]\\n  B --> C[End]",
      "insights": ["Key insight 1", "Key insight 2"]
    }
  ],
  "warnings": ["Any limitations or notes"]
}
\`\`\`

**Mermaid Syntax**:
- Use \`graph TD\` for top-down flowcharts
- Use \`sequenceDiagram\` for interactions
- Keep diagrams focused and readable (max 10-15 nodes per diagram)
- Use descriptive node labels

Provide **actionable, visual insights** with valid Mermaid syntax.`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const flowFiles = this.identifyFlowFiles(context.files);
    const fileCategories = this.categorizeFlowFiles(flowFiles);

    return `Analyze flows in this project:

**Project**: ${context.projectPath}
**Languages**: ${context.languageHints.map((h) => h.language).join(', ')}

**Flow-Relevant Files**:
- Controllers: ${fileCategories.controllers.length}
- Services: ${fileCategories.services.length}
- Repositories: ${fileCategories.repositories.length}
- Auth: ${fileCategories.auth.length}
- Processors: ${fileCategories.processors.length}
- Modules: ${fileCategories.modules.length}

**Sample Files**:
${Object.entries(fileCategories)
  .map(([category, files]) => `${category}: ${files.slice(0, 3).join(', ')}`)
  .join('\n')}

Create Mermaid diagrams for the most important flows in this system.`;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    return this.parseAnalysisResult(analysis);
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: { context: unknown },
  ): Promise<string> {
    return this.formatMarkdownReport(data);
  }

  protected generateSummary(data: Record<string, unknown>): string {
    const summary = data.summary as string | undefined;
    return summary || 'Flow visualization completed';
  }

  private identifyFlowFiles(files: string[]): string[] {
    return files.filter((f) => {
      const lower = f.toLowerCase();
      return (
        /\.(ts|js|tsx|jsx)$/.test(f) &&
        (lower.includes('controller') ||
          lower.includes('service') ||
          lower.includes('repository') ||
          lower.includes('processor') ||
          lower.includes('handler') ||
          lower.includes('guard') ||
          lower.includes('auth') ||
          lower.includes('middleware') ||
          lower.includes('module') ||
          lower.includes('gateway') ||
          lower.includes('worker'))
      );
    });
  }

  private categorizeFlowFiles(files: string[]): {
    controllers: string[];
    services: string[];
    repositories: string[];
    auth: string[];
    processors: string[];
    modules: string[];
  } {
    return {
      controllers: files.filter((f) => f.toLowerCase().includes('controller')),
      services: files.filter((f) => f.toLowerCase().includes('service')),
      repositories: files.filter((f) => f.toLowerCase().includes('repository')),
      auth: files.filter(
        (f) => f.toLowerCase().includes('auth') || f.toLowerCase().includes('guard'),
      ),
      processors: files.filter(
        (f) => f.toLowerCase().includes('processor') || f.toLowerCase().includes('worker'),
      ),
      modules: files.filter((f) => f.toLowerCase().includes('module')),
    };
  }

  private parseAnalysisResult(result: string): Record<string, unknown> {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to parse as direct JSON
      return JSON.parse(result);
    } catch (error) {
      // Fallback: return a basic structure
      this.logger.warn('Failed to parse flow analysis result', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        flows: [],
        summary: 'Failed to parse flow analysis results',
        warnings: ['Could not parse LLM response as valid JSON'],
      };
    }
  }

  private formatMarkdownReport(analysis: Record<string, unknown>): string {
    // Type-safe accessors
    const summary = analysis.summary as string | undefined;
    const flows = analysis.flows as FlowVisualization[] | undefined;
    const warnings = analysis.warnings as string[] | undefined;

    let markdown = `# Flow Visualizations\n\n`;
    markdown += `${summary || 'Flow visualization analysis completed'}\n\n`;

    if (flows && flows.length > 0) {
      markdown += `## Identified Flows\n\n`;

      for (const flow of flows) {
        markdown += `### ${flow.title}\n\n`;
        markdown += `**Type**: ${flow.type}\n\n`;
        markdown += `${flow.description}\n\n`;

        markdown += `#### Diagram\n\n`;
        markdown += `\`\`\`mermaid\n${flow.diagram}\n\`\`\`\n\n`;

        if (flow.insights && flow.insights.length > 0) {
          markdown += `#### Key Insights\n\n`;
          flow.insights.forEach((insight: string) => {
            markdown += `- ${insight}\n`;
          });
          markdown += `\n`;
        }
      }
    } else {
      markdown += `_No flows identified in the codebase._\n\n`;
    }

    if (warnings && warnings.length > 0) {
      markdown += `## Warnings\n\n`;
      warnings.forEach((warning: string) => {
        markdown += `- ⚠️ ${warning}\n`;
      });
      markdown += `\n`;
    }

    return markdown;
  }
}
