import type { AgentRegistry } from '@agents/agent-registry';
import type { FileSystemScanner } from '@scanners/file-system-scanner';
import type {
  AgentContext,
  AgentResult,
  AgentExecutionOptions,
  TokenUsage,
} from '../types/agent.types';
import type { ScanResult } from '../types/scanner.types';
import type {
  DocumentationOutput,
  ComponentDescription,
  CustomSection,
} from '../types/output.types';
import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';

/**
 * Simple logger for orchestrator
 */
class OrchestratorLogger {
  log(message: string): void {
    console.log(`[Documentation Orchestrator] ${message}`);
  }

  error(message: string, error?: unknown): void {
    console.error(`[Documentation Orchestrator ERROR] ${message}`, error);
  }
}

/**
 * Documentation generation state with LangGraph
 */
const DocumentationState = Annotation.Root({
  // Input state
  scanResult: Annotation<ScanResult>({
    reducer: (_, update) => update,
  }),
  projectPath: Annotation<string>({
    reducer: (_, update) => update,
  }),
  options: Annotation<OrchestratorOptions>({
    reducer: (_, update) => update,
  }),

  // Agent execution state
  currentAgentIndex: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
  agentNames: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  agentResults: Annotation<Map<string, AgentResult>>({
    reducer: (current, update) => {
      const newMap = new Map(current);
      for (const [key, value] of update.entries()) {
        newMap.set(key, value);
      }
      return newMap;
    },
    default: () => new Map(),
  }),

  // Refinement state
  refinementAttempts: Annotation<Map<string, number>>({
    reducer: (current, update) => {
      const newMap = new Map(current);
      for (const [key, value] of update.entries()) {
        newMap.set(key, value);
      }
      return newMap;
    },
    default: () => new Map(),
  }),
  clarityScores: Annotation<Map<string, number>>({
    reducer: (current, update) => {
      const newMap = new Map(current);
      for (const [key, value] of update.entries()) {
        newMap.set(key, value);
      }
      return newMap;
    },
    default: () => new Map(),
  }),

  // Output state
  output: Annotation<DocumentationOutput | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  executionTime: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
});

/**
 * Iterative refinement configuration
 */
export interface IterativeRefinementConfig {
  enabled: boolean;
  maxIterations: number;
  clarityThreshold: number;
  minImprovement: number;
}

/**
 * Orchestrator options
 */
export interface OrchestratorOptions {
  maxTokens?: number;
  parallel?: boolean;
  iterativeRefinement?: IterativeRefinementConfig;
  agentOptions?: AgentExecutionOptions;
}

/**
 * Documentation Orchestrator
 * Manages multi-agent documentation generation with LangGraph state-based workflows
 */
