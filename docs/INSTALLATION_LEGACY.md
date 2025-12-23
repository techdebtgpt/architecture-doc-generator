# How to Setup ArchDoc MCP in Your Project

This guide explains how to set up the ArchDoc MCP server in **your own repository** (not the architecture-doc-generator repo itself).

---

## Quick Setup (3 Steps)

### 1. Install ArchDoc Globally

```bash
npm install -g @techdebtgpt/archdoc-generator
```

### 2. Create Configuration Files in Your Project

Navigate to **your project** (the one you want to analyze):

```bash
cd /path/to/your-project
```

Create the following files:

#### `.archdoc.config.json` (Project Root)

```json
{
  "apiKeys": {
    "anthropic": "sk-ant-YOUR-KEY-HERE",
    "openai": "sk-proj-YOUR-KEY-HERE",
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
    "strategy": "smart",
    "embeddingsProvider": "local"
  },
  "tracing": {
    "enabled": false,
    "apiKey": "",
    "project": "archdoc-analysis"
  }
}
```

**⚠️ Important:** Add to `.gitignore`:

```gitignore
.archdoc.config.json
.arch-docs/
```

#### `.claude/mcp.json` (For Claude Desktop/Code)

```bash
mkdir -p .claude
```

```json
{
  "mcpServers": {
    "archdoc": {
      "command": "archdoc-mcp-server"
    }
  }
}
```

#### `.vscode/mcp.json` (For VS Code Copilot) - Optional

```bash
mkdir -p .vscode
```

```json
{
  "mcpServers": {
    "archdoc": {
      "command": "archdoc-mcp-server"
    }
  }
}
```

### 3. Restart Your IDE

- **Claude Desktop**: Restart the app
- **Claude Code CLI**: Restart the CLI
- **VS Code**: Reload window (Ctrl+Shift+P → "Developer: Reload Window")

---

## File Structure in Your Project

After setup, your project should look like this:

```
your-project/                    ← YOUR REPOSITORY
├── .claude/
│   └── mcp.json                 ← MCP config for Claude
├── .vscode/
│   └── mcp.json                 ← MCP config for VS Code (optional)
├── .archdoc.config.json         ← ArchDoc configuration (API keys)
├── .gitignore                   ← Add .archdoc.config.json here!
├── src/
│   └── your-code.ts
├── package.json
└── README.md
```

---

## Development Setup (Testing Locally)

If you're developing/testing the MCP server itself:

### 1. Clone the architecture-doc-generator repo

```bash
git clone https://github.com/techdebtgpt/architecture-doc-generator.git
cd architecture-doc-generator
npm install
npm run build
```

### 2. Create MCP configs for **development**

In **your target project** (not architecture-doc-generator):

#### `.claude/mcp.json` (Development)

