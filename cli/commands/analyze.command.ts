import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { DocumentationOrchestrator } from '../../src/orchestrator/documentation-orchestrator';
import { C4ModelOrchestrator } from '../../src/orchestrator/c4-model-orchestrator';
import { MultiFileMarkdownFormatter } from '../../src/formatters/multi-file-markdown-formatter';
import { MarkdownFormatter } from '../../src/formatters/markdown-formatter';
import { C4ModelFormatter } from '../../src/formatters/c4-model-formatter';
import {
  checkConfiguration,
  validateProjectPath,
  setupOutputDirectory,
  registerAgents,
  createScanner,
} from '../utils/orchestrator-setup';

/**
 * Check if existing documentation exists in output directory
 */
async function checkExistingDocumentation(outputDir: string): Promise<boolean> {
  try {
    // Check if output directory exists
    await fs.access(outputDir);

    // Check for key documentation files
    const indexPath = path.join(outputDir, 'index.md');
    const metadataPath = path.join(outputDir, 'metadata.md');

    const hasIndex = await fs
      .access(indexPath)
      .then(() => true)
      .catch(() => false);
    const hasMetadata = await fs
      .access(metadataPath)
      .then(() => true)
      .catch(() => false);

    // Consider docs existing if both index and metadata are present
    return hasIndex && hasMetadata;
  } catch {
    return false;
  }
}

interface AnalyzeOptions {
  prompt?: string;
  output?: string;
  provider?: string;
  model?: string;
  verbose?: boolean;
  clean?: boolean;
  maxCost?: number; // Maximum cost in dollars before halting (default: 5.0)
  // Depth mode (simple) - conflicts with granular refinement flags
  depth?: 'quick' | 'normal' | 'deep';
  // Search mode for file retrieval during refinement
  searchMode?: 'vector' | 'keyword';
  // Retrieval strategy: 'vector' (semantic), 'graph' (structural), 'hybrid' (both), 'smart' (auto)
  retrievalStrategy?: 'vector' | 'graph' | 'hybrid' | 'smart';
  // Granular refinement options (advanced) - overrides depth mode
  refinement?: boolean;
  refinementThreshold?: number;
  refinementIterations?: number;
  refinementImprovement?: number;
  // Output format options
  format?: 'markdown' | 'json' | 'html';
  singleFile?: boolean;
  c4?: boolean;
}

