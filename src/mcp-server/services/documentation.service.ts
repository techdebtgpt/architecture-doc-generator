/**
 * Documentation Service
 * Handles documentation generation, queries, and updates
 */

import * as path from 'path';
import { ArchDocConfig } from '../../utils/config-loader';
import { Logger } from '../../utils/logger';
import { DocumentationOrchestrator } from '../../orchestrator/documentation-orchestrator';
import { AgentRegistry } from '../../agents/agent-registry';
import { FileSystemScanner } from '../../scanners/file-system-scanner';
import { MultiFileMarkdownFormatter } from '../../formatters/multi-file-markdown-formatter';
import { ArchitectureAnalyzerAgent } from '../../agents/architecture-analyzer-agent';
import { FileStructureAgent } from '../../agents/file-structure-agent';
import { DependencyAnalyzerAgent } from '../../agents/dependency-analyzer-agent';
import { PatternDetectorAgent } from '../../agents/pattern-detector-agent';
import { FlowVisualizationAgent } from '../../agents/flow-visualization-agent';
import { SchemaGeneratorAgent } from '../../agents/schema-generator-agent';
import { SecurityAnalyzerAgent } from '../../agents/security-analyzer-agent';
import { KPIAnalyzerAgent } from '../../agents/kpi-analyzer-agent';
import { ErrorHandlingArchitectureAgent } from '../../agents/error-handling-architecture-agent';
import { DataContractsAgent } from '../../agents/data-contracts-agent';
import { TechnicalDebtAgent } from '../../agents/technical-debt-agent';
import { LLMService } from '../../llm/llm-service';
import * as fs from 'fs/promises';

const logger = new Logger('DocumentationService');

/**
 * Supported analysis depths (matches CLI exactly)
 */
const DEPTH_CONFIG = {
  quick: { maxIterations: 2, clarityThreshold: 70, maxQuestions: 2, skipSelfRefinement: true },
  normal: { maxIterations: 5, clarityThreshold: 80, maxQuestions: 3, skipSelfRefinement: false },
  deep: { maxIterations: 10, clarityThreshold: 90, maxQuestions: 5, skipSelfRefinement: false },
};

/**
 * Register all available agents (like CLI does)
 */
function registerAgents(): AgentRegistry {
  const agentRegistry = new AgentRegistry();
  agentRegistry.register(new ArchitectureAnalyzerAgent());
  agentRegistry.register(new FileStructureAgent());
  agentRegistry.register(new DependencyAnalyzerAgent());
  agentRegistry.register(new PatternDetectorAgent());
  agentRegistry.register(new FlowVisualizationAgent());
  agentRegistry.register(new SchemaGeneratorAgent());
  agentRegistry.register(new SecurityAnalyzerAgent());
  agentRegistry.register(new ErrorHandlingArchitectureAgent());
  agentRegistry.register(new DataContractsAgent());
  agentRegistry.register(new TechnicalDebtAgent());
  agentRegistry.register(new KPIAnalyzerAgent());
  logger.info(
    `Registered ${agentRegistry.getAllAgents().length} agents: ${agentRegistry
      .getAllAgents()
      .map((a) => a.getMetadata().name)
      .join(', ')}`,
  );
  return agentRegistry;
}

/**
 * Documentation service
 */
export class DocumentationService {
  constructor(
    private config: ArchDocConfig,
    private projectPath: string,
  ) {}

  /**
   * Get search mode, retrieval strategy, and embeddings provider from config.
   * Default: keyword for MCP (CLI defaults to vector). Used by generateDocumentation, updateDocumentation, runSelectiveAgents.
   */
  private getSearchOptions(): {
    searchMode: 'vector' | 'keyword';
    retrievalStrategy: 'vector' | 'graph' | 'hybrid' | 'smart' | undefined;
    embeddingsProvider: 'local' | 'openai' | 'google' | undefined;
  } {
    const configSearchMode = this.config.searchMode?.mode as 'vector' | 'keyword' | undefined;
    const searchMode = configSearchMode || 'keyword';
    const configRetrievalStrategy = this.config.searchMode?.strategy as
      | 'vector'
      | 'graph'
      | 'hybrid'
      | 'smart'
      | undefined;
    const retrievalStrategy =
      searchMode === 'vector' ? configRetrievalStrategy || 'hybrid' : undefined;
    const embeddingsProvider =
      searchMode === 'vector'
        ? (this.config.searchMode?.embeddingsProvider as
            | 'local'
            | 'openai'
            | 'google'
            | undefined) || 'local'
        : undefined;
    return { searchMode, retrievalStrategy, embeddingsProvider };
  }

