#!/usr/bin/env node

/**
 * MCP Server for Architecture Documentation Generator
 * Provides tools for Copilot/Claude to query and generate architecture documentation
 */

import { loadArchDocConfig } from '../utils/config-loader';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DocumentationOrchestrator } from '../orchestrator/documentation-orchestrator';
import { AgentRegistry } from '../agents/agent-registry';
import { FileSystemScanner } from '../scanners/file-system-scanner';
import { MultiFileMarkdownFormatter } from '../formatters/multi-file-markdown-formatter';
import { Logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs/promises';

// Initialize logger
const logger = new Logger('MCP-Server');

// Vector store for documentation RAG
let documentationVectorStore: {
  query: (
    question: string,
    topK?: number,
  ) => Promise<{ content: string; file: string; score: number }[]>;
  reload: (docsPath: string) => Promise<void>;
} | null = null;

/**
 * Initialize vector store for documentation RAG
 */
async function initializeDocumentationVectorStore(docsPath: string) {
  logger.info('Initializing documentation vector store for RAG...');

  try {
    const { VectorSearchService } = await import('../services/vector-search.service');

    // Load all markdown files from documentation
    const files = await fs.readdir(docsPath);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    const documents: { content: string; path: string; metadata: Record<string, unknown> }[] = [];

    for (const file of mdFiles) {
      const filePath = path.join(docsPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      documents.push({
        content,
        path: filePath,
        metadata: {
          filename: file,
          type: 'documentation',
          section: file.replace('.md', ''),
        },
      });
    }

    // Create in-memory vector store
    const vectorService = new VectorSearchService(docsPath, null as any, {
      provider: 'local', // Use free local embeddings
    });

    // Initialize with documentation content
    await vectorService.initialize(
      documents.map((d) => d.path),
      { maxFileSize: 1000000 },
    );

    documentationVectorStore = {
      query: async (question: string, topK = 5) => {
        const results = await vectorService.searchFiles(question, { topK });

        return results.map((r) => ({
          content: documents.find((d) => d.path === r.path)?.content || '',
          file: path.basename(r.path),
          score: r.relevanceScore || 0,
        }));
      },
      reload: async (newDocsPath: string) => {
        await initializeDocumentationVectorStore(newDocsPath);
      },
    };

    logger.info(`✅ Vector store initialized with ${documents.length} documentation files`);

    return documentationVectorStore;
  } catch (error) {
    logger.warn(
      `Failed to initialize vector store: ${error instanceof Error ? error.message : String(error)}`,
    );
    logger.info('RAG queries will fall back to keyword search');
    return null;
  }
}

/**
 * Helper function to initialize config and LLM service
 * Centralizes config loading and LLM initialization across all handlers
 */
async function initializeConfigAndLLM(projectPath: string) {
  // Load config from the target project and apply to environment
  const config = loadArchDocConfig(projectPath, true) || {};

  // Initialize LLMService with config BEFORE creating agents
  const { LLMService } = await import('../llm/llm-service');
  LLMService.getInstance(config);

  return config;
}

/**
 * MCP Server instance
 */
const server = new Server(
  {
    name: 'archdoc-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'check_config',
        description:
          'Check if .archdoc.config.json exists and is valid. Returns setup instructions if missing or invalid.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'setup_config',
        description:
          'Create or update .archdoc.config.json with user-provided configuration. This tool accepts all configuration options and creates the config file.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['anthropic', 'openai', 'google', 'xai'],
              description: 'LLM provider to use',
            },
            model: {
              type: 'string',
              enum: [
                // Anthropic models
                'claude-sonnet-4-20250514',
                'claude-3-7-sonnet-20250219',
                'claude-3-5-sonnet-20241022',
                'claude-3-5-haiku-20241022',
                'claude-3-opus-20240229',
                // OpenAI models
                'gpt-4o',
                'gpt-4o-mini',
                'gpt-4-turbo',
                'gpt-4',
                'o1-preview',
                'o1-mini',
                // Google models
                'gemini-2.0-flash-exp',
                'gemini-1.5-pro-latest',
                'gemini-1.5-flash-latest',
                'gemini-1.5-flash-8b-latest',
                // xAI models
                'grok-beta',
                'grok-2-latest',
              ],
              description:
                'Model to use. Choose based on your provider: Anthropic (claude-*), OpenAI (gpt-*, o1-*), Google (gemini-*), xAI (grok-*)',
            },
            apiKey: {
              type: 'string',
              description: 'API key for the selected provider',
            },
            searchMode: {
              type: 'string',
              enum: ['keyword', 'vector'],
              description:
                'File search mode: keyword (traditional matching, FREE), vector (semantic similarity, FREE local embeddings). Default: keyword',
            },
            embeddingsProvider: {
              type: 'string',
              enum: ['local', 'openai', 'google'],
              description:
                'Embeddings provider for vector search: local (FREE TF-IDF, works offline), openai (text-embedding-3-small), google (text-embedding-004). Default: local',
            },
            embeddingsApiKey: {
              type: 'string',
              description:
                'API key for embeddings provider (required if embeddingsProvider is openai or google)',
            },
            retrievalStrategy: {
              type: 'string',
              enum: ['smart', 'vector', 'graph', 'hybrid'],
              description:
                'Retrieval strategy: smart (auto-detect), vector (semantic only), graph (structural only), hybrid (both). Default: smart',
            },
            enableTracing: {
              type: 'boolean',
              description: 'Enable LangSmith tracing for debugging (default: false)',
            },
            tracingApiKey: {
              type: 'string',
              description: 'LangSmith API key (required if enableTracing is true)',
            },
            tracingProject: {
              type: 'string',
              description: 'LangSmith project name (required if enableTracing is true)',
            },
          },
          required: ['provider', 'model', 'apiKey'],
        },
      },
      {
        name: 'generate_documentation',
        description: 'Generate comprehensive architecture documentation for the current project',
        inputSchema: {
          type: 'object',
          properties: {
            outputDir: {
              type: 'string',
              description: 'Output directory (default: .arch-docs)',
            },
            depth: {
              type: 'string',
              enum: ['quick', 'normal', 'deep'],
              description: 'Analysis depth (quick=fast, normal=5 iterations, deep=10 iterations)',
            },
            focusArea: {
              type: 'string',
              description:
                'Optional focus area to enhance analysis (e.g., "security", "database design")',
            },
            selectiveAgents: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Run only specific agents (e.g., ["architecture-analyzer", "security-analyzer"])',
            },
            maxCostDollars: {
              type: 'number',
              description: 'Maximum cost budget in dollars (default: 5.0)',
            },
          },
          required: [],
        },
      },
      {
        name: 'query_documentation',
        description: 'Query existing documentation using RAG (semantic search over docs)',
        inputSchema: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'Question to answer from documentation',
            },
            topK: {
              type: 'number',
              description: 'Number of relevant sections to retrieve (default: 5)',
            },
          },
          required: ['question'],
        },
      },
      {
        name: 'update_documentation',
        description: 'Update existing documentation with new focus area (incremental mode)',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description:
                'What to add/update in the documentation (e.g., "analyze security vulnerabilities")',
            },
            existingDocsPath: {
              type: 'string',
              description: 'Path to existing documentation (default: .arch-docs)',
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'check_architecture_patterns',
        description: 'Detect design patterns and anti-patterns in code',
        inputSchema: {
          type: 'object',
          properties: {
            filePaths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional: Specific files to analyze',
            },
          },
          required: [],
        },
      },
      {
        name: 'analyze_dependencies',
        description: 'Analyze project dependencies, detect circular deps, outdated packages',
        inputSchema: {
          type: 'object',
          properties: {
            includeDevDeps: {
              type: 'boolean',
              description: 'Include dev dependencies (default: true)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_recommendations',
        description: 'Get improvement recommendations for the project',
        inputSchema: {
          type: 'object',
          properties: {
            focusArea: {
              type: 'string',
              enum: ['security', 'performance', 'maintainability', 'all'],
              description: 'Focus area for recommendations (default: all)',
            },
          },
          required: [],
        },
      },
      {
        name: 'validate_architecture',
        description: 'Validate if code follows documented architecture patterns',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'File to validate against architecture',
            },
          },
          required: ['filePath'],
        },
      },
    ],
  };
});

