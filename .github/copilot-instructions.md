# Copilot Instructions for architecture-doc-generator

## Project Overview

This is an AI-powered architecture documentation generator that analyzes codebases in any programming language and generates comprehensive markdown documentation using LangChain, LLMs (Anthropic Claude, OpenAI, Google Gemini), and agentic workflows.

**Core Technologies**: TypeScript, LangChain LCEL, Anthropic Claude, LangSmith tracing, Multi-agent architecture

## Response Guidelines

### Documentation Files

**IMPORTANT**: Do NOT create markdown documentation files (like `.md` files in `docs/`) to describe actions, fixes, or changes UNLESS explicitly requested by the user.

**Examples of what NOT to do**:
- ❌ Creating `EMPTY_FILES_FIX.md` after fixing a bug (unless user asks for documentation)
- ❌ Creating `LANGSMITH_TRACE_HIERARCHY.md` after implementing tracing (unless user asks)
- ❌ Creating summary files after each fix or feature

**What to do instead**:
- ✅ Make the code changes
- ✅ Provide a summary in the chat
- ✅ Only create documentation files when user explicitly asks: "document this", "create a guide", "add documentation", etc.

### Code Style

- **Indentation**: 2 spaces
- **Import Order**: Alphabetical within groups (external → type imports → local)
- **Naming**: camelCase for variables/functions, PascalCase for classes/types/interfaces
- **Comments**: JSDoc for public APIs, inline comments for complex logic only

## Architecture Patterns

### Agent Development Pattern

All agents follow this structure:

```
src/agents/
├── agent.interface.ts          # Base agent interface
├── agent-registry.ts           # Agent registration and discovery
├── file-structure-agent.ts     # Example agent implementation
├── dependency-analyzer-agent.ts
├── pattern-detector-agent.ts
├── flow-visualization-agent.ts
└── schema-generator-agent.ts
```

**Agent Implementation Template**:

```typescript
export class MyAgent implements Agent {
  private llmService: LLMService;

  constructor() {
    this.llmService = LLMService.getInstance();
  }

  public getMetadata(): AgentMetadata {
    return {
      name: 'my-agent',
      version: '1.0.0',
      description: 'Does X, Y, and Z',
      priority: AgentPriority.MEDIUM,
      capabilities: { /* ... */ },
      tags: ['tag1', 'tag2'],
    };
  }

  public async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    const chain = this.buildAnalysisChain(context, options);
    
    // Pass config for unified LangSmith tracing
    const result = await chain.invoke(input, options?.runnableConfig);
    
    return {
      agentName: this.getMetadata().name,
      status: 'success',
      data: { /* ... */ },
      summary: '...',
      markdown: this.formatMarkdownReport(analysis),
      confidence: 0.9,
      tokenUsage: { /* ... */ },
      executionTime: Date.now() - startTime,
      errors: [],
      warnings: [],
      metadata: {},
    };
  }

  private buildAnalysisChain(_context: AgentContext, options?: AgentExecutionOptions) {
    const model = this.llmService.getChatModel({ temperature: 0.2 });

    return RunnableSequence.from([
      RunnableLambda.from(async (input) => {
        // Prepare data
        return processedInput;
      }).withConfig({ runName: 'PrepareData' }),

      RunnableLambda.from(async (input) => {
        // Build prompt
        return [systemPrompt, humanPrompt];
      }).withConfig({ runName: 'BuildPrompt' }),

      model.withConfig({ runName: 'LLMAnalysis' }),

      new StringOutputParser(),
    ]);
    // NOTE: No .withConfig() on the sequence itself - config passed via invoke()
  }
}
```

**Key Rules**:
1. **NO `.withConfig()` on the agent's `RunnableSequence`** - This creates separate traces
2. **Pass `options?.runnableConfig` to `.invoke()`** - Enables unified tracing
3. **Use `.withConfig()` on individual steps** - For granular trace visibility
4. **Return formatted markdown in `result.markdown`** - Used by multi-file formatter

### LangSmith Unified Tracing

**CRITICAL**: All agent chains MUST inherit the parent runnable's config for unified tracing.

**Pattern**:

```typescript
// In orchestrator
const agentRunnable = RunnableLambda.from(
  async (ctx: AgentContext, config?: RunnableConfig): Promise<AgentResult> => {
    const agentOptions = {
      ...options.agentOptions,
      runnableConfig: config, // Pass config down
    };
    return await agent.execute(ctx, agentOptions);
  },
).withConfig({ runName: `Agent-${agentName}` });

// In agent
const result = await analysisChain.invoke(input, options?.runnableConfig);
```

