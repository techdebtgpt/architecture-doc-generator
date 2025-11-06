import * as path from 'path';
import * as fs from 'fs';

/**
 * Configuration file name
 */
const CONFIG_FILE = '.archdoc.config.json';

/**
 * ArchDoc configuration structure
 */
export interface ArchDocConfig {
  llm?: {
    provider?: string;
    model?: string;
  };
  apiKeys?: {
    anthropic?: string;
    openai?: string;
    google?: string;
    xai?: string;
  };
  embeddings?: {
    openai?: string;
    google?: string;
  };
  tracing?: {
    enabled?: boolean;
    apiKey?: string;
    project?: string;
    endpoint?: string;
    runName?: string;
  };
  output?: {
    directory?: string;
    format?: string;
  };
  analysis?: {
    depth?: string;
    maxCostDollars?: number;
  };
}

/**
 * Load ArchDoc configuration from .archdoc.config.json
 * Looks for config in: root folder first, then .arch-docs/ folder
 *
 * @param projectPath - Project directory to search for config (defaults to cwd)
 * @param applyToEnv - Whether to apply config values to process.env (default: true)
 * @returns Parsed configuration or null if not found
 */
export function loadArchDocConfig(
  projectPath: string = process.cwd(),
  applyToEnv: boolean = true,
): ArchDocConfig | null {
  // Try root .archdoc.config.json first
  let configPath = path.join(projectPath, CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    // Fallback to .arch-docs/.archdoc.config.json
    configPath = path.join(projectPath, '.arch-docs', CONFIG_FILE);
  }

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (applyToEnv) {
      // Set environment variables from config file
      if (config.apiKeys) {
        if (config.apiKeys.anthropic) process.env.ANTHROPIC_API_KEY = config.apiKeys.anthropic;
        if (config.apiKeys.openai) process.env.OPENAI_API_KEY = config.apiKeys.openai;
        if (config.apiKeys.google) process.env.GOOGLE_API_KEY = config.apiKeys.google;
        if (config.apiKeys.xai) process.env.XAI_API_KEY = config.apiKeys.xai;
      }

      // Set embeddings keys (separate from LLM API keys)
      if (config.embeddings) {
        if (config.embeddings.openai) process.env.OPENAI_EMBEDDINGS_KEY = config.embeddings.openai;
        if (config.embeddings.google) process.env.GOOGLE_EMBEDDINGS_KEY = config.embeddings.google;
      }

      // Set LLM provider and model from config
      if (config.llm) {
        if (config.llm.provider) process.env.ARCHDOC_LLM_PROVIDER = config.llm.provider;
        if (config.llm.model) process.env.ARCHDOC_LLM_MODEL = config.llm.model;
      }

      // Set LangSmith tracing config
      if (config.tracing) {
        if (config.tracing.enabled) {
          process.env.LANGCHAIN_TRACING_V2 = 'true';
        }
        if (config.tracing.apiKey) process.env.LANGCHAIN_API_KEY = config.tracing.apiKey;
        if (config.tracing.project) process.env.LANGCHAIN_PROJECT = config.tracing.project;
        if (config.tracing.endpoint) process.env.LANGCHAIN_ENDPOINT = config.tracing.endpoint;
        if (config.tracing.runName) process.env.ARCHDOC_RUN_NAME = config.tracing.runName;
      }
    }

    return config;
  } catch (error) {
    console.warn(
      `Warning: Failed to parse ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Get configuration file path for a project
 *
 * @param projectPath - Project directory
 * @returns Path to config file (may not exist)
 */
export function getConfigPath(projectPath: string = process.cwd()): string {
  return path.join(projectPath, CONFIG_FILE);
}

/**
 * Check if configuration exists for a project
 *
 * @param projectPath - Project directory
 * @returns True if config file exists
 */
export function hasConfig(projectPath: string = process.cwd()): boolean {
  const rootConfig = path.join(projectPath, CONFIG_FILE);
  const archDocsConfig = path.join(projectPath, '.arch-docs', CONFIG_FILE);

  return fs.existsSync(rootConfig) || fs.existsSync(archDocsConfig);
}
