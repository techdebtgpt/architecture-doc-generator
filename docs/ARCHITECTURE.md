# Architecture Documentation

> Technical architecture and design decisions for the Architecture Documentation Generator

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Core Components](#core-components)
- [Multi-Agent System](#multi-agent-system)
- [LangChain LCEL Integration](#langchain-lcel-integration)
- [Iterative Refinement](#iterative-refinement)
- [Data Flow](#data-flow)
- [Design Patterns](#design-patterns)
- [Performance & Optimization](#performance--optimization)
- [Security Considerations](#security-considerations)

## Overview

The Architecture Documentation Generator is built on a **multi-agent architecture** where specialized AI agents analyze different aspects of a codebase. The system uses **LangChain Expression Language (LCEL)** for composable AI workflows and **LangSmith** for complete observability.

### Design Principles

1. **Modularity** - Each agent is independent and reusable
2. **Composability** - Agents can be combined in different workflows
3. **Observability** - Full tracing of AI operations via LangSmith
4. **Language Agnostic** - No AST parsers, works with any language
5. **Extensibility** - Easy to add custom agents
6. **Performance** - Parallel execution and intelligent caching

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Interface                        │
│                    (Commander.js + Ora)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Documentation Orchestrator                     │
│  - Workflow coordination                                     │
│  - Agent execution management                                │
│  - Result aggregation                                        │
│  - Iterative refinement control                             │
└──────┬────────────────┬────────────────┬────────────────────┘
       │                │                │
       ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Scanner    │  │   Registry   │  │ LLM Service  │
│ (File System)│  │  (Agents)    │  │(Multi-Model) │
└──────────────┘  └──────┬───────┘  └──────┬───────┘
                         │                 │
                         ▼                 ▼
               ┌──────────────────┐  ┌─────────────┐
               │ Agent Instances  │  │ Providers   │
               │ - FileStructure  │  │ - Anthropic │
               │ - Dependency     │  │ - OpenAI    │
               │ - Pattern        │  │ - Google    │
               │ - Flow           │  └─────────────┘
               │ - Schema         │
               │ - Architecture   │
               └──────────────────┘
                         │
                         ▼
               ┌──────────────────┐
               │   Formatters     │
               │ - Markdown       │
               │ - JSON           │
               │ - HTML           │
               └──────────────────┘
```

## Core Components

### 1. Documentation Orchestrator

**Location:** `src/orchestrator/documentation-orchestrator.ts`

The orchestrator is the central coordinator that:

- Scans the project structure
- Selects and executes agents
- Manages parallel execution
- Controls iterative refinement
- Aggregates results
- Coordinates formatting

**Key Methods:**

```typescript
class DocumentationOrchestrator {
  async generateDocumentation(
    projectPath: string,
    options: OrchestratorOptions
  ): Promise<DocumentationOutput>
  
  async executeAgents(
    context: AgentContext,
    agentsToRun: string[],
    options: OrchestratorOptions
  ): Promise<Map<string, AgentResult>>
}
```

**Workflow:**

1. Scan project → `FileSystemScanner`
2. Create execution context
3. Execute agents (parallel or sequential)
4. Refine results (if enabled)
5. Aggregate into final output
6. Format and save

### 2. Agent Registry

**Location:** `src/agents/agent-registry.ts`

Manages agent lifecycle and discovery:

```typescript
class AgentRegistry {
  register(agent: Agent): void
  getAgent(name: string): Agent | undefined
  getAllAgents(): Agent[]
  getAgentsByCapability(capability: string): Agent[]
}
```

**Features:**

- Dynamic agent registration
- Capability-based queries
- Dependency resolution
- Priority ordering

### 3. File System Scanner

**Location:** `src/scanners/file-system-scanner.ts`

Fast, efficient project scanning:

```typescript
class FileSystemScanner {
  async scan(options: ScanOptions): Promise<ScanResult>
}
```

**Capabilities:**

- Respects `.gitignore`
- Language detection
- Size limits
- Pattern exclusions
- Symlink handling

**Output:**

```typescript
interface ScanResult {
  files: string[];              // All file paths
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  languageDistribution: Map<string, number>;
  entryPoints: string[];        // main.ts, index.js, etc.
  configFiles: string[];        // package.json, tsconfig.json, etc.
}
```

### 4. LLM Service

**Location:** `src/llm/llm-service.ts`

Unified interface for multiple LLM providers:

```typescript
class LLMService {
  static getInstance(): LLMService
  
  getChatModel(config?: ModelConfig): BaseChatModel
  
  async countTokens(text: string): Promise<number>
  
  getTokenUsage(model: BaseChatModel, result: LLMResult): TokenUsage
  
  static configureLangSmith(): void
}
```

**Supported Providers:**

| Provider | Models | Best For |
|----------|--------|----------|
| **Anthropic** | claude-3-5-sonnet, claude-3-opus | Deep code analysis, reasoning |
| **OpenAI** | gpt-4-turbo, gpt-4 | Balanced performance |
| **Google** | gemini-1.5-pro, gemini-1.5-flash | Fast, cost-effective |

### 5. Formatter System

**Location:** `src/formatters/`

Multiple output format support:

```typescript
interface IFormatter {
  format(output: DocumentationOutput, options: FormatOptions): Promise<void>
}

class MultiFileMarkdownFormatter implements IFormatter {
  async format(output: DocumentationOutput, options: FormatOptions): Promise<void>
}
```

**Formatters:**

- `MultiFileMarkdownFormatter` - Multiple .md files
- `SingleFileMarkdownFormatter` - One .md file
- `JSONFormatter` - Structured JSON
- `HTMLFormatter` - Interactive HTML

## Multi-Agent System

### Agent Interface

Every agent implements the `Agent` interface:

```typescript
interface Agent {
  getMetadata(): AgentMetadata;
  execute(context: AgentContext, options?: AgentExecutionOptions): Promise<AgentResult>;
}

interface AgentMetadata {
  name: string;
  version: string;
  description: string;
  priority: AgentPriority;
  capabilities: AgentCapabilities;
  tags: string[];
}

interface AgentCapabilities {
  supportsParallel: boolean;
  requiresFileContents: boolean;
  dependencies: string[];
  supportsIncremental: boolean;
  estimatedTokens: number;
  supportedLanguages: string[];
}
```

### Available Agents

#### 1. File Structure Agent

**Purpose:** Analyze project organization and structure

**Output:**
- Directory tree
- Key directories and their purposes
- Entry points
- Configuration files
- Naming conventions

**Implementation Pattern:**

```typescript
export class FileStructureAgent implements Agent {
  private buildAnalysisChain(context: AgentContext, options?: AgentExecutionOptions) {
    const model = this.llmService.getChatModel({ temperature: 0.2 });

    return RunnableSequence.from([
      RunnableLambda.from(async (input) => {
        // Prepare file tree and context
        return { fileTree, entryPoints, configFiles };
      }).withConfig({ runName: 'PrepareFileStructure' }),

      RunnableLambda.from(async (input) => {
        // Build prompts
        return [systemPrompt, humanPrompt];
      }).withConfig({ runName: 'BuildPrompts' }),

      model.withConfig({ runName: 'AnalyzeStructure' }),

      new StringOutputParser(),
    ]);
  }
}
```

#### 2. Dependency Analyzer Agent

**Purpose:** Analyze project dependencies

**Output:**
- External dependencies
- Internal module dependencies
- Dependency graph
- Version information
- Security vulnerabilities

#### 3. Pattern Detector Agent

**Purpose:** Identify design patterns and practices

**Output:**
- Design patterns (Singleton, Factory, etc.)
- Architectural patterns (MVC, Hexagonal, etc.)
- Anti-patterns
- Best practices
- Code conventions

#### 4. Flow Visualization Agent

**Purpose:** Map data and control flows

**Output:**
- Data flow diagrams
- Control flow sequences
- API call flows
- Event flows

#### 5. Schema Generator Agent

**Purpose:** Extract data models and types

**Output:**
- Type definitions
- Interface schemas
- Data models
- Database schemas

#### 6. Architecture Analyzer Agent

**Purpose:** High-level architectural analysis

**Output:**
- Component architecture
- Layer organization
- Communication patterns
- System boundaries

### Agent Execution

Agents can run in two modes:

**1. Parallel Execution** (default)

```typescript
const agentPromises = agentsToRun.map(name => {
  const agent = this.agentRegistry.getAgent(name);
  const agentRunnable = RunnableLambda.from(
    async (ctx: AgentContext, config?: RunnableConfig) => {
      return await agent.execute(ctx, { 
        ...options.agentOptions,
        runnableConfig: config 
      });
    }
  ).withConfig({ runName: `Agent-${name}` });
  
  return agentRunnable.invoke(context, options.agentOptions?.runnableConfig);
});

const results = await Promise.all(agentPromises);
```

**2. Sequential Execution** (when dependencies exist)

```typescript
for (const agentName of agentsToRun) {
  const agent = this.agentRegistry.getAgent(agentName);
  const result = await agent.execute(context, options.agentOptions);
  results.set(agentName, result);
}
```

## LangChain LCEL Integration

### Why LCEL?

LangChain Expression Language provides:

1. **Composability** - Chain operations together
2. **Streaming** - Real-time output
3. **Async** - Non-blocking execution
4. **Observability** - Integrated LangSmith tracing
5. **Error Handling** - Retry and fallback logic

### LCEL Pattern

All agents follow this pattern:

```typescript
private buildAnalysisChain(context: AgentContext, options?: AgentExecutionOptions) {
  const model = this.llmService.getChatModel({ temperature: 0.2 });

  return RunnableSequence.from([
    // Step 1: Prepare data
    RunnableLambda.from(async (input) => {
      const preparedData = await this.prepareData(input);
      return preparedData;
    }).withConfig({ runName: 'PrepareData' }),

    // Step 2: Build prompts
    RunnableLambda.from(async (input) => {
      const prompts = this.buildPrompts(input);
      return prompts;
    }).withConfig({ runName: 'BuildPrompts' }),

    // Step 3: LLM analysis
    model.withConfig({ runName: 'LLMAnalysis' }),

    // Step 4: Parse output
    new StringOutputParser(),
  ]);
  // NOTE: No .withConfig() on the sequence itself!
}
```

### Unified Tracing

**Critical Rule:** Agents MUST pass `options?.runnableConfig` to `chain.invoke()`:

```typescript
async execute(context: AgentContext, options?: AgentExecutionOptions): Promise<AgentResult> {
  const chain = this.buildAnalysisChain(context, options);
  
  // Pass config for unified tracing
  const result = await chain.invoke(input, options?.runnableConfig);
  
  return {
    agentName: this.getMetadata().name,
    status: 'success',
    data: result,
    // ...
  };
}
```

This creates a unified trace hierarchy:

```
DocumentationGeneration-Complete
└── ExecuteAgents
    ├── Agent-file-structure
    │   ├── PrepareData
    │   ├── BuildPrompts
    │   └── LLMAnalysis
    └── Agent-dependency-analyzer
        ├── PrepareData
        ├── BuildPrompts
        └── LLMAnalysis
```

## Iterative Refinement

### Self-Improving Analysis

The system can iteratively refine agent output until quality thresholds are met:

```typescript
interface IterativeRefinementOptions {
  enabled: boolean;
  maxIterations: number;           // Default: 5
  clarityThreshold: number;        // Default: 80 (%)
  minImprovement: number;          // Default: 10 (%)
}
```

### Refinement Workflow

```typescript
async refineAnalysis(
  initialResult: AgentResult,
  context: AgentContext,
  agent: Agent,
  options: IterativeRefinementOptions
): Promise<AgentResult> {
  let currentResult = initialResult;
  let iteration = 0;

  while (iteration < options.maxIterations) {
    // 1. Evaluate clarity
    const clarityScore = await this.evaluateClarity(currentResult);
    
    if (clarityScore >= options.clarityThreshold) {
      break; // Quality threshold met
    }

    // 2. Generate refinement questions
    const questions = await this.generateRefinementQuestions(
      currentResult,
      context
    );

    // 3. Re-analyze with questions
    const refinedResult = await agent.execute(context, {
      refinementQuestions: questions,
      previousResult: currentResult
    });

    // 4. Check improvement
    const improvement = refinedResult.confidence - currentResult.confidence;
    if (improvement < options.minImprovement) {
      break; // No significant improvement
    }

    currentResult = refinedResult;
    iteration++;
  }

  return currentResult;
}
```

### Clarity Evaluation

```typescript
private async evaluateClarity(result: AgentResult): Promise<number> {
  const prompt = `
    Evaluate the clarity of this analysis on a scale of 0-100:
    ${result.markdown}
    
    Consider:
    - Completeness
    - Accuracy
    - Clarity
    - Usefulness
    
    Return only a number 0-100.
  `;

  const model = this.llmService.getChatModel({ temperature: 0 });
  const response = await model.invoke([new HumanMessage(prompt)]);
  
  return parseInt(response.content);
}
```

## Data Flow

### Documentation Generation Flow

```
1. CLI Command
   │
   ├─> Parse arguments
   └─> Load configuration
       │
2. Orchestrator.generateDocumentation()
   │
   ├─> FileSystemScanner.scan()
   │   └─> Returns: ScanResult
   │
   ├─> Create AgentContext
   │   └─> Contains: files, metadata, config
   │
   ├─> AgentSelector.selectAgents() (optional)
   │   └─> Returns: Selected agent names
   │
   ├─> Orchestrator.executeAgents()
   │   │
   │   ├─> For each agent (parallel):
   │   │   ├─> Agent.execute(context, options)
   │   │   │   ├─> Build LCEL chain
   │   │   │   ├─> Invoke with config (unified tracing)
   │   │   │   └─> Return AgentResult
   │   │   │
   │   │   └─> Refinement loop (if enabled):
   │   │       ├─> Evaluate clarity
   │   │       ├─> Generate questions
   │   │       └─> Re-execute agent
   │   │
   │   └─> Returns: Map<AgentName, AgentResult>
   │
   ├─> Orchestrator.aggregateResults()
   │   └─> Returns: DocumentationOutput
   │
   └─> Formatter.format()
       └─> Generate output files
```

### Data Structures

**AgentContext:**

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

**AgentResult:**

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

**DocumentationOutput:**

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

## Design Patterns

### 1. Registry Pattern

The `AgentRegistry` uses the registry pattern for dynamic agent management:

```typescript
class AgentRegistry {
  private agents = new Map<string, Agent>();
  
  register(agent: Agent): void {
    const metadata = agent.getMetadata();
    this.agents.set(metadata.name, agent);
  }
}
```

### 2. Strategy Pattern

Agents implement a common interface but have different analysis strategies:

```typescript
interface Agent {
  execute(context: AgentContext): Promise<AgentResult>;
}

class FileStructureAgent implements Agent { /* ... */ }
class DependencyAgent implements Agent { /* ... */ }
```

### 3. Builder Pattern

Formatters use builder pattern for flexible output:

```typescript
class MultiFileMarkdownFormatter {
  private generateIndex(output: DocumentationOutput): string
  private generateMetadata(output: DocumentationOutput): string
  private generateFileStructure(output: DocumentationOutput): string
  
  async format(output: DocumentationOutput, options: FormatOptions): Promise<void>
}
```

### 4. Singleton Pattern

LLM Service uses singleton for shared configuration:

```typescript
class LLMService {
  private static instance: LLMService;
  
  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }
}
```

### 5. Template Method Pattern

Base agent workflow defines template, agents fill in details:

```typescript
abstract class BaseAgentWorkflow {
  async execute(context: AgentContext): Promise<AgentResult> {
    const prepared = await this.prepareData(context);
    const analyzed = await this.analyze(prepared);
    const formatted = await this.formatResult(analyzed);
    return formatted;
  }
  
  protected abstract prepareData(context: AgentContext): Promise<any>;
  protected abstract analyze(data: any): Promise<any>;
  protected abstract formatResult(result: any): Promise<AgentResult>;
}
```

## Performance & Optimization

### 1. Parallel Execution

Agents with no dependencies run concurrently:

```typescript
const agentPromises = independentAgents.map(agent => 
  agent.execute(context, options)
);
const results = await Promise.all(agentPromises);
```

**Performance Gain:** 3-5x faster for 5 agents

### 2. Token Management

Intelligent context truncation to stay within limits:

```typescript
private async truncateContext(context: string, maxTokens: number): Promise<string> {
  const tokens = await this.llmService.countTokens(context);
  
  if (tokens <= maxTokens) {
    return context;
  }
  
  // Truncate with smart summarization
  const ratio = maxTokens / tokens;
  return context.slice(0, Math.floor(context.length * ratio));
}
```

### 3. Caching (Future)

```typescript
interface CacheOptions {
  enabled: boolean;
  ttl: number;
  keyGenerator: (context: AgentContext) => string;
}
```

### 4. Streaming (Future)

```typescript
const stream = await agent.stream(context, options);

for await (const chunk of stream) {
  console.log(chunk);
}
```

## Security Considerations

### 1. API Key Management

- Never commit API keys
- Store in `.archdoc.config.json` (gitignored)
- Support environment variables for CI/CD
- Validate keys before use

### 2. File System Access

- Respect `.gitignore`
- Configurable exclusions
- Size limits
- No execution of code

### 3. LLM Input Sanitization

- Remove sensitive data
- Truncate large files
- Filter binary files
- Exclude credentials

### 4. Output Validation

- Validate LLM responses
- Schema validation with Zod
- Error handling
- Retry logic

## Technology Stack

### Core Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `langchain` | LLM orchestration | ^0.3.0 |
| `@langchain/anthropic` | Claude integration | ^0.3.0 |
| `@langchain/openai` | GPT integration | ^0.3.0 |
| `@langchain/google-genai` | Gemini integration | ^0.1.0 |
| `commander` | CLI framework | ^12.0.0 |
| `zod` | Schema validation | ^3.22.0 |
| `fast-glob` | File scanning | ^3.3.2 |
| `js-tiktoken` | Token counting | ^1.0.12 |

### Development Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | Language |
| `jest` | Testing |
| `eslint` | Linting |
| `prettier` | Formatting |

## Future Enhancements

### 1. Visual Diagrams

Generate Mermaid/PlantUML diagrams:

```typescript
interface DiagramGenerator {
  generateArchitectureDiagram(output: DocumentationOutput): string;
  generateFlowDiagram(flows: DataFlow[]): string;
}
```

### 2. Incremental Updates

Only re-analyze changed files:

```typescript
interface IncrementalOptions {
  enabled: boolean;
  previousOutput: DocumentationOutput;
  changedFiles: string[];
}
```

### 3. Plugin System

Load custom agents dynamically:

```typescript
class PluginManager {
  async loadPlugin(path: string): Promise<Agent>
  registerPlugin(plugin: AgentPlugin): void
}
```

### 4. Web UI

Interactive documentation explorer:

- File tree navigation
- Searchable docs
- Visual diagrams
- Export options

---

**See Also:**

- [📖 User Guide](./USER_GUIDE.md) - How to use the tool
- [🔌 Integration Guide](./INTEGRATION_GUIDE.md) - CI/CD integration
- [🤝 Contributing](./CONTRIBUTING.md) - Development guide
- [📚 API Reference](./API.md) - Programmatic API

**Navigation:**

[🏠 Home](../README.md) · [📖 Docs Index](./README.md) · [📖 User Guide](./USER_GUIDE.md) · [🔌 Integration](./INTEGRATION_GUIDE.md) · [🤝 Contributing](./CONTRIBUTING.md)
