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
}
