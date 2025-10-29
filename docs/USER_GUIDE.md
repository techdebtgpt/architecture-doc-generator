# User Guide

> Complete guide to using the Architecture Documentation Generator

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Reference](#cli-reference)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## Installation

### Global Installation (Recommended for CLI)

```bash
# Using npm
npm install -g @archdoc/generator

# Using yarn
yarn global add @archdoc/generator

# Using pnpm
pnpm add -g @archdoc/generator
```

### Local Project Installation

```bash
# Using npm
npm install --save-dev @archdoc/generator

# Using yarn
yarn add --dev @archdoc/generator

# Using pnpm
pnpm add -D @archdoc/generator
```

### From Source

```bash
git clone https://github.com/ritech/architecture-doc-generator.git
cd architecture-doc-generator
npm install
npm run build
npm link
```

## Quick Start

### 1. Interactive Setup (Easiest)

Run the interactive configuration wizard:

```bash
archdoc config --init
```

This will:
- Create `.archdoc.config.json` with default settings
- Create `.archdoc.config.example.json` template
- Guide you through API key setup
- Configure optional LangSmith tracing

### 2. Manual Setup

Copy the example environment file and add your API keys:

```bash
# Copy template
cp .archdoc.config.example.json .env

# Edit .env and add at least ONE API key
nano .arch-docs/.archdoc.config.json
```

**Required**: At least one LLM provider API key:

```bash
# Anthropic Claude (recommended) - https://console.anthropic.com/
"anthropic": "sk-ant-your-key-here

# OR OpenAI GPT-4 - https://platform.openai.com/
OPENAI_API_KEY=sk-your-key-here

# OR Google Gemini - https://ai.google.dev/
GOOGLE_API_KEY=your-key-here
```

**Optional**: LangSmith tracing for debugging (like in tech-debt-api):

```bash
# Enable LangSmith tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_your-key-here
LANGCHAIN_PROJECT=archdoc-analysis
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_CALLBACKS_BACKGROUND=true
```

### 3. Generate Documentation

```bash
# Analyze current directory
archdoc analyze

# Analyze specific project
archdoc analyze /path/to/project

# With custom output
archdoc analyze . --output ./docs

# Quick analysis (faster, less detailed)
archdoc analyze --depth quick
```

### 4. View Generated Documentation

Documentation is generated in the output directory (default: `.arch-docs`):

```bash
# View the main index
cat .arch-docs/index.md

# Or open in your editor
code .arch-docs/
```

## Configuration Management

### Config Command

Manage configuration easily with the `config` command:

```bash
# Interactive setup
archdoc config --init

# View all settings
archdoc config --list

# Get specific value
archdoc config --get llm.model

# Set value
archdoc config --set llm.temperature=0.5

# Reset to defaults
archdoc config --reset
```

### Configuration Priority

Configuration is loaded in this order (later overrides earlier):

1. **Default values** (built-in)
2. **`.archdoc.config.json`** (project settings, safe to commit)
3. **Environment variables** (`.env` file, API keys - **never commit**)
4. **CLI flags** (highest priority)

**Example priority chain**:
```bash
# Config file has model: "claude-3-5-sonnet"
# .env has LLM_MODEL="gpt-4-turbo"
# CLI has --model "gemini-2.0-flash"
# → Result: Uses "gemini-2.0-flash" (CLI wins)
```

### Configuration Files

#### `.archdoc.config.json` (Project Settings - Safe to Commit)

Contains project-specific settings **without secrets**:

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
    "excludePatterns": ["**/node_modules/**", "**/dist/**"]
  },
  "agents": {
    "enabled": ["file-structure", "dependency-analyzer", "pattern-detector"],
    "parallel": true
  },
  "refinement": {
    "enabled": true,
    "maxIterations": 5,
    "clarityThreshold": 80
  },
  "output": {
    "directory": ".arch-docs",
    "format": "markdown"
  },
  "tracing": {
    "enabled": false,
    "provider": "langsmith",
    "project": "archdoc-analysis"
  }
}
```

#### `.env` (Secrets - Never Commit)

Contains API keys and sensitive data:

```bash
# LLM Provider Keys (at least one required)
"anthropic": "sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...

