#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

interface McpInput {
  id: string;
  type: 'promptString' | 'pickString';
  description: string;
  options?: string[];
  default?: string;
}

interface McpServer {
  type: string;
  command: string;
  cwd: string;
}

interface McpConfig {
  servers: {
    [key: string]: McpServer;
  };
  inputs: McpInput[];
}

const MCP_JSON_TEMPLATE: McpConfig = {
  servers: {
    archdoc: {
      type: 'stdio',
      command: 'archdoc-mcp-server',
      cwd: '${workspaceFolder}',
    },
  },
  inputs: [
    {
      id: 'api_key',
      type: 'promptString',
      description: 'Enter your API key for the selected LLM provider',
    },
    {
      id: 'llm_provider',
      type: 'pickString',
      description: 'Select LLM provider',
      options: ['openai', 'anthropic', 'google', 'xai'],
      default: 'openai',
    },
    {
      id: 'llm_model',
      type: 'pickString',
      description: 'Select LLM model',
      options: [
        // OpenAI
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'o1-preview',
        'o1-mini',
        // Anthropic
        'claude-sonnet-4-20250514',
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        // Google
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-latest',
        // xAI
        'grok-beta',
        'grok-2-latest',
      ],
      default: 'gpt-4o',
    },
    {
      id: 'search_mode',
      type: 'pickString',
      description: 'File search mode (keyword = free, vector = semantic)',
      options: ['keyword', 'vector'],
      default: 'keyword',
    },
    {
      id: 'enable_tracing',
      type: 'pickString',
      description: 'Enable LangSmith tracing?',
      options: ['true', 'false'],
      default: 'false',
    },
  ],
};

(async () => {
  const mcpConfigPath = path.join(process.cwd(), '.vscode/mcp.json');

  fs.writeFileSync(mcpConfigPath, JSON.stringify(MCP_JSON_TEMPLATE, null, 2));

  // eslint-disable-next-line no-console
  console.log(`✅ .mcp.json file created at: ${mcpConfigPath}`);
})();
