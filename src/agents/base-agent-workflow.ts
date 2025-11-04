import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import type { AgentContext, AgentResult, AgentFile } from '../types/agent.types';
import { LLMService } from '../llm/llm-service';
import { Logger } from '../utils/logger';
import { Retry } from '../utils/retry';
import { FileSearchService } from './file-search-service';

/**
 * Agent internal state for self-refinement workflow
 */
export const AgentWorkflowState = Annotation.Root({
  // Input
  context: Annotation<AgentContext>({
    reducer: (_, update) => update,
  }),

  // Current iteration
  iteration: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  // Analysis results
  currentAnalysis: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),

  // Self-evaluation
  missingInformation: Annotation<string[]>({
    reducer: (_, update) => update, // Changed: replace instead of accumulate to avoid duplicates
    default: () => [],
  }),

  clarityScore: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  // Gap tracking for reduction rate
  previousGapCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  gapReductionRate: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  // Questions for self-improvement
  selfQuestions: Annotation<string[]>({
    reducer: (_, update) => update, // Changed: replace instead of accumulate
    default: () => [],
  }),

  // Retrieved files for refinement
  retrievedFiles: Annotation<Array<{ path: string; content: string }>>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  // Final output
  finalAnalysis: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),

  refinementNotes: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // Track all gaps seen across iterations for deduplication
  allSeenGaps: Annotation<Set<string>>({
    reducer: (current, update) => {
      const newSet = new Set(current);
      for (const gap of update) {
        newSet.add(gap);
      }
      return newSet;
    },
    default: () => new Set<string>(),
  }),

  // Force stop flag (e.g., when schema-generator finds no schemas)
  forceStop: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),

  // Token tracking
  totalInputTokens: Annotation<number>({
    reducer: (current, update) => current + update,
    default: () => 0,
  }),

  totalOutputTokens: Annotation<number>({
    reducer: (current, update) => current + update,
    default: () => 0,
  }),
});

/**
 * Configuration for agent self-refinement workflow
 */
export interface AgentWorkflowConfig {
  maxIterations: number;
  clarityThreshold: number;
  minImprovement: number;
  enableSelfQuestioning: boolean;
  // Performance optimizations
  skipSelfRefinement?: boolean; // Skip refinement entirely for speed
  maxQuestionsPerIteration?: number; // Limit questions to speed up
  evaluationTimeout?: number; // Timeout for evaluation (ms)
}

/**
 * Base class for agents with self-refinement workflow using LangGraph
 */
export abstract class BaseAgentWorkflow {
  protected llmService: LLMService;
  protected logger: Logger;
  protected workflow: ReturnType<typeof this.buildWorkflow>;
  protected checkpointer = new MemorySaver();

  constructor() {
    this.llmService = LLMService.getInstance();
    // Use agent metadata name for consistent logging (e.g., 'architecture-analyzer' not 'ArchitectureAnalyzerAgent')
    this.logger = new Logger(this.getAgentName());
    this.workflow = this.buildWorkflow();
  }

  /**
   * Build the self-refinement workflow
   */
  private buildWorkflow() {
    const graph = new StateGraph(AgentWorkflowState);

    // Define nodes
    graph.addNode('analyzeInitial', this.analyzeInitialNode.bind(this));
    graph.addNode('evaluateClarity', this.evaluateClarityNode.bind(this));
    graph.addNode('generateQuestions', this.generateQuestionsNode.bind(this));
    graph.addNode('retrieveFiles', this.retrieveFilesNode.bind(this));
    graph.addNode('refineAnalysis', this.refineAnalysisNode.bind(this));
    graph.addNode('finalizeOutput', this.finalizeOutputNode.bind(this));

    // Set entry point
    const entryPoint = 'analyzeInitial' as '__start__';
    graph.setEntryPoint(entryPoint);

    // After initial analysis, evaluate clarity
    graph.addEdge(entryPoint, 'evaluateClarity' as '__start__');

    // Conditional routing after evaluation
    graph.addConditionalEdges('evaluateClarity' as '__start__', this.shouldRefine.bind(this), {
      refine: 'generateQuestions' as '__start__',
      finalize: 'finalizeOutput' as '__start__',
    });

    // After generating questions, retrieve relevant files
    graph.addEdge('generateQuestions' as '__start__', 'retrieveFiles' as '__start__');

    // After retrieving files, refine analysis
    graph.addEdge('retrieveFiles' as '__start__', 'refineAnalysis' as '__start__');

    // After refinement, evaluate again
    graph.addEdge('refineAnalysis' as '__start__', 'evaluateClarity' as '__start__');

    // End after finalization
    graph.addEdge('finalizeOutput' as '__start__', END);

    return graph.compile({ checkpointer: this.checkpointer });
  }

  /**
   * Execute the agent workflow (implements Agent interface)
   */
  async execute(
    context: AgentContext,
    options?: import('../types/agent.types').AgentExecutionOptions,
  ): Promise<AgentResult> {
    // Configuration optimized for gap-filling workflow
    // Max iterations can be overridden via context config
    const maxIterations = (context.config?.maxIterations as number) || 5;
    const clarityThreshold = (context.config?.clarityThreshold as number) || 80;

    const config: AgentWorkflowConfig = {
      maxIterations,
      clarityThreshold,
      minImprovement: 3, // Small improvements still valuable
      enableSelfQuestioning: true,
      skipSelfRefinement: options?.skipSelfRefinement || false, // Quick mode skips refinement
      maxQuestionsPerIteration: options?.maxQuestionsPerIteration || 3, // 3 focused questions per iteration
      evaluationTimeout: 15000,
    };

    this.logger.info(
      `Configuration: maxIterations=${maxIterations}, clarityThreshold=${clarityThreshold}, questionsPerIteration=3, skipSelfRefinement=${config.skipSelfRefinement}`,
      '⚙️',
    );

    return this.executeWorkflow(
      context,
      config,
      options?.runnableConfig as Record<string, unknown> | undefined,
    );
  }

