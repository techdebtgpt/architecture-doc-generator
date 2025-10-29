# Quick Configuration Reference

> One-page reference for configuring ArchDoc

## Why `.archdoc.config.json`?

- ✅ **No conflicts** - Separate from your project's `.env` file
- ✅ **Single file** - All settings in one place (API keys, models, agents, output)
- ✅ **JSON format** - Easy to read, edit, and version control (except API keys)
- ✅ **Flexible location** - Works in `.arch-docs/` folder or project root

## Quick Setup (30 seconds)

```bash
# Interactive setup (easiest)
archdoc config --init

# Follow prompts to:
# 1. Choose LLM provider (Anthropic/OpenAI/Google)
# 2. Enter API key
# 3. Configure optional settings

# Analyze your project
archdoc analyze
```

## Manual Setup

```bash
# Copy template
cp .archdoc.config.example.json .arch-docs/.archdoc.config.json

# Edit and add your API key
nano .arch-docs/.archdoc.config.json

# Run analysis
archdoc analyze
```

## Configuration File Structure

### Minimal Configuration

```json
{
  "apiKeys": {
    "anthropic": "sk-ant-your-key-here"
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

### Complete Configuration

```json
{
  "apiKeys": {
    "anthropic": "sk-ant-your-key-here",
    "openai": "",
    "google": ""
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.2,
    "maxTokens": 4096
  },
  "scan": {
    "maxFiles": 1000,
    "excludePatterns": ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"]
  },
  "agents": [
    "file-structure",
    "dependency-analyzer",
    "pattern-detector",
    "flow-visualization",
    "schema-generator",
    "architecture-analyzer"
  ],
  "refinement": {
    "maxIterations": 5,
    "clarityThreshold": 80
  },
  "output": {
    "directory": ".arch-docs",
    "format": "markdown"
  },
  "tracing": {
    "enabled": false,
    "apiKey": "",
    "project": "archdoc-generator"
  }
}
```

## Configuration Location

ArchDoc searches for configuration in this order:

1. `.arch-docs/.archdoc.config.json` (default, created by `config --init`)
2. `.archdoc.config.json` (root directory)
3. Environment variables (CI/CD override)
4. Built-in defaults

### Example Project Structure

```
my-project/
├── .arch-docs/                 # ← ArchDoc output and config folder
│   ├── .archdoc.config.json    # ← Config file (gitignored - has API keys)
│   ├── index.md                # ← Generated documentation
│   ├── file-structure.md
│   └── ...
├── src/                        # ← Your project code
├── .env                        # ← Project's own config (PostgreSQL, Redis, etc.)
├── .gitignore
└── package.json
```

**No confusion!** Your project's `.env` stays separate from ArchDoc's `.archdoc.config.json`.

## Configuration Management Commands

```bash
# Initialize configuration (interactive)
archdoc config --init

# List current configuration (masks API keys)
archdoc config --list

# Get specific value
archdoc config --get llm.provider
archdoc config --get llm.model

# Set specific value
archdoc config --set llm.provider openai
archdoc config --set llm.temperature 0.5
archdoc config --set llm.model gpt-4-turbo

# Reset to defaults
archdoc config --reset
```

## Common Configuration Tasks

### Switch LLM Provider

```bash
# Via command
archdoc config --set llm.provider openai

# Or edit .archdoc.config.json
{
  "apiKeys": {
    "openai": "sk-your-key-here"
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4-turbo"
  }
}
```

### Enable LangSmith Tracing

```json
{
  "tracing": {
    "enabled": true,
    "apiKey": "lsv2_pt_your-langsmith-key",
    "project": "my-project-analysis"
  }
}
```

### Customize Output Directory

```json
{
  "output": {
    "directory": "./docs/architecture",
    "format": "markdown"
  }
}
```

### Select Specific Agents

```json
{
  "agents": ["file-structure", "dependency-analyzer", "pattern-detector"]
}
```

### Adjust Refinement Quality

```json
{
  "refinement": {
    "maxIterations": 10, // More iterations = better quality
    "clarityThreshold": 90 // Higher threshold = more refinement
  }
}
```

## Environment Variables (CI/CD Override)

For CI/CD pipelines, you can override config with environment variables:

```bash
# GitHub Actions example
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  ARCHDOC_LLM_PROVIDER: anthropic
  ARCHDOC_LLM_MODEL: claude-3-5-sonnet-20241022
  LANGCHAIN_TRACING_V2: true
  LANGCHAIN_API_KEY: ${{ secrets.LANGCHAIN_API_KEY }}
  LANGCHAIN_PROJECT: archdoc-ci
run: archdoc analyze . --output ./docs
```

## LLM Provider Options

| Provider      | Model                        | Best For                                    |
| ------------- | ---------------------------- | ------------------------------------------- |
| **Anthropic** | `claude-3-5-sonnet-20241022` | Deep reasoning, code analysis (recommended) |
| **Anthropic** | `claude-sonnet-4-20250514`   | Latest model, improved performance          |
| **OpenAI**    | `gpt-4-turbo`                | Balanced performance                        |
| **OpenAI**    | `gpt-4o`                     | Latest OpenAI model                         |
| **Google**    | `gemini-1.5-pro`             | Fast processing, cost efficiency            |

## Common Issues

### "No API key configured"

```bash
# Solution: Add API key to config
archdoc config --init
# OR edit .arch-docs/.archdoc.config.json manually
```

### "Config file not found"

```bash
# Check config location
archdoc config --list

# Config should be in one of these locations:
# 1. .arch-docs/.archdoc.config.json
# 2. .archdoc.config.json
# 3. Environment variables
```

### "Invalid JSON in config file"

```bash
# Validate JSON syntax
cat .arch-docs/.archdoc.config.json | jq .

# Common issues:
# - Missing comma
# - Trailing comma
# - Unquoted keys
# - Comments (JSON doesn't support // or # comments)
```

## Best Practices

1. **Use `.arch-docs/.archdoc.config.json`** (default) - Keeps everything in one folder
2. **Gitignore the config file** - Contains API keys (already in `.gitignore`)
3. **Use `config --init`** - Interactive setup is easiest
4. **Enable tracing for debugging** - LangSmith helps optimize agent performance
5. **Start with defaults** - Adjust refinement settings only if needed
6. **Use environment variables for CI/CD** - Keeps secrets secure

## See Also

- [User Guide](./USER_GUIDE.md) - Complete CLI reference
- [Configuration Guide](./CONFIGURATION_GUIDE.md) - Detailed configuration docs
- [Contributing](./CONTRIBUTING.md) - Development setup

---

**Made with ❤️ by the Ritech Team**
