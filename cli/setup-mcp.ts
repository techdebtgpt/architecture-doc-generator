#!/usr/bin/env node

/**
 * MCP Setup Wizard
 * Interactive setup for ArchDoc MCP server
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { loadExistingConfig, promptFullConfig } from './utils/config-prompts';

async function setupMCP() {
  console.log(chalk.bold.cyan('\n🚀 ArchDoc MCP Server Setup\n'));

  // Use current directory as project path
  const projectPath = process.cwd();
  console.log(chalk.dim(`Configuring MCP for: ${projectPath}\n`));

  // Check if config already exists
  const existingConfig = loadExistingConfig(projectPath);
  const hasExistingConfig = !!existingConfig;

  if (hasExistingConfig) {
    console.log(chalk.yellow('⚠️  Found existing configuration:\n'));
    console.log(chalk.dim(`   Provider: ${existingConfig.llm?.provider || 'Not set'}`));
    console.log(chalk.dim(`   Model: ${existingConfig.llm?.model || 'Not set'}`));
    console.log(
      chalk.dim(`   Tracing: ${existingConfig.tracing?.enabled ? 'Enabled' : 'Disabled'}\n`),
    );
  }

  // Use shared prompt utility (no vector search for MCP setup - keeps it simple)
  const { answers } = await promptFullConfig(projectPath, {
    includeVectorSearch: false,
    includeTracing: true,
    verbose: false,
  });

  // Create or update .archdoc.config.json
  const configPath = path.join(projectPath, '.archdoc.config.json');

  // Start with existing config or create new
  const config: any = existingConfig || {
    llm: {},
    apiKeys: {},
  };

  // Update LLM settings
  config.llm = config.llm || {};
  config.llm.provider = answers.provider;
  config.llm.model = answers.selectedModel;

  // Update API keys
  config.apiKeys = config.apiKeys || {};
  if (answers.apiKey) {
    config.apiKeys[answers.provider] = answers.apiKey;
  }

  // Update tracing settings
  if (answers.enableTracing) {
    config.tracing = {
      enabled: true,
      apiKey: answers.langsmithKey || existingConfig?.tracing?.apiKey,
      project: answers.langsmithProject || existingConfig?.tracing?.project,
    };
  } else {
    config.tracing = {
      enabled: false,
    };
  }

  // Write config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  if (hasExistingConfig) {
    console.log(chalk.green('\n✅ Configuration updated successfully!\n'));
  } else {
    console.log(chalk.green('\n✅ Configuration created successfully!\n'));
  }
  console.log(chalk.dim(`   File: ${configPath}\n`));

  // Create .vscode/mcp.json if it doesn't exist
  const vscodeDir = path.join(projectPath, '.vscode');
  const mcpConfigPath = path.join(vscodeDir, 'mcp.json');

  if (!fs.existsSync(mcpConfigPath)) {
    // Ensure .vscode directory exists
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir, { recursive: true });
    }

    // Use archdoc-server-mcp binary (globally installed or via npm link)
    // No args needed - MCP server will use process.cwd()
    const mcpConfig = {
      mcpServers: {
        archdoc: {
          command: 'archdoc-server-mcp',
          description:
            'ArchDoc MCP Server - AI-powered architecture documentation generator with RAG',
          disabled: false,
        },
      },
    };

    fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2), 'utf-8');

    console.log(chalk.green('✅ MCP client configuration created!\n'));
    console.log(chalk.dim(`   File: ${mcpConfigPath}\n`));
  }

  // Add .archdoc.config.json to .gitignore
  const gitignorePath = path.join(projectPath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    let gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignoreContent.includes('.archdoc.config.json')) {
      gitignoreContent += '\n# ArchDoc configuration (contains API keys)\n.archdoc.config.json\n';
      fs.writeFileSync(gitignorePath, gitignoreContent, 'utf-8');
      console.log(chalk.green('✅ Added .archdoc.config.json to .gitignore\n'));
    }
  }

  // Success message
  console.log(chalk.bold.green('🎉 Setup Complete!\n'));
  console.log(chalk.bold('Next steps:\n'));
  console.log(chalk.cyan('  1. Restart VS Code'));
  console.log(chalk.cyan('  2. Open Copilot Chat'));
  console.log(chalk.cyan('  3. Try: ') + chalk.yellow('@archdoc generate documentation\n'));

  console.log(chalk.dim('Or use the CLI directly:'));
  console.log(chalk.dim('  archdoc analyze ') + chalk.dim.yellow(projectPath) + '\n');
}

// Run setup
setupMCP().catch((error) => {
  console.error(chalk.red('\n❌ Setup failed:'), error.message);
  process.exit(1);
});
