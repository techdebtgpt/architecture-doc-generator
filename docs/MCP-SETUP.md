# MCP Server Setup Guide

ArchDoc Generator includes a **Model Context Protocol (MCP)** server that allows AI assistants like Claude, Cursor, and VS Code's GitHub Copilot to access architecture analysis tools directly.

## What is MCP?

MCP (Model Context Protocol) is an open standard that enables AI models to safely access external data sources and tools. With ArchDoc's MCP server, you can:

- Generate architecture documentation from Claude/Cursor
- Query documentation with semantic search
- Analyze dependencies and patterns
- Get architecture recommendations
- Validate code against documented architecture

## Quick Start

### Step 1: Configure ArchDoc

First, set up your ArchDoc configuration with your LLM provider:

```bash
archdoc config --init
```

This will prompt you to configure:
- LLM provider (anthropic, openai, google, xai)
- Model to use
- API key
- Search mode (keyword or vector)

### Step 2: Set Up MCP for Your Client

Choose your AI client and run the setup command:

#### For Cursor

```bash
archdoc setup-mcp cursor
```

Then restart Cursor. The MCP server will be available in your project.

#### For Claude Code

```bash
archdoc setup-mcp claude-code
```

Then restart Claude Code.

#### For VS Code + GitHub Copilot

```bash
archdoc setup-mcp vscode
```

Then restart VS Code.

#### For Claude Desktop

```bash
archdoc setup-mcp claude-desktop
```

Then restart Claude Desktop.

## Setup Details by Client

### Cursor

The setup command adds ArchDoc to your Cursor MCP configuration at `~/.cursor/mcp.json`.

**After setup:**

1. Restart Cursor
2. Go to Settings > Models > MCP Servers
3. Enable the "archdoc" server
4. You're ready to use it!

**In Cursor:**
- Type `@archdoc` to access ArchDoc tools
- Use tools like `@archdoc generate_documentation` or `@archdoc query_documentation`

### Claude Code

The setup command configures ArchDoc at `~/.claude/mcp.json`.

**After setup:**

1. Restart Claude Code
2. The MCP server will automatically be available
3. Ask Claude Code to use ArchDoc tools

**Example prompts:**
- "Use the archdoc tool to generate documentation for this project"
- "Query the architecture documentation to understand the data flow"

### VS Code + GitHub Copilot

The setup command creates a configuration at `~/.vscode/mcp.json`.

**After setup:**

1. Restart VS Code
2. The MCP server should be available to Copilot
3. Use Copilot Chat with ArchDoc commands

**Example prompts:**
- "@archdoc generate_documentation"
- "Use archdoc to analyze the project structure"

### Claude Desktop

The setup command configures ArchDoc in the Claude Desktop config:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `~/AppData/Roaming/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

**After setup:**

1. Restart Claude Desktop
2. The MCP server will be available
3. Use it like any other MCP tool

## Available MCP Tools

Once the MCP server is set up, you can use these tools:

### 1. `check_config`

Verify your ArchDoc configuration is valid.

**Usage:** "Check if my ArchDoc config is valid"

**Returns:** Configuration status and any issues

### 2. `setup_config`

Create or update your `.archdoc.config.json` file.

**Parameters:**
- `provider` - LLM provider (required)
- `model` - Model to use (required)
- `apiKey` - API key for provider (required)
- `searchMode` - "keyword" or "vector" (optional)
- `enableTracing` - Enable LangSmith tracing (optional)

**Usage:** "Set up ArchDoc with my API key"

### 3. `generate_documentation`

Generate comprehensive architecture documentation.

**Parameters:**
- `outputDir` - Output directory (default: .arch-docs)
- `depth` - Analysis depth: "quick", "normal", or "deep"
- `focusArea` - Focus area (e.g., "security", "performance")
- `selectiveAgents` - Run only specific agents
- `maxCostDollars` - Budget limit

**Usage:** "Generate architecture documentation for this project"

### 4. `query_documentation`

Search documentation using semantic search (RAG).

**Parameters:**
- `question` - Your question (required)
- `topK` - Number of results (default: 5)

**Usage:** "How does the authentication system work?"

### 5. `update_documentation`

Add new focus areas to existing documentation.

**Parameters:**
- `prompt` - What to add/analyze
- `existingDocsPath` - Path to existing docs

**Usage:** "Add security analysis to my documentation"

### 6. `check_architecture_patterns`

Detect design patterns and anti-patterns.

**Usage:** "Check what design patterns are used in this code"

### 7. `analyze_dependencies`

Analyze project dependencies.

**Parameters:**
- `includeDevDeps` - Include dev dependencies (default: true)

**Usage:** "Analyze the project dependencies"

### 8. `get_recommendations`

Get improvement recommendations.

**Parameters:**
- `focusArea` - "security", "performance", "maintainability", or "all"

**Usage:** "What improvements would you recommend?"

### 9. `validate_architecture`

Validate code against documented architecture.

**Parameters:**
- `filePath` - File to validate (required)

**Usage:** "Validate this file against our architecture"

## Running the MCP Server Locally

For development or testing, you can run the MCP server directly:

```bash
npm run mcp:dev
```

Or with the compiled version:

```bash
npm run mcp:build
```

The server runs on stdio and accepts MCP protocol requests.

## Troubleshooting

### Server Won't Start

**Error:** "Command not found: archdoc-mcp-server"

**Solution:**
1. Make sure you've built the project: `npm run build`
2. Install locally first: `npm install @techdebtgpt/archdoc-generator`
3. For development, use: `npm run mcp:dev`

### Config Not Found

**Error:** "No Configuration Found"

**Solution:**
1. Run: `archdoc config --init`
2. Follow the prompts to set up your provider and API key
3. Make sure `.archdoc.config.json` is in your project root

### MCP Server Not Available After Setup

**Solution:**
1. Check that the setup command completed successfully
2. Verify the config file was created (check paths above for your OS)
3. Restart your AI client completely (not just reload)
4. Check logs: Look in your AI client's console/logs for errors

### Slow Documentation Generation

**Tips:**
1. Use `--depth quick` for faster analysis
2. Use `--search-mode keyword` (faster than vector search)
3. Limit with `--selective-agents` to run only needed agents
4. Set `--max-cost` to limit iterations

### API Key Errors

**Error:** "No API key configured"

**Solution:**
1. Run: `archdoc config --init`
2. Enter your API key when prompted
3. Verify it's in `.archdoc.config.json`
4. Make sure `.gitignore` includes `.archdoc.config.json`

## Security Considerations

1. **API Keys:** Your API keys are stored in `.archdoc.config.json` locally
   - Add `.archdoc.config.json` to `.gitignore`
   - Never commit this file
   - Never share your config file

2. **MCP Execution:** The MCP server runs with local file system access
   - Only add MCP servers from trusted sources
   - Review the server configuration before enabling

3. **Data Privacy:** ArchDoc sends your code to your configured LLM provider
   - Review your LLM provider's privacy policy
   - Consider using local embeddings (`--search-mode keyword`)

## Supported LLM Providers

### Anthropic (Claude)

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "apiKey": "sk-ant-..."
}
```

