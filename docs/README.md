# Documentation Index

> Complete documentation guide for Architecture Documentation Generator

## 📚 Documentation Overview

This directory contains comprehensive documentation for using, integrating, and contributing to the Architecture Documentation Generator.

## 🚀 Getting Started

### New Users

1. **[README.md](../README.md)** - Start here for quick overview and installation
2. **[USER_GUIDE.md](../USER_GUIDE.md)** - Complete guide to using the CLI
3. **[Quick Start Example](#quick-start-example)** - Get up and running in 5 minutes

### Developers

1. **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Understand the system design
2. **[API Reference](./API.md)** - Programmatic API documentation
3. **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Development setup and guidelines

### DevOps Engineers

1. **[INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md)** - CI/CD and automation
2. **[GitHub Actions Examples](../INTEGRATION_GUIDE.md#github-actions)**
3. **[NPM Scripts](../INTEGRATION_GUIDE.md#npm-scripts-integration)**

## 📖 Documentation Files

### Core Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| [README.md](../README.md) | Project overview, features, quick start | Everyone |
| [USER_GUIDE.md](./USER_GUIDE.md) | CLI reference, configuration, examples | End Users |
| [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md) | Complete configuration reference | End Users, DevOps |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical design, patterns, internals | Developers |
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | CI/CD, programmatic usage | DevOps, Developers |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Development setup, creating agents | Contributors |
| [API.md](./API.md) | Programmatic API reference | Developers |

### Additional Resources

| Resource | Description |
|----------|-------------|
| [LICENSE](../LICENSE) | MIT License |
| [.github/copilot-instructions.md](../.github/copilot-instructions.md) | AI assistant instructions |

## 🎯 Quick Start Example

### Installation

```bash
npm install -g @archdoc/generator
```

### Setup API Key

```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Generate Documentation

```bash
archdoc analyze ./my-project --output ./docs
```

### View Documentation

```bash
cat ./docs/index.md
```

## 📋 Documentation by Task

### I Want to...

#### ...use the CLI tool

→ **[USER_GUIDE.md](./USER_GUIDE.md)**

- CLI commands and options
- Configuration
- Best practices
- Troubleshooting

#### ...integrate into CI/CD

→ **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)**

- GitHub Actions examples
- GitLab CI setup
- Jenkins pipelines
- Pre-commit hooks

#### ...use the programmatic API

→ **[API Reference](./API.md)**

- Core API classes and methods
- Type definitions
- Code examples
- Advanced usage patterns

#### ...understand the architecture

→ **[ARCHITECTURE.md](./ARCHITECTURE.md)**

- System design
- Multi-agent architecture
- LangChain LCEL integration
- Data flow diagrams

#### ...contribute to the project

→ **[CONTRIBUTING.md](./CONTRIBUTING.md)**

- Development setup
- Creating custom agents
- Testing guidelines
- Pull request process

#### ...troubleshoot issues

→ **[USER_GUIDE.md - Troubleshooting](./USER_GUIDE.md#troubleshooting)**

- Common errors
- Solutions
- FAQ

## 🔍 Key Concepts

### Multi-Agent Architecture

The system uses specialized AI agents for different analysis tasks:

- **File Structure Agent** - Project organization
- **Dependency Analyzer** - Dependencies and imports
- **Pattern Detector** - Design patterns
- **Flow Visualization** - Data and control flows
- **Schema Generator** - Data models and types
- **Architecture Analyzer** - High-level architecture

See: [ARCHITECTURE.md - Multi-Agent System](./ARCHITECTURE.md#multi-agent-system)

### LangChain LCEL

All agents use LangChain Expression Language for composable AI workflows:

```typescript
const chain = RunnableSequence.from([
  RunnableLambda.from(async (input) => prepareData(input)),
  model.withConfig({ runName: 'Analysis' }),
  new StringOutputParser()
]);
```

See: [ARCHITECTURE.md - LangChain LCEL](./ARCHITECTURE.md#langchain-lcel-integration)

### Iterative Refinement

Self-improving analysis with clarity scoring:

1. Initial analysis
2. Evaluate clarity (0-100)
3. Generate refinement questions
4. Enhanced re-analysis
5. Repeat until threshold met

See: [ARCHITECTURE.md - Iterative Refinement](./ARCHITECTURE.md#iterative-refinement)

## 💡 Usage Examples

### Example 1: Generate Full Documentation

```bash
archdoc analyze /path/to/project --output ./docs --depth deep
```

### Example 2: Quick Analysis

```bash
archdoc analyze . --depth quick --no-refinement
```

### Example 3: Focused Analysis

```bash
archdoc analyze --prompt "analyze dependencies and design patterns"
```

### Example 4: CI/CD Integration

```yaml
# .github/workflows/docs.yml
- name: Generate Docs
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: archdoc analyze . --output ./docs
```

### Example 5: Programmatic Usage

```typescript
import { DocumentationOrchestrator } from '@archdoc/generator';

const orchestrator = new DocumentationOrchestrator(registry, scanner);
const output = await orchestrator.generateDocumentation('./project');
```

## 🛠️ Configuration

### Environment Variables

```bash
# LLM Provider (choose one)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...

# LangSmith Tracing (optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_...
LANGCHAIN_PROJECT=my-project
```

### Config File

Create `.archdoc.config.json`:

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.2
  },
  "output": {
    "directory": "./docs",
    "format": "markdown"
  }
}
```

See: [USER_GUIDE.md - Configuration](./USER_GUIDE.md#configuration)

## 🔗 External Resources

### LangChain

- [LangChain Documentation](https://js.langchain.com/docs/)
- [LangChain Expression Language](https://js.langchain.com/docs/expression_language/)
- [LangSmith](https://smith.langchain.com/)

### LLM Providers

- [Anthropic Claude](https://www.anthropic.com/)
- [OpenAI GPT](https://openai.com/)
- [Google Gemini](https://ai.google.dev/)

### TypeScript

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

## 📞 Support

### Getting Help

- 📖 Read the documentation
- 🐛 [Report issues](https://github.com/ritech/architecture-doc-generator/issues)
- 💬 [Ask questions](https://github.com/ritech/architecture-doc-generator/discussions)
- 📧 Email: support@ritech.com

### Community

- [GitHub Repository](https://github.com/ritech/architecture-doc-generator)
- [NPM Package](https://www.npmjs.com/package/@archdoc/generator)
- [Discussions](https://github.com/ritech/architecture-doc-generator/discussions)

## 🗺️ Documentation Roadmap

### Coming Soon

- [ ] Visual diagram generation guide
- [ ] Custom template creation guide
- [ ] Plugin system documentation
- [ ] Web UI documentation
- [ ] Performance tuning guide
- [ ] Cost optimization guide

### Requested Documentation

Have a documentation request? [Open an issue](https://github.com/ritech/architecture-doc-generator/issues/new?labels=documentation)!

## 📄 License

All documentation is licensed under MIT License. See [LICENSE](../LICENSE).

---

**Last Updated:** October 29, 2025

**Documentation Version:** 0.1.0

---

## Quick Links

- [🏠 Home](../README.md)
- [📖 User Guide](./USER_GUIDE.md)
- [🏗️ Architecture](./ARCHITECTURE.md)
- [🔌 Integration](./INTEGRATION_GUIDE.md)
- [🤝 Contributing](./CONTRIBUTING.md)
- [📚 API Reference](./API.md)
