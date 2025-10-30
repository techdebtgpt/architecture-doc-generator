import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { DocumentationOrchestrator } from '../../src/orchestrator/documentation-orchestrator';
import { AgentSelector } from '../../src/orchestrator/agent-selector';
import { FileSystemScanner } from '../../src/scanners/file-system-scanner';
import { AgentRegistry } from '../../src/agents/agent-registry';
import { ArchitectureAnalyzerAgent } from '../../src/agents/architecture-analyzer-agent';
import { FileStructureAgent } from '../../src/agents/file-structure-agent';
import { DependencyAnalyzerAgent } from '../../src/agents/dependency-analyzer-agent';
import { PatternDetectorAgent } from '../../src/agents/pattern-detector-agent';
import { FlowVisualizationAgent } from '../../src/agents/flow-visualization-agent';
import { SchemaGeneratorAgent } from '../../src/agents/schema-generator-agent';
import { SecurityAnalyzerAgent } from '../../src/agents/security-analyzer-agent';
import { MultiFileMarkdownFormatter } from '../../src/formatters/multi-file-markdown-formatter';
import { MarkdownFormatter } from '../../src/formatters/markdown-formatter';

/**
 * Check if API keys are configured
 */
async function checkConfiguration(): Promise<boolean> {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasXAIKey = !!process.env.XAI_API_KEY;
  const hasGoogleKey = !!process.env.GOOGLE_API_KEY;

  if (!hasAnthropicKey && !hasOpenAIKey && !hasXAIKey && !hasGoogleKey) {
    console.log(chalk.red('\n❌ No LLM API keys configured!\n'));
    console.log(chalk.yellow('You need at least one API key to use ArchDoc:'));
    console.log(chalk.gray('  • Anthropic Claude (recommended): https://console.anthropic.com/'));
    console.log(chalk.gray('  • OpenAI GPT-4: https://platform.openai.com/'));
    console.log(chalk.gray('  • xAI Grok: https://x.ai/api'));
    console.log(chalk.gray('  • Google Gemini: https://ai.google.dev/\n'));

    console.log(chalk.cyan('Quick setup:'));
    console.log(chalk.white('  1. Run: ') + chalk.green('archdoc config --init'));
    console.log(chalk.white('  2. Follow the interactive setup\n'));

    console.log(chalk.cyan('Manual setup:'));
    console.log(chalk.white('  1. Copy .archdoc.config.example.json to .archdoc.config.json'));
    console.log(chalk.white('  2. Add your API key(s) to .archdoc.config.json'));
    console.log(chalk.white('  3. Run analyze again\n'));

    return false;
  }

  return true;
}

interface AnalyzeOptions {
  prompt?: string;
  output?: string;
  provider?: string;
  model?: string;
  verbose?: boolean;
  clean?: boolean;
  // Depth mode (simple) - conflicts with granular refinement flags
  depth?: 'quick' | 'normal' | 'deep';
  // Granular refinement options (advanced) - overrides depth mode
  refinement?: boolean;
  refinementThreshold?: number;
  refinementIterations?: number;
  refinementImprovement?: number;
  // Output format options
  format?: 'markdown' | 'json' | 'html';
  singleFile?: boolean;
}

/**
 * Analyze command - comprehensive project analysis with documentation generation
 *
 * This is the primary command for analyzing a project. It:
 * 1. Auto-detects project path (defaults to current directory)
 * 2. Clears the output directory (default: ./.arch-docs)
 * 3. Runs all 5 agents by default (comprehensive analysis)
 * 4. Generates multi-file markdown documentation
 *
 * @example
 * // Comprehensive analysis (all agents)
 * archdoc analyze
 * archdoc analyze ./my-project
 *
 * // Focused analysis
 * archdoc analyze --prompt "dependencies only"
 * archdoc analyze --prompt "flows and schemas"
 *
 * // Custom output
 * archdoc analyze --output ./custom-docs
 */
