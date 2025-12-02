/**
 * Shared configuration prompts for CLI and MCP setup
 */

import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';

export interface ConfigAnswers {
  provider: 'anthropic' | 'openai' | 'google' | 'xai';
  selectedModel: string;
  apiKey: string;
  enableVectorSearch: boolean;
  embeddingsProvider?: string;
  embeddingsApiKey?: string;
  strategy?: 'vector' | 'graph' | 'hybrid' | 'smart';
  enableTracing: boolean;
  langsmithKey?: string;
  langsmithProject?: string;
}

export interface ExistingConfig {
  llm?: {
    provider?: string;
    model?: string;
    embeddingsProvider?: string;
  };
  searchMode?: {
    strategy?: string;
    embeddingsProvider?: string;
  };
  apiKeys?: Record<string, string>;
  embeddings?: Record<string, string>;
  tracing?: {
    enabled?: boolean;
    apiKey?: string;
    project?: string;
  };
}

const PROVIDER_INFO = {
  anthropic: {
    defaultModel: 'claude-sonnet-4-5-20250929',
    models: [
      {
        name: 'claude-sonnet-4-5-20250929 (recommended) - Latest, best quality',
        value: 'claude-sonnet-4-5-20250929',
      },
      {
        name: 'claude-haiku-4-5-20251001 - Fastest, most affordable',
        value: 'claude-haiku-4-5-20251001',
      },
      { name: 'claude-opus-4-1-20250805 - Most powerful', value: 'claude-opus-4-1-20250805' },
      {
        name: 'claude-sonnet-4-20250514 - Previous generation',
        value: 'claude-sonnet-4-20250514',
      },
    ],
    keyFormat: 'sk-ant-...',
    url: 'https://console.anthropic.com/',
  },
  openai: {
    defaultModel: 'gpt-4o-mini',
    models: [
      { name: 'gpt-4o-mini (recommended) - Fast and cheap', value: 'gpt-4o-mini' },
      { name: 'gpt-4o - Multimodal flagship', value: 'gpt-4o' },
      { name: 'gpt-4-turbo - GPT-4 Turbo', value: 'gpt-4-turbo' },
      { name: 'gpt-4 - Legacy GPT-4', value: 'gpt-4' },
      { name: 'o1-mini - Reasoning (Tier 5 required)', value: 'o1-mini' },
      { name: 'o1-preview - Advanced reasoning (Tier 5 required)', value: 'o1-preview' },
    ],
    keyFormat: 'sk-...',
    url: 'https://platform.openai.com/',
  },
  google: {
    defaultModel: 'gemini-2.5-pro',
    models: [
      { name: 'gemini-2.5-pro (recommended) - Best reasoning', value: 'gemini-2.5-pro' },
      { name: 'gemini-2.5-flash - Fastest multimodal', value: 'gemini-2.5-flash' },
      { name: 'gemini-2.5-flash-lite - Most efficient', value: 'gemini-2.5-flash-lite' },
      { name: 'gemini-1.5-pro - Previous generation', value: 'gemini-1.5-pro' },
    ],
    keyFormat: 'AIza...',
    url: 'https://ai.google.dev/',
  },
  xai: {
    defaultModel: 'grok-3-beta',
    models: [
      {
        name: 'grok-3-beta (recommended) - Latest with real-time insights',
        value: 'grok-3-beta',
      },
      { name: 'grok-2 - Stable and reliable', value: 'grok-2' },
    ],
    keyFormat: 'xai-...',
    url: 'https://console.x.ai/',
  },
};

/**
 * Load existing config from project directory
 */
export function loadExistingConfig(projectPath: string): ExistingConfig | null {
  const configPath = path.join(projectPath, '.archdoc.config.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (_error) {
    return null;
  }
}

/**
 * Prompt for LLM provider and model selection
 */
