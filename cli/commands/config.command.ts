import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import { Logger } from '../../src/utils/logger';

const logger = new Logger('ConfigCommand');

interface ConfigOptions {
  set?: string;
  get?: string;
  list?: boolean;
  init?: boolean;
  reset?: boolean;
}

const CONFIG_FILE = '.archdoc.config.json';
const DEFAULT_OUTPUT_DIR = '.arch-docs';

const DEFAULT_CONFIG = {
  apiKeys: {
    anthropic: '',
    openai: '',
    google: '',
    xai: '',
    embeddings: '', // Separate API key for vector search embeddings (if not using local)
  },
  llm: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.2,
    maxTokens: 4096,
    embeddingsProvider: 'local', // Default to FREE local embeddings
  },
  scan: {
    maxFiles: 1000,
    maxFileSize: 1048576,
    respectGitignore: true,
    excludePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/*.min.js',
      '**/*.map',
    ],
    includeHidden: false,
    followSymlinks: false,
  },
  agents: {
    enabled: [
      'file-structure',
      'dependency-analyzer',
      'pattern-detector',
      'flow-visualization',
      'schema-generator',
      'architecture-analyzer',
    ],
    parallel: true,
    timeout: 300000,
  },
  refinement: {
    enabled: true,
    maxIterations: 5,
    clarityThreshold: 80,
    minImprovement: 10,
  },
  output: {
    directory: DEFAULT_OUTPUT_DIR,
    format: 'markdown',
    clean: true,
    splitFiles: true,
    includeTOC: true,
    includeMetadata: true,
  },
  tracing: {
    enabled: false,
    apiKey: '',
    project: 'archdoc-analysis',
    endpoint: 'https://api.smith.langchain.com',
  },
};

/**
 * Find existing config file in root directory only
 */
function findConfigPath(): string | null {
  const rootConfig = path.join(process.cwd(), CONFIG_FILE);

  if (fs.existsSync(rootConfig)) {
    return rootConfig;
  }
  return null;
}

