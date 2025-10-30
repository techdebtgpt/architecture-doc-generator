#!/usr/bin/env node

// Load ArchDoc configuration
// Looks for .archdoc.config.json in: .arch-docs/ folder first, then root folder
import * as path from 'path';
import * as fs from 'fs';

const cwd = process.cwd();
const CONFIG_FILE = '.archdoc.config.json';

// Try .arch-docs/.archdoc.config.json first
let configPath = path.join(cwd, '.arch-docs', CONFIG_FILE);
if (!fs.existsSync(configPath)) {
  // Fallback to root .archdoc.config.json
  configPath = path.join(cwd, CONFIG_FILE);
}

if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // Set environment variables from config file
    if (config.apiKeys) {
      if (config.apiKeys.anthropic) process.env.ANTHROPIC_API_KEY = config.apiKeys.anthropic;
      if (config.apiKeys.openai) process.env.OPENAI_API_KEY = config.apiKeys.openai;
      if (config.apiKeys.google) process.env.GOOGLE_API_KEY = config.apiKeys.google;
      if (config.apiKeys.xai) process.env.XAI_API_KEY = config.apiKeys.xai;
    }
    if (config.tracing) {
      if (config.tracing.enabled) {
        process.env.LANGCHAIN_TRACING_V2 = 'true';
        // Warn if API key is missing
        if (!config.tracing.apiKey && !process.env.LANGCHAIN_API_KEY) {
          console.warn(
            '\n⚠️  Warning: LangSmith tracing is enabled but no API key provided.\n' +
              '   Set tracing.apiKey in config or LANGCHAIN_API_KEY environment variable.\n',
          );
        }
      }
      if (config.tracing.apiKey) process.env.LANGCHAIN_API_KEY = config.tracing.apiKey;
      if (config.tracing.project) process.env.LANGCHAIN_PROJECT = config.tracing.project;
      if (config.tracing.endpoint) process.env.LANGCHAIN_ENDPOINT = config.tracing.endpoint;
    }
  } catch (_err) {
    // Ignore parse errors, config will use defaults or explicit env vars
  }
}

// Note: Environment variables can still be set explicitly (for CI/CD)
// They take precedence over .archdoc.config.json values

import { Command } from 'commander';
import { analyzeProject } from './commands/analyze.command';
import { exportDocumentation } from './commands/export.command';
import { registerConfigCommand } from './commands/config.command';

const program = new Command();

program
  .name('archdoc')
  .description('AI-powered architecture documentation generator')
  .version('0.1.0');

// Analyze command (primary command for documentation generation)
program
  .command('analyze')
  .description(
    'Analyze project and generate comprehensive documentation (default: all agents, multi-file)',
  )
  .argument('[path]', 'Path to the project directory (default: current directory)', '.')
  .option('--prompt <text>', 'Natural language prompt to select specific agents')
  .option('-o, --output <dir>', 'Output directory (default: <project>/.arch-docs)')
  .option('--provider <provider>', 'LLM provider (anthropic|openai|google|xai)', 'anthropic')
  .option('--model <model>', 'LLM model to use')
  .option('--no-clean', 'Do not clean output directory before generation')
  // Depth mode (simple)
  .option(
    '--depth <mode>',
    'Analysis depth mode: quick (2 iterations, 70% clarity), normal (5 iterations, 80%), deep (10 iterations, 90%)',
    'normal',
  )
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

// Parse CLI arguments
program.parse();
