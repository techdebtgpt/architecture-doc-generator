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
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  clarityScore: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  // Questions for self-improvement
  selfQuestions: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
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
    // Adaptive configuration - refines as many times as needed
    const config: AgentWorkflowConfig = {
      maxIterations: 10, // High limit - agent decides when to stop
      clarityThreshold: 85, // Stop when truly satisfied (high bar)
      minImprovement: 3, // Small improvements still valuable
      enableSelfQuestioning: true,
      skipSelfRefinement: false,
      maxQuestionsPerIteration: 2, // Focused, specific questions
      evaluationTimeout: 15000,
    };

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
    for await (const state of await this.workflow.stream(initialState, workflowConfig)) {
      const nodeNames = Object.keys(state);
      if (nodeNames.length > 0) {
        const lastNodeName = nodeNames[nodeNames.length - 1];
        // @ts-expect-error - Dynamic node names from StateGraph
        finalState = state[lastNodeName] || finalState;
      }
    }

    const executionTime = Date.now() - startTime;

    // Parse final analysis into structured data
    const analysisData = await this.parseAnalysis(finalState.finalAnalysis);
    const markdown = await this.formatMarkdown(analysisData, finalState);

    return {
      agentName: this.getAgentName(),
      status: 'success',
      data: analysisData,
      summary: this.generateSummary(analysisData),
      markdown,
      confidence: finalState.clarityScore / 100,
      tokenUsage: {
        inputTokens: 0, // Will be tracked by LangSmith
        outputTokens: 0,
        totalTokens: 0,
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

    const model = this.llmService.getChatModel({
      temperature: 0.3,
      maxTokens: 16000,
    });

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
    };
    const markdown = await this.formatMarkdown(analysisData, stateForMarkdown);

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

    const systemPrompt = await this.buildSystemPrompt(context);
    const humanPrompt = await this.buildHumanPrompt(context);

    const model = this.llmService.getChatModel({
      temperature: 0.3,
      maxTokens: 16000,
    });

    const result = await model.invoke([systemPrompt, humanPrompt], {
      runName: `${this.getAgentName()}-InitialAnalysis`,
    });

    const analysisText = typeof result === 'string' ? result : result.content?.toString() || '';

    return {
      ...state,
      currentAnalysis: analysisText,
      iteration: 1,
    };
  }

  /**
   * Evaluate clarity and completeness of analysis
   */
  private async evaluateClarityNode(state: typeof AgentWorkflowState.State) {
    const { currentAnalysis } = state;

    const model = this.llmService.getChatModel({
      temperature: 0.2,
      maxTokens: 2000,
    });

    const evaluationPrompt = `You are evaluating the quality and completeness of an analysis.

Analysis to evaluate:
${currentAnalysis}

Evaluate the analysis on these criteria (0-100 scale for each):
1. **Completeness**: Does it cover all aspects thoroughly?
2. **Clarity**: Is it well-structured and clear?
3. **Depth**: Does it provide sufficient detail?
4. **Accuracy**: Is the information accurate based on the context?

Also identify any missing information or gaps.

Respond in this exact format:
COMPLETENESS_SCORE: [0-100]
CLARITY_SCORE: [0-100]
DEPTH_SCORE: [0-100]
ACCURACY_SCORE: [0-100]
MISSING_INFORMATION:
- [gap 1]
- [gap 2]
...`;

    const result = await model.invoke([evaluationPrompt], {
      runName: `${this.getAgentName()}-EvaluateClarity`,
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

    const overallScore = (completeness + clarity + depth + accuracy) / 4;

    // Extract missing information
    const missingInfoMatch = evaluationText.match(/MISSING_INFORMATION:\s*([\s\S]*?)(?:\n\n|$)/);
    const missingInfo = missingInfoMatch
      ? missingInfoMatch[1]
          .split('\n')
          .filter((line) => line.trim().startsWith('-'))
          .map((line) => line.replace(/^-\s*/, '').trim())
      : [];

    return {
      ...state,
      clarityScore: overallScore,
      missingInformation: missingInfo,
    };
  }

  /**
   * Generate self-questions to improve analysis
   */
  private async generateQuestionsNode(state: typeof AgentWorkflowState.State) {
    const { currentAnalysis, missingInformation, context } = state;

    // Get max questions from config
    const maxQuestions =
      (context as AgentContext & { maxQuestionsPerIteration?: number }).maxQuestionsPerIteration ||
      3;

    const model = this.llmService.getChatModel({
      temperature: 0.4,
      maxTokens: 1500, // Reduced for speed
    });

    // Limit gaps to top 3 for speed
    const topGaps = missingInformation.slice(0, 3);

    const questionPrompt = `You are helping improve an analysis by asking clarifying questions.

Current analysis:
${currentAnalysis.substring(0, 500)}... [truncated for speed]

Top identified gaps:
${topGaps.map((gap, i) => `${i + 1}. ${gap}`).join('\n')}

Generate ${maxQuestions} specific, actionable questions that would help fill these gaps.
Make the questions concrete and focused.

Format:
1. [Question]
2. [Question]
${maxQuestions > 2 ? '3. [Question]' : ''}`;

    const result = await model.invoke([questionPrompt], {
      runName: `${this.getAgentName()}-GenerateQuestions`,
    });

    const questionsText = typeof result === 'string' ? result : result.content?.toString() || '';

    // Parse questions and limit to maxQuestions
    const questions = questionsText
      .split('\n')
      .filter((line) => /^\d+\./.test(line.trim()))
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .slice(0, maxQuestions); // Enforce limit

    return {
      ...state,
      selfQuestions: questions,
    };
  }

  /**
   * Refine analysis based on self-questions
   * Focus on incremental improvements - answer questions, add details, fill gaps
   */
  private async refineAnalysisNode(state: typeof AgentWorkflowState.State) {
    const { currentAnalysis, selfQuestions, context, iteration } = state;

    const systemPrompt = await this.buildSystemPrompt(context);
    const humanPrompt = await this.buildHumanPrompt(context);

    const refinementPrompt = `You are improving your previous analysis. Focus on INCREMENTAL IMPROVEMENTS.

Previous analysis:
${currentAnalysis}

Questions to address in this iteration:
${selfQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Instructions:
1. Keep everything good from the previous analysis
2. Answer each question specifically with concrete details
3. Add missing information identified in the questions
4. Make improvements focused and targeted
5. Don't rewrite everything - just enhance what's there

Provide an ENHANCED version that addresses these ${selfQuestions.length} specific questions.
Focus on quality over length - small, precise improvements are better than verbose rewrites.`;

    const model = this.llmService.getChatModel({
      temperature: 0.3,
      maxTokens: 16000,
    });

    const result = await model.invoke([systemPrompt, humanPrompt, refinementPrompt], {
      runName: `${this.getAgentName()}-Refinement-${iteration}`,
    });

    const refinedAnalysis = typeof result === 'string' ? result : result.content?.toString() || '';

    return {
      ...state,
      currentAnalysis: refinedAnalysis,
      iteration: iteration + 1,
      refinementNotes: [
        `Iteration ${iteration}: Addressed ${selfQuestions.length} questions with focused improvements`,
      ],
    };
  }

  /**
   * Finalize the output
   */
  private async finalizeOutputNode(state: typeof AgentWorkflowState.State) {
    return {
      ...state,
      finalAnalysis: state.currentAnalysis,
    };
  }

  /**
   * Determine if analysis should be refined
   */
  private shouldRefine(state: typeof AgentWorkflowState.State): string {
    const config = state as unknown as {
      configurable?: { maxIterations?: number; clarityThreshold?: number };
    };
    const maxIterations = config.configurable?.maxIterations || 3;
    const clarityThreshold = config.configurable?.clarityThreshold || 80;

    // Check if we've reached max iterations
    if (state.iteration >= maxIterations) {
      return 'finalize';
    }

    // Check if clarity is sufficient
    if (state.clarityScore >= clarityThreshold) {
      return 'finalize';
    }

    // Refine
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
