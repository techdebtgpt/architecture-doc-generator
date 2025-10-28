# Unified LangSmith Tracing Implementation

## Overview

The documentation orchestrator has been refactored to use **LangChain LCEL (LangChain Expression Language)** with `RunnableSequence` for unified LangSmith tracing. This ensures that all agent executions appear as nested operations within a single traceable workflow, matching the pattern used in `tech-debt-api` PR analysis.

## Architecture Pattern

### Before (Separate Traces)
Previously, each agent execution was a separate LangSmith trace:
- ❌ `file-structure` agent - Trace ID: abc123
- ❌ `dependency-analyzer` agent - Trace ID: def456
- ❌ `pattern-detector` agent - Trace ID: ghi789
- No parent-child relationship between traces
- Difficult to see full workflow in LangSmith

### After (Unified Trace)
Now, all operations appear within a single parent trace:
- ✅ `DocumentationGeneration-Complete` - Parent Trace
  - `DocumentationGeneration-ScanProjectStructure`
  - `DocumentationGeneration-CreateExecutionContext`
  - `DocumentationGeneration-ExecuteAgents`
    - `Agent-file-structure`
    - `Agent-dependency-analyzer`
    - `Agent-pattern-detector`
    - `Agent-flow-visualization`
    - `Agent-schema-generator`
  - `DocumentationGeneration-AggregateResults`

## Implementation Details

### 1. RunnableSequence Wrapper

The `generate()` method now delegates to `buildDocumentationRunnable()` which returns a `RunnableSequence`:

```typescript
async generate(
  projectPath: string,
  options: OrchestratorOptions = {},
): Promise<DocumentationOutput> {
  const documentationRunnable = this.buildDocumentationRunnable(projectPath, opts, startTime);
  const output = await documentationRunnable.invoke({ projectPath, options: opts });
  return output;
}
```

### 2. Four-Phase Pipeline

Each phase is wrapped in a `RunnableLambda` with `.withConfig({ runName })`:

```typescript
private buildDocumentationRunnable(projectPath, opts, startTime) {
  return RunnableSequence.from([
    // Phase 1: Scan project structure
    RunnableLambda.from(async (input) => {
      const scanResult = await this.scanner.scan({...});
      return { ...input, scanResult };
    }).withConfig({ runName: 'DocumentationGeneration-ScanProjectStructure' }),

    // Phase 2: Create execution context
    RunnableLambda.from(async (input) => {
      const context = await this.createContext(...);
      return { ...input, context };
    }).withConfig({ runName: 'DocumentationGeneration-CreateExecutionContext' }),

    // Phase 3: Execute agents
    RunnableLambda.from(async (input) => {
      const agentResults = await this.executeAgents(...);
      return { ...input, agentResults };
    }).withConfig({ runName: 'DocumentationGeneration-ExecuteAgents' }),

    // Phase 4: Aggregate results
    RunnableLambda.from(async (input) => {
      const output = this.aggregateResults(...);
      return output;
    }).withConfig({ runName: 'DocumentationGeneration-AggregateResults' }),
  ]).withConfig({
    runName: 'DocumentationGeneration-Complete',
    metadata: { projectPath, timestamp: new Date().toISOString() },
  });
}
```

### 3. Individual Agent Tracing

Each agent execution is wrapped in its own `RunnableLambda` for granular tracing:

```typescript
private async executeAgents(context, options) {
  for (const agent of agents) {
    const agentRunnable = RunnableLambda.from(
      async (ctx: AgentContext): Promise<AgentResult> => {
        if (refinementConfig.enabled) {
          return await this.executeAgentWithRefinement(agent, ctx, options, refinementConfig);
        } else {
          return await agent.execute(ctx, options.agentOptions);
        }
      },
    ).withConfig({
      runName: `Agent-${agentName}`,
      metadata: {
        agentName,
        refinementEnabled: refinementConfig.enabled,
      },
    });

    const result = await agentRunnable.invoke(context);
    results.set(agentName, result);
  }
}
```

## Benefits

### 1. **Unified Observability**
- Single LangSmith trace shows entire documentation generation workflow
- Easy to see which agent took the most time
- Parent-child relationship shows execution order

### 2. **Consistent with tech-debt-api**
- Matches the pattern used in `contextual-pr-analysis.strategy.ts`
- Same architecture: `RunnableSequence.from([...])` with nested `RunnableLambda`
- Same metadata pattern for trace enrichment

### 3. **Debugging & Performance**
- Token usage visible per agent
- Refinement iterations appear as nested traces
- Clarity evaluation scores tracked in metadata

### 4. **Scalability**
- Easy to add parallel execution with `RunnableParallel` in future
- Can wrap refinement loops in their own RunnableSequence
- Supports complex multi-agent workflows

## Verification

### Test Command
```bash
cd tech-debt-api
$env:ANTHROPIC_API_KEY="sk-ant-api03-..."
$env:LANGCHAIN_TRACING_V2="true"
$env:LANGCHAIN_API_KEY="lsv2_pt_..."
$env:LANGCHAIN_PROJECT="pr-giving-marines-87"
node ../architecture-doc-generator/dist/cli/index.js analyze --verbose
```

### Expected Output
```
✅ LangSmith tracing enabled - Project: pr-giving-marines-87
[Orchestrator] Executing agents...
[Orchestrator] Executing agent: file-structure
[Orchestrator] Executing agent: dependency-analyzer
[Orchestrator] Executing agent: pattern-detector
[Orchestrator] Executing agent: flow-visualization
[Orchestrator] Executing agent: schema-generator
✔ Documentation generation completed!
```

### LangSmith Dashboard
Check https://smith.langchain.com/o/projects/pr-giving-marines-87:
- Single trace: `DocumentationGeneration-Complete`
- 4 nested phases visible
- 5 agent executions under `ExecuteAgents` phase
- Full token usage and timing data

## Future Enhancements

### 1. Parallel Agent Execution
For agents without dependencies, use `RunnableParallel`:

```typescript
RunnableParallel.from({
  fileStructure: fileStructureAgentRunnable,
  patterns: patternDetectorRunnable,
  flows: flowVisualizationRunnable,
}).withConfig({ runName: 'DocumentationGeneration-ParallelAgents' })
```

### 2. Refinement Loop Tracing
Wrap each refinement iteration in a RunnableLambda:

```typescript
for (let iteration = 1; iteration <= maxIterations; iteration++) {
  const refinementRunnable = RunnableLambda.from(async () => {
    // Clarity evaluation
    // Generate follow-up questions
    // Re-execute agent
    return refinedResult;
  }).withConfig({ runName: `Refinement-Iteration-${iteration}` });
  
  result = await refinementRunnable.invoke(context);
}
```

### 3. Cost Tracking
Add token usage metadata at each level:

```typescript
.withConfig({
  runName: 'Agent-file-structure',
  metadata: {
    inputTokens: result.tokenUsage.inputTokens,
    outputTokens: result.tokenUsage.outputTokens,
    totalCost: calculateCost(result.tokenUsage),
  },
})
```

## Related Files

- `src/orchestrator/documentation-orchestrator.ts` - Main implementation
- `src/llm/llm-service.ts` - LangSmith configuration
- `tech-debt-api/src/app/modules/code-analyzer/analyzers/v2/contextual-pr-analysis.strategy.ts` - Reference pattern

## References

- [LangChain LCEL Documentation](https://js.langchain.com/docs/expression_language/)
- [LangSmith Tracing](https://docs.smith.langchain.com/)
- [tech-debt-api PR Analysis Architecture](../tech-debt-api/src/app/modules/code-analyzer/V2_WORKFLOW_GUIDE.md)
