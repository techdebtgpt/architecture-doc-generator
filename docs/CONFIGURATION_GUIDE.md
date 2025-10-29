# Configuration Guide

> Complete guide to configuring ArchDoc for your project

## Table of Contents

- [Quick Setup](#quick-setup)
- [Configuration Methods](#configuration-methods)
- [Configuration Priority](#configuration-priority)
- [Environment Variables](#environment-variables)
- [Config File Reference](#config-file-reference)
- [LangSmith Tracing](#langsmith-tracing)
- [Examples](#examples)

## Quick Setup

### Interactive Setup (Recommended)

The easiest way to get started:

```bash
archdoc config --init
```

This interactive wizard will:

1. Prompt you to choose an LLM provider (Anthropic/OpenAI/Google)
2. Ask for your API key
3. Create `.arch-docs/.archdoc.config.json` with your configuration
4. Configure optional LangSmith tracing
5. Validate your setup

### Manual Setup

1. **Copy configuration template**:

```bash
cp .archdoc.config.example.json .arch-docs/.archdoc.config.json
```

2. **Add your API key** (at least one required):

```json
{
  "apiKeys": {
    "anthropic": "sk-ant-your-key-here",
    "openai": "",
    "google": ""
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

3. **Run analysis**:

```bash
archdoc analyze
```

## Configuration Methods

ArchDoc supports four ways to configure behavior:

| Method                     | Purpose                     | Priority | Commit to Git?         |
| -------------------------- | --------------------------- | -------- | ---------------------- |
| **Default values**         | Built-in fallbacks          | Lowest   | N/A                    |
| **`.archdoc.config.json`** | Project settings + API keys | Medium   | ❌ Never (has secrets) |
| **Environment variables**  | CI/CD overrides             | High     | N/A                    |
| **CLI flags**              | Override everything         | Highest  | N/A                    |

### When to Use Each Method

**Use `.archdoc.config.json` for**:

- API keys (stored in `.arch-docs/` folder, gitignored)
- Model selection (provider, model name, temperature)
- Scan settings (excludePatterns, maxFiles)
- Agent configuration (enabled agents, parallel execution)
- Output preferences (directory, format)
- Refinement settings (maxIterations, threshold)

**Use environment variables for**:

- CI/CD secrets (GitHub Actions, GitLab CI)
- Temporary overrides during development
- LangSmith tracing credentials (optional)

**Use CLI flags for**:

- One-off overrides
- Testing different configurations
- CI/CD customization
- Quick experiments

## Configuration Priority

Later sources override earlier ones:

```
Default Values < Config File < Environment Variables < CLI Flags
```

**Example**:

```json
// .archdoc.config.json
{
  "apiKeys": {
    "anthropic": "sk-ant-your-key"
  },
  "llm": {
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.2
  }
}
```

```bash
# Environment variable override
export ARCHDOC_LLM_MODEL=gpt-4-turbo
```

```bash
# CLI
archdoc analyze --model gemini-2.0-flash --temperature 0.5
```

**Result**: Uses `gemini-2.0-flash` at temperature `0.5` (CLI wins)

## Environment Variables

### Required Variables

At least **one** LLM provider API key (in `.archdoc.config.json`):

```json
{
  "apiKeys": {
    "anthropic": "sk-ant-api03-your-key-here",
    "openai": "",
    "google": ""
  }
}
```

**Get API Keys**:

- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/
- Google: https://ai.google.dev/

### Optional Variables

#### LLM Configuration

```env
# Override config file settings
LLM_PROVIDER=anthropic              # anthropic | openai | google
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_TEMPERATURE=0.2                 # 0-1 (lower = more deterministic)
LLM_MAX_TOKENS=4096                 # Max output tokens
```

#### LangSmith Tracing

```json
{
  "tracing": {
    "enabled": true,
    "apiKey": "lsv2_pt_your-key-here",
    "project": "archdoc-analysis"
  }
}
```

Or via environment variables:

```bash
# Enable LangSmith for debugging (like tech-debt-api)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_your-key-here
LANGCHAIN_PROJECT=archdoc-analysis
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_CALLBACKS_BACKGROUND=true
```

#### Output Configuration

```env
OUTPUT_DIR=.arch-docs              # Default output directory
OUTPUT_CLEAN=true                  # Clean before generation
OUTPUT_SPLIT_FILES=true            # Generate multi-file structure
```

#### Agent Configuration

```env
AGENTS_ENABLED=file-structure,dependency-analyzer,pattern-detector
AGENTS_PARALLEL=true               # Run agents in parallel
AGENTS_TIMEOUT=300000              # Timeout in ms (5 minutes)
```

#### Refinement Configuration

```env
REFINEMENT_ENABLED=true            # Enable iterative refinement
REFINEMENT_MAX_ITERATIONS=5        # Max refinement loops
REFINEMENT_CLARITY_THRESHOLD=80    # Stop when clarity reaches 80%
REFINEMENT_MIN_IMPROVEMENT=10      # Min improvement to continue
```

#### Scanning Configuration

```env
SCAN_MAX_FILES=1000               # Max files to analyze
SCAN_MAX_FILE_SIZE=1048576        # Max file size (1MB)
SCAN_RESPECT_GITIGNORE=true       # Respect .gitignore
SCAN_INCLUDE_HIDDEN=false         # Include hidden files
SCAN_FOLLOW_SYMLINKS=false        # Follow symbolic links
```

## Config File Reference

### `.archdoc.config.json`

Project-specific settings (safe to commit):

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.2,
    "maxTokens": 4096
  },
  "scan": {
    "maxFiles": 1000,
    "maxFileSize": 1048576,
    "respectGitignore": true,
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.git/**",
      "**/*.min.js",
      "**/*.map"
    ],
    "includeHidden": false,
    "followSymlinks": false
  },
  "agents": {
    "enabled": [
      "file-structure",
      "dependency-analyzer",
      "pattern-detector",
      "flow-visualization",
      "schema-generator",
      "architecture-analyzer"
    ],
    "parallel": true,
    "timeout": 300000
  },
  "refinement": {
    "enabled": true,
    "maxIterations": 5,
    "clarityThreshold": 80,
    "minImprovement": 10
  },
  "output": {
    "directory": ".arch-docs",
    "format": "markdown",
    "clean": true,
    "splitFiles": true,
    "includeTOC": true,
    "includeMetadata": true
  },
  "tracing": {
    "enabled": false,
    "provider": "langsmith",
    "project": "archdoc-analysis"
  }
}
```

### Managing Config File

```bash
# View all settings
archdoc config --list

# Get specific value
archdoc config --get llm.model
archdoc config --get agents.enabled

# Set value
archdoc config --set llm.temperature=0.5
archdoc config --set refinement.enabled=false

# Reset to defaults
archdoc config --reset
```

## LangSmith Tracing

LangSmith provides visibility into LLM calls, similar to tech-debt-api configuration.

### Why Use LangSmith?

- **Debug agent execution** - See exactly what each agent is doing
- **Monitor token usage** - Track costs and optimize
- **Optimize prompts** - Test different prompt strategies
- **Share traces** - Collaborate with team on improvements
- **Performance metrics** - Identify bottlenecks

### Setup

1. **Get API key** from https://smith.langchain.com/

2. **Add to `.archdoc.config.json`**:

```json
{
  "tracing": {
    "enabled": true,
    "apiKey": "lsv2_pt_your-key-here",
    "project": "archdoc-analysis"
  }
}
```

3. **Or use environment variables**:

```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=lsv2_pt_your-key-here
export LANGCHAIN_PROJECT=archdoc-analysis
```

4. **Run analysis**:

```bash
archdoc analyze --verbose
```

5. **View traces** at https://smith.langchain.com/

### Trace Hierarchy Example

With tracing enabled, you'll see:

```
DocumentationGeneration-Complete
├── ScanProjectStructure (524ms)
├── CreateExecutionContext (12ms)
├── ExecuteAgents (45.3s)
│   ├── Agent-file-structure (12.4s)
│   │   ├── PrepareData (234ms)
│   │   ├── BuildPrompt (89ms)
│   │   └── LLMAnalysis (11.8s)
│   │       ├── Input: 12,453 tokens
│   │       └── Output: 2,891 tokens
│   ├── Agent-dependency-analyzer (15.2s)
│   │   └── ...
│   └── Agent-pattern-detector (18.7s)
└── AggregateResults (892ms)
```

### Best Practices

- **Development**: Enable tracing to debug issues
- **Production**: Disable tracing to reduce latency
- **CI/CD**: Enable for first run, disable for subsequent runs
- **Team collaboration**: Share project name for shared traces

## Examples

### Example 1: Quick Local Setup

```bash
# Interactive setup
archdoc config --init

# Follow wizard to add Anthropic key

# Run analysis
archdoc analyze
```

### Example 2: CI/CD Setup

```yaml
# .github/workflows/docs.yml
name: Generate Documentation

on:
  push:
    branches: [main]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install ArchDoc
        run: npm install -g @archdoc/generator

      - name: Generate Documentation
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          LANGCHAIN_TRACING_V2: false # Disable for faster execution
        run: archdoc analyze . --output ./docs --depth quick

      - name: Commit docs
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/
          git commit -m "docs: auto-generate architecture documentation" || true
          git push
```

### Example 3: Team Configuration

**`.archdoc.config.json`** (in `.arch-docs/` folder, gitignored - each team member has their own):

```json
{
  "apiKeys": {
    "anthropic": "sk-ant-their-personal-key"
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.2
  },
  "scan": {
    "excludePatterns": ["**/node_modules/**", "**/test/**", "**/*.spec.ts"]
  },
  "agents": {
    "enabled": ["file-structure", "dependency-analyzer", "architecture-analyzer"]
  },
  "output": {
    "directory": "docs/architecture"
  },
  "tracing": {
    "enabled": true,
    "apiKey": "lsv2_pt_their-personal-key",
    "project": "my-archdoc-testing"
  }
}
```

### Example 4: Multi-Environment Setup

```bash
# Development (detailed tracing)
LANGCHAIN_TRACING_V2=true \
LANGCHAIN_PROJECT=archdoc-dev \
archdoc analyze --depth deep --verbose

# Staging (moderate detail)
archdoc analyze --depth normal

# Production (fast, no tracing)
LANGCHAIN_TRACING_V2=false \
archdoc analyze --depth quick --no-refinement
```

### Example 5: Cost Optimization

```json
{
  "llm": {
    "provider": "google",
    "model": "gemini-1.5-flash", // Cheapest option
    "temperature": 0.2
  },
  "scan": {
    "maxFiles": 500, // Limit scope
    "maxFileSize": 524288 // 512KB max
  },
  "refinement": {
    "enabled": false // Skip refinement
  },
  "agents": {
    "enabled": [
      "file-structure", // Only essential agents
      "dependency-analyzer"
    ]
  }
}
```

## Tech-Debt-API Configuration Reference

For consistency with tech-debt-api, use these settings:

```json
{
  "apiKeys": {
    "anthropic": "your-key-here"
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  },
  "tracing": {
    "enabled": true,
    "apiKey": "lsv2_pt_your-key-here",
    "project": "archdoc-analysis"
  }
}
```

Or via environment variables:

```bash
# LLM Configuration (matches tech-debt-api)
ANTHROPIC_API_KEY=your-key-here

# LangSmith Tracing (same as tech-debt-api local)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=lsv2_pt_your-key-here
LANGCHAIN_PROJECT=archdoc-analysis
LANGCHAIN_CALLBACKS_BACKGROUND=true
```

This ensures both tools use consistent AI settings.

---

## Navigation

[🏠 Home](../README.md) | [📖 Docs Index](./README.md) | [📘 User Guide](./USER_GUIDE.md) | [🔌 Integration Guide](./INTEGRATION_GUIDE.md)
