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
import * as fs from 'fs/promises';

const logger = new Logger('DocumentationService');

/**
 * Supported analysis depths
 */
const DEPTH_CONFIG = {
  quick: { enabled: false, maxIterations: 0, clarityThreshold: 0 },
  normal: { enabled: true, maxIterations: 5, clarityThreshold: 80 },
  deep: { enabled: true, maxIterations: 10, clarityThreshold: 90 },
};

/**
 * Documentation service
 */
export class DocumentationService {
  constructor(
    private config: ArchDocConfig,
    private projectPath: string,
  ) {}

  /**
   * Generate documentation
   */
  async generateDocumentation(options: {
    outputDir?: string;
    depth?: keyof typeof DEPTH_CONFIG;
    focusArea?: string;
    selectiveAgents?: string[];
    maxCostDollars?: number;
  }): Promise<{
    output: any;
    docsPath: string;
  }> {
    const depth = options.depth || 'normal';
    const docsPath = options.outputDir || path.join(this.projectPath, '.arch-docs');
    const focusArea = options.focusArea;
    const selectiveAgents = options.selectiveAgents;
    const maxCostDollars = options.maxCostDollars || 5.0;

    logger.info(`Generating documentation for ${this.projectPath}...`);

    const agentRegistry = new AgentRegistry();
    const scanner = new FileSystemScanner();
    const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner, this.config);

    const output = await orchestrator.generateDocumentation(this.projectPath, {
      userPrompt: focusArea,
      selectiveAgents,
      maxCostDollars,
      iterativeRefinement: {
        ...DEPTH_CONFIG[depth],
        minImprovement: 10,
      },
      agentOptions: {
        searchMode: this.config.searchMode?.mode || 'keyword',
      },
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
  }

  /**
   * Update existing documentation
   */
  async updateDocumentation(options: { prompt: string; existingDocsPath?: string }): Promise<{
    output: any;
    docsPath: string;
  }> {
    const docsPath = options.existingDocsPath || path.join(this.projectPath, '.arch-docs');
    const prompt = options.prompt;

    logger.info(`Updating documentation with prompt: "${prompt}"`);

    const agentRegistry = new AgentRegistry();
    const scanner = new FileSystemScanner();
    const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner, this.config);

    const output = await orchestrator.generateDocumentation(this.projectPath, {
      userPrompt: prompt,
      incrementalMode: true,
      existingDocsPath: docsPath,
      agentOptions: {
        searchMode: this.config.searchMode?.mode || 'keyword',
      },
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
    const agentRegistry = new AgentRegistry();
    const scanner = new FileSystemScanner();
    const orchestrator = new DocumentationOrchestrator(agentRegistry, scanner, this.config);

    return await orchestrator.generateDocumentation(this.projectPath, {
      selectiveAgents: options.selectiveAgents,
      userPrompt: options.userPrompt,
      agentOptions: {
        searchMode: this.config.searchMode?.mode || 'keyword',
      },
    });
  }

  /**
   * Format generation output
   */
  formatOutput(output: any, metadata: Record<string, any>): string {
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
