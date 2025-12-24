/**
 * Tool Registry - Central definition of all MCP tools
 * Schemas only - no implementation here
 */

import { ToolDefinition } from '../types';

/**
 * All available tools in the MCP server
 */
export const TOOLS: Record<string, ToolDefinition> = {
  check_config: {
    name: 'check_config',
    description:
      'Check if .archdoc.config.json exists and is valid. Returns setup instructions if missing or invalid.',
    version: '1.0.0',
    versionInfo: {
      current: { major: 1, minor: 0, patch: 0 },
      changelog: [
        {
          version: '1.0.0',
          date: '2025-01-01',
          changes: ['Initial release', 'Config validation support'],
        },
      ],
    },
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  setup_config: {
    name: 'setup_config',
    description:
      'Create or update .archdoc.config.json with user-provided configuration. This tool accepts all configuration options and creates the config file.',
    version: '1.0.0',
    versionInfo: {
      current: { major: 1, minor: 0, patch: 0 },
      changelog: [
        {
          version: '1.0.0',
          date: '2025-01-01',
          changes: ['Initial release', 'Support for Anthropic, OpenAI, Google, xAI providers'],
        },
      ],
    },
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

  generate_documentation: {
    name: 'generate_documentation',
    description: 'Generate comprehensive architecture documentation for the current project',
    version: '1.0.0',
    versionInfo: {
      current: { major: 1, minor: 0, patch: 0 },
      changelog: [
        {
          version: '1.0.0',
          date: '2025-01-01',
          changes: [
            'Initial release',
            'Depth levels (quick/normal/deep)',
            'Selective agents support',
            'Cost budgeting',
          ],
        },
      ],
    },
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

  query_documentation: {
    name: 'query_documentation',
    description: 'Query existing documentation using RAG (semantic search over docs)',
    version: '1.0.0',
    versionInfo: {
      current: { major: 1, minor: 0, patch: 0 },
      changelog: [
        {
          version: '1.0.0',
          date: '2025-01-01',
          changes: ['Initial release', 'RAG-based semantic search', 'Configurable top-k retrieval'],
        },
      ],
    },
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

  update_documentation: {
    name: 'update_documentation',
    description: 'Update existing documentation with new focus area (incremental mode)',
    version: '1.0.0',
    versionInfo: {
      current: { major: 1, minor: 0, patch: 0 },
      changelog: [
        {
          version: '1.0.0',
          date: '2025-01-01',
          changes: ['Initial release', 'Incremental documentation updates', 'Custom focus prompts'],
        },
      ],
    },
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

  check_architecture_patterns: {
    name: 'check_architecture_patterns',
    description: 'Detect design patterns and anti-patterns in code',
    version: '1.0.0',
    versionInfo: {
      current: { major: 1, minor: 0, patch: 0 },
      changelog: [
        {
          version: '1.0.0',
          date: '2025-01-01',
          changes: [
            'Initial release',
            'Pattern detection',
            'Anti-pattern identification',
            'File-specific analysis',
          ],
        },
      ],
    },
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

  analyze_dependencies: {
    name: 'analyze_dependencies',
    description: 'Analyze project dependencies, detect circular deps, outdated packages',
    version: '1.0.0',
    versionInfo: {
      current: { major: 1, minor: 0, patch: 0 },
      changelog: [
        {
          version: '1.0.0',
          date: '2025-01-01',
          changes: [
            'Initial release',
            'Circular dependency detection',
            'Package version analysis',
            'Dev/prod separation',
          ],
        },
      ],
    },
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

  get_recommendations: {
    name: 'get_recommendations',
    description: 'Get improvement recommendations for the project',
    version: '1.0.0',
    versionInfo: {
      current: { major: 1, minor: 0, patch: 0 },
      changelog: [
        {
          version: '1.0.0',
          date: '2025-01-01',
          changes: [
            'Initial release',
            'Focus areas (security/performance/maintainability)',
            'Priority-based recommendations',
          ],
        },
      ],
    },
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

  validate_architecture: {
    name: 'validate_architecture',
    description: 'Validate if code follows documented architecture patterns',
    version: '1.0.0',
    versionInfo: {
      current: { major: 1, minor: 0, patch: 0 },
      changelog: [
        {
          version: '1.0.0',
          date: '2025-01-01',
          changes: [
            'Initial release',
            'Architecture compliance validation',
            'File-level validation',
            'Violation reporting',
          ],
        },
      ],
    },
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

  check_cache: {
    name: 'check_cache',
    description:
      'Check documentation cache status. Returns whether cached documentation exists, its age, size, and validity.',
    version: '1.0.0',
    versionInfo: {
      current: { major: 1, minor: 0, patch: 0 },
      changelog: [
        {
          version: '1.0.0',
          date: '2025-01-24',
          changes: ['Initial release', 'MCP-aware execution support', 'Cache metadata tracking'],
        },
      ],
    },
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  invalidate_cache: {
    name: 'invalidate_cache',
    description:
      'Invalidate the documentation cache to force fresh generation on next request. Useful when code has changed significantly.',
    version: '1.0.0',
    versionInfo: {
      current: { major: 1, minor: 0, patch: 0 },
      changelog: [
        {
          version: '1.0.0',
          date: '2025-01-24',
          changes: ['Initial release', 'Force cache invalidation', 'Fresh generation trigger'],
        },
      ],
    },
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
};

/**
 * Get all tool definitions as array
 */
export function getAllTools(): ToolDefinition[] {
  return Object.values(TOOLS);
}

/**
 * Get tool definition by name
 */
export function getTool(name: string): ToolDefinition | undefined {
  return TOOLS[name];
}

/**
 * Validate tool name exists
 */
export function isValidTool(name: string): boolean {
  return name in TOOLS;
}

/**
 * Get tool version
 */
export function getToolVersion(name: string): string | undefined {
  return TOOLS[name]?.version;
}

/**
 * Get tool changelog
 */
export function getToolChangelog(
  name: string,
): Array<{ version: string; date: string; changes: string[]; breaking?: boolean }> | undefined {
  return TOOLS[name]?.versionInfo?.changelog;
}

/**
 * Check if tool is deprecated
 */
export function isToolDeprecated(name: string): boolean {
  return TOOLS[name]?.versionInfo?.deprecated ?? false;
}

/**
 * Get replacement tool for deprecated tool
 */
export function getToolReplacement(name: string): string | undefined {
  return TOOLS[name]?.versionInfo?.replacedBy;
}

/**
 * Get tools by minimum version
 */
export function getToolsByVersion(minVersion: string): ToolDefinition[] {
  return Object.values(TOOLS).filter((tool) => {
    if (!tool.version) return true;
    return compareVersions(tool.version, minVersion) >= 0;
  });
}

/**
 * Compare semantic versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const aPart = aParts[i] ?? 0;
    const bPart = bParts[i] ?? 0;

    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }

  return 0;
}

/**
 * Get tool version info summary
 */
export function getToolVersionSummary(
  name: string,
): { version: string; deprecated: boolean; replacedBy?: string } | undefined {
  const tool = TOOLS[name];
  if (!tool?.version) return undefined;

  return {
    version: tool.version,
    deprecated: tool.versionInfo?.deprecated ?? false,
    replacedBy: tool.versionInfo?.replacedBy,
  };
}

/**
 * Get all tool versions
 */
export function getAllToolVersions(): Record<string, string> {
  const versions: Record<string, string> = {};

  for (const [name, tool] of Object.entries(TOOLS)) {
    if (tool.version) {
      versions[name] = tool.version;
    }
  }

  return versions;
}
