import type { AgentRegistry } from '@agents/agent-registry';
import type { Agent } from '@agents/agent.interface';
import type { FileSystemScanner } from '@scanners/file-system-scanner';
import type {
  AgentContext,
  AgentResult,
  AgentExecutionOptions,
  AgentMetadata,
  TokenUsage,
} from '../types/agent.types';
import type { ScanResult } from '../types/scanner.types';
import type {
  DocumentationOutput,
  ComponentDescription,
  CustomSection,
  ProjectStatistics,
} from '../types/output.types';
import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { LLMService } from '../llm/llm-service';
import { Logger } from '../utils/logger';
import { version } from '../../package.json';
import { ImportScanner } from '../scanners/import-scanner';
import type { DependencyGraph, ImportInfo, ModuleInfo } from '../scanners/import-scanner';
import { isTestFile, isConfigFile } from '../config/language-config';

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

  // Shared vector store (initialized once, reused by all agents)
  vectorStore: Annotation<
    | {
        searchFiles: (
          query: string,
          topK?: number,
        ) => Promise<Array<{ path: string; score: number }>>;
        cleanup: () => void;
      }
    | undefined
  >({
    reducer: (_, update) => update,
    default: () => undefined,
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

  // Orchestrator-level token usage (for synthesis, recommendations, etc.)
  orchestratorTokens: Annotation<{ inputTokens: number; outputTokens: number }>({
    reducer: (current, update) => ({
      inputTokens: current.inputTokens + update.inputTokens,
      outputTokens: current.outputTokens + update.outputTokens,
    }),
    default: () => ({ inputTokens: 0, outputTokens: 0 }),
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
  maxCostDollars?: number; // Maximum cost in dollars before halting execution (default: $5)
  parallel?: boolean;
  userPrompt?: string; // User's focus area or question to enhance agent analysis
  incrementalMode?: boolean; // Skip full regeneration if existing docs + prompt provided
  existingDocsPath?: string; // Path to existing documentation for incremental updates
  selectiveAgents?: string[]; // Run only specific agents (for refinement check with selective updates)
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
}

/**
 * Documentation Orchestrator
 * Manages multi-agent documentation generation with LangGraph state-based workflows
 */
export class DocumentationOrchestrator {
  private logger = new Logger('DocumentationOrchestrator');
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
   * Generate documentation using LangGraph state machine
   */
  async generateDocumentation(
    projectPath: string,
    options: OrchestratorOptions = {},
  ): Promise<DocumentationOutput> {
    const startTime = Date.now();

    this.logger.info(`Starting documentation generation with LangGraph (v${version})`);

    // Check for incremental mode - enhance existing docs instead of full regeneration
    if (options.incrementalMode && options.existingDocsPath) {
      if (options.userPrompt) {
        // Mode 1: Incremental enhancement with specific focus
        this.logger.info('🚀 Running in incremental enhancement mode');
        this.logger.info(`📝 User prompt: "${options.userPrompt}"`);
        return await this.generateIncrementalDocumentation(
          projectPath,
          options.existingDocsPath,
          options.userPrompt,
          options,
        );
      } else {
        // Mode 2: Refinement check mode - evaluate existing docs for improvements
        this.logger.info('🔍 Running in refinement check mode');
        this.logger.info('Evaluating existing documentation for potential improvements...');
        return await this.generateRefinementCheck(projectPath, options.existingDocsPath, options);
      }
    }

    // Apply custom language configuration if provided
    if (options.languageConfig) {
      this.logger.debug('Applying custom language configuration...');
      const { applyLanguageConfig } = await import('../config/language-config');
      applyLanguageConfig(options.languageConfig);
    }

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
      scanResult.files.map((f) => f.relativePath),
    );

    this.logger.info(
      `Found ${imports.length} imports, ${modules.length} modules, ${graph.edges.length} dependencies`,
    );

    // Get all agents and sort by dependencies (topological sort)
    let agents = this.agentRegistry.getAllAgents();

    // Filter agents if selective list provided (from refinement check)
    if (options.selectiveAgents && options.selectiveAgents.length > 0) {
      const selectiveSet = new Set(options.selectiveAgents);
      agents = agents.filter((agent) => selectiveSet.has(agent.getMetadata().name));
      this.logger.info(
        `Selective mode: Running ${agents.length}/${this.agentRegistry.getAllAgents().length} agents`,
      );
    }

    const sortedAgents = this.sortAgentsByDependencies(agents);
    const agentNames = sortedAgents.map((a) => a.getMetadata().name);

    this.logger.info(`Found ${agentNames.length} agents: ${agentNames.join(', ')}`);

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
      vectorStore: sharedVectorStore, // Pass shared vector store to agents
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
   * Generate refinement check - evaluate existing docs for improvements without specific prompt
   * Reads existing docs, checks each section for missing information, and regenerates only what needs improvement
   */
  private async generateRefinementCheck(
    projectPath: string,
    existingDocsPath: string,
    options: OrchestratorOptions,
  ): Promise<DocumentationOutput> {
    const startTime = Date.now();
    const fs = await import('fs/promises');
    const path = await import('path');

    this.logger.info('📖 Reading existing documentation...');

    // Load existing documentation files
    const existingDocs: Record<string, string> = {};
    try {
      const files = await fs.readdir(existingDocsPath);
      for (const file of files) {
        if (file.endsWith('.md') && file !== 'index.md' && file !== 'metadata.md') {
          const filePath = path.join(existingDocsPath, file);
          existingDocs[file] = await fs.readFile(filePath, 'utf-8');
        }
      }
      this.logger.info(`📄 Loaded ${Object.keys(existingDocs).length} documentation files`);
    } catch (error) {
      this.logger.warn(`Failed to load existing docs: ${error}`);
      // Fall back to full generation
      this.logger.info('Falling back to full generation mode');
      return this.generateDocumentation(projectPath, {
        ...options,
        incrementalMode: false,
        existingDocsPath: undefined,
      });
    }

    // Quick scan to get project context
    this.logger.info('🔍 Scanning project for current state...');
    const scanResult = await this.scanner.scan({
      rootPath: projectPath,
      maxFiles: 10000,
      maxFileSize: 1048576,
      respectGitignore: true,
      includeHidden: false,
      followSymlinks: false,
    });

    // Evaluate each documentation file individually for granular quality assessment
    this.logger.info('🔍 Evaluating documentation quality per agent...');
    const model = this.llmService.getChatModel({
      temperature: 0.2,
      maxTokens: 8000,
    });

    // Build dynamic file-to-agent mapping from agent registry
    // Each agent specifies its output filename via metadata.outputFilename
    // If not specified, defaults to '{agent-name}.md'
    const fileToAgent: Record<string, string> = {};
    const allAgents = this.agentRegistry.getAllAgents();

    for (const agent of allAgents) {
      const meta = agent.getMetadata();
      // Use agent-specified filename or default to '{name}.md'
      const expectedFileName = meta.outputFilename || `${meta.name}.md`;
      fileToAgent[expectedFileName] = meta.name;
    }

    this.logger.debug(
      `File-to-agent mapping: ${Object.entries(fileToAgent)
        .map(([f, a]) => `${f}→${a}`)
        .join(', ')}`,
    );

    interface AgentEvaluation {
      agentName: string;
      fileName: string;
      needsUpdate: boolean;
      qualityScore: number;
      improvements: string[];
      priority: 'high' | 'medium' | 'low';
    }

    const evaluations: AgentEvaluation[] = [];

    // Evaluate each agent's documentation
    for (const [fileName, content] of Object.entries(existingDocs)) {
      const agentName = fileToAgent[fileName];
      if (!agentName) {
        this.logger.debug(`Skipping ${fileName} (no agent produces this file)`);
        continue;
      }

      const evaluationPrompt = `You are evaluating architecture documentation quality for a specific area.

**File**: ${fileName}
**Content** (${content.length} chars):
\`\`\`markdown
${content.substring(0, 3000)}${content.length > 3000 ? '\n... (truncated)' : ''}
\`\`\`

**Project Context**:
- Total files: ${scanResult.totalFiles}
- Languages: ${scanResult.languages.map((l) => l.language).join(', ')}

**Evaluation Criteria**:
1. Completeness (0-25): Are all key topics covered?
2. Accuracy (0-25): Is information up-to-date and correct?
3. Clarity (0-25): Is content well-structured and understandable?
4. Depth (0-25): Are examples and details provided?

**Response Format** (must follow exactly):
QUALITY_SCORE: [0-100]
NEEDS_UPDATE: yes|no
PRIORITY: high|medium|low
IMPROVEMENTS: [List specific improvements needed, one per line, or "none" if no updates needed]`;

      this.logger.debug(`Evaluating ${fileName}...`);
      const evalStart = Date.now();
      const evaluation = await model.invoke(evaluationPrompt, {
        runName: `RefinementCheck-${agentName}`,
      });
      const evalDuration = ((Date.now() - evalStart) / 1000).toFixed(1);

      const evaluationText =
        typeof evaluation === 'string' ? evaluation : evaluation.content?.toString() || '';

      // Parse evaluation response
      const scoreMatch = evaluationText.match(/QUALITY_SCORE:\s*(\d+)/);
      const needsMatch = evaluationText.match(/NEEDS_UPDATE:\s*(yes|no)/i);
      const priorityMatch = evaluationText.match(/PRIORITY:\s*(high|medium|low)/i);
      const improvementsMatch = evaluationText.match(/IMPROVEMENTS:\s*(.+?)(?:\n\n|$)/s);

      const qualityScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;
      const needsUpdate = needsMatch ? needsMatch[1].toLowerCase() === 'yes' : qualityScore < 70;
      const priority =
        (priorityMatch?.[1].toLowerCase() as AgentEvaluation['priority']) || 'medium';
      const improvementsText = improvementsMatch
        ? improvementsMatch[1].trim()
        : 'General improvements';
      const improvements = improvementsText
        .split('\n')
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter((line) => line && line.toLowerCase() !== 'none');

      evaluations.push({
        agentName,
        fileName,
        needsUpdate,
        qualityScore,
        improvements,
        priority,
      });

      const status = needsUpdate ? '⚠️ Needs update' : '✅ Good';
      this.logger.info(`${status} ${fileName}: ${qualityScore}/100 (${evalDuration}s)`);
      if (needsUpdate && improvements.length > 0) {
        this.logger.debug(`  Improvements: ${improvements.slice(0, 2).join('; ')}`);
      }
    }

    // Write evaluation results to markdown files for agent reference
    await this.writeRefinementGaps(existingDocsPath, evaluations);

    // Determine which agents need to run
    const agentsToRun = evaluations.filter((e) => e.needsUpdate).map((e) => e.agentName);

    if (agentsToRun.length === 0) {
      this.logger.info('✨ All documentation is high quality - no regeneration needed');
      this.logger.info('💡 Tip: Use --prompt "your focus area" to add specific enhancements');

      // Documentation is good - no changes needed
      const executionTime = Date.now() - startTime;
      this.logger.info(`Refinement check completed in ${(executionTime / 1000).toFixed(2)}s`);

      // Return empty output to signal no changes
      throw new Error('NO_IMPROVEMENTS_NEEDED');
    }

    // Log summary
    const avgScore = Math.round(
      evaluations.reduce((sum, e) => sum + e.qualityScore, 0) / evaluations.length,
    );
    const highPriority = evaluations.filter((e) => e.needsUpdate && e.priority === 'high').length;
    const mediumPriority = evaluations.filter(
      (e) => e.needsUpdate && e.priority === 'medium',
    ).length;

    this.logger.warn(
      `📊 Quality Summary: ${avgScore}/100 average across ${evaluations.length} files`,
    );
    this.logger.warn(
      `⚠️ Updates needed: ${agentsToRun.length}/${evaluations.length} agents (${highPriority} high priority, ${mediumPriority} medium)`,
    );
    this.logger.info(`🎯 Selective regeneration: ${agentsToRun.join(', ')}`);
    this.logger.info('🔄 Running only agents that need updates...');

    // Run selective regeneration with only the agents that need updates
    const output = await this.generateDocumentation(projectPath, {
      ...options,
      incrementalMode: false,
      existingDocsPath: undefined,
      selectiveAgents: agentsToRun, // NEW: Pass list of agents to run
    });

    // Mark as refinement mode for changelog formatting
    output.metadata.configuration = {
      ...output.metadata.configuration,
      mode: 'refinement',
    };

    return output;
  }

  /**
   * Generate incremental documentation enhancement based on user prompt
   * Loads existing docs, runs lightweight analysis focused on user's question
   */
  private async generateIncrementalDocumentation(
    projectPath: string,
    existingDocsPath: string,
    userPrompt: string,
    options: OrchestratorOptions,
  ): Promise<DocumentationOutput> {
    const startTime = Date.now();
    const fs = await import('fs/promises');
    const path = await import('path');

    this.logger.info('🔄 Incremental documentation mode - running agents with PR context');

    // Load existing documentation files
    const existingDocsRecord: Record<string, string> = {};
    try {
      const files = await fs.readdir(existingDocsPath);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(existingDocsPath, file);
          existingDocsRecord[file] = await fs.readFile(filePath, 'utf-8');
        }
      }
      this.logger.info(
        `📂 Loaded ${Object.keys(existingDocsRecord).length} existing documentation files`,
      );
    } catch (error) {
      this.logger.warn(`Failed to load existing docs: ${error}`);
      // Fall back to full generation
      return this.generateDocumentation(projectPath, {
        ...options,
        incrementalMode: false,
        existingDocsPath: undefined,
      });
    }

    // Convert to Map for AgentContext
    const existingDocsMap = new Map<string, string>(Object.entries(existingDocsRecord));

    // Full project scan (agents need complete context)
    this.logger.info('📊 Scanning project for updated context...');
    const scanResult = await this.scanner.scan({
      rootPath: projectPath,
      maxFiles: 10000,
      maxFileSize: 1048576,
      respectGitignore: true,
      includeHidden: false,
      followSymlinks: false,
    });

    // Scan imports and build dependency graph
    this.logger.info('🔗 Analyzing dependencies and imports...');
    const importScanner = new ImportScanner();
    const { imports, modules, graph } = await importScanner.scanProject(
      projectPath,
      scanResult.files.map((f) => f.relativePath),
    );

    this.logger.info(
      `Found ${imports.length} imports, ${modules.length} modules, ${graph.edges.length} dependencies`,
    );

    // Get all agents and filter by relevance to PR context
    const agents = this.agentRegistry.getAllAgents();
    const sortedAgents = this.sortAgentsByDependencies(agents);

    this.logger.info(`🤖 Evaluating ${sortedAgents.length} agents for relevance to PR context...`);

    // Run workflow with incremental mode enabled
    const initialState = {
      scanResult,
      projectPath,
      options: {
        ...options,
        userPrompt, // Pass PR context to agents
      },
      currentAgentIndex: 0,
      agentNames: sortedAgents.map((a) => a.getMetadata().name),
      agentResults: new Map(),
      refinementAttempts: new Map(),
      clarityScores: new Map(),
      dependencyGraph: { imports, modules, graph },
      output: null,
      executionTime: 0,
    };

    const config = {
      configurable: {
        thread_id: `doc-gen-incremental-${Date.now()}`,
        existingDocs: existingDocsMap, // Pass existing docs to agents
        isIncrementalMode: true, // Flag for agents
      },
      recursionLimit: 200,
    };

    // Execute workflow with agents
    let finalState = initialState;
    for await (const state of await this.workflow.stream(initialState, config)) {
      const nodeNames = Object.keys(state);
      if (nodeNames.length > 0) {
        const lastNodeName = nodeNames[nodeNames.length - 1];
        finalState = state[lastNodeName];
      }
    }

    const executionTime = Date.now() - startTime;
    const output = finalState.output as unknown as DocumentationOutput;

    if (!output) {
      throw new Error('Workflow did not produce output');
    }

    this.logger.info(
      `✅ Incremental documentation completed in ${(executionTime / 1000).toFixed(2)}s`,
    );
    this.logger.info(`📊 ${output.metadata?.agentsExecuted?.length ?? 0} agents executed`);
    this.logger.info(`💰 Tokens: ${output.metadata?.totalTokensUsed ?? 0}`);

    // Update metadata
    output.metadata.generationDuration = executionTime;
    output.metadata.configuration = {
      ...output.metadata.configuration,
      mode: 'incremental',
      userPrompt,
    };
    output.metadata.warnings = [
      ...(output.metadata.warnings || []),
      'Incremental mode: Merged with existing documentation',
      `Existing files preserved: ${existingDocsMap.size}`,
    ];

    return output;
  }

  /**
   * Build the LangGraph workflow
   * SIMPLIFIED: Agents handle their own refinement internally,
   * orchestrator just executes them sequentially
   */
  private buildWorkflow() {
    const graph = new StateGraph(DocumentationState, {});

    // Define nodes
    graph.addNode('executeAgent', this.executeAgentNode.bind(this));
    graph.addNode('aggregateResults', this.aggregateResultsNode.bind(this));
    graph.addNode('synthesizeRecommendations', this.synthesizeRecommendationsNode.bind(this));

    // Define edges with proper type casting
    const entryPoint = 'executeAgent' as '__start__';
    graph.setEntryPoint(entryPoint);

    // Conditional routing after agent execution
    // Each agent refines itself internally, orchestrator just moves to next agent
    graph.addConditionalEdges(entryPoint, this.shouldContinue.bind(this), {
      nextAgent: 'executeAgent' as '__start__',
      done: 'aggregateResults' as '__start__',
    });

    // After aggregation, synthesize recommendations
    graph.addEdge('aggregateResults' as '__start__', 'synthesizeRecommendations' as '__start__');

    // End after synthesis
    graph.addEdge('synthesizeRecommendations' as '__start__', END);

    return graph.compile({ checkpointer: this.checkpointer }).withConfig({
      runName: `DocumentationOrchestrator-${Date.now()}`,
    });
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
    const agent = this.agentRegistry.getAgent(agentName); // Look up by name, not by index!
    const totalAgents = agentNames.length;

    if (!agent) {
      throw new Error(`Agent ${agentName} not found in registry`);
    }

    // Notify progress callback
    if (options.onAgentProgress) {
      options.onAgentProgress(currentAgentIndex + 1, totalAgents, agentName);
    }

    this.logger.info(`Executing agent: ${agentName} (${currentAgentIndex + 1}/${totalAgents})`);
    this.logger.info('='.repeat(80));
    this.logger.info(`📋 Agent ${currentAgentIndex + 1}/${totalAgents}: ${agentName}`);
    this.logger.info('='.repeat(80));

    // Get existing docs from config (if incremental mode)
    const existingDocs = state.options.incrementalMode
      ? (state.options as unknown as { existingDocs?: Map<string, string> }).existingDocs
      : undefined;

    // Create agent context
    // Parse refinement gaps from existing docs if present
    const refinementGaps = this.parseRefinementGaps(existingDocs, agentName);

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
        // Pass search mode from agent options
        searchMode: options.agentOptions?.searchMode,
      },
      query: options.userPrompt, // Pass user's focus area to enhance agent analysis
      // Claude Sonnet 4 max: 200K input tokens - 10K safety margin - 8K max output = 182K budget
      tokenBudget: options.maxTokens || 182000,
      scanResult,
      dependencyGraph: dependencyGraph || undefined,
      existingDocs, // Pass existing documentation for incremental mode
      isIncrementalMode: options.incrementalMode || false,
      refinementGaps, // Pass parsed gaps for targeted improvements
      vectorStore: state.vectorStore, // Pass shared vector store (initialized once)
    };

    // Check if agent can execute (has relevant data)
    const canExecute = await agent.canExecute(context);
    if (!canExecute) {
      this.logger.info(`Skipping agent: No relevant data found for ${agentName}`, '⏭️');
      agentResults.set(agentName, {
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

      return {
        ...state,
        currentAgentIndex: currentAgentIndex + 1,
        agentResults,
      };
    }

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
        ...options.agentOptions?.runnableConfig,
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

      // Check if total cost exceeds budget
      const maxCost = options.maxCostDollars || 5.0; // Default $5 budget
      let totalCost = 0;
      for (const agentResult of newAgentResults.values()) {
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
          '💰',
        );
        // Force move to aggregate results by setting index beyond agent count
        return {
          ...state,
          agentResults: newAgentResults,
          currentAgentIndex: agentNames.length, // Skip remaining agents
        };
      }

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

    // Extract accurate statistics from agent results and scan data
    const statistics = this.calculateProjectStatistics(scanResult, agentResults);

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
        statistics,
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
        agentGaps: this.collectAgentGaps(agentResults),
      },
    };

    // Log final summary with per-agent breakdown
    const totalExecutionTime = Array.from(agentResults.values()).reduce(
      (sum, r) => sum + r.executionTime,
      0,
    );
    const agentInputTokens = Array.from(agentResults.values()).reduce(
      (sum, r) => sum + r.tokenUsage.inputTokens,
      0,
    );
    const agentOutputTokens = Array.from(agentResults.values()).reduce(
      (sum, r) => sum + r.tokenUsage.outputTokens,
      0,
    );

    // Include orchestrator tokens (synthesis, recommendations, etc.)
    const totalInputTokens = agentInputTokens + state.orchestratorTokens.inputTokens;
    const totalOutputTokens = agentOutputTokens + state.orchestratorTokens.outputTokens;
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

    const avgTokensPerAgent =
      agentResults.size > 0 ? Math.round(totalTokenUsage.totalTokens / agentResults.size) : 0;

    this.logger.info('\n' + '='.repeat(80));
    this.logger.info('📊 DOCUMENTATION GENERATION SUMMARY');
    this.logger.info('='.repeat(80));
    this.logger.info(`✅ Agents completed: ${agentResults.size}`);
    this.logger.info(`⏱️  Total time: ${(totalExecutionTime / 1000 / 60).toFixed(1)}m`);
    this.logger.info(
      `💰 Total tokens: ${totalTokens.toLocaleString()} (${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out)`,
    );
    if (state.orchestratorTokens.inputTokens > 0 || state.orchestratorTokens.outputTokens > 0) {
      this.logger.info(
        `   ├─ Agent tokens: ${(agentInputTokens + agentOutputTokens).toLocaleString()} (${agentInputTokens.toLocaleString()} in / ${agentOutputTokens.toLocaleString()} out)`,
      );
      this.logger.info(
        `   └─ Orchestrator tokens: ${(state.orchestratorTokens.inputTokens + state.orchestratorTokens.outputTokens).toLocaleString()} (${state.orchestratorTokens.inputTokens.toLocaleString()} in / ${state.orchestratorTokens.outputTokens.toLocaleString()} out)`,
      );
    }
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
      { name: 'kpi-analyzer', emoji: '📊', label: 'KPI Analysis' },
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
   * Synthesize recommendations from all agent results
   * Generates a consolidated recommendations.md file
   */
  private async synthesizeRecommendationsNode(state: typeof DocumentationState.State) {
    const { agentResults, output } = state;

    this.logger.info('📝 Synthesizing recommendations from all agents...');

    // Collect all recommendations, warnings, improvements from agents
    const allRecommendations: string[] = [];
    const allWarnings: string[] = [];
    const allImprovements: string[] = [];

    for (const [agentName, result] of agentResults.entries()) {
      if (result.data) {
        const data = result.data as Record<string, unknown>;

        // Extract recommendations
        if (Array.isArray(data.recommendations)) {
          allRecommendations.push(...data.recommendations.map((r) => `[${agentName}] ${r}`));
        }

        // Extract warnings
        if (Array.isArray(data.warnings)) {
          allWarnings.push(...data.warnings.map((w) => `[${agentName}] ${w}`));
        }

        // Extract improvements
        if (Array.isArray(data.improvements)) {
          allImprovements.push(...data.improvements.map((i) => `[${agentName}] ${i}`));
        }
      }
    }

    // Only synthesize if we have content
    if (
      allRecommendations.length === 0 &&
      allWarnings.length === 0 &&
      allImprovements.length === 0
    ) {
      this.logger.info('⏭️  No recommendations to synthesize - skipping');
      return state;
    }

    // Use LLM to synthesize and prioritize recommendations
    const model = this.llmService.getChatModel({ temperature: 0.3, maxTokens: 4096 });

    const prompt = `You are a senior technical architect reviewing a comprehensive codebase analysis.

**Analysis Results**:
- ${allRecommendations.length} recommendations from ${agentResults.size} agents
- ${allWarnings.length} warnings identified
- ${allImprovements.length} improvement opportunities

**Recommendations by Agent**:
${allRecommendations.slice(0, 50).join('\n')}

**Warnings**:
${allWarnings.slice(0, 30).join('\n')}

**Improvement Opportunities**:
${allImprovements.slice(0, 30).join('\n')}

**Task**: Synthesize these findings into a prioritized, actionable recommendations document.

**Output Format** (Markdown):
# Recommendations

## Priority 1: Critical Actions
- [Action items that should be addressed immediately]

## Priority 2: High Impact Improvements
- [Changes that significantly improve quality/security/performance]

## Priority 3: Medium Priority Enhancements
- [Valuable improvements with moderate impact]

## Priority 4: Low Priority Suggestions
- [Nice-to-have improvements]

## Best Practices to Adopt
- [Recommended patterns and practices]

**Rules**:
1. Deduplicate similar recommendations across agents
2. Group related items together
3. Be specific and actionable
4. Prioritize by impact and urgency
5. Keep each item concise (1-2 sentences)`;

    try {
      const response = await model.invoke(prompt, {
        runName: 'SynthesizeRecommendations',
      });

      const recommendationsMarkdown = response.content as string;

      // Track orchestrator token usage
      const responseUsage =
        (response as any).usage_metadata || (response as any).response_metadata?.usage || {};
      const orchestratorTokens = {
        inputTokens: responseUsage.input_tokens || responseUsage.prompt_tokens || 0,
        outputTokens: responseUsage.output_tokens || responseUsage.completion_tokens || 0,
      };

      // Add to output as a custom section
      if (output?.customSections) {
        output.customSections.set('recommendations', {
          title: 'Recommendations',
          content: recommendationsMarkdown,
          metadata: {
            synthesizedFrom: Array.from(agentResults.keys()),
            totalRecommendations: allRecommendations.length,
            totalWarnings: allWarnings.length,
            totalImprovements: allImprovements.length,
          },
          files: [
            {
              filename: 'recommendations.md',
              content: recommendationsMarkdown,
              title: 'Recommendations',
              category: 'synthesis',
              order: 99, // Show last
            },
          ],
        });
      }

      this.logger.info('✅ Recommendations synthesized successfully');

      return {
        ...state,
        orchestratorTokens,
      };
    } catch (error) {
      this.logger.warn('⚠️  Failed to synthesize recommendations', {
        error: error instanceof Error ? error.message : String(error),
      });

      return state;
    }
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
          markdown: result.markdown, // Deprecated - kept for backwards compatibility
          files: result.files || [], // NEW: Agent-generated files
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
   * Update or create changelog.md with versioning information
   */
  /**
   * Sort agents by dependencies using topological sort (Kahn's algorithm)
   * Ensures dependent agents execute AFTER their dependencies
   */
  private sortAgentsByDependencies(agents: Agent[]): Agent[] {
    const agentMap = new Map<string, Agent>();
    const metadata = new Map<string, AgentMetadata>();
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Build graph
    for (const agent of agents) {
      const meta = agent.getMetadata();
      agentMap.set(meta.name, agent);
      metadata.set(meta.name, meta);
      inDegree.set(meta.name, 0);
      adjList.set(meta.name, []);
    }

    // Calculate in-degrees and adjacency list
    for (const agent of agents) {
      const meta = agent.getMetadata();
      const deps = meta.capabilities.dependencies || [];

      for (const dep of deps) {
        // If dependency exists in our agent list
        if (agentMap.has(dep)) {
          adjList.get(dep)!.push(meta.name);
          inDegree.set(meta.name, (inDegree.get(meta.name) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm: Start with nodes that have no dependencies
    const queue: string[] = [];
    for (const [name, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(name);
      }
    }

    const sorted: Agent[] = [];
    while (queue.length > 0) {
      // Sort queue by priority to maintain priority ordering within same dependency level
      queue.sort((a, b) => {
        const priorityA = metadata.get(a)!.priority;
        const priorityB = metadata.get(b)!.priority;
        return priorityB - priorityA; // Higher priority first
      });

      const current = queue.shift()!;
      sorted.push(agentMap.get(current)!);

      // Reduce in-degree for dependent agents
      const neighbors = adjList.get(current) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check for circular dependencies
    if (sorted.length !== agents.length) {
      this.logger.warn(
        'Circular dependency detected in agent dependencies - falling back to priority order',
        '⚠️',
      );
      // Fallback: sort by priority only
      return [...agents].sort((a, b) => b.getMetadata().priority - a.getMetadata().priority);
    }

    this.logger.info(
      `Agent execution order (respecting dependencies): ${sorted.map((a) => a.getMetadata().name).join(' → ')}`,
    );

    return sorted;
  }

  /**
   * Parse refinement gaps from existing documentation HTML comment
   */
  private parseRefinementGaps(
    existingDocs: Map<string, string> | undefined,
    agentName: string,
  ):
    | {
        qualityScore: number;
        priority: 'high' | 'medium' | 'low';
        needsUpdate: boolean;
        improvements: string[];
        lastEvaluated: string;
      }
    | undefined {
    if (!existingDocs) {
      return undefined;
    }

    // Get agent's expected filename
    const agent = this.agentRegistry.getAllAgents().find((a) => a.getMetadata().name === agentName);
    if (!agent) {
      return undefined;
    }

    const metadata = agent.getMetadata();
    const filename = metadata.outputFilename || `${agentName}.md`;
    const content = existingDocs.get(filename);

    if (!content) {
      return undefined;
    }

    // Parse HTML comment
    const commentMatch = content.match(
      /<!--\s*REFINEMENT_GAPS\s*\nLast Evaluated:\s*(.+?)\nQuality Score:\s*(\d+)\/100\nPriority:\s*(\w+)\nNeeds Update:\s*(true|false)\s*-->/,
    );

    if (!commentMatch) {
      return undefined;
    }

    const [, lastEvaluated, qualityScore, priority, needsUpdate] = commentMatch;

    // Parse improvements from markdown section
    const improvementsMatch = content.match(
      /\*\*Areas for Improvement\*\*:\s*\n\n((?:\d+\.\s+.+\n)+)/,
    );

    const improvements: string[] = [];
    if (improvementsMatch) {
      const improvementsText = improvementsMatch[1];
      const lines = improvementsText.split('\n').filter((line) => line.trim());
      for (const line of lines) {
        const match = line.match(/^\d+\.\s+(.+)$/);
        if (match) {
          improvements.push(match[1]);
        }
      }
    }

    return {
      qualityScore: parseInt(qualityScore, 10),
      priority: priority as 'high' | 'medium' | 'low',
      needsUpdate: needsUpdate === 'true',
      improvements,
      lastEvaluated,
    };
  }

  /**
   * Write refinement gaps to markdown files for agent reference
   */
  private async writeRefinementGaps(
    docsPath: string,
    evaluations: Array<{
      agentName: string;
      fileName: string;
      needsUpdate: boolean;
      qualityScore: number;
      improvements: string[];
      priority: 'high' | 'medium' | 'low';
    }>,
  ): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    for (const evaluation of evaluations) {
      const filePath = path.join(docsPath, evaluation.fileName);

      try {
        let content = await fs.readFile(filePath, 'utf-8');

        // Remove old gap section if exists (handles both old H2 format and new details format)
        content = content.replace(
          /<!-- REFINEMENT_GAPS[\s\S]*?-->\n+(?:## Identified Gaps[\s\S]*?(?=\n#{1,2}\s|\n---\n|$)|<details>[\s\S]*?<\/details>\n+---\n+)/i,
          '',
        );

        // Build gap section
        const timestamp = new Date().toISOString();
        const status = evaluation.needsUpdate ? '⚠️ Needs Improvement' : '✅ High Quality';
        const priorityEmoji =
          evaluation.priority === 'high' ? '🔴' : evaluation.priority === 'medium' ? '🟡' : '🟢';

        let gapSection = `<!-- REFINEMENT_GAPS
Last Evaluated: ${timestamp}
Quality Score: ${evaluation.qualityScore}/100
Priority: ${evaluation.priority}
Needs Update: ${evaluation.needsUpdate}
-->\n\n`;

        gapSection += `<details>\n<summary><strong>📊 Quality Evaluation (Last: ${timestamp.split('T')[0]}) - Score: ${evaluation.qualityScore}/100 ${priorityEmoji}</strong></summary>\n\n`;
        gapSection += `**Status**: ${status} | **Quality Score**: ${evaluation.qualityScore}/100 | **Priority**: ${priorityEmoji} ${evaluation.priority.toUpperCase()}\n\n`;

        if (evaluation.improvements.length > 0 && evaluation.needsUpdate) {
          gapSection += `**Areas for Improvement**:\n\n`;
          evaluation.improvements.forEach((imp: string, idx: number) => {
            gapSection += `${idx + 1}. ${imp}\n`;
          });
          gapSection += `\n`;
        } else {
          gapSection += `**No improvements needed** - This documentation section meets quality standards.\n\n`;
        }

        gapSection += `</details>\n\n---\n\n`;

        // Insert after first heading (# Title)
        const headingMatch = content.match(/^#\s+.+\n+/);
        if (headingMatch) {
          const insertPos = headingMatch.index! + headingMatch[0].length;
          content = content.substring(0, insertPos) + gapSection + content.substring(insertPos);
        } else {
          // No heading found, prepend
          content = gapSection + content;
        }

        await fs.writeFile(filePath, content, 'utf-8');
        this.logger.debug(`Wrote refinement gaps to ${evaluation.fileName}`);
      } catch (error) {
        this.logger.warn(`Failed to write gaps to ${evaluation.fileName}: ${error}`);
      }
    }

    this.logger.info(`✅ Wrote quality evaluation to ${evaluations.length} files`);
  }

  /**
   * Calculate accurate project statistics from scan results and agent data
   */
  private calculateProjectStatistics(
    scanResult: ScanResult,
    agentResults: Map<string, AgentResult>,
  ): ProjectStatistics {
    // Start with scan data
    let totalLines = 0;
    let testFiles = 0;
    let configFiles = 0;

    // Extract from file-structure agent if available
    const fileStructureAgent = agentResults.get('file-structure');
    if (fileStructureAgent?.data) {
      const data = fileStructureAgent.data as Record<string, unknown>;
      if (typeof data.totalLines === 'number') {
        totalLines = data.totalLines;
      }
      if (typeof data.testFiles === 'number') {
        testFiles = data.testFiles;
      }
      if (typeof data.configFiles === 'number') {
        configFiles = data.configFiles;
      }
    }

    // If still zero, calculate from scan result using centralized detection
    if (totalLines === 0 || testFiles === 0) {
      for (const file of scanResult.files) {
        // Use centralized test file detection
        if (isTestFile(file.relativePath)) {
          testFiles++;
        }

        // Use centralized config file detection
        if (isConfigFile(file.relativePath)) {
          configFiles++;
        }
      }
    }

    // Estimate lines if not provided (rough estimate: ~50 lines per file)
    if (totalLines === 0) {
      totalLines = scanResult.totalFiles * 50;
    }

    const codeFiles = scanResult.totalFiles - testFiles - configFiles;

    return {
      totalFiles: scanResult.totalFiles,
      totalLines,
      totalSize: scanResult.totalSize,
      codeFiles: Math.max(0, codeFiles),
      testFiles,
      configFiles,
    };
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

  /**
   * Collect gap analysis from all agents
   */
  private collectAgentGaps(agentResults: Map<string, AgentResult>): Array<{
    agentName: string;
    gapCount: number;
    clarityScore: number;
    missingInformation: string[];
  }> {
    const gaps: Array<{
      agentName: string;
      gapCount: number;
      clarityScore: number;
      missingInformation: string[];
    }> = [];

    for (const [agentName, result] of agentResults.entries()) {
      const missingInfo = (result.metadata?.missingInformation as string[]) || [];

      if (missingInfo.length > 0 || result.confidence < 1.0) {
        gaps.push({
          agentName,
          gapCount: missingInfo.length,
          clarityScore: result.confidence * 100,
          missingInformation: missingInfo.slice(0, 10), // Limit to top 10 gaps
        });
      }
    }

    return gaps;
  }
}
