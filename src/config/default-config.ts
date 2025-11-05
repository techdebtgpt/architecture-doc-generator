import { AppConfig } from './config.interface';

/**
 * Default configuration values
 */
export const defaultConfig: AppConfig = {
  llm: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.2,
    maxTokens: 4096,
    maxInputTokens: 100000,
    tokenBuffer: 10000,
  },

  scan: {
    maxFileSize: 1048576, // 1MB
    maxFiles: 10000,
    maxDepth: 10,
    includeHidden: false,
    followSymlinks: false,
    respectGitignore: true,
    excludePatterns: [
      'node_modules',
      'dist',
      'build',
      'coverage',
      '.git',
      '.next',
      '.nuxt',
      '__pycache__',
      'venv',
      'env',
      'target',
      'bin',
      'obj',
      '*.min.js',
      '*.bundle.js',
      '*.map',
    ],
    allowedExtensions: [],
  },

  cache: {
    enabled: true,
    type: 'file',
    ttl: 3600,
    directory: '.archdoc-cache',
  },

  output: {
    format: 'markdown',
    directory: './docs/architecture',
    fileName: 'ARCHITECTURE',
    includeTOC: true,
    includeDiagrams: true,
    includeCodeSnippets: true,
    maxSnippetLength: 500,
    splitFiles: false,
  },

  agents: {
    enabled: [
      'file-structure',
      'dependency-analysis',
      'pattern-detection',
      'documentation-synthesis',
      'code-quality',
    ],
    parallel: true,
    timeout: 300000, // 5 minutes
    retries: 3,
  },

  searchMode: {
    mode: 'vector', // Default: semantic search (can be 'keyword' for faster, simpler matching)
    embeddingsProvider: 'local', // Default to FREE local TF-IDF embeddings (no API key needed)
    strategy: 'hybrid', // Default: combine semantic + structural
    vectorWeight: 0.6, // 60% semantic similarity
    graphWeight: 0.4, // 40% structural relationships
    includeRelatedFiles: true, // Include imports/dependencies
    maxDepth: 2, // Traverse graph up to 2 hops
    similarityThreshold: 0.3, // Minimum 30% similarity for vector results
    topK: 10, // Return top 10 results per query
  },

  logging: {
    level: 'info',
    file: '.archdoc.log',
    console: true,
  },

  tracing: {
    enabled: false,
    project: 'architecture-doc-generator',
  },
};
