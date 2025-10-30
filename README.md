# 🏗️ ArchDoc Generator# 🏗️ ArchDoc Generator# Architecture Documentation Generator# Architecture Documentation Generator# Architecture Documentation Generator# 🏗️ ArchDoc Generator

> AI-powered architecture documentation generator for any codebase using LangChain and multi-agent workflows> AI-powered architecture documentation generator for any codebase using LangChain and multi-agent workflows> AI-powered architecture documentation generator for any codebase using LangChain and multi-agent workflows

[![npm version](https://img.shields.io/npm/v/@archdoc/generator.svg)](https://www.npmjs.com/package/@archdoc/generator)[![npm version](https://img.shields.io/npm/v/@archdoc/generator.svg)](https://www.npmjs.com/package/@archdoc/generator)[![npm version](https://img.shields.io/npm/v/@archdoc/generator.svg)](https://www.npmjs.com/package/@archdoc/generator)> AI-powered architecture documentation generator for any codebase using LangChain and multi-agent workflows

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Overview

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

Architecture Documentation Generator is an intelligent tool that analyzes your codebase and generates comprehensive, accurate architectural documentation automatically. It supports **any programming language** and uses AI-powered agents to understand your project structure, dependencies, patterns, security, and data flows.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

### Key Features

## 🎯 Overview

- 🤖 **7 Specialized Agents** - File Structure, Dependencies, Patterns, Flows, Schemas, Architecture, Security

- 🌍 **Language Agnostic** - Works with TypeScript, Python, Java, Go, and more[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

- 🧠 **AI-Powered** - Uses LangChain with Claude 3.5, GPT-4, or Gemini

- 📊 **Comprehensive Analysis** - Structure, dependencies, patterns, flows, schemas, securityArchitecture Documentation Generator is an intelligent tool that analyzes your codebase and generates comprehensive, accurate architectural documentation automatically. It supports **any programming language** and uses AI-powered agents to understand your project structure, dependencies, patterns, security, and data flows.

- 📝 **Markdown Output** - Clean, version-controllable documentation

- 🔄 **Iterative Refinement** - Self-improving analysis with quality checks[![npm version](https://img.shields.io/npm/v/@archdoc/generator.svg)](https://www.npmjs.com/package/@archdoc/generator)> AI-powered automatic documentation generation for any codebase, in any language.> Language-agnostic AI-powered architecture documentation generator using LangChain and agentic workflows

- 🎨 **Customizable** - Prompt-based agent selection and configuration

- 📈 **LangSmith Tracing** - Full observability of AI workflows### Key Features

- 🔒 **Security Analysis** - Vulnerability detection, authentication review, crypto analysis

## 🎯 Overview

## 🚀 Quick Start

- 🤖 **7 Specialized Agents** - File Structure, Dependencies, Patterns, Flows, Schemas, Architecture, Security

### Installation

- 🌍 **Language Agnostic** - Works with TypeScript, Python, Java, Go, and more[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

````````bash

# Using npm- 🧠 **AI-Powered** - Uses LangChain with Claude 3.5, GPT-4, or Gemini

npm install -g @archdoc/generator

- 📊 **Comprehensive Analysis** - Structure, dependencies, patterns, flows, schemas, securityArchitecture Documentation Generator is an intelligent tool that analyzes your codebase and generates comprehensive, accurate architectural documentation automatically. It supports **any programming language** and uses AI-powered agents to understand your project structure, dependencies, patterns, and data flows.

# Using yarn

yarn global add @archdoc/generator- 📝 **Markdown Output** - Clean, version-controllable documentation



# Using pnpm- 🔄 **Iterative Refinement** - Self-improving analysis with quality checks[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

pnpm add -g @archdoc/generator

```- 🎨 **Customizable** - Prompt-based agent selection and configuration



### Interactive Setup (Recommended)- 📈 **LangSmith Tracing** - Full observability of AI workflows### Key Features



Run the interactive configuration wizard:- 🔒 **Security Analysis** - Vulnerability detection, authentication review, crypto analysis



```bash[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

archdoc config --init

```## 🚀 Quick Start



This will:- 🤖 **Multi-Agent Architecture** - Specialized agents for different analysis tasks

1. Prompt you to choose an LLM provider (Anthropic/OpenAI/Google)

2. Ask for your API key### Installation

3. Create `.archdoc.config.json` with your configuration

4. Validate your setup- 🌍 **Language Agnostic** - Works with TypeScript, Python, Java, Go, and more[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)[![npm version](https://badge.fury.io/js/%40archdoc%2Fgenerator.svg)](https://www.npmjs.com/package/@archdoc/generator)



### Basic Usage```````bash



```bash# Using npm- 🧠 **AI-Powered** - Uses LangChain with Claude, GPT-4, or Gemini

# Analyze current directory

archdoc analyzenpm install -g @archdoc/generator



# Analyze specific project- 📊 **Comprehensive Analysis** - Structure, dependencies, patterns, flows, schemas## 🎯 Overview

archdoc analyze /path/to/your/project

# Using yarn

# Focused analysis with prompt

archdoc analyze --prompt "analyze dependencies and security vulnerabilities"yarn global add @archdoc/generator- 📝 **Markdown Output** - Clean, version-controllable documentation



# Custom output location

archdoc analyze --output ./docs

# Using pnpm- 🔄 **Iterative Refinement** - Self-improving analysis with quality checks[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Quick analysis (faster, less detailed)

archdoc analyze --depth quickpnpm add -g @archdoc/generator

````````

```````- 🎨 **Customizable** - Prompt-based agent selection and configuration

## 📚 Documentation



Comprehensive documentation is available in the [`docs/`](./docs) directory:

### Interactive Setup (Recommended)- 📈 **LangSmith Tracing** - Full observability of AI workflowsArchitecture Documentation Generator is an intelligent tool that analyzes your codebase and generates comprehensive, accurate architectural documentation automatically. It supports **any programming language** and uses AI-powered agents to understand your project structure, dependencies, patterns, and data flows.

- **[📖 User Guide](./docs/USER_GUIDE.md)** - Complete CLI reference, configuration, and examples

- **[🏗️ Architecture](./docs/ARCHITECTURE.md)** - Technical design, patterns, and agent system

- **[🔌 Integration Guide](./docs/INTEGRATION_GUIDE.md)** - CI/CD integration and programmatic usage

- **[🤝 Contributing](./docs/CONTRIBUTING.md)** - Development setup and contribution guidelinesRun the interactive configuration wizard:## 🚀 Quick Start[![Node](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

- **[⚙️ Configuration Guide](./docs/CONFIGURATION_GUIDE.md)** - Detailed configuration options

- **[📚 API Reference](./docs/API.md)** - Programmatic API documentation

- **[📋 Quick Config Reference](./docs/QUICK_CONFIG_REFERENCE.md)** - Configuration cheat sheet

```bash### Installation### Key Features

## 🎨 What Gets Generated

archdoc config --init

The tool generates a multi-file documentation structure:

``````bash

```````

docs/

├── index.md # Table of contents

├── metadata.md # Generation metadataThis will:# Using npm

├── file-structure.md # Project structure and organization

├── dependencies.md # Dependency analysis1. Prompt you to choose an LLM provider (Anthropic/OpenAI/Google)

├── patterns.md # Code patterns and practices

├── flows.md # Data and control flows2. Ask for your API keynpm install -g @archdoc/generator- 🤖 **Multi-Agent Architecture** - Specialized agents for different analysis tasks

├── schemas.md # Data structures and interfaces

├── architecture.md # High-level architecture3. Create `.archdoc.config.json` with your configuration

├── security.md # Security analysis and findings (NEW!)

└── recommendations.md # Improvement suggestions4. Validate your setup

````



## 🤖 Available Agents

### Manual Setup (Alternative)# Using yarn- 🌍 **Language Agnostic** - Works with TypeScript, Python, Java, Go, and more## Overview## 🌟 Features

Each agent specializes in a specific analysis task:



| Agent | Purpose | Priority | Output |

|-------|---------|----------|--------|Copy the example config and edit it:yarn global add @archdoc/generator

| **File Structure** | Project organization, entry points | HIGH | Directory tree, key files |

| **Dependency Analyzer** | External deps, internal imports | HIGH | Dependency graph, version info |

| **Architecture Analyzer** | High-level design | HIGH | Component diagrams, layers |

| **Pattern Detector** | Design patterns, conventions | MEDIUM | Pattern usage, best practices |```bash- 🧠 **AI-Powered** - Uses LangChain with Claude, GPT-4, or Gemini

| **Flow Visualization** | Control & data flows | MEDIUM | Flow diagrams, sequence charts |

| **Schema Generator** | Data models, interfaces | MEDIUM | Type definitions, schemas |cp .archdoc.config.example.json .archdoc.config.json

| **Security Analyzer** | Vulnerabilities, auth, crypto | MEDIUM | Security findings, severity levels |

# Edit .archdoc.config.json and add your API key# Using pnpm

### 🔒 Security Analyzer (New!)

````

The Security Analyzer agent provides comprehensive security analysis:

pnpm add -g @archdoc/generator- 📊 **Comprehensive Analysis** - Structure, dependencies, patterns, flows, schemas

**Capabilities:**

- **Authentication & Authorization** - OAuth, JWT, session management, RBAC analysis### Basic Usage

- **Vulnerability Detection** - SQL injection, XSS, CSRF, command injection, path traversal

- **Cryptography Review** - Weak algorithms, key management, hardcoded secrets````

- **Data Protection** - PII handling, encryption at rest/transit, secure storage

- **API Security** - Input validation, rate limiting, CORS, security headers```bash

- **Secret Management** - Hardcoded credentials, API key exposure, environment variables

# Analyze current directory- 📝 **Markdown Output** - Clean, version-controllable documentation

**Severity Levels:**

- 🔴 **Critical** - Immediate action required (e.g., hardcoded secrets, SQL injection)archdoc analyze

- 🟠 **High** - Important to fix soon (e.g., weak crypto, missing auth)

- 🟡 **Medium** - Should address (e.g., missing security headers, weak validation)### Interactive Setup (Recommended)

- 🟢 **Low** - Good to improve (e.g., outdated libraries, minor issues)

- 🔵 **Info** - Recommendations (e.g., security best practices)# Analyze specific project

**Supported Languages:**archdoc analyze /path/to/your/projectRun the interactive configuration wizard:

JavaScript/TypeScript, Python, Java, C#, Go, Rust, PHP, Ruby

## 💡 Usage Examples

# Focused analysis with prompt```bash

### Example 1: Full Project Documentation

archdoc analyze --prompt "analyze dependencies and patterns"archdoc config --init

`````bash

# Generate complete documentation````

archdoc analyze /path/to/project --output ./docs --depth deep

```# Custom output location



### Example 2: Focused Security Analysisarchdoc analyze --output ./docsThis will:



```bash# Quick analysis (faster, less detailed)1. Prompt you to choose an LLM provider (Anthropic/OpenAI/Google)

# Focus on security and dependencies

archdoc analyze --prompt "analyze security vulnerabilities and dependencies"archdoc analyze --depth quick2. Ask for your API key

`````

```3. Create `.arch-docs/.archdoc.config.json` with your configuration

### Example 3: Quick Scan

4. Validate your setup

````````bash

# Fast analysis for quick insights## 📚 Documentation

archdoc analyze --depth quick --output ./quick-docs

```### Manual Setup (Alternative)



### Example 4: CI/CD Integration- **[User Guide](./USER_GUIDE.md)** - Complete CLI reference, configuration, and examples



```yaml- **[Architecture](./ARCHITECTURE.md)** - Technical design and system architectureCopy the example config and edit it:

# GitHub Actions example

name: Generate Architecture Docs- **[Contributing](./CONTRIBUTING.md)** - Development setup and contribution guideline

on:

  push:cp .archdoc.config.example.json .arch-docs/.archdoc.config.json

    branches: [main]

jobs:## 🎨 What Gets Generated# Edit .arch-docs/.archdoc.config.json and add your API key

  docs:

    runs-on: ubuntu-latest```

    steps:

      - uses: actions/checkout@v3The tool generates a multi-file documentation structure:

      - name: Install ArchDoc

        run: npm install -g @archdoc/generator### Basic Usage

      - name: Generate Docs

        env:```

          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

        run: archdoc analyze . --output ./docs --depth normaldocs/```````bash- **🌍 Language Agnostic** - Works with TypeScript, JavaScript, Python, Java, Go, Rust, C++, and more- **⚡ Intelligent Caching**: Reduces API costs with smart caching

      - name: Deploy to GitHub Pages

        uses: peaceiris/actions-gh-pages@v3├── index.md # Table of contents

        with:

          github_token: ${{ secrets.GITHUB_TOKEN }}├── metadata.md # Generation metadata```bash

          publish_dir: ./docs

```├── file-structure.md # Project structure and organization



## 🔧 Programmatic Usage├── dependencies.md # Dependency analysis# Analyze current directory# Using npm



Use the library in your Node.js applications:├── patterns.md # Code patterns and practices



```typescript├── flows.md # Data and control flowsarchdoc analyze

import {

  DocumentationOrchestrator,├── schemas.md # Data structures and interfaces

  AgentRegistry,

  FileSystemScanner├── architecture.md # High-level architecturenpm install -g @archdoc/generator- **🤖 AI-Powered** - Leverages Claude 3.5, GPT-4, or Gemini for intelligent analysis- **🔄 Incremental Updates**: Update docs without full regeneration

} from '@archdoc/generator';

├── security.md # Security analysis and findings (NEW!)

// Setup registry with agents

const registry = new AgentRegistry();└── recommendations.md # Improvement suggestions# Analyze specific project

const scanner = new FileSystemScanner();

const orchestrator = new DocumentationOrchestrator(registry, scanner);```````



// Generate documentationarchdoc analyze /path/to/your/project

const docs = await orchestrator.generateDocumentation('/path/to/project', {

  maxTokens: 100000,## 🤖 Available Agents

  parallel: true,

  iterativeRefinement: {

    enabled: true,

    maxIterations: 5,Each agent specializes in a specific analysis task:

    clarityThreshold: 80

  }# Focused analysis with prompt# Using yarn- **🎯 Zero Configuration** - No language-specific parsers or AST setup required- **🎨 Customizable Workflows**: Create your own agents and workflows

});

| Agent | Purpose | Priority | Output |

console.log('Generated:', docs.summary);

```|-------|---------|----------|--------|archdoc analyze --prompt "analyze dependencies and patterns"



See **[API Reference](./docs/API.md)** for complete programmatic documentation.| **File Structure** | Project organization, entry points | HIGH | Directory tree, key files |



## 🏗️ Architecture Highlights| **Dependency Analyzer** | External deps, internal imports | HIGH | Dependency graph, version info |yarn global add @archdoc/generator



### Multi-Agent System| **Architecture Analyzer** | High-level design | HIGH | Component diagrams, layers |



```| **Pattern Detector** | Design patterns, conventions | MEDIUM | Pattern usage, best practices |# Custom output location

┌─────────────────────────────────────────────┐

│      Documentation Orchestrator             │| **Flow Visualization** | Control & data flows | MEDIUM | Flow diagrams, sequence charts |

│  (Coordinates agents, manages workflow)     │

└─────────────────────────────────────────────┘| **Schema Generator** | Data models, interfaces | MEDIUM | Type definitions, schemas |archdoc analyze --output ./docs- **📊 Comprehensive Analysis** - Structure, dependencies, patterns, quality, and technical debt- **📦 Multiple Interfaces**: CLI, npm package, VS Code extension

              │

    ┌─────────┴─────────┐| **Security Analyzer** | Vulnerabilities, auth, crypto | MEDIUM | Security findings, severity levels |

    │  Agent Registry   │

    └─────────┬─────────┘

              │

    ┌─────────┴──────────┬──────────────┬──────────────┐### 🔒 Security Analyzer (New!)

    │                    │              │              │

┌───▼────┐  ┌──────▼──────┐  ┌────▼─────┐  ┌────▼─────┐# Quick analysis (faster, less detailed)# Using pnpm

│ File   │  │ Dependency  │  │ Pattern  │  │ Security │

│Structure│  │  Analyzer   │  │ Detector │  │ Analyzer │The Security Analyzer agent provides comprehensive security analysis:

└────────┘  └─────────────┘  └──────────┘  └──────────┘

```archdoc analyze --depth quick



### LangChain LCEL Integration**Capabilities:**



All agents use LangChain Expression Language (LCEL) for composable AI workflows with unified LangSmith tracing.- **Authentication & Authorization** - OAuth, JWT, session management, RBAC analysis```pnpm add -g @archdoc/generator- **🔌 Extensible** - Add custom agents for specialized analysis



See **[Architecture Documentation](./docs/ARCHITECTURE.md)** for detailed technical design.- **Vulnerability Detection** - SQL injection, XSS, CSRF, command injection, path traversal



### Iterative Refinement- **Cryptography Review** - Weak algorithms, key management, hardcoded secrets



Self-improving analysis with clarity scoring:- **Data Protection** - PII handling, encryption at rest/transit, secure storage



1. Initial analysis by agent- **API Security** - Input validation, rate limiting, CORS, security headers## 📚 Documentation```

2. Clarity evaluation (0-100)

3. Generate refinement questions- **Secret Management** - Hardcoded credentials, API key exposure, environment variable usage

4. Enhanced re-analysis

5. Repeat until threshold met



## 📊 Supported Languages**Severity Levels:**



The tool is **language-agnostic** and works with:- 🔴 **Critical** - Immediate action required (e.g., hardcoded secrets, SQL injection)- **[📖 User Guide](./docs/USER_GUIDE.md)** - Complete CLI reference, configuration, and examples- **⚡ Multiple Interfaces** - CLI tool, programmatic API, or VS Code extension (coming soon)## 📋 Table of Contents



- TypeScript/JavaScript (excellent support)- 🟠 **High** - Important to fix soon (e.g., weak crypto, missing auth)

- Python (excellent support)

- Java/Kotlin (good support)- 🟡 **Medium** - Should address (e.g., missing security headers, weak validation)- **[🔌 Integration Guide](./docs/INTEGRATION_GUIDE.md)** - CI/CD integration and programmatic usage

- Go (good support)

- C#/.NET (good support)- 🟢 **Low** - Good to improve (e.g., outdated libraries, minor issues)

- Ruby (good support)

- PHP (good support)- 🔵 **Info** - Recommendations (e.g., security best practices)- **[🏗️ Architecture](./docs/ARCHITECTURE.md)** - Technical design and system architecture### Environment Setup

- Rust (experimental)

- And more!



## 🛠️ Configuration**Supported Languages:**- **[📚 API Reference](./docs/API.md)** - Programmatic API documentation



### CLI Options- JavaScript/TypeScript (Express, NestJS, React, Node.js)



```bash- Python (Django, Flask, FastAPI)- **[🤝 Contributing](./docs/CONTRIBUTING.md)** - Development setup and contribution guidelines- **📝 Multiple Formats** - Output as Markdown, JSON, or HTML

archdoc analyze [path] [options]

- Java (Spring Boot, Jakarta EE)

Options:

  --output <dir>              Output directory (default: .arch-docs)- C# (.NET, ASP.NET Core)

  --prompt <text>             Focus analysis with natural language

  --depth <level>             Analysis depth: quick|normal|deep (default: normal)- Go (Gin, Echo, net/http)

  --provider <name>           LLM provider: anthropic|openai|google

  --model <name>              Specific model to use- Rust (Actix, Rocket)## 🎨 What Gets GeneratedCreate a `.env` file with your API keys:

  --refinement                Enable iterative refinement (default: true)

  --refinement-iterations <n> Max refinement iterations (default: 5)- PHP (Laravel, Symfony)

  --refinement-threshold <n>  Clarity threshold % (default: 80)

  --no-clean                  Don't clear output directory- Ruby (Rails, Sinatra)

  --verbose                   Show detailed progress

````````

### Environment Variables## 💡 Usage ExamplesThe tool generates a multi-file documentation structure:- [Installation](#installation)

| Variable | Description | Default |

|----------|-------------|---------|

| `ANTHROPIC_API_KEY` | Anthropic Claude API key | - |### Example 1: Full Project Documentation

| `OPENAI_API_KEY` | OpenAI GPT API key | - |

| `GOOGLE_API_KEY` | Google Gemini API key | - |

| `DEFAULT_LLM_PROVIDER` | Default provider | `anthropic` |

| `DEFAULT_LLM_MODEL` | Default model | `claude-3-5-sonnet-20241022` |```bash``````env

| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing | `false` |

| `LANGCHAIN_API_KEY` | LangSmith API key | - |# Generate complete documentation

| `LANGCHAIN_PROJECT` | LangSmith project name | - |

archdoc analyze /path/to/project --output ./docs --depth deepdocs/

See **[Configuration Guide](./docs/CONFIGURATION_GUIDE.md)** for detailed configuration options.

`````````

## 🔍 Use Cases

├── index.md # Table of contents# Required: Choose one LLM provider## Quick Start- [Quick Start](#quick-start)

### 1. Onboarding New Developers

### Example 2: Focused Security Analysis

Generate comprehensive docs to help new team members understand the codebase quickly.

├── metadata.md # Generation metadata

```bash

archdoc analyze . --output ./onboarding-docs --depth deep````bash

```

# Focus on security and dependencies├── file-structure.md           # Project structure and organizationANTHROPIC_API_KEY=sk-ant-...        # Recommended: Claude 3.5

### 2. Architecture Reviews

archdoc analyze --prompt "analyze security vulnerabilities and dependencies"

Create documentation for architecture review meetings.

```├── dependencies.md             # Dependency analysis

```bash

archdoc analyze --prompt "analyze architecture, patterns, and code quality"

```

### Example 3: Quick Scan├── patterns.md                 # Code patterns and practicesOPENAI_API_KEY=sk-...               # Alternative: GPT-4- [Usage](#usage)

### 3. Documentation Maintenance



Keep docs in sync with code using CI/CD automation (see [Integration Guide](./docs/INTEGRATION_GUIDE.md)).

```bash├── flows.md                    # Data and control flows

### 4. Security Audits

# Fast analysis for quick insights

Identify security vulnerabilities and areas needing improvement.

archdoc analyze --depth quick --output ./quick-docs├── schemas.md                  # Data structures and interfacesGOOGLE_API_KEY=...                  # Alternative: Gemini

```bash

archdoc analyze --prompt "analyze security vulnerabilities and authentication"````

```

├── architecture.md # High-level architecture

### 5. Legacy Code Understanding

### Example 4: CI/CD Integration

Quickly understand undocumented legacy codebases.

└── recommendations.md # Improvement suggestions### Installation - [CLI Usage](#cli-usage)

```bash

archdoc analyze /path/to/legacy --depth deep --verbose````````yaml

```

# GitHub Actions example```````

## 📈 LangSmith Tracing

name: Generate Architecture Docs

Enable full observability of AI workflows:

on:# Optional: LangSmith tracing

```bash

export LANGCHAIN_TRACING_V2=true  push:

export LANGCHAIN_API_KEY=lsv2_pt_...

export LANGCHAIN_PROJECT=my-project    branches: [main]## 🤖 Available Agents



archdoc analyze . --verbosejobs:

```

  docs:LANGCHAIN_TRACING_V2=true - [Programmatic Usage](#programmatic-usage)

**Trace Hierarchy:**

    runs-on: ubuntu-latest

```

DocumentationGeneration-Complete    steps:Each agent specializes in a specific analysis task:

├── ScanProjectStructure

├── CreateExecutionContext      - uses: actions/checkout@v3

├── ExecuteAgents

│   ├── Agent-file-structure (8.5s, 8.6K tokens)      - name: Install ArchDocLANGCHAIN*API_KEY=lsv2_pt*...

│   ├── Agent-dependency-analyzer (7.2s, 7.1K tokens)

│   ├── Agent-pattern-detector (10.1s, 11.1K tokens)        run: npm install -g @archdoc/generator

│   ├── Agent-flow-visualization (9.5s, 8.9K tokens)

│   ├── Agent-schema-generator (7.1s, 6.2K tokens)      - name: Generate Docs| Agent | Purpose | Output |

│   ├── Agent-architecture-analyzer (9.2s, 9.5K tokens)

│   └── Agent-security-analyzer (8.8s, 7.8K tokens)        env:

└── AggregateResults

```          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}|-------|---------|--------|LANGCHAIN_PROJECT=my-project```bash - [VS Code Extension](#vs-code-extension)



## 🤝 Contributing        run: archdoc analyze . --output ./docs --depth normal



We welcome contributions! See **[Contributing Guide](./docs/CONTRIBUTING.md)** for:      - name: Deploy to GitHub Pages| **File Structure** | Project organization, entry points | Directory tree, key files |



- Development setup        uses: peaceiris/actions-gh-pages@v3

- Creating custom agents

- Testing guidelines        with:| **Dependency Analyzer** | External deps, internal imports | Dependency graph, version info |```

- Code style and standards

- Pull request process          github_token: ${{ secrets.GITHUB_TOKEN }}



## 📄 License          publish_dir: ./docs| **Pattern Detector** | Design patterns, conventions | Pattern usage, best practices |



Apache License 2.0 - see [LICENSE](./LICENSE) file for details.````````



## 🙏 Acknowledgments| **Flow Visualization** | Control & data flows | Flow diagrams, sequence charts |npm install -g @archdoc/generator- [Configuration](#configuration)



Built with:## 🔧 Programmatic Usage



- [LangChain](https://www.langchain.com/) - LLM orchestration framework| **Schema Generator** | Data models, interfaces | Type definitions, schemas |

- [Anthropic Claude](https://www.anthropic.com/) - Primary LLM

- [TypeScript](https://www.typescriptlang.org/) - LanguageUse the library in your Node.js applications:

- [Commander.js](https://github.com/tj/commander.js/) - CLI framework

| **Architecture Analyzer** | High-level design | Component diagrams, layers |### Basic Usage

## 📞 Support

````typescript

- 🐛 [Report Issues](https://github.com/ritech/architecture-doc-generator/issues)

- 💬 [Discussions](https://github.com/ritech/architecture-doc-generator/discussions)import {## 💡 Usage Examples```- [Agents](#agents)

- 📖 [Documentation](./docs/README.md)

  DocumentationOrchestrator,

## 🗺️ Roadmap

  AgentRegistry,### Example 1: Full Project Documentation```bash

- [ ] Visual diagram generation (Mermaid, PlantUML)

- [ ] Diff-based incremental updates  FileSystemScanner

- [ ] Custom agent plugin system

- [ ] Web UI for interactive exploration} from '@archdoc/generator';```bash# Analyze current directory- [Custom Agents](#custom-agents)

- [ ] Integration with documentation platforms

- [ ] Multi-repository analysis

- [ ] Cost optimization modes

- [ ] VS Code extension// Setup registry with agents# Generate complete documentation



---const registry = new AgentRegistry();



**Made with ❤️ by the Ritech Team**const scanner = new FileSystemScanner();archdoc analyze /path/to/project --output ./docs --depth deeparchdoc analyze



📖 **[View Full Documentation](./docs/README.md)** · 🏗️ **[Architecture](./docs/ARCHITECTURE.md)** · 🤝 **[Contributing](./docs/CONTRIBUTING.md)**const orchestrator = new DocumentationOrchestrator(registry, scanner);


````

// Generate documentation

const docs = await orchestrator.generateDocumentation('/path/to/project', {### Set API Key- [Output Formats](#output-formats)

maxTokens: 100000,

parallel: true,### Example 2: Focused Analysis

iterativeRefinement: {

    enabled: true,# Analyze specific project

    maxIterations: 5,

    clarityThreshold: 80```bash

}

});# Only analyze dependencies and patternsarchdoc analyze /path/to/your/project- [Examples](#examples)

console.log('Generated:', docs.summary);archdoc analyze --prompt "analyze dependencies and design patterns"

```

```

## 🏗️ Architecture Highlights

### Example 3: Quick Scan# Focused analysis with prompt```bash- [Contributing](#contributing)

### Multi-Agent System

```basharchdoc analyze --prompt "analyze dependencies and patterns"

```

┌─────────────────────────────────────────────┐# Fast analysis for quick insights

│ Documentation Orchestrator │

│ (Coordinates agents, manages workflow) │archdoc analyze --depth quick --output ./quick-docs# Choose your preferred LLM provider- [License](#license)

└─────────────────────────────────────────────┘

              │```

    ┌─────────┴─────────┐

    │  Agent Registry   │# Custom output location

    └─────────┬─────────┘

              │### Example 4: CI/CD Integration

    ┌─────────┴──────────┬──────────────┬──────────────┐

    │                    │              │              │archdoc analyze --output ./docsexport ANTHROPIC_API_KEY="sk-ant-your-key" # Recommended

┌───▼────┐ ┌──────▼──────┐ ┌────▼─────┐ ┌────▼─────┐

│ File │ │ Dependency │ │ Pattern │ │ Security │```````yaml

│Structure│ │ Analyzer │ │ Detector │ │ Analyzer │

└────────┘ └─────────────┘ └──────────┘ └──────────┘# GitHub Actions example

````

name: Generate Architecture Docs

### LangChain LCEL Integration

on:# Quick analysis (faster, less detailed)# or## 🚀 Installation

All agents use LangChain Expression Language (LCEL) for composable AI workflows:

  push:

```typescript

const chain = RunnableSequence.from([    branches: [main]archdoc analyze --depth quick

  RunnableLambda.from(async (input) => prepareContext(input))

    .withConfig({ runName: 'PrepareData' }),jobs:

  model.withConfig({ runName: 'Analysis' }),

  new StringOutputParser()  docs:```export OPENAI_API_KEY="sk-your-key"

]);

    runs-on: ubuntu-latest

// Execute with unified tracing

const result = await chain.invoke(input, runnableConfig);    steps:

````

      - uses: actions/checkout@v3

### Iterative Refinement

      - name: Install ArchDoc## 📚 Documentation# or### As a Global CLI Tool

Self-improving analysis with clarity scoring:

        run: npm install -g @archdoc/generator

1.  Initial analysis by agent

2.  Clarity evaluation (0-100) - name: Generate Docs

3.  Generate refinement questions

4.  Enhanced re-analysis env:

5.  Repeat until threshold met

          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}- **[User Guide](./USER_GUIDE.md)** - Complete CLI reference and examplesexport GOOGLE_API_KEY="your-key"

## 📊 Supported Languages

        run: archdoc analyze . --output ./docs --depth normal

The tool is **language-agnostic** and works with:

      - name: Deploy to GitHub Pages- **[Integration Guide](./INTEGRATION_GUIDE.md)** - Using in other projects and CI/CD

- TypeScript/JavaScript (excellent support)

- Python (excellent support) uses: peaceiris/actions-gh-pages@v3

- Java/Kotlin (good support)

- Go (good support) with:- **[Architecture](./ARCHITECTURE.md)** - Technical design and patterns``````bash

- C#/.NET (good support)

- Ruby (good support) github_token: ${{ secrets.GITHUB_TOKEN }}

- PHP (good support)

- Rust (experimental) publish_dir: ./docs- **[API Reference](./docs/API.md)** - Programmatic usage

- And more!

`````````

## 🛠️ Configuration

- **[Contributing](./CONTRIBUTING.md)** - Development guidenpm install -g @archdoc/generator

### CLI Options

## 🔧 Programmatic Usage

````````bash

archdoc analyze [path] [options]Use the library in your Node.js applications:



Options:## 🎨 What Gets Generated### Generate Documentation```

  --output <dir>              Output directory (default: .arch-docs)

  --prompt <text>             Focus analysis with natural language```````typescript

  --depth <level>             Analysis depth: quick|normal|deep (default: normal)

  --provider <name>           LLM provider: anthropic|openai|googleimport {

  --model <name>              Specific model to use

  --refinement                Enable iterative refinement (default: true)  DocumentationOrchestrator,

  --refinement-iterations <n> Max refinement iterations (default: 5)

  --refinement-threshold <n>  Clarity threshold % (default: 80)  AgentRegistry,The tool generates a multi-file documentation structure:

  --no-clean                  Don't clear output directory

  --verbose                   Show detailed progress  FileSystemScanner

````````

} from '@archdoc/generator';

### Environment Variables

| Variable | Description | Default |

|----------|-------------|---------|// Setup registry with agents``````bash### As a Project Dependency

| `ANTHROPIC_API_KEY` | Anthropic Claude API key | - |

| `OPENAI_API_KEY` | OpenAI GPT API key | - |const registry = new AgentRegistry();

| `GOOGLE_API_KEY` | Google Gemini API key | - |

| `DEFAULT_LLM_PROVIDER` | Default provider | `anthropic` |const scanner = new FileSystemScanner();docs/

| `DEFAULT_LLM_MODEL` | Default model | `claude-3-5-sonnet-20241022` |

| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing | `false` |const orchestrator = new DocumentationOrchestrator(registry, scanner);

| `LANGCHAIN_API_KEY` | LangSmith API key | - |

| `LANGCHAIN_PROJECT` | LangSmith project name | - |├── index.md # Table of contentscd /path/to/your/project

## 🔍 Use Cases// Generate documentation

### 1. Onboarding New Developersconst docs = await orchestrator.generateDocumentation('/path/to/project', {├── metadata.md # Generation metadata

Generate comprehensive docs to help new team members understand the codebase quickly. maxTokens: 100000,

`bash  parallel: true,├── file-structure.md           # Project structure and organizationarchdoc generate . --output ./docs`bash

archdoc analyze . --output ./onboarding-docs --depth deep

````````iterativeRefinement: {



### 2. Architecture Reviews    enabled: true,├── dependencies.md             # Dependency analysis



Create documentation for architecture review meetings.    maxIterations: 5,



```bash    clarityThreshold: 80├── patterns.md                 # Code patterns and practices```npm install @archdoc/generator

archdoc analyze --prompt "analyze architecture, patterns, and code quality"

```  }



### 3. Documentation Maintenance});├── flows.md                    # Data and control flows



Keep docs in sync with code using CI/CD automation.



### 4. Security Auditsconsole.log('Generated:', docs.summary);├── schemas.md                  # Data structures and interfaces```



Identify security vulnerabilities and areas needing improvement.```````



```bash├── architecture.md # High-level architecture

archdoc analyze --prompt "analyze security vulnerabilities and authentication"

```See **[API Reference](./docs/API.md)** for complete programmatic documentation.



### 5. Legacy Code Understanding└── recommendations.md # Improvement suggestionsThat's it! Your documentation is now available in `./docs/architecture.md`



Quickly understand undocumented legacy codebases.## 🏗️ Architecture Highlights



```bash```

archdoc analyze /path/to/legacy --depth deep --verbose

```### Multi-Agent System



## 📈 LangSmith Tracing### From Source



Enable full observability of AI workflows:```



```bash┌─────────────────────────────────────────────┐## 🤖 Available Agents

export LANGCHAIN_TRACING_V2=true

export LANGCHAIN_API_KEY=lsv2_pt_...│ Documentation Orchestrator │

export LANGCHAIN_PROJECT=my-project

│ (Coordinates agents, manages workflow) │## What It Generates

archdoc analyze . --verbose

```└─────────────────────────────────────────────┘



**Trace Hierarchy:**              │Each agent specializes in a specific analysis task:



```    ┌─────────┴─────────┐

DocumentationGeneration-Complete

├── ScanProjectStructure    │  Agent Registry   │```bash

├── CreateExecutionContext

├── ExecuteAgents    └─────────┬─────────┘

│   ├── Agent-file-structure (8.5s, 8.6K tokens)

│   ├── Agent-dependency-analyzer (7.2s, 7.1K tokens)              │| Agent | Purpose | Output |

│   ├── Agent-pattern-detector (10.1s, 11.1K tokens)

│   ├── Agent-flow-visualization (9.5s, 8.9K tokens)    ┌─────────┴──────────┬──────────────┬──────────────┐

│   ├── Agent-schema-generator (7.1s, 6.2K tokens)

│   ├── Agent-architecture-analyzer (9.2s, 9.5K tokens)    │                    │              │              │|-------|---------|--------|### 📋 Project Overviewgit clone https://github.com/ritech/architecture-doc-generator.git

│   └── Agent-security-analyzer (8.8s, 7.8K tokens)

└── AggregateResults┌───▼────┐ ┌──────▼──────┐ ┌────▼─────┐ ┌────▼─────┐

````````

│ File │ │ Dependency │ │ Pattern │ │ Flow │| **File Structure** | Project organization, entry points | Directory tree, key files |

## 🤝 Contributing

│Structure│ │ Analyzer │ │ Detector │ │ Viz │

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:

└────────┘ └─────────────┘ └──────────┘ └──────────┘| **Dependency Analyzer** | External deps, internal imports | Dependency graph, version info |- Project description and purposecd architecture-doc-generator

- Development setup

- Creating custom agents````

- Testing guidelines

- Code style and standards| **Pattern Detector** | Design patterns, conventions | Pattern usage, best practices |

- Pull request process

### LangChain LCEL Integration

## 📄 License

| **Flow Visualization** | Control & data flows | Flow diagrams, sequence charts |- Primary language and technology stacknpm install

Apache License 2.0 - see [LICENSE](./LICENSE) file for details.

All agents use LangChain Expression Language (LCEL) for composable AI workflows:

## 🙏 Acknowledgments

| **Schema Generator** | Data models, interfaces | Type definitions, schemas |

Built with:

`````typescript

- [LangChain](https://www.langchain.com/) - LLM orchestration framework

- [Anthropic Claude](https://www.anthropic.com/) - Primary LLMconst chain = RunnableSequence.from([| **Architecture Analyzer** | High-level design | Component diagrams, layers |- Key features and architecture stylenpm run build

- [TypeScript](https://www.typescriptlang.org/) - Language

- [Commander.js](https://github.com/tj/commander.js/) - CLI framework  RunnableLambda.from(async (input) => prepareContext(input))



## 📞 Support    .withConfig({ runName: 'PrepareData' }),



- 🐛 [Report Issues](https://github.com/ritech/architecture-doc-generator/issues)  model.withConfig({ runName: 'Analysis' }),

- 💬 [Discussions](https://github.com/ritech/architecture-doc-generator/discussions)

- 📖 [Documentation](./USER_GUIDE.md)  new StringOutputParser()## 💡 Usage Examples- Statistics (files, lines of code, languages used)```



## 🗺️ Roadmap]);



- [ ] Visual diagram generation (Mermaid, PlantUML)

- [ ] Diff-based incremental updates

- [ ] Custom agent plugin system// Execute with unified tracing

- [ ] Web UI for interactive exploration

- [ ] Integration with documentation platformsconst result = await chain.invoke(input, runnableConfig);### Example 1: Full Project Documentation

- [ ] Multi-repository analysis

- [ ] Cost optimization modes````

- [ ] VS Code extension

### Iterative Refinement

---

````bash### 🏗️ Architecture Documentation## ⚡ Quick Start

**Made with ❤️ by the Ritech Team**

Self-improving analysis with clarity scoring:

[📖 View Full Documentation](./USER_GUIDE.md)

# Generate complete documentation

1. Initial analysis by agent

2. Clarity evaluation (0-100)archdoc analyze /path/to/project --output ./docs --depth deep- Architectural style (microservices, layered, hexagonal, etc.)

3. Generate refinement questions

4. Enhanced re-analysis```

5. Repeat until threshold met

- System components and their responsibilities1. **Set up your API key** (choose one):

## 📊 Supported Languages

### Example 2: Focused Analysis

The tool is **language-agnostic** and works with:

- Layer organization and boundaries

- TypeScript/JavaScript (excellent support)

- Python (excellent support)```bash

- Java/Kotlin (good support)

- Go (good support)# Only analyze dependencies and patterns- Data flow and communication patterns```bash

- C#/.NET (good support)

- Ruby (good support)archdoc analyze --prompt "analyze dependencies and design patterns"

- PHP (good support)

- Rust (experimental)```# Anthropic Claude (recommended)

- And more!



## 🛠️ Configuration

### Example 3: Quick Scan### 📁 File Structure Analysisexport ANTHROPIC_API_KEY=your_api_key_here

### CLI Options



```bash

archdoc analyze [path] [options]```bash- Directory organization and purpose



Options:# Fast analysis for quick insights

  --output <dir>              Output directory (default: .arch-docs)

  --prompt <text>             Focus analysis with natural languagearchdoc analyze --depth quick --output ./quick-docs- Module structure and naming conventions# OpenAI

  --depth <level>             Analysis depth: quick|normal|deep (default: normal)

  --provider <name>           LLM provider: anthropic|openai|google```

  --model <name>              Specific model to use

  --refinement                Enable iterative refinement (default: true)- Key files and their rolesexport OPENAI_API_KEY=your_api_key_here

  --refinement-iterations <n> Max refinement iterations (default: 5)

  --refinement-threshold <n>  Clarity threshold % (default: 80)### Example 4: CI/CD Integration

  --no-clean                  Don't clear output directory

  --verbose                   Show detailed progress- Configuration and setup files

`````

````yaml

### Environment Variables

# GitHub Actions example# Google Gemini

| Variable | Description | Default |

|----------|-------------|---------|name: Generate Architecture Docs

| `ANTHROPIC_API_KEY` | Anthropic Claude API key | - |

| `OPENAI_API_KEY` | OpenAI GPT API key | - |on:### 📦 Dependency Analysisexport GOOGLE_API_KEY=your_api_key_here

| `GOOGLE_API_KEY` | Google Gemini API key | - |

| `DEFAULT_LLM_PROVIDER` | Default provider | `anthropic` |  push:

| `DEFAULT_LLM_MODEL` | Default model | `claude-3-5-sonnet-20241022` |

| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing | `false` |    branches: [main]- External package dependencies```

| `LANGCHAIN_API_KEY` | LangSmith API key | - |

| `LANGCHAIN_PROJECT` | LangSmith project name | - |jobs:



## 🔍 Use Cases  docs:- Internal module dependencies



### 1. Onboarding New Developers    runs-on: ubuntu-latest



Generate comprehensive docs to help new team members understand the codebase quickly.    steps:- Dependency graph and relationships2. **Generate documentation**:



```bash      - uses: actions/checkout@v3

archdoc analyze . --output ./onboarding-docs --depth deep

```      - name: Install ArchDoc- Version management and updates



### 2. Architecture Reviews        run: npm install -g @archdoc/generator



Create documentation for architecture review meetings.      - name: Generate Docs```bash



```bash        env:

archdoc analyze --prompt "analyze architecture, patterns, and code quality"

```          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}### 🎨 Pattern Detection# Using CLI



### 3. Documentation Maintenance        run: archdoc analyze . --output ./docs --depth normal



Keep docs in sync with code using CI/CD automation (see [Integration Guide](./docs/INTEGRATION_GUIDE.md)).      - name: Deploy to GitHub Pages- Design patterns (Singleton, Factory, Observer, etc.)archdoc generate ./my-project



### 4. Technical Debt Analysis        uses: peaceiris/actions-gh-pages@v3



Identify patterns and areas needing improvement.        with:- Architectural patterns (MVC, CQRS, Event Sourcing, etc.)



```bash          github_token: ${{ secrets.GITHUB_TOKEN }}

archdoc analyze --prompt "identify technical debt and improvement opportunities"

```          publish_dir: ./docs- Anti-patterns and code smells# Or with npx



### 5. Legacy Code Understanding```



Quickly understand undocumented legacy codebases.- Best practices and recommendationsnpx @archdoc/generator generate ./my-project



```bash## 🔧 Programmatic Usage

archdoc analyze /path/to/legacy --depth deep --verbose

````

## 📈 LangSmith TracingUse the library in your Node.js applications:

Enable full observability of AI workflows:### ✅ Code Quality Assessment

`bash`typescript

export LANGCHAIN_TRACING_V2=true

export LANGCHAIN*API_KEY=lsv2_pt*...import { - Maintainability metrics3. **View your documentation**:

export LANGCHAIN_PROJECT=my-project

DocumentationOrchestrator,

archdoc analyze . --verbose

```AgentRegistry,- Complexity analysis



**Trace Hierarchy:**  FileSystemScanner

```

DocumentationGeneration-Complete} from '@archdoc/generator';- Technical debt estimationDocumentation will be generated in `./docs/architecture/ARCHITECTURE.md` by default.

├── ScanProjectStructure

├── CreateExecutionContext

├── ExecuteAgents

│ ├── Agent-file-structure (8.5s, 8.6K tokens)// Setup registry with agents- Security considerations

│ ├── Agent-dependency-analyzer (7.2s, 7.1K tokens)

│ ├── Agent-pattern-detector (10.1s, 11.1K tokens)const registry = new AgentRegistry();

│ └── Agent-flow-visualization (9.5s, 8.9K tokens)

└── AggregateResultsconst scanner = new FileSystemScanner();- Test coverage insights## 📖 Usage

````

const orchestrator = new DocumentationOrchestrator(registry, scanner);

## 🤝 Contributing



We welcome contributions! See **[Contributing Guide](./docs/CONTRIBUTING.md)** for:

// Generate documentation

- Development setup

- Creating custom agentsconst docs = await orchestrator.generateDocumentation('/path/to/project', {## Usage### CLI Usage

- Testing guidelines

- Code style and standards  maxTokens: 100000,

- Pull request process

  parallel: true,

## 📄 License

  iterativeRefinement: {

MIT License - see [LICENSE](./LICENSE) file for details.

    enabled: true,### CLI```bash

## 🙏 Acknowledgments

    maxIterations: 5,

Built with:

- [LangChain](https://www.langchain.com/) - LLM orchestration framework    clarityThreshold: 80# Generate full architecture documentation

- [Anthropic Claude](https://www.anthropic.com/) - Primary LLM

- [TypeScript](https://www.typescriptlang.org/) - Language  },

- [Commander.js](https://github.com/tj/commander.js/) - CLI framework

  agentOptions: {#### Generate Full Documentationarchdoc generate <project-path> [options]

## 📞 Support

    runnableConfig: {

- 🐛 [Report Issues](https://github.com/ritech/architecture-doc-generator/issues)

- 💬 [Discussions](https://github.com/ritech/architecture-doc-generator/discussions)      runName: 'MyDocGeneration'```bash

- 📖 [Documentation](./docs/README.md)

    }

## 🗺️ Roadmap

  }archdoc generate ./my-project \# Analyze project structure without generating docs

- [ ] Visual diagram generation (Mermaid, PlantUML)

- [ ] Diff-based incremental updates});

- [ ] Custom agent plugin system

- [ ] Web UI for interactive exploration  --output ./docs \archdoc analyze <project-path>

- [ ] Integration with documentation platforms

- [ ] Multi-repository analysisconsole.log('Generated:', docs.summary);

- [ ] Cost optimization modes

- [ ] VS Code extension```  --provider anthropic \



---



**Made with ❤️ by the Ritech Team**See [API Reference](./docs/API.md) for complete programmatic documentation.  --format markdown \# Export to different formats



**[📖 View Full Documentation](./docs/README.md)**


## 🏗️ Architecture Highlights  --verbosearchdoc export <project-path> --format html --output ./docs/arch.html



### Multi-Agent System```



```# Use specific LLM provider

┌─────────────────────────────────────────────┐

│      Documentation Orchestrator             │#### Quick Analysis (No LLM)archdoc generate ./my-project --provider openai --model gpt-4-turbo

│  (Coordinates agents, manages workflow)     │

└─────────────────────────────────────────────┘```bash

              │

    ┌─────────┴─────────┐archdoc analyze ./my-project --verbose# Custom configuration

    │  Agent Registry   │

    └─────────┬─────────┘```archdoc generate ./my-project --config .archdoc.config.json

              │

    ┌─────────┴──────────┬──────────────┬──────────────┐

    │                    │              │              │

┌───▼────┐  ┌──────▼──────┐  ┌────▼─────┐  ┌────▼─────┐#### Export to Different Format# Enable specific agents only

│ File   │  │ Dependency  │  │ Pattern  │  │   Flow   │

│Structure│  │  Analyzer   │  │ Detector │  │   Viz    │```basharchdoc generate ./my-project --agents file-structure,dependencies

└────────┘  └─────────────┘  └──────────┘  └──────────┘

```archdoc export docs.json --format html --output index.html



### LangChain LCEL Integration```# Incremental update



All agents use LangChain Expression Language (LCEL) for composable AI workflows:archdoc generate ./my-project --incremental



```typescript### Programmatic API```

const chain = RunnableSequence.from([

  RunnableLambda.from(async (input) => prepareContext(input))

    .withConfig({ runName: 'PrepareData' }),

  model.withConfig({ runName: 'Analysis' }),```typescript#### CLI Options

  new StringOutputParser()

]);import {



// Execute with unified tracing  DocumentationOrchestrator,```

const result = await chain.invoke(input, runnableConfig);

```  FileSystemScanner,Options:



### Iterative Refinement  AgentRegistry,  -o, --output <path>           Output directory (default: ./docs/architecture)



Self-improving analysis with clarity scoring:  FileStructureAgent,  -f, --format <format>         Output format: markdown|json|html|confluence



1. Initial analysis by agent} from '@archdoc/generator';  -p, --provider <provider>     LLM provider: anthropic|openai|google

2. Clarity evaluation (0-100)

3. Generate refinement questions  -m, --model <model>           LLM model name

4. Enhanced re-analysis

5. Repeat until threshold met// Setup  -c, --config <path>           Config file path



## 📊 Supported Languagesconst scanner = new FileSystemScanner();  -a, --agents <agents>         Comma-separated list of agents to run



The tool is **language-agnostic** and works with:const registry = new AgentRegistry();  -i, --incremental             Incremental update mode



- TypeScript/JavaScript (excellent support)registry.register(new FileStructureAgent());  --no-cache                    Disable caching

- Python (excellent support)

- Java/Kotlin (good support)  --parallel                    Run agents in parallel

- Go (good support)

- C#/.NET (good support)const orchestrator = new DocumentationOrchestrator(registry, scanner);  --timeout <ms>                Agent timeout in milliseconds

- Ruby (good support)

- PHP (good support)  -v, --verbose                 Verbose output

- Rust (experimental)

- And more!// Generate  -h, --help                    Display help



## 🛠️ Configurationconst documentation = await orchestrator.generate('./my-project', {```



### CLI Options  maxTokens: 100000,



```bash  enableParallel: true,### Programmatic Usage

archdoc analyze [path] [options]

  projectConfig: {

Options:

  --output <dir>              Output directory (default: .arch-docs)    llmProvider: 'anthropic',```typescript

  --prompt <text>             Focus analysis with natural language

  --depth <level>             Analysis depth: quick|normal|deep (default: normal)    llmModel: 'claude-3-5-sonnet-20241022',import { ArchDocGenerator } from '@archdoc/generator';

  --provider <name>           LLM provider: anthropic|openai|google

  --model <name>              Specific model to use  },

  --refinement                Enable iterative refinement (default: true)

  --refinement-iterations <n> Max refinement iterations (default: 5)});// Initialize generator

  --refinement-threshold <n>  Clarity threshold % (default: 80)

  --no-clean                  Don't clear output directoryconst generator = new ArchDocGenerator({

  --verbose                   Show detailed progress

```console.log('Generated docs for:', documentation.projectName);  llm: {



### Environment Variables```    provider: 'anthropic',



| Variable | Description | Default |    model: 'claude-3-5-sonnet-20241022',

|----------|-------------|---------|

| `ANTHROPIC_API_KEY` | Anthropic Claude API key | - |## Configuration    temperature: 0.2,

| `OPENAI_API_KEY` | OpenAI GPT API key | - |

| `GOOGLE_API_KEY` | Google Gemini API key | - |  },

| `DEFAULT_LLM_PROVIDER` | Default provider | `anthropic` |

| `DEFAULT_LLM_MODEL` | Default model | `claude-3-5-sonnet-20241022` |Create `.archdoc.config.json` in your project:  output: {

| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing | `false` |

| `LANGCHAIN_API_KEY` | LangSmith API key | - |    format: 'markdown',

| `LANGCHAIN_PROJECT` | LangSmith project name | - |

```json    directory: './docs',

## 🔍 Use Cases

{  },

### 1. Onboarding New Developers

  "llm": {});

Generate comprehensive docs to help new team members understand the codebase quickly.

    "provider": "anthropic",

```bash

archdoc analyze . --output ./onboarding-docs --depth deep    "model": "claude-3-5-sonnet-20241022",// Generate documentation

````

    "temperature": 0.2,const result = await generator.generate('./my-project');

### 2. Architecture Reviews

    "maxTokens": 100000

Create documentation for architecture review meetings.

},console.log('Documentation generated:', result.outputPath);

```bash

archdoc analyze --prompt "analyze architecture, patterns, and code quality"  "scanner": {console.log('Token usage:', result.totalTokens);

```

    "maxFiles": 10000,console.log('Estimated cost:', result.estimatedCost);

### 3. Documentation Maintenance

    "respectGitignore": true,```

Keep docs in sync with code using CI/CD automation (see Integration Guide).

    "excludePatterns": [

### 4. Technical Debt Analysis

      "**/node_modules/**",#### With Streaming

Identify patterns and areas needing improvement.

      "**/dist/**",

````bash

archdoc analyze --prompt "identify technical debt and improvement opportunities"      "**/build/**"```typescript

````

    ]import { ArchDocGenerator } from '@archdoc/generator';

### 5. Legacy Code Understanding

},

Quickly understand undocumented legacy codebases.

"agents": {const generator = new ArchDocGenerator();

```bash

archdoc analyze /path/to/legacy --depth deep --verbose    "enabled": [

```

      "file-structure",await generator.generate('./my-project', {

## 📈 LangSmith Tracing

      "dependency-analysis",  streaming: true,

Enable full observability of AI workflows:

      "pattern-detection",  onProgress: (progress) => {

```bash

export LANGCHAIN_TRACING_V2=true      "code-quality"    console.log(`${progress.agent}: ${progress.percentage}%`);

export LANGCHAIN_API_KEY=lsv2_pt_...

export LANGCHAIN_PROJECT=my-project    ],  },



archdoc analyze . --verbose    "parallel": true  onAgentComplete: (result) => {

```

}, console.log(`✓ ${result.agentName} completed`);

**Trace Hierarchy:**

```````"output": {  },

DocumentationGeneration-Complete

├── ScanProjectStructure    "format": "markdown",});

├── CreateExecutionContext

├── ExecuteAgents    "directory": "./docs/architecture",```

│   ├── Agent-file-structure (8.5s, 8.6K tokens)

│   ├── Agent-dependency-analyzer (7.2s, 7.1K tokens)    "includeMetadata": true

│   ├── Agent-pattern-detector (10.1s, 11.1K tokens)

│   └── Agent-flow-visualization (9.5s, 8.9K tokens)  }#### Custom Workflow

└── AggregateResults

```}



See [LangSmith Tracing Guide](./docs/LANGSMITH_TRACE_HIERARCHY.md) for details.``````typescript



## 🤝 Contributingimport { DocumentationOrchestrator, FileStructureAgent, DependencyAnalysisAgent } from '@archdoc/generator';



We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:## Architecture



- Development setupconst orchestrator = new DocumentationOrchestrator();

- Creating custom agents

- Testing guidelinesThe system uses an **agentic architecture** where specialized AI agents analyze different aspects of your codebase:

- Code style and standards

- Pull request process// Register only specific agents



## 📄 License```orchestrator.registerAgent(new FileStructureAgent());



MIT License - see [LICENSE](./LICENSE) file for details.┌─────────────────────────────────────────────────────────────┐orchestrator.registerAgent(new DependencyAnalysisAgent());



## 🙏 Acknowledgments│                         CLI / API                            │



Built with:└──────────────────────────┬──────────────────────────────────┘const result = await orchestrator.execute({

- [LangChain](https://www.langchain.com/) - LLM orchestration framework

- [Anthropic Claude](https://www.anthropic.com/) - Primary LLM                           │  projectPath: './my-project',

- [TypeScript](https://www.typescriptlang.org/) - Language

- [Commander.js](https://github.com/tj/commander.js/) - CLI framework                           ▼  config: myConfig,



## 📞 Support┌─────────────────────────────────────────────────────────────┐});



- 🐛 [Report Issues](https://github.com/ritech/architecture-doc-generator/issues)│               Documentation Orchestrator                     │```

- 💬 [Discussions](https://github.com/ritech/architecture-doc-generator/discussions)

- 📖 [Documentation](./USER_GUIDE.md)│           (Coordinates agent execution)                      │



## 🗺️ Roadmap└──────┬────────────────┬────────────────┬────────────────────┘### VS Code Extension



- [ ] Visual diagram generation (Mermaid, PlantUML)       │                │                │

- [ ] Diff-based incremental updates

- [ ] Custom agent plugin system       ▼                ▼                ▼Install the VS Code extension from the marketplace:

- [ ] Web UI for interactive exploration

- [ ] Integration with documentation platforms┌──────────────┐  ┌──────────────┐  ┌──────────────┐

- [ ] Multi-repository analysis

- [ ] Cost optimization modes│   Scanner    │  │   Agents     │  │ LLM Service  │1. Open VS Code

- [ ] VS Code extension

│ (File System)│  │  (Registry)  │  │(Multi-Model) │2. Go to Extensions (Ctrl+Shift+X)

---

└──────────────┘  └──────┬───────┘  └──────┬───────┘3. Search for "ArchDoc Generator"

**Made with ❤️ by the Ritech Team**

                         │                 │4. Click Install

                         ▼                 ▼

               ┌──────────────────┐  ┌─────────────┐#### Extension Commands

               │ FileStructure    │  │ Anthropic   │

               │ Dependency       │  │ OpenAI      │- `ArchDoc: Generate Documentation` - Generate full documentation

               │ Pattern          │  │ Google      │- `ArchDoc: Analyze Project` - Quick analysis without generating docs

               │ Quality          │  └─────────────┘- `ArchDoc: Update Documentation` - Incremental update

               └──────────────────┘- `ArchDoc: View Documentation` - Open generated docs in editor

                         │

                         ▼## ⚙️ Configuration

               ┌──────────────────┐

               │   Formatters     │Create a `.archdoc.config.json` file in your project root:

               │ (MD / JSON / HTML)│

               └──────────────────┘```json

```{

  "llm": {

### Core Components    "provider": "anthropic",

    "model": "claude-3-5-sonnet-20241022",

- **File System Scanner** - Fast project scanning with language detection    "temperature": 0.2,

- **Agent Registry** - Manages specialized analysis agents    "maxTokens": 4096

- **LLM Service** - Unified interface for multiple AI providers  },

- **Orchestrator** - Coordinates workflow and aggregates results  "scan": {

- **Formatters** - Transform results into various output formats    "maxFileSize": 1048576,

    "excludePatterns": ["node_modules", "dist", "*.min.js"],

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.    "respectGitignore": true

  },

## Supported LLM Providers  "output": {

    "format": "markdown",

| Provider | Models | Best For |    "directory": "./docs/architecture",

|----------|--------|----------|    "includeTOC": true,

| **Anthropic Claude** | claude-3-5-sonnet, claude-3-opus | Deep reasoning, code analysis |    "includeDiagrams": true,

| **OpenAI** | gpt-4-turbo, gpt-4 | Balanced performance |    "splitFiles": false

| **Google Gemini** | gemini-1.5-pro, gemini-1.5-flash | Fast processing, cost efficiency |  },

  "agents": {

## Examples    "enabled": [

      "file-structure",

### NestJS Application      "dependency-analysis",

```bash      "pattern-detection",

archdoc generate ./my-nestjs-app \      "documentation-synthesis"

  --agents file-structure,dependency-analysis,pattern-detection    ],

```    "parallel": true

  },

### Python Django Project  "cache": {

```bash    "enabled": true,

archdoc generate ./my-django-app \    "ttl": 3600

  --provider openai \  }

  --model gpt-4-turbo}

```````

### React Frontend### Environment Variables

````bash

archdoc generate ./my-react-app \```bash

  --format json \# LLM Provider

  --output analysis.jsonARCHDOC_LLM_PROVIDER=anthropic

```ARCHDOC_LLM_MODEL=claude-3-5-sonnet-20241022

ARCHDOC_LLM_TEMPERATURE=0.2

### Monorepo

```bash# API Keys

archdoc generate ./monorepo \ANTHROPIC_API_KEY=your_key

  --config ./monorepo.archdoc.json \OPENAI_API_KEY=your_key

  --parallelGOOGLE_API_KEY=your_key

````

# LangSmith Tracing (optional)

## Extending the SystemLANGCHAIN_TRACING_V2=true

LANGCHAIN_API_KEY=your_key

### Create Custom AgentLANGCHAIN_PROJECT=my-project

````typescript# Cache

import { Agent, AgentContext, AgentResult } from '@archdoc/generator';ARCHDOC_CACHE_ENABLED=true

ARCHDOC_CACHE_DIR=.archdoc-cache

export class SecurityAgent implements Agent {

  getMetadata() {# Output

    return {ARCHDOC_OUTPUT_DIR=./docs/architecture

      name: 'security-audit',ARCHDOC_OUTPUT_FORMAT=markdown

      description: 'Security vulnerability analysis',

      version: '1.0.0',# Logging

    };ARCHDOC_LOG_LEVEL=info

  }```



  async execute(context: AgentContext): Promise<AgentResult> {## 🤖 Agents

    // Your analysis logic

    return {ArchDoc uses specialized AI agents for different analysis tasks:

      agentName: 'security-audit',

      status: 'success',### Core Agents

      data: { vulnerabilities: [] },

      confidence: 0.9,1. **File Structure Agent**

      tokenUsage: { totalTokens: 1000 },   - Analyzes directory organization

    };   - Identifies key directories and their purposes

  }   - Detects naming conventions

}   - **Priority**: CRITICAL



// Register and use2. **Dependency Analysis Agent**

registry.register(new SecurityAgent());   - Extracts and analyzes dependencies

```   - Identifies outdated packages

   - Detects security vulnerabilities

### Add LLM Provider   - Builds dependency graphs

   - **Priority**: HIGH

```typescript

import { ILLMProvider } from '@archdoc/generator';3. **Pattern Detection Agent**

   - Identifies design patterns

export class CustomLLMProvider implements ILLMProvider {   - Detects architectural patterns

  getChatModel(config: ModelConfig): BaseChatModel {   - Finds anti-patterns

    // Return your custom model   - **Priority**: MEDIUM

  }

  4. **Documentation Synthesis Agent**

  async countTokens(text: string): Promise<number> {   - Combines insights from all agents

    // Implement token counting   - Generates cohesive documentation

  }   - Creates diagrams and visualizations

}   - **Priority**: LOW (runs last)

````

5. **Code Quality Agent**

## Documentation - Analyzes code quality metrics

- Identifies technical debt

- **[User Guide](./USER_GUIDE.md)** - Complete usage guide with examples - Suggests improvements

- **[Architecture](./ARCHITECTURE.md)** - System design and internals - **Priority**: OPTIONAL

- **[Contributing](./CONTRIBUTING.md)** - Development guidelines

- **[API Reference](./dist/src/index.d.ts)** - TypeScript definitions### Agent Capabilities

## Use CasesEach agent has specific capabilities:

### Software Teams- **Parallel Execution**: Can run concurrently with other agents

- **Onboarding** - Help new developers understand codebase quickly- **Incremental Support**: Can update existing analysis

- **Code Reviews** - Automated architectural insights- **Language Support**: Languages the agent specializes in

- **Technical Debt** - Identify areas needing improvement- **Token Estimation**: Estimated token usage

- **Knowledge Transfer** - Preserve architectural decisions

## 🎨 Custom Agents

### Open Source Maintainers

- **Documentation** - Auto-generate comprehensive docsCreate your own agents to extend functionality:

- **Contributor Guides** - Help contributors understand structure

- **Architecture Decision Records** - Document design choices```typescript

import { Agent, AgentContext, AgentResult, AgentPriority } from '@archdoc/generator';

### Enterprise

- **Compliance** - Document system architecture for auditsexport class MyCustomAgent implements Agent {

- **Legacy Systems** - Understand undocumented code name = 'my-custom-agent';

- **Migration Planning** - Analyze before refactoring description = 'Analyzes specific project aspects';

- **Portfolio Management** - Track architecture across projects priority = AgentPriority.MEDIUM;

## Performance capabilities = {

    supportsParallel: true,

- **Fast Scanning** - Analyzes thousands of files in seconds requiresFileContents: true,

- **Token Efficient** - Intelligent context management dependencies: ['file-structure'],

- **Parallel Execution** - Run independent agents concurrently supportsIncremental: true,

- **Caching** - Avoid redundant LLM calls estimatedTokens: 5000,

  supportedLanguages: ['typescript', 'javascript'],

**Typical Performance:** };

- Small project (< 100 files): ~30 seconds

- Medium project (100-1000 files): ~2-5 minutes async execute(context: AgentContext): Promise<AgentResult> {

- Large project (1000+ files): ~5-15 minutes const { files, fileContents, projectMetadata } = context;

_Times vary based on LLM provider and enabled agents._ // Your custom analysis logic here

    const analysis = await this.analyzeProject(files, fileContents);

## Comparison with Traditional Tools

    return {

| Feature | Traditional Tools | Architecture Doc Generator | agentName: this.name,

|---------|------------------|---------------------------| status: 'success',

| **Language Support** | Per-language parsers | Any language | data: analysis,

| **Setup** | Complex configuration | Zero config | summary: 'Analysis completed successfully',

| **Understanding** | Syntax-based | Semantic (AI) | markdown: this.generateMarkdown(analysis),

| **Documentation** | Templates | Natural language | confidence: 0.9,

| **Patterns** | Rule-based | Intelligent detection | tokenUsage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },

| **Maintenance** | Parser updates | Self-adapting | executionTime: 2000,

      errors: [],

## Roadmap warnings: [],

      metadata: {},

### Current (v0.1.0) };

- ✅ File system scanning }

- ✅ File structure analysis agent

- ✅ Multi-LLM support (Claude, GPT-4, Gemini) private async analyzeProject(files: string[], contents: Map<string, string>) {

- ✅ Markdown output // Implementation

- ✅ CLI interface }

- ✅ Programmatic API

  private generateMarkdown(analysis: any): string {

### Coming Soon (v0.2.0) // Generate markdown documentation

- 🔜 Dependency analysis agent }

- 🔜 Pattern detection agent}

- 🔜 Code quality agent

- 🔜 JSON & HTML output// Register your agent

- 🔜 Incremental updatesimport { DocumentationOrchestrator } from '@archdoc/generator';

- 🔜 VS Code extension

const orchestrator = new DocumentationOrchestrator();

### Futureorchestrator.registerAgent(new MyCustomAgent());

- 📅 Real-time watch mode```

- 📅 Web-based UI

- 📅 GitHub Action## 📄 Output Formats

- 📅 Multi-repository support

- 📅 Interactive diagrams### Markdown

- 📅 Custom templates

```bash

## Requirementsarchdoc generate ./project --format markdown

```

- **Node.js** 18 or higher

- **Memory** 2GB+ recommended for large projectsGenerates structured Markdown with:

- **API Key** for one of: Anthropic, OpenAI, or Google- Table of contents

- Mermaid diagrams

## License- Code snippets

- Cross-references

MIT License - see [LICENSE](./LICENSE) file for details.

### JSON

## Contributing

````bash

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for:archdoc generate ./project --format json

- Development setup```

- Code standards

- Testing guidelinesStructured JSON output for programmatic consumption:

- Pull request process

```json

## Support{

  "projectName": "my-project",

- **Issues**: [GitHub Issues](https://github.com/your-org/architecture-doc-generator/issues)  "timestamp": "2024-10-26T10:30:00Z",

- **Discussions**: [GitHub Discussions](https://github.com/your-org/architecture-doc-generator/discussions)  "overview": { ... },

- **Documentation**: See `USER_GUIDE.md` and `ARCHITECTURE.md`  "architecture": { ... },

  "dependencies": { ... }

## Acknowledgments}

````

Built with:

- [LangChain](https://langchain.com) - LLM orchestration### HTML

- [Anthropic](https://anthropic.com) - Claude AI models

- [OpenAI](https://openai.com) - GPT models```bash

- [Google AI](https://ai.google.dev) - Gemini modelsarchdoc generate ./project --format html

- [Commander.js](https://github.com/tj/commander.js) - CLI framework```

- [fast-glob](https://github.com/mrmlnc/fast-glob) - File scanning

Interactive HTML with:

## Citation- Collapsible sections

- Syntax highlighting

If you use this tool in your research or project, please cite:- Search functionality

- Printable layout

````bibtex

@software{architecture_doc_generator,### Confluence

  title = {Architecture Documentation Generator},

  author = {Your Team},```bash

  year = {2025},archdoc generate ./project --format confluence

  url = {https://github.com/your-org/architecture-doc-generator}```

}

```Confluence-compatible markup ready to paste into your wiki.



---## 📚 Examples



**Made with ❤️ for developers who value great documentation**See the `examples/` directory for complete examples:



[Get Started](./USER_GUIDE.md) • [Architecture](./ARCHITECTURE.md) • [Examples](./examples) • [API Docs](./dist/src/index.d.ts)- [Basic Usage](examples/basic-usage.ts) - Simple documentation generation

- [Custom Agent](examples/custom-agent.ts) - Creating and using custom agents
- [Custom Workflow](examples/custom-workflow.ts) - Building custom workflows
- [Incremental Docs](examples/incremental-docs.ts) - Incremental documentation updates
- [Multi-Format](examples/multi-format-output.ts) - Generating multiple output formats

## 🔍 LangSmith Tracing & Observability

ArchDoc Generator uses **LangChain LCEL (LangChain Expression Language)** with unified LangSmith tracing for complete workflow observability.

### Enable Tracing

```bash
export LANGCHAIN_TRACING_V2="true"
export LANGCHAIN_API_KEY="lsv2_pt_your_key_here"
export LANGCHAIN_PROJECT="your-project-name"

archdoc analyze ./project --verbose
````

### What You Get

- ✅ **Single unified trace** showing entire documentation generation workflow
- ✅ **Nested agent execution** - see each agent's performance
- ✅ **Token usage tracking** - monitor costs per agent
- ✅ **Iterative refinement visibility** - track clarity improvements
- ✅ **Error debugging** - pinpoint failures with full context

### Trace Hierarchy

```
DocumentationGeneration-Complete (Root Trace)
├── ScanProjectStructure
├── CreateExecutionContext
├── ExecuteAgents
│   ├── Agent-file-structure (8.5s, 8.6K tokens)
│   ├── Agent-dependency-analyzer (7.2s, 7.1K tokens)
│   ├── Agent-pattern-detector (10.1s, 11.1K tokens)
│   ├── Agent-flow-visualization (9.5s, 8.9K tokens)
│   └── Agent-schema-generator (7.5s, 3.6K tokens)
└── AggregateResults
```

### Documentation

- [UNIFIED_LANGSMITH_TRACING.md](UNIFIED_LANGSMITH_TRACING.md) - Implementation details
- [LANGSMITH_TRACE_HIERARCHY.md](docs/LANGSMITH_TRACE_HIERARCHY.md) - Visual trace diagrams
- [LANGSMITH_QUICK_REFERENCE.md](docs/LANGSMITH_QUICK_REFERENCE.md) - Quick reference guide

### Benefits

**For Debugging:**

- Identify slow agents instantly
- Track token usage per operation
- See refinement iteration improvements

**For Cost Management:**

- Monitor API costs in real-time
- Optimize expensive agents
- Budget token usage per agent

**For Performance:**

- Find bottlenecks in workflow
- Compare agent execution times
- Optimize parallel execution opportunities

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run integration tests
npm run test:integration

# Watch mode
npm run test:watch
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
git clone https://github.com/ritech/architecture-doc-generator.git
cd architecture-doc-generator
npm install
npm run build
```

### Running Locally

```bash
npm run cli:dev -- generate ./test-project
```

## 📄 License

MIT © Ritech Team

## 🙏 Acknowledgments

- Built with [LangChain](https://js.langchain.com/)
- Powered by [Anthropic Claude](https://www.anthropic.com/), [OpenAI GPT](https://openai.com/), and [Google Gemini](https://deepmind.google/technologies/gemini/)
- Inspired by the tech-debt-api project patterns

## 🔗 Links

- [Documentation](https://archdoc.dev)
- [GitHub Repository](https://github.com/ritech/architecture-doc-generator)
- [npm Package](https://www.npmjs.com/package/@archdoc/generator)
- [Issue Tracker](https://github.com/ritech/architecture-doc-generator/issues)
- [Changelog](CHANGELOG.md)

---

**Made with ❤️ by the Ritech Team**
