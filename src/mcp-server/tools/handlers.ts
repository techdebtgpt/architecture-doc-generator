/**
 * Tool Handlers
 * All tool implementations using factory pattern
 * Reduced from 400+ lines of duplication to ~150 lines
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { ContextualToolHandler } from '../types';
import { DocumentationService } from '../services/documentation.service';
import { VectorStoreService } from '../services/vector-store.service';
import { ConfigService } from '../services/config.service';
import {
  createSelectiveAgentHandler,
  createCheckConfigHandler,
  createSetupConfigHandler,
} from './handler-factory';

/**
 * Handler: check_config
 * Accepts project_path parameter (like CodeWave's repo_path)
 */
export const handleCheckConfig: ContextualToolHandler = async (args, context) => {
  const { project_path } = args as { project_path?: string };
  // Use project_path from args if provided, otherwise use context.projectPath
  const projectPath = project_path || context.projectPath;

  // Call the factory handler with updated context
  const handler = createCheckConfigHandler();
  const updatedContext = {
    ...context,
    projectPath,
  };
  return handler({}, updatedContext);
};

/**
 * Handler: setup_config
 * Accepts project_path parameter (like CodeWave's repo_path)
 */
export const handleSetupConfig: ContextualToolHandler = async (args, context) => {
  const { project_path, ...restArgs } = args as { project_path?: string; [key: string]: any };
  // Use project_path from args if provided, otherwise use context.projectPath
  const updatedContext = {
    ...context,
    projectPath: project_path || context.projectPath,
  };
  const handler = createSetupConfigHandler();
  return handler(restArgs, updatedContext);
};

/**
 * Handler: generate_documentation
 * Accepts project_path parameter (like CodeWave's repo_path)
 */
