# Copilot Instructions for architecture-doc-generator

## Project Overview

This is an AI-powered architecture documentation generator that analyzes codebases in any programming language and generates comprehensive markdown documentation using LangChain, LLMs (Anthropic Claude, OpenAI, Google Gemini), and agentic workflows.

**Core Technologies**: TypeScript, LangChain LCEL, Anthropic Claude, LangSmith tracing, Multi-agent architecture

## Response Guidelines

### Documentation Files

**CRITICAL RULE**: Do NOT create markdown documentation files (`.md` files) to summarize changes, fixes, or implementations UNLESS explicitly requested by the user.

**Examples of what NOT to do**:

- ❌ Creating `EMPTY_FILES_FIX.md` after fixing a bug
- ❌ Creating `LANGSMITH_TRACE_HIERARCHY.md` after implementing tracing
- ❌ Creating `LOGGING_MIGRATION_COMPLETE.md` after migration
- ❌ Creating `LOGGER_SINGLETON_REFACTOR.md` after refactoring
- ❌ Creating ANY summary `.md` file after changes/fixes/features
- ❌ Creating documentation files to "document what was done"

**What to do instead**:

- ✅ Make the code changes
- ✅ Provide a concise summary in the chat (2-3 sentences max)
- ✅ Show verification results (build/test/lint status)
- ✅ ONLY create documentation files when user explicitly asks: "document this", "create a guide", "add documentation for X", "write a README about Y"

**Why this matters**:

- Users want changes done, not documented
- Summaries clutter the repository
- Chat responses are sufficient for change tracking
- Documentation should be intentional, not automatic

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
├── agent.interface.ts            # Base agent interface
├── agent-registry.ts             # Agent registration and discovery
├── base-agent-workflow.ts        # Base class with logging and refinement
├── file-structure-agent.ts       # HIGH priority - Project organization
├── dependency-analyzer-agent.ts  # HIGH priority - Dependency analysis
├── architecture-analyzer-agent.ts # HIGH priority - Architecture design
├── pattern-detector-agent.ts     # MEDIUM priority - Design patterns
├── flow-visualization-agent.ts   # MEDIUM priority - Control/data flows
├── schema-generator-agent.ts     # MEDIUM priority - Data models
└── security-analyzer-agent.ts    # MEDIUM priority - Security vulnerabilities (NEW!)
```

**Agent Implementation Pattern** (uses BaseAgentWorkflow with LangGraph):

All agents extend `BaseAgentWorkflow` which provides:

- ✅ LangGraph self-refinement workflow (analyzeInitial → evaluateClarity → generateQuestions → retrieveFiles → refineAnalysis)
- ✅ Token tracking and budget management
- ✅ LangSmith tracing with proper runNames
- ✅ Agent-owned file generation via `generateFiles()`

**Required implementations**:

```typescript
export class MyCustomAgent extends BaseAgentWorkflow implements Agent {
  // 1. Agent metadata
  public getMetadata(): AgentMetadata {
    return {
      name: 'my-custom-agent',
      version: '1.0.0',
      description: 'What the agent does',
      priority: AgentPriority.MEDIUM,
      capabilities: {
        supportsParallel: false,
        requiresFileContents: true,
        estimatedTokens: 3000,
      },
      tags: ['tag1', 'tag2'],
    };
  }

  // 2. Execution checks
  public async canExecute(context: AgentContext): Promise<boolean> {
    return context.files.length > 0; // Your condition
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    return 2000 + context.files.length * 5; // Your estimation
  }

  // 3. Agent name (for tracing)
  protected getAgentName(): string {
    return this.getMetadata().name;
  }

  // 4. Prompts for LLM
  protected async buildSystemPrompt(context: AgentContext): Promise<string> {
    return `You are analyzing ${context.projectPath}...`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    return `Analyze these files:\n${context.files.join('\n')}`;
  }

