# Architecture Documentation

This document provides a detailed overview of the technical architecture and design decisions behind the ArchDoc Generator.

## 📚 Table of Contents

- [**System Architecture**](#-system-architecture)
- [**Core Components**](#-core-components)
- [**Multi-Agent System**](#-multi-agent-system)
- [**Data Flow**](#-data-flow)
- [**Design Patterns**](#-design-patterns)
- [**Technology Stack**](#-technology-stack)

## 🏛️ System Architecture

The ArchDoc Generator is built on a modular, multi-agent architecture that leverages LangChain for AI-powered analysis. The system is designed to be language-agnostic and extensible, allowing for the easy addition of new agents and capabilities.

```
┌─────────────────────────────┐
│         CLI Interface         │
└─────────────┬─────────────┘
              │
┌─────────────────────────────┐
│  Documentation Orchestrator │
└──────┬────────────────┬─────┘
       │                │
┌──────────────┐  ┌──────────────┐
│   Scanner    │  │ Agent Registry │
└──────────────┘  └──────┬───────┘
                         │
┌──────────────────┐  ┌──────────────────┐
│  Agent Instances │  │    LLM Service   │
└──────────────────┘  └──────────────────┘
```

## 🧩 Core Components

### Base Orchestrator

The `BaseOrchestrator` is an abstract base class that provides common functionality for all orchestrators in the system. It includes:

- **Shared logging infrastructure**: Consistent logging across all orchestrator types
- **Project scanning logic**: Common file system scanning capabilities
- **Agent management**: Unified agent registration and discovery
- **Abstract execution interface**: Enforces a consistent contract for all orchestrator implementations

This design allows for easy extension with new orchestrator types (e.g., C4 model generation, Mermaid diagrams) while maintaining consistency.

### File System Scanner

The `FileSystemScanner` is responsible for discovering and cataloging files in the project. It includes:

- **File discovery**: Recursive directory scanning with pattern matching
- **Delta Analysis** (v0.3.37+): Automatic change detection using Git or file hashing
- **Language detection**: Automatic programming language identification
- **Language-specific exclusions**: Automatically excludes patterns based on detected languages (e.g., `node_modules/` for JS/TS, `vendor/` for PHP/Go, `target/` for Rust/Java)
- **Multi-level `.gitignore` support**: Recursively loads and respects `.gitignore` files from root and all subdirectories
- **Ignore pattern support**: Respects `.gitignore` patterns (as-is) and custom exclude patterns
- **Change status tracking**: Marks files as `new`, `modified`, `unchanged`, or `deleted`

**Delta Analysis Features:**

- **Git-based detection**: For Git repositories, uses Git commands to detect changed files
- **Hash-based detection**: For non-Git projects, uses file content hashing to detect changes
- **Automatic filtering**: Only changed/new files are passed to agents for analysis
- **Cost optimization**: Reduces token usage by 60-90% on incremental runs

**Ignore Pattern Handling:**

- **Language-specific patterns**: Automatically collected from language configuration (e.g., `node_modules`, `vendor`, `target`, `venv`)
- **Static patterns**: Use `**/` prefix for recursive matching at any depth
- **`.gitignore` patterns**: Used exactly as written (no automatic modification)
- **Subdirectory `.gitignore`**: Patterns from subdirectories are transformed to be root-relative while preserving their original format
- **Pattern priority**: `.gitignore` patterns take precedence, then language-specific, then static defaults

### Documentation Orchestrator

The `DocumentationOrchestrator` extends `BaseOrchestrator` and is the central coordinator for generating comprehensive documentation. It manages the entire workflow, from scanning the file system to executing agents and aggregating their results.

### C4 Model Orchestrator

The `C4ModelOrchestrator` extends `BaseOrchestrator` and specializes in generating C4 architecture models. It coordinates agents to produce Context, Container, and Component diagrams in both JSON and PlantUML formats.

### Agent Registry

The `AgentRegistry` is responsible for managing the lifecycle and discovery of all available agents. It allows for dynamic registration and capability-based selection of agents.

### File System Scanner

The `FileSystemScanner` efficiently scans the project directory, respects `.gitignore` rules from all directory levels, and gathers metadata about the codebase, such as language distribution and file structure.

**Ignore Pattern System:**

- **Language-specific exclusions**: Automatically includes exclude patterns from all detected languages (e.g., `node_modules/` for TypeScript/JavaScript, `vendor/` for PHP/Go, `target/` for Rust/Java/Scala, `venv/` for Python)
- **Multi-level `.gitignore` support**: Recursively finds and loads `.gitignore` files from root and all subdirectories
- **Pattern handling**: `.gitignore` patterns are used as-is; static patterns use `**/` prefix for recursive matching
- **Monorepo support**: Properly handles nested projects with their own `.gitignore` files

**Delta Analysis** (v0.3.37+):

- **Git-based detection**: For Git repositories, uses Git commands to detect changed files since the last commit or a specific commit/branch/tag
- **Hash-based detection**: For non-Git projects, uses file content hashing stored in `.arch-docs/cache/file-hashes.json` to detect changes
- **Change status tracking**: Marks files as `new`, `modified`, `unchanged`, or `deleted`
- **Automatic filtering**: Only changed/new files are passed to agents for analysis, reducing costs by 60-90% on incremental runs

### LLM Service

The `LLMService` provides a unified interface for interacting with multiple LLM providers, including Anthropic, OpenAI, XAI, and Google. It handles model selection, token counting, and other LLM-related tasks.

## 🤖 Multi-Agent System

The core of the generator is its multi-agent system, where specialized agents analyze different aspects of the codebase. Each agent implements a common `Agent` interface.

### Available Agents

- **File Structure Agent**: Analyzes the project's directory and file organization.
- **Dependency Analyzer Agent**: Examines external and internal dependencies.
- **Pattern Detector Agent**: Identifies design patterns and coding practices.
- **Flow Visualization Agent**: Maps data and control flows within the application.
- **Schema Generator Agent**: Extracts data models, interfaces, and type definitions.
- **Architecture Analyzer Agent**: Provides a high-level overview of the system's architecture.
- **Security Analyzer Agent**: Conducts a thorough security analysis, identifying potential vulnerabilities.

## 🌊 Data Flow

### JSON-First Architecture (v0.3.36+)

ArchDoc uses a **JSON-first internal format** where agents produce structured data as their primary output. Markdown is generated from this JSON by the `MarkdownRenderer` service.

```
┌──────────────┐
│    Agent     │
└──────┬───────┘
       │
       ├─► JSON Data (primary)
       │   └─► Saved to .arch-docs/cache/{agent}.json
       │
       └─► MarkdownRenderer (local, no LLM)
           └─► Markdown files in .arch-docs/
```

**Benefits**:

- **Separation of Concerns**: Data generation decoupled from presentation
- **Caching**: Structured data enables intelligent caching and delta analysis
- **Multi-Client Support**: JSON can be consumed by CLI, MCP, web UI, etc.
- **Cost Optimization**: Reuse cached JSON instead of re-running expensive LLM calls

### Execution Flow

1. **Scan**: The `FileSystemScanner` scans the project and creates an execution context.
2. **Delta Analysis** (v0.3.37+): Detects changed files using Git (or file hashing for non-Git projects).
3. **Cache Loading**: Loads cached JSON results from previous runs (`.arch-docs/cache/`).
4. **File Filtering**: Filters files to only analyze changed/new files (skips unchanged files).
5. **Execute**: The `DocumentationOrchestrator` selects and runs the appropriate agents in parallel.
6. **Analyze**: Each agent performs its analysis using the LLM service (only on changed files).
7. **Generate JSON**: Agent produces structured JSON data (primary output).
8. **Merge**: Cached results are merged with new analysis results.
9. **Cache**: JSON is saved to `.arch-docs/cache/{agent-name}.json` with metadata.
10. **Render**: `MarkdownRenderer` converts JSON to Markdown (local, no tokens).
11. **Aggregate**: The orchestrator aggregates results from all agents.
12. **Format**: The output is formatted into multiple Markdown files.

### Token Tracking & Cost Calculation

ArchDoc accurately tracks token usage including **Anthropic's prompt caching**:

- **Regular Input Tokens**: $3.00/M (Claude Sonnet 4.5)
- **Cached Input Tokens**: $0.30/M (10x cheaper!)
- **Cache Creation Tokens**: $3.75/M (1.25x regular)
- **Output Tokens**: $15.00/M

The orchestrator displays:

```
💵 Total cost: $0.4545
💰 Cache savings: $0.1234 (45,678 cached tokens)
```

## 🎨 Design Patterns

- **Template Method Pattern**: The `BaseOrchestrator` defines the workflow structure, while subclasses implement specific behavior. This allows for consistent orchestrator behavior while supporting different output types.
- **Registry Pattern**: Used by the `AgentRegistry` for dynamic agent management.
- **Strategy Pattern**: Each agent implements a different analysis strategy under a common interface.
- **Singleton Pattern**: The `LLMService` uses a singleton to provide a single, shared instance.
- **Builder Pattern**: Formatters use a builder-style approach to construct the final documentation.
- **Dependency Injection**: Orchestrators receive their dependencies (AgentRegistry, FileSystemScanner) via constructor injection, improving testability and flexibility.

## 💻 Technology Stack

- **LangChain**: The primary framework for LLM orchestration.
- **TypeScript**: The core programming language.
- **Commander.js**: Used for building the command-line interface.
- **Zod**: For schema validation and type safety.
- **Jest**: For unit and integration testing.
