# Architecture Documentation Generator# 🏗️ ArchDoc Generator



> AI-powered automatic documentation generation for any codebase, in any language.> Language-agnostic AI-powered architecture documentation generator using LangChain and agentic workflows



[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)[![npm version](https://badge.fury.io/js/%40archdoc%2Fgenerator.svg)](https://www.npmjs.com/package/@archdoc/generator)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[![Node](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)



## Overview## 🌟 Features



The **Architecture Documentation Generator** uses Large Language Models (LLMs) to automatically create comprehensive, human-readable documentation for software projects. Unlike traditional documentation tools that rely on parsing specific programming languages, this tool uses AI to understand your codebase semantically and generate intelligent insights.- **🤖 AI-Powered Analysis**: Uses advanced LLMs (Claude, GPT-4, Gemini) to understand your codebase

- **🌐 Language Agnostic**: Works with any programming language - no AST parsers needed

### Key Features- **🎯 Agentic Architecture**: Specialized agents for different analysis tasks

- **📊 Multiple Output Formats**: Markdown, JSON, HTML, Confluence

- **🌍 Language Agnostic** - Works with TypeScript, JavaScript, Python, Java, Go, Rust, C++, and more- **⚡ Intelligent Caching**: Reduces API costs with smart caching

- **🤖 AI-Powered** - Leverages Claude 3.5, GPT-4, or Gemini for intelligent analysis- **🔄 Incremental Updates**: Update docs without full regeneration

- **🎯 Zero Configuration** - No language-specific parsers or AST setup required- **🎨 Customizable Workflows**: Create your own agents and workflows

- **📊 Comprehensive Analysis** - Structure, dependencies, patterns, quality, and technical debt- **📦 Multiple Interfaces**: CLI, npm package, VS Code extension

- **🔌 Extensible** - Add custom agents for specialized analysis

- **⚡ Multiple Interfaces** - CLI tool, programmatic API, or VS Code extension (coming soon)## 📋 Table of Contents

- **📝 Multiple Formats** - Output as Markdown, JSON, or HTML

- [Installation](#installation)

## Quick Start- [Quick Start](#quick-start)

- [Usage](#usage)

### Installation  - [CLI Usage](#cli-usage)

  - [Programmatic Usage](#programmatic-usage)

```bash  - [VS Code Extension](#vs-code-extension)

npm install -g @archdoc/generator- [Configuration](#configuration)

```- [Agents](#agents)

- [Custom Agents](#custom-agents)

### Set API Key- [Output Formats](#output-formats)

- [Examples](#examples)

```bash- [Contributing](#contributing)

# Choose your preferred LLM provider- [License](#license)

export ANTHROPIC_API_KEY="sk-ant-your-key"   # Recommended

# or## 🚀 Installation

export OPENAI_API_KEY="sk-your-key"

# or### As a Global CLI Tool

export GOOGLE_API_KEY="your-key"

``````bash

npm install -g @archdoc/generator

### Generate Documentation```



```bash### As a Project Dependency

cd /path/to/your/project

archdoc generate . --output ./docs```bash

```npm install @archdoc/generator

```

That's it! Your documentation is now available in `./docs/architecture.md`

### From Source

## What It Generates

```bash

### 📋 Project Overviewgit clone https://github.com/ritech/architecture-doc-generator.git

- Project description and purposecd architecture-doc-generator

- Primary language and technology stacknpm install

- Key features and architecture stylenpm run build

- Statistics (files, lines of code, languages used)```



### 🏗️ Architecture Documentation## ⚡ Quick Start

- Architectural style (microservices, layered, hexagonal, etc.)

- System components and their responsibilities1. **Set up your API key** (choose one):

- Layer organization and boundaries

- Data flow and communication patterns```bash

# Anthropic Claude (recommended)

### 📁 File Structure Analysisexport ANTHROPIC_API_KEY=your_api_key_here

- Directory organization and purpose

- Module structure and naming conventions# OpenAI

- Key files and their rolesexport OPENAI_API_KEY=your_api_key_here

- Configuration and setup files

# Google Gemini

### 📦 Dependency Analysisexport GOOGLE_API_KEY=your_api_key_here

- External package dependencies```

- Internal module dependencies

- Dependency graph and relationships2. **Generate documentation**:

- Version management and updates

```bash

### 🎨 Pattern Detection# Using CLI

- Design patterns (Singleton, Factory, Observer, etc.)archdoc generate ./my-project

- Architectural patterns (MVC, CQRS, Event Sourcing, etc.)

- Anti-patterns and code smells# Or with npx

- Best practices and recommendationsnpx @archdoc/generator generate ./my-project

```

### ✅ Code Quality Assessment

- Maintainability metrics3. **View your documentation**:

- Complexity analysis

- Technical debt estimationDocumentation will be generated in `./docs/architecture/ARCHITECTURE.md` by default.

- Security considerations

- Test coverage insights## 📖 Usage



## Usage### CLI Usage



### CLI```bash

# Generate full architecture documentation

#### Generate Full Documentationarchdoc generate <project-path> [options]

```bash

archdoc generate ./my-project \# Analyze project structure without generating docs

  --output ./docs \archdoc analyze <project-path>

  --provider anthropic \

  --format markdown \# Export to different formats

  --verbosearchdoc export <project-path> --format html --output ./docs/arch.html

```

# Use specific LLM provider

#### Quick Analysis (No LLM)archdoc generate ./my-project --provider openai --model gpt-4-turbo

```bash

archdoc analyze ./my-project --verbose# Custom configuration

```archdoc generate ./my-project --config .archdoc.config.json



#### Export to Different Format# Enable specific agents only

```basharchdoc generate ./my-project --agents file-structure,dependencies

archdoc export docs.json --format html --output index.html

```# Incremental update

archdoc generate ./my-project --incremental

### Programmatic API```



```typescript#### CLI Options

import {

  DocumentationOrchestrator,```

  FileSystemScanner,Options:

  AgentRegistry,  -o, --output <path>           Output directory (default: ./docs/architecture)

  FileStructureAgent,  -f, --format <format>         Output format: markdown|json|html|confluence

} from '@archdoc/generator';  -p, --provider <provider>     LLM provider: anthropic|openai|google

  -m, --model <model>           LLM model name

// Setup  -c, --config <path>           Config file path

const scanner = new FileSystemScanner();  -a, --agents <agents>         Comma-separated list of agents to run

const registry = new AgentRegistry();  -i, --incremental             Incremental update mode

registry.register(new FileStructureAgent());  --no-cache                    Disable caching

  --parallel                    Run agents in parallel

const orchestrator = new DocumentationOrchestrator(registry, scanner);  --timeout <ms>                Agent timeout in milliseconds

  -v, --verbose                 Verbose output

// Generate  -h, --help                    Display help

const documentation = await orchestrator.generate('./my-project', {```

  maxTokens: 100000,

  enableParallel: true,### Programmatic Usage

  projectConfig: {

    llmProvider: 'anthropic',```typescript

    llmModel: 'claude-3-5-sonnet-20241022',import { ArchDocGenerator } from '@archdoc/generator';

  },

});// Initialize generator

const generator = new ArchDocGenerator({

console.log('Generated docs for:', documentation.projectName);  llm: {

```    provider: 'anthropic',

    model: 'claude-3-5-sonnet-20241022',

## Configuration    temperature: 0.2,

  },

Create `.archdoc.config.json` in your project:  output: {

    format: 'markdown',

```json    directory: './docs',

{  },

  "llm": {});

    "provider": "anthropic",

    "model": "claude-3-5-sonnet-20241022",// Generate documentation

    "temperature": 0.2,const result = await generator.generate('./my-project');

    "maxTokens": 100000

  },console.log('Documentation generated:', result.outputPath);

  "scanner": {console.log('Token usage:', result.totalTokens);

    "maxFiles": 10000,console.log('Estimated cost:', result.estimatedCost);

    "respectGitignore": true,```

    "excludePatterns": [

      "**/node_modules/**",#### With Streaming

      "**/dist/**",

      "**/build/**"```typescript

    ]import { ArchDocGenerator } from '@archdoc/generator';

  },

  "agents": {const generator = new ArchDocGenerator();

    "enabled": [

      "file-structure",await generator.generate('./my-project', {

      "dependency-analysis",  streaming: true,

      "pattern-detection",  onProgress: (progress) => {

      "code-quality"    console.log(`${progress.agent}: ${progress.percentage}%`);

    ],  },

    "parallel": true  onAgentComplete: (result) => {

  },    console.log(`✓ ${result.agentName} completed`);

  "output": {  },

    "format": "markdown",});

    "directory": "./docs/architecture",```

    "includeMetadata": true

  }#### Custom Workflow

}

``````typescript

import { DocumentationOrchestrator, FileStructureAgent, DependencyAnalysisAgent } from '@archdoc/generator';

## Architecture

const orchestrator = new DocumentationOrchestrator();

The system uses an **agentic architecture** where specialized AI agents analyze different aspects of your codebase:

// Register only specific agents

```orchestrator.registerAgent(new FileStructureAgent());

┌─────────────────────────────────────────────────────────────┐orchestrator.registerAgent(new DependencyAnalysisAgent());

│                         CLI / API                            │

└──────────────────────────┬──────────────────────────────────┘const result = await orchestrator.execute({

                           │  projectPath: './my-project',

                           ▼  config: myConfig,

┌─────────────────────────────────────────────────────────────┐});

│               Documentation Orchestrator                     │```

│           (Coordinates agent execution)                      │

└──────┬────────────────┬────────────────┬────────────────────┘### VS Code Extension

       │                │                │

       ▼                ▼                ▼Install the VS Code extension from the marketplace:

┌──────────────┐  ┌──────────────┐  ┌──────────────┐

│   Scanner    │  │   Agents     │  │ LLM Service  │1. Open VS Code

│ (File System)│  │  (Registry)  │  │(Multi-Model) │2. Go to Extensions (Ctrl+Shift+X)

└──────────────┘  └──────┬───────┘  └──────┬───────┘3. Search for "ArchDoc Generator"

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

``````



### React Frontend### Environment Variables

```bash

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

```

# LangSmith Tracing (optional)

## Extending the SystemLANGCHAIN_TRACING_V2=true

LANGCHAIN_API_KEY=your_key

### Create Custom AgentLANGCHAIN_PROJECT=my-project



```typescript# Cache

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

```

5. **Code Quality Agent**

## Documentation   - Analyzes code quality metrics

   - Identifies technical debt

- **[User Guide](./USER_GUIDE.md)** - Complete usage guide with examples   - Suggests improvements

- **[Architecture](./ARCHITECTURE.md)** - System design and internals   - **Priority**: OPTIONAL

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

- **Legacy Systems** - Understand undocumented code  name = 'my-custom-agent';

- **Migration Planning** - Analyze before refactoring  description = 'Analyzes specific project aspects';

- **Portfolio Management** - Track architecture across projects  priority = AgentPriority.MEDIUM;

  

## Performance  capabilities = {

    supportsParallel: true,

- **Fast Scanning** - Analyzes thousands of files in seconds    requiresFileContents: true,

- **Token Efficient** - Intelligent context management    dependencies: ['file-structure'],

- **Parallel Execution** - Run independent agents concurrently    supportsIncremental: true,

- **Caching** - Avoid redundant LLM calls    estimatedTokens: 5000,

    supportedLanguages: ['typescript', 'javascript'],

**Typical Performance:**  };

- Small project (< 100 files): ~30 seconds

- Medium project (100-1000 files): ~2-5 minutes  async execute(context: AgentContext): Promise<AgentResult> {

- Large project (1000+ files): ~5-15 minutes    const { files, fileContents, projectMetadata } = context;

    

*Times vary based on LLM provider and enabled agents.*    // Your custom analysis logic here

    const analysis = await this.analyzeProject(files, fileContents);

## Comparison with Traditional Tools    

    return {

| Feature | Traditional Tools | Architecture Doc Generator |      agentName: this.name,

|---------|------------------|---------------------------|      status: 'success',

| **Language Support** | Per-language parsers | Any language |      data: analysis,

| **Setup** | Complex configuration | Zero config |      summary: 'Analysis completed successfully',

| **Understanding** | Syntax-based | Semantic (AI) |      markdown: this.generateMarkdown(analysis),

| **Documentation** | Templates | Natural language |      confidence: 0.9,

| **Patterns** | Rule-based | Intelligent detection |      tokenUsage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },

| **Maintenance** | Parser updates | Self-adapting |      executionTime: 2000,

      errors: [],

## Roadmap      warnings: [],

      metadata: {},

### Current (v0.1.0)    };

- ✅ File system scanning  }

- ✅ File structure analysis agent  

- ✅ Multi-LLM support (Claude, GPT-4, Gemini)  private async analyzeProject(files: string[], contents: Map<string, string>) {

- ✅ Markdown output    // Implementation

- ✅ CLI interface  }

- ✅ Programmatic API  

  private generateMarkdown(analysis: any): string {

### Coming Soon (v0.2.0)    // Generate markdown documentation

- 🔜 Dependency analysis agent  }

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

```bash

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

```

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

```bibtex

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
```

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
