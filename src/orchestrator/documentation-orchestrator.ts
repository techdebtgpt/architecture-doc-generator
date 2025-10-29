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
import { LLMService } from '../llm/llm-service';

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
  onAgentProgress?: (current: number, total: number, agentName: string) => void;
}

/**
 * Documentation Orchestrator
 * Manages multi-agent documentation generation with LangGraph state-based workflows
 */
export class DocumentationOrchestrator {
  private logger = new OrchestratorLogger();
  private workflow: ReturnType<typeof this.buildWorkflow>;
  private checkpointer = new MemorySaver();
  private llmService = LLMService.getInstance();

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
   * SIMPLIFIED: Agents handle their own refinement internally,
   * orchestrator just executes them sequentially
   */
  private buildWorkflow() {
    const graph = new StateGraph(DocumentationState);

    // Define nodes
    graph.addNode('executeAgent', this.executeAgentNode.bind(this));
    graph.addNode('aggregateResults', this.aggregateResultsNode.bind(this));

    // Define edges with proper type casting
    const entryPoint = 'executeAgent' as '__start__';
    graph.setEntryPoint(entryPoint);

    // Conditional routing after agent execution
    // Each agent refines itself internally, orchestrator just moves to next agent
    graph.addConditionalEdges(entryPoint, this.shouldContinue.bind(this), {
      nextAgent: 'executeAgent' as '__start__',
      done: 'aggregateResults' as '__start__',
    });

    // End after aggregation
    graph.addEdge('aggregateResults' as '__start__', END);

    return graph.compile({ checkpointer: this.checkpointer });
  }

  /**
   * Determine if we should continue to next agent
   */
  private shouldContinue(state: typeof DocumentationState.State): string {
    const { currentAgentIndex, agentNames } = state;

    // Check if all agents are done
    if (currentAgentIndex >= agentNames.length) {
      return 'done';
    }

    return 'nextAgent';
  }

  /**
   * Execute current agent node
   * Each agent handles its own refinement internally via BaseAgentWorkflow
   */
  private async executeAgentNode(state: typeof DocumentationState.State) {
    const { scanResult, projectPath, options, currentAgentIndex, agentNames, agentResults } = state;

    if (currentAgentIndex >= agentNames.length) {
      return state; // All agents executed
    }

    const agentName = agentNames[currentAgentIndex];
    const agent = this.agentRegistry.getAllAgents()[currentAgentIndex];
    const totalAgents = agentNames.length;

    // Notify progress callback
    if (options.onAgentProgress) {
      options.onAgentProgress(currentAgentIndex + 1, totalAgents, agentName);
    }

    this.logger.log(`Executing agent: ${agentName} (${currentAgentIndex + 1}/${totalAgents})`);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 Agent ${currentAgentIndex + 1}/${totalAgents}: ${agentName}`);
    console.log('='.repeat(80));

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
      // Claude Sonnet 4 max: 200K input tokens - 10K safety margin - 8K max output = 182K budget
      tokenBudget: options.maxTokens || 182000,
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

      // Calculate cost for this agent
      const modelConfig = this.llmService.getModelConfig(
        this.llmService['defaultProvider'],
        this.llmService['getDefaultModel'](this.llmService['defaultProvider']),
      );
      const cost = this.llmService['tokenManager'].calculateCost(
        result.tokenUsage.inputTokens,
        result.tokenUsage.outputTokens,
        modelConfig.costPerMillionInputTokens,
        modelConfig.costPerMillionOutputTokens,
      );

      console.log(`\n✅ [${agentName}] Agent completed successfully`);
      console.log(
        `   📊 Summary: ${result.summary.substring(0, 100)}${result.summary.length > 100 ? '...' : ''}`,
      );
      console.log(`   ⏱️  Execution time: ${(result.executionTime / 1000).toFixed(2)}s`);
      console.log(`   🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(
        `   💰 Tokens: ${result.tokenUsage.totalTokens.toLocaleString()} (in: ${result.tokenUsage.inputTokens.toLocaleString()}, out: ${result.tokenUsage.outputTokens.toLocaleString()}) | Cost: $${cost.toFixed(4)}`,
      );

      // Update state and move to next agent
      const newAgentResults = new Map(agentResults);
      newAgentResults.set(agentName, result);

      return {
        ...state,
        agentResults: newAgentResults,
        currentAgentIndex: currentAgentIndex + 1, // Move to next agent
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
        currentAgentIndex: currentAgentIndex + 1, // Move to next agent even if failed
      };
    }
  }

  /**
   * Evaluate clarity of agent output
   */
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

    // Log final summary with per-agent breakdown
    const totalExecutionTime = Array.from(agentResults.values()).reduce(
      (sum, r) => sum + r.executionTime,
      0,
    );
    const totalInputTokens = Array.from(agentResults.values()).reduce(
      (sum, r) => sum + r.tokenUsage.inputTokens,
      0,
    );
    const totalOutputTokens = Array.from(agentResults.values()).reduce(
      (sum, r) => sum + r.tokenUsage.outputTokens,
      0,
    );
    const totalCost = (totalInputTokens / 1_000_000) * 3 + (totalOutputTokens / 1_000_000) * 15;
    const avgTokensPerAgent =
      agentResults.size > 0 ? Math.round(totalTokenUsage.totalTokens / agentResults.size) : 0;

    console.log('\n' + '='.repeat(80));
    console.log('📊 DOCUMENTATION GENERATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Agents completed: ${agentResults.size}`);
    console.log(`⏱️  Total time: ${(totalExecutionTime / 1000 / 60).toFixed(1)}m`);
    console.log(
      `💰 Total tokens: ${totalTokenUsage.totalTokens.toLocaleString()} (${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out)`,
    );
    console.log(`💵 Total cost: $${totalCost.toFixed(4)}`);
    console.log(`📈 Avg tokens per agent: ${avgTokensPerAgent.toLocaleString()}`);
    console.log('='.repeat(80) + '\n');

    return {
      ...state,
      output,
    };
  }

  /**
   * Determine if we should evaluate clarity
   */
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