/**
 * List available resources (documentation files)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'archdoc://documentation',
        name: 'Architecture Documentation',
        description: 'Generated architecture documentation for the project',
        mimeType: 'text/markdown',
      },
    ],
  };
});

/**
 * Read resource (documentation content)
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri.startsWith('archdoc://documentation/')) {
    const projectPath = uri.replace('archdoc://documentation/', '');
    const docsPath = path.join(projectPath, '.arch-docs');

    try {
      const files = await fs.readdir(docsPath);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      let content = '';
      for (const file of mdFiles) {
        const filePath = path.join(docsPath, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        content += `\n\n--- ${file} ---\n\n${fileContent}`;
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to read documentation: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(`Unknown resource URI: ${uri}`);
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'check_config':
        return await handleCheckConfig(args);

      case 'setup_config':
        return await handleSetupConfig(args);

      case 'generate_documentation':
        return await handleGenerateDocumentation(args);

      case 'query_documentation':
        return await handleQueryDocumentation(args);

      case 'update_documentation':
        return await handleUpdateDocumentation(args);

      case 'check_architecture_patterns':
        return await handleCheckPatterns(args);

      case 'analyze_dependencies':
        return await handleAnalyzeDependencies(args);

      case 'get_recommendations':
        return await handleGetRecommendations(args);

      case 'validate_architecture':
        return await handleValidateArchitecture(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error(`Tool ${name} failed`, error);

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
});

/**
 * Tool: check_config
 * Checks if .archdoc.config.json exists and is valid
 */
