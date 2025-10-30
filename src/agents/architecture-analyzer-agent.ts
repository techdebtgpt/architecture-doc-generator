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
 * Architectural styles
 */
export enum ArchitecturalStyle {
  MONOLITHIC = 'monolithic',
  MICROSERVICES = 'microservices',
  LAYERED = 'layered',
  EVENT_DRIVEN = 'event-driven',
  HEXAGONAL = 'hexagonal',
  SERVERLESS = 'serverless',
  MODULAR_MONOLITH = 'modular-monolith',
}

/**
 * Component information
 */
export interface ComponentInfo {
  name: string;
  type: string;
  description: string;
  responsibilities: string[];
  dependencies: string[];
  technologies: string[];
}

/**
 * Architecture analysis result
 */
export interface ArchitectureAnalysis {
  style: ArchitecturalStyle;
  components: ComponentInfo[];
  layers: string[];
  integrations: string[];
  diagram: string; // Mermaid C4 or component diagram
  insights: string[];
  summary: string;
  warnings: string[];
}

/**
 * Agent that analyzes high-level system architecture, components, and architectural patterns
 * Uses self-refinement workflow to iteratively improve architecture analysis
 */
export class ArchitectureAnalyzerAgent extends BaseAgentWorkflow implements Agent {
  public getMetadata(): AgentMetadata {
    return {
      name: 'architecture-analyzer',
      version: '1.0.0',
      description:
        'Analyzes high-level system architecture, identifies architectural style, maps system components, layers, and generates C4/component diagrams',
      priority: AgentPriority.HIGH, // High priority - foundational understanding
      capabilities: {
        supportsParallel: true,
        requiresFileContents: false, // Works with file paths and structure
        dependencies: ['file-structure'], // Benefits from file structure analysis
        supportsIncremental: false,
        estimatedTokens: 12000,
        supportedLanguages: ['typescript', 'javascript', 'java', 'python', 'csharp', 'go'],
      },
      tags: ['architecture', 'components', 'layers', 'c4', 'system-design', 'high-level'],
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    // Can execute on any project with source files
    const sourceFiles = context.files.filter((f) => /\.(ts|js|tsx|jsx|java|py|cs|go)$/.test(f));
    return sourceFiles.length > 10; // Need minimum project size for meaningful analysis
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    const sourceFiles = context.files.filter((f) => /\.(ts|js|tsx|jsx|java|py|cs|go)$/.test(f));

    // Base cost + scaling with project size
    const fileCount = Math.min(sourceFiles.length, 200);
    return 5000 + fileCount * 35;
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
      clarityThreshold: 85, // High bar ensures comprehensive architecture analysis
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
    return 'architecture-analyzer';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert software architect specializing in system architecture analysis and documentation.

Analyze the provided codebase and identify:

1. **Architectural Style**: Monolithic, microservices, layered, event-driven, hexagonal, serverless, modular monolith
2. **System Components**: Major modules, services, layers with their responsibilities
3. **Architectural Layers**: Presentation, business logic, data access, infrastructure
4. **Integration Points**: APIs, message queues, databases, external services
5. **Component Diagram**: Mermaid C4 or component diagram showing relationships

**Output Format (JSON)**:
\`\`\`json
{
  "summary": "High-level architecture overview",
  "style": "microservices",
  "components": [
    {
      "name": "ComponentName",
      "type": "service|module|layer",
      "description": "Component purpose",
      "responsibilities": ["Responsibility 1", "Responsibility 2"],
      "dependencies": ["Dependency1", "Dependency2"],
      "technologies": ["Tech1", "Tech2"]
    }
  ],
  "layers": ["Presentation", "Business Logic", "Data Access", "Infrastructure"],
  "integrations": ["REST API", "Database", "Message Queue"],
  "diagram": "graph TD\\n  A[Component] --> B[Component]",
  "insights": ["Key architectural insight 1", "Key insight 2"],
  "warnings": ["Potential architectural concern 1"]
}
\`\`\`

**Mermaid Syntax**:
- Use \`graph TD\` for component diagrams
- Use \`C4Context\` or \`C4Component\` for C4 diagrams
- Show clear component boundaries and dependencies

Provide **comprehensive architectural analysis** with actionable insights.`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const projectStructure = this.analyzeProjectStructure(context.files);

    // Limit file lists to avoid token overflow for large projects
    const summarizeFileList = (files: string[], limit = 20): string => {
      if (files.length === 0) return 'None';
      if (files.length <= limit) {
        return files.map((f) => `  - ${f}`).join('\n');
      }
      const shown = files.slice(0, limit);
      return (
        shown.map((f) => `  - ${f}`).join('\n') + `\n  ... and ${files.length - limit} more files`
      );
    };

    return `Analyze the architecture of this system:

**Project**: ${context.projectPath}
**Total Files**: ${context.files.length}
**Languages**: ${context.languageHints.map((lh) => lh.language).join(', ')}

**Project Structure Summary**:

**Modules** (${projectStructure.modules.length}):
${summarizeFileList(projectStructure.modules, 15)}

**Controllers** (${projectStructure.controllers.length}):
${summarizeFileList(projectStructure.controllers, 10)}

**Services** (${projectStructure.services.length}):
${summarizeFileList(projectStructure.services, 15)}

**Repositories** (${projectStructure.repositories.length}):
${summarizeFileList(projectStructure.repositories, 10)}

**Models/Entities** (${projectStructure.models.length}):
${summarizeFileList(projectStructure.models, 10)}

**Configuration** (${projectStructure.configs.length}):
${summarizeFileList(projectStructure.configs, 5)}

**Middleware** (${projectStructure.middleware.length}):
${summarizeFileList(projectStructure.middleware, 5)}

**Routes/Endpoints** (${projectStructure.routes.length}):
${summarizeFileList(projectStructure.routes, 10)}

**External Integrations** (${projectStructure.external.length}):
${summarizeFileList(projectStructure.external, 10)}

**Tests** (${projectStructure.tests.length}):
${summarizeFileList(projectStructure.tests, 5)}

Based on this structure, identify the architectural style, major components, layers, and create a comprehensive component diagram.`;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    const result = this.parseAnalysisResult(analysis);
    return result as unknown as Record<string, unknown>;
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: { context: unknown },
  ): Promise<string> {
    return this.formatMarkdownReport(data as unknown as ArchitectureAnalysis);
  }

  protected generateSummary(data: Record<string, unknown>): string {
    const summary = data.summary as string | undefined;
    return summary || 'Architecture analysis completed';
  }

  private analyzeProjectStructure(files: string[]): {
    modules: string[];
    controllers: string[];
    services: string[];
    repositories: string[];
    models: string[];
    configs: string[];
    middleware: string[];
    routes: string[];
    external: string[];
    tests: string[];
  } {
    const categorized = {
      modules: [] as string[],
      controllers: [] as string[],
      services: [] as string[],
      repositories: [] as string[],
      models: [] as string[],
      configs: [] as string[],
      middleware: [] as string[],
      routes: [] as string[],
      external: [] as string[],
      tests: [] as string[],
    };

    for (const file of files) {
      const lower = file.toLowerCase();

      if (lower.includes('test') || lower.includes('spec')) {
        categorized.tests.push(file);
      } else if (lower.includes('module')) {
        categorized.modules.push(file);
      } else if (lower.includes('controller')) {
        categorized.controllers.push(file);
      } else if (lower.includes('service')) {
        categorized.services.push(file);
      } else if (lower.includes('repository') || lower.includes('repo.') || lower.includes('dao')) {
        categorized.repositories.push(file);
      } else if (lower.includes('model') || lower.includes('entity') || lower.includes('schema')) {
        categorized.models.push(file);
      } else if (lower.includes('config') || lower.includes('settings') || lower.includes('.env')) {
        categorized.configs.push(file);
      } else if (lower.includes('middleware') || lower.includes('interceptor')) {
        categorized.middleware.push(file);
      } else if (
        lower.includes('route') ||
        lower.includes('router') ||
        lower.includes('endpoint')
      ) {
        categorized.routes.push(file);
      } else if (lower.includes('client') || lower.includes('adapter') || lower.includes('api/')) {
        categorized.external.push(file);
      }
    }

    return categorized;
  }

  private parseAnalysisResult(result: string): ArchitectureAnalysis {
    try {
      // Try to extract JSON from the result
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          style: parsed.style || ArchitecturalStyle.MONOLITHIC,
          components: parsed.components || [],
          layers: parsed.layers || [],
          integrations: parsed.integrations || [],
          diagram: parsed.diagram || '',
          insights: parsed.insights || [],
          summary: parsed.summary || 'Architecture analysis completed',
          warnings: parsed.warnings || [],
        };
      }
    } catch (error) {
      // Fallback to basic analysis
      this.logger.debug('Failed to parse architecture analysis result', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      style: ArchitecturalStyle.MONOLITHIC,
      components: [],
      layers: [],
      integrations: [],
      diagram: '',
      insights: [],
      summary: 'Unable to parse architecture analysis - LLM output format error',
      warnings: ['Failed to parse architecture analysis JSON'],
    };
  }

