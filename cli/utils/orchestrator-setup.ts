import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import { Ora } from 'ora';
import { AgentRegistry } from '../../src/agents/agent-registry';
import { FileSystemScanner } from '../../src/scanners/file-system-scanner';
import { ArchitectureAnalyzerAgent } from '../../src/agents/architecture-analyzer-agent';
import { FileStructureAgent } from '../../src/agents/file-structure-agent';
import { DependencyAnalyzerAgent } from '../../src/agents/dependency-analyzer-agent';
import { PatternDetectorAgent } from '../../src/agents/pattern-detector-agent';
import { FlowVisualizationAgent } from '../../src/agents/flow-visualization-agent';
import { SchemaGeneratorAgent } from '../../src/agents/schema-generator-agent';
import { SecurityAnalyzerAgent } from '../../src/agents/security-analyzer-agent';
import { KPIAnalyzerAgent } from '../../src/agents/kpi-analyzer-agent';

import { detectKeys } from '../../src/utils/key-detector';
import inquirer from 'inquirer';
import { promptFullConfig } from './config-prompts';

/**
 * Check if API keys are configured
 * Reads from .archdoc.config.json in current directory
 */
export async function checkConfiguration(): Promise<boolean> {
  // Try to read config file from current directory
  const configPath = path.join(process.cwd(), '.archdoc.config.json');

  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    const hasAnthropicKey = !!config.apiKeys?.anthropic;
    const hasOpenAIKey = !!config.apiKeys?.openai;
    const hasXAIKey = !!config.apiKeys?.xai;
    const hasGoogleKey = !!config.apiKeys?.google;

    if (!hasAnthropicKey && !hasOpenAIKey && !hasXAIKey && !hasGoogleKey) {
      console.log(chalk.red('\n❌ No LLM API keys configured in .archdoc.config.json!\n'));
      console.log(chalk.yellow('You need at least one API key to use ArchDoc:'));
      console.log(chalk.gray('  • Anthropic Claude (recommended): https://console.anthropic.com/'));
      console.log(chalk.gray('  • OpenAI GPT-4: https://platform.openai.com/'));
      console.log(chalk.gray('  • xAI Grok: https://x.ai/api'));
      console.log(chalk.gray('  • Google Gemini: https://ai.google.dev/\n'));

      console.log(chalk.cyan('Quick setup:'));
      console.log(chalk.white('  1. Run: ') + chalk.green('archdoc config --init'));
      console.log(chalk.white('  2. Follow the interactive setup\n'));

      return false;
    }

    return true;
  } catch (_error) {
    // Config file doesn't exist or can't be read
    console.log(chalk.red('\n❌ No configuration file found!\n'));

    // Attempt to detect keys from other tools
    const detectedKey = await detectKeys();

    if (detectedKey) {
      console.log(
        chalk.green(
          `✨ Detected ${detectedKey.provider} API key from ${detectedKey.source}`,
        ),
      );

      const { useDetected } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useDetected',
          message: 'Would you like to use this key to configure ArchDoc?',
          default: true,
        },
      ]);

      if (useDetected) {
        // Launch interactive setup with detected key pre-filled
        console.log(chalk.cyan('\n🚀 Launching setup with detected key...\n'));

        // We need to import promptFullConfig from config.command logic, but it's in utils
        // Re-using the logic from config.command.ts is tricky because of circular deps or duplication.
        // Best approach: We are in orchestrator-setup, which is used by analyze command.
        // We should probably just guide them to run config --init or run it inline here?
        // Running inline is better for UX.

        // NOTE: We need to replicate some logic from config.command.ts here or refactor.
        // Given the constraints, I'll import the prompt logic and save the file here.

        const projectPath = process.cwd();
        const { answers } = await promptFullConfig(projectPath, {
            includeVectorSearch: true,
            includeTracing: true,
            verbose: true,
            detectedKey
        });

        // Construct config object (simplified version of config.command.ts logic)
        const config = {
            apiKeys: {
                anthropic: '',
                openai: '',
                google: '',
                xai: '',
            },
            llm: {
                provider: answers.provider,
                model: answers.selectedModel,
                temperature: 0.2,
                maxTokens: 4096,
            },
            // ... minimal defaults ...
            scan: {
                maxFiles: 10000,
                maxFileSize: 1048576,
                respectGitignore: true,
                excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
                includeHidden: false,
                followSymlinks: false,
            },
            agents: {
                enabled: ['file-structure', 'dependency-analyzer', 'pattern-detector', 'flow-visualization', 'schema-generator', 'architecture-analyzer'],
                parallel: true,
                timeout: 300000,
            },
            searchMode: {
                mode: 'keyword',
                embeddingsProvider: 'local',
                strategy: 'smart',
            },
            output: {
                directory: '.arch-docs',
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
            }
        };

        if (answers.apiKey) {
            (config.apiKeys as any)[answers.provider] = answers.apiKey;
        }

        if (answers.enableVectorSearch && answers.embeddingsProvider) {
            (config.searchMode as any).mode = 'vector';
            (config.searchMode as any).embeddingsProvider = answers.embeddingsProvider;
            if (answers.strategy) (config.searchMode as any).strategy = answers.strategy;
            if (answers.embeddingsApiKey) (config.apiKeys as any).embeddings = answers.embeddingsApiKey;
        }

        if (answers.enableTracing) {
            config.tracing.enabled = true;
            if (answers.langsmithKey) config.tracing.apiKey = answers.langsmithKey;
            if (answers.langsmithProject) config.tracing.project = answers.langsmithProject || 'archdoc-analysis';
        }

        // Save config
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        console.log(chalk.green(`\n✅ Configuration saved to ${path.relative(process.cwd(), configPath)}`));
        console.log(chalk.green('✅ You can now run analysis!'));

        return true;
      }
    }

    console.log(chalk.yellow('You need to create .archdoc.config.json'));

    console.log(chalk.cyan('\nQuick setup:'));
    console.log(chalk.white('  1. Run: ') + chalk.green('archdoc config --init'));
    console.log(chalk.white('  2. Follow the interactive setup\n'));

    console.log(chalk.cyan('Manual setup:'));
    console.log(chalk.white('  1. Copy .archdoc.config.example.json to .archdoc.config.json'));
    console.log(chalk.white('  2. Add your API key(s) to .archdoc.config.json'));
    console.log(chalk.white('  3. Run analyze again\n'));

    return false;
  }
}