# LangSmith Tracing (optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_...
LANGCHAIN_PROJECT=my-project
```

**Important**: Add `.env` to `.gitignore`!

## CLI Reference

### `archdoc analyze`

Generate architecture documentation for a project.

```bash
archdoc analyze [projectPath] [options]
```

#### Arguments

- `projectPath` - Path to project (default: current directory)

#### Options

##### Output Options

- `-o, --output <dir>` - Output directory (default: `.arch-docs`)
- `--no-clean` - Don't clear output directory before generation
- `-f, --format <format>` - Output format: `markdown` (more coming soon)

##### Analysis Options

- `--prompt <text>` - Focus analysis with natural language prompt
- `--depth <level>` - Analysis depth: `quick`, `normal`, `deep` (default: `normal`)
- `--agents <list>` - Comma-separated list of specific agents to run
- `--no-refinement` - Disable iterative refinement
- `--refinement-iterations <n>` - Max refinement iterations (default: 5)
- `--refinement-threshold <n>` - Clarity threshold percentage (default: 80)
- `--refinement-improvement <n>` - Minimum improvement percentage (default: 10)

##### LLM Options

- `--provider <name>` - LLM provider: `anthropic`, `openai`, `google`
- `--model <name>` - Specific model to use
- `--temperature <n>` - Model temperature 0-1 (default: 0.2)
- `--max-tokens <n>` - Max tokens per request (default: 4096)

##### Execution Options

- `--parallel` - Run agents in parallel (default: true)
- `--no-parallel` - Run agents sequentially
- `--max-files <n>` - Maximum files to analyze (default: 1000)
- `--max-file-size <bytes>` - Max file size in bytes (default: 1MB)

##### Display Options

- `-v, --verbose` - Show detailed progress
- `-q, --quiet` - Minimal output
- `-h, --help` - Show help

#### Examples

```bash
# Basic usage
archdoc analyze

# Custom output location
archdoc analyze . --output ./architecture-docs

# Quick analysis
archdoc analyze --depth quick

# Deep analysis with refinement
archdoc analyze --depth deep --refinement-iterations 10

# Focused analysis
archdoc analyze --prompt "analyze dependencies and patterns"

# Specific agents only
archdoc analyze --agents file-structure,dependency-analyzer

# Use specific model
archdoc analyze --provider openai --model gpt-4-turbo

# Sequential execution (no parallelism)
archdoc analyze --no-parallel

# Verbose mode with tracing
archdoc analyze --verbose
```

### `archdoc generate` (alias)

Alias for `archdoc analyze` - same functionality.

```bash
archdoc generate /path/to/project --output ./docs
```

### `archdoc export`

Export existing documentation to different formats (future feature).

```bash
archdoc export <input> --format <format> --output <file>
```

## Configuration

### Environment Variables

#### Required (One of)

```bash
"anthropic": "sk-ant-...        # Anthropic Claude
OPENAI_API_KEY=sk-...               # OpenAI GPT
GOOGLE_API_KEY=...                  # Google Gemini
```

#### Optional

```bash
# LLM Configuration
DEFAULT_LLM_PROVIDER=anthropic                    # anthropic, openai, google
DEFAULT_LLM_MODEL=claude-3-5-sonnet-20241022     # Model name
DEFAULT_LLM_TEMPERATURE=0.2                       # 0-1
DEFAULT_LLM_MAX_TOKENS=4096                       # Max tokens

# LangSmith Tracing
LANGCHAIN_TRACING_V2=true                         # Enable tracing
LANGCHAIN_API_KEY=lsv2_pt_...                    # LangSmith key
LANGCHAIN_PROJECT=my-project                      # Project name
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com # API endpoint

# Scanning
ARCHDOC_MAX_FILES=1000                            # Max files to scan
ARCHDOC_MAX_FILE_SIZE=1048576                     # Max file size (1MB)
ARCHDOC_RESPECT_GITIGNORE=true                    # Respect .gitignore

# Output
ARCHDOC_OUTPUT_DIR=.arch-docs                     # Default output
ARCHDOC_CLEAN_OUTPUT=true                         # Clean before generation

# Performance
ARCHDOC_PARALLEL_AGENTS=true                      # Parallel execution
ARCHDOC_AGENT_TIMEOUT=300000                      # Timeout in ms (5 min)

# Refinement
ARCHDOC_REFINEMENT_ENABLED=true                   # Enable refinement
ARCHDOC_REFINEMENT_MAX_ITERATIONS=5               # Max iterations
ARCHDOC_REFINEMENT_THRESHOLD=80                   # Clarity threshold %
ARCHDOC_REFINEMENT_MIN_IMPROVEMENT=10             # Min improvement %

# Logging
ARCHDOC_LOG_LEVEL=info                            # error, warn, info, debug
ARCHDOC_VERBOSE=false                             # Verbose output
```

### Configuration File

Create `.archdoc.config.json` in your project root:

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
    "project": "archdoc-analysis"
  }
}
```

