# Architecture Documentation Generator - System Architecture

## Overview

The Architecture Documentation Generator is an AI-powered tool that analyzes codebases and generates comprehensive architectural documentation. It uses Large Language Models (LLMs) with an agentic workflow pattern to understand project structure, dependencies, patterns, and code quality without relying on static analysis or AST parsing.

## Core Principles

### 1. **Language Agnostic**
The system works with any programming language by analyzing file patterns, content, and structure rather than parsing specific syntax trees.

### 2. **LLM-Powered Analysis**
Instead of traditional static analysis, the system leverages LLMs to understand code semantically, identify patterns, and generate human-readable documentation.

### 3. **Agentic Architecture**
Multiple specialized AI agents work in concert, each focusing on a specific aspect of the codebase (structure, dependencies, patterns, quality, etc.).

### 4. **Extensible Design**
New agents, output formatters, and LLM providers can be easily added through well-defined interfaces.

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Interface                        │
│                    (Commander.js + Chalk)                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Documentation Orchestrator                  │
│              (Coordinates agent execution)                   │
└──────┬────────────────┬────────────────┬────────────────────┘
       │                │                │
       ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Scanner   │  │   Agents    │  │ LLM Service │
│  (fast-glob)│  │  Registry   │  │ (Multi-LLM) │
└─────────────┘  └──────┬──────┘  └──────┬──────┘
                        │                │
                        ▼                ▼
              ┌──────────────────┐  ┌──────────────────┐
              │ FileStructure    │  │ Anthropic Claude │
              │ Dependency       │  │ OpenAI GPT-4     │
              │ Pattern          │  │ Google Gemini    │
              │ Quality          │  └──────────────────┘
              │ Synthesis        │
              └──────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │    Formatters    │
              │ (Markdown/JSON)  │
              └──────────────────┘
```

---

## Core Components

### 1. **File System Scanner**

**Location**: `src/scanners/file-system-scanner.ts`

**Responsibilities**:
- Traverse project directory structure
- Detect file types and programming languages
- Respect `.gitignore` patterns
- Calculate project statistics (file count, size, language distribution)
- Generate file tree representation

**Key Features**:
- Uses `fast-glob` for efficient file traversal
- Automatic language detection based on file extensions
- Configurable size limits and ignore patterns
- Calculates language statistics (file count, percentage, confidence)

**Example Output**:
```typescript
{
  projectPath: "/path/to/project",
  totalFiles: 245,
  totalDirectories: 38,
  totalSize: 2458624,
  languages: [
    { language: "TypeScript", fileCount: 187, percentage: 76.3, confidence: 0.95 },
    { language: "JavaScript", fileCount: 35, percentage: 14.3, confidence: 0.90 }
  ],
  files: [...],
  gitInfo: {...}
}
```

### 2. **Agent System**

**Location**: `src/agents/`

**Architecture Pattern**: Registry + Strategy

Agents are specialized analyzers that focus on specific aspects of the codebase. Each agent implements the `Agent` interface:

```typescript
interface Agent {
  getMetadata(): AgentMetadata;
  execute(context: AgentContext, options?: AgentExecutionOptions): Promise<AgentResult>;
}
```

#### Agent Registry

**Location**: `src/agents/agent-registry.ts`

- Manages available agents
- Handles agent registration and lookup
- Supports filtering by capability and priority
- Enables parallel execution where dependencies allow

#### Current Agents

##### **FileStructureAgent**
- **Purpose**: Analyzes project organization and directory structure
- **Input**: Scan results with file tree
- **Output**: Architectural insights about project layout, module organization, naming conventions
- **LLM Usage**: Yes - for semantic understanding of structure

**Future Agents** (Ready to implement):
- **DependencyAnalysisAgent**: Analyze package dependencies and imports
- **PatternDetectionAgent**: Identify design patterns and architectural patterns
- **CodeQualityAgent**: Assess code quality metrics and technical debt
- **SecurityAgent**: Identify potential security vulnerabilities
- **DocumentationSynthesisAgent**: Combine all agent results into coherent documentation

### 3. **LLM Service Layer**

**Location**: `src/llm/`

**Architecture Pattern**: Provider + Factory

The LLM layer abstracts different AI providers behind a common interface:

```typescript
interface ILLMProvider {
  getChatModel(config: ModelConfig): BaseChatModel;
  countTokens(text: string, model?: string): Promise<number>;
  getAvailableModels(): string[];
  getModelConfig(model: string): ModelConfiguration;
}
```

#### Supported Providers

1. **Anthropic Claude**
   - Models: claude-3-5-sonnet-20241022, claude-3-opus-20240229
   - Best for: Deep reasoning, code analysis
   - Token limit: 200k input

2. **OpenAI GPT-4**
   - Models: gpt-4-turbo, gpt-4
   - Best for: Balanced performance, broad knowledge
   - Token limit: 128k input

3. **Google Gemini**
   - Models: gemini-1.5-pro, gemini-1.5-flash
   - Best for: Fast processing, cost efficiency
   - Token limit: 1M input

#### Token Manager

**Location**: `src/llm/token-manager.ts`

- Uses `js-tiktoken` for accurate token counting
- Supports truncation strategies (start, end, middle)
- Provides chunk splitting for large documents
- Estimates costs based on token usage

### 4. **Documentation Orchestrator**

**Location**: `src/orchestrator/documentation-orchestrator.ts`

**Responsibilities**:
- Coordinate the entire documentation generation workflow
- Manage agent execution order and parallelization
- Aggregate results from multiple agents
- Track token usage and execution time
- Handle errors and provide graceful degradation

**Execution Flow**:

```
1. Scan Project
   ↓
