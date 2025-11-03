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

### BaseOrchestrator

The `BaseOrchestrator` is an abstract base class that provides common functionality for all orchestrators.

```typescript
abstract class BaseOrchestrator {
  constructor(
    protected readonly agentRegistry: AgentRegistry,
    protected readonly scanner: FileSystemScanner,
    loggerName: string
  );

  protected async scanProject(projectPath: string): Promise<ScanResult>;
  protected getRegisteredAgents(): string[];
  abstract execute(projectPath: string, options?: any): Promise<any>;
}
```

All orchestrators extend this base class to ensure consistent behavior and shared utilities.

### DocumentationOrchestrator

The `DocumentationOrchestrator` extends `BaseOrchestrator` and is the main class for coordinating comprehensive documentation generation.

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

### C4ModelOrchestrator

The `C4ModelOrchestrator` extends `BaseOrchestrator` and specializes in generating C4 architecture models.

#### `generateC4Model`

Generates a C4 architecture model for a given project path.

```typescript
async generateC4Model(
  projectPath: string,
  options?: OrchestratorOptions
): Promise<C4ModelOutput>
```

- **`projectPath`**: The absolute path to the project you want to analyze.
- **`options`**: An optional configuration object to customize the generation process.

Returns a C4 model with:

- `c4Model`: JSON representation of the C4 architecture (Context, Containers, Components)
- `plantUMLModel`: PlantUML diagrams for each C4 level

**Example:**

```typescript
import { C4ModelOrchestrator, AgentRegistry, FileSystemScanner } from '@archdoc/generator';

const scanner = new FileSystemScanner();
const registry = new AgentRegistry();
const orchestrator = new C4ModelOrchestrator(registry, scanner);

const result = await orchestrator.generateC4Model('./my-project');
console.log('C4 Context:', result.c4Model.context);
console.log('PlantUML Context:', result.plantUMLModel.context);
```

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

### Creating Custom Agents

You can extend the library with custom agents or override existing ones by implementing the `Agent` interface.

#### Basic Custom Agent

```typescript
import {
  Agent,
  AgentMetadata,
  AgentContext,
  AgentResult,
  AgentPriority,
  AgentExecutionOptions,
  LLMService,
} from '@techdebtgpt/archdoc-generator';

export class CustomSecurityAgent implements Agent {
  private llmService: LLMService;

  constructor() {
    this.llmService = LLMService.getInstance();
  }

  public getMetadata(): AgentMetadata {
    return {
      name: 'custom-security',
      version: '1.0.0',
      description: 'Custom security analysis with company-specific rules',
      priority: AgentPriority.MEDIUM,
      capabilities: {
        supportsParallel: true,
        requiresInternet: false,
        supportedLanguages: ['typescript', 'javascript', 'python'],
        dependencies: [], // Can depend on other agents
      },
      tags: ['security', 'custom'],
    };
  }

  public async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const model = this.llmService.getChatModel({ temperature: 0.2 });

    // Your custom analysis logic
    const analysis = await this.performAnalysis(context, model);

    return {
      agentName: this.getMetadata().name,
      status: 'success',
      data: { findings: analysis.findings },
      summary: `Found ${analysis.findings.length} security issues`,
      markdown: this.formatReport(analysis),
      confidence: 0.85,
      tokenUsage: {
        inputTokens: analysis.inputTokens,
        outputTokens: analysis.outputTokens,
        totalTokens: analysis.inputTokens + analysis.outputTokens,
      },
      executionTime: Date.now() - startTime,
      errors: [],
      warnings: [],
      metadata: {},
    };
  }

  private async performAnalysis(context: AgentContext, model: any) {
    // Implementation...
    return { findings: [], inputTokens: 1000, outputTokens: 500 };
  }

  private formatReport(analysis: any): string {
    return `# Security Analysis\n\n...`;
  }
}
```

#### Registering Custom Agents

```typescript
import {
  DocumentationOrchestrator,
  AgentRegistry,
  LLMService,
  FileSystemScanner,
  MultiFileMarkdownFormatter,
} from '@techdebtgpt/archdoc-generator';
import { CustomSecurityAgent } from './custom-security-agent';

async function generateWithCustomAgent(projectPath: string, outputDir: string) {
  // Initialize services
  const llmService = LLMService.getInstance();
  llmService.initialize({
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
  });

  const scanner = new FileSystemScanner();
  const formatter = new MultiFileMarkdownFormatter();

  // Create agent registry and add custom agent
  const agentRegistry = new AgentRegistry();
  agentRegistry.register(new CustomSecurityAgent());

  // Create orchestrator with custom registry
  const orchestrator = new DocumentationOrchestrator(llmService, scanner, formatter, agentRegistry);

  // Generate documentation using your custom agent
  const result = await orchestrator.generate({
    projectPath,
    outputPath: outputDir,
    selectedAgents: ['custom-security'],
  });

  return result;
}
```

#### Overriding Built-in Agents

You can extend and override existing agents:

```typescript
import {
  DependencyAnalyzerAgent,
  AgentContext,
  AgentResult,
  AgentExecutionOptions,
} from '@techdebtgpt/archdoc-generator';

