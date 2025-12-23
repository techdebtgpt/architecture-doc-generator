import { Agent } from './agent.interface';
import {
  AgentContext,
  AgentMetadata,
  AgentPriority,
  AgentFile,
  ArchitectureAnalysis,
  ArchitecturalStyle,
} from '../types/agent.types';
import { MarkdownRenderer } from '../services/markdown-renderer.service';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { LLMJsonParser } from '../utils/json-parser';
import {
  getSupportedLanguages,
  getCodeFiles,
  getComponentFiles,
  getSchemaFiles,
} from '../config/language-config';

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
        dependencies: [
          'file-structure',
          'dependency-analyzer',
          'schema-generator',
          'pattern-detector',
          'flow-visualization',
          'security-analyzer',
        ], // Synthesizes insights from ALL other agents
        supportsIncremental: false,
        estimatedTokens: 12000,
        supportedLanguages: getSupportedLanguages(),
      },
      tags: ['architecture', 'components', 'layers', 'c4', 'system-design', 'high-level'],
      outputFilename: 'architecture.md',
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    // Can execute on any project with source files (uses centralized language config)
    const sourceFiles = getCodeFiles(context.files);
    return sourceFiles.length > 0; // Can analyze any project with source files
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    // Use centralized code file detection across all languages
    const sourceFiles = getCodeFiles(context.files);

    // Base cost + scaling with project size
    const fileCount = Math.min(sourceFiles.length, 200);
    return 5000 + fileCount * 35;
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

Provide **comprehensive architectural analysis** with actionable insights.

${this.getResponseLengthGuidance(_context)}

CRITICAL: You MUST respond with ONLY valid JSON matching the exact schema above. Do NOT include markdown formatting, explanations, or any text outside the JSON object. Start your response with { and end with }.`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const projectStructure = this.analyzeProjectStructure(context.files);

    // Step 1: Quick architectural style detection to determine relevant components
    const architectureHint = await this.detectArchitectureStyle(context, projectStructure);

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

    // Step 2: Get architecture-specific component categories
    const relevantCategories = this.getRelevantCategories(architectureHint, projectStructure);

    const structureSummary = relevantCategories
      .filter((cat) => cat.files.length > 0) // Only include non-empty categories
      .map(
        (cat) =>
          `**${cat.name}** (${cat.files.length}):\n${summarizeFileList(cat.files, cat.limit)}`,
      )
      .join('\n\n');

    return `Analyze the architecture of this system:

**Project**: ${context.projectPath}
**Total Files**: ${context.files.length}
**Languages**: ${context.languageHints.map((lh) => lh.language).join(', ')}
**Detected Architecture Style**: ${architectureHint}

**Project Structure Summary**:

${structureSummary}

Based on this structure, identify the architectural style, major components, layers, and create a comprehensive component diagram.`;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    const result = this.parseAnalysisResult(analysis);
    return result as unknown as Record<string, unknown>;
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: typeof AgentWorkflowState.State,
  ): Promise<string> {
    return MarkdownRenderer.getInstance().render(this.getAgentName(), data);
  }

  protected generateSummary(data: Record<string, unknown>): string {
    const summary = data.summary as string | undefined;
    return summary || 'Architecture analysis completed';
  }

  /**
   * Quick LLM-based architecture style detection to guide component categorization
   */
  private async detectArchitectureStyle(
    context: AgentContext,
    structure: ReturnType<typeof this.analyzeProjectStructure>,
  ): Promise<string> {
    const model = this.llmService.getChatModel({ temperature: 0.1, maxTokens: 100 });

    const prompt = `Based on this project structure, identify the most likely architectural style in ONE WORD:

Project: ${context.projectPath}
Languages: ${context.languageHints.map((lh) => lh.language).join(', ')}
Files: ${context.files.length} total

Components found:
- Modules: ${structure.modules.length}
- Controllers: ${structure.controllers.length}
- Services: ${structure.services.length}
- Repositories: ${structure.repositories.length}
- Models: ${structure.models.length}
- Middleware: ${structure.middleware.length}
- Routes: ${structure.routes.length}

