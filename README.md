# 🏗️ ArchDoc Generator

[![npm version](https://img.shields.io/npm/v/@techdebtgpt/archdoc-generator.svg)](https://www.npmjs.com/package/@techdebtgpt/archdoc-generator)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Code of Conduct](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](.github/CODE_OF_CONDUCT.md)
[![Security Policy](https://img.shields.io/badge/Security-Policy-red.svg)](.github/SECURITY.md)
[![Website](https://img.shields.io/badge/Website-techdebtgpt.com-blue)](https://techdebtgpt.com)
[![GitHub stars](https://img.shields.io/github/stars/techdebtgpt/architecture-doc-generator)](https://github.com/techdebtgpt/architecture-doc-generator)

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

- 🤖 **8 Specialized AI Agents**: File Structure, Dependencies, Patterns, Flows, Schemas, Architecture, Security, and **Repository KPI** (NEW!).
- 📊 **Repository Health Dashboard**: LLM-powered KPI analysis with actionable insights on code quality, testing, architecture health, and technical debt.
- ⚡ **Generation Performance Metrics**: Track agent execution times, token usage, costs, and confidence scores in metadata.
- 🌍 **17 Languages Out-of-the-Box**: TypeScript, Python, Java, Go, C#, C/C++, Kotlin, PHP, Ruby, Rust, Scala, Swift, CSS, HTML, JSON, XML, Flex/ActionScript.
- 🧠 **AI-Powered**: Uses LangChain with Claude 4.5, OpenAI o1/GPT-4o, Gemini 2.5, or Grok 3.
- � **Comprehensive Analysis**: Structure, dependencies, patterns, flows, schemas, security, and executive-level KPIs.
- 📝 **Markdown Output**: Clean, version-controllable documentation with smart navigation.
- 🔄 **Iterative Refinement**: Self-improving analysis with quality checks and gap detection.
- 🎨 **Customizable**: Prompt-based agent selection and configuration.
- � **LangSmith Tracing**: Full observability of AI workflows with detailed token tracking.
- 🔒 **Security Analysis**: Vulnerability detection, authentication review, and crypto analysis.
- ➕ **Extensible**: Add support for any language via configuration—no code changes required.

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

#### Available Commands

| Command                 | Description                          | Example                                   |
| ----------------------- | ------------------------------------ | ----------------------------------------- |
| `archdoc analyze`       | Generate comprehensive documentation | `archdoc analyze /path/to/project`        |
| `archdoc analyze --c4`  | Generate C4 architecture model       | `archdoc analyze --c4`                    |
| `archdoc config --init` | Interactive configuration setup      | `archdoc config --init`                   |
| `archdoc config --list` | Show current configuration           | `archdoc config --list`                   |
| `archdoc export`        | Export docs to different formats     | `archdoc export .arch-docs --format html` |

#### Documentation Generation

```bash
# Analyze current directory
archdoc analyze

# Analyze specific project
archdoc analyze /path/to/your/project

# Custom output location
archdoc analyze --output ./docs

# Enhanced analysis with user focus (runs all agents with extra attention to specified topics)
archdoc analyze --prompt "security vulnerabilities and authentication patterns"
archdoc analyze --prompt "database schema design and API architecture"

# Analysis depth modes
archdoc analyze --depth quick    # Fast, less detailed (2 iterations, 70% threshold)
archdoc analyze --depth normal   # Balanced (5 iterations, 80% threshold) - default
archdoc analyze --depth deep     # Thorough, most detailed (10 iterations, 90% threshold)

# Disable iterative refinement for faster results
archdoc analyze --no-refinement

# Verbose output for debugging
archdoc analyze --verbose
```

#### C4 Architecture Model Generation

```bash
# Generate C4 model for current directory
archdoc analyze --c4

# Generate C4 model for specific project
archdoc analyze /path/to/project --c4

# Custom output location for C4 model
archdoc analyze --c4 --output ./architecture-docs

# C4 model with verbose output
archdoc analyze --c4 --verbose
```

#### Configuration Management

```bash
# Interactive configuration wizard (recommended for first-time setup)
archdoc config --init

# List current configuration
archdoc config --list

# Get specific configuration value
archdoc config --get llmProvider
archdoc config --get anthropicApiKey

# Set configuration value
archdoc config --set llmProvider=anthropic
archdoc config --set anthropicApiKey=your-api-key

# Reset configuration to defaults
archdoc config --reset
```

#### Export and Format Options

```bash
# Single-file output (default: multi-file)
archdoc analyze --single-file

# Export as JSON
archdoc analyze --single-file --format json

# Export as HTML
archdoc analyze --single-file --format html

# Export as Markdown (default)
archdoc analyze --single-file --format markdown

# Export existing documentation to different formats
archdoc export .arch-docs --format html --output ./docs.html
archdoc export .arch-docs --format json --output ./docs.json
archdoc export .arch-docs --format confluence --output ./confluence.md

# Export with custom template
archdoc export .arch-docs --format html --template ./my-template.html --output ./custom-docs.html
```

#### Advanced Usage

```bash
# Incremental updates (preserves existing docs, adds new analysis)
archdoc analyze --prompt "new feature area to document"
# (Automatically detects existing docs and runs in incremental mode)

# Full regeneration even if docs exist
archdoc analyze --clean

# Specify LLM provider and model
archdoc analyze --provider anthropic --model claude-sonnet-4-5-20250929
archdoc analyze --provider openai --model gpt-4o
archdoc analyze --provider google --model gemini-2.0-flash-exp

# Budget control (halt if cost exceeds limit)
archdoc analyze --max-cost 10.0  # Stop if cost exceeds $10

# Custom refinement settings
archdoc analyze --refinement-iterations 10 --refinement-threshold 90 --refinement-improvement 15
```

## CLI Usage

```bash
archdoc analyze [path] [options]
```

**Options:**

| Option                        | Description                                                    | Default      |
| ----------------------------- | -------------------------------------------------------------- | ------------ |
| `--output <dir>`              | Output directory                                               | `.arch-docs` |
| `--c4`                        | Generate C4 architecture model (Context/Containers/Components) | `false`      |
| `--prompt <text>`             | Enhance analysis with focus area (all agents still run)        |              |
| `--depth <level>`             | Analysis depth: `quick`, `normal`, `deep`                      | `normal`     |
| `--provider <name>`           | LLM provider: `anthropic`, `openai`, `xai`, `google`           |              |
| `--model <name>`              | Specific model to use                                          |              |
| `--refinement`                | Enable iterative refinement                                    | `true`       |
| `--refinement-iterations <n>` | Max refinement iterations                                      | `5`          |
| `--refinement-threshold <n>`  | Clarity threshold %                                            | `80`         |
| `--no-clean`                  | Don't clear output directory                                   |              |
| `--verbose`                   | Show detailed progress                                         |              |

### C4 Model Generation

Generate structured C4 architecture diagrams with PlantUML output:

```bash
# Generate C4 model
archdoc analyze --c4

# Generate for specific project
archdoc analyze /path/to/project --c4 --output ./architecture

# Output includes:
# - c4-model.json (structured data)
# - context.puml (system context diagram)
# - containers.puml (container diagram)
# - components.puml (component diagram)
```

## 🔧 Programmatic Usage

Use the library in your Node.js applications:

### Standard Documentation

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

### C4 Architecture Model

```typescript
import {
  C4ModelOrchestrator,
  AgentRegistry,
  FileSystemScanner,
} from '@techdebtgpt/archdoc-generator';

// Setup registry with agents
const registry = new AgentRegistry();
const scanner = new FileSystemScanner();
const orchestrator = new C4ModelOrchestrator(registry, scanner);

// Generate C4 model
const result = await orchestrator.generateC4Model('/path/to/project');

console.log('C4 Context:', result.c4Model.context);
console.log('Containers:', result.c4Model.containers);
console.log('Components:', result.c4Model.components);

// PlantUML diagrams available in result.plantUMLModel
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

### Standard Documentation

The tool generates a multi-file documentation structure:

```
.arch-docs/
├── index.md              # Table of contents with smart navigation
├── architecture.md       # High-level system design
├── file-structure.md     # Project organization
├── dependencies.md       # External & internal deps
├── patterns.md           # Design patterns detected
├── code-quality.md       # Quality metrics (if data exists)
├── flows.md              # Data & control flows
├── schemas.md            # Data models
├── security.md           # Security vulnerability analysis
├── recommendations.md    # Improvement suggestions
├── kpi.md                # Repository health KPI dashboard (NEW!)
├── metadata.md           # Generation metadata + performance metrics
└── changelog.md          # Documentation update history
```

**What's New:**

- **`kpi.md`**: LLM-generated repository health dashboard with actionable insights on code quality, testing coverage, architecture health, dependency management, and technical debt.
- **Generation Performance Metrics**: Added to `metadata.md` showing agent confidence scores, execution times, token efficiency, and cost breakdown.

### C4 Architecture Model

When using `--c4`, generates structured architecture diagrams:

```
.arch-docs-c4/
├── c4-model.json         # Complete C4 model (JSON)
├── context.puml          # System Context (Level 1)
├── containers.puml       # Container Diagram (Level 2)
└── components.puml       # Component Diagram (Level 3)
```

**C4 Model Levels:**

- **Context**: Shows the system boundary, actors (users), and external systems
- **Containers**: Shows deployable units (APIs, web apps, databases, microservices)
- **Components**: Shows internal modules and their relationships within containers

## 🤖 Available Agents

Each agent specializes in a specific analysis task using LLM-powered intelligence:

| Agent                     | Purpose                                    | Priority    | Output File         |
| ------------------------- | ------------------------------------------ | ----------- | ------------------- |
| **File Structure**        | Project organization, entry points         | HIGH        | `file-structure.md` |
| **Dependency Analyzer**   | External deps, internal imports            | HIGH        | `dependencies.md`   |
| **Architecture Analyzer** | High-level design, components              | HIGH        | `architecture.md`   |
| **Pattern Detector**      | Design patterns, anti-patterns             | MEDIUM      | `patterns.md`       |
| **Flow Visualization**    | Control & data flows with diagrams         | MEDIUM      | `flows.md`          |
| **Schema Generator**      | Data models, interfaces, type definitions  | MEDIUM      | `schemas.md`        |
| **Security Analyzer**     | Vulnerabilities, auth, secrets, crypto     | MEDIUM      | `security.md`       |
| **KPI Analyzer** ⭐ NEW   | Repository health, executive KPI dashboard | MEDIUM-HIGH | `kpi.md`            |

**KPI Analyzer Features:**

- 📊 Overall repository health score (0-100%)
- 🎯 Component scores: Code quality, testing, architecture, dependencies, complexity
- 📈 Detailed metrics with ASCII visualizations
- 💡 8+ actionable insights with prioritized action items
- 🚀 Executive-friendly language with quantifiable targets

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

### Self-Refining Analysis

Each agent autonomously improves its analysis through iterative refinement. It evaluates its own output, identifies gaps, searches for relevant code, and refines until quality thresholds are met.

**[Learn how the self-refinement workflow works →](./docs/AGENT_WORKFLOW.md)**

### LangChain LCEL Integration

All agents use LangChain Expression Language (LCEL) for composable AI workflows with unified LangSmith tracing.

## 📊 Language Support

ArchDoc Generator supports **17 programming and markup languages** out-of-the-box with **zero configuration**:

### Programming Languages

| Language                  | Extensions                                       | Import Detection              | Framework Support                             |
| ------------------------- | ------------------------------------------------ | ----------------------------- | --------------------------------------------- |
| **TypeScript/JavaScript** | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`     | ES6 imports, CommonJS require | NestJS, Express, React, Angular, Vue, Next.js |
| **Python**                | `.py`, `.pyi`, `.pyx`                            | `from...import`, `import`     | Django, Flask, FastAPI, Pyramid               |
| **Java**                  | `.java`                                          | `import` statements           | Spring Boot, Quarkus, Micronaut               |
| **Go**                    | `.go`                                            | `import` blocks               | Gin, Echo, Fiber, Chi                         |
| **C#**                    | `.cs`, `.csx`                                    | `using` statements            | ASP.NET, Entity Framework                     |
| **C/C++**                 | `.c`, `.cpp`, `.cc`, `.cxx`, `.h`, `.hpp`, `.hh` | `#include` directives         | Linux, POSIX                                  |
| **Kotlin**                | `.kt`, `.kts`                                    | `import` statements           | Spring, Ktor, Micronaut                       |
| **PHP**                   | `.php`                                           | `use`, `require`              | Laravel, Symfony                              |
| **Ruby**                  | `.rb`, `.rake`                                   | `require` statements          | Rails, Sinatra                                |
| **Rust**                  | `.rs`                                            | `use` statements              | Tokio, Actix, Rocket                          |
| **Scala**                 | `.scala`                                         | `import` statements           | Akka, Play                                    |
| **Swift**                 | `.swift`                                         | `import` statements           | SwiftUI, Vapor                                |

### Web & Data Languages

| Language              | Extensions               | Detection                | Notes                        |
| --------------------- | ------------------------ | ------------------------ | ---------------------------- |
| **CSS**               | `.css`, `.scss`, `.sass` | `@import` rules          | Theme and variable detection |
| **HTML**              | `.html`, `.htm`          | `src`, `href` attributes | Script/link/image extraction |
| **JSON**              | `.json`                  | N/A                      | Configuration file analysis  |
| **XML**               | `.xml`                   | `xi:include` elements    | XInclude support             |
| **Flex/ActionScript** | `.as`, `.mxml`           | `import` statements      | Flash/Flex project support   |

### Multi-Language Projects

The scanner **automatically detects** all supported languages in your project:

```bash
# Just run the command - no configuration needed!
archdoc analyze ./my-project

# Example output:
# ✅ Found 487 imports across 17 file types
# - TypeScript: 234 imports
# - Python: 123 imports
# - Rust: 89 imports
# - CSS: 41 imports
```

### Custom Language Support

Need support for a language not listed? **No code changes required!**

Add custom language configurations via `.archdoc.config.json`:

```json
{
  "languages": {
    "custom": {
      "myLanguage": {
        "displayName": "My Language",
        "filePatterns": {
          "extensions": [".mylang"]
        },
        "importPatterns": {
          "myImport": "^import\\s+([^;]+);"
        }
      }
    }
  }
}
```

See **[Custom Language Configuration Guide](./docs/CUSTOM_LANGUAGES.md)** for complete documentation on:

- Adding new languages
- Extending built-in language configurations
- Custom import pattern syntax
- Language-specific frameworks and keywords

## 🤝 Contributing

We welcome contributions! See the **[Contributing Guide](./docs/CONTRIBUTING.md)** for details on:

- Development setup
- Creating custom agents
- Testing guidelines
- Code style and standards
- Pull request process

### Community Guidelines

- **[Code of Conduct](./.github/CODE_OF_CONDUCT.md)** - Our pledge to foster an open and welcoming environment
- **[Security Policy](./.github/SECURITY.md)** - How to report security vulnerabilities responsibly
- **[Issue Templates](./.github/ISSUE_TEMPLATE/)** - Bug reports, feature requests, and more
- **[Pull Request Template](./.github/PULL_REQUEST_TEMPLATE.md)** - Guidelines for submitting changes

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