export const handleGenerateDocumentation: ContextualToolHandler = async (args, context) => {
  const {
    project_path,
    outputDir,
    depth = 'normal',
    focusArea,
    selectiveAgents,
    maxCostDollars = 5.0,
    force = false,
    since,
  } = args;

  try {
    // CodeWave approach: use project_path from args if provided, otherwise context.projectPath
    const projectPath = project_path || context.projectPath;
    try {
      await fs.access(projectPath);
    } catch {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error: Project path does not exist: ${projectPath}`,
          },
        ],
        isError: true,
      };
    }

    // CodeWave approach: load config in handler if needed
    let config = context.config;
    if (!config) {
      try {
        const configService = ConfigService.getInstance();
        config = await configService.initializeConfig(projectPath);
      } catch (error) {
        // Config loading failed
      }
    }

    // Validate config exists and has API keys
    if (!config) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Error: Configuration not found. Please run: archdoc config --init or set environment variables (ANTHROPIC_API_KEY, etc.)',
          },
        ],
        isError: true,
      };
    }

    if (!config.apiKeys || Object.keys(config.apiKeys).length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Error: No API keys configured. Please run: archdoc config --init',
          },
        ],
        isError: true,
      };
    }

    // Note: No pre-scan needed - orchestrator will scan internally (matches CLI approach)
    // This removes redundant scanning and matches CLI behavior where scan happens in orchestrator

    const docService = new DocumentationService(config, projectPath);
    const { output, docsPath } = await docService.generateDocumentation({
      outputDir,
      depth,
      focusArea,
      selectiveAgents,
      maxCostDollars,
      force: force as boolean,
      since: since as string | undefined,
    });

    // Initialize vector store for RAG
    const vectorService = VectorStoreService.getInstance();
    await vectorService.initialize(docsPath);

    const summary = docService.formatOutput(output, { docsPath });

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Specific error handling
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Error: LLM API quota exceeded. Please check your API key limits and try again later.',
          },
        ],
        isError: true,
      };
    }

    if (errorMessage.includes('ENOSPC')) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Error: Disk space full. Cannot write documentation files.',
          },
        ],
        isError: true,
      };
    }

    if (errorMessage.includes('EACCES') || errorMessage.includes('EPERM')) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Error: Permission denied. Check write permissions for the output directory.',
          },
        ],
        isError: true,
      };
    }

    context.logger.error('Documentation generation failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
};

/**
 * Handler: query_documentation
 * Accepts project_path parameter (like CodeWave's repo_path)
 */
export const handleQueryDocumentation: ContextualToolHandler = async (args, context) => {
  const {
    project_path,
    question,
    topK = 5,
  } = args as { project_path?: string; question: string; topK?: number };
  // Use project_path from args if provided, otherwise use context.projectPath
  const projectPath = project_path || context.projectPath;
  const docsPath = path.join(projectPath, '.arch-docs');

  try {
    const vectorService = VectorStoreService.getInstance();

    // Initialize vector store if not already loaded
    if (!vectorService.isReady()) {
      await vectorService.initialize(docsPath);
    }

    // Try vector search first
    if (vectorService.isReady()) {
      const results = await vectorService.query(question, topK);

      let answer = `🔍 **Question**: ${question}\n\n`;
      answer += `📚 **Relevant Documentation** (${results.length} sections):\n\n`;

      for (const result of results) {
        answer += `### ${result.file} (score: ${(result.score * 100).toFixed(1)}%)\n\n`;
        answer += `${result.content.substring(0, 1000)}${result.content.length > 1000 ? '...' : ''}\n\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text: answer,
          },
        ],
      };
    }

    // Fallback: Read all docs
    if (!context.config) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Error: Configuration not found. Please run: archdoc config --init or set environment variables (ANTHROPIC_API_KEY, etc.)',
          },
        ],
        isError: true,
      };
    }
    const docService = new DocumentationService(context.config, projectPath);
    const allContent = await docService.readDocumentationFallback(docsPath);

    return {
      content: [
        {
          type: 'text',
          text: `📄 Documentation Content:\n\n${allContent.substring(0, 5000)}...\n\n⚠️ Note: Vector search not available, showing full docs instead.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

/**
 * Handler: update_documentation
 * Accepts project_path parameter (like CodeWave's repo_path)
 */
export const handleUpdateDocumentation: ContextualToolHandler = async (args, context) => {
  const { project_path, prompt, existingDocsPath } = args as {
    project_path?: string;
    prompt: string;
    existingDocsPath?: string;
  };
  // Use project_path from args if provided, otherwise use context.projectPath
  const projectPath = project_path || context.projectPath;

  try {
    if (!context.config) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Error: Configuration not found. Please run: archdoc config --init or set environment variables (ANTHROPIC_API_KEY, etc.)',
          },
        ],
        isError: true,
      };
    }
    const docService = new DocumentationService(context.config, projectPath);
    const { output, docsPath } = await docService.updateDocumentation({
      prompt,
      existingDocsPath,
    });

    // Reload vector store
    const vectorService = VectorStoreService.getInstance();
    await vectorService.initialize(docsPath);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Documentation updated!\n\n**Focus**: ${prompt}\n**Agents**: ${output.metadata.agentsExecuted?.join(', ')}\n**Tokens**: ${output.metadata.totalTokensUsed?.toLocaleString()}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

/**
 * Handler: check_architecture_patterns
 * Uses factory for selective agent pattern
 */
export const handleCheckPatterns = createSelectiveAgentHandler(
  ['pattern-detector'],
  'Detect design patterns',
);

/**
 * Handler: analyze_dependencies
 * Uses factory for selective agent pattern
 */
export const handleAnalyzeDependencies = createSelectiveAgentHandler(
  ['dependency-analyzer'],
  'Analyze project dependencies',
);

/**
 * Handler: get_recommendations
 * Uses factory for selective agent pattern
 */
export const handleGetRecommendations = createSelectiveAgentHandler(
  // There is no dedicated "recommendation-engine" agent in this repo.
  // Instead, run the agents that emit recommendations and let the orchestrator
  // synthesize `recommendations.md` (custom section key: "recommendations").
  [
    'architecture-analyzer',
    'file-structure',
    'dependency-analyzer',
    'pattern-detector',
    'flow-visualization',
    'schema-generator',
    'security-analyzer',
    'kpi-analyzer',
  ],
  'Generate prioritized recommendations',
);

/**
 * Handler: validate_architecture
 * Accepts project_path parameter (like CodeWave's repo_path)
 */
export const handleValidateArchitecture: ContextualToolHandler = async (args, context) => {
  // Keep schema validation responsibility with registry/types; currently not implemented.
  // (Avoid unused variables while still accepting the args shape.)
  void args;
  void context;

  try {
    // CLI does not have a first-class "architecture validation" command in this repo,
    // and there is no `architecture-validator` agent registered.
    // Returning a hard error is better than silently reporting success with no output.
    return {
      content: [
        {
          type: 'text',
          text:
            '❌ validate_architecture is not implemented yet in this MCP server (no architecture-validator agent exists). ' +
            'Use generate_documentation (optionally with selectiveAgents) and review the generated docs for architectural constraints.',
        },
      ],
      isError: true,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

/**
 * Map tool names to handlers
 */
export const TOOL_HANDLERS: Record<string, ContextualToolHandler> = {
  check_config: handleCheckConfig,
  setup_config: handleSetupConfig,
  generate_documentation: handleGenerateDocumentation,
  query_documentation: handleQueryDocumentation,
  update_documentation: handleUpdateDocumentation,
  check_architecture_patterns: handleCheckPatterns,
  analyze_dependencies: handleAnalyzeDependencies,
  get_recommendations: handleGetRecommendations,
  validate_architecture: handleValidateArchitecture,
};

/**
 * Get handler for a tool
 */
export function getToolHandler(toolName: string): ContextualToolHandler | undefined {
  return TOOL_HANDLERS[toolName];
}
