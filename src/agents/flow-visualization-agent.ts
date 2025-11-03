import { Agent } from './agent.interface';
import { AgentContext, AgentMetadata, AgentPriority, AgentFile } from '../types/agent.types';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { LLMJsonParser } from '../utils/json-parser';
import { getSupportedLanguages, getCodeFiles, getComponentFiles } from '../config/language-config';

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
        dependencies: ['file-structure', 'dependency-analyzer'], // Needs structure + dependency graph to trace flows
        supportsIncremental: false,
        estimatedTokens: 10000,
        supportedLanguages: getSupportedLanguages(),
      },
      tags: ['flow', 'control-flow', 'data-flow', 'execution', 'sequence'],
      outputFilename: 'flows.md',
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    // Can execute if there are code files to analyze
    const codeFiles = getCodeFiles(context.files);
    return codeFiles.length > 0;
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    const codeFiles = getCodeFiles(context.files);

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
    const codeFiles = getCodeFiles(context.files);
    const fileCategories = this.categorizeFlowFiles(codeFiles);

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

  // Removed: identifyFlowFiles - now using getCodeFiles() and getComponentFiles() from language-config

  private categorizeFlowFiles(files: string[]): {
    controllers: string[];
    services: string[];
    repositories: string[];
    auth: string[];
    processors: string[];
    modules: string[];
  } {
    return {
      controllers: getComponentFiles(files, 'controllers'),
      services: getComponentFiles(files, 'services'),
      repositories: getComponentFiles(files, 'repositories'),
      auth: files.filter(
        (f) => f.toLowerCase().includes('auth') || f.toLowerCase().includes('guard'),
      ),
      processors: files.filter(
        (f) => f.toLowerCase().includes('processor') || f.toLowerCase().includes('worker'),
      ),
      modules: getComponentFiles(files, 'modules'),
    };
  }

  private parseAnalysisResult(result: string): Record<string, unknown> {
    return LLMJsonParser.parse(result, {
      contextName: 'flow-visualization',
      logErrors: true,
      fallback: {
        flows: [],
        summary: 'Failed to parse flow analysis results',
        warnings: ['Could not parse LLM response as valid JSON'],
      },
    });
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

  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    const markdown = await this.formatMarkdown(data, state);
    const metadata = this.getMetadata();

    return [
      {
        filename: 'flows.md',
        content: markdown,
        title: 'Flow Visualizations',
        category: 'visualization',
        order: metadata.priority,
      },
    ];
  }
}
