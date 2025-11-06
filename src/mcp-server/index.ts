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
        name: 'config_init',
        description: 'Initialize configuration for a project (creates .archdoc.config.json)',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project directory',
            },
            provider: {
              type: 'string',
              enum: ['anthropic', 'openai', 'google', 'xai'],
              description: 'LLM provider to use (default: anthropic)',
            },
            apiKey: {
              type: 'string',
              description: 'API key for the LLM provider',
            },
            enableTracing: {
              type: 'boolean',
              description: 'Enable LangSmith tracing (default: false)',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'generate_documentation',
        description: 'Generate comprehensive architecture documentation for a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project to analyze',
            },
            outputDir: {
              type: 'string',
              description: 'Output directory (default: <project>/.arch-docs)',
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
          required: ['projectPath'],
        },
      },
      {
        name: 'query_documentation',
        description: 'Query existing documentation using RAG (semantic search over docs)',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project with existing documentation',
            },
            question: {
              type: 'string',
              description: 'Question to answer from documentation',
            },
            topK: {
              type: 'number',
              description: 'Number of relevant sections to retrieve (default: 5)',
            },
          },
          required: ['projectPath', 'question'],
        },
      },
      {
        name: 'update_documentation',
        description: 'Update existing documentation with new focus area (incremental mode)',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project',
            },
            prompt: {
              type: 'string',
              description:
                'What to add/update in the documentation (e.g., "analyze security vulnerabilities")',
            },
            existingDocsPath: {
              type: 'string',
              description: 'Path to existing documentation (default: <project>/.arch-docs)',
            },
          },
          required: ['projectPath', 'prompt'],
        },
      },
      {
        name: 'check_architecture_patterns',
        description: 'Detect design patterns and anti-patterns in code',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project',
            },
            filePaths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional: Specific files to analyze',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'analyze_dependencies',
        description: 'Analyze project dependencies, detect circular deps, outdated packages',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project',
            },
            includeDevDeps: {
              type: 'boolean',
              description: 'Include dev dependencies (default: true)',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'get_recommendations',
        description: 'Get improvement recommendations for a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project',
            },
            focusArea: {
              type: 'string',
              enum: ['security', 'performance', 'maintainability', 'all'],
              description: 'Focus area for recommendations (default: all)',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'validate_architecture',
        description: 'Validate if code follows documented architecture patterns',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project with existing documentation',
            },
            filePath: {
              type: 'string',
              description: 'File to validate against architecture',
            },
          },
          required: ['projectPath', 'filePath'],
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
      case 'config_init':
        return await handleConfigInit(args);

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
 * Tool: config_init
 * Creates .archdoc.config.json with the same structure as CLI config
 */
async function handleConfigInit(args: any) {
  const { projectPath, provider = 'anthropic', apiKey, enableTracing = false } = args;

  const configPath = path.join(projectPath, '.archdoc.config.json');

  // Use same config structure as CLI (see cli/index.ts and .archdoc.config.example.json)
  const config: any = {
    llm: {
      provider,
      model:
        provider === 'anthropic'
          ? 'claude-sonnet-4-20250514'
          : provider === 'openai'
            ? 'gpt-4o'
            : undefined,
    },
    apiKeys: {
      [provider]: apiKey || '',
    },
    tracing: {
      enabled: enableTracing,
      project: 'archdoc-mcp',
    },
  };

  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

  return {
    content: [
      {
        type: 'text',
        text: `✅ Configuration created at ${configPath}\n\nNext steps:\n1. Edit .archdoc.config.json and add your API key\n2. Run 'generate_documentation' tool`,
      },
    ],
  };
}

/**
 * Tool: generate_documentation
 */
async function handleGenerateDocumentation(args: any) {
  const {
    projectPath,
    outputDir,
    depth = 'normal',
    focusArea,
    selectiveAgents,
    maxCostDollars = 5.0,
  } = args;

  logger.info(`Generating documentation for ${projectPath}...`);

  // Load config from the target project
  const config = loadArchDocConfig(projectPath, false); // Don't apply to env

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
  const { projectPath, question, topK = 5 } = args;

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
  const { projectPath, prompt, existingDocsPath } = args;

  const docsPath = existingDocsPath || path.join(projectPath, '.arch-docs');

  logger.info(`Updating documentation with prompt: "${prompt}"`);

  const agentRegistry = new AgentRegistry();
  const scanner = new FileSystemScanner();
  const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner);

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
async function handleCheckPatterns(args: any) {
  const { projectPath } = args;

  const agentRegistry = new AgentRegistry();
  const scanner = new FileSystemScanner();
  const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner);

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
async function handleAnalyzeDependencies(args: any) {
  const { projectPath } = args;

  const agentRegistry = new AgentRegistry();
  const scanner = new FileSystemScanner();
  const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner);

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
  const { projectPath, focusArea = 'all' } = args;

  const agentRegistry = new AgentRegistry();
  const scanner = new FileSystemScanner();
  const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner);

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
  const { projectPath, filePath } = args;

  const docsPath = path.join(projectPath, '.arch-docs');

  // Load existing documentation
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

  // Read the file to validate
  const fileContent = await fs.readFile(filePath, 'utf-8');

  // Use LLM to validate
  const { LLMService } = await import('../llm/llm-service');
  const llmService = LLMService.getInstance();
  const model = llmService.getChatModel({ temperature: 0.2, maxTokens: 2048 });

  const prompt = `You are validating if code follows documented architecture patterns.

**Architecture Documentation**:
${architectureDoc.substring(0, 2000)}

**Patterns Documentation**:
${patternsDoc.substring(0, 2000)}

**File to Validate**: ${path.basename(filePath)}
\`\`\`
${fileContent.substring(0, 3000)}
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
