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
archdoc analyze --provider openai --model gpt-5
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
