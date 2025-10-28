# LangSmith Trace Hierarchy - Implementation Guide

## Problem

Initially, each agent execution created a **separate root trace** in LangSmith:
- ❌ `FileStructureAnalysis` (separate trace)
- ❌ `DependencyAnalysis` (separate trace)  
- ❌ `PatternDetection` (separate trace)
- ❌ `FlowVisualization` (separate trace)
- ❌ `SchemaGeneration` (separate trace)

This made it impossible to see the entire documentation generation workflow as a unified process.

## Solution

We implemented **runnable config propagation** to ensure all agent chains inherit the parent runnable's tracing context.

### Key Changes

#### 1. Added `runnableConfig` to Agent Options

**File**: `src/types/agent.types.ts`

```typescript
import type { RunnableConfig } from '@langchain/core/runnables';

export interface AgentExecutionOptions {
  // ... other options
  
  /** Runnable config for LangSmith tracing context (passed from parent runnable) */
  runnableConfig?: RunnableConfig;
}
```

#### 2. Updated Agents to Accept Config

**Files**: All agent files (`*-agent.ts`)

```typescript
public async execute(
  context: AgentContext,
  options?: AgentExecutionOptions,
): Promise<AgentResult> {
  // Build analysis chain
  const analysisChain = this.buildAnalysisChain(context, options);

  // Execute analysis with parent runnable config for unified tracing
  const result = await analysisChain.invoke(
    {
      projectPath: context.projectPath,
      // ... other inputs
    },
    options?.runnableConfig, // <-- Pass config as second parameter!
  );
  
  // ...
}
```

#### 3. Updated Orchestrator to Pass Config

**File**: `src/orchestrator/documentation-orchestrator.ts`

```typescript
// Wrap agent execution in RunnableLambda for LangSmith tracing
const agentRunnable = RunnableLambda.from(
  async (ctx: AgentContext, config?: RunnableConfig): Promise<AgentResult> => {
    // Pass the runnable config down to the agent
    const agentOptions = {
      ...options.agentOptions,
      runnableConfig: config, // <-- Config is automatically passed by LangChain
    };

    // Execute agent with config
    return await agent.execute(ctx, agentOptions);
  },
).withConfig({
  runName: `Agent-${agentName}`,
  metadata: { agentName },
});
```

## How to Verify

### 1. Run Analysis with Tracing

```powershell
cd tech-debt-api
$env:ANTHROPIC_API_KEY="sk-ant-api03-..."
$env:LANGCHAIN_TRACING_V2="true"
$env:LANGCHAIN_API_KEY="lsv2_pt_..."
$env:LANGCHAIN_PROJECT="pr-giving-marines-87"
node ../architecture-doc-generator/dist/cli/index.js analyze --verbose
```

### 2. Check LangSmith Dashboard

Visit: https://smith.langchain.com/o/projects/pr-giving-marines-87

**Expected Trace Hierarchy**:

```
📊 DocumentationGeneration-Complete (Root)
├─ 🔍 DocumentationGeneration-ScanProjectStructure
├─ ⚙️  DocumentationGeneration-CreateExecutionContext
├─ 🤖 DocumentationGeneration-ExecuteAgents
│  ├─ 📁 Agent-file-structure
│  │  ├─ PrepareStructureData
│  │  ├─ BuildStructurePrompt
│  │  ├─ AnalyzeFileStructure (LLM)
│  │  └─ Parse Output
│  ├─ 📦 Agent-dependency-analyzer
│  ├─ 🎯 Agent-pattern-detector
│  ├─ 🔄 Agent-flow-visualization
│  └─ 📋 Agent-schema-generator
└─ 📝 DocumentationGeneration-AggregateResults
```

**Look for**:
- ✅ Single root trace named `DocumentationGeneration-Complete`
- ✅ All 5 agents nested under `ExecuteAgents` phase
- ✅ Each agent's internal chain steps visible
- ✅ All LLM calls properly nested

