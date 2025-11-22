import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import { Logger } from '../../src/utils/logger';
import { promptFullConfig } from '../utils/config-prompts';
import { detectKeys } from '../../src/utils/key-detector';

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
  },
  llm: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.2,
    maxTokens: 4096,
  },
  scan: {
    maxFiles: 10000,
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
  searchMode: {
    mode: 'keyword',
    embeddingsProvider: 'local',
    strategy: 'smart',
    vectorWeight: 0.6,
    graphWeight: 0.4,
    includeRelatedFiles: true,
    maxDepth: 2,
    similarityThreshold: 0.3,
    topK: 10,
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

  const projectPath = process.cwd();
  const configPath = path.join(projectPath, CONFIG_FILE);

  // Check if config already exists
  const existingConfig = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    : null;

  if (existingConfig) {
    logger.info('⚠️  Found existing configuration:\n');
    logger.info(`   Provider: ${existingConfig.llm?.provider || 'Not set'}`);
    logger.info(`   Model: ${existingConfig.llm?.model || 'Not set'}`);
    logger.info(`   Vector Search: ${existingConfig.searchMode?.embeddingsProvider || 'Not set'}`);
    logger.info(`   Tracing: ${existingConfig.tracing?.enabled ? 'Enabled' : 'Disabled'}\n`);

    const { shouldUpdate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldUpdate',
        message: 'Update configuration?',
        default: true,
      },
    ]);

    if (!shouldUpdate) {
      logger.info('Setup cancelled.');
      return;
    }

    logger.info('Updating configuration...\n');
  } else {
    logger.info(`Creating configuration in: ${CONFIG_FILE}`);
  }
  // Use shared prompt utility for all configuration
  logger.info('\n📋 LLM Provider Selection (REQUIRED)\n');

  // Detect keys if not updating existing config
  let detectedKey;
  if (!existingConfig) {
    detectedKey = await detectKeys();
    if (detectedKey) {
        logger.info(`✨ Detected ${detectedKey.provider} API key from ${detectedKey.source}`);
    }
  }

  const { answers, existingConfig: loadedConfig } = await promptFullConfig(projectPath, {
    includeVectorSearch: true,
    includeTracing: true,
    verbose: true,
    detectedKey: detectedKey || undefined,
  });

  // Start with default config or existing config
  const config = loadedConfig
    ? JSON.parse(JSON.stringify(loadedConfig))
    : JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  // Apply answers from shared prompts
  config.llm.provider = answers.provider;
  config.llm.model = answers.selectedModel;
  if (answers.apiKey) {
    config.apiKeys[answers.provider] = answers.apiKey;
  }

  logger.info(`\n✅ Configured to use: ${answers.provider} (${answers.selectedModel})`);

  // Apply vector search configuration
  if (answers.enableVectorSearch && answers.embeddingsProvider) {
    config.searchMode.mode = 'vector';
    config.searchMode.embeddingsProvider = answers.embeddingsProvider;
    if (answers.strategy) {
      config.searchMode.strategy = answers.strategy;
    }
    // Only add embeddings key if an API key was provided (not needed for local)
    if (answers.embeddingsApiKey) {
      if (!config.apiKeys.embeddings) {
        config.apiKeys.embeddings = '';
      }
      config.apiKeys.embeddings = answers.embeddingsApiKey;
    }
    logger.info(`✅ Vector search enabled with ${answers.embeddingsProvider} embeddings`);
    logger.info(`✅ Search strategy: ${answers.strategy || 'smart'}`);

    if (['cohere', 'voyage', 'huggingface'].includes(answers.embeddingsProvider)) {
      logger.warn(
        `\n⚠️  ${answers.embeddingsProvider} embeddings support is not yet fully implemented.`,
      );
      logger.warn('   OpenAI and Google providers are currently supported.');
    }

    logger.info('\n   Use --search-mode vector when running archdoc analyze');
    logger.info(`   Set EMBEDDINGS_PROVIDER=${answers.embeddingsProvider} to use this provider`);
  } else {
    logger.info(
      '   Skipped - you can enable it later with: archdoc config --set searchMode.embeddingsProvider=openai',
    );
  }

  // Apply tracing configuration
  if (answers.enableTracing) {
    config.tracing.enabled = true;
    if (answers.langsmithKey) {
      config.tracing.apiKey = answers.langsmithKey;
    }
    if (answers.langsmithProject) {
      config.tracing.project = answers.langsmithProject;
    }
  }

  // Save configuration
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  const isUpdate = !!existingConfig;
  logger.info(
    `\n✅ ${isUpdate ? 'Updated' : 'Created'} ${path.relative(process.cwd(), configPath)}`,
  );

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
