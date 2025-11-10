# ArchDoc Generator Documentation

Welcome to the official documentation for the ArchDoc Generator. This documentation provides a comprehensive guide to help you understand, use, and contribute to the project.

## 📚 Table of Contents

### 📖 Getting Started

- [**Installation Guide**](./INSTALLATION.md): Step-by-step guide for installing and setting up ArchDoc in your project.
- [**User Guide**](./USER_GUIDE.md): Detailed instructions on how to use the CLI, including all commands, options, and configuration.
- [**Configuration Guide**](./CONFIGURATION_GUIDE.md): A complete reference for all configuration options available in `.archdoc.config.json` and environment variables.
- [**Quick Config Reference**](./QUICK_CONFIG_REFERENCE.md): A cheat sheet for quick access to the most common configuration settings.

### 🔍 Vector Search & Performance

- [**Vector Search Guide**](./VECTOR_SEARCH.md): ⭐ Complete guide to vector search with integrated recommendations. Covers RAG-based search, embeddings providers (local/OpenAI), retrieval strategies (Graph/Hybrid/Vector/Smart), and when to use each.
- [**🏆 Search Strategy Benchmark**](./SEARCH_STRATEGY_BENCHMARK.md): Comprehensive real-world benchmark of 6 configurations on tech-debt-api showing **Graph + Local as winner** (84.8%, 6.1min, $0.0841). Includes detailed per-agent analysis and why OpenAI underperformed.

### 🤖 MCP Server (Model Context Protocol)

- [**🔥 MCP Guide**](./MCP_GUIDE.md): ⭐ **Complete guide to using ArchDoc as an MCP server** with Claude Desktop or other MCP clients. Covers setup, configuration, 8 available tools, RAG vector search, troubleshooting, and advanced topics.

### 🔧 Integration & Development

- [**API Reference**](./API.md): Documentation for the programmatic API, allowing you to integrate ArchDoc Generator into your own applications.
- [**Architecture**](./ARCHITECTURE.md): An in-depth look at the technical design, patterns, and agent-based system of the generator.
- [**Agent Workflow**](./AGENT_WORKFLOW.md): Learn how agents use self-refinement workflows to iteratively improve analysis quality.
- [**Integration Guide**](./INTEGRATION_GUIDE.md): Instructions for integrating the ArchDoc Generator into CI/CD pipelines and other workflows.
- [**Custom Languages**](./CUSTOM_LANGUAGES.md): Add support for any programming language via configuration (no code changes needed).
- [**Contributing Guide**](./CONTRIBUTING.md): Guidelines for developers who want to contribute to the project, including setup, coding standards, and pull request processes.
- [**CI/CD**](./CI_CD.md): Information on the continuous integration and deployment setup for this project.

### 🚀 Roadmap & Future Plans

- [**📋 Product Roadmap**](./ROADMAP.md): Comprehensive roadmap with planned features, AI/LLM cost optimization research, and quarterly timeline for 2026.

## 🚀 Getting Started

If you are new to the project, we recommend starting with the [**User Guide**](./USER_GUIDE.md) to get a full overview of how to install and use the tool. For a quick start, check out the main [**README.md**](../README.md) file.

## 🔗 Resources

- **🌐 Website**: [techdebtgpt.com](https://techdebtgpt.com)
- **📦 GitHub**: [github.com/techdebtgpt/architecture-doc-generator](https://github.com/techdebtgpt/architecture-doc-generator)
- **💬 Community**: [GitHub Discussions](https://github.com/techdebtgpt/architecture-doc-generator/discussions)
- **🐛 Report Issues**: [GitHub Issues](https://github.com/techdebtgpt/architecture-doc-generator/issues)
