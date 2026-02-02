#!/usr/bin/env node

/**
 * MCP Server for Architecture Documentation Generator
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getAllTools } from './tools/tool-registry';
import { getToolHandler } from './tools/handlers';
import { ConfigService } from './services/config.service';

/**
 * Simple logger for MCP server
 */
const logger = {
  info: (message: string) => console.error(`[INFO] ${message}`),
  error: (message: string, error?: unknown) => console.error(`[ERROR] ${message}`, error || ''),
  warn: (message: string) => console.error(`[WARN] ${message}`),
};

/**
 * MCP Server instance
 */
const server = new Server(
  {
    name: 'archdoc-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

/**
 * List available tools
 * Dynamically served from tool registry
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getAllTools(),
  };
});

/**
 * List available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'archdoc://documentation',
        name: 'Architecture Documentation',
        description: 'Generated architecture documentation for the project',
        mimeType: 'text/markdown',
      },
    ],
  };
});

/**
 * Read resource
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri.startsWith('archdoc://documentation/')) {
    const projectPath = uri.replace('archdoc://documentation/', '');
    const docsPath = path.join(projectPath, '.arch-docs');

    try {
      const files = await fs.readdir(docsPath);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      let content = '';
      for (const file of mdFiles) {
        const filePath = path.join(docsPath, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        content += `\n\n--- ${file} ---\n\n${fileContent}`;
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to read documentation: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(`Unknown resource URI: ${uri}`);
});

/**
 * Handle tool calls
 * Routes to appropriate handler with context
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const explicitProjectPath = (args as any).project_path;
  const projectPath = explicitProjectPath || process.cwd();

  logger.info(
    `CallTool request received: ${name}${
      explicitProjectPath ? ` (explicit path: ${explicitProjectPath})` : ` (cwd: ${projectPath})`
    }`,
  );

  try {
    // Get the handler for this tool
    const handler = getToolHandler(name);
    if (!handler) {
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
    }

    // Create context for handler (CLI-style: load config once per call, pass it in)
    // Tools that don't need config can ignore it; tools that do should rely on context.config.
    let config = null;
    try {
      // Avoid forcing config for setup/check tools (they intentionally work without it)
      if (name !== 'check_config' && name !== 'setup_config') {
        const configService = ConfigService.getInstance();
        config = await configService.initializeConfig(projectPath);
      }
    } catch {
      // Config missing/invalid is handled by individual tools as needed
      config = null;
    }

    const context = {
      projectPath,
      config,
      logger,
    };

    // Call handler with context
    const result = await handler(args, context);

    return {
      content: result.content,
      isError: result.isError,
    };
  } catch (error) {
    logger.error(`Tool ${name} failed`, error);

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the MCP server on stdio transport
 */
export async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  logger.info('ArchDoc MCP Server starting...');
  await server.connect(transport);
  // Note: connect() never returns - server runs indefinitely
}

// Start server
startServer().catch((error) => {
  logger.error('Failed to start MCP server', error);
  process.exit(1);
});
