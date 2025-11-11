#!/usr/bin/env node

/**
 * MCP Server for Architecture Documentation Generator
 * Refactored for maintainability and testability
 *
 * Architecture:
 * - Types & Interfaces (types.ts)
 * - Tool Registry (tools/tool-registry.ts) - Tool definitions
 * - Tool Handlers (tools/handlers.ts) - Tool implementations
 * - Services (services/) - Business logic
 *   ├── ConfigService - Configuration management
 *   ├── DocumentationService - Documentation generation
 *   └── VectorStoreService - RAG vector store
 * - This file: MCP Protocol implementation & orchestration
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
import { Logger } from '../utils/logger';
import { getAllTools } from './tools/tool-registry';
import { getToolHandler } from './tools/handlers';
import { ConfigService } from './services/config.service';

const logger = new Logger('MCP-Server');

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
 * Routes to appropriate handler with proper context
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const projectPath = process.cwd();

  try {
    // Get the handler for this tool
    const handler = getToolHandler(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Initialize configuration
    const configService = ConfigService.getInstance();
    const config = await configService.initializeConfig(projectPath);

    // Create context for handler
    const context = {
      projectPath,
      config,
      logger,
    };

    // Call handler with context
    const result = await handler(args, context);

    // Convert ToolResponse to MCP ServerResult format
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
 * Start the MCP server on stdio
 */
async function start() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('ArchDoc MCP Server started on stdio transport');
}

// Start server
start().catch((error) => {
  logger.error('Failed to start MCP server', error);
  process.exit(1);
});