**Red flags** (config propagation failed):
- ❌ Multiple root traces with agent names
- ❌ No parent-child relationship

## Technical Details

### The Config Propagation Chain

```
DocumentationGeneration-Complete (Root Runnable)
  ↓ [config with callbacks]
DocumentationGeneration-ExecuteAgents (Phase 3)
  ↓ [config passed to agent wrapper]
Agent-file-structure (RunnableLambda)
  ↓ [config passed as second param]
agent.execute(context, { runnableConfig: config })
  ↓ [config passed to chain]
analysisChain.invoke(input, config)
  ↓ [all steps inherit callbacks]
FileStructureAnalysis (Internal Chain)
```

### Critical Pattern

```typescript
// ❌ WRONG - Creates separate trace
await childRunnable.invoke(input);

// ✅ CORRECT - Nested under parent
await childRunnable.invoke(input, parentConfig);
```

## Benefits Achieved

- ✅ Single unified trace showing entire workflow
- ✅ Clear execution order and timing
- ✅ Easy debugging (see exactly where failures occur)
- ✅ Aggregate token usage tracking
- ✅ Performance bottleneck identification
- ✅ Consistent with tech-debt-api patterns

---

**Status**: ✅ Implemented and tested  
**Last Updated**: October 27, 2025

## Visual Representation

```
DocumentationGeneration-Complete (Root Trace)
├── metadata: { projectPath, timestamp }
│
├─┬ DocumentationGeneration-ScanProjectStructure
│ ├── Scanner.scan()
│ ├── Detect languages (yaml, typescript, json, etc.)
│ └── Build file tree (1000 files, 92 directories)
│
├─┬ DocumentationGeneration-CreateExecutionContext
│ ├── Initialize AgentContext
│ ├── Set token budget (100,000 tokens)
│ └── Prepare language hints
│
├─┬ DocumentationGeneration-ExecuteAgents
│ │
│ ├─┬ Agent-file-structure
│ │ ├── metadata: { agentName, refinementEnabled: false }
│ │ ├── Analyze project structure
│ │ ├── Detect patterns (module pattern, layered architecture)
│ │ ├── Token usage: { input: 5234, output: 3456, total: 8690 }
│ │ └── Result: { summary, markdown, confidence: 82% }
│ │
│ ├─┬ Agent-dependency-analyzer
│ │ ├── metadata: { agentName, refinementEnabled: false }
│ │ ├── Parse package.json
│ │ ├── Analyze dependencies (NestJS, Prisma, LangChain)
│ │ ├── Detect version conflicts
│ │ ├── Token usage: { input: 4123, output: 2987, total: 7110 }
│ │ └── Result: { summary, markdown, confidence: 78% }
│ │
│ ├─┬ Agent-pattern-detector
│ │ ├── metadata: { agentName, refinementEnabled: false }
│ │ ├── Detect architectural patterns
│ │ │   ├── Repository Pattern (95% confidence)
│ │ │   ├── Dependency Injection (90% confidence)
│ │ │   └── Factory Pattern (85% confidence)
│ │ ├── Identify anti-patterns
│ │ ├── Token usage: { input: 6789, output: 4321, total: 11110 }
│ │ └── Result: { summary, markdown, confidence: 72% }
│ │
│ ├─┬ Agent-flow-visualization
│ │ ├── metadata: { agentName, refinementEnabled: false }
│ │ ├── Map data flows
│ │ ├── Identify service interactions
│ │ ├── Generate Mermaid diagrams
│ │ ├── Token usage: { input: 5678, output: 3210, total: 8888 }
│ │ └── Result: { summary, markdown, confidence: 72% }
│ │
│ └─┬ Agent-schema-generator
│   ├── metadata: { agentName, refinementEnabled: false }
│   ├── Find schema files (Prisma, JSON Schema)
│   ├── Document database models
│   ├── Token usage: { input: 2345, output: 1234, total: 3579 }
│   └── Result: { summary, markdown, confidence: 25% }
│
└─┬ DocumentationGeneration-AggregateResults
  ├── Integrate agent results
  ├── Generate 14 markdown files
  │   ├── index.md
  │   ├── architecture.md
  │   ├── file-structure.md
  │   ├── dependencies.md
  │   ├── patterns.md
  │   ├── flows.md
  │   ├── schemas.md
  │   ├── code-quality.md
  │   ├── recommendations.md
  │   ├── metadata.md
  │   └── agent-specific files (5)
  └── Total tokens: 39,377
```

