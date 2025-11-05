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
  "apiKeys": {
    "anthropic": "sk-ant-...",
    "openai": "sk-...",
    "google": "..."
  },
  "embeddings": {
    "openai": "sk-..."
  },
  "searchMode": {
    "mode": "vector",
    "embeddingsProvider": "local",
    "strategy": "graph",
    "vectorWeight": 0.6,
    "graphWeight": 0.4,
    "similarityThreshold": 0.3,
    "topK": 10
  },
  "scan": {
    "maxFiles": 10000,
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

## � Vector Search Configuration

> **📊 See [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md) for comprehensive performance comparison of all configurations**

Vector search enables RAG (Retrieval-Augmented Generation) to find relevant files by semantic meaning and structural relationships.

### Recommended Configuration

Based on comprehensive testing, **Graph + Local embeddings** is the winner:

```json
{
  "searchMode": {
    "mode": "vector",
    "embeddingsProvider": "local",
    "strategy": "graph"
  }
}
```

**Why?** Fastest (6.1min), most accurate (84.8%), cheapest ($0.0841), free, offline. [See benchmark results](./BENCHMARK_RESULTS.md).

### Search Mode Options

- **`mode`**: `"vector"` (RAG-based) or `"keyword"` (traditional matching)
  - `"vector"` - Semantic similarity search using embeddings (RECOMMENDED)
  - `"keyword"` - Traditional keyword matching (fallback, no embeddings)

### Embeddings Providers

- **`embeddingsProvider`**: `"local"` (default, FREE), `"openai"`, `"google"`, `"huggingface"`, `"cohere"`, `"voyage"`
  - `"local"` - **RECOMMENDED** - Free TF-IDF embeddings (128-dim, 0.2s init, offline)
  - `"openai"` - **NOT RECOMMENDED** - text-embedding-3-small (slower, more expensive, lower accuracy). See [why OpenAI underperformed](./BENCHMARK_RESULTS.md#test-5-vector--openai-️-not-recommended).
  - `"google"` - Google text-embedding-004 (768-dim, cost-effective, untested)
  - Others: HuggingFace, Cohere, Voyage (advanced use cases)

### Retrieval Strategies

- **`strategy`**: `"graph"` (RECOMMENDED), `"hybrid"`, `"vector"`, `"smart"`
  - `"graph"` - **WINNER** - Dependency graph traversal (84.8% accuracy, 6.1min)
  - `"hybrid"` - Semantic (60%) + structural (40%) - Good balance (84.3% accuracy, 6.4min)
  - `"vector"` - Pure semantic similarity (83.1% accuracy, 6.2min)
  - `"smart"` - Auto-detect optimal strategy per query (84.6% accuracy, 6.3min)

### Advanced Options

```json
{
  "searchMode": {
    "mode": "vector",
    "embeddingsProvider": "local",
    "strategy": "hybrid",
    "vectorWeight": 0.6,
    "graphWeight": 0.4,
    "similarityThreshold": 0.3,
    "topK": 10,
    "includeRelatedFiles": true,
    "maxDepth": 2
  }
}
```

- **`vectorWeight`**: Weight for semantic similarity (0.0-1.0, default: 0.6)
- **`graphWeight`**: Weight for structural relationships (0.0-1.0, default: 0.4)
- **`similarityThreshold`**: Minimum similarity score to include file (0.0-1.0, default: 0.3)
- **`topK`**: Maximum files to retrieve per query (default: 10)
- **`includeRelatedFiles`**: Include imported/importer files (default: true)
- **`maxDepth`**: Max dependency depth for graph traversal (default: 2)

### OpenAI Embeddings Configuration (NOT RECOMMENDED)

If you still want to use OpenAI embeddings despite the poor performance ([see why](./BENCHMARK_RESULTS.md#why-openai-underperformed)):

```json
{
  "embeddings": {
    "openai": "sk-..."
  },
  "searchMode": {
    "mode": "vector",
    "embeddingsProvider": "openai",
    "strategy": "vector"
  }
}
```

**⚠️ Warning**: OpenAI embeddings have:

- 8192 token total limit (requires batching)
- Context loss from truncation (1500 tokens/doc max)
- 3.4x higher cost ($0.2865 vs $0.0841)
- 92% slower (11.7min vs 6.1min)
- 1.9% lower accuracy (82.9% vs 84.8%)

**Batching is automatic** - The system will batch documents into 5 docs per request, truncating each to 1500 tokens max.

### Environment Variables

```bash
# Search mode (default: vector)
export SEARCH_MODE=vector  # or "keyword"

# Embeddings provider (default: local)
export EMBEDDINGS_PROVIDER=local  # "local", "openai", "google", etc.

# Retrieval strategy (default: graph)
export RETRIEVAL_STRATEGY=graph  # "graph", "hybrid", "vector", "smart"

# OpenAI embeddings API key (separate from LLM key)
export OPENAI_EMBEDDINGS_KEY=sk-...  # Only if using OpenAI embeddings
```

### CLI Flags

```bash
# Use graph strategy (recommended)
archdoc analyze ./my-project --search-mode vector --retrieval-strategy graph

# Use hybrid strategy
archdoc analyze ./my-project --search-mode vector --retrieval-strategy hybrid

# Use keyword search (no embeddings)
archdoc analyze ./my-project --search-mode keyword

# OpenAI embeddings (not recommended)
archdoc analyze ./my-project --search-mode vector --embeddings-provider openai
```

### Complete Examples

**Production (Recommended):**

```json
{
  "searchMode": {
    "mode": "vector",
    "embeddingsProvider": "local",
    "strategy": "graph"
  }
}
```

Command: `archdoc analyze ./my-project`

**CI/CD Pipeline:**

```json
{
  "searchMode": {
    "mode": "keyword"
  }
}
```

Command: `archdoc analyze ./my-project --search-mode keyword`

**Experimentation:**

```json
{
  "searchMode": {
    "mode": "vector",
    "embeddingsProvider": "local",
    "strategy": "smart"
  }
}
```

Command: `archdoc analyze ./my-project --search-mode vector --retrieval-strategy smart`

## �📈 LangSmith Tracing

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