Respond with ONE WORD only: monolithic, microservices, layered, event-driven, hexagonal, serverless, or modular-monolith`;

    try {
      const response = await model.invoke(prompt);
      const content = typeof response.content === 'string' ? response.content : '';
      const style = content.trim().toLowerCase();

      // Validate response
      const validStyles = [
        'monolithic',
        'microservices',
        'layered',
        'event-driven',
        'hexagonal',
        'serverless',
        'modular-monolith',
      ];
      return validStyles.includes(style) ? style : 'layered'; // Default to layered
    } catch (error) {
      this.logger.debug('Failed to detect architecture style', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 'layered'; // Safe default
    }
  }

  /**
   * Get component categories relevant to the detected architecture
   */
  private getRelevantCategories(
    architectureStyle: string,
    structure: ReturnType<typeof this.analyzeProjectStructure>,
  ): Array<{ name: string; files: string[]; limit: number }> {
    const allCategories = {
      modules: { name: 'Modules', files: structure.modules, limit: 15 },
      controllers: { name: 'Controllers', files: structure.controllers, limit: 10 },
      services: { name: 'Services', files: structure.services, limit: 15 },
      repositories: { name: 'Repositories', files: structure.repositories, limit: 10 },
      models: { name: 'Models/Entities', files: structure.models, limit: 10 },
      configs: { name: 'Configuration', files: structure.configs, limit: 5 },
      middleware: { name: 'Middleware', files: structure.middleware, limit: 5 },
      routes: { name: 'Routes/Endpoints', files: structure.routes, limit: 10 },
      external: { name: 'External Integrations', files: structure.external, limit: 10 },
      tests: { name: 'Tests', files: structure.tests, limit: 5 },
    };

    // Architecture-specific category prioritization
    const architectureMap: Record<string, Array<keyof typeof allCategories>> = {
      microservices: ['services', 'external', 'configs', 'routes', 'models', 'tests'],
      serverless: ['services', 'external', 'configs', 'models', 'tests'],
      layered: [
        'controllers',
        'services',
        'repositories',
        'models',
        'middleware',
        'routes',
        'configs',
        'tests',
      ],
      'event-driven': ['services', 'external', 'middleware', 'models', 'configs', 'tests'],
      hexagonal: ['services', 'repositories', 'external', 'models', 'configs', 'tests'],
      monolithic: [
        'modules',
        'controllers',
        'services',
        'repositories',
        'models',
        'middleware',
        'routes',
        'configs',
        'external',
        'tests',
      ],
      'modular-monolith': ['modules', 'services', 'repositories', 'models', 'configs', 'tests'],
    };

    const relevantKeys = architectureMap[architectureStyle] || Object.keys(allCategories);

    return relevantKeys
      .map((key) => allCategories[key as keyof typeof allCategories])
      .filter((cat) => cat !== undefined);
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
    // Use centralized language config for component detection
    const schemas = getSchemaFiles(files);

    return {
      modules: getComponentFiles(files, 'modules'),
      controllers: getComponentFiles(files, 'controllers'),
      services: getComponentFiles(files, 'services'),
      repositories: getComponentFiles(files, 'repositories'),
      models: schemas.models, // Models/schemas/entities from language config
      configs: schemas.configs, // Config files from language config
      middleware: getComponentFiles(files, 'middleware'),
      routes: getComponentFiles(files, 'routes'),
      external: files.filter((f) => {
        const lower = f.toLowerCase();
        return lower.includes('client') || lower.includes('adapter') || lower.includes('api/');
      }),
      tests: getComponentFiles(files, 'tests'),
    };
  }

  private parseAnalysisResult(result: string): ArchitectureAnalysis {
    const parsed = LLMJsonParser.parse<Partial<ArchitectureAnalysis>>(result, {
      contextName: 'architecture-analyzer',
      logErrors: true,
      fallback: {},
    });

    return {
      style: parsed.style || ArchitecturalStyle.MONOLITHIC,
      components: parsed.components || [],
      layers: parsed.layers || [],
      integrations: parsed.integrations || [],
      diagram: parsed.diagram || '',
      insights: parsed.insights || [],
      summary: parsed.summary || 'Unable to parse architecture analysis - LLM output format error',
      warnings: parsed.warnings || ['Failed to parse architecture analysis JSON'],
    };
  }

  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    const markdown = await this.formatMarkdown(data, state);
    const metadata = this.getMetadata();

    return [
      {
        filename: 'architecture.md',
        content: markdown,
        title: 'Architecture Analysis',
        category: 'architecture',
        order: metadata.priority,
      },
    ];
  }
}
