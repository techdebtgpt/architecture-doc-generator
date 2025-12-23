import { AgentRegistry } from '../agents/agent-registry';
import { FileSystemScanner } from '../scanners/file-system-scanner';
import { Logger } from '../utils/logger';
import { LLMService } from '../llm/llm-service';
import { AgentResult, AgentContext, AgentExecutionOptions } from '../types/agent.types';
import { StateGraph, END, StateGraphArgs, MemorySaver } from '@langchain/langgraph';
import type { ScanResult } from '../types/scanner.types';
import { ImportScanner } from '../scanners/import-scanner';
import type { DependencyGraph, ImportInfo, ModuleInfo } from '../scanners/import-scanner';

/**
 * Iterative refinement configuration
 */
export interface IterativeRefinementConfig {
  enabled: boolean;
  maxIterations: number;
  clarityThreshold: number;
  minImprovement: number;
}

export interface OrchestratorOptions {
  maxTokens?: number;
  maxCostDollars?: number; // Maximum cost in dollars before halting execution (default: $5)
  parallel?: boolean;
  userPrompt?: string;
  /**
   * Analysis depth level:
   * - 'quick' (1): 1 question, 1 iteration per level (fastest, ~3 min)
   * - 'normal' (2): 2-3 questions, 1-2 iterations per level (balanced, ~5-8 min)
   * - 'deep' (3): 3-4 questions, 2-3 iterations per level (comprehensive, ~10-15 min)
   */
  depth?: 'quick' | 'normal' | 'deep' | 1 | 2 | 3;
  iterativeRefinement?: IterativeRefinementConfig;
  agentOptions?: AgentExecutionOptions;
  onAgentProgress?: (current: number, total: number, agentName: string) => void;
  runName?: string; // Custom run name for LangSmith tracing (supports {timestamp}, {agent}, {project})
  retrievalStrategy?: 'vector' | 'graph' | 'hybrid' | 'smart'; // File retrieval strategy for hybrid search
  embeddingsProvider?: 'local' | 'openai' | 'google'; // Embeddings provider for vector search (default: local)
  languageConfig?: {
    custom?: Record<
      string,
      {
        displayName?: string;
        filePatterns?: {
          extensions?: string[];
          namePatterns?: string[];
          excludePatterns?: string[];
        };
        importPatterns?: Record<string, string>;
        componentPatterns?: Record<string, string[]>;
        keywords?: Record<string, string[]>;
        frameworks?: string[];
      }
    >;
    overrides?: Record<
      string,
      {
        filePatterns?: {
          extensions?: string[];
          excludePatterns?: string[];
        };
        keywords?: Record<string, string[]>;
      }
    >;
  };
  [key: string]: any;
}

export interface C4ModelOutput {
  projectName: string;
  timestamp: Date;
  c4Model: {
    context: any;
    containers: any;
    components: any;
  };
  plantUMLModel: {
    context: string;
    containers: string;
    components: string;
  };
  scanResult: ScanResult;
  agentResults: Map<string, AgentResult>;
  metadata: {
    generationDuration: number;
    agentsExecuted: string[];
    totalFiles: number;
    totalDirectories: number;
    languages: string[];
  };
}

// Define the state for the C4 model generation workflow
const C4ModelState: StateGraphArgs<any>['channels'] = {
  projectPath: {
    value: (_: string, y: string) => y,
    default: () => '',
  },
  options: {
    value: (_: OrchestratorOptions, y: OrchestratorOptions) => y,
    default: () => ({}),
  },
  scanResult: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  agentResults: {
    value: (x: Map<string, AgentResult>, y: Map<string, AgentResult>) => {
      const newMap = new Map(x);
      for (const [key, value] of y.entries()) {
        newMap.set(key, value);
      }
      return newMap;
    },
    default: () => new Map(),
  },
  // Dependency graph state
  dependencyGraph: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  // Shared vector store (initialized once, reused by all agents)
  vectorStore: {
    value: (_: any, y: any) => y,
    default: () => undefined,
  },
  // Orchestrator-level token usage (for synthesis, etc.)
  orchestratorTokens: {
    value: (
      current: { inputTokens: number; outputTokens: number },
      update: { inputTokens: number; outputTokens: number },
    ) => ({
      inputTokens: current.inputTokens + update.inputTokens,
      outputTokens: current.outputTokens + update.outputTokens,
    }),
    default: () => ({ inputTokens: 0, outputTokens: 0 }),
  },
  c4Model: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  plantUMLModel: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  c4Context: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  c4Containers: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  c4Components: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  currentAgentIndex: {
    value: (_: number, y: number) => y,
    default: () => 0,
  },
  agentNames: {
    value: (_: string[], y: string[]) => y,
    default: () => [],
  },
};

type C4State = {
  projectPath: string;
  options: OrchestratorOptions;
  scanResult: any;
  agentResults: Map<string, AgentResult>;
  dependencyGraph: {
    imports: ImportInfo[];
    modules: ModuleInfo[];
    graph: DependencyGraph;
  } | null;
  vectorStore:
    | {
        searchFiles: (
          query: string,
          topK?: number,
        ) => Promise<Array<{ path: string; score: number }>>;
        cleanup: () => void;
      }
    | undefined;
  orchestratorTokens: { inputTokens: number; outputTokens: number };
  c4Model: any;
  plantUMLModel: any;
  c4Context: any;
  c4Containers: any;
  c4Components: any;
  currentAgentIndex: number;
  agentNames: string[];
};

