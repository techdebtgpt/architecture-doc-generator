#!/usr/bin/env node

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import { Command } from 'commander';
import { generateDocumentation } from './commands/generate.command';
import { analyzeProject } from './commands/analyze.command';
import { exportDocumentation } from './commands/export.command';

const program = new Command();

program
  .name('archdoc')
  .description('AI-powered architecture documentation generator')
  .version('0.1.0');

// Generate command
program
  .command('generate')
  .description('Generate architecture documentation for a project')
  .argument('<path>', 'Path to the project directory')
  .option('-o, --output <dir>', 'Output directory', './docs/architecture')
  .option('-f, --format <format>', 'Output format (markdown|json|html)', 'markdown')
  .option('--provider <provider>', 'LLM provider (anthropic|openai|google)', 'anthropic')
  .option('--model <model>', 'LLM model to use')
  .option(
    '--agents <agents>',
    'Comma-separated list of agents to run (e.g., file-structure,dependency-analyzer)',
  )
  .option(
    '--prompt <text>',
    'Natural language prompt to select agents (e.g., "analyze dependencies and security only")',
  )
  .option('--parallel', 'Run agents in parallel where possible', false)
  .option('--config <path>', 'Path to configuration file')
  .option('--verbose', 'Verbose output', false)
  .option('--no-cache', 'Disable caching', false)
  .option('--multi-file', 'Generate multi-file documentation structure', false)
  .option('--refinement-enabled', 'Enable iterative refinement for agent outputs', false)
  .option('--refinement-threshold <number>', 'Clarity threshold (0-100) to stop refinement', '80')
  .option('--refinement-max-iterations <number>', 'Maximum refinement iterations per agent', '3')
  .option(
    '--refinement-min-improvement <number>',
    'Minimum improvement (0-100) to continue refinement',
    '10',
  )
  .action(generateDocumentation);

// Analyze command (primary command for quick analysis)
program
  .command('analyze')
  .description('Analyze project and generate comprehensive documentation (default: all agents)')
  .argument('[path]', 'Path to the project directory (default: current directory)', '.')
  .option('--prompt <text>', 'Natural language prompt to select specific agents')
  .option('-o, --output <dir>', 'Output directory (default: <project>/.arch-docs)')
  .option('--provider <provider>', 'LLM provider (anthropic|openai|google)', 'anthropic')
  .option('--model <model>', 'LLM model to use')
  .option('--no-clean', 'Do not clean output directory before generation')
  .option(
    '--depth <mode>',
    'Analysis depth mode: quick (2 iterations, 70% clarity), normal (5 iterations, 80%), deep (10 iterations, 90%)',
    'normal',
  )
  .option(
    '--refinement',
    'Enable iterative refinement (agents self-question for better results)',
    false,
  )
  .option('--refinement-threshold <number>', 'Clarity threshold to stop refinement (0-100)', '80')
  .option('--refinement-iterations <number>', 'Maximum refinement iterations per agent', '3')
  .option('--refinement-improvement <number>', 'Minimum improvement % to continue', '10')
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

// Parse CLI arguments
program.parse();
