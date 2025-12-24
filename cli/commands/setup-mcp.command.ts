import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { execSync } from 'child_process';
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

  if (isGlobal) {
    return {
      command: 'archdoc-mcp-server',
    };
  } else {
    // For local: use npx to find the binary in node_modules/.bin
    return {
      command: 'npx',
      args: ['--yes', 'archdoc-mcp-server'],
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
 * Verify that the MCP server binary exists
 */
async function verifyMcpServerInstallation(): Promise<boolean> {
  const isGlobal = process.argv.includes('--global');

  if (isGlobal) {
    // Check if archdoc-mcp-server is in PATH
    try {
      const command = process.platform === 'win32' ? 'where' : 'which';
      execSync(`${command} archdoc-mcp-server`, { stdio: 'ignore' });
      return true;
    } catch {
      logger.warn('archdoc-mcp-server not found in PATH');
      logger.info('Install globally with: npm install -g architecture-doc-generator');
      return false;
    }
  } else {
    // Check if package exists locally
    const localBinPath = path.join(process.cwd(), 'node_modules', '.bin', 'archdoc-mcp-server');
    try {
      await fs.access(localBinPath);
      return true;
    } catch {
      logger.warn('archdoc-mcp-server not found locally');
      logger.info('Install locally with: npm install architecture-doc-generator');
      return false;
    }
  }
}

/**
 * Verify config was written successfully
 */
async function verifyConfigWritten(
  configPath: string,
  expectedServerName: string,
): Promise<boolean> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    return !!config.mcpServers?.[expectedServerName];
  } catch {
    return false;
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
    logger.info(chalk.bold(`\n🔧 Setting up ArchDoc MCP for ${chalk.cyan(client)}...\n`));

    // Step 1: Verify MCP server installation
    logger.info('1️⃣  Verifying MCP server installation...');
    const isInstalled = await verifyMcpServerInstallation();
    if (!isInstalled) {
      logger.error('❌ MCP server not found');
      logger.info('\nPlease install the package first:');
      logger.info(chalk.dim('  npm install -g architecture-doc-generator'));
      logger.info(chalk.dim('  OR'));
      logger.info(chalk.dim('  npm install architecture-doc-generator'));
      process.exit(1);
    }
    logger.info(chalk.green('✅ MCP server found\n'));

    // Step 2: Check if API key is configured
    logger.info('2️⃣  Checking API key configuration...');
    const hasApiKey = await ensureApiKey();
    if (!hasApiKey && client !== 'vscode') {
      logger.warn(chalk.yellow('⚠️  No API key found in local config'));
      logger.info('   You can configure it later in the client UI\n');
    } else {
      logger.info(chalk.green('✅ API key configured\n'));
    }

    // Step 3: Prepare config
    const configPath = getMcpConfigPath(
      client as 'cursor' | 'claude-code' | 'vscode' | 'claude-desktop',
    );
    const mcpCommand = getMcpServerCommand();

    logger.info(`3️⃣  Writing configuration to: ${chalk.dim(configPath)}`);

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

    // Step 4: Verify config was written
    logger.info('4️⃣  Verifying configuration...');
    const isConfigured = await verifyConfigWritten(configPath, 'archdoc');
    if (!isConfigured) {
      logger.error(chalk.red('❌ Failed to verify configuration'));
      logger.info('   Please check the config file manually');
      process.exit(1);
    }
    logger.info(chalk.green('✅ Configuration verified\n'));

    // Success message with client-specific instructions
    logger.info(chalk.green.bold('🎉 ArchDoc MCP Server registered successfully!\n'));

    logger.info(chalk.bold(`📋 Next Steps for ${client}:\n`));

    switch (client) {
      case 'cursor':
        logger.info('1. Restart Cursor completely (Quit and reopen)');
        logger.info('2. Open any project');
        logger.info('3. Go to Settings → Models → MCP Servers');
        logger.info('4. You should see "archdoc" in the list');
        logger.info('5. Click the toggle to enable it');
        logger.info('6. Try asking: "Generate architecture docs for this project"');
        break;

      case 'claude-code':
        logger.info('1. Restart Claude Code completely');
        logger.info('2. The MCP server should auto-load');
        logger.info('3. Verify by asking: "What MCP tools are available?"');
        logger.info('4. Try: "Generate architecture documentation"');
        break;

      case 'vscode':
        logger.info('1. Restart VS Code completely');
        logger.info('2. Open your project');
        logger.info('3. Check GitHub Copilot Chat for MCP tools');
        logger.info('4. Try asking: "Generate architecture docs"');
        logger.info('   Note: MCP support in VS Code may be limited');
        break;

      case 'claude-desktop':
        logger.info('1. Quit Claude Desktop completely');
        logger.info('2. Restart the application');
        logger.info('3. Open a new conversation');
        logger.info('4. The "archdoc" tool should be available');
        logger.info('5. Try: "Generate documentation for my project"');
        break;
    }

    logger.info('');
    logger.info(chalk.dim('💡 Tips:'));
    logger.info(chalk.dim(`   • Config file: ${configPath}`));
    logger.info(chalk.dim('   • API keys: Run "archdoc config --init" in your project'));
    logger.info(chalk.dim('   • Test locally: Run "archdoc analyze ." first'));
    logger.info('');
  } catch (error) {
    logger.error(
      chalk.red(
        `\n❌ Failed to set up MCP: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
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
