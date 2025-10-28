# Performance Optimizations for Agent Self-Refinement

## Overview

The agent self-refinement workflow has been optimized to address slow execution times (~60 seconds per iteration). These optimizations provide multiple speed/quality trade-offs.

## Key Optimizations

### 1. Fast Path Execution ⚡

**Skip self-refinement entirely** for ~3x speed improvement:

```typescript
const workflowConfig = {
  skipSelfRefinement: true, // ~20 seconds vs ~60 seconds
  // ... other options
};
```

**When to use**:
- Initial project exploration
- CI/CD pipelines with strict time limits
- Large projects where full refinement would take too long

**Trade-offs**:
- No iterative improvement
- Confidence score fixed at 0.8
- No self-generated questions or gap identification

### 2. Reduced Iterations

**Default changed from 3 to 2 iterations**:

```typescript
maxIterations: 2, // Was 3 - saves ~20-30 seconds
```

**Impact**:
- 33% faster refinement phase
- Still allows one refinement cycle
- Sufficient for most analyses

### 3. Lower Clarity Threshold

**Default changed from 80 to 75**:

```typescript
clarityThreshold: 75, // Was 80 - exits faster
```

**Impact**:
- Agents accept "good enough" results sooner
- Reduces unnecessary refinement iterations
- ~15-20 second savings on average

### 4. Limited Question Generation

**Max questions per iteration: 3** (configurable):

```typescript
maxQuestionsPerIteration: 3, // Limit questions for speed
```

**Optimizations in question generation**:
- Truncate current analysis to 500 chars for context
- Limit gaps considered to top 3
- Reduced maxTokens from 2000 to 1500
- Enforce hard limit on parsed questions

**Impact**:
- Faster LLM invocations
- More focused questions
- ~10 second savings per iteration

### 5. Evaluation Timeout

**Optional timeout for evaluation step**:

```typescript
evaluationTimeout: 15000, // 15 second timeout
```

**Note**: Not yet implemented, planned for future version.

## Performance Comparison

### Before Optimizations
```
Initial Analysis:     ~15-20 seconds
Iteration 1:
  ├─ Evaluate:        ~10 seconds
  ├─ Questions:       ~15 seconds
  └─ Refine:          ~20 seconds
Iteration 2:          ~45 seconds
Iteration 3:          ~45 seconds
────────────────────────────────────
TOTAL:                ~150-180 seconds (2.5-3 minutes)
```

### After Optimizations (Default)
```
Initial Analysis:     ~15-20 seconds
Iteration 1:
  ├─ Evaluate:        ~10 seconds
  ├─ Questions:       ~8 seconds (optimized)
  └─ Refine:          ~15 seconds
Iteration 2:          ~33 seconds
────────────────────────────────────
TOTAL:                ~68-88 seconds (~1-1.5 minutes)
```

### After Optimizations (Fast Path)
```
Initial Analysis:     ~15-20 seconds
────────────────────────────────────
TOTAL:                ~15-20 seconds
```

## Configuration Presets

### 1. Maximum Quality (Slow)
```typescript
{
  maxIterations: 3,
  clarityThreshold: 85,
  minImprovement: 10,
  enableSelfQuestioning: true,
  skipSelfRefinement: false,
  maxQuestionsPerIteration: 5,
}
// Time: ~2-3 minutes per agent
// Quality: Highest
```

### 2. Balanced (Default)
```typescript
{
  maxIterations: 2,
  clarityThreshold: 75,
  minImprovement: 5,
  enableSelfQuestioning: true,
  skipSelfRefinement: false,
  maxQuestionsPerIteration: 3,
}
// Time: ~1-1.5 minutes per agent
// Quality: Good
```

### 3. Fast (Speed Priority)
```typescript
{
  maxIterations: 1,
  clarityThreshold: 70,
  minImprovement: 5,
  enableSelfQuestioning: true,
  skipSelfRefinement: false,
  maxQuestionsPerIteration: 2,
}
// Time: ~30-45 seconds per agent
// Quality: Acceptable
```

### 4. Ultra Fast (No Refinement)
```typescript
{
  skipSelfRefinement: true,
  // Other options ignored
}
// Time: ~15-20 seconds per agent
// Quality: Baseline (no improvement)
```

## Per-Agent Customization

Each agent can override defaults:

```typescript
export class FileStructureAgent extends BaseAgentWorkflow {
  public async execute(context: AgentContext, options?: AgentExecutionOptions) {
    const workflowConfig = {
      maxIterations: 2,
      clarityThreshold: 75,
      skipSelfRefinement: false,
      maxQuestionsPerIteration: 3,
    };
    
    return this.executeWorkflow(context, workflowConfig, options?.runnableConfig);
  }
}
```

