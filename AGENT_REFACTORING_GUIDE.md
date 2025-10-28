# Agent Refactoring Guide

## Template for Converting Agents to BaseAgentWorkflow

### 1. Update Imports

```typescript
// OLD
import { LLMService } from '../llm/llm-service';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

// NEW
import { BaseAgentWorkflow } from './base-agent-workflow';
// Remove: SystemMessage, HumanMessage imports
// Remove: LLMService import (inherited from base)
```

### 2. Update Class Declaration

```typescript
// OLD
export class MyAgent implements Agent {
  private llmService: LLMService;
  
  constructor() {
    this.llmService = LLMService.getInstance();
  }

// NEW
export class MyAgent extends BaseAgentWorkflow implements Agent {
  // No constructor needed - inherited from base
```

### 3. Keep Existing Methods

```typescript
// Keep these methods unchanged:
getMetadata(): AgentMetadata
canExecute(context: AgentContext): Promise<boolean>
estimateTokens(context: AgentContext): Promise<number>
```

### 4. Add Custom Execute (Optional)

```typescript
public async execute(
  context: AgentContext,
  options?: AgentExecutionOptions,
): Promise<AgentResult> {
  // Adaptive configuration - agent decides when analysis is complete
  const workflowConfig = {
    maxIterations: 10, // High limit - agent self-determines when satisfied
    clarityThreshold: 85, // High bar - ensures thorough analysis
    minImprovement: 3, // Accept small incremental improvements
    enableSelfQuestioning: true,
    skipSelfRefinement: false,
    maxQuestionsPerIteration: 2, // Focused questions
    evaluationTimeout: 15000,
  };

  return this.executeWorkflow(
    context,
    workflowConfig,
    options?.runnableConfig as Record<string, unknown> | undefined,
  );
}
```

### 5. Implement Abstract Methods

```typescript
// Extract agent name
protected getAgentName(): string {
  return 'my-agent-name'; // from metadata.name
}

// Convert buildSystemPrompt
protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
  // OLD: return new SystemMessage(`...`);
  // NEW: return `...` (just the string content)
  return `You are an expert...`;
}

// Convert buildHumanPrompt
protected async buildHumanPrompt(context: AgentContext): Promise<string> {
  // Extract any preparation logic from old execute()
  const data = await this.extractData(context);
  
  // OLD: return new HumanMessage(`...`);
  // NEW: return `...` (just the string content)
  return `Analyze this: ${JSON.stringify(data)}`;
}

// Implement parseAnalysis
protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
  // Reuse existing parseAnalysisResult() method
  return this.parseAnalysisResult(analysis);
}

// Implement formatMarkdown
protected async formatMarkdown(
  data: Record<string, unknown>,
  state: Record<string, unknown>,
): Promise<string> {
  const context = state.context as AgentContext;
  // Reuse existing formatMarkdownReport() method
  return this.formatMarkdownReport(data, context);
}

// Implement generateSummary
protected generateSummary(data: Record<string, unknown>): string {
  const analysis = data as { summary?: string };
  return analysis.summary || 'Analysis completed';
}
```

### 6. Keep Helper Methods

```typescript
// Keep all private helper methods:
private extractData(context: AgentContext): Promise<any>
private parseAnalysisResult(result: string): any
private formatMarkdownReport(analysis: any, context: AgentContext): string
// etc.
```

### 7. Remove Obsolete Methods

```typescript
// DELETE: Old execute() implementation with direct LLM invocation
// DELETE: createErrorResult() - handled by base class
// DELETE: Any buildAnalysisChain() methods
```

## Example: Before and After

### Before (Old Pattern)

```typescript
export class DependencyAnalyzerAgent implements Agent {
  private llmService: LLMService;

  constructor() {
    this.llmService = LLMService.getInstance();
  }

  public async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      const data = await this.extractDependencies(context);
      const model = this.llmService.getChatModel({...});
      const systemPrompt = this.buildSystemPrompt();
      const humanPrompt = this.buildHumanPrompt({...});
      const llmResult = await model.invoke([systemPrompt, humanPrompt]);
      const analysis = this.parseAnalysisResult(llmResult);
      return {
        agentName: 'dependency-analyzer',
        status: 'success',
        data: analysis,
        summary: analysis.summary,
        markdown: this.formatMarkdownReport(analysis, data),
        // ...
      };
    } catch (error) {
      return this.createErrorResult(error, ...);
    }
  }

  private buildSystemPrompt(): SystemMessage {
    return new SystemMessage(`You are an expert...`);
  }

  private buildHumanPrompt(input: any): HumanMessage {
    return new HumanMessage(`Analyze: ${input.data}`);
  }

  private parseAnalysisResult(result: string): any {...}
  private formatMarkdownReport(analysis: any, data: any): string {...}
}
```

### After (New Pattern with Self-Refinement)

```typescript
export class DependencyAnalyzerAgent extends BaseAgentWorkflow implements Agent {
  // No constructor - inherited

  public async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    const workflowConfig = {
      maxIterations: 10,
      clarityThreshold: 85,
      minImprovement: 3,
      enableSelfQuestioning: true,
      maxQuestionsPerIteration: 2,
    };
    
    return this.executeWorkflow(
      context,
      workflowConfig,
      options?.runnableConfig as Record<string, unknown> | undefined,
    );
  }

  // Abstract method implementations
  protected getAgentName(): string {
    return 'dependency-analyzer';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert...`; // Same content, just string
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const data = await this.extractDependencies(context);
    return `Analyze: ${JSON.stringify(data)}`; // Same content, just string
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    return this.parseAnalysisResult(analysis);
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    state: Record<string, unknown>,
  ): Promise<string> {
    const context = state.context as AgentContext;
    return this.formatMarkdownReport(data as any, context);
  }

  protected generateSummary(data: Record<string, unknown>): string {
    return (data as any).summary || 'Dependency analysis completed';
  }

  // Keep all helper methods unchanged
  private async extractDependencies(context: AgentContext): Promise<any> {...}
  private parseAnalysisResult(result: string): any {...}
  private formatMarkdownReport(analysis: any, context: AgentContext): string {...}
}
```

## Key Benefits

1. **Adaptive Refinement**: Agent refines until it's satisfied (up to 10 iterations)
2. **Self-Evaluation**: Agent evaluates its own work on 4 dimensions
3. **Incremental Improvement**: Small, focused improvements per iteration
4. **LangSmith Tracing**: Full visibility into refinement process
5. **Consistency**: All agents follow same pattern

## Checklist for Each Agent

- [ ] Update imports (add BaseAgentWorkflow, remove LLMService)
- [ ] Change class declaration (extends BaseAgentWorkflow)
- [ ] Remove constructor
- [ ] Keep getMetadata(), canExecute(), estimateTokens()
- [ ] Add custom execute() with workflowConfig
- [ ] Implement getAgentName()
- [ ] Convert buildSystemPrompt() to return string
- [ ] Convert buildHumanPrompt() to return string
- [ ] Implement parseAnalysis() (reuse existing method)
- [ ] Implement formatMarkdown() (reuse existing method)
- [ ] Implement generateSummary()
- [ ] Keep all private helper methods
- [ ] Remove old execute() implementation
- [ ] Remove createErrorResult()
- [ ] Fix any TypeScript errors
- [ ] Test agent execution
