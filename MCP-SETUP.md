# MCP Server Setup Guide

This guide explains how to set up the ArchDoc MCP server for use with Claude Code CLI and VS Code.

## Overview

The ArchDoc MCP server exposes your architecture documentation tools through the Model Context Protocol, allowing AI assistants (Claude, Copilot, etc.) to:
- Generate architecture documentation
- Query existing documentation using RAG
- Analyze patterns, dependencies, and architecture compliance
- Get improvement recommendations

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│  Claude Code    │         │  VS Code         │         │  .archdoc.config.   │
│  CLI            │────────▶│  (Copilot)       │────────▶│  json               │
│  .claude/mcp    │         │  .vscode/mcp     │         │  (API keys, config) │
└─────────────────┘         └──────────────────┘         └─────────────────────┘
         │                           │                             ▲
         └───────────┬───────────────┘                             │
                     ▼                                             │
         ┌────────────────────────────┐                            │
         │  archdoc-mcp-server        │                            │
         │  (stdio transport)         │────────────────────────────┘
         │  9 MCP Tools               │
         └────────────────────────────┘
                     │
                     ▼
         ┌────────────────────────────┐
         │  CLI Commands              │
         │  - analyze                 │
         │  - export                  │
         │  - config                  │
         └────────────────────────────┘
```

## Setup

### 1. Development Setup (Local Testing)

When developing the MCP server:

**For Claude Code CLI:**
```json
// .claude/mcp.json
{
  "mcpServers": {
    "archdoc": {
      "command": "npm",
      "args": ["run", "mcp:dev"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

**For VS Code:**
```json
// .vscode/mcp.json
{
  "mcpServers": {
    "archdoc": {
      "command": "npm",
      "args": ["run", "mcp:dev"],
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 2. Production Setup (After npm publish)

After installing globally: `npm install -g @techdebtgpt/archdoc-generator`

**For Claude Code CLI:**
```json
// .claude/mcp.json
{
  "mcpServers": {
    "archdoc": {
      "command": "archdoc-mcp-server"
    }
  }
}
```

**For VS Code:**
```json
// .vscode/mcp.json
{
  "mcpServers": {
    "archdoc": {
      "command": "archdoc-mcp-server"
    }
  }
}
```

### 3. Configuration File

Both setups read from `.archdoc.config.json` in your workspace root:

```json
{
  "apiKeys": {
    "anthropic": "sk-ant-...",
    "openai": "sk-proj-...",
    "google": "",
    "xai": ""
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "temperature": 0.2,
    "maxTokens": 4096
  },
  "searchMode": {
    "mode": "keyword",
    "embeddingsProvider": "local",
    "strategy": "smart"
  }
}
```

**Security:** `.archdoc.config.json` is gitignored to protect API keys.

## Available MCP Tools

### 1. `check_config`
Check if `.archdoc.config.json` exists and is valid.

**Usage:**
```
@archdoc check config
```

### 2. `setup_config`
Create or update `.archdoc.config.json` with configuration.

**Parameters:**
- `provider`: anthropic | openai | google | xai
- `model`: Model name (e.g., "claude-sonnet-4-20250514")
- `apiKey`: Your API key
- `searchMode`: keyword | vector (optional)
- `retrievalStrategy`: smart | vector | graph | hybrid (optional)
- `enableTracing`: boolean (optional)

**Usage:**
```
@archdoc setup config with provider=anthropic, model=claude-sonnet-4-20250514, apiKey=sk-ant-...
```

### 3. `generate_documentation`
Generate comprehensive architecture documentation.

**Parameters:**
- `outputDir`: Output directory (default: .arch-docs)
- `depth`: quick | normal | deep
- `focusArea`: Optional focus (e.g., "security")
- `selectiveAgents`: Array of specific agents to run
- `maxCostDollars`: Budget limit (default: 5.0)

**Usage:**
```
@archdoc generate documentation with depth=normal
```

### 4. `query_documentation`
Query existing documentation using RAG (semantic search).

**Parameters:**
- `question`: Question to answer
- `topK`: Number of relevant sections (default: 5)

**Usage:**
```
@archdoc query documentation: "What design patterns are used?"
```

### 5. `update_documentation`
Incrementally update existing documentation with a focus area.

**Parameters:**
- `prompt`: What to add/update (e.g., "analyze security vulnerabilities")
- `existingDocsPath`: Path to docs (default: .arch-docs)

**Usage:**
```
@archdoc update documentation: "add security analysis"
```

### 6. `check_architecture_patterns`
Detect design patterns and anti-patterns in code.

**Parameters:**
- `filePaths`: Optional specific files to analyze

**Usage:**
```
@archdoc check architecture patterns
```

### 7. `analyze_dependencies`
Analyze project dependencies, detect circular deps, outdated packages.

**Parameters:**
- `includeDevDeps`: Include dev dependencies (default: true)

**Usage:**
```
@archdoc analyze dependencies
```

### 8. `get_recommendations`
Get improvement recommendations for the project.

**Parameters:**
- `focusArea`: security | performance | maintainability | all (default: all)

**Usage:**
```
@archdoc get recommendations for security
```

### 9. `validate_architecture`
Validate if code follows documented architecture patterns.

**Parameters:**
- `filePath`: File to validate

**Usage:**
```
@archdoc validate architecture for src/index.ts
```

## Testing the MCP Server

### Test Locally (Development)

1. Build the project:
```bash
npm run build
```

2. Run the MCP server directly:
```bash
npm run mcp:dev
```

3. Or test via CLI:
```bash
npm run cli:dev analyze
```

### Test in Claude Code CLI

1. Ensure `.claude/mcp.json` is configured (development setup)
2. Restart Claude Code CLI
3. Try a command:
```
@archdoc check config
```

### Test in VS Code

1. Ensure `.vscode/mcp.json` is configured (development setup)
2. Reload VS Code
3. Open Copilot and try:
```
@archdoc check config
```

## Troubleshooting

### MCP server not found

**Error:** `command not found: archdoc-mcp-server`

**Solution:**
- Development: Use `npm run mcp:dev` in config
- Production: Install globally first: `npm install -g @techdebtgpt/archdoc-generator`

### Configuration not found

**Error:** `No configuration found at .archdoc.config.json`

**Solution:**
1. Create config using: `@archdoc setup config`
2. Or run: `archdoc config init` from CLI

### API key invalid

**Error:** `No API key configured for provider`

**Solution:**
- Check `.archdoc.config.json` has the correct API key for your provider
- Ensure the provider name matches (anthropic, openai, google, xai)

### Permission denied

**Error:** `EACCES: permission denied`

**Solution:**
- Development: Run from project root where package.json exists
- Production: Check global npm permissions: `npm config get prefix`

## Next Steps

1. Set up your configuration: `@archdoc setup config`
2. Generate documentation: `@archdoc generate documentation`
3. Query your docs: `@archdoc query documentation: "how does authentication work?"`
4. Get recommendations: `@archdoc get recommendations`

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Claude Code CLI Docs](https://docs.anthropic.com/claude/claude-code)
- [VS Code Copilot MCP Integration](https://code.visualstudio.com/docs/copilot)
