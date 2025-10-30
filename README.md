# 🏗️ ArchDoc Generator

[![npm version](https://img.shields.io/npm/v/@techdebtgpt/archdoc-generator.svg)](https://www.npmjs.com/package/@techdebtgpt/archdoc-generator)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Website](https://img.shields.io/badge/Website-techdebtgpt.com-blue)](https://techdebtgpt.com)
[![GitHub](https://img.shields.io/github/stars/techdebtgpt/architecture-doc-generator?style=social)](https://github.com/techdebtgpt/architecture-doc-generator)

> AI-powered architecture documentation generator for any codebase using LangChain and multi-agent workflows.

ArchDoc Generator is an intelligent tool that analyzes your codebase and generates comprehensive, accurate architectural documentation automatically. It supports **any programming language** and uses AI-powered agents to understand your project structure, dependencies, patterns, security, and data flows.

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [CLI Usage](#-cli-usage)
- [Programmatic Usage](#-programmatic-usage)
- [Configuration](#-configuration)
- [What Gets Generated](#-what-gets-generated)
- [Available Agents](#-available-agents)
- [Architecture Highlights](#️-architecture-highlights)
- [Supported Languages](#-supported-languages)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- 🤖 **7 Specialized Agents**: File Structure, Dependencies, Patterns, Flows, Schemas, Architecture, and Security.
- 🌍 **Language Agnostic**: Works with TypeScript, Python, Java, Go, and more.
- 🧠 **AI-Powered**: Uses LangChain with Claude 4.5, GPT-5, Gemini 2.5, or Grok 3.
- 📊 **Comprehensive Analysis**: Structure, dependencies, patterns, flows, schemas, and security.
- 📝 **Markdown Output**: Clean, version-controllable documentation.
- 🔄 **Iterative Refinement**: Self-improving analysis with quality checks.
- 🎨 **Customizable**: Prompt-based agent selection and configuration.
- 📈 **LangSmith Tracing**: Full observability of AI workflows.
- 🔒 **Security Analysis**: Vulnerability detection, authentication review, and crypto analysis.

## 🚀 Quick Start

### Installation

```bash
# Using npm
npm install -g @techdebtgpt/archdoc-generator

# Using yarn
yarn global add @techdebtgpt/archdoc-generator

# Using pnpm
pnpm add -g @techdebtgpt/archdoc-generator
```

### Interactive Setup (Recommended)

Run the interactive configuration wizard:

```bash
archdoc config --init
```

This will:

1. Prompt you to choose an LLM provider (Anthropic/OpenAI/Google).
2. Ask for your API key.
3. Create `.archdoc.config.json` with your configuration.
4. Validate your setup.

### Basic Usage

```bash
# Analyze current directory
archdoc analyze

# Analyze specific project
archdoc analyze /path/to/your/project

# Focused analysis with prompt
archdoc analyze --prompt "analyze dependencies and security vulnerabilities"

# Custom output location
archdoc analyze --output ./docs

# Quick analysis (faster, less detailed)
archdoc analyze --depth quick
```

## CLI Usage

```bash
archdoc analyze [path] [options]
```

**Options:**

| Option                        | Description                                   | Default      |
| ----------------------------- | --------------------------------------------- | ------------ |
| `--output <dir>`              | Output directory                              | `.arch-docs` |
| `--prompt <text>`             | Focus analysis with natural language          |              |
| `--depth <level>`             | Analysis depth: `quick`, `normal`, `deep`     | `normal`     |
| `--provider <name>`           | LLM provider: `anthropic`, `openai`, `google` |              |
| `--model <name>`              | Specific model to use                         |              |
| `--refinement`                | Enable iterative refinement                   | `true`       |
| `--refinement-iterations <n>` | Max refinement iterations                     | `5`          |
| `--refinement-threshold <n>`  | Clarity threshold %                           | `80`         |
| `--no-clean`                  | Don't clear output directory                  |              |
| `--verbose`                   | Show detailed progress                        |              |

## 🔧 Programmatic Usage

Use the library in your Node.js applications:

```typescript
import {
  DocumentationOrchestrator,
  AgentRegistry,
  FileSystemScanner,
} from '@techdebtgpt/archdoc-generator';

// Setup registry with agents
const registry = new AgentRegistry();
const scanner = new FileSystemScanner();
const orchestrator = new DocumentationOrchestrator(registry, scanner);

// Generate documentation
const docs = await orchestrator.generateDocumentation('/path/to/project', {
  maxTokens: 100000,
  parallel: true,
  iterativeRefinement: {
    enabled: true,
    maxIterations: 5,
    clarityThreshold: 80,
  },
});

console.log('Generated:', docs.summary);
```

See the **[API Reference](./docs/API.md)** for complete programmatic documentation.

## ⚙️ Configuration

### Environment Variables

| Variable               | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `ANTHROPIC_API_KEY`    | Anthropic Claude API key                           |
| `OPENAI_API_KEY`       | OpenAI GPT API key                                 |
| `GOOGLE_API_KEY`       | Google Gemini API key                              |
| `XAI_API_KEY`          | xAI Grok API key                                   |
| `DEFAULT_LLM_PROVIDER` | Default provider (e.g., `anthropic`)               |
| `DEFAULT_LLM_MODEL`    | Default model (e.g., `claude-sonnet-4-5-20250929`) |
| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing (`true`)                  |
| `LANGCHAIN_API_KEY`    | LangSmith API key                                  |
| `LANGCHAIN_PROJECT`    | LangSmith project name                             |

See the **[Configuration Guide](./docs/CONFIGURATION_GUIDE.md)** for detailed options.

## 🎨 What Gets Generated

The tool generates a multi-file documentation structure:

```
docs/
├── index.md
├── metadata.md
├── file-structure.md
├── dependencies.md
├── patterns.md
├── flows.md
├── schemas.md
├── architecture.md
├── security.md
└── recommendations.md
```

## 🤖 Available Agents

Each agent specializes in a specific analysis task:

| Agent                     | Purpose                            | Priority |
| ------------------------- | ---------------------------------- | -------- |
| **File Structure**        | Project organization, entry points | HIGH     |
| **Dependency Analyzer**   | External deps, internal imports    | HIGH     |
| **Architecture Analyzer** | High-level design                  | HIGH     |
| **Pattern Detector**      | Design patterns, conventions       | MEDIUM   |
| **Flow Visualization**    | Control & data flows               | MEDIUM   |
| **Schema Generator**      | Data models, interfaces            | MEDIUM   |
| **Security Analyzer**     | Vulnerabilities, auth, crypto      | MEDIUM   |

## 🏗️ Architecture Highlights

### Multi-Agent System

The orchestrator coordinates agents to perform analysis.

```
┌─────────────────────────────┐
│  Documentation Orchestrator │
└─────────────┬─────────────┘
              │
    ┌─────────┴─────────┐
    │  Agent Registry   │
    └─────────┬─────────┘
              │
┌───▼────┐  ┌───▼───┐  ┌───▼───┐
│ Agent 1│  │ Agent 2│  │ Agent N│
└────────┘  └───────┘  └───────┘
```

### LangChain LCEL Integration

All agents use LangChain Expression Language (LCEL) for composable AI workflows with unified LangSmith tracing.

## 📊 Supported Languages

The tool is **language-agnostic** and works with:

- TypeScript/JavaScript
- Python
- Java/Kotlin
- Go
- C#/.NET
- Ruby
- PHP
- Rust (experimental)
- And more!

## 🤝 Contributing

We welcome contributions! See the **[Contributing Guide](./docs/CONTRIBUTING.md)** for details on:

- Development setup
- Creating custom agents
- Testing guidelines
- Code style and standards
- Pull request process

## � Resources

- **🌐 Website**: [techdebtgpt.com](https://techdebtgpt.com)
- **📦 GitHub**: [github.com/techdebtgpt/architecture-doc-generator](https://github.com/techdebtgpt/architecture-doc-generator)
- **📚 Documentation**: [Full Documentation](./docs/README.md)
- **💬 Discussions**: [GitHub Discussions](https://github.com/techdebtgpt/architecture-doc-generator/discussions)
- **🐛 Issues**: [Report Issues](https://github.com/techdebtgpt/architecture-doc-generator/issues)

## �📄 License

Apache License 2.0 - see the [LICENSE](./LICENSE) file for details.

---

**Made with ❤️ by [TechDebtGPT](https://techdebtgpt.com)**
