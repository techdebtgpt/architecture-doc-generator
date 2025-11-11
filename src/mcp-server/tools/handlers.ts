/**
 * Tool Handlers
 * All tool implementations using factory pattern
 * Reduced from 400+ lines of duplication to ~150 lines
 */

import * as path from 'path';
import { ContextualToolHandler } from '../types';
import { DocumentationService } from '../services/documentation.service';
import { VectorStoreService } from '../services/vector-store.service';
import {
  createSelectiveAgentHandler,
  createCheckConfigHandler,
  createSetupConfigHandler,
} from './handler-factory';

/**
 * Handler: check_config
 */
export const handleCheckConfig = createCheckConfigHandler();

/**
 * Handler: setup_config
 */
export const handleSetupConfig = createSetupConfigHandler();

/**
 * Handler: generate_documentation
 */
export const handleGenerateDocumentation: ContextualToolHandler = async (args, context) => {
  const { outputDir, depth = 'normal', focusArea, selectiveAgents, maxCostDollars = 5.0 } = args;

  try {
    const docService = new DocumentationService(context.config, context.projectPath);
    const { output, docsPath } = await docService.generateDocumentation({
      outputDir,
      depth,
      focusArea,
      selectiveAgents,
      maxCostDollars,
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
 * Handler: query_documentation
 */
export const handleQueryDocumentation: ContextualToolHandler = async (args, context) => {
  const { question, topK = 5 } = args;
  const docsPath = path.join(context.projectPath, '.arch-docs');

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
    const docService = new DocumentationService(context.config, context.projectPath);
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
 */
export const handleUpdateDocumentation: ContextualToolHandler = async (args, context) => {
  const { prompt, existingDocsPath } = args;

  try {
    const docService = new DocumentationService(context.config, context.projectPath);
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
  ['recommendation-engine'],
  'Provide recommendations',
);

/**
 * Handler: validate_architecture
 */
export const handleValidateArchitecture: ContextualToolHandler = async (args, context) => {
  const { filePath } = args;

  try {
    const docService = new DocumentationService(context.config, context.projectPath);
    const output = await docService.runSelectiveAgents({
      selectiveAgents: ['architecture-validator'],
      userPrompt: `Validate file: ${filePath}`,
    });

    const valSection = output.customSections.get('architecture-validator') as any;

    if (!valSection) {
      return {
        content: [
          {
            type: 'text',
            text: '⚠️ No validation performed',
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: valSection.content || valSection.markdown || 'No validation data available',
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