export class DocumentationOrchestrator {
  private logger = new OrchestratorLogger();
  private workflow: ReturnType<typeof this.buildWorkflow>;
  private checkpointer = new MemorySaver();

  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly scanner: FileSystemScanner,
  ) {
    this.workflow = this.buildWorkflow();
  }

  /**
   * Generate documentation using LangGraph state machine
   */
  async generateDocumentation(
    projectPath: string,
    options: OrchestratorOptions = {},
  ): Promise<DocumentationOutput> {
    const startTime = Date.now();

    this.logger.log('Starting documentation generation with LangGraph');

    // Scan project
    this.logger.log('Scanning project structure...');
    const scanResult = await this.scanner.scan({
      rootPath: projectPath,
      maxFiles: 10000,
      maxFileSize: 1048576,
      respectGitignore: true,
      includeHidden: false,
      followSymlinks: false,
    });

    // Get all agents
    const agents = this.agentRegistry.getAllAgents();
    const agentNames = agents.map((a) => a.getMetadata().name);

    this.logger.log(`Found ${agentNames.length} agents: ${agentNames.join(', ')}`);

    // Initial state
    const initialState = {
      scanResult,
      projectPath,
      options,
      currentAgentIndex: 0,
      agentNames,
      agentResults: new Map(),
      refinementAttempts: new Map(),
      clarityScores: new Map(),
      output: null,
      executionTime: 0,
    };

    // Execute workflow
    const config = {
      configurable: {
        thread_id: `doc-gen-${Date.now()}`,
      },
      recursionLimit: 200, // Support 6 agents × ~30 calls each + orchestration overhead
    };

    let finalState = initialState;
    for await (const state of await this.workflow.stream(initialState, config)) {
      // Get the last node's state
      const nodeNames = Object.keys(state);
      if (nodeNames.length > 0) {
        const lastNodeName = nodeNames[nodeNames.length - 1];
        // @ts-expect-error - Dynamic node names from StateGraph
        finalState = state[lastNodeName] || finalState;
      }
    }

    if (!finalState.output) {
      throw new Error('Documentation generation failed: no output produced');
    }

    const executionTime = Date.now() - startTime;
    this.logger.log(`Documentation generation completed in ${(executionTime / 1000).toFixed(2)}s`);

    const output = finalState.output as DocumentationOutput;
    return {
      ...output,
      metadata: {
        ...output.metadata,
        generationDuration: executionTime,
      },
    };
  }

  /**
   * Build the LangGraph workflow
   */
  private buildWorkflow() {
    const graph = new StateGraph(DocumentationState);

    // Define nodes
    graph.addNode('executeAgent', this.executeAgentNode.bind(this));
    graph.addNode('evaluateClarity', this.evaluateClarityNode.bind(this));
    graph.addNode('refineAgent', this.refineAgentNode.bind(this));
    graph.addNode('aggregateResults', this.aggregateResultsNode.bind(this));

    // Define edges with proper type casting
    const entryPoint = 'executeAgent' as '__start__';
    graph.setEntryPoint(entryPoint);

    // Conditional routing after agent execution
    graph.addConditionalEdges(entryPoint, this.shouldEvaluateClarity.bind(this), {
      evaluate: 'evaluateClarity' as '__start__',
      nextAgent: 'executeAgent' as '__start__',
      done: 'aggregateResults' as '__start__',
    });

    // Conditional routing after clarity evaluation
    graph.addConditionalEdges('evaluateClarity' as '__start__', this.shouldRefine.bind(this), {
      refine: 'refineAgent' as '__start__',
      nextAgent: 'executeAgent' as '__start__',
      done: 'aggregateResults' as '__start__',
    });

    // After refinement, evaluate again
    graph.addEdge('refineAgent' as '__start__', 'evaluateClarity' as '__start__');

    // End after aggregation
    graph.addEdge('aggregateResults' as '__start__', END);

    return graph.compile({ checkpointer: this.checkpointer });
  }

  /**
   * Execute current agent node
   */
  private async executeAgentNode(state: typeof DocumentationState.State) {
    const { scanResult, projectPath, options, currentAgentIndex, agentNames, agentResults } = state;

    if (currentAgentIndex >= agentNames.length) {
      return state; // All agents executed
    }

    const agentName = agentNames[currentAgentIndex];
    const agent = this.agentRegistry.getAllAgents()[currentAgentIndex];

    this.logger.log(`Executing agent: ${agentName}`);

    // Create agent context
    const context: AgentContext = {
      executionId: `agent-${agentName}-${Date.now()}`,
      projectPath,
      files: scanResult.files.map((f) => f.path),
      fileContents: new Map(),
      languageHints: scanResult.languages.map((lang) => ({
        language: lang.language,
        confidence: lang.percentage / 100,
        indicators: [lang.language],
        coverage: lang.percentage,
      })),
      projectMetadata: {
        name: projectPath.split(/[/\\]/).pop() || 'Unknown',
        type: 'Unknown',
      },
      previousResults: agentResults,
      config: {},
      tokenBudget: options.maxTokens || 100000,
      scanResult,
    };

    // Execute agent with runnable config for tracing
    const agentOptions: AgentExecutionOptions = {
      ...options.agentOptions,
      runnableConfig: {
        runName: `Agent-${agentName}`,
      },
    };

    try {
      const result = await agent.execute(context, agentOptions);

      // Update state
      const newAgentResults = new Map(agentResults);
      newAgentResults.set(agentName, result);

      return {
        ...state,
        agentResults: newAgentResults,
      };
    } catch (error) {
      this.logger.error(`Agent ${agentName} failed`, error);

      // Store failed result
      const failedResult: AgentResult = {
        agentName,
        status: 'failed',
        data: {},
        summary: `Agent failed: ${error instanceof Error ? error.message : String(error)}`,
        markdown: `# ${agentName} Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`,
        confidence: 0,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        executionTime: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        metadata: {},
      };

      const newAgentResults = new Map(agentResults);
      newAgentResults.set(agentName, failedResult);

      return {
        ...state,
        agentResults: newAgentResults,
      };
    }
  }

  /**
   * Evaluate clarity of agent output
   */
  private async evaluateClarityNode(state: typeof DocumentationState.State) {
    const { currentAgentIndex, agentNames, agentResults, clarityScores } = state;
    const agentName = agentNames[currentAgentIndex];
    const result = agentResults.get(agentName);

    if (!result) {
      return state;
    }

    this.logger.log(`Evaluating clarity for agent: ${agentName}`);

    // Simple clarity evaluation based on result completeness
    let score = 0;

    // Check if result has data
    if (result.data && Object.keys(result.data).length > 0) score += 30;

    // Check if result has summary
    if (result.summary && result.summary.length > 50) score += 20;

    // Check if result has markdown
    if (result.markdown && result.markdown.length > 200) score += 30;

    // Check confidence
    score += result.confidence * 20;

    this.logger.log(`Agent ${agentName} clarity score: ${score.toFixed(1)}%`);

    const newClarityScores = new Map(clarityScores);
    newClarityScores.set(agentName, score);

    return {
      ...state,
      clarityScores: newClarityScores,
    };
  }

  /**
   * Refine agent output based on clarity evaluation
   */
  private async refineAgentNode(state: typeof DocumentationState.State) {
    const { currentAgentIndex, agentNames, refinementAttempts } = state;
    const agentName = agentNames[currentAgentIndex];

    const currentAttempts = refinementAttempts.get(agentName) || 0;
    const newAttempts = currentAttempts + 1;

    this.logger.log(`Refining agent ${agentName} (attempt ${newAttempts})`);

    // Update refinement attempts
    const newRefinementAttempts = new Map(refinementAttempts);
    newRefinementAttempts.set(agentName, newAttempts);

    // Re-execute agent (will be done in next executeAgent call with updated context)
    return {
      ...state,
      refinementAttempts: newRefinementAttempts,
    };
  }

  /**
   * Aggregate all agent results into final output
   */
  private async aggregateResultsNode(state: typeof DocumentationState.State) {
    const { scanResult, agentResults } = state;

    this.logger.log('Aggregating results from all agents...');

    // Calculate total token usage
    const totalTokenUsage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    for (const result of agentResults.values()) {
      totalTokenUsage.inputTokens += result.tokenUsage.inputTokens;
      totalTokenUsage.outputTokens += result.tokenUsage.outputTokens;
      totalTokenUsage.totalTokens += result.tokenUsage.totalTokens;
    }

    // Create output
    const output: DocumentationOutput = {
      projectName: scanResult.projectPath.split(/[/\\]/).pop() || 'Unknown Project',
      timestamp: new Date(),
      version: '1.0.0',
      overview: {
        description: `Documentation for ${scanResult.projectPath}`,
        primaryLanguage: scanResult.languages[0]?.language || 'Unknown',
        languages: scanResult.languages.map((l) => l.language),
        frameworks: [],
        projectType: 'Unknown',
        keyFeatures: [],
        statistics: {
          totalFiles: scanResult.totalFiles,
          totalLines: 0,
          totalSize: scanResult.totalSize,
          codeFiles: scanResult.totalFiles,
          testFiles: 0,
          configFiles: 0,
        },
      },
      architecture: {
        style: this.extractArchitectureStyle(agentResults),
        patterns: this.extractArchitecturePatterns(agentResults),
        components: this.extractComponents(agentResults) as ComponentDescription[],
        relationships: [],
        dataFlow: 'To be analyzed',
        designPrinciples: [],
      },
      fileStructure: {
        rootStructure: {
          name: scanResult.projectPath.split(/[/\\]/).pop() || 'root',
          path: scanResult.rootPath,
          purpose: 'Project root directory',
          children: [],
        },
        keyDirectories: new Map(),
        organizationStrategy: 'To be analyzed',
        namingConventions: [],
      },
      dependencies: {
        productionDeps: [],
        developmentDeps: [],
        dependencyGraph: { nodes: [], edges: [] },
        outdatedDeps: [],
        vulnerabilities: [],
        insights: [],
      },
      patterns: {
        designPatterns: [],
        architecturalPatterns: [],
        antiPatterns: [],
        codePatterns: [],
        recommendations: [],
      },
      codeQuality: {
        overallScore: 0,
        metrics: {
          maintainability: 0,
          reliability: 0,
          security: 0,
          testCoverage: 0,
          codeSmells: 0,
          technicalDebt: '0h',
        },
        issues: [],
        bestPractices: [],
        improvements: [],
        complexity: {
          averageComplexity: 0,
          highComplexityFiles: [],
          complexityDistribution: new Map(),
        },
      },
      customSections: new Map(
        Object.entries(this.integrateAgentResults(agentResults)).map(([key, value]) => [
          key,
          value as CustomSection,
        ]),
      ),
      metadata: {
        generatorVersion: '1.0.0',
        generationDuration: 0,
        totalTokensUsed: totalTokenUsage.totalTokens,
        agentsExecuted: Array.from(agentResults.keys()),
        configuration: {},
        warnings: this.collectWarnings(agentResults),
      },
    };

    return {
      ...state,
      output,
    };
  }

  /**
   * Determine if we should evaluate clarity
   */
  private shouldEvaluateClarity(state: typeof DocumentationState.State): string {
    const { options, currentAgentIndex, agentNames } = state;
    const refinementConfig = options.iterativeRefinement;

    // If refinement is disabled, skip evaluation
    if (!refinementConfig?.enabled) {
      // Move to next agent or done
      const nextIndex = currentAgentIndex + 1;
      if (nextIndex >= agentNames.length) {
        return 'done';
      }
      return 'nextAgent';
    }

    // Evaluate clarity
    return 'evaluate';
  }

  /**
   * Determine if we should refine the agent output
   */
  private shouldRefine(state: typeof DocumentationState.State): string {
    const { options, currentAgentIndex, agentNames, refinementAttempts, clarityScores } = state;

    const agentName = agentNames[currentAgentIndex];
    const refinementConfig = options.iterativeRefinement!;
    const attempts = refinementAttempts.get(agentName) || 0;
    const score = clarityScores.get(agentName) || 0;

    // Check if we should refine
    if (score >= refinementConfig.clarityThreshold) {
      this.logger.log(`Agent ${agentName} passed clarity threshold (${score}%)`);
      // Move to next agent
      const nextState = {
        ...state,
        currentAgentIndex: currentAgentIndex + 1,
      };
      if (nextState.currentAgentIndex >= agentNames.length) {
        return 'done';
      }
      return 'nextAgent';
    }

    if (attempts >= refinementConfig.maxIterations) {
      this.logger.log(`Agent ${agentName} reached max refinement attempts (${attempts})`);
      // Move to next agent
      const nextState = {
        ...state,
        currentAgentIndex: currentAgentIndex + 1,
      };
      if (nextState.currentAgentIndex >= agentNames.length) {
        return 'done';
      }
      return 'nextAgent';
    }

    // Refine
    return 'refine';
  }

  /**
   * Extract architecture style from agent results
   */
  private extractArchitectureStyle(agentResults: Map<string, AgentResult>): string {
    const archResult = agentResults.get('architecture-analyzer');
    if (archResult && archResult.data && 'style' in archResult.data) {
      return archResult.data.style as string;
    }
    return 'Unknown';
  }

  /**
   * Extract architecture patterns from agent results
   */
  private extractArchitecturePatterns(agentResults: Map<string, AgentResult>): string[] {
    const patterns: string[] = [];

    const archResult = agentResults.get('architecture-analyzer');
    if (archResult && archResult.data && 'layers' in archResult.data) {
      const layers = archResult.data.layers;
      if (Array.isArray(layers)) {
        patterns.push(...layers);
      }
    }

    const patternResult = agentResults.get('pattern-detector');
    if (patternResult && patternResult.data && 'architecturalPatterns' in patternResult.data) {
      const archPatterns = patternResult.data.architecturalPatterns;
      if (Array.isArray(archPatterns)) {
        patterns.push(
          ...archPatterns
            .map((p: unknown) => {
              if (typeof p === 'string') return p;
              if (p && typeof p === 'object' && 'name' in p) return (p as { name: string }).name;
              return '';
            })
            .filter(Boolean),
        );
      }
    }

    return [...new Set(patterns)];
  }

  /**
   * Extract components from agent results
   */
  private extractComponents(agentResults: Map<string, AgentResult>): unknown[] {
    const archResult = agentResults.get('architecture-analyzer');
    if (archResult && archResult.data && 'components' in archResult.data) {
      const components = archResult.data.components;
      if (Array.isArray(components)) {
        return components;
      }
    }
    return [];
  }

  /**
   * Integrate agent results into customSections
   */
  private integrateAgentResults(agentResults: Map<string, AgentResult>): Record<string, unknown> {
    const customSections: Record<string, unknown> = {};

    for (const [agentName, result] of agentResults.entries()) {
      if (result.status === 'success' || result.status === 'partial') {
        customSections[agentName] = {
          title: result.summary || agentName,
          content: result.markdown || 'No content generated',
          status: result.status,
          summary: result.summary,
          data: result.data,
          markdown: result.markdown,
          confidence: result.confidence,
          executionTime: result.executionTime,
          warnings: result.warnings,
          metadata: result.metadata || {},
        };
      }
    }

    return customSections;
  }

  /**
   * Collect all warnings from agent results
   */
  private collectWarnings(agentResults: Map<string, AgentResult>): string[] {
    const warnings: string[] = [];

    for (const [agentName, result] of agentResults.entries()) {
      if (result.errors.length > 0) {
        warnings.push(`${agentName}: ${result.errors.join(', ')}`);
      }
      if (result.warnings.length > 0) {
        warnings.push(...result.warnings.map((w) => `${agentName}: ${w}`));
      }
    }

    return warnings;
  }
}