  // 5. Parse LLM output
  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    // Parse JSON or structured output
    return JSON.parse(analysis);
  }

  // 6. Generate summary
  protected generateSummary(data: Record<string, unknown>): string {
    return `Found ${Object.keys(data).length} insights`;
  }

  // 7. Format markdown (backwards compat)
  protected async formatMarkdown(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<string> {
    return `# Analysis\n\n${JSON.stringify(data, null, 2)}`;
  }

  // 8. Generate files (NEW: agent-owned file generation)
  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    const markdown = await this.formatMarkdown(data, state);

    return [
      {
        filename: 'my-analysis.md',
        content: markdown,
        title: 'My Analysis',
        category: 'analysis',
        order: this.getMetadata().priority,
      },
      // Can return multiple files!
      // { filename: 'my-details.md', content: '...', title: 'Details' }
    ];
  }
}
```

**Key Benefits**:

- Self-refinement workflow handles iterative improvement automatically
- Token budget enforcement prevents runaway costs
- LangSmith traces show: `Agent-{name}` → `{name}-InitialAnalysis` → `{name}-EvaluateClarity` → `{name}-Refinement-{N}`
- Agent controls its own file generation (can produce multiple files)
- Backwards compatible via `markdown` field

### LangSmith Tracing (LangGraph Workflow)

**Architecture**: Agents use LangGraph self-refinement workflow with proper trace naming.

**Pattern**:

```typescript
// In orchestrator - passes runName to agent
const agentOptions: AgentExecutionOptions = {
  runnableConfig: {
    runName: `Agent-${agentName}`,
  },
};
const result = await agent.execute(context, agentOptions);

// In BaseAgentWorkflow - workflow inherits runName
const workflowConfig = {
  configurable: { thread_id, maxIterations, clarityThreshold },
  recursionLimit: 150,
  runName: runnableConfig?.runName || `Agent-${agentName}`,
  ...runnableConfig,
};
for await (const state of await this.workflow.stream(initialState, workflowConfig)) {
  // Process workflow states
}

// In workflow nodes - LLM calls have descriptive names
const result = await model.invoke([systemPrompt, humanPrompt], {
  runName: `${agentName}-InitialAnalysis`,
});
```

**Expected Trace Hierarchy**:

```
Agent-file-structure
├── file-structure-InitialAnalysis (LLM call)
├── file-structure-EvaluateClarity (LLM call)
├── file-structure-GenerateQuestions (LLM call, if refining)
├── file-structure-Refinement-1 (LLM call, if iterating)
└── file-structure-Refinement-2 (LLM call, if iterating)

Agent-dependency-analyzer
├── dependency-analyzer-InitialAnalysis
├── dependency-analyzer-EvaluateClarity
└── ...
```

**Key Points**:

- Top-level trace: `Agent-{agentName}` (from orchestrator)
- Node traces: `{agentName}-{NodeName}` (from LLM invocations)
- LangGraph workflow automatically manages state transitions
- All traces visible in LangSmith with proper hierarchy

### LLM Service Usage

```typescript
// Get chat model
const model = LLMService.getChatModel({
  temperature: 0.2, // 0-0.2 for deterministic, 0.5-0.8 for creative
  maxTokens: 4096,
});

// Token counting
const tokens = LLMService.countTokens(text);

// Configure LangSmith
LLMService.configureLangSmith(); // Called automatically in constructor
```

## Multi-File Formatter (Agent-Owned File Generation)

**Architecture Change**: Agents now own their file generation. Formatter has two responsibilities:

### 1. Agent Files (writeAgentFiles)

Agents control their own files via `generateFiles()` method:

```typescript
// In agent
protected async generateFiles(data, state): Promise<AgentFile[]> {
  return [
    { filename: 'file-structure.md', content: markdown, title: 'File Structure' },
    // Can generate multiple files per agent!
  ];
}