async function handleCheckConfig(_args: any) {
  const projectPath = process.cwd(); // Always use current working directory
  const configPath = path.join(projectPath, '.archdoc.config.json');

  try {
    await fs.access(configPath);

    // Read and validate config
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    let status = '✅ **Configuration Found and Valid**\n\n';
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check required fields
    if (!config.llm?.provider) {
      issues.push('❌ Missing `llm.provider` field');
    } else {
      status += `**Provider**: ${config.llm.provider}\n`;
    }

    if (!config.llm?.model) {
      recommendations.push('⚠️  Consider setting `llm.model` explicitly');
    } else {
      status += `**Model**: ${config.llm.model}\n`;
    }

    if (!config.apiKeys) {
      issues.push('❌ Missing `apiKeys` object');
    } else {
      const provider = config.llm?.provider;
      if (provider && (!config.apiKeys[provider] || config.apiKeys[provider].length === 0)) {
        issues.push(`❌ No API key configured for provider "${provider}"`);
      } else if (provider) {
        const keyPreview =
          config.apiKeys[provider].substring(0, 10) + '...' + config.apiKeys[provider].slice(-4);
        status += `**API Key**: ${keyPreview}\n`;
      }
    }

    if (config.tracing?.enabled) {
      status += `**Tracing**: Enabled (${config.tracing.project || 'N/A'})\n`;
    }

    status += '\n';

    if (issues.length > 0) {
      status += '## Issues Found:\n\n' + issues.join('\n') + '\n\n';
      status += '**Action Required**: Fix these issues in `.archdoc.config.json` or run:\n';
      status += '```bash\narchdoc-mcp\n```\n';
    } else {
      status += '✅ Configuration is ready to use!\n\n';
      if (recommendations.length > 0) {
        status += '## Recommendations:\n\n' + recommendations.join('\n') + '\n';
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: status,
        },
      ],
    };
  } catch (_error) {
    const helpText = `❌ **No Configuration Found**

**Location**: ${configPath}

**Setup Instructions**:

1. Navigate to your project directory:
   \`\`\`bash
   cd ${projectPath}
   \`\`\`

2. Run the setup wizard:
   \`\`\`bash
   archdoc-mcp
   \`\`\`

   Or use the \`config_init\` tool to create a minimal config.

3. Add your API key to \`.archdoc.config.json\`

**Required Fields**:
- \`llm.provider\` - LLM provider (anthropic, openai, google, xai)
- \`llm.model\` - Model to use
- \`apiKeys.{provider}\` - Your API key

**Example**:
\`\`\`json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514"
  },
  "apiKeys": {
    "anthropic": "sk-ant-..."
  }
}
\`\`\``;

    return {
      content: [
        {
          type: 'text',
          text: helpText,
        },
      ],
    };
  }
}

