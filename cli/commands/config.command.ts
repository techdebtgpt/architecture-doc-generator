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
  location?: 'root' | 'output';
}

const CONFIG_FILE = '.archdoc.config.json';
const DEFAULT_OUTPUT_DIR = '.arch-docs';

const DEFAULT_CONFIG = {
  apiKeys: {
    anthropic: '',
    openai: '',
    google: '',
  },
  llm: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.2,
    maxTokens: 4096,
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
 * Find existing config file
 * Priority: .arch-docs/.archdoc.config.json -> .archdoc.config.json
 */
function findConfigPath(): string | null {
  const outputConfig = path.join(process.cwd(), DEFAULT_OUTPUT_DIR, CONFIG_FILE);
  const rootConfig = path.join(process.cwd(), CONFIG_FILE);

  if (fs.existsSync(outputConfig)) {
    return outputConfig;
  }
  if (fs.existsSync(rootConfig)) {
    return rootConfig;
  }
  return null;
}

async function initializeConfig(options: ConfigOptions): Promise<void> {
  logger.info('🚀 Welcome to ArchDoc Setup!\n');

  // Determine config location
  let configPath: string;
  const location = options.location || 'output'; // default to .arch-docs/

  if (location === 'output') {
    const outputDir = path.join(process.cwd(), DEFAULT_OUTPUT_DIR);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    configPath = path.join(outputDir, CONFIG_FILE);
    logger.info(`Creating configuration in: ${DEFAULT_OUTPUT_DIR}/${CONFIG_FILE}`);
  } else {
    configPath = path.join(process.cwd(), CONFIG_FILE);
    logger.info(`Creating configuration in: ${CONFIG_FILE}`);
  }

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
          name: 'Anthropic Claude 3.5 Sonnet (recommended) - Best quality and accuracy',
          value: 'anthropic',
          short: 'Anthropic',
        },
        {
          name: 'OpenAI GPT-4 Turbo - Good alternative, widely available',
          value: 'openai',
          short: 'OpenAI',
        },
        {
          name: 'Google Gemini 2.0 Flash - Fast and cost-effective',
          value: 'google',
          short: 'Google',
        },
      ],
    },
  ]);

  // Prompt for API key with validation
  const providerInfo = {
    anthropic: {
      model: 'claude-3-5-sonnet-20241022',
      keyFormat: 'sk-ant-...',
      url: 'https://console.anthropic.com/',
    },
    openai: {
      model: 'gpt-4-turbo',
      keyFormat: 'sk-...',
      url: 'https://platform.openai.com/',
    },
    google: {
      model: 'gemini-2.0-flash-exp',
      keyFormat: 'AIza...',
      url: 'https://ai.google.dev/',
    },
  };

  const info = providerInfo[provider as keyof typeof providerInfo];
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
  config.llm.model = info.model;

  logger.info(`\n✅ Configured to use: ${provider} (${info.model})`);

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

  // Suggest adding to .gitignore if it's in .arch-docs/
  if (location === 'output') {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    let shouldAddGitignore = false;
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignoreContent.includes('.arch-docs/')) {
        const { addToGitignore } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'addToGitignore',
            message: 'Add .arch-docs/ to .gitignore?',
            default: true,
          },
        ]);
        shouldAddGitignore = addToGitignore;
      }
    }

    if (shouldAddGitignore) {
      fs.appendFileSync(gitignorePath, '\n# ArchDoc output and configuration\n.arch-docs/\n');
      logger.info('✅ Added .arch-docs/ to .gitignore');
    }
  }

  logger.info('\n🎉 Setup complete!');
  logger.info('\n📝 Configuration Summary:');
  logger.info(`  • Config file: ${path.relative(process.cwd(), configPath)}`);
  logger.info(`  • LLM Provider: ${config.llm.provider} (${config.llm.model})`);
  logger.info(`  • Tracing: ${config.tracing.enabled ? 'Enabled' : 'Disabled'}`);
  logger.info('\n💡 Tips:');
  logger.info('  • Change provider: archdoc config --set llm.provider=openai');
  logger.info('  • Change model: archdoc config --set llm.model=gpt-4-turbo');
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
    .option(
      '--location <type>',
      'Config location: "output" (.arch-docs/) or "root" (project root)',
      'output',
    )
    .option('--list', 'List all configuration values (API keys masked)')
    .option('--get <key>', 'Get specific configuration value (e.g., llm.temperature)')
    .option('--set <key=value>', 'Set configuration value (e.g., llm.temperature=0.5)')
    .option('--reset', 'Reset configuration to defaults')
    .action(async (options: ConfigOptions) => {
      try {
        if (options.init) {
          await initializeConfig(options);
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
          logger.info('  archdoc config --init --location root    # Create in project root');
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