// In formatter
for (const [agentName, section] of output.customSections) {
  const files = section.files || [];  // NEW: From agent
  for (const file of files) {
    await fs.writeFile(path.join(dir, file.filename), file.content);
  }
}
```

**Agent Files Generated** (if agent runs and has content):

- `file-structure.md` - from file-structure agent
- `dependencies.md` - from dependency-analyzer agent
- `architecture.md` - from architecture-analyzer agent
- `patterns.md` - from pattern-detector agent
- `flows.md` - from flow-visualization agent
- `schemas.md` - from schema-generator agent (only if schemas found)
- `security.md` - from security-analyzer agent

### 2. Orchestrator Files (writeOrchestratorFiles)

Cross-cutting/generic files owned by orchestrator:

**Always Generated**:

- `index.md` - Dynamic TOC based on generated files
- `metadata.md` - Generation information
- `changelog.md` - Update history

**Conditionally Generated** (only if data exists):

- `recommendations.md` - Only if improvements or recommendations exist
- `code-quality.md` - Only if quality issues/scores present

```typescript
// Orchestrator owns generic files
if (output.codeQuality.improvements.length > 0) {
  await fs.writeFile(path.join(dir, 'code-quality.md'), this.generateCodeQualityFile(output, opts));
}
```

**Key Benefits**:

- Agents control their output (can generate multiple files)
- Clear separation: agents = specific analysis, orchestrator = generic/cross-cutting
- Dynamic index generation (adapts to agent files)

## Error Handling Patterns

All agents should implement consistent error handling with proper logging:

### Logging Levels

- **`debug`** - Expected failures (file not found, missing dependencies)
- **`warn`** - Recoverable failures (LLM parsing errors, analysis failures)
- **`error`** - Critical failures (agent execution crashes)

### Pattern

```typescript
try {
  const content = await fs.readFile(filePath, 'utf-8');
} catch (error) {
  this.logger.debug('Expected failure message', {
    error: error instanceof Error ? error.message : String(error),
    context: { filePath },
  });
  // Handle gracefully
}

try {
  const result = JSON.parse(llmOutput);
} catch (error) {
  this.logger.warn('Failed to parse LLM output', {
    error: error instanceof Error ? error.message : String(error),
    output: llmOutput.substring(0, 200),
  });
  // Fallback or retry
}
```

### Rules

1. **Never use `_error` prefix** - All caught errors should be logged
2. **Provide context** - Include relevant data (file paths, inputs, etc.)
3. **Type-safe error messages** - Use `error instanceof Error ? error.message : String(error)`
4. **Choose appropriate level** - `debug` for expected, `warn` for unexpected but recoverable
5. **Silent fallbacks only when acceptable** - TokenManager is an exception (estimation fallback)

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

1. ❌ **Don't forget to implement all abstract methods in BaseAgentWorkflow** - Missing `getAgentName()`, `buildSystemPrompt()`, etc. will cause errors
2. ❌ **Don't forget `generateFiles()` returns an array** - Even for single file, return `[{ filename, content, title }]`
3. ❌ **Don't generate empty files** - Check for data before returning files
4. ❌ **Don't create documentation files without user request** - Keep responses in chat
5. ❌ **Don't use relative imports** - Use path aliases (configured in tsconfig)
6. ❌ **Don't hardcode API keys** - Use `.archdoc.config.json` or environment variables
7. ❌ **Don't use `_error` prefix** - All errors should be logged with proper context
8. ❌ **Don't ignore caught errors** - Always log with `this.logger.debug()` or `this.logger.warn()`
9. ❌ **Don't forget to set runName in LLM invocations** - Needed for LangSmith trace hierarchy

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

# Setup configuration (first time only)
node dist/cli/index.js config --init
# OR manually create .archdoc.config.json from .archdoc.config.example.json

# Build
npm run build

# Run locally (uses .archdoc.config.json)
node dist/cli/index.js analyze /path/to/project

# Run with LangSmith tracing (configure in .archdoc.config.json or env vars)
# Via config file:
# {
#   "tracing": {
#     "enabled": true,
#     "apiKey": "lsv2_pt_...",
#     "project": "my-project"
#   },
#   "apiKeys": {
#     "anthropic": "sk-ant-..."
#   }
# }

# Or via environment variables (overrides config file):
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