/**
 * Tool: setup_config
 * Creates or updates .archdoc.config.json with user-provided configuration
 */
async function handleSetupConfig(args: any) {
  const projectPath = process.cwd();
  const configPath = path.join(projectPath, '.archdoc.config.json');

  const {
    provider,
    model,
    apiKey,
    searchMode = 'keyword',
    embeddingsProvider,
    embeddingsApiKey,
    retrievalStrategy = 'smart',
    enableTracing = false,
    tracingApiKey,
    tracingProject,
  } = args;

  // Validate required fields
  if (!provider || !model || !apiKey) {
    return {
      content: [
        {
          type: 'text',
          text: '❌ Error: Missing required fields. Please provide `provider`, `model`, and `apiKey`.',
        },
      ],
      isError: true,
    };
  }

  // Validate embeddings API key if using non-local provider
  if (
    searchMode === 'vector' &&
    embeddingsProvider &&
    embeddingsProvider !== 'local' &&
    !embeddingsApiKey
  ) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: embeddingsApiKey is required when using ${embeddingsProvider} embeddings provider.`,
        },
      ],
      isError: true,
    };
  }

  // Load existing config or create new
  let existingConfig: any = {};
  try {
    const existingContent = await fs.readFile(configPath, 'utf-8');
    existingConfig = JSON.parse(existingContent);
  } catch {
    // No existing config, start fresh
  }

  // Determine embeddings provider (prioritize user input, then existing, then default)
  const finalEmbeddingsProvider =
    embeddingsProvider ||
    (searchMode === 'vector' ? existingConfig.llm?.embeddingsProvider || 'local' : undefined);

  // Build API keys object
  const apiKeys: any = {
    ...existingConfig.apiKeys,
    [provider]: apiKey,
  };

  // Add embeddings API key if provided
  if (embeddingsApiKey && finalEmbeddingsProvider && finalEmbeddingsProvider !== 'local') {
    apiKeys.embeddings = embeddingsApiKey;
  }

  // Build new config
  const config: any = {
    llm: {
      provider,
      model,
      temperature: existingConfig.llm?.temperature || 0.2,
      maxTokens: existingConfig.llm?.maxTokens || 4096,
      embeddingsProvider: finalEmbeddingsProvider,
    },
    apiKeys,
    searchMode: {
      mode: searchMode,
      strategy: retrievalStrategy,
      vectorWeight: existingConfig.searchMode?.vectorWeight ?? 0.6,
      graphWeight: existingConfig.searchMode?.graphWeight ?? 0.4,
      includeRelatedFiles: existingConfig.searchMode?.includeRelatedFiles ?? true,
      maxDepth: existingConfig.searchMode?.maxDepth ?? 2,
      similarityThreshold: existingConfig.searchMode?.similarityThreshold ?? 0.3,
      topK: existingConfig.searchMode?.topK ?? 10,
    },
    tracing: {
      enabled: enableTracing,
      apiKey: tracingApiKey || existingConfig.tracing?.apiKey || '',
      project: tracingProject || existingConfig.tracing?.project || 'archdoc-analysis',
    },
    // Preserve other existing config
    ...existingConfig,
  };

  // Ensure llm, apiKeys, and searchMode are at top level (override spread)
  config.llm = {
    provider,
    model,
    temperature: existingConfig.llm?.temperature || 0.2,
    maxTokens: existingConfig.llm?.maxTokens || 4096,
    embeddingsProvider: finalEmbeddingsProvider,
  };
  config.apiKeys = apiKeys;
  config.searchMode = {
    mode: searchMode,
    strategy: retrievalStrategy,
    vectorWeight: existingConfig.searchMode?.vectorWeight ?? 0.6,
    graphWeight: existingConfig.searchMode?.graphWeight ?? 0.4,
    includeRelatedFiles: existingConfig.searchMode?.includeRelatedFiles ?? true,
    maxDepth: existingConfig.searchMode?.maxDepth ?? 2,
    similarityThreshold: existingConfig.searchMode?.similarityThreshold ?? 0.3,
    topK: existingConfig.searchMode?.topK ?? 10,
  };

  // Write config
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

  const summary = `✅ **Configuration ${existingConfig.llm ? 'Updated' : 'Created'} Successfully!**

**Location**: ${configPath}

**LLM Settings**:
- Provider: ${provider}
- Model: ${model}
- API Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}

