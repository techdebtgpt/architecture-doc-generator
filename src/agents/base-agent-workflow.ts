import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import type { AgentContext, AgentResult } from '../types/agent.types';
import { LLMService } from '../llm/llm-service';

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
    default: () => new Set(),
  }),

  // Track token usage across all LLM calls
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
  protected workflow: ReturnType<typeof this.buildWorkflow>;
  protected checkpointer = new MemorySaver();

  constructor() {
    this.llmService = LLMService.getInstance();
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

    // After generating questions, refine analysis
    graph.addEdge('generateQuestions' as '__start__', 'refineAnalysis' as '__start__');

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
      skipSelfRefinement: false,
      maxQuestionsPerIteration: 3, // 3 focused questions per iteration
      evaluationTimeout: 15000,
    };

    console.log(
      `[${this.getAgentName()}] ⚙️  Configuration: maxIterations=${maxIterations}, clarityThreshold=${clarityThreshold}, questionsPerIteration=3`,
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

    for await (const state of await this.workflow.stream(initialState, workflowConfig)) {
      // Get the last node's state
      const nodeNames = Object.keys(state);
      if (nodeNames.length > 0) {
        const lastNodeName = nodeNames[nodeNames.length - 1];
        // @ts-expect-error - Dynamic node names from StateGraph
        finalState = state[lastNodeName] || finalState;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markdown = await this.formatMarkdown(analysisData, finalState as any);

    return {
      agentName: this.getAgentName(),
      status: 'success',
      data: analysisData,
      summary: this.generateSummary(analysisData),
      markdown,
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
    const humanPrompt = await this.buildHumanPrompt(context);

    const model = this.llmService.getChatModel(
      {
        temperature: 0.3,
        maxTokens: 16000,
      },
      this.getAgentName(),
    );

    const result = await model.invoke([systemPrompt, humanPrompt], {
      ...runnableConfig,
      runName: `${this.getAgentName()}-FastPath`,
    });

    const analysisText = typeof result === 'string' ? result : result.content?.toString() || '';

    const executionTime = Date.now() - execStartTime;
    const analysisData = await this.parseAnalysis(analysisText);
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
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markdown = await this.formatMarkdown(analysisData, stateForMarkdown as any);

    return {
      agentName: this.getAgentName(),
      status: 'success',
      data: analysisData,
      summary: this.generateSummary(analysisData),
      markdown,
      confidence: 0.8, // Reasonable default without evaluation
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
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

    console.log(`\n🤖 [${agentName}] Starting initial analysis...`);

    const systemPrompt = await this.buildSystemPrompt(context);
    const humanPrompt = await this.buildHumanPrompt(context);

    const modelOptions = {
      temperature: 0.3,
      maxTokens: 16000,
    };

    // Calculate input token count
    const systemPromptText =
      typeof systemPrompt === 'string' ? systemPrompt : JSON.stringify(systemPrompt);
    const humanPromptText =
      typeof humanPrompt === 'string' ? humanPrompt : JSON.stringify(humanPrompt);
    const inputTokens = await this.llmService.countTokens(systemPromptText + humanPromptText);

    console.log(
      `📊 [${agentName}] Input: ${inputTokens.toLocaleString()} tokens | Budget: ${context.tokenBudget.toLocaleString()} tokens | Max output: ${modelOptions.maxTokens.toLocaleString()} tokens`,
    );

    const model = this.llmService.getChatModel(modelOptions, agentName);

    const result = await model.invoke([systemPrompt, humanPrompt], {
      runName: `${agentName}-InitialAnalysis`,
    });

    const analysisText = typeof result === 'string' ? result : result.content?.toString() || '';

    // Extract actual token usage from LLM response metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usage = (result as any).usage_metadata || (result as any).response_metadata?.usage || {};
    const actualInputTokens = usage.input_tokens || usage.prompt_tokens || inputTokens;
    const actualOutputTokens = usage.output_tokens || usage.completion_tokens || 0;
    const totalTokens = actualInputTokens + actualOutputTokens;

    // Calculate cost (Anthropic Claude Sonnet 4: $3/1M input, $15/1M output)
    const inputCost = (actualInputTokens / 1_000_000) * 3;
    const outputCost = (actualOutputTokens / 1_000_000) * 15;
    const totalCost = inputCost + outputCost;

    console.log(
      `[${agentName}] 💰 Tokens: ${actualInputTokens.toLocaleString()} input / ${actualOutputTokens.toLocaleString()} output = ${totalTokens.toLocaleString()} total | Cost: $${totalCost.toFixed(4)} | Remaining budget: ${(context.tokenBudget - totalTokens).toLocaleString()}`,
    );

    console.log(
      `✅ [${agentName}] Initial analysis complete (${analysisText.length.toLocaleString()} chars)`,
    );

    return {
      ...state,
      currentAnalysis: analysisText,
      iteration: 1,
      totalInputTokens: actualInputTokens,
      totalOutputTokens: actualOutputTokens,
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
    } = state;
    const agentName = this.getAgentName();

    console.log(`\n🔍 [${agentName}] Iteration ${iteration}: Evaluating clarity...`);

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
    console.log(`📊 [${agentName}] Evaluation input: ${inputTokens.toLocaleString()} tokens`);

    const result = await model.invoke([evaluationPrompt], {
      runName: `${agentName}-EvaluateClarity`,
    });

    const evaluationText = typeof result === 'string' ? result : result.content?.toString() || '';

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

    console.log(
      `[${agentName}] 📊 Overall Clarity=${overallScore.toFixed(1)} (📊 Completeness=${completeness}, 💎 Clarity=${clarity}, 🔍 Depth=${depth}, ✅ Accuracy=${accuracy})`,
    );

    if (gapsResolved > 0) {
      console.log(
        `✅ [${agentName}] Resolved ${gapsResolved} gap(s), ${currentGapCount} remaining (${gapReductionRate.toFixed(1)}% reduction)`,
      );
    } else if (iteration > 1 && gapsResolved < 0) {
      console.log(
        `⚠️  [${agentName}] ${Math.abs(gapsResolved)} new gap(s) identified, ${currentGapCount} total`,
      );
    } else if (currentGapCount > 0) {
      console.log(`⚠️  [${agentName}] ${currentGapCount} gap(s) identified`);
    }

    return {
      ...state,
      clarityScore: overallScore,
      missingInformation: newMissingInfo,
      previousGapCount: currentGapCount,
      gapReductionRate,
      allSeenGaps: updatedSeenGaps,
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

    console.log(`❓ [${agentName}] Iteration ${iteration}: Generating refinement questions...`);

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

    console.log(
      `[${agentName}] 🎯 Prioritized ${topGaps.length} gap(s) from ${missingInformation.length} total`,
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

    const result = await model.invoke([questionPrompt], {
      runName: `${agentName}-GenerateQuestions`,
    });

    const questionsText = typeof result === 'string' ? result : result.content?.toString() || '';

    // Parse questions and limit to maxQuestions
    const questions = questionsText
      .split('\n')
      .filter((line) => /^\d+\./.test(line.trim()))
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .slice(0, maxQuestions);

    console.log(
      `[${agentName}] 📝 Generated ${questions.length} question(s) targeting ${topGaps.length} gap(s)`,
    );

    return {
      ...state,
      selfQuestions: questions,
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
    const { currentAnalysis, selfQuestions, missingInformation, context, iteration } = state;

    console.log(
      `🔧 [${this.getAgentName()}] Iteration ${iteration}: Refining analysis (${selfQuestions.length} questions, ${missingInformation.length} gaps)...`,
    );

    const systemPrompt = await this.buildSystemPrompt(context);
    const humanPrompt = await this.buildHumanPrompt(context);

    // Build a focused refinement prompt that targets specific gaps
    const gapsSummary =
      missingInformation.length > 0
        ? `\n\nPRIORITY GAPS TO FILL:\n${missingInformation
            .slice(0, 5)
            .map((gap, i) => `${i + 1}. ${gap}`)
            .join('\n')}`
        : '';

    const refinementPrompt = `You are improving your previous analysis by addressing specific gaps and questions.

Previous analysis:
${currentAnalysis}

Questions to answer in this iteration:
${selfQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}${gapsSummary}

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

    const model = this.llmService.getChatModel(
      {
        temperature: 0.3,
        maxTokens: 16000,
      },
      this.getAgentName(),
    );

    const result = await model.invoke([systemPrompt, humanPrompt, refinementPrompt], {
      runName: `${this.getAgentName()}-Refinement-${iteration}`,
    });

    const refinedAnalysis = typeof result === 'string' ? result : result.content?.toString() || '';

    const targetedGaps = Math.min(5, missingInformation.length);
    console.log(
      `✨ [${this.getAgentName()}] Refinement complete - targeted ${selfQuestions.length} question(s) and ${targetedGaps} gap(s)`,
    );

    return {
      ...state,
      currentAnalysis: refinedAnalysis,
      iteration: iteration + 1,
      refinementNotes: [
        `Iteration ${iteration}: Addressed ${selfQuestions.length} questions targeting ${targetedGaps} gap(s)`,
      ],
    };
  }

  /**
   * Finalize the output
   */
  private async finalizeOutputNode(state: typeof AgentWorkflowState.State) {
    const { iteration, clarityScore } = state;

    console.log(
      `✨ [${this.getAgentName()}] Finalized after ${iteration} iteration(s) with clarity score: ${clarityScore.toFixed(1)}`,
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
    const agentName = this.getAgentName();

    // Check if we've reached max iterations
    if (state.iteration >= maxIterations) {
      console.log(`⏹️  [${agentName}] Stopping: Max iterations (${maxIterations}) reached`);
      if (hasMissingInfo) {
        console.log(
          `ℹ️  [${agentName}] ${state.missingInformation.length} gap(s) remain unaddressed`,
        );
      }
      return 'finalize';
    }

    // Check for no progress - if gap reduction rate is < 15% for 2+ iterations, stop
    // OR if clarity > 75 and gap reduction < 20%, stop early
    const hasLowProgress =
      (state.iteration >= 2 && state.gapReductionRate < 15 && state.gapReductionRate >= 0) ||
      (state.clarityScore > 75 && state.gapReductionRate < 20 && state.gapReductionRate >= 0);

    if (hasLowProgress && hasMissingInfo) {
      console.log(
        `⏹️  [${agentName}] Stopping: Low progress (${state.gapReductionRate.toFixed(1)}% gap reduction, threshold ${state.clarityScore > 75 ? '20%' : '15%'})`,
      );
      console.log(
        `ℹ️  [${agentName}] ${state.missingInformation.length} gap(s) remain - minimal improvement expected`,
      );
      return 'finalize';
    }

    // Check if clarity is sufficient AND all gaps addressed
    const isComplete = state.clarityScore >= clarityThreshold && !hasMissingInfo;

    if (isComplete) {
      console.log(
        `✅ [${agentName}] Stopping: Clarity threshold (${clarityThreshold}) achieved (${state.clarityScore.toFixed(1)}) and all gaps addressed`,
      );
      return 'finalize';
    }

    // Check if only clarity threshold met but gaps remain
    if (state.clarityScore >= clarityThreshold && hasMissingInfo) {
      console.log(
        `🔄 [${agentName}] Continuing: Clarity sufficient (${state.clarityScore.toFixed(1)}) but ${state.missingInformation.length} gap(s) remain`,
      );
      return 'refine';
    }

    // Refine for clarity improvement
    console.log(
      `🔄 [${agentName}] Continuing: Clarity ${state.clarityScore.toFixed(1)} < ${clarityThreshold}, iteration ${state.iteration} < ${maxIterations}`,
    );
    return 'refine';
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
}
