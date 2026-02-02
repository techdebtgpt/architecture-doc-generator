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
  servers?: Record<string, McpServer>;
}

/**
 * Get the appropriate MCP config file path based on client type
 * VS Code reads from the user profile (Application Support/Code/User), not ~/.vscode/
 */
function getMcpConfigPath(client: 'cursor' | 'claude-code' | 'vscode' | 'claude-desktop'): string {
  const homeDir = os.homedir();

  switch (client) {
    case 'cursor':
      return path.join(homeDir, '.cursor', 'mcp.json');
    case 'claude-code':
      return path.join(homeDir, '.claude', 'mcp.json');
    case 'claude-desktop':
      if (process.platform === 'darwin') {
        return path.join(
          homeDir,
          'Library',
          'Application Support',
          'Claude',
          'claude_desktop_config.json',
        );
      }
      if (process.platform === 'win32') {
        return path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
      }
      return path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
    case 'vscode': {
      // VS Code (with Copilot) reads MCP config from user profile, not ~/.vscode/
      if (process.platform === 'darwin') {
        return path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'mcp.json');
      }
      if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
        return path.join(appData, 'Code', 'User', 'mcp.json');
      }
      return path.join(homeDir, '.config', 'Code', 'User', 'mcp.json');
    }
    default:
      throw new Error(`Unknown client: ${client}`);
  }
}

/**
 * Get the command to run the MCP server
 */
function getMcpServerCommand(options: { global?: boolean }): {
  command: string;
  args?: string[];
  cwd?: string;
} {
  const isGlobal = options?.global === true;

  if (isGlobal) {
    return { command: 'archdoc-mcp-server' };
  }
  return {
    command: 'npx',
    args: ['--yes', 'archdoc-mcp-server'],
  };
}

/**
 * Read existing MCP config file or create new one
 */
async function readMcpConfig(configPath: string, client: string): Promise<McpConfig> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content) as McpConfig;
    return parsed;
  } catch (_error) {
    if (client === 'vscode') {
      return { servers: {} };
    }
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
export async function setupMcp(client: string, options: { global?: boolean } = {}) {
  const validClients = ['cursor', 'claude-code', 'vscode', 'claude-desktop'];

  if (!validClients.includes(client)) {
    logger.error(`Invalid client: ${client}`);
    logger.info(`Valid options: ${validClients.join(', ')}`);
    process.exit(1);
  }

  try {
    const hasApiKey = await ensureApiKey();
    if (!hasApiKey && client !== 'vscode') {
      logger.warn('Continuing without local config (will need to configure in client UI)');
    }

    const configPath = getMcpConfigPath(
      client as 'cursor' | 'claude-code' | 'vscode' | 'claude-desktop',
    );
    const mcpCommand = getMcpServerCommand(options);

    logger.info(`Setting up ArchDoc MCP for ${chalk.bold(client)}...`);
    logger.info(`Config path: ${configPath}`);

    const config = await readMcpConfig(configPath, client);

    const serverEntry = {
      type: 'stdio' as const,
      command: mcpCommand.command,
      ...(mcpCommand.args && { args: mcpCommand.args }),
      ...(mcpCommand.cwd && { cwd: mcpCommand.cwd }),
    };

    if (client === 'vscode') {
      // VS Code (Copilot) uses "servers" key and reads from user profile
      if (!config.servers) {
        config.servers = {};
      }
      config.servers['archdoc'] = serverEntry;
    } else {
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      config.mcpServers['archdoc'] = serverEntry;
    }

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
        logger.info(`1. The config has been written to: ${configPath}`);
        logger.info('2. Restart VS Code (or Reload Window)');
        logger.info('3. Open Chat (Ctrl+Shift+I / Cmd+Shift+I) and use Copilot');
        logger.info('4. MCP servers appear in Extensions view (@mcp) or run "MCP: List Servers"');
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
    .option('--global', 'Use global archdoc-mcp-server binary (for global installs)')
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