2. Load Configuration
   ↓
3. Initialize Agents (Registry)
   ↓
4. Execute Agents (Sequential or Parallel)
   ↓ (for each agent)
   ├─ Create Agent Context
   ├─ Execute Agent
   ├─ Track Token Usage
   └─ Store Result
   ↓
5. Aggregate Results
   ↓
6. Format Output
   ↓
7. Return Documentation
```

**Key Features**:
- Supports parallel agent execution where safe
- Maintains context between agent runs
- Tracks total token usage and costs
- Provides progress callbacks for UI updates
- Handles partial failures gracefully

### 5. **Output Formatters**

**Location**: `src/formatters/`

Transform structured documentation data into various output formats:

#### **Markdown Formatter**
- Generates human-readable documentation
- Includes table of contents
- Supports code blocks and diagrams
- Customizable templates

#### **JSON Formatter** (Ready to implement)
- Machine-readable format
- Suitable for API consumption
- Enables programmatic analysis

#### **HTML Formatter** (Ready to implement)
- Interactive documentation
- Searchable content
- Responsive design

### 6. **CLI Interface**

**Location**: `cli/`

**Framework**: Commander.js

Three main commands:

#### `generate <path>`
Full documentation generation with LLM analysis
```bash
archdoc generate ./my-project \
  --output ./docs \
  --provider anthropic \
  --format markdown
```

#### `analyze <path>`
Quick structural analysis without heavy LLM usage
```bash
archdoc analyze ./my-project --verbose
```

#### `export <input>`
Convert existing documentation to different formats
```bash
archdoc export docs.json --format html
```

---

## Data Flow

### 1. **Input Processing**

```
User Input (Project Path)
    ↓
Scanner Configuration
    ↓
File System Scan
    ↓
ScanResult Object
```

### 2. **Analysis Phase**

```
ScanResult
    ↓
Agent Context Creation
    ↓
Agent Execution (Sequential/Parallel)
    ├─ Agent 1: File Structure
    ├─ Agent 2: Dependencies
    ├─ Agent 3: Patterns
    └─ Agent 4: Quality
    ↓
Agent Results Collection
```

### 3. **LLM Interaction**

```
Agent Request
    ↓
Token Counting
    ↓
Context Preparation
    ↓
LLM API Call (Anthropic/OpenAI/Google)
    ↓
Response Parsing
    ↓
Token Usage Tracking
    ↓
Agent Result
```

### 4. **Output Generation**

```
Agent Results
    ↓
Result Aggregation
    ↓
DocumentationOutput Object
    ↓