### OpenAI (GPT)

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "apiKey": "sk-..."
}
```

### Google (Gemini)

```json
{
  "provider": "google",
  "model": "gemini-2.0-flash-exp",
  "apiKey": "..."
}
```

### xAI (Grok)

```json
{
  "provider": "xai",
  "model": "grok-2-latest",
  "apiKey": "..."
}
```

## Advanced Configuration

### Enable Vector Search

For semantic search (requires more resources):

```json
{
  "searchMode": {
    "mode": "vector",
    "strategy": "smart",
    "embeddingsProvider": "local"
  }
}
```

### Enable Tracing (LangSmith)

For debugging and monitoring:

```json
{
  "tracing": {
    "enabled": true,
    "apiKey": "...",
    "project": "archdoc-analysis"
  }
}
```

### Hybrid Retrieval

Combine semantic and structural search:

```json
{
  "searchMode": {
    "strategy": "hybrid",
    "vectorWeight": 0.6,
    "graphWeight": 0.4
  }
}
```

## Example Workflows

### Workflow 1: Generate and Query Documentation

1. In Claude/Cursor: "Use archdoc to generate documentation for this project"
2. Wait for completion
3. Ask: "Query the documentation: what authentication system is used?"
4. Ask follow-up questions about the architecture

### Workflow 2: Security Analysis

1. Generate docs with focus: "Generate docs focusing on security"
2. Query: "What security patterns are implemented?"
3. Ask: "Get security recommendations for improvements"
4. Validate files: "Validate auth.ts against our architecture"

### Workflow 3: Dependency Analysis

1. Run: "Analyze the project dependencies"
2. Review findings
3. Ask: "What are your recommendations based on the dependencies?"

## FAQ

**Q: Can I use the MCP server without configuring an API key locally?**

A: Yes, for Claude Desktop and some other clients, you can prompt for the API key at runtime. However, having `.archdoc.config.json` set up makes it easier.

**Q: Can I use different LLM providers for documentation generation vs. embeddings?**

A: Yes! You can use Claude for analysis and local embeddings for search:
```json
{
  "llm": { "provider": "anthropic" },
  "searchMode": { "embeddingsProvider": "local" }
}
```

**Q: Is there a performance overhead to using MCP?**

A: No, the MCP server uses stdio for communication, which is very efficient. Performance is mainly determined by your LLM provider.

**Q: Can I disable the MCP server if I'm not using it?**

A: Yes, just don't run the setup command. The MCP server is optional and only active if you've configured it for a client.

**Q: How do I remove the MCP server from a client?**

A: Delete the archdoc entry from the client's config file:
- Cursor: `~/.cursor/mcp.json`
- Claude Code: `~/.claude/mcp.json`
- VS Code: `~/.vscode/mcp.json`
- Claude Desktop: See paths above for your OS

## Support

For issues or questions:

- GitHub Issues: https://github.com/techdebtgpt/architecture-doc-generator/issues
- Documentation: https://techdebtgpt.com
- Discord: [Join our community]

## Next Steps

1. Set up your configuration: `archdoc config --init`
2. Choose your AI client and run setup: `archdoc setup-mcp <client>`
3. Restart your AI client
4. Try the MCP tools in your AI client!

Happy documenting! 🚀