export async function analyzeProject(
  projectPath?: string,
  options: AnalyzeOptions = {},
): Promise<void> {
  // Check configuration before spinning up
  const isConfigured = await checkConfiguration();
  if (!isConfigured) {
    process.exit(1);
  }

  const spinner = ora('Initializing project analysis...').start();

  try {
    // Resolve project path (use current directory if not provided)
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();

    // Validate project path
    const exists = await fs
      .access(resolvedPath)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      spinner.fail(`Project path does not exist: ${resolvedPath}`);
      process.exit(1);
    }

    // Determine output directory (default: <project>/.arch-docs)
    const outputDir = options.output
      ? path.resolve(options.output)
      : path.join(resolvedPath, '.arch-docs');

    // Clean output directory if it exists (unless --no-clean)
    if (options.clean !== false) {
      spinner.text = 'Cleaning output directory...';
      if (
        await fs
          .access(outputDir)
          .then(() => true)
          .catch(() => false)
      ) {
        await fs.rm(outputDir, { recursive: true, force: true });
        if (options.verbose) {
          console.log(chalk.gray(`  Cleared: ${outputDir}`));
        }
      }
    }

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    spinner.text = 'Scanning project files...';

    // Initialize scanner
    const scanner = new FileSystemScanner();
    const scanResult = await scanner.scan({
      rootPath: resolvedPath,
      maxFiles: 1000,
      maxFileSize: 1048576, // 1MB
      respectGitignore: true,
      includeHidden: false,
      followSymlinks: false,
    });

    spinner.succeed(
      `Found ${scanResult.totalFiles} files in ${scanResult.totalDirectories} directories`,
    );

    if (options.verbose) {
      console.log(chalk.blue('\nProject scan results:'));
      console.log(`  Files: ${scanResult.totalFiles}`);
      console.log(`  Directories: ${scanResult.totalDirectories}`);
      console.log(`  Total size: ${(scanResult.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(
        `  Languages detected: ${Array.from(scanResult.languageDistribution.keys()).join(', ')}`,
      );
    }

    // Setup agent registry
    spinner.start('Registering agents...');
    const agentRegistry = new AgentRegistry();

    // Register all available agents (order matters - foundational agents first)
    agentRegistry.register(new ArchitectureAnalyzerAgent()); // High-level architecture first
    agentRegistry.register(new FileStructureAgent());
    agentRegistry.register(new DependencyAnalyzerAgent());
    agentRegistry.register(new PatternDetectorAgent());
    agentRegistry.register(new FlowVisualizationAgent());
    agentRegistry.register(new SchemaGeneratorAgent());
    agentRegistry.register(new SecurityAnalyzerAgent()); // Security analysis

    const availableAgents = agentRegistry.getAllAgents().map((a) => a.getMetadata().name);
    spinner.succeed(`Registered ${availableAgents.length} agents: ${availableAgents.join(', ')}`);

    // Determine which agents to run
    let agentsToRun = availableAgents;

    // Use prompt-based selection if provided
    if (options.prompt) {
      spinner.start('Analyzing prompt to select agents...');

      const agentSelector = new AgentSelector();
      const agentMetadata = agentRegistry.getAllAgents().map((a) => a.getMetadata());

      const selectedAgents = await agentSelector.selectAgents(options.prompt, agentMetadata);
      agentsToRun = selectedAgents.length > 0 ? selectedAgents : availableAgents;

      if (options.verbose) {
        console.log(`🎯 Prompt: "${options.prompt}"`);
        console.log(`Selected: ${agentsToRun.join(', ')}`);
      }

      spinner.succeed(`Selected ${agentsToRun.length} agents based on prompt`);
    } else {
      // Default: comprehensive analysis with all agents
      if (options.verbose) {
        console.log('🔍 Running comprehensive analysis (all agents)');
      }
    }

    // Initialize orchestrator
    spinner.start('Initializing documentation orchestrator... \n');
    const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner);

    // Determine depth mode configuration
    const depthMode = options.depth || 'normal';
    const depthConfigs = {
      quick: { maxIterations: 2, clarityThreshold: 70, maxQuestions: 2 },
      normal: { maxIterations: 5, clarityThreshold: 80, maxQuestions: 3 },
      deep: { maxIterations: 10, clarityThreshold: 90, maxQuestions: 5 },
    };
    const depthConfig = depthConfigs[depthMode];

    if (options.verbose) {
      console.log(
        `📊 Depth mode: ${depthMode} (${depthConfig.maxIterations} iterations, ${depthConfig.clarityThreshold}% clarity threshold)`,
      );
    }

    // Generate documentation
    spinner.text = `Running ${agentsToRun.length} agent(s) (see progress logs below)... \n`;

    const documentation = await orchestrator.generateDocumentation(resolvedPath, {
      maxTokens: 100000,
      parallel: true,
      iterativeRefinement: {
        enabled: options.refinement !== false, // Default enabled
        maxIterations: options.refinementIterations || depthConfig.maxIterations,
        clarityThreshold: options.refinementThreshold || depthConfig.clarityThreshold,
        minImprovement: options.refinementImprovement || 10,
      },
      runName: process.env.ARCHDOC_RUN_NAME, // Custom run name from config (supports {timestamp}, {agent}, {project})
      agentOptions: {
        runnableConfig: {
          runName: 'DocumentationGeneration-Complete',
        },
        maxQuestionsPerIteration: depthConfig.maxQuestions,
      },
      onAgentProgress: (current: number, total: number, agentName: string) => {
        spinner.text = `Running agent ${current}/${total}: ${agentName} (see progress logs below)... \n`;
      },
    });

    spinner.succeed('Documentation generation completed!');

    // Format and save output
    let outputLocation: string;
    const format = options.format || 'markdown';

    if (options.singleFile) {
      // Single-file output with format selection
      spinner.start(`Formatting documentation as ${format}...`);

      let formattedOutput: string;
      let fileExtension: string;

      switch (format) {
        case 'json':
          formattedOutput = JSON.stringify(documentation, null, 2);
          fileExtension = 'json';
          break;
        case 'html':
          formattedOutput = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Architecture Documentation - ${path.basename(resolvedPath)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    h1 { color: #2563eb; }
    h2 { color: #3b82f6; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    pre { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Architecture Documentation</h1>
  <pre>${JSON.stringify(documentation, null, 2)}</pre>
</body>
</html>`;
          fileExtension = 'html';
          break;
        case 'markdown':
        default: {
          const markdownFormatter = new MarkdownFormatter();
          formattedOutput = await markdownFormatter.format(documentation);
          fileExtension = 'md';
          break;
        }
      }

      await fs.mkdir(outputDir, { recursive: true });
      const outputFile = path.join(outputDir, `architecture.${fileExtension}`);
      await fs.writeFile(outputFile, formattedOutput, 'utf-8');
      outputLocation = outputFile;

      spinner.succeed(`Documentation saved to: ${outputFile}`);
    } else {
      // Multi-file output (default)
      spinner.start('Generating multi-file documentation structure...');

      const multiFileFormatter = new MultiFileMarkdownFormatter();
      await multiFileFormatter.format(documentation, { outputDir });

      const fileCount = (await fs.readdir(outputDir)).length;
      outputLocation = path.join(outputDir, 'index.md');

      spinner.succeed(`Generated ${fileCount} documentation files`);
    }

    // Success message
    console.log('');
    console.log(chalk.green.bold('✨ Analysis Complete!'));
    console.log('');
    console.log(chalk.cyan('Summary:'));
    console.log(`  Project: ${path.basename(resolvedPath)}`);
    console.log(`  Files analyzed: ${scanResult.totalFiles}`);
    console.log(`  Agents executed: ${agentsToRun.length}`);
    console.log(
      `  Output format: ${options.singleFile ? `single-file (${format})` : 'multi-file (markdown)'}`,
    );
    console.log(`  Output: ${outputLocation}`);
    console.log('');
    console.log(chalk.yellow('📖 Next steps:'));
    console.log(`  • View: ${outputLocation}`);
    console.log(`  • Single file output: archdoc analyze --single-file --format json`);
    console.log(`  • Customize: archdoc analyze --prompt "your focus area"`);
  } catch (error) {
    spinner.fail('Analysis failed');
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