```json
{
  "mcpServers": {
    "archdoc": {
      "command": "npm",
      "args": ["run", "mcp:dev"],
      "cwd": "/absolute/path/to/architecture-doc-generator",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

#### `.vscode/mcp.json` (Development)

```json
{
  "mcpServers": {
    "archdoc": {
      "command": "npm",
      "args": ["run", "mcp:dev"],
      "cwd": "/absolute/path/to/architecture-doc-generator",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 3. Create `.archdoc.config.json` in your target project

Same as production setup above.

---

## How MCP Loads Configuration

When you call an MCP tool, here's what happens:

```
1. MCP Client (Claude/VS Code)
   ├─ Reads: .claude/mcp.json or .vscode/mcp.json
   ├─ Starts: archdoc-mcp-server (or npm run mcp:dev)
   └─ Working Directory: YOUR PROJECT ROOT

2. MCP Server (archdoc-mcp-server)
   ├─ Starts in: YOUR PROJECT ROOT (process.cwd())
   ├─ Loads: .archdoc.config.json from YOUR PROJECT
   ├─ Applies: Config to environment variables
   └─ Initializes: LLMService with config

3. Documentation Generation
   ├─ Scans: YOUR PROJECT source code
   ├─ Generates: .arch-docs/ in YOUR PROJECT
   └─ Uses: API keys from YOUR .archdoc.config.json
```

---

## Usage Examples

Once set up, you can use these commands in your IDE:

### Check Configuration

```
@archdoc check config
```

**Output:**

```
✅ Configuration Found and Valid

Provider: anthropic
Model: claude-sonnet-4-20250514
API Key: sk-ant-...xxxx
```

### Generate Documentation

```
@archdoc generate documentation with depth=normal
```

**Output:**

```
✅ Documentation generated successfully!

Output: .arch-docs
Agents Executed: 5
Total Tokens: 123,456
Files Generated: 8
```

### Validate Architecture

```
@archdoc validate architecture for src/index.ts
```

**Output:**

```
✅ Validation Result

Compliance: High

Issues Found:
- None

Recommendations:
- Consider adding error handling in line 42
```

---

## Multiple Projects Setup

You can use ArchDoc in multiple projects:

```
workspace/
├── project-a/
│   ├── .claude/mcp.json         ← Points to global archdoc-mcp-server
│   ├── .archdoc.config.json     ← Project A's config (API keys)
│   └── src/
│
├── project-b/
│   ├── .claude/mcp.json         ← Points to global archdoc-mcp-server
│   ├── .archdoc.config.json     ← Project B's config (different keys?)
│   └── src/
│
└── project-c/
    ├── .claude/mcp.json         ← Points to global archdoc-mcp-server
    ├── .archdoc.config.json     ← Project C's config
    └── src/
```

Each project gets its own:

- ✅ Separate `.archdoc.config.json` (API keys, preferences)
- ✅ Separate `.arch-docs/` folder (generated documentation)
- ✅ Same MCP server binary (installed globally)

---

## Troubleshooting

### "No config found"

**Problem:** MCP server can't find `.archdoc.config.json`

**Solution:**

1. Check the file exists in your project root
2. Verify you're running from the correct directory
3. Check file permissions (should be readable)

### "Command not found: archdoc-mcp-server"

**Problem:** Global install not found

**Solution:**

```bash
# Re-install globally
npm install -g @techdebtgpt/archdoc-generator

# Verify installation
which archdoc-mcp-server  # Linux/Mac
where archdoc-mcp-server  # Windows

# Check npm global bin path
npm config get prefix
```

### "API key not working"

**Problem:** Invalid or missing API key

**Solution:**

1. Check `.archdoc.config.json` syntax (valid JSON)
2. Verify API key format:
   - Anthropic: starts with `sk-ant-`
   - OpenAI: starts with `sk-proj-` or `sk-`
   - Google: various formats
3. Test key manually: `node test-mcp-config.js`

### "Config not being loaded by MCP"

**Problem:** MCP server doesn't pick up config changes

**Solution:**

1. Restart your IDE completely
2. Check MCP server logs
3. Verify `process.cwd()` is your project root
4. Use `@archdoc check config` to diagnose

---

## Advanced: Custom Configuration Per Project

You can customize config for different projects:

### Project A: Use Anthropic with Tracing

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514"
  },
  "apiKeys": {
    "anthropic": "sk-ant-..."
  },
  "tracing": {
    "enabled": true,
    "apiKey": "ls_...",
    "project": "project-a-analysis"
  }
}
```

### Project B: Use OpenAI with Vector Search

```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4o"
  },
  "apiKeys": {
    "openai": "sk-proj-..."
  },
  "searchMode": {
    "mode": "vector",
    "embeddingsProvider": "openai",
    "strategy": "smart"
  }
}
```

### Project C: Use Local Embeddings (Free)

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-haiku-20241022"
  },
  "apiKeys": {
    "anthropic": "sk-ant-..."
  },
  "searchMode": {
    "mode": "vector",
    "embeddingsProvider": "local", // ← FREE, offline
    "strategy": "smart"
  }
}
```

---

## Summary

**To use ArchDoc in YOUR project:**

1. ✅ Install globally: `npm install -g @techdebtgpt/archdoc-generator`
2. ✅ Create `.archdoc.config.json` in YOUR project root
3. ✅ Create `.claude/mcp.json` (or `.vscode/mcp.json`) in YOUR project
4. ✅ Add `.archdoc.config.json` to `.gitignore`
5. ✅ Restart IDE
6. ✅ Run: `@archdoc check config`

**The MCP server will:**

- ✅ Load config from YOUR project's `.archdoc.config.json`
- ✅ Generate docs in YOUR project's `.arch-docs/`
- ✅ Analyze YOUR project's source code
- ✅ Use YOUR API keys

🎉 **That's it!** Each project is independent and isolated.