## With Iterative Refinement Enabled

```
DocumentationGeneration-Complete (Root Trace)
│
├─┬ DocumentationGeneration-ExecuteAgents
│ │
│ ├─┬ Agent-pattern-detector
│ │ ├── metadata: { agentName, refinementEnabled: true }
│ │ │
│ │ ├─┬ Iteration-1 (Initial Execution)
│ │ │ ├── agent.execute()
│ │ │ ├── Clarity evaluation: 72%
│ │ │ ├── Result: { patterns: [...], confidence: 72% }
│ │ │ └── Below threshold (80%) → Continue refinement
│ │ │
│ │ ├─┬ ClarityEvaluator-GenerateFollowUpQuestions
│ │ │ ├── Analyze unclear sections
│ │ │ ├── Generate 3 follow-up questions:
│ │ │ │   1. "How are dependency injection containers configured?"
│ │ │ │   2. "What factory pattern implementations exist?"
│ │ │ │   3. "Are there examples of the observer pattern?"
│ │ │ └── Token usage: { input: 1234, output: 567, total: 1801 }
│ │ │
│ │ ├─┬ Iteration-2 (Refinement)
│ │ │ ├── agent.execute() with follow-up context
│ │ │ ├── Clarity evaluation: 78%
│ │ │ ├── Improvement: +8.3% ✅
│ │ │ ├── Result: { patterns: [...], confidence: 78% }
│ │ │ └── Below threshold but improved → Continue
│ │ │
│ │ ├─┬ ClarityEvaluator-GenerateFollowUpQuestions
│ │ │ └── Generate 2 follow-up questions
│ │ │
│ │ ├─┬ Iteration-3 (Refinement)
│ │ │ ├── agent.execute() with refinement context
│ │ │ ├── Clarity evaluation: 72%
│ │ │ ├── Improvement: -7.7% ❌ (regression)
│ │ │ └── No improvement → Stop refinement
│ │ │
│ │ └─┬ Refinement-Decision
│ │   ├── Choose best iteration: Iteration-2 (78%)
│ │   ├── Discard Iteration-3 (regression)
│ │   └── Final result: Iteration-2 output
│ │
│ └── ... other agents ...
│
└── DocumentationGeneration-AggregateResults
```

## Metadata Captured

### Root Trace Metadata
```json
{
  "projectPath": "d:\\Projekte\\Ritech\\TechDebt\\tech-debt-api",
  "timestamp": "2025-10-27T10:30:45.123Z",
  "totalAgents": 5,
  "refinementEnabled": false
}
```

### Agent Trace Metadata
```json
{
  "agentName": "pattern-detector",
  "refinementEnabled": true,
  "iterations": 3,
  "chosenIteration": 2,
  "clarityScores": [72, 78, 72],
  "improvementPercentages": [0, 8.3, -7.7],
  "tokenUsage": {
    "inputTokens": 20547,
    "outputTokens": 13234,
    "totalTokens": 33781
  }
}
```

### Refinement Iteration Metadata
```json
{
  "iterationNumber": 2,
  "clarityScore": 78,
  "improvement": 8.3,
  "followUpQuestions": 3,
  "unclearSections": ["Factory Pattern", "Observer Pattern"],
  "tokenUsage": {
    "inputTokens": 6789,
    "outputTokens": 4321,
    "totalTokens": 11110
  }
}
```

## Comparison with tech-debt-api PR Analysis

