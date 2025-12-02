/**
 * Configuration Detector for MCP Server
 * Intelligently detects and prioritizes configuration sources
 * Handles caching, validation, and environment variable overrides
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { ArchDocConfig } from '../utils/config-loader';

// Configuration detection utilities for MCP server

export interface ConfigSource {
  type: 'file' | 'environment' | 'none';
  provider?: string;
  model?: string;
  apiKey?: string;
  source?: string;
  hasApiKey: boolean;
  fullConfig?: ArchDocConfig; // Cache the full loaded config
}

/**
 * Detect configuration sources available
 */
export async function detectConfigSources(projectPath: string): Promise<{
  fileConfig: ConfigSource;
  envConfig: ConfigSource;
  recommendation: string;
}> {
  const configPath = path.join(projectPath, '.archdoc.config.json');

  // Check file-based config
  const fileConfig = await checkFileConfig(configPath);

  // Check environment-based config
  const envConfig = checkEnvironmentConfig();

  // Generate recommendation
  const recommendation = generateRecommendation(fileConfig, envConfig);

  return {
    fileConfig,
    envConfig,
    recommendation,
  };
}

/**
 * Check if .archdoc.config.json exists and is valid
 * Also loads and caches the full config to avoid double reads
 */
async function checkFileConfig(configPath: string): Promise<ConfigSource> {
  try {
    // Try root config first
    let filePath = configPath;
    let content: string;

    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      // Fallback to .arch-docs/.archdoc.config.json
      filePath = path.join(path.dirname(configPath), '.arch-docs', '.archdoc.config.json');
      content = await fs.readFile(filePath, 'utf-8');
    }

    const fullConfig = JSON.parse(content) as ArchDocConfig;

    // Validate config structure
    const validationError = validateConfigStructure(fullConfig);
    if (validationError) {
      return {
        type: 'none',
        hasApiKey: false,
      };
    }

    const provider = fullConfig.llm?.provider;
    const model = fullConfig.llm?.model;
    const apiKey = fullConfig.apiKeys?.[provider as keyof typeof fullConfig.apiKeys] || undefined;
    const hasApiKey = !!apiKey;

    return {
      type: 'file',
      provider,
      model,
      apiKey: apiKey ? maskApiKey(apiKey) : undefined,
      source: filePath,
      hasApiKey,
      fullConfig, // Cache the full config for later use
    };
  } catch (_error) {
    return {
      type: 'none',
      hasApiKey: false,
    };
  }
}

/**
 * Check environment variables for configuration
 */
function checkEnvironmentConfig(): ConfigSource {
  const provider = process.env.DEFAULT_LLM_PROVIDER || detectProviderFromEnv();
  const model = process.env.DEFAULT_LLM_MODEL;
  const apiKey = getApiKeyForProvider(provider);
  const hasApiKey = !!apiKey;

  if (!hasApiKey) {
    return {
      type: 'none',
      hasApiKey: false,
    };
  }

  return {
    type: 'environment',
    provider,
    model,
    apiKey: apiKey ? maskApiKey(apiKey) : undefined,
    source: 'Environment Variables',
    hasApiKey: true,
  };
}

/**
 * Detect which provider is being used from environment variables
 */
function detectProviderFromEnv(): string {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GOOGLE_API_KEY) return 'google';
  if (process.env.XAI_API_KEY) return 'xai';
  return 'anthropic'; // default
}

/**
 * Get API key for a specific provider
 */
function getApiKeyForProvider(provider?: string): string | undefined {
  switch (provider?.toLowerCase()) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'google':
      return process.env.GOOGLE_API_KEY;
    case 'xai':
      return process.env.XAI_API_KEY;
    case 'anthropic':
    default:
      return process.env.ANTHROPIC_API_KEY;
  }
}

/**
 * Generate recommendation based on available configs
 */
function generateRecommendation(fileConfig: ConfigSource, envConfig: ConfigSource): string {
  // Both available: file config takes precedence
  if (fileConfig.hasApiKey && envConfig.hasApiKey) {
    return 'file'; // Use .archdoc.config.json (explicit project config)
  }

  // Only file config
  if (fileConfig.hasApiKey) {
    return 'file';
  }

  // Only environment config
  if (envConfig.hasApiKey) {
    return 'environment';
  }

  // Neither available
  return 'none';
}

/**
 * Validate configuration structure has required fields
 */
function validateConfigStructure(config: ArchDocConfig): string | null {
  // Must have llm section with provider
  if (!config.llm?.provider) {
    return 'Missing or invalid llm.provider in config';
  }

  // Must have apiKeys section with at least one key
  if (!config.apiKeys || Object.keys(config.apiKeys).length === 0) {
    return 'Missing apiKeys section in config';
  }

  return null;
}

/**
 * Mask API key for display (show first 10 and last 4 chars)
 */
function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 14) {
    return '***';
  }
  return apiKey.substring(0, 10) + '...' + apiKey.slice(-4);
}

/**
 * Format configuration status for display
 */