  /**
   * Generate documentation
   */
  async generateDocumentation(options: {
    outputDir?: string;
    depth?: keyof typeof DEPTH_CONFIG;
    focusArea?: string;
    selectiveAgents?: string[];
    maxCostDollars?: number;
    force?: boolean;
    since?: string;
  }): Promise<{
    output: any;
    docsPath: string;
  }> {
    const depth = options.depth || 'normal';
    // IMPORTANT: if outputDir is relative (".arch-docs"), resolve it against projectPath
    // (CLI behavior: default is <project>/.arch-docs, not <cwd>/.arch-docs)
    const docsPath = options.outputDir
      ? path.isAbsolute(options.outputDir)
        ? options.outputDir
        : path.join(this.projectPath, options.outputDir)
      : path.join(this.projectPath, '.arch-docs');
    const focusArea = options.focusArea;
    const selectiveAgents = options.selectiveAgents;
    const maxCostDollars = options.maxCostDollars || 5.0;
    const force = options.force || false;
    const since = options.since;

    // Get depth config (matches CLI exactly)
    const depthConfig = DEPTH_CONFIG[depth];
    const { searchMode, retrievalStrategy, embeddingsProvider } = this.getSearchOptions();

    // Check for existing documentation (mirror CLI behavior exactly)
    const hasExistingDocs = await this.checkExistingDocumentation(docsPath);

    // Determine mode exactly like CLI does:
    // 1. Incremental mode WITH prompt: hasExistingDocs && focusArea provided → enhance specific area
    // 2. Refinement check mode: hasExistingDocs && NO focusArea → check for improvements
    // 3. Full generation: !hasExistingDocs → generate from scratch
    const isIncrementalMode = hasExistingDocs && !!focusArea;
    const isRefinementCheckMode = hasExistingDocs && !focusArea && !selectiveAgents;

    // Full generation: clean output dir before run (mirror CLI --clean behavior, avoid stale files)
    if (!hasExistingDocs) {
      try {
        await fs.access(docsPath);
        await fs.rm(docsPath, { recursive: true, force: true });
        logger.info(`Cleaned output directory: ${docsPath}`);
      } catch {
        // Dir does not exist, ignore
      }
      await fs.mkdir(docsPath, { recursive: true });
    }

    logger.info(`Generating documentation for ${this.projectPath}...`);

    // Initialize LLMService with config BEFORE registering agents (matches CLI approach)
    LLMService.getInstance(this.config);

    const agentRegistry = registerAgents();
    const scanner = new FileSystemScanner();
    const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner, this.config);