### `.gitignore` Configuration

Add to your `.gitignore`:

```
# ArchDoc Generator
.arch-docs/
.archdoc-cache/
```

## Usage Examples

### Example 1: Basic Project Documentation

Generate complete documentation for a project:

```bash
cd my-project
archdoc analyze . --output ./docs
```

**Output:**
```
docs/
├── index.md                  # Table of contents
├── metadata.md               # Generation metadata
├── file-structure.md         # Project structure
├── dependencies.md           # Dependency analysis
├── patterns.md               # Design patterns
├── flows.md                  # Data flows
├── schemas.md                # Type definitions
└── architecture.md           # Architecture overview
```

### Example 2: Quick Analysis

Fast analysis with reduced depth:

```bash
archdoc analyze . --depth quick --output ./quick-docs
```

**Use Case:** Quick overview for onboarding or code review preparation.

### Example 3: Deep Analysis

Thorough analysis with maximum refinement:

```bash
archdoc analyze . \
  --depth deep \
  --refinement-iterations 10 \
  --refinement-threshold 90 \
  --verbose
```

**Use Case:** Comprehensive documentation for complex projects.

### Example 4: Focused Analysis with Prompt

Use natural language to focus the analysis:

```bash
# Analyze only dependencies
archdoc analyze --prompt "analyze project dependencies and their versions"

# Analyze patterns and code quality
archdoc analyze --prompt "identify design patterns and code quality issues"

# Analyze architecture
archdoc analyze --prompt "analyze high-level architecture and component interactions"
```

### Example 5: Specific Agents

Run only specific agents:

```bash
# Structure and dependencies only
archdoc analyze --agents file-structure,dependency-analyzer

# Full analysis except flows
archdoc analyze --agents file-structure,dependency-analyzer,pattern-detector,schema-generator,architecture-analyzer
```

### Example 6: Different LLM Providers

Compare results from different models:

```bash
# Using Claude (recommended)
archdoc analyze . --output ./docs-claude --provider anthropic

# Using GPT-4
archdoc analyze . --output ./docs-gpt --provider openai --model gpt-4-turbo

# Using Gemini
archdoc analyze . --output ./docs-gemini --provider google --model gemini-1.5-pro
```

### Example 7: Monorepo Analysis

Analyze multiple packages in a monorepo:

```bash
# Analyze entire monorepo
archdoc analyze . --output ./monorepo-docs

# Analyze specific package
archdoc analyze ./packages/api --output ./docs/api

# Analyze all packages
for package in packages/*; do
  archdoc analyze "$package" --output "./docs/$(basename $package)"
done
```

### Example 8: CI/CD Integration

```bash
# GitHub Actions
archdoc analyze . \
  --output ./docs \
  --depth normal \
  --no-refinement \
  --quiet

# GitLab CI
archdoc analyze . \
  --output ./public/architecture \
  --depth quick \
  --verbose
```

### Example 9: Incremental Updates (Future)

```bash
# Generate initial docs
archdoc analyze . --output ./docs

# Update after changes (future feature)
archdoc analyze . \
  --output ./docs \
  --incremental \
  --changed-files "src/api/*.ts"
```

### Example 10: Custom Configuration

```bash
# Use custom config file
archdoc analyze . --config ./custom-archdoc.json

# Override specific settings
archdoc analyze . \
  --config ./custom-archdoc.json \
  --provider openai \
  --output ./custom-docs
```

## Best Practices

### 1. Choose the Right Depth

- **`quick`** - For rapid overviews, CI checks, quick reviews
  - ~2 iterations
  - 70% clarity threshold
  - 2 questions per iteration

- **`normal`** (default) - For regular documentation needs
  - ~5 iterations
  - 80% clarity threshold
  - 3 questions per iteration

- **`deep`** - For comprehensive, publication-ready docs
  - ~10 iterations
  - 90% clarity threshold
  - 5 questions per iteration

### 2. Optimize for Cost

```bash
# Minimize token usage
archdoc analyze . \
  --depth quick \
  --no-refinement \
  --max-files 500

# Use faster/cheaper models
archdoc analyze . \
  --provider google \
  --model gemini-1.5-flash
```

### 3. Use Prompts Effectively

Good prompts are specific and clear:

```bash
# ✅ Good
archdoc analyze --prompt "analyze REST API endpoints and their authentication mechanisms"

# ✅ Good
archdoc analyze --prompt "identify state management patterns in React components"

# ❌ Too vague
archdoc analyze --prompt "analyze everything"

# ❌ Too specific (better to use --agents)
archdoc analyze --prompt "run the dependency analyzer agent"
```