**Search Configuration**:
- Mode: ${searchMode}
- Strategy: ${retrievalStrategy}${finalEmbeddingsProvider && searchMode === 'vector' ? `\n- Embeddings: ${finalEmbeddingsProvider}` : ''}

**Tracing**: ${enableTracing ? `Enabled (${tracingProject || 'archdoc-analysis'})` : 'Disabled'}

**Next Steps**:
1. The configuration has been saved
2. You can now use other tools like \`generate_documentation\`
3. Use \`check_config\` to verify the configuration anytime

💡 **Tip**: Your API key is stored locally in \`.archdoc.config.json\`. Make sure this file is in your \`.gitignore\`!`;

  return {
    content: [
      {
        type: 'text',
        text: summary,
      },
    ],
  };
} /**
 * Tool: generate_documentation
 */
async function handleGenerateDocumentation(args: any) {
  const { outputDir, depth = 'normal', focusArea, selectiveAgents, maxCostDollars = 5.0 } = args;

  const projectPath = process.cwd(); // Always use current working directory

  logger.info(`Generating documentation for ${projectPath}...`);

  // Initialize config and LLM service
  const config = await initializeConfigAndLLM(projectPath);

  const agentRegistry = new AgentRegistry();
  const scanner = new FileSystemScanner();
  const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner, config);

  const depthConfig = {
    quick: { enabled: false, maxIterations: 0, clarityThreshold: 0 },
    normal: { enabled: true, maxIterations: 5, clarityThreshold: 80 },
    deep: { enabled: true, maxIterations: 10, clarityThreshold: 90 },
  };

  const output = await orchestrator.generateDocumentation(projectPath, {
    userPrompt: focusArea,
    selectiveAgents,
    maxCostDollars,
    iterativeRefinement: {
      ...depthConfig[depth as keyof typeof depthConfig],
      minImprovement: 10,
    },
    agentOptions: {
      searchMode: 'keyword', // Use keyword search by default (free!)
    },
  });

  // Write to files
  const docsPath = outputDir || path.join(projectPath, '.arch-docs');
  const formatter = new MultiFileMarkdownFormatter();
  await formatter.format(output, {
    outputDir: docsPath,
    includeMetadata: true,
    includeTOC: true,
    includeNavigation: true,
  });

  // Initialize vector store for RAG
  await initializeDocumentationVectorStore(docsPath);

  const summary = `✅ Documentation generated successfully!

**Output**: ${docsPath}
**Agents Executed**: ${output.metadata.agentsExecuted?.length || 0}
**Total Tokens**: ${output.metadata.totalTokensUsed?.toLocaleString() || 0}
**Files Generated**: ${Array.from(output.customSections.values()).reduce((sum, section: any) => sum + (section.files?.length || 0), 0)}

**Summary**: ${output.metadata.agentsExecuted?.join(', ') || 'N/A'}

📖 Use 'query_documentation' to ask questions about the architecture!`;

  return {
    content: [
      {
        type: 'text',
        text: summary,
      },
    ],
  };
}

/**
 * Tool: query_documentation
 */