    // Pass options exactly like CLI does - match ALL CLI options
    try {
      const output = await orchestrator.generateDocumentation(this.projectPath, {
        maxTokens: 100000, // Match CLI exactly
        maxCostDollars, // Match CLI
        parallel: true, // Match CLI exactly
        userPrompt: focusArea, // Match CLI
        selectiveAgents, // Match CLI
        incrementalMode: isIncrementalMode || isRefinementCheckMode, // Match CLI: pass if docs exist
        existingDocsPath: isIncrementalMode || isRefinementCheckMode ? docsPath : undefined, // Match CLI: pass path if docs exist
        iterativeRefinement: {
          enabled: true, // Match CLI: default enabled
          maxIterations: depthConfig.maxIterations, // Match CLI
          clarityThreshold: depthConfig.clarityThreshold, // Match CLI
          minImprovement: 10, // Match CLI
        },
        runName: process.env.ARCHDOC_RUN_NAME, // Match CLI: custom run name from env
        agentOptions: {
          runnableConfig: {
            runName: 'DocumentationGeneration-Complete', // Match CLI exactly
          },
          maxQuestionsPerIteration: depthConfig.maxQuestions, // Match CLI
          skipSelfRefinement: depthConfig.skipSelfRefinement, // Match CLI
          searchMode, // Match CLI: vector or keyword
        },
        retrievalStrategy, // Match CLI: hybrid/vector/graph/smart
        embeddingsProvider, // Match CLI: local/openai/google
        force, // Match CLI: from user option
        since, // Match CLI: git commit/branch/tag
      });

      // Write to files
      const formatter = new MultiFileMarkdownFormatter();
      await formatter.format(output, {
        outputDir: docsPath,
        includeMetadata: true,
        includeTOC: true,
        includeNavigation: true,
      });

      return { output, docsPath };
    } catch (error) {
      // Handle special case: refinement check found no improvements needed (matches CLI behavior)
      if (error instanceof Error && error.message === 'NO_IMPROVEMENTS_NEEDED') {
        logger.info('✅ Documentation is up-to-date, no changes needed');
        // Return empty output structure with proper metadata (matches CLI behavior)
        const emptyOutput: any = {
          projectName: this.projectPath,
          timestamp: new Date(),
          version: '1.0.0',
          overview: {},
          architecture: {},
          fileStructure: {},
          dependencies: {},
          customSections: new Map(),
          metadata: {
            agentsExecuted: [],
            totalTokensUsed: 0,
            message:
              'No improvements needed - documentation is up-to-date. To force regeneration, delete the .arch-docs directory or use a focusArea/selectiveAgents parameter.',
          },
        };
        return { output: emptyOutput, docsPath };
      }
      throw error;
    }
  }

  /**
   * Update existing documentation
   */
  async updateDocumentation(options: { prompt: string; existingDocsPath?: string }): Promise<{
    output: any;
    docsPath: string;
  }> {
    // Keep CLI semantics: relative paths are relative to projectPath
    const docsPath = options.existingDocsPath
      ? path.isAbsolute(options.existingDocsPath)
        ? options.existingDocsPath
        : path.join(this.projectPath, options.existingDocsPath)
      : path.join(this.projectPath, '.arch-docs');
    const prompt = options.prompt;

    logger.info(`Updating documentation with prompt: "${prompt}"`);

    // Initialize LLMService with config BEFORE registering agents (matches CLI approach)
    LLMService.getInstance(this.config);

    const agentRegistry = registerAgents();
    const scanner = new FileSystemScanner();
    const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner, this.config);
    const { searchMode, retrievalStrategy, embeddingsProvider } = this.getSearchOptions();

    const output = await orchestrator.generateDocumentation(this.projectPath, {
      maxTokens: 100000, // Match CLI
      parallel: true, // Match CLI
      userPrompt: prompt,
      incrementalMode: true,
      existingDocsPath: docsPath,
      agentOptions: {
        runnableConfig: {
          runName: 'DocumentationGeneration-Complete', // Match CLI
        },
        searchMode, // Match CLI
      },
      retrievalStrategy, // Match CLI
      embeddingsProvider, // Match CLI
    });

    // Write updates
    const formatter = new MultiFileMarkdownFormatter();
    await formatter.format(output, {
      outputDir: docsPath,
      includeMetadata: true,
      includeTOC: true,
      includeNavigation: true,
    });

    return { output, docsPath };
  }

  /**
   * Run selective agent analysis
   */
  async runSelectiveAgents(options: {
    selectiveAgents: string[];
    userPrompt?: string;
  }): Promise<any> {
    // Initialize LLMService with config BEFORE registering agents (matches CLI approach)
    LLMService.getInstance(this.config);

    const agentRegistry = registerAgents();
    const scanner = new FileSystemScanner();
    const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner, this.config);
    const { searchMode, retrievalStrategy, embeddingsProvider } = this.getSearchOptions();

    return await orchestrator.generateDocumentation(this.projectPath, {
      maxTokens: 100000, // Match CLI
      parallel: true, // Match CLI
      selectiveAgents: options.selectiveAgents,
      userPrompt: options.userPrompt,
      agentOptions: {
        runnableConfig: {
          runName: 'DocumentationGeneration-Complete', // Match CLI
        },
        searchMode, // Match CLI
      },
      retrievalStrategy, // Match CLI
      embeddingsProvider, // Match CLI
    });
  }

  /**
   * Check if existing documentation exists
   */
  private async checkExistingDocumentation(docsPath: string): Promise<boolean> {
    try {
      // Match CLI semantics: treat docs as "existing" only if key files exist.
      // This avoids mistakenly entering refinement-check mode due to a single stray .md file.
      await fs.access(docsPath);
      const indexPath = path.join(docsPath, 'index.md');
      const metadataPath = path.join(docsPath, 'metadata.md');

      const hasIndex = await fs
        .access(indexPath)
        .then(() => true)
        .catch(() => false);
      const hasMetadata = await fs
        .access(metadataPath)
        .then(() => true)
        .catch(() => false);

      return hasIndex && hasMetadata;
    } catch {
      return false;
    }
  }

  /**
   * Format generation output
   */
  formatOutput(output: any, metadata: Record<string, any>): string {
    // If orchestrator determined no improvements were needed (refinement-check mode),
    // avoid reporting "generated successfully" (no agents run, no files updated).
    const noImprovements =
      output?.metadata?.agentsExecuted?.length === 0 &&
      output?.metadata?.totalTokensUsed === 0 &&
      typeof output?.metadata?.message === 'string' &&
      output.metadata.message.includes('No improvements needed');

    if (noImprovements) {
      return `✅ Documentation is up-to-date (no regeneration needed).

**Output**: ${metadata.docsPath}
**Agents Executed**: 0
**Total Tokens**: 0
**Files Generated**: 0

**Why**: ${output.metadata.message}

📖 Use \`query_documentation\` to ask questions about the existing docs.

If you expected a full regeneration:
- Pass \`focusArea\` (any value) to force an enhancement run, or
- Pass \`selectiveAgents\` to regenerate specific sections, or
- Delete the output directory and rerun.`;
    }

    return `✅ Documentation generated successfully!

**Output**: ${metadata.docsPath}
**Agents Executed**: ${output.metadata.agentsExecuted?.length || 0}
**Total Tokens**: ${output.metadata.totalTokensUsed?.toLocaleString() || 0}
**Files Generated**: ${Array.from(output.customSections.values()).reduce((sum: number, section: any) => sum + (section.files?.length || 0), 0)}

**Summary**: ${output.metadata.agentsExecuted?.join(', ') || 'N/A'}

📖 Use 'query_documentation' to ask questions about the architecture!`;
  }

  /**
   * Read documentation files as fallback
   */
  async readDocumentationFallback(docsPath: string): Promise<string> {
    try {
      const files = await fs.readdir(docsPath);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      let allContent = '';
      for (const file of mdFiles) {
        const content = await fs.readFile(path.join(docsPath, file), 'utf-8');
        allContent += `\n\n--- ${file} ---\n\n${content}`;
      }

      return allContent;
    } catch (error) {
      throw new Error(
        `Failed to read documentation: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
