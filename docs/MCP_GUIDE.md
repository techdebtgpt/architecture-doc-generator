# Model Context Protocol (MCP) Server Guide

## Overview

ArchDoc provides an **MCP (Model Context Protocol) server** that enables AI assistants like Claude Desktop, GitHub Copilot (when supported), and other MCP-compatible clients to interact with your codebase architecture in real-time.

**Key Features:**

- 🔍 **RAG-powered semantic search** with FREE local embeddings (no API key required)
- 📚 **8 specialized tools** for architecture analysis
- 🚀 **Zero-cost vector search** using local TF-IDF embeddings
- 🔌 **Standards-based** MCP protocol for broad compatibility
- ⚡ **Real-time analysis** directly in your AI assistant

---

## Quick Start

### 1. Install ArchDoc

```bash
npm install -g @techdebtgpt/archdoc-generator
```

### 2. Run Interactive Setup

Navigate to your project directory and run:

```bash
archdoc-mcp
```

This will:

1. Prompt you to configure LLM provider (Anthropic/OpenAI/Google/xAI)
2. Ask for API key
3. Optionally configure LangSmith tracing
4. Create `.archdoc.config.json` in your project
5. Create `.vscode/mcp.json` for MCP client configuration
6. Add `.archdoc.config.json` to `.gitignore`

**Example interactive session:**

```
? Select LLM provider: Anthropic
? Enter Anthropic API key: sk-ant-...
? Enable LangSmith tracing? Yes
? Enter LangSmith API key: lsv2_pt_...
? Enter LangSmith project name: my-project-docs

✅ Configuration saved to .archdoc.config.json
✅ MCP configuration saved to .vscode/mcp.json
✅ Added .archdoc.config.json to .gitignore
```

### 3. Connect Your MCP Client

The setup wizard created `.vscode/mcp.json` which looks like:

```json
{
  "mcpServers": {
    "archdoc": {
      "command": "archdoc-server-mcp",
      "description": "ArchDoc MCP Server - AI-powered architecture documentation generator with RAG",
      "disabled": false
    }
  }
}
```

**The MCP client will automatically start the server when needed.**

---

## Supported MCP Clients

### Claude Desktop (✅ Available Now)

Claude Desktop has native MCP support.

**Configuration:**

1. Locate config file:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add ArchDoc server:

```json
{
  "mcpServers": {
    "archdoc": {
      "command": "archdoc-server-mcp"
    }
  }
}
```

3. Restart Claude Desktop

4. Test in chat:
   - "Generate architecture documentation for this project"
   - "Search the codebase for authentication logic"
   - "Analyze the dependency graph"

### VS Code / GitHub Copilot (🔜 Coming Soon)

VS Code MCP support is in development. Your `.vscode/mcp.json` is ready for when it's available.

**When available, you can:**

- Use `Ctrl+Shift+P` → `MCP: Add Server`
- Or rely on auto-discovery with `.vscode/mcp.json`

### Other MCP Clients

Any MCP-compatible client can use the server:

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'archdoc-server-mcp',
});

const client = new Client({ name: 'my-client', version: '1.0.0' }, {});
await client.connect(transport);
```

---

## Available MCP Tools

The ArchDoc MCP server provides 9 specialized tools:

### 1. `check_config`

Check if `.archdoc.config.json` exists and is valid. Returns detailed setup instructions if missing or invalid.

**Parameters:**

- `projectPath` (optional): Path to project directory (default: current directory)

**Example prompts:**

- "Check my archdoc configuration"
- "Is my config valid?"
- "Show me my archdoc setup"

**Returns:**

- Configuration status (provider, model, API key preview)
- Validation issues (missing fields, invalid API keys)
- Setup instructions if config is missing

### 2. `generate_documentation`

Generate comprehensive architecture documentation for the project.

**Parameters:**

- `outputDir` (optional): Where to save documentation (default: `./architecture-docs`)
- `format` (optional): Output format - `multi-file` (default) or `single-file`
- `agents` (optional): Specific agents to run (e.g., `["file-structure", "dependencies"]`)

**Example prompts:**

- "Generate architecture documentation"
- "Create docs in ./docs/architecture folder"
- "Generate only file structure and dependency analysis"

### 3. `search_codebase`

Semantic search across codebase with RAG (FREE local embeddings).

**Parameters:**

- `query` (required): Search query (e.g., "authentication logic", "database models")
- `limit` (optional): Max results (default: 10)

**Example prompts:**

- "Search for authentication implementation"
- "Find database connection code"
- "Show me error handling patterns"

### 4. `analyze_file_structure`

Analyze project organization and directory structure.

**Parameters:** None

**Example prompts:**

- "Analyze the project structure"
- "Show me the file organization"
- "What's the project layout?"

### 5. `analyze_dependencies`

Analyze project dependencies and module relationships.

**Parameters:** None

**Example prompts:**

- "Analyze dependencies"
- "Show me the dependency graph"
- "What packages does this use?"

### 6. `detect_patterns`

Detect design patterns and architectural patterns in code.

**Parameters:** None

**Example prompts:**

- "Detect design patterns"
- "What patterns are used here?"
- "Analyze architectural patterns"

### 7. `visualize_flows`

Generate control flow and data flow diagrams.

**Parameters:** None

**Example prompts:**

- "Visualize the control flow"
- "Show me data flows"
- "Generate flow diagrams"

### 8. `generate_schemas`

Extract and document data models/schemas.

**Parameters:** None

**Example prompts:**

- "Generate database schemas"
- "Show me data models"
- "Document the API schemas"

### 9. `get_file_contents`

Retrieve contents of specific files.

**Parameters:**

- `filePaths` (required): Array of file paths to retrieve

**Example prompts:**

- "Show me src/main.ts"
- "Get the contents of package.json and tsconfig.json"

---

## RAG Vector Search (FREE)

The MCP server includes **built-in vector search** with **FREE local embeddings**:

- **No API key required** for vector search
- **TF-IDF based** local embeddings
- **Fast semantic search** over entire codebase
- **Automatically indexes** on first search

**How it works:**

1. First search triggers indexing (one-time per project)
2. Creates `.archdoc-cache/vector-store/` directory
3. Subsequent searches are instant
4. Re-index by deleting cache directory

**Example:**

```
User: "Search for JWT token validation"