Formatter Selection
    ↓
Formatted Output (MD/JSON/HTML)
    ↓
File Writing
```

---

## Type System

The system uses a comprehensive TypeScript type system:

### Core Types

**Location**: `src/types/`

#### `scanner.types.ts`
- `ScanOptions`: Scanner configuration
- `ScanResult`: Complete scan output
- `FileEntry`: Individual file metadata
- `LanguageInfo`: Language statistics

#### `agent.types.ts`
- `AgentMetadata`: Agent information
- `AgentContext`: Execution context
- `AgentResult`: Agent output
- `TokenUsage`: Token tracking

#### `llm.types.ts`
- `LLMProvider`: Provider enum
- `LLMConfig`: Model configuration
- `TokenUsageDetails`: Detailed token metrics

#### `output.types.ts`
- `DocumentationOutput`: Complete documentation structure
- `DocumentationOverview`: Project summary
- `ArchitectureDocumentation`: Architecture details
- `FileStructureDocumentation`: File organization
- `DependencyDocumentation`: Dependency analysis
- `PatternDocumentation`: Pattern detection
- `CodeQualityDocumentation`: Quality metrics

---

## LangChain Integration

The system uses **LangChain Expression Language (LCEL)** for building LLM workflows:

### Key Concepts

#### **Runnables**
Composable units of LLM operations:
```typescript
const chain = RunnableSequence.from([
  RunnableLambda.from(async (input) => preprocessInput(input)),
  LLMService.getChatModel({ temperature: 0.2 }),
  new StringOutputParser(),
]).withConfig({ runName: 'analysis-chain' });
```

#### **Runnable Sequences**
Chain multiple operations:
```typescript
const analysisChain = RunnableSequence.from([
  prepareContext,
  callLLM,
  parseOutput,
  validateResult,
]);
```

#### **Runnable Parallel**
Execute operations concurrently:
```typescript
const parallelAnalysis = RunnableParallel.from({
  structure: structureAgent,
  dependencies: dependencyAgent,
  quality: qualityAgent,
});
```

#### **Configuration & Tracing**
Every runnable is configured for LangSmith tracing:
```typescript
.withConfig({
  runName: 'descriptive-name',
  metadata: { projectId, organizationId },
})
```

---

## Configuration

### Environment Variables

```bash
# Required for LLM features
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...

# Optional
ARCHDOC_CACHE_DIR=./cache
ARCHDOC_LOG_LEVEL=debug
ARCHDOC_MAX_TOKENS=100000
```

### Configuration File

**Location**: `.archdoc.config.json`

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.2,
    "maxTokens": 100000
  },
  "scanner": {
    "maxFiles": 10000,
    "maxFileSize": 1048576,
    "respectGitignore": true,
    "includePatterns": ["**/*"],
    "excludePatterns": ["**/node_modules/**", "**/dist/**"]
  },
  "agents": {
    "enabled": ["file-structure", "dependency-analysis"],
    "parallel": true,
    "timeout": 300000
  },
  "output": {
    "format": "markdown",
    "directory": "./docs/architecture",
    "includeMetadata": true
  }
}
```

---

## Extension Points

### Adding a New Agent

```typescript
import { Agent, AgentContext, AgentResult, AgentMetadata } from '@archdoc/generator';

export class CustomAgent implements Agent {
  getMetadata(): AgentMetadata {
    return {
      name: 'custom-agent',
      description: 'Custom analysis',
      version: '1.0.0',
      priority: AgentPriority.NORMAL,
      requiredAgents: [], // Dependencies
      maxParallelism: 1,
    };
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    // 1. Access scan results
    const { scanResult, previousResults, llmService } = context;
    
    // 2. Perform analysis (with LLM if needed)
    const analysis = await this.analyze(scanResult);
    
    // 3. Return structured result
    return {
      agentName: 'custom-agent',
      status: 'success',
      data: analysis,
      confidence: 0.85,
      tokenUsage: {
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
      },
      metadata: {},
    };
  }
}
```

### Adding a New LLM Provider

