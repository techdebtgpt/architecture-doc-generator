# Configuration Guide

This guide provides a detailed reference for all the configuration options available in the ArchDoc Generator.

## 📚 Table of Contents

- [**Configuration Methods**](#-configuration-methods)
- [**Configuration Priority**](#-configuration-priority)
- [**Configuration File**](#-configuration-file)
- [**Environment Variables**](#-environment-variables)
- [**LangSmith Tracing**](#-langsmith-tracing)

## ⚙️ Configuration Methods

You can configure the ArchDoc Generator in three ways:

- **Configuration File**: Use a `.archdoc.config.json` file for project-specific settings.
- **Environment Variables**: Override the configuration file settings, which is ideal for CI/CD environments.
- **CLI Flags**: Provide the highest level of precedence for one-time overrides.

## ιεραρχία Configuration Priority

The configuration is loaded in the following order of precedence, with later sources overriding earlier ones:

1. **Default Values**: The built-in default settings.
2. **Configuration File**: Settings from `.archdoc.config.json`.
3. **Environment Variables**: Variables loaded from your environment.
4. **CLI Flags**: Flags passed directly to the CLI command.

## 📄 Configuration File

For project-specific settings, create a `.archdoc.config.json` file in your project's root directory. You can generate this file automatically by running `archdoc config --init`.

### Example `.archdoc.config.json`

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250929",
    "temperature": 0.2,
    "maxTokens": 4096
  },
  "scan": {
    "maxFiles": 1000,
    "excludePatterns": ["**/node_modules/**", "**/dist/**"]
  },
  "output": {
    "directory": ".arch-docs",
    "format": "markdown"
  },
  "tracing": {
    "enabled": false,
    "project": "archdoc-analysis"
  }
}
```

## 🌐 Environment Variables

Environment variables are useful for CI/CD pipelines or for overriding settings without modifying the configuration file.

### Required Variables

You must provide an API key for at least one LLM provider.

- `ANTHROPIC_API_KEY`: Your API key for Anthropic Claude.
- `OPENAI_API_KEY`: Your API key for OpenAI.
- `GOOGLE_API_KEY`: Your API key for Google Gemini.
- `XAI_API_KEY`: Your API key for xAI Grok.

### Optional Variables

- `DEFAULT_LLM_PROVIDER`: Sets the default LLM provider (`anthropic`, `openai`, `google`, `xai`).
- `DEFAULT_LLM_MODEL`: Sets the default LLM model to use. Each provider has different models available:

  **OpenAI** (default: `o1-mini`):
  - `o1-mini`, `o1-preview` - Reasoning models
  - `gpt-4o`, `gpt-4o-mini` - Multimodal models
  - `gpt-4-turbo`, `gpt-4-turbo-preview` - GPT-4 Turbo
  - `gpt-4`, `gpt-3.5-turbo` - Legacy models

  **Anthropic** (default: `claude-sonnet-4-5-20250929`):
  - `claude-sonnet-4-5-20250929`, `claude-opus-4-1-20250805`, `claude-haiku-4-5-20251001` - Latest Claude 4.5/4.1
  - `claude-sonnet-4-20250514`, `claude-opus-4-20250514` - Claude 4 (with/without `-thinking`)
  - `claude-3-7-sonnet-latest`, `claude-3-7-sonnet-20250219` - Claude 3.7
  - `claude-3-5-sonnet-latest`, `claude-3-5-sonnet-20241022`, `claude-3-5-sonnet-20240620` - Claude 3.5 Sonnet
  - `claude-3-5-haiku-20241022` - Claude 3.5 Haiku
  - `claude-3-opus-20240229` - Claude 3 Opus (legacy)

  **Google** (default: `gemini-2.5-pro`):
  - `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` - Gemini 2.5
  - `gemini-1.5-pro`, `gemini-1.5-flash` - Gemini 1.5
  - `gemini-pro` - Legacy Gemini

  **xAI** (default: `grok-3-beta`):
  - `grok-3-beta` - Latest Grok
  - `grok-2` - Grok 2

- `LANGCHAIN_TRACING_V2`: Set to `true` to enable LangSmith tracing.
- `LANGCHAIN_API_KEY`: Your API key for LangSmith.
- `LANGCHAIN_PROJECT`: The project name for LangSmith tracing.

## 📈 LangSmith Tracing

LangSmith provides detailed observability into the AI workflows, allowing you to monitor and debug the generation process.

### Setup

To enable LangSmith tracing, you can either use environment variables or update your `.archdoc.config.json` file.

**Using Environment Variables:**

```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=<your-langsmith-api-key>
export LANGCHAIN_PROJECT=my-archdoc-project
```

**Using Configuration File:**

```json
{
  "tracing": {
    "enabled": true,
    "apiKey": "<your-langsmith-api-key>",
    "project": "my-archdoc-project"
  }
}
```