export async function promptLLMConfig(
  existingConfig: ExistingConfig | null,
  isUpdate: boolean,
): Promise<Pick<ConfigAnswers, 'provider' | 'selectedModel' | 'apiKey'>> {
  const hasExisting = !!existingConfig;

  // Provider selection
  const { provider } = await inquirer.prompt<{ provider: ConfigAnswers['provider'] }>([
    {
      type: 'list',
      name: 'provider',
      message: isUpdate ? 'Update LLM provider:' : 'Choose your LLM provider:',
      choices: [
        {
          name: 'Anthropic Claude (recommended) - Best quality and accuracy',
          value: 'anthropic',
          short: 'Anthropic',
        },
        {
          name: 'OpenAI GPT - Latest and most powerful',
          value: 'openai',
          short: 'OpenAI',
        },
        {
          name: 'Google Gemini - Strong reasoning and large context',
          value: 'google',
          short: 'Google',
        },
        {
          name: 'xAI Grok - Real-time insights and unique perspective',
          value: 'xai',
          short: 'xAI',
        },
      ],
      default: existingConfig?.llm?.provider || 'anthropic',
    },
  ]);

  const info = PROVIDER_INFO[provider];

  // Show available models info
  console.log(`\n🎯 Available ${provider} models:\n`);

  // Model selection
  const { selectedModel } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedModel',
      message: `Choose ${provider} model:`,
      choices: info.models,
      default: existingConfig?.llm?.model || info.defaultModel,
    },
  ]);

  // API key prompt with URL guidance
  const existingKey = existingConfig?.apiKeys?.[provider];
  if (!existingKey || !hasExisting) {
    console.log(`\nGet your API key at: ${info.url}`);
  }

  const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
    {
      type: 'password',
      name: 'apiKey',
      message:
        hasExisting && existingKey
          ? `Update ${provider.toUpperCase()} API key (press Enter to keep existing):`
          : `Enter ${provider} API key (${info.keyFormat}):`,
      validate: (input: string) => {
        // Allow empty if we have existing config
        if (hasExisting && existingKey && !input) {
          return true;
        }
        if (!input || input.trim().length === 0) {
          return 'API key is required';
        }
        return true;
      },
      mask: '*',
    },
  ]);

  return { provider, selectedModel, apiKey: apiKey.trim() || existingKey || '' };
}

/**
 * Prompt for vector search configuration (optional)
 */
export async function promptVectorSearchConfig(
  existingConfig: ExistingConfig | null,
  verbose = true,
): Promise<
  Pick<ConfigAnswers, 'enableVectorSearch' | 'embeddingsProvider' | 'embeddingsApiKey' | 'strategy'>
> {
  if (verbose) {
    console.log('\n🔍 Vector Search Configuration (OPTIONAL)\n');
    console.log('Vector search uses embeddings for semantic file matching.');
    console.log("It's more accurate but slower than keyword search, and may require an API key.\n");
  }

  const { enableVectorSearch } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableVectorSearch',
      message: 'Enable vector search with embeddings?',
      default:
        !!existingConfig?.llm?.embeddingsProvider &&
        existingConfig.llm.embeddingsProvider !== 'local',
    },
  ]);

  if (!enableVectorSearch) {
    return { enableVectorSearch: false, strategy: 'smart' };
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'embeddingsProvider',
      message: 'Choose embeddings provider:',
      choices: [
        {
          name: 'Local (FREE, recommended) - TF-IDF embeddings, no API key, works offline',
          value: 'local',
        },
        {
          name: 'OpenAI - text-embedding-3-small, $0.02/1M tokens, best accuracy',
          value: 'openai',
        },
        {
          name: 'Google Vertex AI - text-embedding-004, affordable and efficient',
          value: 'google',
        },
      ],
      default: existingConfig?.llm?.embeddingsProvider || 'local',
    },
    {
      type: 'list',
      name: 'strategy',
      message: 'Choose search strategy:',
      choices: [
        {
          name: 'Smart (recommended) - Automatically chooses best strategy',
          value: 'smart',
        },
        {
          name: 'Hybrid - Combines semantic similarity + structural relationships',
          value: 'hybrid',
        },
        {
          name: 'Vector - Pure semantic similarity search',
          value: 'vector',
        },
        {
          name: 'Graph - Structural relationships only',
          value: 'graph',
        },
      ],
      default: existingConfig?.searchMode?.strategy || 'smart',
    },
  ]);

  const embeddingsProvider = answers.embeddingsProvider;
  const strategy = answers.strategy;

  // Only prompt for API key if not using local embeddings
  let embeddingsApiKey: string | undefined;
  if (embeddingsProvider !== 'local') {
    const existingKey = existingConfig?.embeddings?.[embeddingsProvider];
    const { key } = await inquirer.prompt<{ key: string }>([
      {
        type: 'password',
        name: 'key',
        message: existingKey
          ? `Update ${embeddingsProvider} embeddings API key (press Enter to keep existing):`
          : `Enter ${embeddingsProvider} embeddings API key:`,
        validate: (input: string) => {
          if (existingKey && !input) {
            return true;
          }
          if (!input || input.trim().length === 0) {
            return 'Embeddings API key is required for vector search';
          }
          return true;
        },
        mask: '*',
      },
    ]);

    embeddingsApiKey = key.trim() || existingKey;
  }

  return { enableVectorSearch: true, embeddingsProvider, embeddingsApiKey, strategy };
}