MCP Server:
1. Indexes codebase (if not cached)
2. Performs semantic search
3. Returns relevant code snippets with context
```

---

## Configuration

### Basic Configuration (.archdoc.config.json)

Created automatically by `archdoc-mcp`, or manually:

```json
{
  "apiKeys": {
    "anthropic": "sk-ant-..."
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "temperature": 0.2,
    "maxTokens": 4096
  },
  "tracing": {
    "enabled": true,
    "apiKey": "lsv2_pt_...",
    "project": "my-project-docs"
  }
}
```

### Advanced Configuration

For full control, use `archdoc config --init` which includes:

```json
{
  "apiKeys": { ... },
  "llm": { ... },
  "searchMode": {
    "mode": "keyword",
    "embeddingsProvider": "local",
    "strategy": "smart",
    "vectorWeight": 0.6,
    "graphWeight": 0.4,
    "includeRelatedFiles": true,
    "maxDepth": 2,
    "similarityThreshold": 0.3,
    "topK": 10
  },
  "scan": {
    "exclude": ["node_modules", "dist", ".git"],
    "include": ["**/*.ts", "**/*.js", "**/*.py"],
    "maxFileSize": 1048576
  },
  "agents": {
    "fileStructure": { "enabled": true, "priority": "high" },
    "dependencyAnalyzer": { "enabled": true, "priority": "high" },
    "architectureAnalyzer": { "enabled": true, "priority": "high" },
    "patternDetector": { "enabled": true, "priority": "medium" },
    "flowVisualization": { "enabled": true, "priority": "medium" },
    "schemaGenerator": { "enabled": true, "priority": "medium" },
    "securityAnalyzer": { "enabled": true, "priority": "medium" }
  },
  "refinement": {
    "enabled": true,
    "maxIterations": 3,
    "clarityThreshold": 7
  },
  "output": {
    "format": "multi-file",
    "path": "./architecture-docs"
  },
  "tracing": { ... }
}
```

**Search Strategies:**

- `smart` (recommended): Adaptive selection based on query
- `hybrid`: Combines vector + graph search (60/40 weight)
- `vector`: Pure semantic search
- `graph`: Structural/dependency-based search

---

## MCP Client Configuration (.vscode/mcp.json)

Generated automatically by `archdoc-mcp`:

```json
{
  "mcpServers": {
    "archdoc": {
      "command": "archdoc-server-mcp",
      "description": "ArchDoc MCP Server - AI-powered architecture documentation generator with RAG",
      "disabled": false
    }
  }
}
```

**Fields:**

- `command`: The binary to execute (must be in PATH or absolute path)
- `description`: Shows in MCP client UI
- `disabled`: Set to `true` to temporarily disable

**The server uses `process.cwd()` to detect project path automatically.**

---

## Usage Examples

### Example 1: Generate Full Documentation

**In Claude Desktop or MCP client:**

```
User: Generate comprehensive architecture documentation for this project

ArchDoc: [Calls generate_documentation tool]
✅ Generated documentation in ./architecture-docs/
   - index.md
   - file-structure.md
   - dependencies.md
   - architecture.md
   - patterns.md
   - flows.md
   - schemas.md
   - security.md
