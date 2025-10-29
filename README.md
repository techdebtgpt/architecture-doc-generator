# Architecture Documentation Generator# Architecture Documentation Generator# Architecture Documentation Generator# 🏗️ ArchDoc Generator

> AI-powered architecture documentation generator for any codebase using LangChain and multi-agent workflows

[![npm version](https://img.shields.io/npm/v/@archdoc/generator.svg)](https://www.npmjs.com/package/@archdoc/generator)> AI-powered architecture documentation generator for any codebase using LangChain and multi-agent workflows

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

[![npm version](https://img.shields.io/npm/v/@archdoc/generator.svg)](https://www.npmjs.com/package/@archdoc/generator)> AI-powered automatic documentation generation for any codebase, in any language.> Language-agnostic AI-powered architecture documentation generator using LangChain and agentic workflows

## 🎯 Overview

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Architecture Documentation Generator is an intelligent tool that analyzes your codebase and generates comprehensive, accurate architectural documentation automatically. It supports **any programming language** and uses AI-powered agents to understand your project structure, dependencies, patterns, and data flows.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

### Key Features

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

- 🤖 **Multi-Agent Architecture** - Specialized agents for different analysis tasks

- 🌍 **Language Agnostic** - Works with TypeScript, Python, Java, Go, and more[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)[![npm version](https://badge.fury.io/js/%40archdoc%2Fgenerator.svg)](https://www.npmjs.com/package/@archdoc/generator)

- 🧠 **AI-Powered** - Uses LangChain with Claude, GPT-4, or Gemini

- 📊 **Comprehensive Analysis** - Structure, dependencies, patterns, flows, schemas## 🎯 Overview

- 📝 **Markdown Output** - Clean, version-controllable documentation

- 🔄 **Iterative Refinement** - Self-improving analysis with quality checks[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

- 🎨 **Customizable** - Prompt-based agent selection and configuration

- 📈 **LangSmith Tracing** - Full observability of AI workflowsArchitecture Documentation Generator is an intelligent tool that analyzes your codebase and generates comprehensive, accurate architectural documentation automatically. It supports **any programming language** and uses AI-powered agents to understand your project structure, dependencies, patterns, and data flows.

## 🚀 Quick Start[![Node](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

### Installation### Key Features

```bash

# Using npm

npm install -g @archdoc/generator- 🤖 **Multi-Agent Architecture** - Specialized agents for different analysis tasks



# Using yarn- 🌍 **Language Agnostic** - Works with TypeScript, Python, Java, Go, and more## Overview## 🌟 Features

yarn global add @archdoc/generator

- 🧠 **AI-Powered** - Uses LangChain with Claude, GPT-4, or Gemini

# Using pnpm

pnpm add -g @archdoc/generator- 📊 **Comprehensive Analysis** - Structure, dependencies, patterns, flows, schemas

```

- 📝 **Markdown Output** - Clean, version-controllable documentation

### Interactive Setup (Recommended)

Run the interactive configuration wizard:

```bash
archdoc config --init
```

This will:

1. Prompt you to choose an LLM provider (Anthropic/OpenAI/Google)
2. Ask for your API key
3. Create `.arch-docs/.archdoc.config.json` with your configuration
4. Validate your setup

### Manual Setup (Alternative)

Copy the example config and edit it:

```bash
cp .archdoc.config.example.json .arch-docs/.archdoc.config.json
# Edit .arch-docs/.archdoc.config.json and add your API key
```

### Basic Usage

```````bash- **🌍 Language Agnostic** - Works with TypeScript, JavaScript, Python, Java, Go, Rust, C++, and more- **⚡ Intelligent Caching**: Reduces API costs with smart caching

```bash

# Analyze current directory# Using npm

archdoc analyze

npm install -g @archdoc/generator- **🤖 AI-Powered** - Leverages Claude 3.5, GPT-4, or Gemini for intelligent analysis- **🔄 Incremental Updates**: Update docs without full regeneration

# Analyze specific project

archdoc analyze /path/to/your/project



# Focused analysis with prompt# Using yarn- **🎯 Zero Configuration** - No language-specific parsers or AST setup required- **🎨 Customizable Workflows**: Create your own agents and workflows

archdoc analyze --prompt "analyze dependencies and patterns"

yarn global add @archdoc/generator

# Custom output location

archdoc analyze --output ./docs- **📊 Comprehensive Analysis** - Structure, dependencies, patterns, quality, and technical debt- **📦 Multiple Interfaces**: CLI, npm package, VS Code extension



# Quick analysis (faster, less detailed)# Using pnpm

archdoc analyze --depth quick

```pnpm add -g @archdoc/generator- **🔌 Extensible** - Add custom agents for specialized analysis



## 📚 Documentation```



- **[📖 User Guide](./docs/USER_GUIDE.md)** - Complete CLI reference, configuration, and examples- **⚡ Multiple Interfaces** - CLI tool, programmatic API, or VS Code extension (coming soon)## 📋 Table of Contents

- **[🔌 Integration Guide](./docs/INTEGRATION_GUIDE.md)** - CI/CD integration and programmatic usage

- **[🏗️ Architecture](./docs/ARCHITECTURE.md)** - Technical design and system architecture### Environment Setup

- **[📚 API Reference](./docs/API.md)** - Programmatic API documentation

- **[🤝 Contributing](./docs/CONTRIBUTING.md)** - Development setup and contribution guidelines- **📝 Multiple Formats** - Output as Markdown, JSON, or HTML



## 🎨 What Gets GeneratedCreate a `.env` file with your API keys:



The tool generates a multi-file documentation structure:- [Installation](#installation)



``````env

docs/

├── index.md                    # Table of contents# Required: Choose one LLM provider## Quick Start- [Quick Start](#quick-start)

├── metadata.md                 # Generation metadata

├── file-structure.md           # Project structure and organizationANTHROPIC_API_KEY=sk-ant-...        # Recommended: Claude 3.5

├── dependencies.md             # Dependency analysis

├── patterns.md                 # Code patterns and practicesOPENAI_API_KEY=sk-...               # Alternative: GPT-4- [Usage](#usage)

├── flows.md                    # Data and control flows

├── schemas.md                  # Data structures and interfacesGOOGLE_API_KEY=...                  # Alternative: Gemini

├── architecture.md             # High-level architecture

└── recommendations.md          # Improvement suggestions### Installation  - [CLI Usage](#cli-usage)

```````

# Optional: LangSmith tracing

## 🤖 Available Agents

LANGCHAIN_TRACING_V2=true - [Programmatic Usage](#programmatic-usage)

Each agent specializes in a specific analysis task:

LANGCHAIN*API_KEY=lsv2_pt*...

| Agent | Purpose | Output |

|-------|---------|--------|LANGCHAIN_PROJECT=my-project```bash - [VS Code Extension](#vs-code-extension)

| **File Structure** | Project organization, entry points | Directory tree, key files |

| **Dependency Analyzer** | External deps, internal imports | Dependency graph, version info |```

| **Pattern Detector** | Design patterns, conventions | Pattern usage, best practices |

| **Flow Visualization** | Control & data flows | Flow diagrams, sequence charts |npm install -g @archdoc/generator- [Configuration](#configuration)

| **Schema Generator** | Data models, interfaces | Type definitions, schemas |

| **Architecture Analyzer** | High-level design | Component diagrams, layers |### Basic Usage

## 💡 Usage Examples```- [Agents](#agents)

### Example 1: Full Project Documentation```bash

```bash# Analyze current directory- [Custom Agents](#custom-agents)

# Generate complete documentation

archdoc analyze /path/to/project --output ./docs --depth deeparchdoc analyze

```

### Set API Key- [Output Formats](#output-formats)

### Example 2: Focused Analysis

# Analyze specific project

```bash

# Only analyze dependencies and patternsarchdoc analyze /path/to/your/project- [Examples](#examples)

archdoc analyze --prompt "analyze dependencies and design patterns"

```

### Example 3: Quick Scan# Focused analysis with prompt```bash- [Contributing](#contributing)

```basharchdoc analyze --prompt "analyze dependencies and patterns"

# Fast analysis for quick insights

archdoc analyze --depth quick --output ./quick-docs# Choose your preferred LLM provider- [License](#license)

```

# Custom output location

### Example 4: CI/CD Integration

archdoc analyze --output ./docsexport ANTHROPIC_API_KEY="sk-ant-your-key" # Recommended

```````yaml

# GitHub Actions example

name: Generate Architecture Docs

on:# Quick analysis (faster, less detailed)# or## 🚀 Installation

  push:

    branches: [main]archdoc analyze --depth quick

jobs:

  docs:```export OPENAI_API_KEY="sk-your-key"

    runs-on: ubuntu-latest

    steps:

      - uses: actions/checkout@v3

      - name: Install ArchDoc## 📚 Documentation# or### As a Global CLI Tool

        run: npm install -g @archdoc/generator

      - name: Generate Docs

        env:

          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}- **[User Guide](./USER_GUIDE.md)** - Complete CLI reference and examplesexport GOOGLE_API_KEY="your-key"

        run: archdoc analyze . --output ./docs --depth normal

      - name: Deploy to GitHub Pages- **[Integration Guide](./INTEGRATION_GUIDE.md)** - Using in other projects and CI/CD

        uses: peaceiris/actions-gh-pages@v3

        with:- **[Architecture](./ARCHITECTURE.md)** - Technical design and patterns``````bash

          github_token: ${{ secrets.GITHUB_TOKEN }}

          publish_dir: ./docs- **[API Reference](./docs/API.md)** - Programmatic usage

```````

- **[Contributing](./CONTRIBUTING.md)** - Development guidenpm install -g @archdoc/generator

## 🔧 Programmatic Usage

Use the library in your Node.js applications:

## 🎨 What Gets Generated### Generate Documentation```

```````typescript

import {

  DocumentationOrchestrator,

  AgentRegistry,The tool generates a multi-file documentation structure:

  FileSystemScanner

} from '@archdoc/generator';



// Setup registry with agents``````bash### As a Project Dependency

const registry = new AgentRegistry();

const scanner = new FileSystemScanner();docs/

const orchestrator = new DocumentationOrchestrator(registry, scanner);

├── index.md                    # Table of contentscd /path/to/your/project

// Generate documentation

const docs = await orchestrator.generateDocumentation('/path/to/project', {├── metadata.md                 # Generation metadata

  maxTokens: 100000,

  parallel: true,├── file-structure.md           # Project structure and organizationarchdoc generate . --output ./docs```bash

  iterativeRefinement: {

    enabled: true,├── dependencies.md             # Dependency analysis

    maxIterations: 5,

    clarityThreshold: 80├── patterns.md                 # Code patterns and practices```npm install @archdoc/generator

  }

});├── flows.md                    # Data and control flows



console.log('Generated:', docs.summary);├── schemas.md                  # Data structures and interfaces```

```````

├── architecture.md # High-level architecture

See **[API Reference](./docs/API.md)** for complete programmatic documentation.

└── recommendations.md # Improvement suggestionsThat's it! Your documentation is now available in `./docs/architecture.md`

## 🏗️ Architecture Highlights

```

### Multi-Agent System

### From Source

```

┌─────────────────────────────────────────────┐## 🤖 Available Agents

│ Documentation Orchestrator │

│ (Coordinates agents, manages workflow) │## What It Generates

└─────────────────────────────────────────────┘

              │Each agent specializes in a specific analysis task:

    ┌─────────┴─────────┐

    │  Agent Registry   │```bash

    └─────────┬─────────┘

              │| Agent | Purpose | Output |

    ┌─────────┴──────────┬──────────────┬──────────────┐

    │                    │              │              │|-------|---------|--------|### 📋 Project Overviewgit clone https://github.com/ritech/architecture-doc-generator.git

┌───▼────┐ ┌──────▼──────┐ ┌────▼─────┐ ┌────▼─────┐

│ File │ │ Dependency │ │ Pattern │ │ Flow │| **File Structure** | Project organization, entry points | Directory tree, key files |

│Structure│ │ Analyzer │ │ Detector │ │ Viz │

└────────┘ └─────────────┘ └──────────┘ └──────────┘| **Dependency Analyzer** | External deps, internal imports | Dependency graph, version info |- Project description and purposecd architecture-doc-generator

````

| **Pattern Detector** | Design patterns, conventions | Pattern usage, best practices |

### LangChain LCEL Integration

| **Flow Visualization** | Control & data flows | Flow diagrams, sequence charts |- Primary language and technology stacknpm install

All agents use LangChain Expression Language (LCEL) for composable AI workflows:

| **Schema Generator** | Data models, interfaces | Type definitions, schemas |

```typescript

const chain = RunnableSequence.from([| **Architecture Analyzer** | High-level design | Component diagrams, layers |- Key features and architecture stylenpm run build

  RunnableLambda.from(async (input) => prepareContext(input))

    .withConfig({ runName: 'PrepareData' }),

  model.withConfig({ runName: 'Analysis' }),

  new StringOutputParser()## 💡 Usage Examples- Statistics (files, lines of code, languages used)```

]);



// Execute with unified tracing

const result = await chain.invoke(input, runnableConfig);### Example 1: Full Project Documentation

````

### Iterative Refinement

````bash### 🏗️ Architecture Documentation## ⚡ Quick Start

Self-improving analysis with clarity scoring:

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

````

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