/**
 * Prompt for LangSmith tracing configuration (optional)
 */
export async function promptTracingConfig(
  existingConfig: ExistingConfig | null,
  projectPath: string,
): Promise<Pick<ConfigAnswers, 'enableTracing' | 'langsmithKey' | 'langsmithProject'>> {
  const { enableTracing } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableTracing',
      message: 'Enable LangSmith tracing for debugging?',
      default: existingConfig?.tracing?.enabled || false,
    },
  ]);

  if (!enableTracing) {
    return { enableTracing: false };
  }

  console.log('\nLangSmith allows you to trace and debug LLM calls.');
  console.log('Sign up at: https://smith.langchain.com/\n');

  const existingKey = existingConfig?.tracing?.apiKey;
  const answers = await inquirer.prompt<{ langsmithKey: string; langsmithProject: string }>([
    {
      type: 'password',
      name: 'langsmithKey',
      message: existingKey
        ? 'Update LangSmith API key (press Enter to keep existing):'
        : 'Enter LangSmith API key (lsv2_pt_...):',
      validate: (input: string) => {
        if (existingKey && !input) {
          return true;
        }
        if (input.trim() && !input.startsWith('lsv2_pt_')) {
          return 'LangSmith API keys should start with "lsv2_pt_"';
        }
        return true; // Optional
      },
      mask: '*',
    },
    {
      type: 'input',
      name: 'langsmithProject',
      message: 'Enter LangSmith project name:',
      default: existingConfig?.tracing?.project || path.basename(projectPath),
    },
  ]);

  return {
    enableTracing: true,
    langsmithKey: answers.langsmithKey.trim() || existingKey,
    langsmithProject: answers.langsmithProject.trim(),
  };
}

/**
 * Run full configuration prompts
 */
export async function promptFullConfig(
  projectPath: string,
  options: {
    includeVectorSearch?: boolean;
    includeTracing?: boolean;
    verbose?: boolean;
  } = {},
): Promise<{ answers: ConfigAnswers; existingConfig: ExistingConfig | null }> {
  const { includeVectorSearch = true, includeTracing = true, verbose = true } = options;

  const existingConfig = loadExistingConfig(projectPath);
  const isUpdate = !!existingConfig;

  // LLM configuration
  const llmConfig = await promptLLMConfig(existingConfig, isUpdate);

  // Vector search configuration (optional)
  let vectorConfig: Pick<
    ConfigAnswers,
    'enableVectorSearch' | 'embeddingsProvider' | 'embeddingsApiKey'
  >;
  if (includeVectorSearch) {
    vectorConfig = await promptVectorSearchConfig(existingConfig, verbose);
  } else {
    vectorConfig = { enableVectorSearch: false };
  }

  // Tracing configuration (optional)
  let tracingConfig: Pick<ConfigAnswers, 'enableTracing' | 'langsmithKey' | 'langsmithProject'>;
  if (includeTracing) {
    tracingConfig = await promptTracingConfig(existingConfig, projectPath);
  } else {
    tracingConfig = { enableTracing: false };
  }

  return {
    answers: {
      ...llmConfig,
      ...vectorConfig,
      ...tracingConfig,
    },
    existingConfig,
  };
}