```typescript
import { ILLMProvider } from '../llm-provider.interface';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export class CustomLLMProvider implements ILLMProvider {
  constructor(private readonly apiKey: string) {}

  getChatModel(config: ModelConfig): BaseChatModel {
    // Return configured chat model
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // Implement token counting
  }

  getAvailableModels(): string[] {
    return ['custom-model-1', 'custom-model-2'];
  }

  getModelConfig(model: string): ModelConfiguration {
    // Return model capabilities
  }
}
```

### Adding a New Output Formatter

```typescript
import { IFormatter } from '../formatter.interface';
import { DocumentationOutput } from '../../types/output.types';

export class CustomFormatter implements IFormatter {
  format(documentation: DocumentationOutput): string {
    // Transform to desired format
    return formattedOutput;
  }

  getFileExtension(): string {
    return '.custom';
  }

  supportsBinaryOutput(): boolean {
    return false;
  }
}
```

---

## Performance Considerations

### Token Budget Management

The system implements token budget tracking to control costs:

```typescript
const tokenBudget = 100000; // Total budget
let remainingTokens = tokenBudget;

for (const agent of agents) {
  const context = {
    ...baseContext,
    tokenBudget: remainingTokens,
  };
  
  const result = await agent.execute(context);
  remainingTokens -= result.tokenUsage.totalTokens;
}
```

### Caching Strategy

- **File scan results**: Cached to avoid repeated scans
- **LLM responses**: Can be cached with consistent inputs
- **Token counts**: Cached for repeated content

### Parallel Execution

Agents can run in parallel when they have no dependencies:

```typescript
const independentAgents = registry.getAgents({
  hasNoDependencies: true,
});

await Promise.all(
  independentAgents.map(agent => agent.execute(context))
);
```

---

## Security Considerations

### API Key Management
- Never commit API keys to version control
- Use environment variables or secure vaults
- Support for key rotation

### File Access
- Respects `.gitignore` patterns by default
- Configurable file size limits
- Path traversal prevention

### LLM Prompt Injection
- Input sanitization for file contents
- Structured output parsing with validation
- Limited context to relevant information

---

## Error Handling

### Graceful Degradation

```typescript
try {
  const result = await agent.execute(context);
  results.set(agent.name, result);
} catch (error) {
  logger.error(`Agent ${agent.name} failed:`, error);
  // Continue with other agents
  results.set(agent.name, {
    status: 'failed',
    error: error.message,
  });
}
```

### Retry Logic

LLM calls implement exponential backoff:
```typescript
import { invokeChainWithRetry } from '@utilities';

const result = await invokeChainWithRetry(chain, input, {
  maxAttempts: 3,
  minTimeout: 1000,
  maxTimeout: 10000,
});
```

---

## Future Architecture Enhancements

### 1. **Incremental Updates**
- Cache previous analysis results
- Re-analyze only changed files
- Fast re-generation for large projects

### 2. **Distributed Processing**
- Split analysis across multiple workers
- Queue-based agent execution
- Horizontal scaling for large codebases

### 3. **Real-time Analysis**
- Watch mode for continuous documentation
- WebSocket updates for live UI
- Integration with CI/CD pipelines

### 4. **Multi-Repository Support**
- Analyze entire monorepos
- Cross-repository dependency tracking
- Organization-level architecture views

### 5. **Interactive UI**
- VS Code extension
- Web-based documentation browser
- Real-time preview during generation

---

## Comparison with Traditional Tools

| Feature | Traditional AST Tools | Architecture Doc Generator |
|---------|----------------------|---------------------------|
| **Language Support** | One per tool | Any language |
| **Understanding** | Syntax-based | Semantic (LLM) |
| **Documentation Quality** | Template-based | AI-generated prose |
| **Pattern Detection** | Rule-based | Intelligent inference |
| **Setup Complexity** | Per-language config | Unified configuration |
| **Output Format** | Fixed templates | Flexible, customizable |
| **Maintenance** | Parser updates needed | Self-adapting |

---

This architecture enables the system to be both powerful and flexible while maintaining simplicity for end users. The agentic design allows for easy extension, while the LLM integration provides human-like understanding of codebases across any programming language.
