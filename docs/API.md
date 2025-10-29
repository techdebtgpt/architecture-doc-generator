# API Reference

> Programmatic API documentation for Architecture Documentation Generator

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core API](#core-api)
- [Types](#types)
- [Advanced Usage](#advanced-usage)
- [Examples](#examples)

## Installation

```bash
npm install @archdoc/generator
```

## Quick Start

```typescript
import { 
  DocumentationOrchestrator, 
  AgentRegistry,
  FileSystemScanner 
} from '@archdoc/generator';

// Setup
const scanner = new FileSystemScanner();
const registry = new AgentRegistry();
const orchestrator = new DocumentationOrchestrator(registry, scanner);

// Generate
const output = await orchestrator.generateDocumentation('./my-project');

console.log(output.summary);
```

## Core API

### DocumentationOrchestrator

Main class for coordinating documentation generation.

#### Constructor

```typescript
constructor(
  agentRegistry: AgentRegistry,
  scanner: FileSystemScanner
)
```

#### Methods

##### `generateDocumentation()`

Generate complete documentation for a project.

```typescript
async generateDocumentation(
  projectPath: string,
  options?: OrchestratorOptions
): Promise<DocumentationOutput>
```

**Parameters:**

- `projectPath` (string) - Absolute path to project
- `options` (OrchestratorOptions) - Configuration options

**Returns:** `Promise<DocumentationOutput>`

**Example:**

```typescript
const output = await orchestrator.generateDocumentation('./src', {
  maxTokens: 100000,
  parallel: true,
  iterativeRefinement: {
    enabled: true,
    maxIterations: 5,
    clarityThreshold: 80,
    minImprovement: 10
  },
  agentOptions: {
    runnableConfig: {
      runName: 'MyAnalysis'
    }
  }
});
```

---

### AgentRegistry

Manages agent lifecycle and discovery.

#### Constructor

```typescript
constructor()
```

#### Methods

##### `register()`

Register an agent.

```typescript
register(agent: Agent): void
```

**Example:**

```typescript
import { FileStructureAgent } from '@archdoc/generator';

const registry = new AgentRegistry();
registry.register(new FileStructureAgent());
```

##### `getAgent()`

Get agent by name.

```typescript
getAgent(name: string): Agent | undefined
```

##### `getAllAgents()`

Get all registered agents.

```typescript
getAllAgents(): Agent[]
```

##### `getAgentsByCapability()`

Get agents with specific capability.

```typescript
getAgentsByCapability(capability: string): Agent[]
```

---

### FileSystemScanner

Scans project file system.

#### Constructor

```typescript
constructor()
```

#### Methods

##### `scan()`

Scan project directory.

```typescript
async scan(options: ScanOptions): Promise<ScanResult>
```

**Parameters:**

- `options` (ScanOptions) - Scan configuration

**Returns:** `Promise<ScanResult>`

**Example:**

```typescript
const scanner = new FileSystemScanner();

const result = await scanner.scan({
  rootPath: './my-project',
  maxFiles: 1000,
  maxFileSize: 1048576, // 1MB
  respectGitignore: true,
  includeHidden: false,
  followSymlinks: false,
  excludePatterns: ['node_modules', 'dist']
});

console.log(`Found ${result.totalFiles} files`);
```

---

### LLMService

Singleton service for LLM operations.

#### Methods

##### `getInstance()`

Get singleton instance.

```typescript
static getInstance(): LLMService
```

##### `getChatModel()`

Get configured chat model.

```typescript
getChatModel(config?: ModelConfig): BaseChatModel
```

**Parameters:**

- `config` (ModelConfig) - Optional model configuration

**Returns:** `BaseChatModel`

**Example:**

```typescript
import { LLMService } from '@archdoc/generator';

const llmService = LLMService.getInstance();

const model = llmService.getChatModel({
  temperature: 0.2,
  maxTokens: 4096
});
```

##### `countTokens()`

Count tokens in text.

```typescript
async countTokens(text: string): Promise<number>
```

##### `getTokenUsage()`

Get token usage from LLM result.

```typescript
getTokenUsage(model: BaseChatModel, result: LLMResult): TokenUsage
```

##### `configureLangSmith()`

Configure LangSmith tracing.

```typescript
static configureLangSmith(): void
```

---

### MultiFileMarkdownFormatter

Format output as multiple markdown files.

#### Methods

##### `format()`

Format and save documentation.

```typescript
async format(
  output: DocumentationOutput, 
  options: FormatOptions
): Promise<void>
```

**Parameters:**

- `output` (DocumentationOutput) - Generated documentation
- `options` (FormatOptions) - Format options

**Example:**

```typescript
import { MultiFileMarkdownFormatter } from '@archdoc/generator';

const formatter = new MultiFileMarkdownFormatter();

await formatter.format(output, {
  outputDir: './docs',
  includeTOC: true,
  includeMetadata: true
});
```

---

### Agents

All agents implement the `Agent` interface.

#### Available Agents

```typescript
import {
  FileStructureAgent,
  DependencyAnalyzerAgent,
  PatternDetectorAgent,
  FlowVisualizationAgent,
  SchemaGeneratorAgent,
  ArchitectureAnalyzerAgent
} from '@archdoc/generator';
```

#### Agent Interface

```typescript
interface Agent {
  getMetadata(): AgentMetadata;
  execute(
    context: AgentContext, 
    options?: AgentExecutionOptions
  ): Promise<AgentResult>;
}
```

**Example:**

```typescript
const agent = new FileStructureAgent();

const metadata = agent.getMetadata();
console.log(metadata.name); // 'file-structure'

const result = await agent.execute(context);
console.log(result.markdown);
```

## Types

### OrchestratorOptions

```typescript
interface OrchestratorOptions {
  maxTokens?: number;
  parallel?: boolean;
  iterativeRefinement?: IterativeRefinementOptions;
  agentOptions?: AgentExecutionOptions;
  onAgentProgress?: (current: number, total: number, agentName: string) => void;
}
```

### IterativeRefinementOptions

```typescript
interface IterativeRefinementOptions {
  enabled: boolean;
  maxIterations: number;
  clarityThreshold: number;
  minImprovement: number;
}
```

### AgentContext

```typescript
interface AgentContext {
  projectPath: string;
  files: string[];
  fileContents: Map<string, string>;
  scanResult: ScanResult;
  projectMetadata: {
    name: string;
    languages: string[];
    size: number;
  };
}
```

### AgentResult

```typescript
interface AgentResult {
  agentName: string;
  status: 'success' | 'error' | 'skipped';
  data: any;
  summary: string;
  markdown: string;
  confidence: number;
  tokenUsage: TokenUsage;
  executionTime: number;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}
```

### DocumentationOutput

```typescript
interface DocumentationOutput {
  projectName: string;
  projectPath: string;
  timestamp: string;
  summary: string;
  agentResults: Map<string, AgentResult>;
  totalTokens: number;
  totalCost: number;
  executionTime: number;
}
```

### ScanOptions

```typescript
interface ScanOptions {
  rootPath: string;
  maxFiles?: number;
  maxFileSize?: number;
  respectGitignore?: boolean;
  includeHidden?: boolean;
  followSymlinks?: boolean;
  excludePatterns?: string[];
}
```

### ScanResult

```typescript
interface ScanResult {
  files: string[];
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  languageDistribution: Map<string, number>;
  entryPoints: string[];
  configFiles: string[];
}
```

### ModelConfig

```typescript
interface ModelConfig {
  temperature?: number;
  maxTokens?: number;
  provider?: 'anthropic' | 'openai' | 'google';
  model?: string;
}
```

### TokenUsage

```typescript
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}
```

## Advanced Usage

### Custom Agent Implementation

```typescript
import { Agent, AgentContext, AgentResult, AgentMetadata } from '@archdoc/generator';

class CustomAgent implements Agent {
  getMetadata(): AgentMetadata {
    return {
      name: 'custom-agent',
      version: '1.0.0',
      description: 'Custom analysis',
      priority: 5,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: true,
        dependencies: [],
        supportsIncremental: false,
        estimatedTokens: 5000,
        supportedLanguages: ['typescript']
      },
      tags: ['custom']
    };
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    // Implementation
    return {
      agentName: 'custom-agent',
      status: 'success',
      data: {},
      summary: 'Custom analysis complete',
      markdown: '# Custom Analysis\n...',
      confidence: 0.9,
      tokenUsage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
      executionTime: 2000,
      errors: [],
      warnings: [],
      metadata: {}
    };
  }
}

// Register and use
const registry = new AgentRegistry();
registry.register(new CustomAgent());
```

### Custom Workflow

```typescript
import { 
  DocumentationOrchestrator,
  AgentRegistry,
  FileSystemScanner,
  LLMService
} from '@archdoc/generator';

class CustomWorkflow {
  private orchestrator: DocumentationOrchestrator;
  
  constructor() {
    // Configure LangSmith
    LLMService.configureLangSmith();
    
    // Setup components
    const scanner = new FileSystemScanner();
    const registry = new AgentRegistry();
    
    // Register only specific agents
    registry.register(new FileStructureAgent());
    registry.register(new DependencyAnalyzerAgent());
    
    this.orchestrator = new DocumentationOrchestrator(registry, scanner);
  }
  
  async generateFocusedDocs(projectPath: string) {
    // Custom scanning
    const scanResult = await this.preScan(projectPath);
    
    // Generate with custom options
    const output = await this.orchestrator.generateDocumentation(projectPath, {
      maxTokens: 150000,
      parallel: false, // Sequential execution
      iterativeRefinement: {
        enabled: true,
        maxIterations: 10,
        clarityThreshold: 90,
        minImprovement: 5
      },
      onAgentProgress: (current, total, name) => {
        console.log(`Progress: ${current}/${total} - ${name}`);
      }
    });
    
    // Custom formatting
    await this.customFormat(output);
    
    return output;
  }
  
  private async preScan(path: string) {
    // Custom logic
  }
  
  private async customFormat(output: DocumentationOutput) {
    // Custom formatting logic
  }
}
```

### Streaming Progress

```typescript
async function generateWithProgress(projectPath: string) {
  const orchestrator = createOrchestrator();
  
  const output = await orchestrator.generateDocumentation(projectPath, {
    onAgentProgress: (current, total, agentName) => {
      const percentage = Math.round((current / total) * 100);
      console.log(`[${percentage}%] ${agentName} (${current}/${total})`);
    }
  });
  
  return output;
}
```

### Error Handling

```typescript
try {
  const output = await orchestrator.generateDocumentation('./project');
  
  // Check for agent failures
  for (const [name, result] of output.agentResults) {
    if (result.status === 'error') {
      console.error(`Agent ${name} failed:`, result.errors);
    }
    
    if (result.warnings.length > 0) {
      console.warn(`Agent ${name} warnings:`, result.warnings);
    }
  }
  
  console.log('Success!');
} catch (error) {
  console.error('Documentation generation failed:', error);
}
```

## Examples

### Example 1: Basic Usage

```typescript
import { 
  DocumentationOrchestrator, 
  AgentRegistry,
  FileSystemScanner 
} from '@archdoc/generator';

async function main() {
  const scanner = new FileSystemScanner();
  const registry = new AgentRegistry();
  const orchestrator = new DocumentationOrchestrator(registry, scanner);
  
  const output = await orchestrator.generateDocumentation('./my-project');
  
  console.log('Generated documentation for:', output.projectName);
  console.log('Total tokens used:', output.totalTokens);
  console.log('Estimated cost: $', output.totalCost.toFixed(2));
}

main();
```

### Example 2: Custom Configuration

```typescript
import { DocumentationOrchestrator } from '@archdoc/generator';

const output = await orchestrator.generateDocumentation('./project', {
  maxTokens: 200000,
  parallel: true,
  iterativeRefinement: {
    enabled: true,
    maxIterations: 7,
    clarityThreshold: 85,
    minImprovement: 5
  },
  agentOptions: {
    runnableConfig: {
      runName: 'CustomAnalysis',
      metadata: { project: 'my-project' }
    }
  }
});
```

### Example 3: Specific Agents Only

```typescript
import { 
  AgentRegistry,
  FileStructureAgent,
  DependencyAnalyzerAgent 
} from '@archdoc/generator';

const registry = new AgentRegistry();

// Register only specific agents
registry.register(new FileStructureAgent());
registry.register(new DependencyAnalyzerAgent());

const orchestrator = new DocumentationOrchestrator(registry, scanner);
const output = await orchestrator.generateDocumentation('./project');
```

### Example 4: Custom Formatter

```typescript
import { 
  DocumentationOutput,
  IFormatter 
} from '@archdoc/generator';

class CustomFormatter implements IFormatter {
  async format(output: DocumentationOutput, options: any): Promise<void> {
    // Custom formatting logic
    const markdown = this.generateCustomMarkdown(output);
    await fs.writeFile('./custom-docs.md', markdown);
  }
  
  private generateCustomMarkdown(output: DocumentationOutput): string {
    return `# ${output.projectName}\n\n${output.summary}`;
  }
}

// Use custom formatter
const formatter = new CustomFormatter();
await formatter.format(output, {});
```

### Example 5: Integration with Express

```typescript
import express from 'express';
import { DocumentationOrchestrator } from '@archdoc/generator';

const app = express();
const orchestrator = createOrchestrator();

app.post('/generate-docs', async (req, res) => {
  try {
    const { projectPath } = req.body;
    
    const output = await orchestrator.generateDocumentation(projectPath, {
      maxTokens: 100000,
      parallel: true
    });
    
    res.json({
      success: true,
      projectName: output.projectName,
      summary: output.summary,
      tokens: output.totalTokens,
      cost: output.totalCost
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000);
```

---

**See Also:**

- [📖 User Guide](./USER_GUIDE.md) - CLI usage
- [🔌 Integration Guide](./INTEGRATION_GUIDE.md) - CI/CD integration
- [🏗️ Architecture](./ARCHITECTURE.md) - Technical details
- [🤝 Contributing](./CONTRIBUTING.md) - Development guide

**Navigation:**

[🏠 Home](../README.md) · [📖 Docs Index](./README.md) · [📖 User Guide](./USER_GUIDE.md) · [🔌 Integration](./INTEGRATION_GUIDE.md) · [🏗️ Architecture](./ARCHITECTURE.md)
