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
- [Search Strategy Performance](#-search-strategy-performance)
- [CLI Usage](#-cli-usage)
- [Programmatic Usage](#-programmatic-usage)
- [Configuration](#-configuration)
- [What Gets Generated](#-what-gets-generated)
- [Available Agents](#-available-agents)
- [Architecture Highlights](#️-architecture-highlights)
- [Supported Languages](#-supported-languages)
- [Common Questions](#-common-questions)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- 🤖 **8 Specialized AI Agents**: File Structure, Dependencies, Patterns, Flows, Schemas, Architecture, Security, and **Repository KPI** (NEW!).
- 📊 **Repository Health Dashboard**: LLM-powered KPI analysis with actionable insights on code quality, testing, architecture health, and technical debt.
- 🔍 **RAG Vector Search + Hybrid Retrieval**: Semantic similarity search (FREE local TF-IDF or cloud providers) combined with dependency graph analysis - finds files by meaning AND structure. [See docs →](docs/VECTOR_SEARCH.md)
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

## 📊 Vector Search & Embeddings Performance

We benchmarked **6 configurations** (including OpenAI embeddings) on a real-world 6,187-file NestJS project. **Graph + Local embeddings is the clear winner!**

**Quick Comparison**:

| Configuration        | Speed           | Cost         | Accuracy     | Winner?    |
| -------------------- | --------------- | ------------ | ------------ | ---------- |
| **Graph + Local** ⭐ | **6.1 min** ⚡  | **$0.08** 💰 | **84.8%** 🎯 | **YES** ✅ |
| Hybrid + Local       | 6.4 min         | $0.09        | 84.3%        | Good       |
| Smart + Local        | 6.3 min         | $0.08        | 84.6%        | Good       |
| Keyword-only         | 7.3 min         | $0.09        | 84.6%        | Fallback   |
| **OpenAI** ❌        | **11.7 min** ⚠️ | **$0.29** ⚠️ | **82.9%** ⚠️ | **NO**     |

**Key Findings:**

- ✅ Graph + Local: **Fastest, cheapest, most accurate** (best overall)
- ❌ OpenAI: **92% slower, 3.4x more expensive, 1.9% less accurate** (NOT recommended)
- 🆓 Local embeddings (free) outperform OpenAI embeddings (paid) for code analysis

**📖 Complete Analysis**: See **[Search Strategy Benchmark](./docs/SEARCH_STRATEGY_BENCHMARK.md)** for:

- Per-agent clarity scores (8 agents × 6 configurations)
- Why Graph + Local won (structural > semantic for code)
- Why OpenAI underperformed (8192 token limit, context loss, batching overhead)
- Configuration examples for all use cases
- Memory usage and technical deep-dive

Also see: [Vector Search Guide](./docs/VECTOR_SEARCH.md) - Complete guide to vector search with integrated recommendations

---

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

#### Vector Search & Hybrid Retrieval

```bash
# Vector search with local embeddings (FREE, default)
archdoc analyze --search-mode vector

# Keyword search (faster, simpler)
archdoc analyze --search-mode keyword

# Hybrid retrieval (semantic + structural)
archdoc analyze --search-mode vector --retrieval-strategy hybrid

# Configure in .archdoc.config.json for persistence:
{
  "searchMode": {
    "mode": "vector",
    "embeddingsProvider": "local",
    "strategy": "hybrid",
    "vectorWeight": 0.6,
    "graphWeight": 0.4
  }
}

# See docs/VECTOR_SEARCH.md for complete documentation
```

#### What Files Are Excluded?

Both **File Scanner** and **Vector Search** automatically exclude common build/dependency folders (language-agnostic):

**Default Exclusions** (applies to all languages):

- **Dependencies**: `node_modules/`, `vendor/`, `target/`, `packages/`, `bower_components/`
- **Build outputs**: `dist/`, `build/`, `out/`, `bin/`, `obj/`, `target/`
- **Test files**: `.test.`, `.spec.`, `__tests__/`, `test_`, `*_test.*`
- **Version control**: `.git/`, `.svn/`, `.hg/`
- **Generated code**: Coverage reports, logs, OS files (`.DS_Store`, `Thumbs.db`)

**Gitignore Support**:

- Automatically honors `.gitignore` patterns (default: `respectGitignore: true`)
- Works with all languages (not just JavaScript/Node.js)

**Customize Exclusions** in `.archdoc.config.json`:

```json
{
  "scan": {
    "excludePatterns": [
      "**/node_modules/**", // JavaScript/TypeScript
      "**/vendor/**", // PHP, Go
      "**/target/**", // Java, Rust
      "**/venv/**", // Python virtual env
      "**/my-custom-folder/**" // Your own exclusions
    ],
    "respectGitignore": true // Honor .gitignore (default: true)
  }
}
```

**Example**: On a 6,187-file NestJS project, vector search processes ~889 source files (14%) - focusing on actual code, not dependencies.

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

| Agent                     | Purpose                                    | Priority    | Output File         | Notes                           |
| ------------------------- | ------------------------------------------ | ----------- | ------------------- | ------------------------------- |
| **File Structure**        | Project organization, entry points         | HIGH        | `file-structure.md` | Always runs                     |
| **Dependency Analyzer**   | External deps, internal imports            | HIGH        | `dependencies.md`   | Always runs                     |
| **Architecture Analyzer** | High-level design, components              | HIGH        | `architecture.md`   | Always runs                     |
| **Pattern Detector**      | Design patterns, anti-patterns             | MEDIUM      | `patterns.md`       | Always runs                     |
| **Flow Visualization**    | Control & data flows with diagrams         | MEDIUM      | `flows.md`          | Always runs                     |
| **Schema Generator**      | Data models, interfaces, type definitions  | MEDIUM      | `schemas.md`        | **Only if schemas detected** ⚠️ |
| **Security Analyzer**     | Vulnerabilities, auth, secrets, crypto     | MEDIUM      | `security.md`       | Always runs                     |
| **KPI Analyzer** ⭐ NEW   | Repository health, executive KPI dashboard | MEDIUM-HIGH | `kpi.md`            | Always runs                     |

**⚠️ Schema Generator Smart Behavior:**

The Schema Generator agent is **intelligent** - it only generates output when it detects actual schema files:

**Detects:**

- ✅ **Database**: Prisma schemas (`.prisma`), TypeORM entities (`@Entity`), Sequelize models
- ✅ **API**: DTOs (`.dto.ts`), OpenAPI/Swagger definitions
- ✅ **GraphQL**: Type definitions (`.graphql`, `.gql`)
- ✅ **Types**: TypeScript interfaces, type definitions (focused schema files only)

**Behavior:**

- If **NO schemas found**: Generates `schemas.md` with "No schema definitions found" message
- If **schemas found**: Generates comprehensive documentation with Mermaid ER/class diagrams
- Uses `__FORCE_STOP__` to avoid unnecessary LLM calls when no schemas exist

**Why "No schemas"?**

- Project may use embedded types in service/controller files (not dedicated schema files)
- Database-less projects (e.g., static site generators, CLI tools)
- API-only projects using inline interfaces

This is **not a failure** - it's smart detection saving you tokens and cost! 💰

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

## ❓ Common Questions

### Q: Why does Schema Generator say "No schema definitions found"?

**A:** This is **not a failure** - it's smart detection! The Schema Generator only generates output when it detects dedicated schema files:

**What it detects**:

- ✅ **Prisma**: `schema.prisma`, `*.prisma`
- ✅ **TypeORM**: `@Entity()`, `*.entity.ts`
- ✅ **DTOs**: `*.dto.ts`, API schemas
- ✅ **GraphQL**: `*.graphql`, `*.gql`
- ✅ **OpenAPI**: `swagger.json`, `openapi.yaml`

**Common causes of "No schemas"**:

1. **Analyzing subdirectory only** - Schema files in `prisma/` won't be found if you run on `src/` only
   - ❌ `archdoc analyze ./src` (misses `./prisma/schema.prisma`)
   - ✅ `archdoc analyze .` (includes all directories)

2. **Embedded types** - Types in service/controller files (not dedicated schema files)
3. **Database-less projects** - Static sites, CLI tools, frontend-only apps
4. **Inline interfaces** - TypeScript interfaces mixed with business logic

**Solution**: Run analysis from project root, not subdirectories.

### Q: What files are excluded from vector search?

**A:** Vector search automatically excludes:

- **Dependencies**: `node_modules/`, `vendor/`, `target/`
- **Build outputs**: `dist/`, `build/`, `out/`, `bin/`, `obj/`
- **Test files**: `.test.`, `.spec.`, `__tests__/`, `test_`
- **Git**: `.git/` (and respects `.gitignore` by default)

From 6,187 total files, only ~889 source files (14%) are indexed for optimal performance.

### Q: Which search strategy should I use?

**A:** For **production**, use **Hybrid** (default):

- Combines semantic similarity (60%) + dependency graph (40%)
- Best balance of quality and performance
- Only 7% slower than vector-only, but 28% better architectural insights

For **fast iteration**, use **Vector-only** or **Smart**.

### Q: How much does it cost?

**A:** Using local embeddings (FREE) with Claude Haiku:

- Small project (1K files): ~$0.10-0.20
- Medium project (5K files): ~$0.35-0.45
- Large project (10K+ files): ~$0.60-0.80

**Tip:** Use `--depth quick` to reduce cost by ~30%.

### Q: Can I use it on private/closed-source code?

**A:** Yes! Your code is only sent to the LLM provider (Anthropic/OpenAI/Google) and is **not** stored or shared. Use local embeddings (`embeddingsProvider: "local"`) for completely offline semantic search.

### Q: How do I add support for my custom language?

**A:** No code changes needed! Add to `.archdoc.config.json`:

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

See [Custom Language Guide](./docs/CUSTOM_LANGUAGES.md) for details.

---

## 📄 License

Apache License 2.0 - see the [LICENSE](./LICENSE) file for details.

---

**Made with ❤️ by [TechDebtGPT](https://techdebtgpt.com)**
