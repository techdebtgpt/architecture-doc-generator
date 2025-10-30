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
import { Logger } from '../utils/logger';
import { version } from '../../package.json';
import { ImportScanner } from '../scanners/import-scanner';
import type { DependencyGraph, ImportInfo, ModuleInfo } from '../scanners/import-scanner';

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

  // Dependency graph state
  dependencyGraph: Annotation<{
    imports: ImportInfo[];
    modules: ModuleInfo[];
    graph: DependencyGraph;
  } | null>({
    reducer: (_, update) => update,
    default: () => null,
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
  runName?: string; // Custom run name for LangSmith tracing (supports {timestamp}, {agent}, {project})
}

/**
 * Documentation Orchestrator
 * Manages multi-agent documentation generation with LangGraph state-based workflows
 */
export class DocumentationOrchestrator {
  private logger = new Logger('DocumentationOrchestrator');
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

    this.logger.info(`Starting documentation generation with LangGraph (v${version})`);

    // Scan project
    this.logger.info('Scanning project structure...');
    const scanResult = await this.scanner.scan({
      rootPath: projectPath,
      maxFiles: 10000,
      maxFileSize: 1048576,
      respectGitignore: true,
      includeHidden: false,
      followSymlinks: false,
    });

    // Scan imports and build dependency graph
    this.logger.info('Analyzing dependencies and imports...');
    const importScanner = new ImportScanner();
    const { imports, modules, graph } = await importScanner.scanProject(
      projectPath,
      scanResult.files.map((f) => f.path),
    );

    this.logger.info(
      `Found ${imports.length} imports, ${modules.length} modules, ${graph.edges.length} dependencies`,
    );

    // Get all agents
    const agents = this.agentRegistry.getAllAgents();
    const agentNames = agents.map((a) => a.getMetadata().name);

    this.logger.info(`Found ${agentNames.length} agents: ${agentNames.join(', ')}`);

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
      dependencyGraph: { imports, modules, graph },
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        finalState = (state as any)[lastNodeName] || finalState;
      }
    }

    if (!finalState.output) {
      throw new Error('Documentation generation failed: no output produced');
    }

    const executionTime = Date.now() - startTime;
    this.logger.info(`Documentation generation completed in ${(executionTime / 1000).toFixed(2)}s`);

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
    const {
      scanResult,
      projectPath,
      options,
      currentAgentIndex,
      agentNames,
      agentResults,
      dependencyGraph,
    } = state;

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

    this.logger.info(`Executing agent: ${agentName} (${currentAgentIndex + 1}/${totalAgents})`);
    this.logger.info('='.repeat(80));
    this.logger.info(`📋 Agent ${currentAgentIndex + 1}/${totalAgents}: ${agentName}`);
    this.logger.info('='.repeat(80));

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
      config: {
        // Pass iterative refinement configuration to agents
        maxIterations: options.iterativeRefinement?.maxIterations,
        clarityThreshold: options.iterativeRefinement?.clarityThreshold,
        maxQuestionsPerIteration: options.agentOptions?.maxQuestionsPerIteration,
      },
      // Claude Sonnet 4 max: 200K input tokens - 10K safety margin - 8K max output = 182K budget
      tokenBudget: options.maxTokens || 182000,
      scanResult,
      dependencyGraph: dependencyGraph || undefined,
    };

    // Execute agent with runnable config for tracing
    const customRunName = options.runName
      ? options.runName
          .replace('{timestamp}', new Date().toISOString())
          .replace('{agent}', agentName)
          .replace('{project}', projectPath.split(/[\\/]/).pop() || 'unknown')
      : `Agent-${agentName}`;

    const agentOptions: AgentExecutionOptions = {
      ...options.agentOptions,
      runnableConfig: {
        runName: customRunName,
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

      // Use emoji as the log icon, not in the message
      this.logger.info(`Agent completed successfully`, '✅');
      this.logger.info(
        `   📊 Summary: ${result.summary.substring(0, 100)}${result.summary.length > 100 ? '...' : ''}`,
      );
      this.logger.info(`   ⏱️  Execution time: ${(result.executionTime / 1000).toFixed(2)}s`);
      this.logger.info(`   🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      this.logger.info(
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
    } catch (_error) {
      this.logger.error(`Agent ${agentName} failed`, _error);

      // Store failed result
      const failedResult: AgentResult = {
        agentName,
        status: 'failed',
        data: {},
        summary: `Agent failed: ${_error instanceof Error ? (_error as Error).message : String(_error)}`,
        markdown: `# ${agentName} Failed\n\nError: ${_error instanceof Error ? (_error as Error).message : String(_error)}`,
        confidence: 0,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        executionTime: 0,
        errors: [_error instanceof Error ? (_error as Error).message : String(_error)],
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

    this.logger.info('Aggregating results from all agents...');

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

    this.logger.info('\n' + '='.repeat(80));
    this.logger.info('📊 DOCUMENTATION GENERATION SUMMARY');
    this.logger.info('='.repeat(80));
    this.logger.info(`✅ Agents completed: ${agentResults.size}`);
    this.logger.info(`⏱️  Total time: ${(totalExecutionTime / 1000 / 60).toFixed(1)}m`);
    this.logger.info(
      `💰 Total tokens: ${totalTokenUsage.totalTokens.toLocaleString()} (${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out)`,
    );
    this.logger.info(`💵 Total cost: $${totalCost.toFixed(4)}`);
    this.logger.info(`📈 Avg tokens per agent: ${avgTokensPerAgent.toLocaleString()}`);
    this.logger.info('='.repeat(80));

    // Key Highlights
    this.logger.info('📌 Key Highlights:');

    const agentHighlights = [
      { name: 'architecture-analyzer', emoji: '🤖', label: 'Architecture Analysis' },
      { name: 'file-structure', emoji: '📁', label: 'File Structure' },
      { name: 'dependency-analyzer', emoji: '📦', label: 'Dependencies' },
      { name: 'pattern-detector', emoji: '🎨', label: 'Patterns' },
      { name: 'flow-visualization', emoji: '🔄', label: 'Data Flow' },
      { name: 'schema-generator', emoji: '🗄️', label: 'Schema' },
      { name: 'security-analyzer', emoji: '🔒', label: 'Security Analysis' },
    ];

    for (const { name, emoji, label } of agentHighlights) {
      const result = agentResults.get(name);
      if (result && result.confidence) {
        const confidencePercent = (result.confidence * 100).toFixed(1);
        const summary = result.summary ? ` - ${result.summary.substring(0, 80)}...` : '';
        this.logger.info(`${emoji} ${label}: ${confidencePercent}% clarity score${summary}`);
      }
    }

    this.logger.info('='.repeat(80) + '\n');

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