  private formatMarkdownReport(analysis: ArchitectureAnalysis): string {
    let report = `# ${analysis.summary}\n\n`;
    report += `[← Back to Index](./index.md)\n\n`;
    report += `---\n\n`;

    report += `# 🏗️ System Architecture\n\n`;
    report += `## Overview\n\n`;
    report += `${analysis.summary}\n\n`;

    report += `## Architectural Style\n\n`;
    report += `**Style**: ${analysis.style}\n\n`;

    if (analysis.layers.length > 0) {
      report += `## System Layers\n\n`;
      analysis.layers.forEach((layer, index) => {
        report += `${index + 1}. ${layer}\n`;
      });
      report += `\n`;
    }

    if (analysis.components.length > 0) {
      report += `## Main Components\n\n`;
      analysis.components.forEach((comp) => {
        report += `### ${comp.name}\n\n`;
        report += `**Type**: ${comp.type}\n\n`;
        report += `${comp.description}\n\n`;

        if (comp.responsibilities.length > 0) {
          report += `**Responsibilities**:\n`;
          comp.responsibilities.forEach((resp) => {
            report += `- ${resp}\n`;
          });
          report += `\n`;
        }

        if (comp.dependencies.length > 0) {
          report += `**Dependencies**: ${comp.dependencies.join(', ')}\n\n`;
        }

        if (comp.technologies.length > 0) {
          report += `**Technologies**: ${comp.technologies.join(', ')}\n\n`;
        }
      });
    }

    if (analysis.integrations.length > 0) {
      report += `## External Integrations\n\n`;
      analysis.integrations.forEach((integration) => {
        report += `- ${integration}\n`;
      });
      report += `\n`;
    }

    if (analysis.diagram) {
      report += `## Architecture Diagram\n\n`;
      report += `\`\`\`mermaid\n${analysis.diagram}\n\`\`\`\n\n`;
    }

    if (analysis.insights.length > 0) {
      report += `## 💡 Key Insights\n\n`;
      analysis.insights.forEach((insight, index) => {
        report += `${index + 1}. ${insight}\n`;
      });
      report += `\n`;
    }

    if (analysis.warnings.length > 0) {
      report += `## ⚠️ Architectural Concerns\n\n`;
      analysis.warnings.forEach((warning) => {
        report += `- ${warning}\n`;
      });
      report += `\n`;
    }

    report += `## Metadata\n\n`;
    report += `\`\`\`json\n`;
    report += JSON.stringify(this.getMetadata(), null, 2);
    report += `\n\`\`\`\n\n`;

    report += `---\n\n`;
    report += `_Generated by ${this.getMetadata().version} on ${new Date().toISOString()}_\n`;

    return report;
  }
}