/**
 * Analyze command - comprehensive project analysis with documentation generation
 *
 * This is the primary command for analyzing a project. It:
 * 1. Auto-detects project path (defaults to current directory)
 * 2. Clears the output directory (default: ./.arch-docs)
 * 3. Runs all agents by default (comprehensive analysis)
 * 4. Generates multi-file markdown documentation
 *
 * @example
 * // Comprehensive analysis (all agents)
 * archdoc analyze
 * archdoc analyze ./my-project
 *
 * // Enhanced analysis with user focus
 * archdoc analyze --prompt "security vulnerabilities and authentication patterns"
 * archdoc analyze --prompt "database schema design and relationships"
 *
 * // The --prompt flag enhances ALL agent analyses with your focus area
 * // It does NOT filter agents - all sections are still generated
 * // Agents will emphasize topics related to your prompt in their analysis
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

  if (options.c4) {
    return await generateC4Model(projectPath, options);
  }

  const spinner = ora('Initializing project analysis...').start();

  try {
    // Validate and resolve project path
    const resolvedPath = await validateProjectPath(projectPath, spinner);

    // Validate prompt if provided
    if (options.prompt !== undefined && options.prompt.trim().length < 3) {
      spinner.fail('The --prompt flag requires a meaningful description (at least 3 characters).');
      console.log(chalk.gray('  Example: --prompt "security vulnerabilities and authentication"'));
      process.exit(1);
    }

    // Setup output directory (default: <project>/.arch-docs)
    const outputDir = await setupOutputDirectory(resolvedPath, options.output, '.arch-docs');

    // Check if documentation already exists
    const hasExistingDocs = await checkExistingDocumentation(outputDir);

    // Determine mode:
    // 1. Incremental mode WITH prompt: hasExistingDocs && prompt provided → enhance specific area
    // 2. Refinement check mode: hasExistingDocs && NO prompt → check for improvements
    // 3. Full generation: !hasExistingDocs → generate from scratch
    const isIncrementalMode = hasExistingDocs && !!options.prompt;
    const isRefinementCheckMode = hasExistingDocs && !options.prompt;

    if (isIncrementalMode) {
      spinner.info(chalk.cyan('📝 Existing documentation detected with --prompt flag'));
      spinner.info(
        chalk.cyan('🚀 Running incremental enhancement mode (faster, preserves existing docs)'),
      );

      if (options.verbose) {
        console.log(chalk.gray('  Mode: Incremental update'));
        console.log(chalk.gray(`  Focus: "${options.prompt}"`));
        console.log(chalk.gray('  Existing docs will be enhanced, not regenerated'));
      }
    } else if (isRefinementCheckMode) {
      spinner.info(chalk.cyan('📝 Existing documentation detected'));
      spinner.info(
        chalk.cyan('🔍 Running refinement check mode (evaluating documentation quality)'),
      );

      if (options.verbose) {
        console.log(chalk.gray('  Mode: Refinement check'));
        console.log(chalk.gray('  Will analyze existing docs for missing information'));
        console.log(chalk.gray('  Only regenerates sections that need improvement'));
        console.log(chalk.gray('  Tip: Use --prompt "focus area" for targeted enhancements'));
      }
    } else {
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
    }

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    spinner.text = 'Scanning project files...';

    // Initialize scanner and scan project
    const scanner = createScanner();
    const scanResult = await scanner.scan({
      rootPath: resolvedPath,
      maxFiles: 10000,
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

    // Register all agents
    const agentRegistry = registerAgents(spinner);
    const availableAgents = agentRegistry.getAllAgents().map((a) => a.getMetadata().name);

    // Always run all agents - prompt is used to ENHANCE, not filter
    const agentsToRun = availableAgents;

    // Display prompt information if provided
    if (options.prompt) {
      if (options.verbose) {
        console.log(chalk.cyan(`🎯 User focus: "${options.prompt}"`));
        console.log(chalk.gray('  (All agents will consider this focus area in their analysis)'));
      }
      spinner.info(`Running all agents with focus on: "${options.prompt}"`);
    } else {
      // Default: comprehensive analysis with all agents
      if (options.verbose) {
        console.log('🔍 Running comprehensive analysis (all agents)');
      }
    }

    // Initialize orchestrator
    spinner.start('Initializing documentation orchestrator... \n');
    const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner);
    spinner.succeed('Orchestrator initialized successfully');

    // Load config file if exists
    let userConfig: any = {};
    try {
      const configPath = path.join(process.cwd(), '.archdoc.config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      userConfig = JSON.parse(configContent);

      if (options.verbose) {
        console.log(chalk.gray(`\n📄 Config loaded from: ${configPath}`));
        console.log(chalk.gray(`   searchMode: ${JSON.stringify(userConfig.searchMode)}`));
      }
    } catch (_error) {
      // Config file doesn't exist or invalid - use defaults
      if (options.verbose) {
        console.log(
          chalk.gray(
            `\n📄 No config file found at: ${path.join(process.cwd(), '.archdoc.config.json')}`,
          ),
        );
        console.log(chalk.gray('   Using defaults'));
      }
    }

    // Determine depth mode configuration
    const depthMode = options.depth || 'normal';
    const depthConfigs = {
      quick: { maxIterations: 2, clarityThreshold: 70, maxQuestions: 2, skipSelfRefinement: true }, // Skip refinement for speed
      normal: {
        maxIterations: 5,
        clarityThreshold: 80,
        maxQuestions: 3,
        skipSelfRefinement: false,
      },
      deep: { maxIterations: 10, clarityThreshold: 90, maxQuestions: 5, skipSelfRefinement: false },
    };
    const depthConfig = depthConfigs[depthMode];

    // Determine search mode: CLI flag > config file > default (vector)
    const configSearchMode = userConfig.searchMode?.mode;
    const searchMode = options.searchMode || configSearchMode || 'vector';

    if (options.verbose) {
      console.log(chalk.gray(`   options.searchMode: ${options.searchMode}`));
      console.log(chalk.gray(`   configSearchMode: ${configSearchMode}`));
      console.log(chalk.gray(`   final searchMode: ${searchMode}`));
    }

    // Determine retrieval strategy (only relevant when searchMode='vector')
    // Priority: CLI flag > config file > default (hybrid)
    // If keyword mode, retrieval strategy is ignored (no vector store available)
    const configRetrievalStrategy = userConfig.searchMode?.strategy;
    const retrievalStrategy =
      searchMode === 'vector'
        ? options.retrievalStrategy || configRetrievalStrategy || 'hybrid'
        : undefined;

    // Determine embeddings provider (only relevant when searchMode='vector')
    // Priority: config file > env var > default (local)
    const embeddingsProvider =
      searchMode === 'vector'
        ? (userConfig.searchMode?.embeddingsProvider as
            | 'local'
            | 'openai'
            | 'google'
            | undefined) || 'local'
        : undefined;

    // Always show retrieval configuration (not just in verbose mode)
    console.log('');
    console.log(chalk.blue('🔧 Retrieval Configuration:'));
    console.log(
      chalk.blue(
        `   Search mode: ${searchMode} (${searchMode === 'vector' ? 'semantic similarity with embeddings' : 'keyword-based matching'})`,
      ),
    );
    if (embeddingsProvider) {
      console.log(chalk.blue(`   Embeddings: ${embeddingsProvider.toUpperCase()} provider`));
    }

    if (retrievalStrategy) {
      console.log(
        chalk.blue(
          `   Strategy: ${retrievalStrategy} (${
            retrievalStrategy === 'vector'
              ? 'semantic only'
              : retrievalStrategy === 'graph'
                ? 'dependency graph only'
                : retrievalStrategy === 'hybrid'
                  ? 'semantic + structural (60/40)'
                  : 'auto-detect best'
          })`,
        ),
      );
    }

    if (options.verbose) {
      console.log('');
      console.log(
        chalk.gray(
          `📊 Depth: ${depthMode} (${depthConfig.maxIterations} iterations, ${depthConfig.clarityThreshold}% clarity threshold)`,
        ),
      );
    }

    // Generate documentation
    console.log('');
    console.log(chalk.cyan(`🤖 Running ${agentsToRun.length} agent(s)...`));
    console.log(chalk.gray('   (Agent progress will be shown below)'));
    console.log('');

    // Stop spinner during agent execution to avoid log spam
    spinner.stop();

    const generationStartTime = Date.now();
    let lastProgressUpdate = 0;
    const progressThrottleMs = 2000; // Update progress at most every 2 seconds

    let documentation;
    try {
      documentation = await orchestrator.generateDocumentation(resolvedPath, {
        maxTokens: 100000,
        maxCostDollars: options.maxCost || 5.0, // Default $5 budget limit
        parallel: true,
        userPrompt: options.prompt, // Pass user prompt to enhance agent analysis
        incrementalMode: isIncrementalMode || isRefinementCheckMode, // Skip full regeneration if docs exist (with or without prompt)
        existingDocsPath: isIncrementalMode || isRefinementCheckMode ? outputDir : undefined, // Path to existing docs for refinement
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
          skipSelfRefinement: depthConfig.skipSelfRefinement, // Skip refinement for quick mode
          searchMode, // Vector (semantic) or keyword search for file retrieval
        },
        retrievalStrategy, // Retrieval strategy for hybrid search (vector + graph)
        embeddingsProvider, // Embeddings provider for vector search (local, openai, google)
        onAgentProgress: (current: number, total: number, agentName: string) => {
          const now = Date.now();
          // Throttle progress updates to every 2 seconds to avoid log spam
          if (now - lastProgressUpdate < progressThrottleMs) {
            return;
          }
          lastProgressUpdate = now;

          const elapsed = Math.floor((now - generationStartTime) / 1000);
          const minutes = Math.floor(elapsed / 60);
          const seconds = elapsed % 60;
          const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
          // Use \r to overwrite the same line
          process.stdout.write(
            `\r${chalk.cyan(`⏳ Running agent ${current}/${total}: ${agentName} [${timeStr}]`)}${' '.repeat(20)} \n`,
          );
        },
      });
    } catch (error) {
      // Handle special case: refinement check found no improvements needed
      if (error instanceof Error && error.message === 'NO_IMPROVEMENTS_NEEDED') {
        spinner.succeed(chalk.green('✅ Documentation is up-to-date - no regeneration needed!'));
        console.log(chalk.gray('\n💡 Your documentation is comprehensive and current.'));
        console.log(chalk.gray('💡 Use --prompt "your focus area" to add targeted enhancements.'));
        console.log(chalk.gray(`📂 Documentation location: ${outputDir}`));
        return;
      }
      // Re-throw other errors
      throw error;
    }

    // Clear the progress line and print completion message
    process.stdout.write('\n');
    console.log(chalk.green('✅ Documentation generation completed!'));

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

      // Use formatIncremental for incremental/refinement modes to preserve changelog
      const mode = (documentation.metadata.configuration as { mode?: string })?.mode;
      if (mode === 'incremental' || mode === 'refinement') {
        // Load existing docs for merge strategies
        const existingDocsMap = new Map<string, string>();
        try {
          const files = await fs.readdir(outputDir);
          for (const file of files) {
            if (file.endsWith('.md')) {
              const filePath = path.join(outputDir, file);
              existingDocsMap.set(file, await fs.readFile(filePath, 'utf-8'));
            }
          }
        } catch {
          // Directory might not exist yet
        }

        await multiFileFormatter.formatIncremental(documentation, {
          outputDir,
          existingDocs: existingDocsMap,
        });
      } else {
        // Initial generation - full format
        await multiFileFormatter.format(documentation, { outputDir });
      }

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

async function generateC4Model(projectPath?: string, options: AnalyzeOptions = {}): Promise<void> {
  const spinner = ora('Initializing C4 model generation...').start();
  try {
    // Validate and resolve project path
    const resolvedPath = await validateProjectPath(projectPath, spinner);

    // Setup output directory (default: <project>/.arch-docs-c4)
    const outputDir = await setupOutputDirectory(resolvedPath, options.output, '.arch-docs-c4');

    // Initialize scanner
    const scanner = createScanner();

    // Register all agents
    const agentRegistry = registerAgents(spinner);

    spinner.start('Initializing C4 model orchestrator...');
    const orchestrator = new C4ModelOrchestrator(agentRegistry, scanner);

    spinner.text = 'Generating C4 model...\n';
    const result = await orchestrator.generateC4Model(resolvedPath, options);

    spinner.succeed('C4 Model generation completed!');

    // Format and save output using C4ModelFormatter
    spinner.start('Generating documentation files...');
    const formatter = new C4ModelFormatter();
    await formatter.format(result, { outputDir });

    const fileCount = (await fs.readdir(outputDir)).length;
    spinner.succeed(`Generated ${fileCount} documentation files`);

    console.log('');
    console.log(chalk.green.bold('✨ C4 Model Generation Complete!'));
    console.log('');
    console.log(chalk.cyan('Summary:'));
    console.log(`  Project: ${path.basename(resolvedPath)}`);
    console.log(`  Files analyzed: ${result.metadata.totalFiles}`);
    console.log(`  Agents executed: ${result.metadata.agentsExecuted.length}`);
    console.log(`  Generation time: ${(result.metadata.generationDuration / 1000).toFixed(1)}s`);
    console.log(`  Output: ${path.join(outputDir, 'index.md')}`);
    console.log('');
    console.log(chalk.yellow('📖 Documentation files:'));
    console.log(`  📋 Index: ${path.join(outputDir, 'index.md')}`);
    console.log(`  📊 Context Diagram: ${path.join(outputDir, 'c4-context.md')}`);
    console.log(`  📦 Containers Diagram: ${path.join(outputDir, 'c4-containers.md')}`);
    console.log(`  🧩 Components Diagram: ${path.join(outputDir, 'c4-components.md')}`);
    console.log(`  💡 Recommendations: ${path.join(outputDir, 'recommendations.md')}`);
    console.log('');
    console.log(
      chalk.yellow('💡 Tip: View index.md to start exploring your C4 architecture model'),
    );
  } catch (error) {
    spinner.fail('C4 Model generation failed');
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
    if (options.verbose && error instanceof Error) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}