async function initializeConfig(): Promise<void> {
  logger.info('🚀 Welcome to ArchDoc Setup!\n');

  // Always create config in root directory
  const configPath = path.join(process.cwd(), CONFIG_FILE);
  logger.info(`Creating configuration in: ${CONFIG_FILE}`);

  // Check if config already exists
  if (fs.existsSync(configPath)) {
    const { shouldOverwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldOverwrite',
        message: 'Config already exists. Overwrite?',
        default: false,
      },
    ]);

    if (!shouldOverwrite) {
      logger.info('Setup cancelled.');
      return;
    }
  }

  // Start with default config
  const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  // Interactive API key setup - MANDATORY
  logger.info('\n📋 LLM Provider Selection (REQUIRED)\n');

  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Choose your LLM provider:',
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
    },
  ]);

  // Provider-specific configuration with available models
  const providerInfo = {
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

  const info = providerInfo[provider as keyof typeof providerInfo];

  // Select model for the chosen provider
  logger.info(`\n🎯 Available ${provider} models:\n`);

  const { selectedModel } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedModel',
      message: `Choose ${provider} model:`,
      choices: info.models,
      default: info.defaultModel,
    },
  ]);

  // Prompt for API key with validation
  logger.info(`\nGet your API key at: ${info.url}`);

  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: `Enter ${provider} API key (${info.keyFormat}):`,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'API key is required';
        }
        return true;
      },
      mask: '*',
    },
  ]);

  // Configure provider
  config.apiKeys[provider] = apiKey.trim();
  config.llm.provider = provider;
  config.llm.model = selectedModel;

  logger.info(`\n✅ Configured to use: ${provider} (${selectedModel})`);

  // Vector search setup (optional - for embeddings)
  logger.info('\n\n🔍 Vector Search Configuration (OPTIONAL)\n');
  logger.info('Vector search uses embeddings for semantic file matching.');
  logger.info("It's more accurate but slower than keyword search, and requires an API key.\n");

  const { enableVectorSearch } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableVectorSearch',
      message: 'Enable vector search with embeddings?',
      default: false,
    },
  ]);

  if (enableVectorSearch) {
    const { embeddingsProvider } = await inquirer.prompt([
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
          {
            name: 'Cohere - Coming soon (requires @langchain/cohere package)',
            value: 'cohere',
          },
          {
            name: 'Voyage AI - Coming soon (requires @langchain/community package)',
            value: 'voyage',
          },
          {
            name: 'HuggingFace - Coming soon (requires @langchain/community package)',
            value: 'huggingface',
          },
        ],
        default: 'local',
      },
    ]);

    // Only prompt for API key if not using local/free embeddings
    if (embeddingsProvider !== 'local' && embeddingsProvider !== 'huggingface') {
      const providerUrls: Record<string, string> = {
        openai: 'https://platform.openai.com/',
        google: 'https://cloud.google.com/vertex-ai',
        cohere: 'https://dashboard.cohere.com/',
        voyage: 'https://www.voyageai.com/',
      };

      logger.info(`\nGet your embeddings API key at: ${providerUrls[embeddingsProvider]}`);

      const { embeddingsApiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'embeddingsApiKey',
          message: `Enter ${embeddingsProvider} embeddings API key:`,
          validate: (input: string) => {
            if (!input || input.trim().length === 0) {
              return 'Embeddings API key is required for vector search';
            }
            return true;
          },
          mask: '*',
        },
      ]);

      config.apiKeys.embeddings = embeddingsApiKey.trim();
    } else {
      logger.info(`\n✅ Using ${embeddingsProvider} embeddings - no API key required`);
    }

    config.llm.embeddingsProvider = embeddingsProvider;
    logger.info(`✅ Vector search enabled with ${embeddingsProvider} embeddings`);

    // Warn about unsupported providers
    if (['cohere', 'voyage', 'huggingface'].includes(embeddingsProvider)) {
      logger.warn(`\n⚠️  ${embeddingsProvider} embeddings support is not yet fully implemented.`);
      logger.warn('   OpenAI and Google providers are currently supported.');
      logger.warn('   You can still use vector search by setting EMBEDDINGS_PROVIDER=openai');
    }

    logger.info('\n   Use --search-mode vector when running archdoc analyze');
    logger.info(`   Set EMBEDDINGS_PROVIDER=${embeddingsProvider} to use this provider`);
  } else {
    logger.info(
      '   Skipped - you can enable it later with: archdoc config --set llm.embeddingsProvider=openai',
    );
  }

  // LangSmith tracing setup (optional)
  const { enableTracing } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableTracing',
      message: 'Enable LangSmith tracing for debugging?',
      default: false,
    },
  ]);

  if (enableTracing) {
    const tracingAnswers = await inquirer.prompt([
      {
        type: 'password',
        name: 'langchainKey',
        message: 'Enter LangSmith API key (lsv2_pt_...):',
        mask: '*',
      },
      {
        type: 'input',
        name: 'projectName',
        message: 'Enter LangSmith project name:',
        default: 'archdoc-analysis',
      },
    ]);

    config.tracing.enabled = true;
    if (tracingAnswers.langchainKey.trim()) {
      config.tracing.apiKey = tracingAnswers.langchainKey.trim();
    }
    if (tracingAnswers.projectName.trim()) {
      config.tracing.project = tracingAnswers.projectName.trim();
    }
  }

  // Save configuration
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  logger.info(`\n✅ Created ${path.relative(process.cwd(), configPath)}`);

  // Suggest adding config file to .gitignore (contains API keys)
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  let shouldAddGitignore = false;
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignoreContent.includes('.archdoc.config.json')) {
      const { addToGitignore } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addToGitignore',
          message: 'Add .archdoc.config.json to .gitignore? (recommended - contains API keys)',
          default: true,
        },
      ]);
      shouldAddGitignore = addToGitignore;
    }
  }

  if (shouldAddGitignore) {
    fs.appendFileSync(
      gitignorePath,
      '\n# ArchDoc configuration (contains API keys)\n.archdoc.config.json\n',
    );
    logger.info('✅ Added .archdoc.config.json to .gitignore');
  }

  logger.info('\n🎉 Setup complete!');
  logger.info('\n📝 Configuration Summary:');
  logger.info(`  • Config file: ${path.relative(process.cwd(), configPath)}`);
  logger.info(`  • LLM Provider: ${config.llm.provider} (${config.llm.model})`);
  logger.info(`  • Tracing: ${config.tracing.enabled ? 'Enabled' : 'Disabled'}`);
  logger.info('\n💡 Tips:');
  logger.info('  • Change provider: archdoc config --set llm.provider=openai');
  logger.info('  • Change model: archdoc config --set llm.model=o1-mini');
  logger.info('  • Update API key: archdoc config --set apiKeys.anthropic=sk-ant-...');
  logger.info('  • View settings: archdoc config --list');
  logger.info('\nNext steps:');
  logger.info('  1. Run: archdoc analyze');
  logger.info('  2. View docs in: .arch-docs/');
}