```

### Example 2: Semantic Search

```
User: Search for authentication and authorization logic

ArchDoc: [Calls search_codebase tool with query="authentication authorization"]
Found 5 relevant files:
1. src/middleware/auth.middleware.ts - JWT validation
2. src/guards/roles.guard.ts - Role-based access control
3. src/services/auth.service.ts - Login/logout logic
4. src/decorators/auth.decorator.ts - Auth decorators
5. config/security.config.ts - Security configuration
```

### Example 3: Analyze Dependencies

```
User: What are the main dependencies and how are they used?

ArchDoc: [Calls analyze_dependencies tool]
## Dependencies Analysis

### Production Dependencies:
- @anthropic-ai/sdk (0.68.0) - Anthropic Claude LLM integration
- @langchain/core (0.3.79) - LangChain framework
- @modelcontextprotocol/sdk (1.21.0) - MCP protocol implementation
- commander (12.1.0) - CLI framework
- ... [full analysis]

### Dependency Graph:
[Visual representation of module relationships]
```

### Example 4: Detect Patterns

```
User: What design patterns are used in this codebase?

ArchDoc: [Calls detect_patterns tool]
## Design Patterns Detected

1. **Singleton Pattern** - LLMService, VectorSearchService
2. **Factory Pattern** - Agent creation in AgentRegistry
3. **Strategy Pattern** - Multiple search strategies (vector/graph/hybrid)
4. **Observer Pattern** - Event-driven workflow system
5. **Builder Pattern** - Configuration builders for prompts
```

---

## Troubleshooting

### Server Not Starting

**Symptoms:** MCP client shows connection error

**Solutions:**

1. Verify `archdoc-server-mcp` is in PATH:

   ```bash
   # Windows
   where.exe archdoc-server-mcp

   # macOS/Linux
   which archdoc-server-mcp
   ```

2. If not found, reinstall:

   ```bash
   npm install -g @techdebtgpt/archdoc-generator
   ```

3. Check `.archdoc.config.json` exists in project root

4. Verify API key is valid in config file

5. Check MCP client logs for detailed errors

### Configuration Not Found

**Symptoms:** Server starts but tools fail with "Configuration not found"

**Solutions:**

1. Run `archdoc-mcp` in your project directory
2. Or create `.archdoc.config.json` manually
3. Ensure config file has valid API key

### Vector Search Slow

**Symptoms:** First search takes long time

**Solutions:**

1. This is normal - first search indexes the codebase
2. Subsequent searches will be fast (cache in `.archdoc-cache/`)
3. Reduce scan scope in config:
   ```json
   {
     "scan": {
       "exclude": ["node_modules", "dist", ".git", "coverage"]
     }
   }
   ```

### LangSmith Tracing Not Working

**Symptoms:** No traces in LangSmith dashboard

**Solutions:**

1. Verify API key starts with `lsv2_pt_` (new format)
2. Check project name is correct
3. Ensure `tracing.enabled: true` in config
4. API key must have write permissions

### Tools Not Appearing in MCP Client

**Symptoms:** AI assistant doesn't recognize ArchDoc tools

**Solutions:**

1. Restart MCP client (Claude Desktop, etc.)
2. Verify `.vscode/mcp.json` or client config is correct
3. Check `disabled: false` in server config
4. Test server manually:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | archdoc-server-mcp
   ```

---

## CLI vs MCP: When to Use Each

### Use MCP Server When:

- ✅ You want real-time AI assistance while coding
- ✅ You need interactive Q&A about architecture
- ✅ You want semantic search within AI chat
- ✅ You're using Claude Desktop or MCP-compatible clients

### Use CLI When:

- ✅ You want to generate static documentation files
- ✅ You need CI/CD integration
- ✅ You want to customize agent workflows
- ✅ You need programmatic API access

**Example CLI usage:**

```bash
# Generate documentation
archdoc analyze /path/to/project

# Initialize configuration
archdoc config --init

# Export in different formats
archdoc export --format=json --output=./docs/
```

---

## Advanced Topics

### Custom Search Strategies

You can fine-tune search behavior in `.archdoc.config.json`:

```json
{
  "searchMode": {
    "strategy": "hybrid",
    "vectorWeight": 0.7,
    "graphWeight": 0.3,
    "includeRelatedFiles": true,
    "maxDepth": 3,
    "similarityThreshold": 0.4,
    "topK": 15
  }
}
```

**Strategy comparison:**

- **smart**: Best for general use (auto-selects based on query)
- **vector**: Best for semantic/conceptual searches
- **graph**: Best for structural/dependency queries
- **hybrid**: Best for complex queries needing both

### Agent Customization

Disable agents you don't need:

```json
{
  "agents": {
    "fileStructure": { "enabled": true, "priority": "high" },
    "dependencyAnalyzer": { "enabled": true, "priority": "high" },
    "securityAnalyzer": { "enabled": false } // Disable
  }
}
```