/**
 * Validate and resolve project path
 */
export async function validateProjectPath(
  projectPath: string | undefined,
  spinner: Ora,
): Promise<string> {
  const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();

  const exists = await fs
    .access(resolvedPath)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    spinner.fail(`Project path does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  return resolvedPath;
}

/**
 * Setup output directory
 */
export async function setupOutputDirectory(
  resolvedPath: string,
  customOutput: string | undefined,
  defaultDirName: string,
): Promise<string> {
  const outputDir = customOutput
    ? path.resolve(customOutput)
    : path.join(resolvedPath, defaultDirName);

  await fs.mkdir(outputDir, { recursive: true });

  return outputDir;
}

/**
 * Register all available agents
 */
export function registerAgents(spinner: Ora): AgentRegistry {
  spinner.start('Registering agents... \n');
  const agentRegistry = new AgentRegistry();

  // Register all available agents (order matters - foundational agents first)
  agentRegistry.register(new ArchitectureAnalyzerAgent());
  agentRegistry.register(new FileStructureAgent());
  agentRegistry.register(new DependencyAnalyzerAgent());
  agentRegistry.register(new PatternDetectorAgent());
  agentRegistry.register(new FlowVisualizationAgent());
  agentRegistry.register(new SchemaGeneratorAgent());
  agentRegistry.register(new SecurityAnalyzerAgent());
  agentRegistry.register(new KPIAnalyzerAgent()); // NEW: Repository KPI analysis with LLM

  const availableAgents = agentRegistry.getAllAgents().map((a) => a.getMetadata().name);
  spinner.succeed(`Registered ${availableAgents.length} agents: ${availableAgents.join(', ')}`);

  return agentRegistry;
}

/**
 * Initialize scanner
 */
export function createScanner(): FileSystemScanner {
  return new FileSystemScanner();
}