**Expected Trace Hierarchy**:
```
DocumentationGeneration-Complete
├── ScanProjectStructure
├── CreateExecutionContext
├── ExecuteAgents
│   ├── Agent-file-structure
│   │   ├── PrepareData
│   │   ├── BuildPrompt
│   │   └── LLMAnalysis
│   ├── Agent-dependency-analyzer
│   └── ...
└── AggregateResults
```

### LLM Service Usage

```typescript
// Get chat model
const model = LLMService.getChatModel({
  temperature: 0.2,  // 0-0.2 for deterministic, 0.5-0.8 for creative
  maxTokens: 4096,
});

// Token counting
const tokens = LLMService.countTokens(text);

// Configure LangSmith
LLMService.configureLangSmith(); // Called automatically in constructor
```

## Multi-File Formatter

Generates documentation files conditionally:

**Always Generated**:
- `index.md` - Table of contents
- `metadata.md` - Generation metadata
- Agent-specific files (if agent runs): `file-structure.md`, `dependencies.md`, etc.

**Conditionally Generated** (only if data exists):
- `architecture.md` - Only if `output.architecture.components.length > 0`
- `code-quality.md` - Only if there are quality issues or scores > 0
- `recommendations.md` - Only if there are recommendations

**Pattern**:

```typescript
// Only generate if there's data
if (output.codeQuality.improvements.length > 0) {
  const qualityPath = path.join(opts.outputDir, 'code-quality.md');
  await fs.writeFile(qualityPath, this.generateCodeQualityFile(output, opts), 'utf-8');
  generatedFiles.push(qualityPath);
}
```

## Testing Strategy

- Unit tests for agents: Mock `LLMService.getChatModel()`
- Mock agent execution: Test agent wrappers
- No real LLM calls in tests (use mocks)

```typescript
jest.mock('../llm/llm-service', () => ({
  LLMService: {
    getInstance: jest.fn(() => ({
      getChatModel: jest.fn(() => mockModel),
    })),
  },
}));
```

## Common Pitfalls to Avoid

1. ❌ **Don't add `.withConfig()` to agent's main RunnableSequence** - Creates separate traces
2. ❌ **Don't forget to pass `options?.runnableConfig` to `.invoke()`** - Breaks unified tracing
3. ❌ **Don't generate empty markdown files** - Check for data before writing
4. ❌ **Don't create documentation files without user request** - Keep responses in chat
5. ❌ **Don't use relative imports** - Use path aliases (configured in tsconfig)
6. ❌ **Don't hardcode API keys** - Use environment variables

## Key Files to Reference

- **Agent Interface**: `src/agents/agent.interface.ts`
- **Agent Registry**: `src/agents/agent-registry.ts`
- **Orchestrator**: `src/orchestrator/documentation-orchestrator.ts`
- **LLM Service**: `src/llm/llm-service.ts`
- **Multi-File Formatter**: `src/formatters/multi-file-markdown-formatter.ts`
- **Type Definitions**: `src/types/agent.types.ts`, `src/types/output.types.ts`

## Development Workflow

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/cli/index.js analyze /path/to/project

# Run with LangSmith tracing
LANGCHAIN_TRACING_V2=true \
LANGCHAIN_API_KEY=lsv2_pt_... \
LANGCHAIN_PROJECT=my-project \
ANTHROPIC_API_KEY=sk-ant-... \
node dist/cli/index.js analyze /path/to/project --verbose

# Lint
npm run lint:fix

# Test
npm test
```

## Response Format

When implementing features or fixes:

1. **Explain what you're doing** (1-2 sentences)
2. **Make the code changes** (use tools)
3. **Build and test** if appropriate
4. **Summarize results** in chat (not in a new .md file)
5. **ONLY create documentation files if explicitly requested**

## Example Interactions

**Good** ✅:
```
User: "Fix the empty files issue"
Assistant: I'll modify the formatter to skip empty files...
[makes code changes]
[tests]
"Done! Now generates 11 files instead of 14, skipping empty architecture.md, 
code-quality.md, and recommendations.md"
```

**Bad** ❌:
```
User: "Fix the empty files issue"
Assistant: I'll fix this and document it...
[makes code changes]
[creates EMPTY_FILES_FIX.md]
[creates EMPTY_FILES_SOLUTION.md]
"Done! I've created documentation explaining the fix."
```

---

**Remember**: Code first, documentation only when requested!