export function formatConfigStatus(
  fileConfig: ConfigSource,
  envConfig: ConfigSource,
  recommendation: string,
): string {
  let status = '';

  status += '**Configuration Detection Results:**\n\n';

  // File config status
  if (fileConfig.hasApiKey) {
    status += `✅ **Project Config (.archdoc.config.json)**\n`;
    status += `   Provider: ${fileConfig.provider}\n`;
    status += `   Model: ${fileConfig.model}\n`;
    status += `   API Key: ${fileConfig.apiKey}\n\n`;
  } else {
    status += `❌ **Project Config (.archdoc.config.json)** - Not found\n\n`;
  }

  // Environment config status
  if (envConfig.hasApiKey) {
    status += `✅ **Editor Environment Variables**\n`;
    status += `   Provider: ${envConfig.provider}\n`;
    status += `   Model: ${envConfig.model || 'Not set'}\n`;
    status += `   API Key: ${envConfig.apiKey}\n`;
    status += `   Source: ${envConfig.source}\n\n`;
  } else {
    status += `❌ **Editor Environment Variables** - Not found\n\n`;
  }

  // Recommendation
  if (recommendation === 'file') {
    status += `**📋 Using:** Project Config (.archdoc.config.json)\n`;
    status += `   This takes precedence over editor environment variables.\n`;
  } else if (recommendation === 'environment') {
    status += `**🔌 Using:** Editor Environment Variables\n`;
    status += `   No project config found. Using editor's credentials.\n`;
    status += `   💡 Tip: Run \`archdoc config --init\` to create a project config\n`;
  } else {
    status += `**❌ No Configuration Available**\n`;
    status += `   Neither project config nor environment variables found.\n`;
    status += `   Options:\n`;
    status += `   1. Run: \`archdoc config --init\` (create project config)\n`;
    status += `   2. Set API key in your editor (ANTHROPIC_API_KEY, etc.)\n`;
  }

  return status;
}

/**
 * Build config from environment variables (only include defined keys)
 */
export function buildApiKeysFromEnv(): Record<string, string> {
  const apiKeys: Record<string, string> = {};

  if (process.env.ANTHROPIC_API_KEY) {
    apiKeys.anthropic = process.env.ANTHROPIC_API_KEY;
  }
  if (process.env.OPENAI_API_KEY) {
    apiKeys.openai = process.env.OPENAI_API_KEY;
  }
  if (process.env.GOOGLE_API_KEY) {
    apiKeys.google = process.env.GOOGLE_API_KEY;
  }
  if (process.env.XAI_API_KEY) {
    apiKeys.xai = process.env.XAI_API_KEY;
  }

  return apiKeys;
}

/**
 * Build embeddings config from environment variables (only include defined keys)
 */
export function buildEmbeddingsFromEnv(): Record<string, string> {
  const embeddings: Record<string, string> = {};

  if (process.env.OPENAI_EMBEDDINGS_KEY) {
    embeddings.openai = process.env.OPENAI_EMBEDDINGS_KEY;
  }
  if (process.env.GOOGLE_EMBEDDINGS_KEY) {
    embeddings.google = process.env.GOOGLE_EMBEDDINGS_KEY;
  }

  return embeddings;
}

/**
 * Get default model for a provider
 */
export function getDefaultModelForProvider(provider?: string): string {
  switch (provider?.toLowerCase()) {
    case 'openai':
      return 'gpt-4o';
    case 'google':
      return 'gemini-2.0-flash-exp';
    case 'xai':
      return 'grok-2-latest';
    case 'anthropic':
    default:
      return 'claude-sonnet-4-20250514';
  }
}

/**
 * Check if both file and environment configs are available
 */
export function bothConfigsAvailable(fileConfig: ConfigSource, envConfig: ConfigSource): boolean {
  return fileConfig.hasApiKey && envConfig.hasApiKey;
}

/**
 * Build complete config from environment variables
 * Merges with sensible defaults for missing fields
 */
export function buildConfigFromEnv(): ArchDocConfig {
  const provider = process.env.DEFAULT_LLM_PROVIDER || detectProviderFromEnv();
  const model = process.env.DEFAULT_LLM_MODEL || getDefaultModelForProvider(provider);

  return {
    llm: {
      provider,
      model,
    },
    apiKeys: buildApiKeysFromEnv(),
    embeddings: buildEmbeddingsFromEnv(),
    // Search mode can be overridden via env variables
    searchMode: {
      mode: (process.env.DEFAULT_SEARCH_MODE as 'vector' | 'keyword') || 'keyword',
      strategy:
        (process.env.DEFAULT_SEARCH_STRATEGY as 'vector' | 'graph' | 'hybrid' | 'smart') || 'smart',
      embeddingsProvider:
        (process.env.DEFAULT_EMBEDDINGS_PROVIDER as 'local' | 'openai' | 'google') || 'local',
    },
    // Preserve other default settings from a minimal config
    output: {
      directory: process.env.DEFAULT_OUTPUT_DIR || './docs',
      format: (process.env.DEFAULT_OUTPUT_FORMAT as 'markdown' | 'json' | 'html') || 'markdown',
    },
    analysis: {
      depth: process.env.DEFAULT_ANALYSIS_DEPTH || 'comprehensive',
      maxCostDollars: parseFloat(process.env.DEFAULT_MAX_COST_DOLLARS || '10'),
    },
  };
}