### Self-Refinement Workflow

Control iterative improvement:

```json
{
  "refinement": {
    "enabled": true,
    "maxIterations": 3, // Max refinement loops
    "clarityThreshold": 7 // 0-10 scale (higher = stricter)
  }
}
```

**How it works:**

1. Agent generates initial analysis
2. Evaluates clarity score (0-10)
3. If score < threshold, generates questions
4. Retrieves additional context
5. Refines analysis (up to maxIterations)

### LangSmith Integration

Track all LLM calls and agent workflows:

```json
{
  "tracing": {
    "enabled": true,
    "apiKey": "lsv2_pt_...",
    "project": "my-project-docs",
    "endpoint": "https://api.smith.langchain.com" // Optional
  }
}
```

**Trace hierarchy:**

```
Agent-file-structure
├── file-structure-InitialAnalysis (LLM call)
├── file-structure-EvaluateClarity (LLM call)
├── file-structure-GenerateQuestions (LLM call)
└── file-structure-Refinement-1 (LLM call)
```

---

## API Reference

### MCP Protocol Methods

The server implements these MCP methods:

#### `initialize`

Initialize MCP session.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "client", "version": "1.0" }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "archdoc-mcp-server",
      "version": "0.3.26"
    }
  }
}
```

#### `tools/list`

List available tools.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**Response:** Array of 8 tool definitions

#### `tools/call`

Execute a tool.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "search_codebase",
    "arguments": {
      "query": "authentication",
      "limit": 10
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Search results..."
      }
    ]
  }
}
```

---

## Security Considerations

### API Key Storage

- ✅ **DO**: Store API keys in `.archdoc.config.json` (gitignored)
- ❌ **DON'T**: Commit API keys to version control
- ❌ **DON'T**: Share config files with keys

> **⚠️ Note**: Environment variables are **NO LONGER** supported for API keys. All configuration must be in `.archdoc.config.json`.

### MCP Server Security

- Server runs locally on your machine
- No data sent to external services (except LLM API calls)
- Vector store is local (`.archdoc-cache/`)
- MCP communication is stdio-based (no network exposure)

### Best Practices

1. **Gitignore**: Setup wizard automatically adds `.archdoc.config.json` to `.gitignore`
2. **Configuration**: All API keys and settings go in `.archdoc.config.json`
3. **Project Isolation**: Each project has its own config and cache
4. **Read-Only Mode**: MCP server only reads code, never modifies files

---

## Performance Optimization

### Indexing Performance

**First-time indexing:**

- Small projects (<100 files): ~5-10 seconds
- Medium projects (100-1000 files): ~30-60 seconds
- Large projects (1000+ files): ~2-5 minutes

**Improve indexing speed:**

```json
{
  "scan": {
    "exclude": ["node_modules", "dist", "build", ".git", "coverage", "*.test.ts"],
    "maxFileSize": 524288 // 512KB limit
  }
}
```

### Search Performance

- **Cached searches**: <100ms
- **New queries**: ~200-500ms (depends on result count)
- **Memory usage**: ~50-200MB (depends on project size)

### LLM Token Usage

**Typical costs per operation:**

- `generate_documentation`: 10k-50k tokens (depends on project size)
- `search_codebase`: 500-2k tokens per query
- `analyze_dependencies`: 5k-15k tokens
- Other tools: 2k-10k tokens

**Reduce costs:**

1. Disable unused agents
2. Lower `maxTokens` in config
3. Use `agents` parameter in `generate_documentation` to run specific agents only

---

## Contributing

### Adding New Tools

1. Implement tool in `src/mcp-server/tools/`
2. Register in `src/mcp-server/index.ts`
3. Add tests
4. Update this documentation

### Reporting Issues

- GitHub Issues: https://github.com/techdebtgpt/architecture-doc-generator/issues
- Include MCP client name and version
- Attach `.archdoc.config.json` (remove API keys!)
- Provide server logs if available

---

## Resources

- **MCP Specification**: https://modelcontextprotocol.io/
- **LangChain Docs**: https://js.langchain.com/
- **LangSmith**: https://smith.langchain.com/
- **Anthropic API**: https://docs.anthropic.com/
- **OpenAI API**: https://platform.openai.com/docs
- **Google Gemini**: https://ai.google.dev/

---

## License

Apache-2.0 - See LICENSE file for details

---

## Changelog

### v0.3.26

- Added MCP server support
- Integrated FREE local vector search
- Added 8 specialized MCP tools
- Interactive setup wizard (`archdoc-mcp`)
- LangSmith tracing support
- Multi-strategy search (smart/hybrid/vector/graph)

### Previous Versions

See CHANGELOG.md for full history
