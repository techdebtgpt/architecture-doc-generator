import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { Logger } from '../../src/utils/logger';
import chalk from 'chalk';

const logger = new Logger('setup-mcp');

interface McpServer {
  type: 'stdio';
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers?: Record<string, McpServer>;
}

/**
 * Get the appropriate MCP config file path based on client type
 */
function getMcpConfigPath(client: 'cursor' | 'claude-code' | 'vscode' | 'claude-desktop'): string {
  const homeDir = os.homedir();

  switch (client) {
    case 'cursor':
      return path.join(homeDir, '.cursor', 'mcp.json');
    case 'claude-code':
      // Claude Code uses the same config as Claude Desktop for now
      return path.join(homeDir, '.claude', 'mcp.json');
    case 'claude-desktop':
      // macOS
      if (process.platform === 'darwin') {
        return path.join(
          homeDir,
          'Library',
          'Application Support',
          'Claude',
          'claude_desktop_config.json',
        );
      }
      // Windows
      if (process.platform === 'win32') {
        return path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
      }
      // Linux
      return path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
    case 'vscode':
      // VS Code settings are in settings.json, we'll provide CLI command instead
      return path.join(homeDir, '.vscode', 'mcp.json');
    default:
      throw new Error(`Unknown client: ${client}`);
  }
}

/**
 * Get the command to run the MCP server
 */
function getMcpServerCommand(): { command: string; args?: string[]; cwd?: string } {
  const isGlobal = process.argv.includes('--global');
  const isLocal = !isGlobal;

  if (isLocal) {
    // For local development: use npx with local package
    return {
      command: 'npx',
      args: ['@techdebtgpt/archdoc-generator', 'mcp-server'],
      cwd: undefined,
    };
  } else {
    // For global installation: use direct command
    return {
      command: 'archdoc-mcp-server',
    };
  }
}

/**
 * Read existing MCP config file or create new one
 */
async function readMcpConfig(configPath: string): Promise<McpConfig> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (_error) {
    // File doesn't exist or is invalid, return empty config
    return { mcpServers: {} };
  }
}

/**
 * Write MCP config file
 */
async function writeMcpConfig(configPath: string, config: McpConfig): Promise<void> {
  const dir = path.dirname(configPath);

  try {
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    // Write config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to write config file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Ensure environment variables are set
 */
async function ensureApiKey(): Promise<boolean> {
  const configPath = path.join(process.cwd(), '.archdoc.config.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    if (!config.apiKeys || !Object.keys(config.apiKeys).length) {
      logger.warn('No API keys found in .archdoc.config.json');
      logger.info('Please run: archdoc config --init');
      return false;
    }

    return true;
  } catch (_error) {
    logger.warn('No .archdoc.config.json found in current directory');
    logger.info('Please run: archdoc config --init');
    return false;
  }
}

/**
 * Register MCP server in the specified client
 */
export async function setupMcp(client: string, _options: any) {
  const validClients = ['cursor', 'claude-code', 'vscode', 'claude-desktop'];

  if (!validClients.includes(client)) {
    logger.error(`Invalid client: ${client}`);
    logger.info(`Valid options: ${validClients.join(', ')}`);
    process.exit(1);
  }

  try {
    // Check if API key is configured
    const hasApiKey = await ensureApiKey();
    if (!hasApiKey && client !== 'vscode') {
      // VS Code can prompt for API key at runtime
      logger.warn('Continuing without local config (will need to configure in client UI)');
    }

    const configPath = getMcpConfigPath(
      client as 'cursor' | 'claude-code' | 'vscode' | 'claude-desktop',
    );
    const mcpCommand = getMcpServerCommand();

    logger.info(`Setting up ArchDoc MCP for ${chalk.bold(client)}...`);
    logger.info(`Config path: ${configPath}`);

    // Read existing config
    const config = await readMcpConfig(configPath);

    // Ensure mcpServers exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Add/update archdoc server
    config.mcpServers['archdoc'] = {
      type: 'stdio',
      command: mcpCommand.command,
      ...(mcpCommand.args && { args: mcpCommand.args }),
      ...(mcpCommand.cwd && { cwd: mcpCommand.cwd }),
    };

    // Write config
    await writeMcpConfig(configPath, config);

    // Success message with client-specific instructions
    logger.info(chalk.green('✅ ArchDoc MCP Server registered successfully!'));
    logger.info('');

    switch (client) {
      case 'cursor':
        logger.info(chalk.bold('📋 Next steps for Cursor:'));
        logger.info(`1. The config has been updated: ${configPath}`);
        logger.info('2. Restart Cursor');
        logger.info('3. Go to Settings > Models > MCP Servers');
        logger.info('4. You should see "archdoc" in the list');
        logger.info('5. Click the icon to enable it');
        break;

      case 'claude-code':
        logger.info(chalk.bold('📋 Next steps for Claude Code:'));
        logger.info(`1. The config has been updated: ${configPath}`);
        logger.info('2. Restart Claude Code');
        logger.info('3. The MCP server should now be available');
        break;

      case 'vscode':
        logger.info(chalk.bold('📋 Next steps for VS Code + GitHub Copilot:'));
        logger.info(`1. The config has been created: ${configPath}`);
        logger.info('2. Open VS Code settings (Cmd+, or Ctrl+,)');
        logger.info('3. Search for "MCP" or "Model Context Protocol"');
        logger.info('4. Configure the server settings if needed');
        logger.info('5. Restart VS Code');
        break;

      case 'claude-desktop':
        logger.info(chalk.bold('📋 Next steps for Claude Desktop:'));
        logger.info(`1. The config has been updated: ${configPath}`);
        logger.info('2. Restart Claude Desktop app');
        logger.info('3. The MCP server should now be available in Claude');
        break;
    }

    logger.info('');
    logger.info(chalk.dim('💡 Tip: Make sure your .archdoc.config.json is set up with API keys'));
    logger.info(chalk.dim('   Run: archdoc config --init'));
  } catch (error) {
    logger.error(`Failed to set up MCP: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Register the setup-mcp command with CLI
 */
export function registerSetupMcpCommand(program: any) {
  program
    .command('setup-mcp <client>')
    .description(
      'Set up ArchDoc MCP server for an AI client (cursor, claude-code, vscode, claude-desktop)',
    )
    .option('--global', 'Use globally installed archdoc-generator (default: local npm package)')
    .action(setupMcp);

  // Also add a convenience command
  program
    .command('mcp-server')
    .description('Start the MCP server (for local development)')
    .action(async () => {
      // Import and start the MCP server
      await import('../../src/mcp-server/index.js');
      // The MCP server auto-starts on import
    });
}