export class EnhancedDependencyAgent extends DependencyAnalyzerAgent {
  public async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    // Call parent implementation
    const baseResult = await super.execute(context, options);

    // Add your custom enhancements
    const enhanced = {
      ...baseResult.data,
      customMetrics: {
        internalDependencies: 42,
        externalDependencies: 15,
      },
    };

    return {
      ...baseResult,
      data: enhanced,
      summary: `${baseResult.summary} + custom analysis`,
    };
  }
}

// Use it
const agentRegistry = new AgentRegistry();
agentRegistry.register(new EnhancedDependencyAgent()); // Replaces default
```

#### Agent Dependencies

Your custom agent can depend on results from other agents:

```typescript
public getMetadata(): AgentMetadata {
  return {
    name: 'custom-quality',
    capabilities: {
      // This agent runs after these agents
      dependencies: ['file-structure', 'dependency-analyzer'],
      supportsParallel: false,
    },
  };
}

public async execute(context: AgentContext): Promise<AgentResult> {
  // Access results from dependency agents
  const fileStructure = context.previousResults.get('file-structure');
  const dependencies = context.previousResults.get('dependency-analyzer');

  // Use their data
  const analysis = this.analyzeQuality(fileStructure, dependencies);
  // ...
}
```

#### Managing Agents

```typescript
const agentRegistry = new AgentRegistry();

// Register
agentRegistry.register(new CustomSecurityAgent());

// Unregister
agentRegistry.unregister('security-analyzer');

// Check if exists
if (agentRegistry.hasAgent('pattern-detector')) {
  console.log('Pattern detector available');
}

// Get all agents
const allAgents = agentRegistry.getAllAgents();
console.log(`Total agents: ${agentRegistry.getAgentCount()}`);

// Get by priority
const priorityAgents = agentRegistry.getAgentsByPriority();

// Get by tags
const securityAgents = agentRegistry.getAgentsByTags(['security']);
```

### Custom Workflow

For more complex scenarios, you can create a custom workflow:

```typescript
import {
  DocumentationOrchestrator,
  AgentRegistry,
  FileSystemScanner,
  MultiFileMarkdownFormatter,
  LLMService,
} from '@techdebtgpt/archdoc-generator';

class CustomWorkflow {
  private orchestrator: DocumentationOrchestrator;

  constructor() {
    const llmService = LLMService.getInstance();
    const scanner = new FileSystemScanner();
    const formatter = new MultiFileMarkdownFormatter();
    const registry = new AgentRegistry();

    // Register specific agents for your workflow
    this.orchestrator = new DocumentationOrchestrator(llmService, scanner, formatter, registry);
  }

  async run(projectPath: string) {
    const output = await this.orchestrator.generate({
      projectPath,
      outputPath: './docs',
      selectedAgents: ['file-structure', 'dependency-analyzer'],
    });
    return output;
  }
}
```

### Complete Example: Company Compliance Agent

```typescript
import {
  Agent,
  AgentMetadata,
  AgentContext,
  AgentResult,
  AgentPriority,
} from '@techdebtgpt/archdoc-generator';

export class CompanyComplianceAgent implements Agent {
  private companyRules = {
    requiredLicenses: ['MIT', 'Apache-2.0'],
    forbiddenPackages: ['left-pad'],
    requiredFiles: ['SECURITY.md', 'CODE_OF_CONDUCT.md'],
  };

  public getMetadata(): AgentMetadata {
    return {
      name: 'company-compliance',
      version: '1.0.0',
      description: 'Enforces company-specific compliance rules',
      priority: AgentPriority.HIGH,
      capabilities: {
        supportsParallel: true,
        requiresInternet: false,
        supportedLanguages: [],
        dependencies: ['dependency-analyzer'],
      },
      tags: ['compliance', 'security'],
    };
  }

  public async execute(context: AgentContext): Promise<AgentResult> {
    const violations: string[] = [];

    // Check required files
    const missingFiles = this.companyRules.requiredFiles.filter(
      (file) => !context.fileTree.some((f) => f.path.endsWith(file)),
    );
    violations.push(...missingFiles.map((f) => `Missing: ${f}`));

    // Check licenses from dependency analyzer
    const deps = context.previousResults.get('dependency-analyzer');
    if (deps) {
      violations.push(...this.checkLicenses(deps.data));
    }

    return {
      agentName: 'company-compliance',
      status: violations.length > 0 ? 'warning' : 'success',
      data: { violations, rules: this.companyRules },
      summary: `Found ${violations.length} compliance violations`,
      markdown: this.formatReport(violations),
      confidence: 1.0,
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      executionTime: 50,
      errors: [],
      warnings: violations,
      metadata: {},
    };
  }

  private checkLicenses(dependencyData: any): string[] {
    // Check against allowed licenses
    return [];
  }

  private formatReport(violations: string[]): string {
    if (violations.length === 0) {
      return '# Compliance Check\n\n✅ All rules passed!';
    }
    return `# Violations\n\n${violations.map((v) => `- ❌ ${v}`).join('\n')}`;
  }
}
```