### Similarities
1. **Root RunnableSequence**: Both use `.withConfig({ runName: 'X-Complete' })`
2. **Nested RunnableLambda**: Each step wrapped for granular tracing
3. **RunnableParallel**: Both support parallel execution (tech-debt-api uses it for time estimation)
4. **Metadata enrichment**: Both attach context to traces

### Differences
| Feature | tech-debt-api PR Analysis | architecture-doc-generator |
|---------|---------------------------|---------------------------|
| **Parallel execution** | `RunnableParallel` for ideal/actual time | Sequential agents (can be parallelized) |
| **Caching** | Qdrant vector store caching | No caching (generates fresh) |
| **Refinement** | Single-pass analysis | Optional iterative refinement |
| **Output** | Single JSON object | 14 markdown files |
| **Agent count** | 3 (description, ideal time, actual time) | 5 (file-structure, dependency, pattern, flow, schema) |

## LangSmith Dashboard Views

### Run View
Shows the execution timeline:
```
DocumentationGeneration-Complete ████████████████████████ 45.2s
├─ ScanProjectStructure         ██ 1.2s
├─ CreateExecutionContext       █ 0.3s
├─ ExecuteAgents               █████████████████████ 42.8s
│  ├─ Agent-file-structure     ████████ 8.5s
│  ├─ Agent-dependency-analyzer ███████ 7.2s
│  ├─ Agent-pattern-detector   ██████████ 10.1s
│  ├─ Agent-flow-visualization █████████ 9.5s
│  └─ Agent-schema-generator   ███████ 7.5s
└─ AggregateResults            █ 0.9s
```

### Token Usage View
```
Total Tokens: 39,377
├─ ScanProjectStructure: 0 (no LLM)
├─ CreateExecutionContext: 0 (no LLM)
├─ ExecuteAgents: 39,377
│  ├─ Agent-file-structure: 8,690 (22%)
│  ├─ Agent-dependency-analyzer: 7,110 (18%)
│  ├─ Agent-pattern-detector: 11,110 (28%)
│  ├─ Agent-flow-visualization: 8,888 (23%)
│  └─ Agent-schema-generator: 3,579 (9%)
└─ AggregateResults: 0 (no LLM)
```

### Cost Tracking (Anthropic Claude 3.5 Sonnet)
```
Input Tokens:  24,169 × $0.003/1K  = $0.072
Output Tokens: 15,208 × $0.015/1K  = $0.228
Total Cost:                          $0.300
```

## Benefits for Debugging

### 1. Identify Slow Agents
Immediately see which agent takes the most time:
```
pattern-detector: 10.1s (slowest)
flow-visualization: 9.5s
file-structure: 8.5s
schema-generator: 7.5s
dependency-analyzer: 7.2s (fastest)
```

### 2. Token Budget Management
See which agent uses the most tokens:
```
pattern-detector: 11,110 tokens (28% of budget)
flow-visualization: 8,888 tokens (23%)
file-structure: 8,690 tokens (22%)
```

### 3. Refinement Impact
Track improvement across iterations:
```
file-structure: 82% → 78% → 78% (no improvement, stopped)
dependency-analyzer: 78% → 78% → 78% (stable)
pattern-detector: 72% → 78% → 72% (chose iteration 2, +8.3%)
flow-visualization: 72% → 78% → 78% (+8.3%, then stable)
schema-generator: 25% → 25% → 25% (no files to analyze)
```

### 4. Error Tracking
See which agent failed and why:
```
Agent-schema-generator
├─ Error: No schema files found
├─ Fallback: Generate empty documentation
└─ Status: Completed with warnings
```

## Next Steps

1. **View traces**: https://smith.langchain.com/o/projects/pr-giving-marines-87
2. **Analyze performance**: Identify bottlenecks in agent execution
3. **Optimize token usage**: Reduce input tokens for expensive agents
4. **Enable refinement**: Test iterative improvement with `--refinement`
5. **Parallel execution**: Implement `RunnableParallel` for independent agents
