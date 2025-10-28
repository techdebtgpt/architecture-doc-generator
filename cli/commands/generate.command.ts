import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { DocumentationOrchestrator } from '../../src/orchestrator/documentation-orchestrator';
import { AgentSelector } from '../../src/orchestrator/agent-selector';
import { FileSystemScanner } from '../../src/scanners/file-system-scanner';
import { AgentRegistry } from '../../src/agents/agent-registry';
import { FileStructureAgent } from '../../src/agents/file-structure-agent';
import { DependencyAnalyzerAgent } from '../../src/agents/dependency-analyzer-agent';
import { PatternDetectorAgent } from '../../src/agents/pattern-detector-agent';
import { FlowVisualizationAgent } from '../../src/agents/flow-visualization-agent';
import { SchemaGeneratorAgent } from '../../src/agents/schema-generator-agent';
import { ArchitectureAnalyzerAgent } from '../../src/agents/architecture-analyzer-agent';
import { MarkdownFormatter } from '../../src/formatters/markdown-formatter';
import { MultiFileMarkdownFormatter } from '../../src/formatters/multi-file-markdown-formatter';

interface GenerateOptions {
  output: string;
  format: string;
  provider: string;
  model?: string;
  agents?: string;
  prompt?: string; // Natural language agent selection
  parallel: boolean;
  config?: string;
  verbose: boolean;
  cache: boolean;
  multiFile?: boolean;
  // Iterative refinement options
  refinementEnabled?: boolean;
  refinementThreshold?: number;
  refinementMaxIterations?: number;
  refinementMinImprovement?: number;
}

export async function generateDocumentation(
  projectPath: string,
  options: GenerateOptions,
): Promise<void> {
  const spinner = ora('Initializing architecture documentation generator...').start();

  try {
    // Validate project path
    const resolvedPath = path.resolve(projectPath);
    const exists = await fs
      .access(resolvedPath)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      spinner.fail(`Project path does not exist: ${resolvedPath}`);
      process.exit(1);
    }

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

    // TODO: Add when implemented
    // agentRegistry.register(new CodeQualityAgent());
    // agentRegistry.register(new SecurityScannerAgent());

    const availableAgents = agentRegistry.getAllAgents().map((a) => a.getMetadata().name);
    spinner.succeed(`Registered ${availableAgents.length} agents: ${availableAgents.join(', ')}`);

    // Determine which agents to run
    let agentsToRun = availableAgents;

    // Option 1: Natural language prompt (--prompt flag)
    if (options.prompt) {
      spinner.start('Analyzing prompt to select agents...');

      const agentSelector = new AgentSelector();
      const agentMetadata = agentRegistry.getAllAgents().map((a) => a.getMetadata());

      // Use LLM to intelligently select agents
      const selectedAgents = await agentSelector.selectAgents(options.prompt, agentMetadata);

      // Empty array means "all agents"
      agentsToRun = selectedAgents.length > 0 ? selectedAgents : availableAgents;

      if (options.verbose) {
        console.log(chalk.blue(`\nPrompt: "${options.prompt}"`));
        console.log(chalk.blue(`Selected: ${agentsToRun.join(', ')}`));
      }

      spinner.succeed(`Selected ${agentsToRun.length} agents based on prompt`);
    }
    // Option 2: Explicit agent names (--agents flag)
    else if (options.agents) {
      const requestedAgents = options.agents.split(',').map((a) => a.trim());
      agentsToRun = requestedAgents.filter((agent) => {
        const exists = availableAgents.includes(agent);
        if (!exists) {
          console.warn(chalk.yellow(`Warning: Agent '${agent}' not found`));
        }
        return exists;
      });
    }
    // Option 3: Default - run all agents

    if (agentsToRun.length === 0) {
      spinner.fail('No valid agents to run');
      process.exit(1);
    }

    // Initialize orchestrator
    spinner.start('Initializing documentation orchestrator...');
    const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner);

    // Generate documentation with LangGraph StateGraph
    spinner.text = `Running ${agentsToRun.length} agents...`;

    const documentation = await orchestrator.generateDocumentation(resolvedPath, {
      maxTokens: 100000,
      parallel: options.parallel,
      iterativeRefinement: {
        enabled: options.refinementEnabled ?? false,
        maxIterations: options.refinementMaxIterations ?? 3,
        clarityThreshold: options.refinementThreshold ?? 80,
        minImprovement: options.refinementMinImprovement ?? 10,
      },
      agentOptions: {
        runnableConfig: {
          runName: 'DocumentationGeneration-Complete',
        },
      },
    });

    spinner.succeed('Documentation generation completed!');

    // Format and save output
    const outputDir = path.resolve(options.output);
    let outputLocation: string;

    if (options.multiFile) {
      spinner.start('Generating multi-file documentation structure...');

      const multiFileFormatter = new MultiFileMarkdownFormatter();
      await multiFileFormatter.format(documentation, {
        outputDir,
        includeTOC: true,
        includeMetadata: true,
        includeNavigation: true,
      });

      spinner.succeed('Multi-file documentation generated');
      outputLocation = path.join(outputDir, 'index.md');
    } else {
      spinner.start(`Formatting documentation as ${options.format}...`);

      let formattedOutput: string;
      let fileExtension: string;

      switch (options.format.toLowerCase()) {
        case 'json':
          formattedOutput = JSON.stringify(documentation, null, 2);
          fileExtension = 'json';
          break;
        case 'html':
          formattedOutput = `<h1>Architecture Documentation</h1><pre>${JSON.stringify(documentation, null, 2)}</pre>`;
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

      spinner.succeed(`Documentation saved to: ${outputFile}`);
      outputLocation = outputFile;
    }

    // Show summary
    console.log(chalk.green('\n✨ Documentation Generation Complete!'));
    console.log(chalk.blue('\nSummary:'));
    console.log(`  Project: ${path.basename(resolvedPath)}`);
    console.log(`  Files analyzed: ${scanResult.totalFiles}`);
    console.log(`  Agents executed: ${agentsToRun.length}`);
    console.log(`  Output format: ${options.multiFile ? 'multi-file' : options.format}`);
    console.log(`  Output location: ${outputLocation}`);
    console.log(`  Orchestrator: LangGraph StateGraph`);

    if (documentation.metadata?.totalTokensUsed) {
      console.log(`  Tokens used: ${documentation.metadata.totalTokensUsed.toLocaleString()}`);
    }

    if (documentation.metadata?.generationDuration) {
      console.log(
        `  Generation time: ${(documentation.metadata.generationDuration / 1000).toFixed(1)}s`,
      );
    }

    console.log(chalk.cyan('\n📖 Next steps:'));
    console.log(`  • Review the generated documentation at ${outputLocation}`);
    console.log(`  • Customize agents with --agents flag if needed`);
    console.log(`  • Export to other formats using 'archdoc export'`);
    console.log(`  • Set up CI/CD integration to keep docs updated`);
  } catch (error) {
    spinner.fail(`Documentation generation failed: ${(error as Error).message}`);

    if (options.verbose) {
      console.error(chalk.red('\nFull error details:'));
      console.error(error);
    }

    process.exit(1);
  }
}
