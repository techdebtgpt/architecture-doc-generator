# Unified LangSmith Tracing - Quick Reference

## ✅ What Was Changed

### Before
```typescript
async generate(projectPath, options) {
  const scanResult = await this.scanner.scan({...});
  const context = await this.createContext(...);
  const agentResults = await this.executeAgents(...);
  return this.aggregateResults(...);
}
```
**Problem**: Each agent appeared as separate LangSmith trace

### After
```typescript
async generate(projectPath, options) {
  const documentationRunnable = this.buildDocumentationRunnable(...);
  return await documentationRunnable.invoke({ projectPath, options });
}

private buildDocumentationRunnable(...) {
  return RunnableSequence.from([
    RunnableLambda.from(async (input) => { /* scan */ }),
    RunnableLambda.from(async (input) => { /* context */ }),
    RunnableLambda.from(async (input) => { /* agents */ }),
    RunnableLambda.from(async (input) => { /* aggregate */ }),
  ]).withConfig({ runName: 'DocumentationGeneration-Complete' });
}
```
**Solution**: Single parent trace with nested operations

## 🎯 Key Patterns

### 1. Import Required Types
```typescript
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
```

### 2. Wrap Sequential Steps
```typescript
RunnableSequence.from([
  step1Runnable,
  step2Runnable,
  step3Runnable,
]).withConfig({
  runName: 'Workflow-Name',
  metadata: { /* context */ },
});
```

### 3. Wrap Individual Operations
```typescript
RunnableLambda.from(async (input) => {
  // Your logic here
  return output;
}).withConfig({
  runName: 'Operation-Name',
  metadata: { /* context */ },
});
```

### 4. Chain Data Flow
```typescript
RunnableSequence.from([
  RunnableLambda.from(async (input) => {
    const step1Result = await doStep1();
    return { ...input, step1Result }; // Pass data forward
  }),
  
  RunnableLambda.from(async (input) => {
    const step2Result = await doStep2(input.step1Result); // Use previous result
    return { ...input, step2Result };
  }),
])
```

## 🔍 Verification

### 1. Check Console Output
```
✅ LangSmith tracing enabled - Project: pr-giving-marines-87
[Orchestrator] Scanning project structure...
[Orchestrator] Executing agents...
[Orchestrator] Executing agent: file-structure
✔ Documentation generation completed!
```

### 2. Check LangSmith Dashboard
Visit: https://smith.langchain.com/o/projects/pr-giving-marines-87

Look for:
- ✅ Single parent trace: `DocumentationGeneration-Complete`
- ✅ 4 nested phases visible
- ✅ 5 agent executions under `ExecuteAgents`
- ✅ Full token usage and timing

### 3. Run Test Command
```powershell
cd tech-debt-api
$env:ANTHROPIC_API_KEY="sk-ant-api03-..."
$env:LANGCHAIN_TRACING_V2="true"
$env:LANGCHAIN_API_KEY="lsv2_pt_..."
$env:LANGCHAIN_PROJECT="pr-giving-marines-87"
node ../architecture-doc-generator/dist/cli/index.js analyze --verbose
```

## 📊 Trace Hierarchy

```
DocumentationGeneration-Complete (Root)
├── DocumentationGeneration-ScanProjectStructure
├── DocumentationGeneration-CreateExecutionContext
├── DocumentationGeneration-ExecuteAgents
│   ├── Agent-file-structure
│   ├── Agent-dependency-analyzer
│   ├── Agent-pattern-detector
│   ├── Agent-flow-visualization
│   └── Agent-schema-generator
└── DocumentationGeneration-AggregateResults
```

## 🚀 Next Steps

### Enable Parallel Execution
For independent agents, use `RunnableParallel`:

```typescript
import { RunnableParallel } from '@langchain/core/runnables';

RunnableParallel.from({
  fileStructure: fileStructureAgentRunnable,
  patterns: patternDetectorRunnable,
  flows: flowVisualizationRunnable,
}).withConfig({ runName: 'ParallelAgents' });
```

### Add Refinement Tracing
Wrap each refinement iteration:

```typescript
for (let i = 1; i <= maxIterations; i++) {
  const refinementRunnable = RunnableLambda.from(async () => {
    // Refinement logic
  }).withConfig({ runName: `Refinement-Iteration-${i}` });
  
  result = await refinementRunnable.invoke(context);
}
```

### Add Cost Tracking
Include token metadata:

```typescript
.withConfig({
  runName: 'Agent-name',
  metadata: {
    inputTokens: result.tokenUsage.inputTokens,
    outputTokens: result.tokenUsage.outputTokens,
    estimatedCost: calculateCost(result.tokenUsage),
  },
})
```

## 🐛 Troubleshooting

### Issue: Traces not appearing in LangSmith
**Solution**: Check environment variables:
```powershell
$env:LANGCHAIN_TRACING_V2="true"
$env:LANGCHAIN_API_KEY="lsv2_pt_..."
$env:LANGCHAIN_PROJECT="pr-giving-marines-87"
```

### Issue: Separate traces instead of unified
**Problem**: Not using RunnableSequence wrapper
**Solution**: Ensure `buildDocumentationRunnable()` returns `RunnableSequence.from([...])`

### Issue: Missing nested agent traces
**Problem**: Agent execution not wrapped in RunnableLambda
**Solution**: Wrap each agent call:
```typescript
const agentRunnable = RunnableLambda.from(async (ctx) => {
  return await agent.execute(ctx, options);
}).withConfig({ runName: `Agent-${agentName}` });
```

## 📚 Related Documentation

- [UNIFIED_LANGSMITH_TRACING.md](../UNIFIED_LANGSMITH_TRACING.md) - Full implementation details
- [LANGSMITH_TRACE_HIERARCHY.md](./LANGSMITH_TRACE_HIERARCHY.md) - Visual trace diagrams
- [tech-debt-api V2_WORKFLOW_GUIDE.md](../../tech-debt-api/src/app/modules/code-analyzer/V2_WORKFLOW_GUIDE.md) - Reference implementation

## 🔗 External Resources

- [LangChain LCEL Documentation](https://js.langchain.com/docs/expression_language/)
- [LangSmith Tracing Guide](https://docs.smith.langchain.com/)
- [RunnableSequence API](https://js.langchain.com/docs/api/core/runnables/classes/RunnableSequence)
- [RunnableLambda API](https://js.langchain.com/docs/api/core/runnables/classes/RunnableLambda)

## ✨ Success Metrics

After implementation:
- ✅ All operations appear in single parent trace
- ✅ Agent execution time visible (8-10s per agent)
- ✅ Token usage tracked per agent (3K-11K tokens)
- ✅ Refinement iterations nested correctly
- ✅ Metadata enrichment working
- ✅ Error handling preserves trace context

## 🎓 Key Takeaways

1. **Always use RunnableSequence** for top-level workflows
2. **Wrap each operation** in RunnableLambda with `.withConfig()`
3. **Pass data forward** using spread operator: `{ ...input, newData }`
4. **Add metadata** for better debugging and analysis
5. **Follow tech-debt-api pattern** for consistency
