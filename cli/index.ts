#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import { Command } from 'commander';
import { analyzeProject } from './commands/analyze.command';
import { registerConfigCommand } from './commands/config.command';
import { exportDocumentation } from './commands/export.command';
import { registerHelpCommand } from './commands/help.command';
import { registerSetupMcpCommand } from './commands/setup-mcp.command';

// Read version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'),
);

const program = new Command();

program
  .name('archdoc')
  .description('AI-powered architecture documentation generator')
  .version(packageJson.version);

// Analyze command (primary command for documentation generation)
program
  .command('analyze')
  .description(
    'Analyze project and generate comprehensive documentation (default: all agents, multi-file)',
  )
  .argument('[path]', 'Path to the project directory (default: current directory)', '.')
  .option(
    '--prompt <text>',
    'Focus area to enhance all agent analyses (e.g., "security vulnerabilities" or "database design"). With existing docs, creates new enhancement file; without, enhances full generation.',
  )
  .option('-o, --output <dir>', 'Output directory (default: <project>/.arch-docs)')
  .option('--provider <provider>', 'LLM provider (anthropic|openai|google|xai)', 'anthropic')
  .option('--model <model>', 'LLM model to use')
  .option('--no-clean', 'Do not clean output directory before generation')
  .option('--max-cost <dollars>', 'Maximum cost in dollars before halting execution', '5.0')
  // Depth mode (simple)
  .option(
    '--depth <mode>',
    'Analysis depth mode: quick (no refinement, fast), normal (5 iterations, 80%), deep (10 iterations, 90%)',
    'normal',
  )
  // Search mode for file retrieval
  .option(
    '--search-mode <mode>',
    'File search mode: vector (semantic similarity) or keyword (traditional matching). Default from config or vector.',
  )
  // Retrieval strategy for hybrid search
  .option(
    '--retrieval-strategy <strategy>',
    'Retrieval strategy: vector (semantic only), graph (structural only), hybrid (both), smart (auto-detect). Default from config or hybrid.',
  )
  .option('--c4', 'Generate C4 model instead of standard documentation', false)
  // Granular refinement options (advanced)
  .option(
    '--refinement',
    'Enable iterative refinement (agents self-question for better results)',
    false,
  )
  .option('--refinement-threshold <number>', 'Clarity threshold to stop refinement (0-100)', '80')
  .option('--refinement-iterations <number>', 'Maximum refinement iterations per agent', '3')
  .option('--refinement-improvement <number>', 'Minimum improvement % to continue', '10')
  // Output format options (NEW)
  .option('--single-file', 'Generate single-file output instead of multi-file structure', false)
  .option(
    '-f, --format <format>',
    'Output format for single-file: markdown, json, or html (default: markdown)',
    'markdown',
  )
  // Delta analysis options (v0.3.37+)
  .option('--force', 'Force full analysis, ignoring delta analysis (analyze all files)', false)
  .option(
    '--since <commit>',
    'Git commit/branch/tag to compare against for delta analysis (Git projects only)',
  )
  // Other options
  .option('--verbose', 'Verbose output', false)
  .action(analyzeProject);

// Export command
program
  .command('export')
  .description('Export existing documentation to different formats')
  .argument('<input>', 'Input documentation file or directory')
  .option('-f, --format <format>', 'Output format (markdown|json|html|confluence)', 'html')
  .option('-o, --output <path>', 'Output path')
  .option('--template <path>', 'Custom template file')
  .action(exportDocumentation);

// Config command
registerConfigCommand(program);

// Setup MCP command
registerSetupMcpCommand(program);

// Help command
registerHelpCommand(program);

// Parse CLI arguments
program.parse();
