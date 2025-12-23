# User Guide

This guide provides a comprehensive overview of how to install, configure, and use the ArchDoc Generator.

## 📚 Table of Contents

- [**Installation**](#-installation)
- [**Quick Start**](#-quick-start)
- [**CLI Reference**](#-cli-reference)
  - [analyze](#analyze)
  - [config](#config)
- [**Configuration**](#-configuration)
  - [Configuration File](#configuration-file)
  - [Environment Variables](#environment-variables)
- [**Usage Examples**](#-usage-examples)
- [**Troubleshooting**](#-troubleshooting)

## 📦 Installation

You can install the ArchDoc Generator globally to use it as a command-line tool.

```bash
# Using npm
npm install -g @archdoc/generator

# Using yarn
yarn global add @archdoc/generator

# Using pnpm
pnpm add -g @archdoc/generator
```

## 🚀 Quick Start

### 1. Interactive Setup

The easiest way to get started is by running the interactive configuration wizard.

```bash
archdoc config --init
```

This command will guide you through:

- Choosing an LLM provider (Anthropic, OpenAI, or Google).
- Setting up your API key.
- Creating a `.archdoc.config.json` file with your settings.

### 2. Generate Documentation

Once configured, you can analyze your project and generate documentation with a single command.

```bash
# Analyze the current directory
archdoc analyze

# Analyze a specific project path
archdoc analyze /path/to/your/project
```

### 3. View Your Documentation

The generated documentation will be saved in the output directory (default: `.arch-docs`).

```bash
# Open the main index file
cat .arch-docs/index.md
```

### 4. Understanding the Output Structure

ArchDoc generates two types of output:

**Markdown Documentation** (`.arch-docs/`):

- `index.md` - Main overview and navigation
- `architecture.md` - System architecture analysis
- `dependencies.md` - Dependency analysis
- `file-structure.md` - Project organization
- `patterns.md` - Design patterns detected
- `metadata.md` - Generation metadata and costs
- And more...

**JSON Cache** (`.arch-docs/cache/`):

- `file-structure.json` - Structured file organization data
- `dependency-analyzer.json` - Dependency graph and analysis
- `architecture-analyzer.json` - Architecture components and flows
- Each JSON includes `_metadata` with:
  - Token usage (input, output, cached)
  - Execution time
  - Confidence score
  - Generation timestamp

**Benefits of JSON Cache**:

- **Fast Queries**: MCP and CLI can read JSON directly without LLM calls
- **Cost Savings**: Reuse cached analysis instead of re-running agents
- **Delta Analysis**: Compare with previous runs to detect changes
- **Multi-Client**: Same data consumed by CLI, MCP, web UI, etc.

**Delta Analysis** (v0.3.37+):

ArchDoc automatically performs delta analysis to reduce costs on incremental runs:

- **Git Projects**: Uses Git to detect changed files since the last commit or a specific commit/branch/tag
- **Non-Git Projects**: Uses file hashing to detect changes since the last analysis
- **Automatic Filtering**: Only changed and new files are analyzed, unchanged files are skipped
- **Cost Savings**: Typically reduces token usage by 60-90% on incremental runs
- **Cache Integration**: Cached results from previous runs are automatically loaded and merged

Use `--force` to bypass delta analysis and analyze all files, or `--since <commit>` to compare against a specific Git commit/branch/tag.

## CLI Reference

### `analyze`

This command analyzes your codebase and generates the documentation.

```bash
archdoc analyze [path] [options]
```

**Arguments:**

- `[path]`: The path to the project you want to analyze. Defaults to the current directory.

**Options:**

| Flag                | Description                                                                      | Default      |
| ------------------- | -------------------------------------------------------------------------------- | ------------ |
| `--output <dir>`    | Specifies the output directory for the generated files.                          | `.arch-docs` |
| `--c4`              | Generates C4 architecture model instead of standard documentation.               | `false`      |
| `--prompt <text>`   | A natural language prompt to focus the analysis on specific aspects.             |              |
| `--depth <level>`   | The depth of the analysis. Can be `quick`, `normal`, or `deep`.                  | `normal`     |
| `--provider <name>` | The LLM provider to use (`anthropic`, `openai`, `xai`, `google`).                |              |
| `--model <name>`    | The specific LLM model to use.                                                   |              |
| `--no-refinement`   | Disables the iterative refinement process for a faster analysis.                 |              |
| `--force`           | Force full analysis, ignoring delta analysis (analyze all files).                | `false`      |
| `--since <commit>`  | Git commit/branch/tag to compare against for delta analysis (Git projects only). |              |
| `--verbose`         | Shows detailed progress and debugging information.                               |              |

**C4 Model Generation:**

When using the `--c4` flag, the generator creates a structured C4 architecture model with:

- **c4-model.json**: Complete C4 model in JSON format
- **context.puml**: PlantUML diagram showing system context (actors, external systems)
- **containers.puml**: PlantUML diagram showing containers (deployable units)
- **components.puml**: PlantUML diagram showing components (modules/functions)

```bash
# Generate C4 model
archdoc analyze --c4

# Generate C4 model for specific project with custom output
archdoc analyze /path/to/project --c4 --output ./architecture-docs
```

### `config`

Manages the configuration for the ArchDoc Generator.

```bash
archdoc config [options]
```

**Options:**

| Flag                | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `--init`            | Starts the interactive setup wizard.                 |
| `--list`            | Displays the current configuration settings.         |
| `--get <key>`       | Retrieves the value of a specific configuration key. |
| `--set <key=value>` | Sets a new value for a configuration key.            |
| `--reset`           | Resets the configuration to its default settings.    |

## ⚙️ Configuration

### Configuration File

You can configure the generator by creating a `.archdoc.config.json` file in your project's root directory.

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250929",
    "temperature": 0.2
  },
  "output": {
    "directory": "./docs",
    "format": "markdown"
  },
  "scan": {
    "excludePatterns": ["**/node_modules/**", "**/dist/**"],
    "respectGitignore": true // Automatically loads .gitignore from root and all subdirectories
  }
}
```

### Environment Variables

> **⚠️ DEPRECATED**: Environment variables for API keys and LLM settings are **NO LONGER** supported. Use `.archdoc.config.json` instead.

The **only** environment variables still supported are for LangSmith tracing:

- `LANGCHAIN_TRACING_V2`: Set to `true` to enable LangSmith tracing.
- `LANGCHAIN_API_KEY`: Your API key for LangSmith.
- `LANGCHAIN_PROJECT`: Your LangSmith project name.

For all other configuration (API keys, LLM provider, etc.), use `.archdoc.config.json`. See the [Configuration Guide](./CONFIGURATION_GUIDE.md) for details.

## ✨ Usage Examples

### Basic Documentation

To generate a complete set of documentation for your project, run:

```bash
archdoc analyze . --output ./docs
```

### Quick Analysis

For a faster, less detailed analysis, use the `--depth quick` option.

```bash
archdoc analyze . --depth quick
```

### Focused Analysis

Use a natural language prompt to focus the analysis on specific areas.

```bash
# Analyze dependencies and security
archdoc analyze --prompt "analyze dependencies and security vulnerabilities"
```

### Delta Analysis (Cost Optimization)

ArchDoc automatically performs delta analysis to reduce costs on incremental runs. Only changed and new files are analyzed, saving 60-90% on token costs.

```bash
# Automatic delta analysis (default behavior)
archdoc analyze

# Force full analysis (analyze all files, ignore delta analysis)
archdoc analyze --force

# Compare against a specific Git commit/branch/tag
archdoc analyze --since main
archdoc analyze --since abc123def
archdoc analyze --since v1.0.0

# Delta analysis with focused prompt
archdoc analyze --prompt "security vulnerabilities" --since HEAD~1
```

### File Exclusions

ArchDoc automatically excludes build artifacts, dependencies, and test files based on the languages detected in your project.

**Automatic Language-Specific Exclusions:**

The scanner automatically includes exclude patterns for all detected languages:

- **TypeScript/JavaScript**: `node_modules/`, `dist/`, `build/`, `.next/`, `out/`
- **Python**: `venv/`, `__pycache__/`, `.pytest_cache/`, `dist/`, `build/`
- **Java**: `target/`, `build/`, `.gradle/`, `.m2/`
- **Go**: `vendor/`, `bin/`
- **Rust**: `target/`
- **PHP**: `vendor/`
- **C#**: `bin/`, `obj/`, `packages/`
- And more...

**Multi-Level `.gitignore` Support:**

- Automatically finds and loads `.gitignore` files from **root and all subdirectories**
- Patterns from `.gitignore` files are used **exactly as written** (no modification)
- Perfect for monorepos with nested projects
- Static patterns (when no `.gitignore` exists) use `**/` prefix for recursive matching

**Custom Exclusions:**

You can add custom exclude patterns in `.archdoc.config.json`:

```json
{
  "scan": {
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/my-custom-folder/**"
    ],
    "respectGitignore": true // Default: true - loads all .gitignore files
  }
}
```

**How it works:**

- **Git projects**: Uses Git to detect files changed since the last commit or a specific commit/branch/tag
- **Non-Git projects**: Uses file hashing to detect changes since the last analysis
- **Automatic**: Delta analysis is enabled by default - no configuration needed
- **Cache integration**: Cached results from previous runs are automatically loaded and merged

**When to use `--force`:**

- First-time analysis of a project
- When you want to ensure all files are analyzed regardless of changes
- After major refactoring where change detection might miss dependencies

### Using a Specific LLM

You can specify a different LLM provider and model for the analysis.

```bash
# OpenAI models (provider: openai)
archdoc analyze --provider openai --model o1-mini              # $3/$12 per million - Cost-effective reasoning (default)
archdoc analyze --provider openai --model o1-preview           # $15/$60 per million - Advanced reasoning
archdoc analyze --provider openai --model gpt-4o               # $2.50/$10 per million - Multimodal flagship
archdoc analyze --provider openai --model gpt-4o-mini          # $0.15/$0.60 per million - Fast and cheap
archdoc analyze --provider openai --model gpt-4-turbo          # $10/$30 per million - GPT-4 Turbo
archdoc analyze --provider openai --model gpt-4-turbo-preview  # $10/$30 per million - GPT-4 Turbo Preview
archdoc analyze --provider openai --model gpt-4                # $30/$60 per million - Legacy GPT-4
archdoc analyze --provider openai --model gpt-3.5-turbo        # $0.50/$1.50 per million - Fast and cheap legacy

# Anthropic Claude models (provider: anthropic)
archdoc analyze --provider anthropic --model claude-sonnet-4-5-20250929      # $3/$15 per million - Latest Sonnet (default)
archdoc analyze --provider anthropic --model claude-opus-4-1-20250805        # $15/$75 per million - Most capable
archdoc analyze --provider anthropic --model claude-haiku-4-5-20251001       # $0.25/$1.25 per million - Fast and cheap
archdoc analyze --provider anthropic --model claude-sonnet-4-20250514        # $3/$15 per million - Sonnet 4
archdoc analyze --provider anthropic --model claude-sonnet-4-20250514-thinking  # $3/$15 per million - Sonnet 4 with thinking
archdoc analyze --provider anthropic --model claude-opus-4-20250514          # $15/$75 per million - Opus 4
archdoc analyze --provider anthropic --model claude-opus-4-20250514-thinking # $15/$75 per million - Opus 4 with thinking
archdoc analyze --provider anthropic --model claude-3-7-sonnet-latest        # $3/$15 per million - Claude 3.7 Sonnet
archdoc analyze --provider anthropic --model claude-3-7-sonnet-20250219      # $3/$15 per million - Claude 3.7 Sonnet (dated)
archdoc analyze --provider anthropic --model claude-3-5-sonnet-latest        # $3/$15 per million - Claude 3.5 Sonnet
archdoc analyze --provider anthropic --model claude-3-5-sonnet-20241022      # $3/$15 per million - Claude 3.5 Sonnet (Oct 2024)
archdoc analyze --provider anthropic --model claude-3-5-sonnet-20240620      # $3/$15 per million - Claude 3.5 Sonnet (June 2024)
archdoc analyze --provider anthropic --model claude-3-5-haiku-20241022       # $0.80/$4 per million - Claude 3.5 Haiku
archdoc analyze --provider anthropic --model claude-3-opus-20240229          # $15/$75 per million - Claude 3 Opus (legacy)

# Google Gemini models (provider: google)
archdoc analyze --provider google --model gemini-2.5-pro         # $1/$4 per million - Most capable (default)
archdoc analyze --provider google --model gemini-2.5-flash       # $0.05/$0.20 per million - Fast and cheap
archdoc analyze --provider google --model gemini-2.5-flash-lite  # $0.025/$0.10 per million - Ultra fast and cheap
archdoc analyze --provider google --model gemini-1.5-pro         # $1.25/$5 per million - Previous generation
archdoc analyze --provider google --model gemini-1.5-flash       # $0.075/$0.30 per million - Previous fast model
archdoc analyze --provider google --model gemini-pro             # $0.50/$1.50 per million - Legacy model

# xAI Grok models (provider: xai)
archdoc analyze --provider xai --model grok-3-beta               # $5/$15 per million - Latest Grok (default)
archdoc analyze --provider xai --model grok-2                    # $2/$10 per million - Grok 2
```

## 🚨 Troubleshooting

### API Key Not Found

If you see an error about a missing API key, run the interactive setup to configure it.

```bash
archdoc config --init
```

### Slow Generation

If the analysis is taking too long, you can speed it up by:

- Using a faster analysis depth: `archdoc analyze --depth quick`
- Disabling refinement: `archdoc analyze --no-refinement`

### Poor Quality Output

If the documentation isn't accurate, try:

- Using a deeper analysis: `archdoc analyze --depth deep`
- Using a more powerful model: `archdoc analyze --model claude-opus-4-1-20250805`
- Providing a more specific prompt to guide the analysis.
