# API Reference

This document provides a detailed reference for the programmatic API of the ArchDoc Generator, allowing you to integrate it into your own applications and workflows.

## 📚 Table of Contents

- [**Installation**](#-installation)
- [**Quick Start**](#-quick-start)
- [**Core Classes**](#-core-classes)
  - [DocumentationOrchestrator](#documentationorchestrator)
  - [AgentRegistry](#agentregistry)
  - [FileSystemScanner](#filesystemscanner)
  - [LLMService](#llmservice)
- [**Interfaces and Types**](#-interfaces-and-types)
- [**Advanced Usage**](#-advanced-usage)

## 📦 Installation

To use the programmatic API, install the package as a dependency in your project.

```bash
npm install @archdoc/generator
```

## 🚀 Quick Start

Here’s a quick example of how to generate documentation programmatically.

```typescript
import { DocumentationOrchestrator, AgentRegistry, FileSystemScanner } from '@archdoc/generator';

async function generateDocs() {
  // Initialize the core components
  const scanner = new FileSystemScanner();
  const registry = new AgentRegistry();
  const orchestrator = new DocumentationOrchestrator(registry, scanner);

  // Generate the documentation
  const output = await orchestrator.generateDocumentation('./path/to/your/project');

  console.log('Documentation Summary:', output.summary);
}

generateDocs();
```

## Core Classes

### DocumentationOrchestrator

The `DocumentationOrchestrator` is the main class for coordinating the documentation generation process.

#### `generateDocumentation`

Generates documentation for a given project path.

```typescript
async generateDocumentation(
  projectPath: string,
  options?: OrchestratorOptions
): Promise<DocumentationOutput>
```

- **`projectPath`**: The absolute path to the project you want to analyze.
- **`options`**: An optional configuration object to customize the generation process.

### AgentRegistry

The `AgentRegistry` manages the registration and discovery of agents.

#### `register`

Registers a new agent.

```typescript
register(agent: Agent): void
```

### FileSystemScanner

The `FileSystemScanner` is responsible for scanning the project's file system.

#### `scan`

Scans a project directory and returns information about its structure.

```typescript
async scan(options: ScanOptions): Promise<ScanResult>
```

### LLMService

The `LLMService` is a singleton service for all LLM-related operations.

#### `getInstance`

Retrieves the singleton instance of the `LLMService`.

```typescript
static getInstance(): LLMService
```

#### `getChatModel`

Gets the configured chat model for the analysis.

```typescript
getChatModel(config?: ModelConfig): BaseChatModel
```

## 📋 Interfaces and Types

- **`OrchestratorOptions`**: Configuration options for the `DocumentationOrchestrator`.
- **`AgentContext`**: The context object passed to each agent during execution.
- **`AgentResult`**: The output returned by an agent after execution.
- **`DocumentationOutput`**: The final output of the documentation generation process.
- **`ScanOptions`**: Configuration options for the `FileSystemScanner`.
- **`ScanResult`**: The result of a file system scan.

For detailed type definitions, please refer to the source code.

## ✨ Advanced Usage

### Custom Agent

You can create your own custom agents by implementing the `Agent` interface.

```typescript
import { Agent, AgentContext, AgentResult, AgentMetadata } from '@archdoc/generator';

class MyCustomAgent implements Agent {
  getMetadata(): AgentMetadata {
    // Return metadata for your agent
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    // Implement your analysis logic here
  }
}

// Register your custom agent
const registry = new AgentRegistry();
registry.register(new MyCustomAgent());
```

### Custom Workflow

For more complex scenarios, you can create a custom workflow to control the entire process.

```typescript
import { DocumentationOrchestrator, AgentRegistry, FileSystemScanner } from '@archdoc/generator';

class CustomWorkflow {
  private orchestrator: DocumentationOrchestrator;

  constructor() {
    const scanner = new FileSystemScanner();
    const registry = new AgentRegistry();
    // Register specific agents for your workflow
    this.orchestrator = new DocumentationOrchestrator(registry, scanner);
  }

  async run(projectPath: string) {
    const output = await this.orchestrator.generateDocumentation(projectPath, {
      // Custom options
    });
    return output;
  }
}
```
