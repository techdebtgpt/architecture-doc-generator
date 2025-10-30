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

### Documentation Orchestrator

The `DocumentationOrchestrator` is the central coordinator of the system. It manages the entire workflow, from scanning the file system to executing agents and aggregating their results.

### Agent Registry

The `AgentRegistry` is responsible for managing the lifecycle and discovery of all available agents. It allows for dynamic registration and capability-based selection of agents.

### File System Scanner

The `FileSystemScanner` efficiently scans the project directory, respects `.gitignore` rules, and gathers metadata about the codebase, such as language distribution and file structure.

### LLM Service

The `LLMService` provides a unified interface for interacting with multiple LLM providers, including Anthropic, OpenAI, and Google. It handles model selection, token counting, and other LLM-related tasks.

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

1. **Scan**: The `FileSystemScanner` scans the project and creates an execution context.
2. **Execute**: The `DocumentationOrchestrator` selects and runs the appropriate agents in parallel.
3. **Analyze**: Each agent performs its analysis using the LLM service.
4. **Refine**: If enabled, the results are iteratively refined to improve clarity and accuracy.
5. **Aggregate**: The orchestrator aggregates the results from all agents into a final documentation output.
6. **Format**: The output is formatted into Markdown files.

## 🎨 Design Patterns

- **Registry Pattern**: Used by the `AgentRegistry` for dynamic agent management.
- **Strategy Pattern**: Each agent implements a different analysis strategy under a common interface.
- **Singleton Pattern**: The `LLMService` uses a singleton to provide a single, shared instance.
- **Builder Pattern**: Formatters use a builder-style approach to construct the final documentation.

## 💻 Technology Stack

- **LangChain**: The primary framework for LLM orchestration.
- **TypeScript**: The core programming language.
- **Commander.js**: Used for building the command-line interface.
- **Zod**: For schema validation and type safety.
- **Jest**: For unit and integration testing.
