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

## CLI Reference

### `analyze`

This command analyzes your codebase and generates the documentation.

```bash
archdoc analyze [path] [options]
```

**Arguments:**

- `[path]`: The path to the project you want to analyze. Defaults to the current directory.

**Options:**

| Flag                | Description                                                          | Default      |
| ------------------- | -------------------------------------------------------------------- | ------------ |
| `--output <dir>`    | Specifies the output directory for the generated files.              | `.arch-docs` |
| `--c4`              | Generates C4 architecture model instead of standard documentation.   | `false`      |
| `--prompt <text>`   | A natural language prompt to focus the analysis on specific aspects. |              |
| `--depth <level>`   | The depth of the analysis. Can be `quick`, `normal`, or `deep`.      | `normal`     |
| `--provider <name>` | The LLM provider to use (`anthropic`, `openai`, `xai`, `google`).    |              |
| `--model <name>`    | The specific LLM model to use.                                       |              |
| `--no-refinement`   | Disables the iterative refinement process for a faster analysis.     |              |
| `--verbose`         | Shows detailed progress and debugging information.                   |              |

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
    "excludePatterns": ["**/node_modules/**", "**/dist/**"]
  }
}
```

### Environment Variables

You can also use environment variables to configure the generator, which is useful for CI/CD environments.

- `ANTHROPIC_API_KEY`: Your API key for Anthropic Claude.
- `OPENAI_API_KEY`: Your API key for OpenAI.
- `GOOGLE_API_KEY`: Your API key for Google Gemini.
- `XAI_API_KEY`: Your API key for xAI Grok.
- `DEFAULT_LLM_PROVIDER`: The default LLM provider to use.
- `DEFAULT_LLM_MODEL`: The default LLM model to use.
- `LANGCHAIN_TRACING_V2`: Set to `true` to enable LangSmith tracing.
- `LANGCHAIN_API_KEY`: Your API key for LangSmith.

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