### 4. Project Size Considerations

**Small Projects (<100 files):**
```bash
archdoc analyze --depth normal
```

**Medium Projects (100-1000 files):**
```bash
archdoc analyze --depth normal --max-files 1000
```

**Large Projects (>1000 files):**
```bash
# Analyze in chunks or use filtering
archdoc analyze ./src --depth quick --max-files 2000
```

### 5. Version Control

Commit generated documentation:

```bash
# Generate docs
archdoc analyze . --output ./docs

# Add to git
git add docs/
git commit -m "docs: update architecture documentation"
```

Or add to `.gitignore` and regenerate in CI:

```
# .gitignore
.arch-docs/
```

```yaml
# .github/workflows/docs.yml
- name: Generate docs
  run: archdoc analyze . --output ./docs
```

### 6. Exclude Unnecessary Files

Update `.gitignore` or use `excludePatterns` in config:

```json
{
  "scan": {
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.test.ts",
      "**/coverage/**"
    ]
  }
}
```

### 7. Enable LangSmith Tracing for Debugging

LangSmith provides visibility into LLM calls, token usage, and execution traces (similar to tech-debt-api):

```bash
# In .env file
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_your-key-here
LANGCHAIN_PROJECT=archdoc-analysis
LANGCHAIN_CALLBACKS_BACKGROUND=true

# Or in .archdoc.config.json
{
  "tracing": {
    "enabled": true,
    "provider": "langsmith",
    "project": "archdoc-analysis"
  }
}
```

**Benefits**:
- Debug agent execution flow
- Monitor token usage and costs
- Optimize prompts and models
- Track performance metrics
- Share traces with team

**Get API key**: https://smith.langchain.com/

**Example trace hierarchy** (with `LANGCHAIN_TRACING_V2=true`):
```
DocumentationGeneration-Complete
├── ScanProjectStructure
├── Agent-file-structure
│   ├── PrepareData
│   ├── BuildPrompt
│   └── LLMAnalysis
├── Agent-dependency-analyzer
└── AggregateResults
```

```json
{
  "scan": {
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.git/**",
      "**/*.min.js",
      "**/*.bundle.js",
      "**/*.map",
      "**/vendor/**",
      "**/__pycache__/**"
    ]
  }
}
```

### 7. Use Refinement Wisely

Refinement improves quality but increases cost and time:

```bash
# For exploratory analysis
archdoc analyze --no-refinement

# For production documentation
archdoc analyze --refinement-iterations 7 --refinement-threshold 85

# For critical documentation
archdoc analyze --depth deep
```

### 8. Monitor Token Usage

Enable verbose mode to track costs:

```bash
archdoc analyze --verbose
```

Output includes:
```
Agent file-structure completed
  Input tokens: 2,145
  Output tokens: 1,234
  Total tokens: 3,379
  Estimated cost: $0.05
```

### 9. Leverage LangSmith Tracing

Debug and optimize your documentation generation:

```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=lsv2_pt_...
export LANGCHAIN_PROJECT=my-analysis

archdoc analyze --verbose
```

Then view traces at: https://smith.langchain.com/

### 10. Organize Output

```bash
# Project-specific docs
archdoc analyze . --output ./docs/architecture

# Versioned docs
archdoc analyze . --output ./docs/v1.0

# Date-stamped docs
archdoc analyze . --output ./docs/$(date +%Y-%m-%d)
```

## Troubleshooting

### Error: "API key not found"

**Problem:** No LLM provider API key configured.

**Solution:**
```bash
# Set API key
export "anthropic": "sk-ant-your-key-here

# Or create .env file
echo ""anthropic": "sk-ant-your-key-here" > .env
```

### Error: "Cannot read properties of undefined (reading 'maxIterations')"

**Problem:** Depth configuration not properly initialized.

**Solution:**
```bash
# Use explicit depth
archdoc analyze --depth normal

# Or update to latest version
npm update -g @archdoc/generator
```

### Error: "Rate limit exceeded"

**Problem:** Too many API requests to LLM provider.

**Solution:**
```bash
# Use fewer iterations
archdoc analyze --no-refinement

# Run sequentially
archdoc analyze --no-parallel

# Use cheaper model
archdoc analyze --provider google --model gemini-1.5-flash
```

### Error: "Token limit exceeded"

**Problem:** File or context too large for model.

**Solution:**
```bash
# Limit file size
archdoc analyze --max-file-size 524288  # 512KB

# Limit files
archdoc analyze --max-files 500

# Use larger context model
archdoc analyze --provider anthropic --model claude-3-5-sonnet-20241022
```