  /**
   * Execute the agent workflow with custom configuration
   */
  protected async executeWorkflow(
    context: AgentContext,
    config: AgentWorkflowConfig,
    runnableConfig?: Record<string, unknown>,
  ): Promise<AgentResult> {
    const startTime = Date.now();

    // Fast path: Skip self-refinement for speed
    if (config.skipSelfRefinement) {
      return this.executeFastPath(context, runnableConfig, startTime);
    }

    // Initial state
    const initialState = {
      context,
      iteration: 0,
      currentAnalysis: '',
      missingInformation: [],
      clarityScore: 0,
      selfQuestions: [],
      finalAnalysis: '',
      refinementNotes: [],
      previousGapCount: 0,
      gapReductionRate: 0,
      allSeenGaps: new Set<string>(),
    };

    // Execute workflow
    const workflowConfig = {
      configurable: {
        thread_id: `agent-${context.executionId}`,
        maxIterations: config.maxIterations,
        clarityThreshold: config.clarityThreshold,
        enableSelfQuestioning: config.enableSelfQuestioning,
        maxQuestionsPerIteration: config.maxQuestionsPerIteration || 5,
      },
      recursionLimit: 150, // Support up to 10 iterations × 5 nodes per agent
      ...runnableConfig,
    };

    let finalState = initialState;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Note: LangSmith trace name comes from individual node LLM calls (e.g., "{agent}-InitialAnalysis")
    // The LangGraph wrapper itself will show as "LangGraph" in traces
    for await (const state of await this.workflow.stream(initialState, workflowConfig)) {
      // Get the last node's state
      const nodeNames = Object.keys(state);
      if (nodeNames.length > 0) {
        const lastNodeName = nodeNames[nodeNames.length - 1];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        finalState = (state as any)[lastNodeName] || finalState;

        // Extract token counts if present
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stateAny = finalState as any;
        if (stateAny.totalInputTokens !== undefined) {
          totalInputTokens = stateAny.totalInputTokens;
        }
        if (stateAny.totalOutputTokens !== undefined) {
          totalOutputTokens = stateAny.totalOutputTokens;
        }
      }
    }

    const executionTime = Date.now() - startTime;

    // Parse final analysis into structured data
    const analysisData = await this.parseAnalysis(finalState.finalAnalysis);

    // Generate files (agents can override to generate multiple files)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files = await this.generateFiles(analysisData, finalState as any);

    return {
      agentName: this.getAgentName(),
      status: 'success',
      data: analysisData,
      summary: this.generateSummary(analysisData),
      markdown: files[0]?.content || '', // Backwards compatibility
      files,
      confidence: finalState.clarityScore / 100,
      tokenUsage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
      },
      executionTime,
      errors: [],
      warnings: finalState.refinementNotes,
      metadata: {
        iterations: finalState.iteration,
        selfQuestions: finalState.selfQuestions,
        missingInformation: finalState.missingInformation,
      },
    };
  }

  /**
   * Fast path execution - skip self-refinement workflow
   * ~3x faster than full workflow
   */
  private async executeFastPath(
    context: AgentContext,
    runnableConfig?: Record<string, unknown>,
    startTime?: number,
  ): Promise<AgentResult> {
    const execStartTime = startTime || Date.now();

    const systemPrompt = await this.buildSystemPrompt(context);
    const baseHumanPrompt = await this.buildHumanPrompt(context);
    const humanPrompt = await this.enhancePromptWithUserQuery(baseHumanPrompt, context);

    const model = this.llmService.getChatModel(
      {
        temperature: 0.3,
        maxTokens: 16000,
      },
      this.getAgentName(),
    );

    // Wrap LLM call with retry logic for JSON parsing failures
    const { analysisData, inputTokens, outputTokens } = await Retry.executeWithJsonRetry(
      async (attempt: number) => {
        this.logger.info(
          `Calling LLM for fast path analysis... ${attempt > 1 ? `(retry ${attempt})` : ''}`,
          '⚡',
        );
        const llmStartTime = Date.now();

        // Add stricter JSON instructions on retry
        const enhancedHumanPrompt =
          attempt > 1
            ? humanPrompt +
              '\n\nIMPORTANT: Your response MUST be valid JSON. Do NOT wrap it in markdown code blocks. Start with { and end with }.'
            : humanPrompt;

        const result = await model.invoke([systemPrompt, enhancedHumanPrompt], {
          ...runnableConfig,
          runName: `${this.getAgentName()}-FastPath${attempt > 1 ? `-Retry${attempt}` : ''}`,
        });

        const llmDuration = ((Date.now() - llmStartTime) / 1000).toFixed(1);
        this.logger.info(`LLM call completed in ${llmDuration}s`, '✅');

        const analysisText = typeof result === 'string' ? result : result.content?.toString() || '';

        // Count tokens from LLM result
        // OpenAI uses prompt_tokens/completion_tokens, Anthropic uses input_tokens/output_tokens
        const usage = result?.response_metadata?.usage || result?.usage_metadata || {};
        const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
        const outputTokens = usage.output_tokens || usage.completion_tokens || 0;
        const totalTokens = inputTokens + outputTokens;

        // Log token usage
        if (totalTokens > 0) {
          this.logger.debug(
            `Token usage: ${inputTokens} input + ${outputTokens} output = ${totalTokens} total`,
            '💰',
          );
        } else {
          this.logger.debug('No token usage found in response', {
            hasResponseMetadata: !!result?.response_metadata,
            hasUsageMetadata: !!result?.usage_metadata,
            usageKeys: usage ? Object.keys(usage) : [],
          });
        }

        // Try to parse analysis - will throw if invalid JSON
        const analysisData = await this.parseAnalysis(analysisText);

        return { result, analysisData, inputTokens, outputTokens };
      },
      ({ analysisData }) => {
        // Validate JSON structure (check if it has expected properties)
        return analysisData && typeof analysisData === 'object';
      },
      {
        ...Retry.configs.jsonParsing,
        onRetry: (attempt, error) => {
          this.logger.warn(
            `Attempt ${attempt} returned invalid JSON, retrying with stricter prompt...`,
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
        },
      },
    );

    const executionTime = Date.now() - execStartTime;
    const totalTokens = inputTokens + outputTokens;
    const analysisText = ''; // Fast path doesn't need full analysis text stored

    const stateForMarkdown = {
      context,
      finalAnalysis: analysisText,
      iteration: 1,
      currentAnalysis: analysisText,
      clarityScore: 80,
      missingInformation: [],
      selfQuestions: [],
      refinementNotes: [],
      previousGapCount: 0,
      gapReductionRate: 0,
      allSeenGaps: new Set<string>(),
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
    };

    // Generate files (agents can override to generate multiple files)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files = await this.generateFiles(analysisData, stateForMarkdown as any);

    return {
      agentName: this.getAgentName(),
      status: 'success',
      data: analysisData,
      summary: this.generateSummary(analysisData),
      markdown: files[0]?.content || '', // Backwards compatibility
      files,
      confidence: 0.8, // Reasonable default without evaluation
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens,
      },
      executionTime,
      errors: [],
      warnings: ['Fast path: Self-refinement skipped for speed'],
      metadata: {
        fastPath: true,
        iterations: 1,
      },
    };
  }

  /**
   * Initial analysis node
   */
  private async analyzeInitialNode(state: typeof AgentWorkflowState.State) {
    const { context } = state;
    const agentName = this.getAgentName();

    this.logger.info(`Starting initial analysis...`, '🤖');

    const systemPrompt = await this.buildSystemPrompt(context);
    const baseHumanPrompt = await this.buildHumanPrompt(context);
    const humanPrompt = await this.enhancePromptWithUserQuery(baseHumanPrompt, context);

    // Determine maxTokens based on depth mode
    // Quick mode (maxQuestionsPerIteration <= 2): 8000 tokens
    // Normal/Deep mode: 16000 tokens
    const config = state as unknown as {
      configurable?: { maxQuestionsPerIteration?: number };
    };
    const maxQuestionsPerIteration = config.configurable?.maxQuestionsPerIteration || 3;
    const isQuickMode = maxQuestionsPerIteration <= 2;

    const modelOptions = {
      temperature: 0.3,
      maxTokens: isQuickMode ? 8000 : 16000,
    };

    // Calculate input token count
    const systemPromptText =
      typeof systemPrompt === 'string' ? systemPrompt : JSON.stringify(systemPrompt);
    const humanPromptText =
      typeof humanPrompt === 'string' ? humanPrompt : JSON.stringify(humanPrompt);
    const inputTokens = await this.llmService.countTokens(systemPromptText + humanPromptText);

    this.logger.info(
      `Input: ${inputTokens.toLocaleString()} tokens | Budget: ${context.tokenBudget.toLocaleString()} tokens | Max output: ${modelOptions.maxTokens.toLocaleString()} tokens`,
      '📊',
    );

    const model = this.llmService.getChatModel(modelOptions, agentName);

    // Track token usage with callback
    let actualInputTokens = inputTokens;
    let actualOutputTokens = 0;

    model.callbacks = [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handleLLMEnd: (output: any) => {
          const tokens = LLMService.extractTokensFromCallback(output);
          actualInputTokens = tokens.inputTokens || inputTokens;
          actualOutputTokens = tokens.outputTokens;
        },
      },
    ];

    this.logger.info(`Calling LLM for initial analysis...`, '⚡');
    const llmStartTime = Date.now();

    const result = await model.invoke([systemPrompt, humanPrompt], {
      runName: `${agentName}-InitialAnalysis`,
    });

    const llmDuration = ((Date.now() - llmStartTime) / 1000).toFixed(1);
    this.logger.info(`LLM call completed in ${llmDuration}s`, '✅');

    const analysisText = typeof result === 'string' ? result : result.content?.toString() || '';

    // Try to extract tokens directly from the response object if callback failed
    if (actualOutputTokens === 0 && typeof result !== 'string') {
      const responseUsage =
        (result as any).usage_metadata ||
        (result as any).usage ||
        (result as any).response_metadata?.usage;

      if (responseUsage) {
        actualInputTokens = responseUsage.input_tokens || actualInputTokens;
        actualOutputTokens = responseUsage.output_tokens || 0;
      }
    }

    const totalTokens = actualInputTokens + actualOutputTokens;

    // Calculate cost using actual provider/model pricing
    const modelConfig = this.llmService.getModelConfig(
      this.llmService['defaultProvider'],
      this.llmService['getDefaultModel'](this.llmService['defaultProvider']),
    );
    const totalCost = this.llmService['tokenManager'].calculateCost(
      actualInputTokens,
      actualOutputTokens,
      modelConfig.costPerMillionInputTokens,
      modelConfig.costPerMillionOutputTokens,
    );

    this.logger.info(
      `Tokens: ${actualInputTokens.toLocaleString()} input / ${actualOutputTokens.toLocaleString()} output = ${totalTokens.toLocaleString()} total | Cost: $${totalCost.toFixed(4)} | Remaining budget: ${(context.tokenBudget - totalTokens).toLocaleString()}`,
      '💰',
    );

    this.logger.info(
      `Initial analysis complete (${analysisText.length.toLocaleString()} chars)`,
      '✅',
    );

    // Check if agent output indicates "no data found" - generic detection for all agents
    const parsedData = await this.parseAnalysis(analysisText);
    const shouldForceStop = this.shouldForceStopFromOutput(parsedData);

    return {
      ...state,
      currentAnalysis: analysisText,
      iteration: 1,
      forceStop: shouldForceStop,
      totalInputTokens: actualInputTokens, // FIXED: Let reducer handle accumulation
      totalOutputTokens: actualOutputTokens, // FIXED: Let reducer handle accumulation
    };
  }

  /**
   * Evaluate clarity and completeness of analysis
   */
  private async evaluateClarityNode(state: typeof AgentWorkflowState.State) {
    const {
      currentAnalysis,
      iteration,
      missingInformation: previousMissingInfo,
      allSeenGaps,
      previousGapCount,
      forceStop,
    } = state;
    const agentName = this.getAgentName();

    // CRITICAL: If forceStop is set (e.g., schema-generator found NO schemas), force-stop immediately
    if (forceStop) {
      this.logger.info('Force stop triggered - skipping to finalization', '⏹️');
      const config = state as unknown as {
        configurable?: { maxIterations?: number };
      };
      const maxIterations = config.configurable?.maxIterations || 5;
      return {
        ...state,
        clarityScore: 100, // High score to pass threshold
        missingInformation: [], // No gaps
        previousGapCount: 0,
        gapReductionRate: 100,
        iteration: maxIterations, // Force to max to trigger finalization
      };
    }

    // EARLY RETURN: If analysis is empty or too short, skip evaluation
    if (!currentAnalysis || currentAnalysis.trim().length < 100) {
      this.logger.warn(
        `Iteration ${iteration}: Analysis too short (${currentAnalysis.trim().length} chars), skipping evaluation`,
        '⚠️',
      );
      return {
        ...state,
        clarityScore: 0,
        missingInformation: ['Analysis generation failed - insufficient content'],
        previousGapCount: 1,
        gapReductionRate: 0,
      };
    }

    this.logger.info(`Iteration ${iteration}: Evaluating clarity...`, '🔍');

    const modelOptions = {
      temperature: 0.2,
      maxTokens: 2000,
    };

    const model = this.llmService.getChatModel(modelOptions, agentName);

    const previousGapsContext =
      iteration > 1 && previousMissingInfo.length > 0
        ? `\n\nPrevious iteration identified these gaps (check if they were addressed):\n${previousMissingInfo.map((gap) => `- ${gap}`).join('\n')}`
        : '';

    const evaluationPrompt = `You are evaluating the quality and completeness of an analysis.

Analysis to evaluate:
${currentAnalysis}${previousGapsContext}

Evaluate the analysis on these criteria (0-100 scale for each):
1. **Completeness**: Does it cover all aspects thoroughly? Are previous gaps addressed?
2. **Clarity**: Is it well-structured and clear?
3. **Depth**: Does it provide sufficient detail?
4. **Accuracy**: Is the information accurate based on the context?

Also identify any REMAINING missing information or gaps that are still not covered.

Respond in this exact format:
COMPLETENESS_SCORE: [0-100]
CLARITY_SCORE: [0-100]
DEPTH_SCORE: [0-100]
ACCURACY_SCORE: [0-100]
MISSING_INFORMATION:
- [gap 1]
- [gap 2]
...

If all gaps have been addressed, write:
MISSING_INFORMATION:
- None - all aspects covered`;

    const inputTokens = await this.llmService.countTokens(evaluationPrompt);
    this.logger.info(`Evaluation input: ${inputTokens.toLocaleString()} tokens`, '📊');

    // Track token usage with callback
    let actualInputTokens = inputTokens;
    let actualOutputTokens = 0;

    model.callbacks = [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handleLLMEnd: (output: any) => {
          const tokens = LLMService.extractTokensFromCallback(output);
          actualInputTokens = tokens.inputTokens || inputTokens;
          actualOutputTokens = tokens.outputTokens;
        },
      },
    ];

    this.logger.info(`Calling LLM for clarity evaluation...`, '⚡');
    const evalStartTime = Date.now();

    const result = await model.invoke([evaluationPrompt], {
      runName: `${agentName}-EvaluateClarity`,
    });

    const evalDuration = ((Date.now() - evalStartTime) / 1000).toFixed(1);
    this.logger.info(`Evaluation completed in ${evalDuration}s`, '✅');

    const evaluationText = typeof result === 'string' ? result : result.content?.toString() || '';

    // Try to extract tokens directly from the response object if callback failed
    if (actualOutputTokens === 0 && typeof result !== 'string') {
      const responseUsage =
        (result as any).usage_metadata ||
        (result as any).usage ||
        (result as any).response_metadata?.usage;

      if (responseUsage) {
        actualInputTokens = responseUsage.input_tokens || actualInputTokens;
        actualOutputTokens = responseUsage.output_tokens || 0;
      }
    }

    // Parse scores
    const completenessMatch = evaluationText.match(/COMPLETENESS_SCORE:\s*(\d+)/);
    const clarityMatch = evaluationText.match(/CLARITY_SCORE:\s*(\d+)/);
    const depthMatch = evaluationText.match(/DEPTH_SCORE:\s*(\d+)/);
    const accuracyMatch = evaluationText.match(/ACCURACY_SCORE:\s*(\d+)/);

    const completeness = completenessMatch ? parseInt(completenessMatch[1], 10) : 0;
    const clarity = clarityMatch ? parseInt(clarityMatch[1], 10) : 0;
    const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;
    const accuracy = accuracyMatch ? parseInt(accuracyMatch[1], 10) : 0;

    // Overall clarity score = average of 4 individual metrics
    // Note: "clarity" appears twice - once as overall score, once as individual metric
    const overallScore = (completeness + clarity + depth + accuracy) / 4;

    // Extract missing information
    const missingInfoMatch = evaluationText.match(/MISSING_INFORMATION:\s*([\s\S]*?)(?:\n\n|$)/);
    const rawMissingInfo = missingInfoMatch
      ? missingInfoMatch[1]
          .split('\n')
          .filter((line) => line.trim().startsWith('-'))
          .map((line) => line.replace(/^-\s*/, '').trim())
          .filter((line) => !line.toLowerCase().includes('none') && line.length > 0)
      : [];

    // Deduplicate against all previously seen gaps using fuzzy matching
    const newMissingInfo = this.deduplicateGaps(rawMissingInfo, allSeenGaps);

    // Update seen gaps set
    const updatedSeenGaps = new Set(allSeenGaps);
    for (const gap of newMissingInfo) {
      updatedSeenGaps.add(this.normalizeGap(gap));
    }

    // Calculate gap reduction rate
    const currentGapCount = newMissingInfo.length;
    const gapsResolved = previousGapCount > 0 ? previousGapCount - currentGapCount : 0;
    const gapReductionRate = previousGapCount > 0 ? (gapsResolved / previousGapCount) * 100 : 0;

    this.logger.info(
      `Overall Clarity=${overallScore.toFixed(1)} (Completeness=${completeness}, Clarity=${clarity}, Depth=${depth}, Accuracy=${accuracy})`,
      '📊',
    );

    if (gapsResolved > 0) {
      this.logger.info(
        `Resolved ${gapsResolved} gap(s), ${currentGapCount} remaining (${gapReductionRate.toFixed(1)}% reduction)`,
        '✅',
      );
    } else if (iteration > 1 && gapsResolved < 0) {
      this.logger.warn(
        `${Math.abs(gapsResolved)} new gap(s) identified, ${currentGapCount} total`,
        '⚠️',
      );
    } else if (currentGapCount > 0) {
      this.logger.warn(`${currentGapCount} gap(s) identified`, '⚠️');
    }

    return {
      ...state,
      clarityScore: overallScore,
      missingInformation: newMissingInfo,
      previousGapCount: currentGapCount,
      gapReductionRate,
      allSeenGaps: updatedSeenGaps,
      totalInputTokens: actualInputTokens, // FIXED: Let reducer handle accumulation
      totalOutputTokens: actualOutputTokens, // FIXED: Let reducer handle accumulation
    };
  }

  /**
   * Normalize gap text for fuzzy matching (lowercase, remove punctuation, trim)
   */
  private normalizeGap(gap: string): string {
    return gap
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  /**
   * Deduplicate gaps using fuzzy matching against previously seen gaps
   */
  private deduplicateGaps(newGaps: string[], seenGaps: Set<string>): string[] {
    const deduplicated: string[] = [];

    for (const gap of newGaps) {
      const normalized = this.normalizeGap(gap);

      // Check if this gap is substantially similar to any seen gap
      let isDuplicate = false;
      for (const seenGap of seenGaps) {
        if (this.areGapsSimilar(normalized, seenGap)) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        deduplicated.push(gap);
      }
    }

    return deduplicated;
  }

  /**
   * Check if two normalized gaps are similar (fuzzy match)
   * Uses word overlap - if 70%+ words match, consider them similar
   */
  private areGapsSimilar(gap1: string, gap2: string): boolean {
    // Exact match
    if (gap1 === gap2) {
      return true;
    }

    // Split into words
    const words1 = gap1.split(/\s+/).filter((w) => w.length > 3); // Ignore short words
    const words2 = gap2.split(/\s+/).filter((w) => w.length > 3);

    if (words1.length === 0 || words2.length === 0) {
      return false;
    }

    // Count matching words
    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
          matches++;
          break;
        }
      }
    }

    // Calculate overlap percentage
    const minWords = Math.min(words1.length, words2.length);
    const overlapPercentage = (matches / minWords) * 100;

    return overlapPercentage >= 70;
  }

  /**
   * Generate self-questions to improve analysis
   * Focuses on addressing missing information gaps with smart prioritization
   */
  private async generateQuestionsNode(state: typeof AgentWorkflowState.State) {
    const { currentAnalysis, missingInformation, context, iteration } = state;
    const agentName = this.getAgentName();

    // EARLY RETURN: If no gaps, skip question generation
    if (missingInformation.length === 0) {
      this.logger.info(
        `Iteration ${iteration}: No gaps to address - skipping question generation`,
        '✅',
      );
      return {
        ...state,
        selfQuestions: [],
      };
    }

    // EARLY RETURN: If all gaps are too vague or generic, skip questions
    const meaningfulGaps = missingInformation.filter(
      (gap) =>
        gap.length > 10 &&
        !gap.toLowerCase().includes('none') &&
        !gap.toLowerCase().includes('n/a') &&
        !gap.toLowerCase().includes('not applicable'),
    );

    if (meaningfulGaps.length === 0) {
      this.logger.warn(
        `Iteration ${iteration}: All ${missingInformation.length} gap(s) are too vague - skipping question generation`,
        '⚠️',
      );
      return {
        ...state,
        selfQuestions: [],
        missingInformation: [], // Clear vague gaps to prevent repeated attempts
      };
    }

    this.logger.info(`Iteration ${iteration}: Generating refinement questions...`, '❓');

    // Get max questions from config
    const maxQuestions =
      (context as AgentContext & { maxQuestionsPerIteration?: number }).maxQuestionsPerIteration ||
      3;

    const model = this.llmService.getChatModel(
      {
        temperature: 0.4,
        maxTokens: 1500,
      },
      agentName,
    );

    // Smart prioritization: categorize and prioritize gaps
    const prioritizedGaps = this.prioritizeGaps(missingInformation);
    const topGaps = prioritizedGaps.slice(0, Math.min(5, maxQuestions * 2));

    this.logger.info(
      `Prioritized ${topGaps.length} gap(s) from ${missingInformation.length} total`,
      '🔧',
    );

    const questionPrompt = `You are helping improve an analysis by generating targeted questions to fill specific gaps.

Current analysis excerpt:
${currentAnalysis.substring(0, 800)}... [excerpt]

PRIORITY GAPS TO ADDRESS (${topGaps.length} identified, prioritized by importance):
${topGaps.map((gap, i) => `${i + 1}. ${gap.text} [Priority: ${gap.category}]`).join('\n')}

Your task: Generate ${maxQuestions} specific, actionable questions that would help address these priority gaps.

Requirements:
- Each question should target one or more gaps from the list above
- Questions should be concrete and answerable with available project information
- Focus on what CAN be determined from code analysis (structure, patterns, dependencies)
- Avoid questions about runtime behavior or deployment details that require running the application
- Prioritize HIGH priority gaps over MEDIUM/LOW

Format your response as:
1. [Specific question targeting gap(s) X]
2. [Specific question targeting gap(s) Y]
${maxQuestions > 2 ? '3. [Specific question targeting gap(s) Z]' : ''}

Example good questions:
- "What error handling patterns are used in the API endpoints?" (addresses error handling gap)
- "What caching strategies are implemented in the service layer?" (addresses caching gap)
- "How are database queries organized and what ORM patterns are used?" (addresses schema gap)`;

    // Track token usage with callback
    let actualInputTokens = 0;
    let actualOutputTokens = 0;

    model.callbacks = [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handleLLMEnd: (output: any) => {
          const tokens = LLMService.extractTokensFromCallback(output);
          actualInputTokens = tokens.inputTokens;
          actualOutputTokens = tokens.outputTokens;
        },
      },
    ];

    const result = await model.invoke([questionPrompt], {
      runName: `${agentName}-GenerateQuestions`,
    });

    const questionsText = typeof result === 'string' ? result : result.content?.toString() || '';

    // Try to extract tokens directly from the response object if callback failed
    if (actualOutputTokens === 0 && typeof result !== 'string') {
      const responseUsage =
        (result as any).usage_metadata ||
        (result as any).usage ||
        (result as any).response_metadata?.usage;

      if (responseUsage) {
        actualInputTokens = responseUsage.input_tokens || actualInputTokens;
        actualOutputTokens = responseUsage.output_tokens || 0;
      }
    }

    // Parse questions and limit to maxQuestions
    const questions = questionsText
      .split('\n')
      .filter((line) => /^\d+\./.test(line.trim()))
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .slice(0, maxQuestions);

    this.logger.info(
      `Generated ${questions.length} question(s) targeting ${topGaps.length} gap(s)`,
      '🎯',
    );

    return {
      ...state,
      selfQuestions: questions,
      totalInputTokens: actualInputTokens, // FIXED: Let reducer handle accumulation
      totalOutputTokens: actualOutputTokens, // FIXED: Let reducer handle accumulation
    };
  }

  /**
   * Retrieve relevant files based on generated questions
   * Uses keyword-based search to find files without embeddings (memory-efficient)
   */
  private async retrieveFilesNode(state: typeof AgentWorkflowState.State) {
    const { selfQuestions, context, iteration } = state;

    if (selfQuestions.length === 0) {
      this.logger.debug(`Iteration ${iteration}: No questions to search files for`, '📂');
      return {
        ...state,
        retrievedFiles: [],
      };
    }

    this.logger.info(
      `Iteration ${iteration}: Searching files for ${selfQuestions.length} question(s)...`,
      '📂',
    );

    const fileSearch = new FileSearchService(context.projectPath, context.dependencyGraph);
    const allRetrievedFiles: Array<{ path: string; content: string }> = [];

    // Search files for each question
    for (const question of selfQuestions) {
      const scoredFiles = fileSearch.searchFiles(question, context.files, {
        topK: 3, // Get top 3 files per question
        maxFileSize: 50000, // 50KB limit per file
      });

      if (scoredFiles.length > 0) {
        this.logger.debug(
          `Question: "${question.substring(0, 60)}..." -> Found ${scoredFiles.length} file(s)`,
          {
            topFile: scoredFiles[0].path,
            score: scoredFiles[0].score,
          },
        );

        // Retrieve file contents
        const fileContents = await fileSearch.retrieveFiles(scoredFiles, {
          maxFileSize: 50000,
        });

        allRetrievedFiles.push(...fileContents.map((f) => ({ path: f.path, content: f.content })));
      }
    }

    // Deduplicate files by path
    const uniqueFiles = Array.from(new Map(allRetrievedFiles.map((f) => [f.path, f])).values());

    // EARLY RETURN: If no relevant files found after searching, skip refinement
    if (uniqueFiles.length === 0) {
      this.logger.warn(
        `Iteration ${iteration}: No relevant files found for ${selfQuestions.length} question(s) - cannot refine further`,
        '⚠️',
      );
      return {
        ...state,
        retrievedFiles: [],
        missingInformation: [], // Clear gaps to prevent retrying same questions
      };
    }

    this.logger.info(
      `Retrieved ${uniqueFiles.length} unique file(s) (${allRetrievedFiles.length} total matches)`,
      '✅',
    );

    return {
      ...state,
      retrievedFiles: uniqueFiles,
    };
  }

  /**
   * Prioritize gaps by category and importance
   * Returns gaps sorted by priority (HIGH > MEDIUM > LOW)
   */
  private prioritizeGaps(gaps: string[]): Array<{ text: string; category: string; score: number }> {
    const categorized = gaps.map((gap) => {
      const normalized = gap.toLowerCase();

      // HIGH priority - core architecture and security
      if (
        normalized.includes('security') ||
        normalized.includes('authentication') ||
        normalized.includes('authorization') ||
        normalized.includes('database') ||
        normalized.includes('schema') ||
        normalized.includes('error handling') ||
        normalized.includes('data validation')
      ) {
        return { text: gap, category: 'HIGH', score: 3 };
      }

      // MEDIUM priority - implementation details and patterns
      if (
        normalized.includes('caching') ||
        normalized.includes('logging') ||
        normalized.includes('testing') ||
        normalized.includes('patterns') ||
        normalized.includes('configuration') ||
        normalized.includes('dependency') ||
        normalized.includes('api')
      ) {
        return { text: gap, category: 'MEDIUM', score: 2 };
      }

      // LOW priority - operational and deployment details
      return { text: gap, category: 'LOW', score: 1 };
    });

    // Sort by score (descending) and then alphabetically
    return categorized.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.text.localeCompare(b.text);
    });
  }

  /**
   * Refine analysis based on self-questions
   * Focus on filling gaps identified in missing information list
   */
  private async refineAnalysisNode(state: typeof AgentWorkflowState.State) {
    const {
      currentAnalysis,
      selfQuestions,
      missingInformation,
      context,
      iteration,
      retrievedFiles,
    } = state;

    // Get config to access maxIterations
    const config = state as unknown as {
      configurable?: { maxIterations?: number };
    };
    const maxIterations = config.configurable?.maxIterations || 5;

    this.logger.info(
      `Iteration ${iteration}: Refining analysis (${selfQuestions.length} questions, ${missingInformation.length} gaps, ${retrievedFiles.length} files)...`,
      '🔧',
    );

    const systemPrompt = await this.buildSystemPrompt(context);
    const baseHumanPrompt = await this.buildHumanPrompt(context);
    const humanPrompt = await this.enhancePromptWithUserQuery(baseHumanPrompt, context);

    // Build a focused refinement prompt that targets specific gaps
    const gapsSummary =
      missingInformation.length > 0
        ? `\n\nPRIORITY GAPS TO FILL:\n${missingInformation
            .slice(0, 5)
            .map((gap, i) => `${i + 1}. ${gap}`)
            .join('\n')}`
        : '';

    // Add retrieved file contents as context
    const fileContext =
      retrievedFiles.length > 0
        ? `\n\nRELEVANT CODE FILES (${retrievedFiles.length} files):\n${retrievedFiles
            .map((file) => {
              const truncated = file.content.substring(0, 3000); // Limit each file to 3KB
              return `\n--- ${file.path} ---\n${truncated}${file.content.length > 3000 ? '\n... (truncated)' : ''}`;
            })
            .join('\n')}`
        : '';

    const refinementPrompt = `You are improving your previous analysis by addressing specific gaps and questions.

Previous analysis:
${currentAnalysis}

Questions to answer in this iteration:
${selfQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}${gapsSummary}${fileContext}

Instructions:
1. **Keep everything good** from the previous analysis - don't remove existing content
2. **Answer each question** with specific, concrete details from the codebase
3. **Fill the priority gaps** listed above by adding new sections or expanding existing ones
4. **Be specific** - use actual file names, class names, patterns found in the code
5. **Focus on what's present** - document what you can determine from the code structure
6. **Make targeted additions** - add new sections for gaps, enhance existing sections for questions

Goal: Produce an ENHANCED version that keeps all previous good content AND addresses the ${selfQuestions.length} question(s) and top ${Math.min(5, missingInformation.length)} gap(s).

IMPORTANT: If a gap cannot be addressed from static code analysis (e.g., runtime behavior, deployment details),
explicitly state "Not determinable from static analysis" rather than leaving it unaddressed.`;

    // Determine maxTokens based on depth mode
    // Quick mode: smaller output for faster iteration
    const refinementConfig = state as unknown as {
      configurable?: { maxQuestionsPerIteration?: number };
    };
    const maxQuestionsPerIteration = refinementConfig.configurable?.maxQuestionsPerIteration || 3;
    const isQuickMode = maxQuestionsPerIteration <= 2;

    const model = this.llmService.getChatModel(
      {
        temperature: 0.3,
        maxTokens: isQuickMode ? 8000 : 16000,
      },
      this.getAgentName(),
    );

    // Track token usage with callback
    let actualInputTokens = 0;
    let actualOutputTokens = 0;

    model.callbacks = [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handleLLMEnd: (output: any) => {
          const tokens = LLMService.extractTokensFromCallback(output);
          actualInputTokens = tokens.inputTokens;
          actualOutputTokens = tokens.outputTokens;
        },
      },
    ];

    this.logger.info(
      `Generating refinement (${selfQuestions.length} questions, ${Math.min(5, missingInformation.length)} gaps)...`,
      '🔄',
    );

    this.logger.info('Calling LLM for refinement...', '⚡');
    const refinementStartTime = Date.now();

    const result = await model.invoke([systemPrompt, humanPrompt, refinementPrompt], {
      runName: `${this.getAgentName()}-Refinement-${iteration}`,
    });

    const refinementDuration = ((Date.now() - refinementStartTime) / 1000).toFixed(1);
    this.logger.info(`Refinement LLM call completed in ${refinementDuration}s`, '⚡');

    const refinedAnalysis = typeof result === 'string' ? result : result.content?.toString() || '';

    // Try to extract tokens directly from the response object if callback failed
    if (actualOutputTokens === 0 && typeof result !== 'string') {
      const responseUsage =
        (result as any).usage_metadata ||
        (result as any).usage ||
        (result as any).response_metadata?.usage;

      if (responseUsage) {
        actualInputTokens = responseUsage.input_tokens || actualInputTokens;
        actualOutputTokens = responseUsage.output_tokens || 0;
      }
    }

    // EARLY RETURN: If LLM returned no meaningful content, stop refinement
    if (!refinedAnalysis || refinedAnalysis.trim().length < 100) {
      this.logger.error(
        `Iteration ${iteration}: Refinement failed - LLM returned insufficient content (${refinedAnalysis.trim().length} chars)`,
        '❌',
      );
      return {
        ...state,
        missingInformation: [], // Clear gaps to stop iteration
        totalInputTokens: actualInputTokens,
        totalOutputTokens: actualOutputTokens,
      };
    }

    // EARLY RETURN: If refinement didn't add meaningful content (< 10% growth)
    const growthRate =
      currentAnalysis.length > 0
        ? ((refinedAnalysis.length - currentAnalysis.length) / currentAnalysis.length) * 100
        : 100;

    if (growthRate < 1 && iteration > 1) {
      this.logger.warn(
        `Iteration ${iteration}: Refinement added minimal content (${growthRate.toFixed(1)}% growth) - stopping iteration`,
        '⚠️',
      );
      return {
        ...state,
        currentAnalysis: refinedAnalysis,
        iteration: maxIterations, // Force max iterations to trigger finalization
        missingInformation: [], // Clear gaps to stop iteration
        totalInputTokens: actualInputTokens,
        totalOutputTokens: actualOutputTokens,
      };
    }

    const targetedGaps = Math.min(5, missingInformation.length);
    this.logger.info(
      `Refinement complete - targeted ${selfQuestions.length} question(s) and ${targetedGaps} gap(s)`,
      '📝',
    );

    return {
      ...state,
      currentAnalysis: refinedAnalysis,
      iteration: iteration + 1,
      refinementNotes: [
        `Iteration ${iteration}: Addressed ${selfQuestions.length} questions targeting ${targetedGaps} gap(s)`,
      ],
      totalInputTokens: actualInputTokens, // FIXED: Let reducer handle accumulation
      totalOutputTokens: actualOutputTokens, // FIXED: Let reducer handle accumulation
    };
  }

  /**
   * Finalize the output
   */
  private async finalizeOutputNode(state: typeof AgentWorkflowState.State) {
    const { iteration, clarityScore } = state;

    this.logger.info(
      `Finalized after ${iteration} iteration(s) with clarity score: ${clarityScore.toFixed(1)}`,
      '✨',
    );

    return {
      ...state,
      finalAnalysis: state.currentAnalysis,
    };
  }

  /**
   * Determine if analysis should be refined
   * Stops when: (clarity threshold reached AND no missing info) OR max iterations reached OR no progress
   */
  private shouldRefine(state: typeof AgentWorkflowState.State): string {
    const config = state as unknown as {
      configurable?: { maxIterations?: number; clarityThreshold?: number };
    };
    const maxIterations = config.configurable?.maxIterations || 5;
    const clarityThreshold = config.configurable?.clarityThreshold || 80;

    const hasMissingInfo = state.missingInformation && state.missingInformation.length > 0;

    // EARLY RETURN: If current analysis is too short, stop immediately
    if (state.currentAnalysis && state.currentAnalysis.trim().length < 100) {
      this.logger.error('Stopping: Analysis content too short or empty - cannot refine', '❌');
      return 'finalize';
    }

    // Check if we've reached max iterations
    if (state.iteration >= maxIterations) {
      this.logger.warn(`Stopping: Max iterations (${maxIterations}) reached`, '⏹️');
      if (hasMissingInfo) {
        this.logger.info(`${state.missingInformation.length} gap(s) remain unaddressed`, '📊');
      }
      return 'finalize';
    }

    // Check for no progress - if gap reduction rate is < 15% for 2+ iterations, stop
    // OR if clarity > 75 and gap reduction < 20%, stop early
    const hasLowProgress =
      (state.iteration >= 2 && state.gapReductionRate < 15 && state.gapReductionRate >= 0) ||
      (state.clarityScore > 75 && state.gapReductionRate < 20 && state.gapReductionRate >= 0);

    if (hasLowProgress && hasMissingInfo) {
      this.logger.warn(
        `Stopping: Low progress (${state.gapReductionRate.toFixed(1)}% gap reduction, threshold ${state.clarityScore > 75 ? '20%' : '15%'})`,
        '⏹️',
      );
      this.logger.info(
        `${state.missingInformation.length} gap(s) remain - minimal improvement expected`,
        '📊',
      );
      return 'finalize';
    }

    // Check if clarity is sufficient AND all gaps addressed
    const isComplete = state.clarityScore >= clarityThreshold && !hasMissingInfo;

    if (isComplete) {
      this.logger.info(
        `Stopping: Clarity threshold (${clarityThreshold}) achieved (${state.clarityScore.toFixed(1)}) and all gaps addressed`,
        '✅',
      );
      return 'finalize';
    }

    // Check if only clarity threshold met but gaps remain
    if (state.clarityScore >= clarityThreshold && hasMissingInfo) {
      this.logger.info(
        `Continuing: Clarity sufficient (${state.clarityScore.toFixed(1)}) but ${state.missingInformation.length} gap(s) remain`,
        '🔄',
      );
      return 'refine';
    }

    // Refine for clarity improvement
    this.logger.info(
      `Continuing: Clarity ${state.clarityScore.toFixed(1)} < ${clarityThreshold}, iteration ${state.iteration} < ${maxIterations}`,
      '🔄',
    );
    return 'refine';
  }

  /**
   * Detect if agent output indicates "no data found" to prevent unnecessary refinement
   * Checks for common patterns in parsed output that indicate empty/missing data
   */
  protected shouldForceStopFromOutput(parsedData: Record<string, unknown>): boolean {
    // Check for explicit __FORCE_STOP__ flag (used by schema-generator)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((parsedData as any).__FORCE_STOP__ === true) {
      return true;
    }

    // Generic pattern detection: Check common array/collection fields
    // If ALL primary data fields are empty, it's likely "no data found"
    const commonDataFields = [
      'schemas',
      'components',
      'patterns',
      'flows',
      'dependencies',
      'vulnerabilities',
      'findings',
      'issues',
      'results',
      'items',
      'entities',
    ];

    const dataFieldValues = commonDataFields
      .filter((field) => field in parsedData)
      .map((field) => parsedData[field]);

    // If we found data fields and ALL are empty arrays, force stop
    if (dataFieldValues.length > 0) {
      const allEmpty = dataFieldValues.every((value) => Array.isArray(value) && value.length === 0);
      if (allEmpty) {
        this.logger.info(
          'All data fields empty - agent found no relevant data, stopping refinement',
          '⏹️',
        );
        return true;
      }
    }

    // Check summary text for "no data" indicators
    const summary = (parsedData.summary as string | undefined)?.toLowerCase() || '';
    const noDataIndicators = [
      'no .* found',
      'not found',
      'no data',
      'not detected',
      'no .* detected',
      'appears to be',
      'does not contain',
      'no explicit',
    ];

    const hasNoDataIndicator = noDataIndicators.some((pattern) => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(summary);
    });

    if (hasNoDataIndicator && summary.length > 50) {
      // Only trigger if summary is substantial (not just a fallback)
      this.logger.info('Summary indicates no relevant data found, stopping refinement', '⏹️');
      return true;
    }

    return false;
  }

  /**
   * Enhance human prompt with user's focus area if provided
   * This allows the --prompt flag to guide analysis without replacing standard analysis
   */
  protected async enhancePromptWithUserQuery(
    basePrompt: string,
    context: AgentContext,
  ): Promise<string> {
    let enhancements = '';

    // Add refinement gaps if present (from previous quality evaluation)
    if (context.refinementGaps && context.refinementGaps.needsUpdate) {
      enhancements += `**PREVIOUS QUALITY EVALUATION**:
- Quality Score: ${context.refinementGaps.qualityScore}/100
- Priority: ${context.refinementGaps.priority.toUpperCase()}
- Last Evaluated: ${context.refinementGaps.lastEvaluated}

**IDENTIFIED GAPS TO ADDRESS**:
${context.refinementGaps.improvements.map((imp, idx) => `${idx + 1}. ${imp}`).join('\n')}

⚠️ IMPORTANT: Focus your analysis on addressing these specific gaps. Ensure your updated documentation resolves these identified issues while maintaining comprehensive coverage of all relevant areas.

---

`;
    }

    // Add user's focus area if provided
    if (context.query) {
      enhancements += `**USER'S FOCUS AREA**: ${context.query}

Please pay special attention to the above focus area in your analysis. While you should still provide comprehensive documentation across all relevant areas, ensure that topics related to the user's focus are analyzed in extra detail and highlighted prominently in your response.

---

`;
    }

    if (!enhancements) {
      return basePrompt;
    }

    return enhancements + basePrompt;
  }

  /**
   * Evaluate if this agent should run in incremental mode based on PR context.
   * Default: always run if query provided.
   * Override to add agent-specific relevance checks.
   */
  protected async shouldRunIncrementalMode(context: AgentContext): Promise<boolean> {
    if (!context.isIncrementalMode || !context.query) {
      return false;
    }

    // Default: if user query provided in incremental mode, agent should run
    // Agents can override to add specific relevance checks
    return true;
  }

  /**
   * Determine merge strategy for existing documentation files.
   * Returns map of filename → merge strategy.
   * Override for agent-specific merge logic.
   */
  protected async determineMergeStrategy(
    context: AgentContext,
    _data: Record<string, unknown>,
  ): Promise<Map<string, 'replace' | 'append' | 'section-update'>> {
    const strategies = new Map<string, 'replace' | 'append' | 'section-update'>();

    // Default strategy: if file exists, append new section; otherwise replace
    if (context.existingDocs && context.isIncrementalMode) {
      const agentName = this.getAgentName();
      const agentFilename = `${agentName}.md`;

      if (context.existingDocs.has(agentFilename)) {
        strategies.set(agentFilename, 'append');
      }
    }

    return strategies;
  }

  /**
   * Generate response length guidance based on depth mode
   * Override this method to customize for specific agents
   */
  protected getResponseLengthGuidance(context: AgentContext): string {
    const maxIterations = (context.config?.maxIterations as number) || 5;

    // Determine depth mode based on maxIterations
    // quick: 1-2, normal: 3-5, deep: 6-8, exhaustive: 9+
    let mode: 'quick' | 'normal' | 'deep' | 'exhaustive';
    if (maxIterations <= 2) {
      mode = 'quick';
    } else if (maxIterations <= 5) {
      mode = 'normal';
    } else if (maxIterations <= 8) {
      mode = 'deep';
    } else {
      mode = 'exhaustive';
    }

    const maxTokens = mode === 'quick' ? 8000 : 16000;

    // Get agent-specific target ranges (override this for custom ranges)
    const ranges = this.getTargetTokenRanges();

    const targetMin = ranges[mode].min;
    const targetMax = ranges[mode].max;

    return `**Response Length Guidance** (${mode} mode):
- Target: ${targetMin.toLocaleString()}-${targetMax.toLocaleString()} tokens
- Maximum: ${maxTokens.toLocaleString()} tokens
- Scale response based on project complexity
${this.getDepthSpecificGuidance(mode)}`;
  }

  /**
   * Get target token ranges for each depth mode
   * Override this in subclasses to customize per agent
   */
  protected getTargetTokenRanges(): Record<
    'quick' | 'normal' | 'deep' | 'exhaustive',
    { min: number; max: number }
  > {
    // Default ranges - agents can override
    return {
      quick: { min: 500, max: 2000 },
      normal: { min: 2000, max: 6000 },
      deep: { min: 6000, max: 12000 },
      exhaustive: { min: 12000, max: 16000 },
    };
  }

  /**
   * Get depth-specific guidance for the LLM
   * Override this in subclasses for agent-specific guidance
   */
  protected getDepthSpecificGuidance(mode: 'quick' | 'normal' | 'deep' | 'exhaustive'): string {
    const guidance = {
      quick: '- Focus on key insights only\n- Provide 3-5 main points',
      normal: '- Provide comprehensive analysis\n- Include 5-10 insights and recommendations',
      deep: '- Provide detailed, thorough analysis\n- Include 10-20 insights with evidence\n- Add specific file locations and examples',
      exhaustive:
        '- Provide exhaustive, comprehensive documentation\n- Include 20+ insights with detailed evidence\n- Add extensive examples and cross-references',
    };

    return guidance[mode];
  }

  // Abstract methods that subclasses must implement
  protected abstract getAgentName(): string;
  protected abstract buildSystemPrompt(context: AgentContext): Promise<string>;
  protected abstract buildHumanPrompt(context: AgentContext): Promise<string>;
  protected abstract parseAnalysis(analysis: string): Promise<Record<string, unknown>>;
  protected abstract formatMarkdown(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<string>;
  protected abstract generateSummary(data: Record<string, unknown>): string;

  /**
   * Generate documentation files for this agent
   * Default: single file with agent name
   * Override to generate multiple files (e.g., flows.md + detail files)
   *
   * In incremental mode:
   * - Check context.existingDocs to see what files exist
   * - Set mergeStrategy on AgentFile (replace/append/section-update)
   * - Set sectionId for section-update strategy
   */
  protected abstract generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]>;
}