async function handleQueryDocumentation(args: any) {
  const { question, topK = 5 } = args;
  const projectPath = process.cwd();

  const docsPath = path.join(projectPath, '.arch-docs');

  // Initialize vector store if not already loaded
  if (!documentationVectorStore) {
    await initializeDocumentationVectorStore(docsPath);
  }

  if (!documentationVectorStore) {
    // Fallback: Read all docs and do keyword search
    const files = await fs.readdir(docsPath);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    let allContent = '';
    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(docsPath, file), 'utf-8');
      allContent += `\n\n--- ${file} ---\n\n${content}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: `📄 Documentation Content:\n\n${allContent.substring(0, 5000)}...\n\n⚠️ Note: Vector search not available, showing full docs instead.`,
        },
      ],
    };
  }

  // RAG query
  const results = await documentationVectorStore.query(question, topK);

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

/**
 * Tool: update_documentation
 */
async function handleUpdateDocumentation(args: any) {
  const { prompt, existingDocsPath } = args;
  const projectPath = process.cwd();

  const docsPath = existingDocsPath || path.join(projectPath, '.arch-docs');

  logger.info(`Updating documentation with prompt: "${prompt}"`);

  // Initialize config and LLM service
  const config = await initializeConfigAndLLM(projectPath);

  const agentRegistry = new AgentRegistry();
  const scanner = new FileSystemScanner();
  const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner, config);

  const output = await orchestrator.generateDocumentation(projectPath, {
    userPrompt: prompt,
    incrementalMode: true,
    existingDocsPath: docsPath,
    agentOptions: {
      searchMode: 'keyword',
    },
  });

  // Write updates
  const formatter = new MultiFileMarkdownFormatter();
  await formatter.format(output, {
    outputDir: docsPath,
    includeMetadata: true,
    includeTOC: true,
    includeNavigation: true,
  });

  // Reload vector store
  if (documentationVectorStore) {
    await documentationVectorStore.reload(docsPath);
  }

  return {
    content: [
      {
        type: 'text',
        text: `✅ Documentation updated!\n\n**Focus**: ${prompt}\n**Agents**: ${output.metadata.agentsExecuted?.join(', ')}\n**Tokens**: ${output.metadata.totalTokensUsed?.toLocaleString()}`,
      },
    ],
  };
}

/**
 * Tool: check_architecture_patterns
 */
async function handleCheckPatterns(_args: any) {
  const projectPath = process.cwd();

  // Initialize config and LLM service
  const config = await initializeConfigAndLLM(projectPath);

  const agentRegistry = new AgentRegistry();
  const scanner = new FileSystemScanner();
  const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner, config);

  const output = await orchestrator.generateDocumentation(projectPath, {
    selectiveAgents: ['pattern-detector'],
    agentOptions: {
      searchMode: 'keyword',
    },
  });

  const patternSection = output.customSections.get('pattern-detector') as any;

  if (!patternSection) {
    return {
      content: [
        {
          type: 'text',
          text: '⚠️ No patterns detected',
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: patternSection.content || patternSection.markdown || 'No pattern data available',
      },
    ],
  };
}

/**
 * Tool: analyze_dependencies
 */
async function handleAnalyzeDependencies(_args: any) {
  const projectPath = process.cwd();

  // Initialize config and LLM service
  const config = await initializeConfigAndLLM(projectPath);

  const agentRegistry = new AgentRegistry();
  const scanner = new FileSystemScanner();
  const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner, config);

  const output = await orchestrator.generateDocumentation(projectPath, {
    selectiveAgents: ['dependency-analyzer'],
    agentOptions: {
      searchMode: 'keyword',
    },
  });

  const depSection = output.customSections.get('dependency-analyzer') as any;

  if (!depSection) {
    return {
      content: [
        {
          type: 'text',
          text: '⚠️ No dependencies analyzed',
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: depSection.content || depSection.markdown || 'No dependency data available',
      },
    ],
  };
}

/**
 * Tool: get_recommendations
 */
async function handleGetRecommendations(args: any) {
  const { focusArea = 'all' } = args;
  const projectPath = process.cwd();

  // Initialize config and LLM service
  const config = await initializeConfigAndLLM(projectPath);

  const agentRegistry = new AgentRegistry();
  const scanner = new FileSystemScanner();
  const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner, config);

  const prompt =
    focusArea === 'all'
      ? 'Provide comprehensive improvement recommendations'
      : `Focus on ${focusArea} improvements`;

  const output = await orchestrator.generateDocumentation(projectPath, {
    userPrompt: prompt,
    agentOptions: {
      searchMode: 'keyword',
    },
  });

  const recsSection = output.customSections.get('recommendations') as any;

  if (!recsSection) {
    return {
      content: [
        {
          type: 'text',
          text: '⚠️ No recommendations generated',
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: recsSection.content || recsSection.markdown || 'No recommendations available',
      },
    ],
  };
}

/**
 * Tool: validate_architecture
 */
async function handleValidateArchitecture(args: any) {
  const { filePath } = args;
  const projectPath = process.cwd();

  const docsPath = path.join(projectPath, '.arch-docs');

  // Initialize vector store if not already loaded
  if (!documentationVectorStore) {
    await initializeDocumentationVectorStore(docsPath);
  }

  // Read the file to validate
  const fileContent = await fs.readFile(filePath, 'utf-8');

  let relevantDocs = '';

  if (documentationVectorStore) {
    // Use vector search to find relevant architecture documentation
    // Create a query based on the file content to find relevant patterns
    const query = `architecture patterns for ${path.basename(filePath)} file validation`;
    const results = await documentationVectorStore.query(query, 10);

    if (results.length > 0) {
      relevantDocs = results
        .map((r) => `### ${r.file}\n\n${r.content}`)
        .join('\n\n---\n\n');
    }
  }

  // Fallback: Load all architecture docs if vector store failed
  if (!relevantDocs) {
    logger.info('Vector store not available, loading all architecture docs');

    const architectureFile = path.join(docsPath, 'architecture.md');
    const patternsFile = path.join(docsPath, 'patterns.md');

    let architectureDoc = '';
    let patternsDoc = '';

    try {
      architectureDoc = await fs.readFile(architectureFile, 'utf-8');
    } catch {
      // File not found
    }

    try {
      patternsDoc = await fs.readFile(patternsFile, 'utf-8');
    } catch {
      // File not found
    }

    if (!architectureDoc && !patternsDoc) {
      return {
        content: [
          {
            type: 'text',
            text: '⚠️ No architecture documentation found. Run "generate_documentation" first.',
          },
        ],
      };
    }

    // Load FULL documentation (no truncation)
    relevantDocs = '';
    if (architectureDoc) {
      relevantDocs += `### architecture.md\n\n${architectureDoc}\n\n---\n\n`;
    }
    if (patternsDoc) {
      relevantDocs += `### patterns.md\n\n${patternsDoc}`;
    }
  }

  // Use LLM to validate
  const { LLMService } = await import('../llm/llm-service');
  const llmService = LLMService.getInstance();
  const model = llmService.getChatModel({ temperature: 0.2, maxTokens: 4096 });

  const prompt = `You are validating if code follows documented architecture patterns.

**Relevant Architecture Documentation**:
${relevantDocs}

**File to Validate**: ${path.basename(filePath)}
\`\`\`
${fileContent}
\`\`\`

**Task**: Validate if this file follows the documented architecture patterns.

**Output Format**:
✅/⚠️/❌ **Validation Result**

**Compliance**: [High/Medium/Low]

**Issues Found**:
- [List any violations or anti-patterns]

**Recommendations**:
- [List specific improvements to align with architecture]`;

  const response = await model.invoke(prompt);
  const validation = typeof response === 'string' ? response : response.content?.toString() || '';

  return {
    content: [
      {
        type: 'text',
        text: validation,
      },
    ],
  };
}

