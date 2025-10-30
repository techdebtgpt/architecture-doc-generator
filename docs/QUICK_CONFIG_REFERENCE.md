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
    "model": "claude-3-5-sonnet-20240620"
  }
}
```

### Complete Configuration

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20240620",
    "temperature": 0.2,
    "maxTokens": 4096
  },
  "scan": {
    "maxFiles": 1000,
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**"
    ]
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

For CI/CD or to override the config file, use environment variables.

- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`: API keys for your chosen LLM provider.
- `DEFAULT_LLM_PROVIDER`: Default LLM provider.
- `DEFAULT_LLM_MODEL`: Default LLM model.
- `LANGCHAIN_TRACING_V2`: Set to `true` to enable LangSmith tracing.
- `LANGCHAIN_API_KEY`: Your LangSmith API key.

## 🤖 LLM Providers

Choose the LLM provider that best fits your needs.

| Provider | Recommended Model | Best For |
|---|---|---|
| **Anthropic** | `claude-3-5-sonnet-20240620` | Deep code analysis and reasoning. |
| **OpenAI** | `gpt-4-turbo` | Balanced performance and wide availability. |
| **Google** | `gemini-1.5-pro` | Fast processing and cost-effectiveness. |