function listConfig(): void {
  const configPath = findConfigPath();

  if (!configPath) {
    logger.error(`❌ ${CONFIG_FILE} not found. Run: archdoc config --init`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Mask API keys for security
  const maskedConfig = JSON.parse(JSON.stringify(config));
  if (maskedConfig.apiKeys) {
    Object.keys(maskedConfig.apiKeys).forEach((key) => {
      if (maskedConfig.apiKeys[key]) {
        maskedConfig.apiKeys[key] = '***' + maskedConfig.apiKeys[key].slice(-4);
      }
    });
  }
  if (maskedConfig.tracing?.apiKey) {
    maskedConfig.tracing.apiKey = '***' + maskedConfig.tracing.apiKey.slice(-4);
  }

  logger.info(`📋 Configuration (${path.relative(process.cwd(), configPath)}):\n`);
  logger.info(JSON.stringify(maskedConfig, null, 2));
}

function getConfigValue(key: string): void {
  const configPath = findConfigPath();

  if (!configPath) {
    logger.error(`❌ ${CONFIG_FILE} not found. Run: archdoc config --init`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const keys = key.split('.');
  let value: Record<string, unknown> | string = config;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k] as Record<string, unknown> | string;
    } else {
      logger.error(`❌ Key not found: ${key}`);
      process.exit(1);
    }
  }

  logger.info(JSON.stringify(value, null, 2));
}

function setConfigValue(keyValue: string): void {
  const configPath = findConfigPath();

  if (!configPath) {
    logger.error(`❌ ${CONFIG_FILE} not found. Run: archdoc config --init`);
    process.exit(1);
  }

  const [key, ...valueParts] = keyValue.split('=');
  const valueStr = valueParts.join('=');

  if (!key || !valueStr) {
    logger.error('❌ Invalid format. Use: key=value (e.g., llm.temperature=0.5)');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const keys = key.split('.');
  let current: Record<string, unknown> = config;

  // Navigate to parent object
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!current[k] || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k] as Record<string, unknown>;
  }

  // Parse value
  let value: unknown;
  try {
    value = JSON.parse(valueStr);
  } catch {
    value = valueStr;
  }

  // Set value
  current[keys[keys.length - 1]] = value;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  logger.info(`✅ Set ${key} = ${JSON.stringify(value)}`);
  logger.info(`   in ${path.relative(process.cwd(), configPath)}`);
}

function resetConfig(): void {
  const configPath = findConfigPath();

  if (!configPath) {
    logger.error(`❌ ${CONFIG_FILE} not found. Run: archdoc config --init`);
    process.exit(1);
  }

  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  logger.info(`✅ Reset ${path.relative(process.cwd(), configPath)} to defaults`);
}

export function registerConfigCommand(program: Command): void {
  program
    .command('config')
    .description('Manage ArchDoc configuration')
    .option('--init', 'Initialize configuration with interactive setup')
    .option('--list', 'List all configuration values (API keys masked)')
    .option('--get <key>', 'Get specific configuration value (e.g., llm.temperature)')
    .option('--set <key=value>', 'Set configuration value (e.g., llm.temperature=0.5)')
    .option('--reset', 'Reset configuration to defaults')
    .action(async (options: ConfigOptions) => {
      try {
        if (options.init) {
          await initializeConfig();
        } else if (options.list) {
          listConfig();
        } else if (options.get) {
          getConfigValue(options.get);
        } else if (options.set) {
          setConfigValue(options.set);
        } else if (options.reset) {
          resetConfig();
        } else {
          logger.info('Usage:');
          logger.info('  archdoc config --init                    # Interactive setup');
          logger.info('  archdoc config --list                    # Show all settings');
          logger.info('  archdoc config --get llm.model           # Get specific value');
          logger.info('  archdoc config --set llm.temperature=0.5 # Set value');
          logger.info('  archdoc config --reset                   # Reset to defaults');
        }
      } catch (error) {
        logger.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