/**
 * Start MCP server
 */
async function main() {
  logger.info('Starting ArchDoc MCP Server...');

  // Check if .archdoc.config.json exists in current working directory
  const projectPath = process.cwd();
  const configPath = path.join(projectPath, '.archdoc.config.json');

  try {
    await fs.access(configPath);
    logger.info(`✅ Found configuration at ${configPath}`);

    // Validate config has required fields
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    if (!config.apiKeys || !config.llm?.provider) {
      logger.warn(
        '⚠️  Configuration incomplete. Please run "archdoc-mcp" to complete setup or add API keys to .archdoc.config.json',
      );
    } else {
      const provider = config.llm.provider;
      const hasApiKey = config.apiKeys[provider] && config.apiKeys[provider].length > 0;

      if (!hasApiKey) {
        logger.warn(
          `⚠️  No API key found for provider "${provider}". Add it to .archdoc.config.json or run "archdoc-mcp" to configure.`,
        );
      } else {
        logger.info(
          `✅ Configuration valid - Provider: ${provider}, Model: ${config.llm.model || 'default'}`,
        );
      }
    }
  } catch (_error) {
    logger.warn(
      `⚠️  No configuration found at ${configPath}. Run "archdoc-mcp" in your project directory to set up.`,
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('✅ MCP Server running (stdio mode)');
}

// Error handling
process.on('SIGINT', async () => {
  logger.info('Shutting down MCP server...');
  await server.close();
  process.exit(0);
});

main().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});