## Parallel Processing

**Note**: The workflow supports parallel execution at the **orchestrator level**, not within individual agents.

### Orchestrator-Level Parallelism

```typescript
// In DocumentationOrchestrator
const agentResults = await Promise.all(
  independentAgents.map(agent => agent.execute(context, options))
);
```

**Benefits**:
- Multiple agents run simultaneously
- ~40-60% faster for 6 agents
- Total time = slowest agent, not sum of all

**Limitations**:
- Requires sufficient LLM API rate limits
- Higher token usage rate
- May hit rate limits on free tiers

### Agent-Internal Parallelism

**Not recommended** because:
- Self-refinement is inherently sequential (analyze → evaluate → question → refine → repeat)
- Each step depends on previous results
- Parallelizing would break the improvement loop

## Best Practices

### 1. Use Fast Path for Initial Scans
```typescript
// First run - explore the project
skipSelfRefinement: true  // ~15-20 seconds per agent

// Second run - deep analysis on specific areas
skipSelfRefinement: false // ~60-90 seconds per agent
```

### 2. Adjust Based on Project Size
```typescript
if (fileCount < 50) {
  // Small project - can afford quality
  maxIterations: 3;
  clarityThreshold: 80;
} else if (fileCount < 500) {
  // Medium project - balanced
  maxIterations: 2;
  clarityThreshold: 75;
} else {
  // Large project - speed priority
  maxIterations: 1;
  clarityThreshold: 70;
}
```

### 3. Monitor LangSmith Traces

Check execution times per node:
- **analyzeInitialNode**: Should be ~15-20s
- **evaluateClarityNode**: Should be ~8-10s
- **generateQuestionsNode**: Should be ~5-8s (after optimization)
- **refineAnalysisNode**: Should be ~15-20s

If any node is slower, investigate:
- Token limits too high?
- Too much context being passed?
- Network latency issues?

### 4. Use Environment-Specific Configs

```typescript
// .env.development
AGENT_MAX_ITERATIONS=1
AGENT_CLARITY_THRESHOLD=70
AGENT_SKIP_REFINEMENT=true

// .env.production
AGENT_MAX_ITERATIONS=2
AGENT_CLARITY_THRESHOLD=75
AGENT_SKIP_REFINEMENT=false
```

## Token Usage Impact

### Default Configuration
```
Initial:     ~4,000 tokens input, ~2,000 output
Evaluation:  ~2,000 tokens input, ~500 output
Questions:   ~1,500 tokens input, ~300 output
Refinement:  ~4,500 tokens input, ~2,000 output
────────────────────────────────────
Per iteration:   ~8,000 tokens input, ~2,800 output
Total (2 iter):  ~20,000 tokens input, ~7,600 output
```

### Fast Path
```
Initial:     ~4,000 tokens input, ~2,000 output
────────────────────────────────────
Total:       ~4,000 tokens input, ~2,000 output
```

**Cost savings**: ~75% reduction in token usage with fast path

## Future Optimizations

### 1. Caching
- Cache analysis results for unchanged files
- Reuse evaluation scores across similar projects
- Store commonly asked questions

### 2. Streaming
- Stream analysis results as they're generated
- Don't wait for full completion
- Provide incremental updates to UI

### 3. Smart Skipping
- Auto-detect when refinement won't improve results
- Skip evaluation if analysis looks complete
- Early exit on high initial clarity scores

### 4. Model Selection
- Use faster models (GPT-4o-mini, Claude Haiku) for evaluation/questions
- Reserve slower models (GPT-4, Claude Opus) for main analysis
- Dynamic model selection based on complexity

## Monitoring & Debugging

### Enable Verbose Logging
```bash
node dist/cli/index.js generate ./project --verbose
```

### Check LangSmith Traces
```
https://smith.langchain.com/
→ Look for DocumentationGeneration-Complete trace
→ Expand to see agent-level traces
→ Check timing for each node
```

### Performance Metrics to Track
- Time per agent
- Time per iteration
- Time per node within workflow
- Token usage per step
- Clarity score progression
- Number of questions generated

## Conclusion

With these optimizations, the self-refinement workflow is **~2-3x faster** while maintaining good quality:

- **Fast path**: 15-20 seconds (3x faster)
- **Optimized refinement**: 60-90 seconds (2x faster)
- **Old implementation**: 150-180 seconds (baseline)

Choose the configuration that balances your speed and quality requirements. For most use cases, the **Balanced (Default)** preset provides the best trade-off.
