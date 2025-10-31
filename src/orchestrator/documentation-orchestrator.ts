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
  userPrompt?: string; // User's focus area or question to enhance agent analysis
  incrementalMode?: boolean; // Skip full regeneration if existing docs + prompt provided
  existingDocsPath?: string; // Path to existing documentation for incremental updates
  iterativeRefinement?: IterativeRefinementConfig;
  agentOptions?: AgentExecutionOptions;
  onAgentProgress?: (current: number, total: number, agentName: string) => void;
  runName?: string; // Custom run name for LangSmith tracing (supports {timestamp}, {agent}, {project})
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

    // Check for incremental mode - enhance existing docs instead of full regeneration
    if (options.incrementalMode && options.existingDocsPath && options.userPrompt) {
      this.logger.info('🚀 Running in incremental enhancement mode');
      this.logger.info(`📝 User prompt: "${options.userPrompt}"`);
      return await this.generateIncrementalDocumentation(
        projectPath,
        options.existingDocsPath,
        options.userPrompt,
        options,
      );
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

    this.logger.info('Loading existing documentation...');

    // Load existing documentation files
    const existingDocs: Record<string, string> = {};
    try {
      const files = await fs.readdir(existingDocsPath);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(existingDocsPath, file);
          existingDocs[file] = await fs.readFile(filePath, 'utf-8');
        }
      }
      this.logger.info(`Loaded ${Object.keys(existingDocs).length} existing documentation files`);
    } catch (error) {
      this.logger.warn(`Failed to load existing docs: ${error}`);
      // Fall back to full generation
      return this.generateDocumentation(projectPath, {
        ...options,
        incrementalMode: false,
        existingDocsPath: undefined,
      });
    }

    // Quick project scan for context
    this.logger.info('Scanning project for updated context...');
    const scanResult = await this.scanner.scan({
      rootPath: projectPath,
      maxFiles: 10000,
      maxFileSize: 1048576,
      respectGitignore: true,
      includeHidden: false,
      followSymlinks: false,
    });

    // Build prompt enhancement section
    const model = this.llmService.getChatModel({
      temperature: 0.3,
      maxTokens: 8000,
    });

    const enhancementPrompt = `You are enhancing existing architecture documentation based on a user's specific question or focus area.

**User's Focus Area**: ${userPrompt}

**Existing Documentation Summary**:
${Object.entries(existingDocs)
  .map(
    ([file, content]) =>
      `\n### ${file}\n${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}`,
  )
  .join('\n')}

**Project Context**:
- Total files: ${scanResult.totalFiles}
- Languages: ${scanResult.languages.map((l) => l.language).join(', ')}
- Project path: ${projectPath}

**Your Task**:
1. Analyze the user's focus area: "${userPrompt}"
2. Review the existing documentation to understand what's already covered
3. Generate a NEW SECTION that addresses the user's specific question/focus
4. Provide detailed, actionable insights related to the focus area
5. Reference existing documentation sections when relevant

**Output Requirements**:
- Create a comprehensive markdown section titled based on the user's focus
- Include specific findings, examples, and recommendations
- Link to relevant parts of existing documentation
- Add new information not already covered
- Be detailed and thorough (aim for 500-2000 words)

Generate the enhancement section now:`;

    this.logger.info('Generating enhancement based on user prompt...');
    const enhancement = await model.invoke(enhancementPrompt);
    const enhancementText =
      typeof enhancement === 'string' ? enhancement : enhancement.content?.toString() || '';

    // Save the enhancement as a new custom documentation file
    const executionTime = Date.now() - startTime;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const enhancementFileName = `prompt-${timestamp}.md`;
    const enhancementFilePath = path.join(existingDocsPath, enhancementFileName);

    // Create formatted enhancement document
    const formattedEnhancement = `# ${userPrompt}

**Generated**: ${new Date().toISOString()}
**Mode**: Incremental Enhancement
**Duration**: ${(executionTime / 1000).toFixed(2)}s

---

${enhancementText}

---