export class C4ModelOrchestrator {
  private logger = new Logger('C4ModelOrchestrator');
  private workflow: ReturnType<typeof this.buildWorkflow>;
  private checkpointer = new MemorySaver();
  private llmService: LLMService;
  private config: any;

  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly scanner: FileSystemScanner,
    config?: any,
  ) {
    this.config = config || {};
    // Initialize LLM service with config
    this.llmService = LLMService.getInstance(config);
    this.workflow = this.buildWorkflow();
  }

  /**
   * Get analysis depth configuration based on depth option
   */
  private getDepthConfig(depth?: 'quick' | 'normal' | 'deep' | 1 | 2 | 3): {
    questionsPerLevel: { context: number; containers: number; components: number };
    iterations: { context: number; containers: number; components: number };
    description: string;
  } {
    const normalizedDepth =
      depth === 'quick' || depth === 1 ? 1 : depth === 'deep' || depth === 3 ? 3 : 2; // 'normal' or 2 or undefined

    switch (normalizedDepth) {
      case 1: // Quick
        return {
          questionsPerLevel: { context: 1, containers: 1, components: 1 },
          iterations: { context: 1, containers: 1, components: 1 },
          description: 'Quick analysis (1 question per level, 1 iteration)',
        };
      case 3: // Deep
        return {
          questionsPerLevel: { context: 4, containers: 4, components: 4 },
          iterations: { context: 3, containers: 3, components: 3 },
          description: 'Deep analysis (4 questions per level, up to 3 iterations)',
        };
      default: // Normal (2)
        return {
          questionsPerLevel: { context: 2, containers: 3, components: 3 },
          iterations: { context: 2, containers: 2, components: 2 },
          description: 'Normal analysis (2-3 questions per level, up to 2 iterations)',
        };
    }
  }

  /**
   * Strip markdown code blocks from LLM output before parsing JSON
   */
  private stripMarkdownCodeBlocks(text: string): string {
    const trimmed = text.trim();

    // Remove ```json\n...\n``` or ```\n...\n``` (handles multiline)
    const codeBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/;
    const match = trimmed.match(codeBlockRegex);
    if (match) {
      return match[1].trim();
    }

    // Also try to extract JSON if there's markdown before/after
    const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    return trimmed;
  }

  async generateC4Model(
    projectPath: string,
    options: OrchestratorOptions = {},
  ): Promise<C4ModelOutput> {
    const startTime = Date.now();
    this.logger.info('Starting C4 model generation...');

    // Apply custom language configuration if provided
    if (options.languageConfig) {
      this.logger.debug('Applying custom language configuration...');
      const { applyLanguageConfig } = await import('../config/language-config');
      applyLanguageConfig(options.languageConfig);
    }

    // 1. Scan project
    this.logger.info('Scanning project structure...');
    const scanResult = await this.scanner.scan({
      rootPath: projectPath,
      maxFiles: 10000,
      maxFileSize: 1048576,
      respectGitignore: true,
      includeHidden: false,
      followSymlinks: false,
      force: options.force,
      since: options.since,
    });

    this.logger.info(
      `📁 Found ${scanResult.totalFiles} files in ${scanResult.totalDirectories} directories`,
    );
    if (scanResult.files.length > 0) {
      this.logger.debug(`   Analyzing ${scanResult.files.length} code files`);
    }

    // 2. Scan imports and build dependency graph
    this.logger.info('Analyzing dependencies and imports...');
    const importScanner = new ImportScanner();
    const { imports, modules, graph } = await importScanner.scanProject(
      projectPath,
      scanResult.files.map((f) => f.relativePath),
    );

    this.logger.info(
      `🔗 Found ${imports.length} imports, ${modules.length} modules, ${graph.edges.length} dependencies`,
    );
    if (modules.length > 0) {
      this.logger.debug(
        `   Top modules: ${modules
          .slice(0, 3)
          .map((m) => m.path)
          .join(', ')}${modules.length > 3 ? ', ...' : ''}`,
      );
    }

    // 3. Get agents
    const agents = this.agentRegistry.getAllAgents();
    const agentNames = agents.map((a) => a.getMetadata().name);
    this.logger.info(`🤖 Registered ${agentNames.length} agents: ${agentNames.join(', ')}`);

    // Validate embeddings API key if vector search mode is enabled
    if (options.agentOptions?.searchMode === 'vector') {
      // Determine embeddings provider from options or config (default: local - FREE!)
      const embeddingsProvider = (
        options.embeddingsProvider ||
        this.config.searchMode?.embeddingsProvider ||
        'local'
      ).toLowerCase();

      // Check for provider-specific API keys in config
      const hasOpenAIKey = this.config.apiKeys?.openai || this.config.embeddings?.openai;
      const hasGoogleKey = this.config.apiKeys?.google || this.config.embeddings?.google;

      const providerHasKey =
        embeddingsProvider === 'local' || // Local embeddings are always available (FREE)
        (embeddingsProvider === 'openai' && hasOpenAIKey) ||
        (embeddingsProvider === 'google' && hasGoogleKey) ||
        embeddingsProvider === 'huggingface'; // Local models don't need key

      if (!providerHasKey) {
        const providerKeyMap: Record<string, string> = {
          openai: 'apiKeys.openai or embeddings.openai',
          google: 'apiKeys.google or embeddings.google',
          cohere: 'apiKeys.cohere',
          voyage: 'apiKeys.voyage',
        };

        const requiredKey = providerKeyMap[embeddingsProvider] || 'API key';
        const errorMsg = [
          `❌ Vector search with ${embeddingsProvider} provider requires an API key.`,
          '',
          `   Add ${requiredKey} to .archdoc.config.json`,
          '',
          '   Or run: archdoc config --init',
          '   Then select "Enable vector search with embeddings"',
          '',
          '   Tip: Use --search-mode keyword for fast, free search (default)',
        ].join('\n');

        this.logger.error(errorMsg);
        throw new Error(`Vector search requires ${requiredKey} in config`);
      }
    }

    // Initialize shared vector store once if vector search mode is enabled
    let sharedVectorStore:
      | {
          searchFiles: (
            query: string,
            topK?: number,
          ) => Promise<Array<{ path: string; score: number }>>;
          cleanup: () => void;
        }
      | undefined;

    if (options.agentOptions?.searchMode === 'vector') {
      // Determine embeddings provider from options (default: local - FREE!)
      const embeddingsProvider = (
        options.embeddingsProvider ||
        process.env.EMBEDDINGS_PROVIDER ||
        'local'
      ).toLowerCase() as 'local' | 'openai' | 'google' | 'cohere' | 'voyage' | 'huggingface';

      this.logger.info(
        `🔍 Initializing shared vector store with ${embeddingsProvider} embeddings...`,
      );
      const vectorStoreStart = Date.now();

      const { VectorSearchService } = await import('../services/vector-search.service');

      const embeddingsConfig = {
        provider: embeddingsProvider,
        // Model can be overridden via EMBEDDINGS_MODEL env var
        model: process.env.EMBEDDINGS_MODEL,
      };

      const vectorService = new VectorSearchService(
        projectPath,
        { imports, modules, graph },
        embeddingsConfig,
      );

      try {
        const availableFiles = scanResult.files.map((f) => f.path);
        await vectorService.initialize(availableFiles, {
          maxFileSize: 100000, // 100KB default
        });
        const initTime = Date.now() - vectorStoreStart;
        this.logger.info(
          `Vector store initialized in ${(initTime / 1000).toFixed(2)}s (${embeddingsProvider})`,
          '✅',
        );

        // Wrap vectorService methods for AgentContext
        sharedVectorStore = {
          searchFiles: async (query: string, topK = 10) => {
            const results = await vectorService.searchFiles(query, { topK });
            return results.map((result) => ({
              path: result.path,
              score: result.relevanceScore || 0,
            }));
          },
          cleanup: () => {
            // No explicit cleanup needed - garbage collector will handle it
            this.logger.debug('Vector store cleanup requested (memory will be freed by GC)');
          },
        };
      } catch (error) {
        this.logger.warn(
          `Failed to initialize vector store: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.logger.info('Falling back to keyword search mode');
        // Fallback to keyword search by not setting sharedVectorStore
      }
    }

    // 3. Initial state
    const initialState: C4State = {
      projectPath,
      options,
      scanResult,
      agentNames,
      agentResults: new Map(),
      dependencyGraph: { imports, modules, graph },
      vectorStore: sharedVectorStore, // Pass shared vector store to agents
      orchestratorTokens: { inputTokens: 0, outputTokens: 0 },
      c4Model: null,
      plantUMLModel: null,
      c4Context: null,
      c4Containers: null,
      c4Components: null,
      currentAgentIndex: 0,
    };

    // 4. Execute workflow
    const config = {
      configurable: {
        thread_id: `c4-gen-${Date.now()}`,
      },
      recursionLimit: 100,
    };

    let finalState: C4State = initialState;
    for await (const state of await this.workflow.stream(initialState, config)) {
      const nodeNames = Object.keys(state);
      if (nodeNames.length > 0) {
        const lastNodeName = nodeNames[nodeNames.length - 1];
        const nodeState = (state as any)[lastNodeName];
        // Merge node state into finalState
        finalState = { ...finalState, ...nodeState };
      }
    }

    const executionTime = Date.now() - startTime;
    this.logger.info(`C4 model generation completed in ${(executionTime / 1000).toFixed(2)}s`);
    this.logger.debug(
      'Final state c4Model:',
      JSON.stringify({
        hasC4Model: !!finalState.c4Model,
        hasContext: !!finalState.c4Context,
        hasContainers: !!finalState.c4Containers,
        hasComponents: !!finalState.c4Components,
      }),
    );

    return {
      projectName: projectPath.split(/[/\\]/).pop() || 'Unknown Project',
      timestamp: new Date(),
      c4Model: finalState.c4Model || {
        context: finalState.c4Context,
        containers: finalState.c4Containers,
        components: finalState.c4Components,
      },
      plantUMLModel: {
        context: finalState.plantUMLModel?.context || '',
        containers: finalState.plantUMLModel?.containers || '',
        components: finalState.plantUMLModel?.components || '',
      },
      scanResult,
      agentResults: finalState.agentResults || new Map(),
      metadata: {
        generationDuration: executionTime,
        agentsExecuted: Array.from((finalState.agentResults || new Map()).keys()),
        totalFiles: scanResult.totalFiles,
        totalDirectories: scanResult.totalDirectories,
        languages: scanResult.languages.map((l) => l.language),
      },
    };
  }

  private buildWorkflow() {
    const graph = new StateGraph({
      channels: C4ModelState,
    });

    /**
     * C4 Model Generation Workflow (Iterative, Agent-on-Demand)
     *
     * The workflow follows the C4 model hierarchy and queries agents as needed:
     * 1. Context (Level 1) → System boundary, actors, external systems
     * 2. Containers (Level 2) → Deployable units, technology stack
     * 3. Components (Level 3) → Internal modules, responsibilities
     * 4. Aggregate & Generate → Combine results and create PlantUML
     *
     * Agents can be called multiple times with specific questions.
     */
    graph.addNode('generateC4Context', this.generateC4Context.bind(this));
    graph.addNode('generateC4Containers', this.generateC4Containers.bind(this));
    graph.addNode('generateC4Components', this.generateC4Components.bind(this));
    graph.addNode('aggregateC4Model', this.aggregateC4Model.bind(this));
    graph.addNode('generatePlantUML', this.generatePlantUML.bind(this));

    // Start with Context (Level 1)
    graph.setEntryPoint('generateC4Context' as '__start__');

    // Flow: Context → Containers → Components → Aggregate → PlantUML
    graph.addEdge('generateC4Context' as '__start__', 'generateC4Containers' as '__start__');
    graph.addEdge('generateC4Containers' as '__start__', 'generateC4Components' as '__start__');
    graph.addEdge('generateC4Components' as '__start__', 'aggregateC4Model' as '__start__');
    graph.addEdge('aggregateC4Model' as '__start__', 'generatePlantUML' as '__start__');
    graph.addEdge('generatePlantUML' as '__start__', END);

    return graph.compile({ checkpointer: this.checkpointer }).withConfig({
      runName: `C4ModelOrchestrator-${Date.now()}`,
    });
  }

  /**
   * Helper: Query specific agents on-demand with targeted questions
   * This allows the orchestrator to call agents multiple times with different contexts
   */
  /**
   * Query agents with specific questions for targeted analysis
   */
  private async queryAgentsWithQuestions(
    state: C4State,
    agentNames: string[],
    questions: string[],
    purpose: string,
  ): Promise<Map<string, AgentResult>> {
    this.logger.info('\n' + '='.repeat(80));
    this.logger.info(`📊 ${purpose} Analysis`);
    this.logger.info('='.repeat(80));
    this.logger.info(`Questions: ${questions.length} | Agents: ${agentNames.length}`);

    const results = new Map<string, AgentResult>();
    const { scanResult, projectPath, agentResults, options, dependencyGraph, vectorStore } = state;

    // Get model config for cost calculation
    const modelConfig = this.llmService.getModelConfig(
      this.llmService['defaultProvider'],
      this.llmService['getDefaultModel'](this.llmService['defaultProvider']),
    );

    for (const [index, question] of questions.entries()) {
      this.logger.info(
        `❓ Question ${index + 1}/${questions.length}: ${question.substring(0, 100)}${question.length > 100 ? '...' : ''}`,
      );

      for (const agentName of agentNames) {
        const agent = this.agentRegistry.getAgent(agentName);
        if (!agent) {
          this.logger.warn(`   ⚠️  Agent ${agentName} not found, skipping`);
          continue;
        }

        this.logger.info(`   🤖 ${agentName}`);

        // Create agent context
        const context: AgentContext = {
          executionId: `c4-${purpose}-${agentName}-q${index}-${Date.now()}`,
          projectPath,
          files: scanResult.files.map((f: any) => f.path),
          fileContents: new Map(),
          projectMetadata: {
            c4Purpose: purpose,
            question,
            questionIndex: index,
          },
          previousResults: agentResults,
          config: {
            skipSelfRefinement: true, // Fast analysis for C4
            // Pass iterative refinement configuration to agents
            maxIterations: options.iterativeRefinement?.maxIterations || 1,
            clarityThreshold: options.iterativeRefinement?.clarityThreshold,
            maxQuestionsPerIteration: options.agentOptions?.maxQuestionsPerIteration,
            // Pass search mode from agent options
            searchMode: options.agentOptions?.searchMode,
          },
          languageHints: scanResult.languages.map((lang: any) => ({
            language: lang.language,
            confidence: lang.percentage / 100,
            indicators: [lang.language],
            coverage: lang.percentage,
          })),
          tokenBudget: options.maxTokens || 182000, // Claude Sonnet 4 max: 200K input tokens - 10K safety margin - 8K max output
          scanResult,
          query: question, // Pass question as query for agents to focus on
          dependencyGraph: dependencyGraph || undefined,
          vectorStore: vectorStore, // Pass shared vector store (initialized once)
        };

        // Check if agent can execute (has relevant data)
        const canExecute = await agent.canExecute(context);
        if (!canExecute) {
          this.logger.info(`   ⏭️  Skipped (no relevant data)`);
          const resultKey = `${agentName}-q${index}`;
          results.set(resultKey, {
            agentName,
            status: 'success' as const,
            data: {},
            summary: `No relevant ${agentName} data found in the project`,
            markdown: '',
            confidence: 0,
            tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            executionTime: 0,
            errors: [],
            warnings: [`No relevant data found - ${agentName} analysis skipped`],
            metadata: { skipped: true, reason: 'No relevant data' },
          });
          continue;
        }

        // Execute agent with runnable config for tracing
        const customRunName = options.runName
          ? options.runName
              .replace('{timestamp}', new Date().toISOString())
              .replace('{agent}', agentName)
              .replace('{project}', projectPath.split(/[\\/]/).pop() || 'unknown')
          : `C4-${purpose}-${agentName}-Q${index + 1}`;

        const agentOptions: AgentExecutionOptions = {
          ...options.agentOptions,
          skipSelfRefinement: true, // CRITICAL: Skip agent evaluation loop for speed
          runnableConfig: {
            ...options.agentOptions?.runnableConfig,
            runName: customRunName,
          },
        };

        try {
          const result = await agent.execute(context, agentOptions);

          // Calculate cost for this agent
          const cost = this.llmService['tokenManager'].calculateCost(
            result.tokenUsage.inputTokens,
            result.tokenUsage.outputTokens,
            modelConfig.costPerMillionInputTokens,
            modelConfig.costPerMillionOutputTokens,
          );

          const resultKey = `${agentName}-q${index}`;
          results.set(resultKey, result);

          const summary = result.summary?.substring(0, 80) || 'No summary';
          this.logger.info(`Agent completed successfully`, '✅');
          this.logger.info(`   📊 Summary: ${summary}${summary.length >= 80 ? '...' : ''}`);
          this.logger.info(`   ⏱️  Execution time: ${(result.executionTime / 1000).toFixed(2)}s`);
          this.logger.info(
            `   💰 Tokens: ${result.tokenUsage.totalTokens.toLocaleString()} (in: ${result.tokenUsage.inputTokens.toLocaleString()}, out: ${result.tokenUsage.outputTokens.toLocaleString()}) | Cost: $${cost.toFixed(4)}`,
          );

          // Check if total cost exceeds budget
          const maxCost = options.maxCostDollars || 5.0; // Default $5 budget
          let totalCost = 0;
          for (const agentResult of results.values()) {
            const agentCost = this.llmService['tokenManager'].calculateCost(
              agentResult.tokenUsage.inputTokens,
              agentResult.tokenUsage.outputTokens,
              modelConfig.costPerMillionInputTokens,
              modelConfig.costPerMillionOutputTokens,
            );
            totalCost += agentCost;
          }

          if (totalCost >= maxCost) {
            this.logger.warn(
              `🚨 BUDGET LIMIT REACHED: Total cost $${totalCost.toFixed(2)} >= $${maxCost.toFixed(2)} - Halting execution`,
            );
            // Return early to halt execution
            return results;
          }
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

          const resultKey = `${agentName}-q${index}`;
          results.set(resultKey, failedResult);
        }
      }
    }

    return results;
  }

  private async generateC4Context(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('📊 Generating C4 Context (Level 1: System Boundary)...');

    /**
     * C4 Context Requirements:
     * - System name and description (what the system does)
     * - Actors (users, personas, external entities that interact with the system)
     * - External Systems (databases, APIs, third-party services the system depends on)
     * - Relationships (how actors and external systems interact with the main system)
     */

    // Get depth configuration
    const depthConfig = this.getDepthConfig(state.options.depth);
    this.logger.info(`📐 Analysis depth: ${depthConfig.description}`);

    // Define questions based on depth
    const allQuestions = [
      // Question 1: Always included - System name and purpose
      `Read package.json (if exists) for project name, description, version. Read README.md (if exists) for stated purpose. Analyze main entry point files (main.ts, index.ts, app.ts, server.ts) for initialization code. Provide the ACTUAL system name and what it does based on code, not generic assumptions.`,

      // Question 2: Standard+ - User actors
      `Examine authentication/authorization files for user roles and permissions. Analyze API route definitions for different user types. Look for user-related types/interfaces/models. Check middleware, guards, decorators for role-based access. Provide ACTUAL role names from code (e.g., "Admin", "DataScientist"), not generic "User".`,

      // Question 3: Standard+ - External dependencies
      `Scan import statements for database clients (prisma, mongoose, pg, mysql, redis). Find API client libraries (axios, fetch, SDK imports). Check config files (.env.example, config.ts) for external service URLs and API keys. Look for third-party service integrations (Stripe, SendGrid, Auth0, AWS SDK). List ALL external systems THIS codebase depends on.`,

      // Question 4: Detailed only - Integration patterns
      `Analyze HOW the system integrates with external services. Check for API wrappers, client classes, service layers. Identify authentication methods (API keys, OAuth). Look for retry logic, error handling for external calls. Document integration patterns used.`,
    ];

    const questions = allQuestions.slice(0, depthConfig.questionsPerLevel.context);

    // Query agents with targeted questions
    const contextAgents = await this.queryAgentsWithQuestions(
      state,
      ['architecture-analyzer', 'file-structure'],
      questions,
      'C4 Context',
    );

    // Update state with agent results
    const updatedAgentResults = new Map(state.agentResults);
    contextAgents.forEach((result: AgentResult, name: string) =>
      updatedAgentResults.set(name, result),
    );

    const model = this.llmService.getChatModel({ temperature: 0.2, maxTokens: 16384 });

    // Compile insights from all agent responses
    const allInsights: string[] = [];
    for (const [key, result] of contextAgents.entries()) {
      const insight = this.extractAnalysisInsights(result.markdown || '', 3000);
      if (insight) {
        allInsights.push(`[${key}] ${insight}`);
      }
    }

    const compiledInsights = allInsights.join('\n\n---\n\n');

    // Get sample file contents for context
    const sampleFiles = this.getSampleFileContents(state, 10);

    const prompt = `
You are generating a C4 Model **Context Diagram (Level 1)** for a software system.

**Purpose**: Show the system as a black box, focusing on:
- The main software system (name and high-level purpose)
- Actors (users, personas, roles) who interact with it
- External systems (databases, APIs, third-party services) it depends on
- Relationships between actors, external systems, and the main system

**IMPORTANT**: Base your analysis on the ACTUAL codebase insights below. Do NOT invent generic examples.

**Analysis from Agents (${questions.length} questions analyzed):**
${compiledInsights.substring(0, 10000)}

**Sample Files:**
${sampleFiles}

**Instructions:**
1. Identify the ACTUAL system name from package.json, README, or code structure
2. List REAL actors based on API endpoints, authentication, user roles in code
3. List ACTUAL external systems from imports, API calls, database connections
4. Define SPECIFIC relationships based on actual code patterns
5. **CRITICAL**: DEDUPLICATE all findings. If the same actor, external system, or relationship appears multiple times in the analysis above (perhaps with slight variations), consolidate them into a SINGLE entry. Do not list duplicates.

**JSON Output Format:**
{
  "system": {
    "name": "Actual System Name (from code)",
    "description": "What the system actually does (from README/code)"
  },
  "actors": [
    {
      "name": "Actual Actor Role (from code)",
      "description": "What this actor actually does in the system"
    }
  ],
  "externalSystems": [
    {
      "name": "Actual External System (from imports/config)",
      "description": "How this external system is actually used"
    }
  ],
  "relationships": [
    {
      "source": "Actor/System Name",
      "destination": "System Name",
      "description": "Actual interaction pattern (from code)"
    }
  ]
}

Return ONLY valid JSON, no markdown formatting.
`;
    const result = await model.invoke(prompt, {
      runName: state.options.runName
        ? state.options.runName
            .replace('{timestamp}', new Date().toISOString())
            .replace('{agent}', 'C4-Context-Generator')
            .replace('{project}', state.projectPath.split(/[\\/]/).pop() || 'unknown')
        : 'C4-Context-Generator',
    });
    let c4Context = null;

    // Track orchestrator token usage
    const responseUsage =
      (result as any).usage_metadata || (result as any).response_metadata?.usage || {};
    const orchestratorTokens = {
      inputTokens: responseUsage.input_tokens || responseUsage.prompt_tokens || 0,
      outputTokens: responseUsage.output_tokens || responseUsage.completion_tokens || 0,
    };

    this.logger.debug('=== C4 CONTEXT RAW OUTPUT ===');
    this.logger.debug(result.content.toString().substring(0, 500));
    this.logger.debug('=== END RAW OUTPUT ===');

    try {
      const cleanedOutput = this.stripMarkdownCodeBlocks(result.content.toString());
      c4Context = JSON.parse(cleanedOutput);
      this.logger.info('✅ C4 Context parsed successfully');
    } catch (error) {
      this.logger.error('Failed to parse C4 Context JSON:', error);
      this.logger.error('Raw output length:', result.content.toString().length);
    }

    return { c4Context, agentResults: updatedAgentResults, orchestratorTokens };
  }

  private async generateC4Containers(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('📦 Generating C4 Containers (Level 2: Deployable Units)...');

    /**
     * C4 Containers Requirements:
     * - Containers (deployable/executable units: web app, API, database, microservice, mobile app)
     * - Technology choices for each container (Node.js, React, PostgreSQL, etc.)
     * - Relationships between containers (HTTP, gRPC, JDBC, message queue, etc.)
     */

    // Get depth configuration
    const depthConfig = this.getDepthConfig(state.options.depth);

    // Define questions based on depth
    const allQuestions = [
      // Question 1: Always - Deployment units
      `Read Dockerfile(s) - extract FROM images, EXPOSE ports, CMD/ENTRYPOINT. Read docker-compose.yml - list all services with their images/builds. Check Kubernetes manifests (k8s/, .k8s/, helm/) if present. If NO deployment files: analyze package.json scripts, README for deployment info. List ACTUAL deployment units.`,

      // Question 2: Standard+ - Tech stack
      `Read package.json dependencies - identify frameworks (NestJS, Express, React, Next.js, Angular). Analyze imports in main files - detect ORMs (Prisma, TypeORM), libraries. Check requirements.txt, Gemfile, pom.xml for non-JS projects. List runtime (Node.js version from .nvmrc, Dockerfile) and ALL key technologies used.`,

      // Question 3: Standard+ - Infrastructure
      `Find Prisma schema, TypeORM entities, Sequelize models for database. Detect Redis clients, connection configs for caching. Find BullMQ, RabbitMQ, Kafka imports for message queues. Look for S3 clients, file upload configs for storage. List ALL infrastructure components THIS system uses.`,

      // Question 4: Detailed only - Communication patterns
      `Analyze @Controller decorators, Express routes for HTTP/REST APIs. Find .proto files, gRPC client/server code. Detect Socket.IO, WS library for WebSocket. Check message queue publishers/subscribers. Extract actual port numbers, API paths, protocol details from code.`,
    ];

    const questions = allQuestions.slice(0, depthConfig.questionsPerLevel.containers);

    // Query agents with targeted questions
    const containerAgents = await this.queryAgentsWithQuestions(
      state,
      ['architecture-analyzer', 'dependency-analyzer'],
      questions,
      'C4 Containers',
    );

    // Update state with agent results
    const updatedAgentResults = new Map(state.agentResults);
    containerAgents.forEach((result: AgentResult, name: string) =>
      updatedAgentResults.set(name, result),
    );

    const model = this.llmService.getChatModel({ temperature: 0.2, maxTokens: 16384 });

    // Compile insights from all agent responses
    const allInsights: string[] = [];
    for (const [key, result] of containerAgents.entries()) {
      const insight = this.extractAnalysisInsights(result.markdown || '', 3000);
      if (insight) {
        allInsights.push(`[${key}] ${insight}`);
      }
    }

    const compiledInsights = allInsights.join('\n\n---\n\n');

    // Get sample files for technology stack identification
    const sampleFiles = this.getSampleFileContents(state, 8);

    const { c4Context } = state;

    const prompt = `
You are generating a C4 Model **Containers Diagram (Level 2)** for a software system.

**Purpose**: Break down the system into containers (deployable/executable units):
- Web applications, mobile apps, desktop apps
- APIs, microservices, serverless functions
- Databases (SQL, NoSQL, caches)
- Message brokers, event streams
- File systems, CDNs

For each container, specify:
- Name (clear, descriptive)
- Technology (programming language, framework, database type)
- Description (what it does, its responsibility)

Also define relationships between containers (HTTP REST, gRPC, JDBC, message queue, etc.)

**IMPORTANT**: Base your analysis on the ACTUAL codebase. Identify real containers from:
- package.json dependencies (Express = API, React = Web App, etc.)
- Dockerfile, docker-compose.yml (containerized services)
- Database connections in code (PostgreSQL, MongoDB, Redis)
- Import statements and service classes

**C4 Context (from Level 1):**
${c4Context ? JSON.stringify(c4Context, null, 2).substring(0, 1000) : 'Not available'}

**Analysis from Agents (${questions.length} questions analyzed):**
${compiledInsights.substring(0, 10000)}

**Sample Files:**
${sampleFiles}

**Instructions:**
1. Extract ACTUAL deployment units and technologies from the code analysis
2. Identify REAL containers from Dockerfiles, package.json, imports
3. **CRITICAL**: DEDUPLICATE all findings. If the same container or relationship appears multiple times in the analysis above (perhaps with slight variations), consolidate them into a SINGLE entry. Do not list duplicates.

**JSON Output Format:**
{
  "containers": [
    {
      "name": "Container Name",
      "technology": "e.g., Node.js, React, PostgreSQL",
      "description": "Container Description"
    }
  ],
  "relationships": [
    {
      "source": "Container/Actor Name",
      "destination": "Container Name",
      "description": "Interaction Description",
      "technology": "e.g., HTTPS, gRPC, JDBC"
    }
  ]
}
`;
    const result = await model.invoke(prompt, {
      runName: state.options.runName
        ? state.options.runName
            .replace('{timestamp}', new Date().toISOString())
            .replace('{agent}', 'C4-Containers-Generator')
            .replace('{project}', state.projectPath.split(/[\\/]/).pop() || 'unknown')
        : 'C4-Containers-Generator',
    });
    let c4Containers = null;

    // Track orchestrator token usage
    const responseUsage =
      (result as any).usage_metadata || (result as any).response_metadata?.usage || {};
    const orchestratorTokens = {
      inputTokens: responseUsage.input_tokens || responseUsage.prompt_tokens || 0,
      outputTokens: responseUsage.output_tokens || responseUsage.completion_tokens || 0,
    };

    try {
      const cleanedOutput = this.stripMarkdownCodeBlocks(result.content.toString());
      this.logger.debug('=== C4 CONTAINERS CLEANED OUTPUT ===');
      this.logger.debug(cleanedOutput);
      this.logger.debug('=== END CLEANED OUTPUT ===');

      c4Containers = JSON.parse(cleanedOutput);
      this.logger.info('✅ C4 Containers parsed successfully');
    } catch (error) {
      this.logger.error('Failed to parse C4 Containers JSON:', error);
      this.logger.error('Raw output length:', result.content.toString().length);
      this.logger.debug('=== C4 CONTAINERS RAW OUTPUT (first 1000 chars) ===');
      this.logger.debug(result.content.toString().substring(0, 1000));
      this.logger.debug('=== END RAW OUTPUT ===');
    }
    return { c4Containers, agentResults: updatedAgentResults, orchestratorTokens };
  }

  private async generateC4Components(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('🧩 Generating C4 Components (Level 3: Internal Modules)...');

    /**
     * C4 Components Requirements:
     * - Components (modules, classes, services within a container)
     * - Component responsibilities (what each component does)
     * - Component relationships (dependencies, interactions)
     *
     * Agents needed:
     * - architecture-analyzer: Component structure (if not already queried)
     * - pattern-detector: Design patterns and module organization
     */

    // Get depth configuration for targeted questions
    const depthConfig = this.getDepthConfig(state.options.depth);

    // Define questions based on depth (1-4 questions)
    const allQuestions = [
      // Question 1: Always included - Basic component structure
      `List top-level modules/folders (e.g., src/services/, src/controllers/, src/models/). Identify REAL class names from files. Look for main entry point (index.ts, main.ts) for exports. Check package.json "main"/"exports" fields. Provide ACTUAL module/class/service names, NOT generic placeholders.`,

      // Question 2: Standard+ - Design patterns
      `Detect design patterns with SPECIFIC examples: Find Factory classes (*Factory.ts), Strategy interfaces (*Strategy.ts), Observer/EventEmitter patterns. Identify service layer (business logic), controller layer (HTTP/API), repository layer (data access). List actual pattern implementations found.`,

      // Question 3: Standard+ - Dependencies
      `Analyze import statements between components. Check internal imports (e.g., "import { X } from './services'"). Map component dependencies. Identify shared utilities, helpers. Document which components depend on which. Extract actual method signatures and interfaces.`,

      // Question 4: Detailed only - Responsibilities
      `Read component implementations to determine responsibilities. Analyze class/function comments, JSDoc. Check test files (*spec.ts, *test.ts) for component behavior. Document what each component ACTUALLY does based on its implementation, not assumptions.`,
    ];

    const questions = allQuestions.slice(0, depthConfig.questionsPerLevel.components);

    // Query agents with targeted questions
    const componentAgents = await this.queryAgentsWithQuestions(
      state,
      ['architecture-analyzer', 'pattern-detector'],
      questions,
      'C4 Components',
    );

    // Update state with agent results
    const updatedAgentResults = new Map(state.agentResults);
    componentAgents.forEach((result, name) => updatedAgentResults.set(name, result));

    const model = this.llmService.getChatModel({ temperature: 0.2, maxTokens: 16384 });

    // Compile insights from all agent responses across questions
    const allInsights: string[] = [];
    for (const [key, result] of componentAgents.entries()) {
      const insight = this.extractAnalysisInsights(result.markdown || '', 3000);
      if (insight) {
        allInsights.push(`[${key}] ${insight}`);
      }
    }

    const compiledInsights = allInsights.join('\n\n---\n\n');

    // Get sample files to identify actual components
    const sampleFiles = this.getSampleFileContents(state, 15);

    const { c4Containers } = state;

    const prompt = `
You are generating a C4 Model **Components Diagram (Level 3)** for a software system.

**Purpose**: Zoom into a container and show its internal building blocks (components):

**IMPORTANT**: Analyze the ACTUAL codebase structure. Identify real components from:
- Class names and module exports
- Service layer, controller layer, repository pattern
- Design patterns in code (Factory, Strategy, Observer, etc.)
- File/folder organization (src/services/, src/controllers/, src/models/)

**Analysis from Agents (${questions.length} questions analyzed):**
${compiledInsights.substring(0, 10000)}

**Sample Files (Component Structure):**
${sampleFiles}
- Modules, packages, namespaces
- Services, controllers, repositories
- Classes, interfaces, utilities
- Internal relationships and dependencies

For each component, specify:
- Name (clear, descriptive)
- Description (responsibility, what it does)
- Type/role (e.g., Controller, Service, Repository, Utility)

Also define relationships between components (uses, depends on, calls, etc.)

**C4 Containers (from Level 2):**
${c4Containers ? JSON.stringify(c4Containers, null, 2).substring(0, 1000) : 'Not available'}

**Instructions:**
1. Extract ACTUAL component names from class names, modules, and file structure
2. Identify REAL design patterns and architectural layers from code
3. **CRITICAL**: DEDUPLICATE all findings. If the same component or relationship appears multiple times in the analysis above (perhaps with slight variations), consolidate them into a SINGLE entry. Do not list duplicates.

**JSON Output Format (Focus on ONE primary container):**
{
  "containerName": "Primary Container Name (from actual codebase)",
  "components": [
    {
      "name": "Actual Component Name (class/service/module)",
      "description": "What this component actually does"
    }
  ],
  "relationships": [
    {
      "source": "Component Name",
      "destination": "Component Name",
      "description": "How they interact (calls, uses, depends on)"
    }
  ]
}

**CRITICAL**: Return ONLY the JSON object above. No explanations, no markdown, no additional text.
If you cannot identify components, return:
{
  "containerName": "Main Application",
  "components": [],
  "relationships": []
}
`;
    const result = await model.invoke(prompt, {
      runName: state.options.runName
        ? state.options.runName
            .replace('{timestamp}', new Date().toISOString())
            .replace('{agent}', 'C4-Components-Generator')
            .replace('{project}', state.projectPath.split(/[\\/]/).pop() || 'unknown')
        : 'C4-Components-Generator',
    });
    let c4Components = null;

    // Track orchestrator token usage
    const responseUsage =
      (result as any).usage_metadata || (result as any).response_metadata?.usage || {};
    const orchestratorTokens = {
      inputTokens: responseUsage.input_tokens || responseUsage.prompt_tokens || 0,
      outputTokens: responseUsage.output_tokens || responseUsage.completion_tokens || 0,
    };

    this.logger.debug('=== C4 COMPONENTS RAW OUTPUT ===');
    this.logger.debug(result.content.toString());
    this.logger.debug('=== END RAW OUTPUT ===');

    try {
      let cleanedOutput = this.stripMarkdownCodeBlocks(result.content.toString());

      // Additional cleanup: Extract only the JSON object
      const jsonMatch = cleanedOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedOutput = jsonMatch[0];
      }

      this.logger.debug('=== C4 COMPONENTS CLEANED OUTPUT (first 500 chars) ===');
      this.logger.debug(cleanedOutput.substring(0, 500));
      this.logger.debug('=== END CLEANED OUTPUT ===');

      c4Components = JSON.parse(cleanedOutput);
      this.logger.info('✅ C4 Components parsed successfully');

      // Validate structure
      if (!c4Components.components || !Array.isArray(c4Components.components)) {
        this.logger.warn('Components array is missing or invalid, using empty array');
        c4Components.components = [];
      }
    } catch (error) {
      this.logger.error('Failed to parse C4 Components JSON:', error);
      this.logger.error('Raw output length:', result.content.toString().length);
      this.logger.debug('=== C4 COMPONENTS RAW OUTPUT (first 1000 chars) ===');
      this.logger.debug(result.content.toString().substring(0, 1000));
      this.logger.debug('=== END RAW OUTPUT ===');
      // Return empty structure instead of null
      c4Components = {
        containerName: 'Unknown',
        components: [],
        relationships: [],
      };
    }
    return { c4Components, agentResults: updatedAgentResults, orchestratorTokens };
  }

  private async aggregateC4Model(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('🔗 Aggregating C4 model (all levels)...');
    const { c4Context, c4Containers, c4Components } = state;

    // Debug logging
    this.logger.debug('State keys:', Object.keys(state));
    this.logger.debug('c4Context type:', typeof c4Context);
    this.logger.debug('c4Containers type:', typeof c4Containers);
    this.logger.debug('c4Components type:', typeof c4Components);

    // Log summary of what was generated
    this.logger.info(
      `✅ C4 Context: ${c4Context ? '✓' : '✗'} (System boundary, actors, external systems)`,
    );
    this.logger.info(
      `✅ C4 Containers: ${c4Containers ? '✓' : '✗'} (Deployable units, technology)`,
    );
    this.logger.info(
      `✅ C4 Components: ${c4Components ? '✓' : '✗'} (Internal modules, responsibilities)`,
    );

    const c4Model = {
      context: c4Context,
      containers: c4Containers,
      components: c4Components,
    };

    this.logger.debug(
      'c4Model structure:',
      JSON.stringify({
        hasContext: !!c4Model.context,
        hasContainers: !!c4Model.containers,
        hasComponents: !!c4Model.components,
      }),
    );

    return { c4Model };
  }

  private async generatePlantUML(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('Generating PlantUML from C4 model...');
    const { c4Model, agentResults, orchestratorTokens } = state;

    if (!c4Model) {
      this.logger.warn('C4 model is not available, skipping PlantUML generation.');
      return { plantUMLModel: null };
    }

    this.logger.debug(
      'C4 Model structure:',
      JSON.stringify({
        hasContext: !!c4Model.context,
        hasContainers: !!c4Model.containers,
        hasComponents: !!c4Model.components,
      }),
    );

    try {
      this.logger.info('Generating Context PlantUML...');
      const contextPuml = this.generateContextPlantUML(c4Model.context);
      this.logger.info(`✅ Context PlantUML generated (${contextPuml.length} chars)`);

      this.logger.info('Generating Containers PlantUML...');
      const containersPuml = this.generateContainersPlantUML(c4Model.containers);
      this.logger.info(`✅ Containers PlantUML generated (${containersPuml.length} chars)`);

      this.logger.info('Generating Components PlantUML...');
      const componentsPuml = this.generateComponentsPlantUML(c4Model.components);
      this.logger.info(`✅ Components PlantUML generated (${componentsPuml.length} chars)`);

      const plantUMLModel = {
        context: contextPuml,
        containers: containersPuml,
        components: componentsPuml,
      };

      // Log final summary with token usage
      this.logger.info('\n' + '='.repeat(80));
      this.logger.info('📊 C4 MODEL GENERATION SUMMARY');
      this.logger.info('='.repeat(80));

      // Calculate total token usage
      const agentInputTokens = Array.from(agentResults.values()).reduce(
        (sum, r) => sum + r.tokenUsage.inputTokens,
        0,
      );
      const agentOutputTokens = Array.from(agentResults.values()).reduce(
        (sum, r) => sum + r.tokenUsage.outputTokens,
        0,
      );

      // Include orchestrator tokens (for LLM calls in this orchestrator)
      const totalInputTokens = agentInputTokens + orchestratorTokens.inputTokens;
      const totalOutputTokens = agentOutputTokens + orchestratorTokens.outputTokens;
      const totalTokens = totalInputTokens + totalOutputTokens;

      // Calculate total cost using actual provider/model pricing
      const modelConfig = this.llmService.getModelConfig(
        this.llmService['defaultProvider'],
        this.llmService['getDefaultModel'](this.llmService['defaultProvider']),
      );
      const totalCost = this.llmService['tokenManager'].calculateCost(
        totalInputTokens,
        totalOutputTokens,
        modelConfig.costPerMillionInputTokens,
        modelConfig.costPerMillionOutputTokens,
      );

      this.logger.info(`✅ Agents completed: ${agentResults.size}`);
      this.logger.info(
        `💰 Total tokens: ${totalTokens.toLocaleString()} (${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out)`,
      );
      if (orchestratorTokens.inputTokens > 0 || orchestratorTokens.outputTokens > 0) {
        this.logger.info(
          `   ├─ Agent tokens: ${(agentInputTokens + agentOutputTokens).toLocaleString()} (${agentInputTokens.toLocaleString()} in / ${agentOutputTokens.toLocaleString()} out)`,
        );
        this.logger.info(
          `   └─ Orchestrator tokens: ${(orchestratorTokens.inputTokens + orchestratorTokens.outputTokens).toLocaleString()} (${orchestratorTokens.inputTokens.toLocaleString()} in / ${orchestratorTokens.outputTokens.toLocaleString()} out)`,
        );
      }
      this.logger.info(`💵 Total cost: $${totalCost.toFixed(4)}`);
      this.logger.info('='.repeat(80) + '\n');

      return { plantUMLModel };
    } catch (error) {
      this.logger.error('Error generating PlantUML:', error);
      throw error;
    }
  }

  /**
   * Sanitize a name for use as a PlantUML identifier
   * Removes spaces, parentheses, and other special characters
   */
  private sanitizePlantUMLId(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Extract meaningful insights from agent markdown output
   * Focuses on key sections and removes boilerplate
   */
  private extractAnalysisInsights(markdown: string, maxChars: number): string {
    if (!markdown) return 'No analysis available';

    // Remove markdown headers, but keep content
    let insights = markdown
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/^\s*[-*+]\s+/gm, '• ') // Normalize lists
      .trim();

    // Truncate to max length
    if (insights.length > maxChars) {
      insights = insights.substring(0, maxChars) + '...';
    }

    return insights;
  }

  /**
   * Get sample file contents for context
   * Prioritizes key files like package.json, README, config files
   */
  private getSampleFileContents(state: C4State, maxFiles: number): string {
    const { scanResult } = state;
    if (!scanResult?.files) return 'No files available';

    // Prioritize important files
    const priorityPatterns = [
      /package\.json$/,
      /README\.md$/i,
      /tsconfig\.json$/,
      /\.config\.(js|ts)$/,
      /index\.(ts|js)$/,
      /main\.(ts|js)$/,
      /app\.(ts|js)$/,
    ];

    const files = scanResult.files
      .filter((f: any) => f.path && f.content)
      .sort((a: any, b: any) => {
        const aScore = priorityPatterns.findIndex((p) => p.test(a.path));
        const bScore = priorityPatterns.findIndex((p) => p.test(b.path));
        if (aScore !== -1 && bScore === -1) return -1;
        if (aScore === -1 && bScore !== -1) return 1;
        return aScore - bScore;
      })
      .slice(0, maxFiles);

    return files
      .map((f: any) => {
        const content = f.content.length > 500 ? f.content.substring(0, 500) + '...' : f.content;
        return `\n--- ${f.path} ---\n${content}`;
      })
      .join('\n');
  }

  private generateContextPlantUML(context: any): string {
    if (!context) return '';
    let puml = '@startuml\n';
    puml += `!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml\n\n`;
    context.actors?.forEach((actor: any) => {
      if (actor?.name) {
        puml += `Person(${this.sanitizePlantUMLId(actor.name)}, "${actor.name}", "${actor.description || ''}")\n`;
      }
    });
    if (context.system?.name) {
      puml += `System(${this.sanitizePlantUMLId(context.system.name)}, "${context.system.name}", "${context.system.description || ''}")\n`;
    }
    context.externalSystems?.forEach((extSystem: any) => {
      if (extSystem?.name) {
        puml += `System_Ext(${this.sanitizePlantUMLId(extSystem.name)}, "${extSystem.name}", "${extSystem.description || ''}")\n`;
      }
    });
    context.relationships?.forEach((rel: any) => {
      if (rel?.source && rel?.destination) {
        puml += `Rel(${this.sanitizePlantUMLId(rel.source)}, ${this.sanitizePlantUMLId(rel.destination)}, "${rel.description || ''}")\n`;
      }
    });
    puml += '@enduml\n';
    return puml;
  }

  private generateContainersPlantUML(containers: any): string {
    if (!containers) return '';
    let puml = '@startuml\n';
    puml += `!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml\n\n`;
    containers.containers?.forEach((container: any) => {
      if (container?.name) {
        puml += `Container(${this.sanitizePlantUMLId(container.name)}, "${container.name}", "${container.technology || ''}", "${container.description || ''}")\n`;
      }
    });
    containers.relationships?.forEach((rel: any) => {
      if (rel?.source && rel?.destination) {
        puml += `Rel(${this.sanitizePlantUMLId(rel.source)}, ${this.sanitizePlantUMLId(rel.destination)}, "${rel.description || ''}", "${rel.technology || ''}")\n`;
      }
    });
    puml += '@enduml\n';
    return puml;
  }

  private generateComponentsPlantUML(components: any): string {
    if (!components) return '';
    let puml = '@startuml\n';
    puml += `!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml\n\n`;
    if (components.containerName) {
      puml += `Container_Boundary(${this.sanitizePlantUMLId(components.containerName)}, "${components.containerName}") {\n`;
      components.components?.forEach((component: any) => {
        if (component?.name) {
          puml += `  Component(${this.sanitizePlantUMLId(component.name)}, "${component.name}", "${component.description || ''}")\n`;
        }
      });
      puml += '}\n';
    }
    components.relationships?.forEach((rel: any) => {
      if (rel?.source && rel?.destination) {
        puml += `Rel(${this.sanitizePlantUMLId(rel.source)}, ${this.sanitizePlantUMLId(rel.destination)}, "${rel.description || ''}")\n`;
      }
    });
    puml += '@enduml\n';
    return puml;
  }
}