### Issue: Slow Generation

**Problem:** Analysis taking too long.

**Solution:**
```bash
# Use quick depth
archdoc analyze --depth quick

# Disable refinement
archdoc analyze --no-refinement

# Limit files
archdoc analyze --max-files 500

# Use faster model
archdoc analyze --provider google --model gemini-1.5-flash
```

### Issue: Poor Quality Output

**Problem:** Generated documentation lacks detail or accuracy.

**Solution:**
```bash
# Increase depth
archdoc analyze --depth deep

# Enable refinement
archdoc analyze --refinement-iterations 10

# Use better model
archdoc analyze --provider anthropic --model claude-3-opus-20240229

# Provide better prompt
archdoc analyze --prompt "provide detailed analysis of component architecture"
```

### Issue: Missing Files

**Problem:** Some files not being analyzed.

**Solution:**
```bash
# Check .gitignore
cat .gitignore

# Use --verbose to see excluded files
archdoc analyze --verbose

# Adjust excludePatterns in config
```

### Issue: Incomplete Documentation

**Problem:** Some sections are empty or missing.

**Solution:**
```bash
# Run all agents
archdoc analyze  # (no --agents flag)

# Check if specific agents failed
archdoc analyze --verbose

# Increase token limits
archdoc analyze --max-tokens 8192
```

## FAQ

### Q: Which LLM provider should I use?

**A:** We recommend **Anthropic Claude** for best results:
- Claude 3.5 Sonnet: Best balance of quality and cost
- Claude 3 Opus: Highest quality, more expensive
- GPT-4 Turbo: Good alternative, familiar to many
- Gemini 1.5 Pro: Fast and cost-effective

### Q: How much does it cost?

**A:** Costs vary by provider and project size:

**Small project (~100 files):**
- Claude 3.5 Sonnet: ~$0.50-$2
- GPT-4 Turbo: ~$1-$3
- Gemini 1.5 Flash: ~$0.10-$0.50

**Medium project (~1000 files):**
- Claude 3.5 Sonnet: ~$5-$15
- GPT-4 Turbo: ~$10-$25
- Gemini 1.5 Flash: ~$1-$5

**Use `--verbose` to see exact token usage and costs.**

### Q: Can I use it offline?

**A:** No, the tool requires internet access to call LLM APIs. However, you can:
- Generate docs once and commit them
- Use in CI/CD with API keys
- Cache generated docs locally

### Q: Does it work with private codebases?

**A:** Yes, but be aware:
- Code is sent to third-party LLM APIs
- Review your LLM provider's data policies
- Consider using self-hosted LLMs (future feature)
- Sanitize sensitive data before analysis

### Q: How do I update documentation?

**A:** Currently:
```bash
# Regenerate from scratch
archdoc analyze . --output ./docs
```

Future versions will support incremental updates.

### Q: Can I customize the output format?

**A:** Currently only Markdown is supported. Future versions will add:
- HTML with interactive features
- PDF export
- Confluence format
- Custom templates

### Q: How do I create custom agents?

**A:** See [Contributing Guide](./CONTRIBUTING.md#creating-custom-agents) for details.

### Q: Does it support language X?

**A:** Yes! The tool is language-agnostic and works with any text-based programming language:
- TypeScript, JavaScript, Python, Java, Go, Rust, C++, C#, PHP, Ruby, Kotlin, Swift, and more.

### Q: Can I use it in CI/CD?

**A:** Yes! See [Integration Guide](./INTEGRATION_GUIDE.md) for examples with:
- GitHub Actions
- GitLab CI
- Jenkins
- CircleCI
- Azure Pipelines

### Q: How do I get support?

**A:**
- 📖 [Read the docs](./README.md)
- 🐛 [Report issues](https://github.com/ritech/architecture-doc-generator/issues)
- 💬 [Ask questions](https://github.com/ritech/architecture-doc-generator/discussions)
- 📧 [Email support](mailto:support@ritech.com)

---

**Next Steps:**

- [🔌 Integration Guide](./INTEGRATION_GUIDE.md) - CI/CD and programmatic usage
- [🏗️ Architecture](./ARCHITECTURE.md) - Technical details
- [🤝 Contributing](./CONTRIBUTING.md) - Extend and customize
- [📚 API Reference](./API.md) - Programmatic API

**Navigation:**

[🏠 Home](../README.md) · [📖 Docs Index](./README.md) · [🔌 Integration](./INTEGRATION_GUIDE.md) · [🏗️ Architecture](./ARCHITECTURE.md)