*This section was generated as an incremental enhancement to existing documentation.*
*Existing documentation files have been preserved.*`;

    // Write enhancement to file
    await fs.writeFile(enhancementFilePath, formattedEnhancement, 'utf-8');

    // Update index.md to include the new enhancement
    const indexPath = path.join(existingDocsPath, 'index.md');
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      const updatedIndex = indexContent.replace(
        /## Documentation Sections/,
        `## Documentation Sections\n\n### Latest Enhancement\n- [${userPrompt}](./${enhancementFileName})\n`,
      );
      await fs.writeFile(indexPath, updatedIndex, 'utf-8');
      this.logger.info('Updated index.md with new enhancement link');
    } catch {
      this.logger.warn('Could not update index.md - file may not exist');
    }

    this.logger.info(`✅ Enhancement saved to: ${enhancementFileName}`);
    this.logger.info(
      `Incremental documentation completed in ${(executionTime / 1000).toFixed(2)}s`,
    );

    // For incremental mode, return a minimal valid output
    // The actual enhancement was already written to disk above
    return {
      projectName: path.basename(projectPath),
      timestamp: new Date(),
      version: version,
      overview: {
        description: 'Incremental documentation update',
        primaryLanguage: scanResult.languages[0]?.language || 'unknown',
        languages: scanResult.languages.map((l) => l.language),
        frameworks: [],
        projectType: 'incremental-update',
        keyFeatures: [`Enhancement: ${userPrompt}`],
        statistics: {
          totalFiles: scanResult.totalFiles,
          totalLines: 0,
          totalSize: scanResult.totalSize,
          codeFiles: scanResult.totalFiles,
          testFiles: 0,
          configFiles: 0,
          documentationFiles: Object.keys(existingDocs).length,
          averageFileSize: Math.floor(scanResult.totalSize / scanResult.totalFiles),
          largestFiles: [],
        },
      },
      architecture: {
        style: 'preserved',
        patterns: [],
        components: [],
        relationships: [],
        dataFlow: 'See existing documentation',
        designPrinciples: [],
      },
      fileStructure: {
        rootStructure: {
          name: path.basename(projectPath),
          path: projectPath,
          type: 'directory',
          children: [],
          size: scanResult.totalSize,
          fileCount: scanResult.totalFiles,
          purpose: 'Project root',
        },
        keyDirectories: new Map(),
        organizationStrategy: 'See existing documentation',
        namingConventions: [],
      },
      dependencies: {
        productionDeps: [],
        developmentDeps: [],
        dependencyGraph: { nodes: [], edges: [], clusters: [] },
        outdatedDeps: [],
        securityVulnerabilities: [],
        licenseInfo: [],
        vulnerabilities: [],
        insights: [],
      },
      patterns: {
        designPatterns: [],
        architecturalPatterns: [],
        codingPatterns: [],
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
          codeSmells: 0,
          technicalDebt: '0h',
        },
        complexity: {
          cyclomatic: 0,
          cognitive: 0,
          halstead: { difficulty: 0, effort: 0, volume: 0 },
        },
        issues: [],
        improvements: [],
        bestPractices: [],
      },
      customSections: new Map([
        [
          enhancementFileName,
          {
            title: userPrompt,
            content: formattedEnhancement,
            metadata: {
              generatedAt: new Date().toISOString(),
              mode: 'incremental',
              executionTime,
              filePath: enhancementFilePath,
            },
          },
        ],
      ]),
      metadata: {
        generatorVersion: version,
        generationDuration: executionTime,
        totalTokensUsed: 2000 + Math.floor(enhancementText.length / 4),
        agentsExecuted: ['incremental-enhancer'],
        configuration: { mode: 'incremental', userPrompt, enhancementFile: enhancementFileName },
        warnings: [
          'Incremental mode: Only enhancement generated',
          'Existing documentation preserved',
          `New file created: ${enhancementFileName}`,
        ],
      },
    } as unknown as DocumentationOutput;
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
      query: options.userPrompt, // Pass user's focus area to enhance agent analysis
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
