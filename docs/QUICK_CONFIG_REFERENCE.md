# Quick Configuration Reference

This document provides a concise reference for configuring the ArchDoc Generator. For a more detailed guide, please see the [Configuration Guide](./CONFIGURATION_GUIDE.md).

## 📚 Table of Contents

- [**Quick Setup**](#-quick-setup)
- [**Configuration File**](#-configuration-file)
- [**CLI Commands**](#-cli-commands)
- [**Environment Variables**](#-environment-variables)
- [**LLM Providers**](#-llm-providers)

## 🚀 Quick Setup

The fastest way to get started is with the interactive setup wizard.

```bash
archdoc config --init
```

This command will walk you through selecting an LLM provider, entering your API key, and creating a `.archdoc.config.json` file.

## 📄 Configuration File

The `.archdoc.config.json` file is the central place for all your settings. Here’s a minimal and a complete example.

### Minimal Configuration

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250929"
  }
}
```

### Complete Configuration

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250929",
    "temperature": 0.2,
    "maxTokens": 4096,
    "embeddingsProvider": "local"
  },
  "scan": {
    "maxFiles": 10000,
    "excludePatterns": ["**/node_modules/**", "**/dist/**"]
  },
  "retrieval": {
    "strategy": "hybrid",
    "vectorWeight": 0.6,
    "graphWeight": 0.4,
    "includeRelatedFiles": true,
    "maxDepth": 2,
    "similarityThreshold": 0.3,
    "topK": 10
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

## 💻 CLI Commands

Manage your configuration directly from the command line.

- **Initialize Configuration**:

  ```bash
  archdoc config --init
  ```

- **List Current Settings**:

  ```bash
  archdoc config --list
  ```

- **Get a Specific Value**:

  ```bash
  archdoc config --get llm.provider
  ```

- **Set a Specific Value**:
  ```bash
  archdoc config --set llm.provider openai
  ```

## 🌐 Environment Variables

> **⚠️ DEPRECATED**: Environment variables are **NO LONGER** supported for API keys or LLM settings. Use `.archdoc.config.json` instead.

### LangSmith Tracing Only

The **only** environment variables still supported are for LangSmith tracing:

- `LANGCHAIN_TRACING_V2`: Set to `true` to enable LangSmith tracing.
- `LANGCHAIN_API_KEY`: Your LangSmith API key.
- `LANGCHAIN_PROJECT`: Your LangSmith project name.

**Recommended**: Configure tracing in `.archdoc.config.json` instead:

```json
{
  "tracing": {
    "enabled": true,
    "apiKey": "lsv2_pt_...",
    "project": "my-project"
  }
}
```

## 🤖 LLM Providers

Choose the LLM provider that best fits your needs.

| Provider      | Recommended Model            | Best For                                   |
| ------------- | ---------------------------- | ------------------------------------------ |
| **Anthropic** | `claude-sonnet-4-5-20250929` | Deep code analysis and reasoning.          |
| **OpenAI**    | `gpt-4o-mini`                | Fast and affordable model.                 |
| **Google**    | `gemini-2.5-pro`             | Strong reasoning and large context window. |
| **xAI**       | `grok-3-beta`                | Real-time insights and unique perspective. |
