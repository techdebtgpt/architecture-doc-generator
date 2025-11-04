/**
 * Application configuration interface
 */
export interface AppConfig {
  // LLM Configuration
  llm: {
    provider: 'anthropic' | 'openai' | 'google';
    model: string;
    temperature: number;
    maxTokens: number;
    maxInputTokens: number;
    tokenBuffer: number;
    // Embeddings API key (for vector search) - separate from main LLM provider
    embeddingsApiKey?: string;
    embeddingsProvider?: 'local' | 'openai' | 'google' | 'huggingface' | 'cohere' | 'voyage';
  };

  // Scanning Configuration
  scan: {
    maxFileSize: number;
    maxFiles: number;
    maxDepth: number;
    includeHidden: boolean;
    followSymlinks: boolean;
    respectGitignore: boolean;
    excludePatterns: string[];
    allowedExtensions: string[];
  };

  // Cache Configuration
  cache: {
    enabled: boolean;
    type: 'file' | 'memory';
    ttl: number;
    directory: string;
  };

  // Output Configuration
  output: {
    format: 'markdown' | 'json' | 'html' | 'confluence';
    directory: string;
    fileName: string;
    includeTOC: boolean;
    includeDiagrams: boolean;
    includeCodeSnippets: boolean;
    maxSnippetLength: number;
    splitFiles: boolean;
  };

  // Agent Configuration
  agents: {
    enabled: string[];
    parallel: boolean;
    timeout: number;
    retries: number;
  };

  // Logging Configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file: string;
    console: boolean;
  };

  // LangSmith Tracing
  tracing: {
    enabled: boolean;
    project: string;
    runName?: string; // Custom run name for easier trace identification
  };

  // Language Configuration (optional - extends built-in languages)
  languages?: {
    // Register new languages or extend existing ones
    custom?: Record<
      string,
      {
        displayName?: string;
        filePatterns?: {
          extensions?: string[];
          namePatterns?: string[];
          excludePatterns?: string[];
        };
        importPatterns?: {
          [key: string]: string; // RegExp pattern as string (will be converted to RegExp)
        };
        componentPatterns?: {
          [key: string]: string[]; // Array of RegExp patterns as strings
        };
        keywords?: {
          [category: string]: string[];
        };
        frameworks?: string[];
      }
    >;
    // Override settings for built-in languages
    overrides?: Record<
      string,
      {
        filePatterns?: {
          extensions?: string[];
          excludePatterns?: string[];
        };
        keywords?: {
          [category: string]: string[];
        };
      }
    >;
  };
}
