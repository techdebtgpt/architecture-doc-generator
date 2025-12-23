import * as path from 'path';
import * as fs from 'fs/promises';
import type {
  DocumentationOutput,
  DirectoryDescription,
  ComponentDescription,
  DocumentationMetadata,
  CustomSection,
} from '../types/output.types';

/**
 * Multi-file formatter options
 */
export interface MultiFileFormatterOptions {
  /** Output directory path */
  outputDir: string;
  /** Include table of contents in files */
  includeTOC?: boolean;
  /** Include metadata footer */
  includeMetadata?: boolean;
  /** Include navigation links between files */
  includeNavigation?: boolean;
}

/**
 * Formats documentation output as multiple organized markdown files
 */
export class MultiFileMarkdownFormatter {
  /**
   * Format and write documentation as multiple files
   * NEW: Agents generate their own files, formatter only handles orchestrator-owned files
   */
  async format(output: DocumentationOutput, options: MultiFileFormatterOptions): Promise<string[]> {
    const opts = {
      includeTOC: true,
      includeMetadata: true,
      includeNavigation: true,
      ...options,
    };

    // Ensure output directory exists
    await fs.mkdir(opts.outputDir, { recursive: true });

    const generatedFiles: string[] = [];

    // STEP 1: Write JSON cache for agent results
    await this.writeJsonCache(output, opts);

    // STEP 2: Write agent-generated files (agents own their file generation)
    const agentFiles = await this.writeAgentFiles(output, opts);
    generatedFiles.push(...agentFiles);

    // STEP 3: Write orchestrator-owned files (generic/cross-cutting)
    const orchestratorFiles = await this.writeOrchestratorFiles(output, opts);
    generatedFiles.push(...orchestratorFiles);

    return generatedFiles;
  }

  /**
   * Write JSON cache for agent results
   * Saves structured data to .arch-docs/cache/{agent-name}.json
   */
  private async writeJsonCache(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): Promise<void> {
    const cacheDir = path.join(options.outputDir, 'cache');
    await fs.mkdir(cacheDir, { recursive: true });

    const sectionsIterator =
      output.customSections instanceof Map
        ? output.customSections.entries()
        : Object.entries(output.customSections as Record<string, any>);

    for (const [agentName, section] of sectionsIterator) {
      const customSection = section as {
        data?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
        confidence?: number;
        executionTime?: number;
        status?: string;
        summary?: string;
        tokenUsage?: {
          inputTokens: number;
          outputTokens: number;
          totalTokens: number;
        };
      };

      // Skip if agent was skipped or has no data
      if (customSection.metadata?.skipped === true || !customSection.data) {
        continue;
      }

      // Create cache object with data + metadata
      const cacheData = {
        // Analysis data (primary content)
        ...customSection.data,

        // Metadata about the analysis
        _metadata: {
          agentName,
          status: customSection.status || 'success',
          confidence: customSection.confidence || 1.0,
          executionTime: customSection.executionTime || 0,
          tokenUsage: customSection.tokenUsage || {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          },
          summary: customSection.summary,
          generatedAt: output.timestamp.toISOString(),
          ...customSection.metadata,
        },
      };

      // Write JSON cache file
      const jsonPath = path.join(cacheDir, `${agentName}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(cacheData, null, 2), 'utf-8');
    }
  }

  /**
   * Write agent-generated files directly (agents own their file generation)
   */
  private async writeAgentFiles(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): Promise<string[]> {
    const generatedFiles: string[] = [];

    const sectionsIterator =
      output.customSections instanceof Map
        ? output.customSections.entries()
        : Object.entries(output.customSections as Record<string, any>);

    for (const [agentName, section] of sectionsIterator) {
      const customSection = section as {
        files?: Array<{ filename: string; content: string; title: string; category?: string }>;
        markdown?: string;
        metadata?: Record<string, unknown>;
      };

      // Skip if agent was skipped or has no content
      if (customSection.metadata?.skipped === true) {
        continue;
      }

      // Collect filenames first for navigation
      const files = customSection.files || [];
      if (files.length > 0) {
        for (const file of files) {
          generatedFiles.push(path.join(options.outputDir, file.filename));
        }
      } else if (customSection.markdown) {
        const fileMapping: Record<string, string> = {
          'flow-visualization': 'flows.md',
          'schema-generator': 'schemas.md',
          'security-analyzer': 'security.md',
          'file-structure': 'file-structure.md',
          'dependency-analyzer': 'dependencies.md',
          'pattern-detector': 'patterns.md',
          'architecture-analyzer': 'architecture.md',
        };
        const filename = fileMapping[agentName] || `${agentName}.md`;
        generatedFiles.push(path.join(options.outputDir, filename));
      }
    }

    // Build a set of generated file names (without path) for navigation
    const generatedFileNames = new Set(generatedFiles.map((filePath) => path.basename(filePath)));

    // Now write files with proper navigation
    const sectionsIterator2 =
      output.customSections instanceof Map
        ? output.customSections.entries()
        : Object.entries(output.customSections as Record<string, any>);

    for (const [agentName, section] of sectionsIterator2) {
      const customSection = section as {
        files?: Array<{ filename: string; content: string; title: string; category?: string }>;
        markdown?: string;
        metadata?: Record<string, unknown>;
      };

      // Skip if agent was skipped or has no content
      if (customSection.metadata?.skipped === true) {
        continue;
      }

      // Use new files array if available, fallback to markdown (backwards compat)
      const files = customSection.files || [];
      if (files.length > 0) {
        // NEW: Agent provides its own files with navigation
        for (const file of files) {
          const filePath = path.join(options.outputDir, file.filename);
          const contentWithNav = this.addNavigationToContent(
            file.content,
            file.filename,
            options,
            generatedFileNames,
          );
          await fs.writeFile(filePath, contentWithNav, 'utf-8');
        }
      } else if (customSection.markdown) {
        // FALLBACK: Use markdown field (deprecated pattern)
        const fileMapping: Record<string, string> = {
          'flow-visualization': 'flows.md',
          'schema-generator': 'schemas.md',
          'security-analyzer': 'security.md',
          'file-structure': 'file-structure.md',
          'dependency-analyzer': 'dependencies.md',
          'pattern-detector': 'patterns.md',
          'architecture-analyzer': 'architecture.md',
        };
        const filename = fileMapping[agentName] || `${agentName}.md`;
        const filePath = path.join(options.outputDir, filename);
        const contentWithNav = this.addNavigationToContent(
          customSection.markdown,
          filename,
          options,
          generatedFileNames,
        );
        await fs.writeFile(filePath, contentWithNav, 'utf-8');
      }
    }

    return generatedFiles;
  }

  /**
   * Write orchestrator-owned files (generic/cross-cutting concerns)
   */
  private async writeOrchestratorFiles(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): Promise<string[]> {
    const generatedFiles: string[] = [];

    // Determine which files exist for navigation
    const agentFilenames = new Set<string>();
    const sectionsIterator =
      output.customSections instanceof Map
        ? output.customSections.entries()
        : Object.entries(output.customSections as Record<string, any>);

    for (const [_, section] of sectionsIterator) {
      const customSection = section as { files?: Array<{ filename: string }> };
      if (customSection.files) {
        customSection.files.forEach((f) => agentFilenames.add(f.filename));
      }
    }

    // Always generate: index, metadata, changelog
    const indexPath = path.join(options.outputDir, 'index.md');
    await fs.writeFile(indexPath, this.generateIndexFile(output, options, agentFilenames), 'utf-8');
    generatedFiles.push(indexPath);

    const metadataPath = path.join(options.outputDir, 'metadata.md');
    await fs.writeFile(
      metadataPath,
      this.generateMetadataFile(output, options, agentFilenames),
      'utf-8',
    );
    generatedFiles.push(metadataPath);

    const changelogPath = path.join(options.outputDir, 'changelog.md');
    await fs.writeFile(changelogPath, this.generateChangelogFile(output, options), 'utf-8');
    generatedFiles.push(changelogPath);

    // NOTE: kpi.md is now generated by KPIAnalyzerAgent (not by formatter)

    // Conditionally generate: recommendations (if there are recommendations)
    if (output.codeQuality.improvements.length > 0 || output.patterns.recommendations.length > 0) {
      const recsPath = path.join(options.outputDir, 'recommendations.md');
      await fs.writeFile(
        recsPath,
        this.generateRecommendationsFile(output, options, agentFilenames),
        'utf-8',
      );
      generatedFiles.push(recsPath);
    }

    // Conditionally generate: code-quality (if there's data)
    if (
      output.codeQuality.improvements.length > 0 ||
      output.codeQuality.issues.length > 0 ||
      output.codeQuality.overallScore > 0
    ) {
      const qualityPath = path.join(options.outputDir, 'code-quality.md');
      await fs.writeFile(
        qualityPath,
        this.generateCodeQualityFile(output, options, agentFilenames),
        'utf-8',
      );
      generatedFiles.push(qualityPath);
    }

    return generatedFiles;
  }

  /**
   * Generate index file with navigation and overview
   */
  private generateIndexFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
    generatedFiles: Set<string>,
  ): string {
    const nav = this.generateNavigation('index.md', options, generatedFiles);
    const { overview, architecture, codeQuality } = output;

    let content = `# ${output.projectName} - Architecture Documentation\n\n`;

    if (overview.description) {
      content += `${overview.description}\n\n`;
    }

    content += `## 📊 Quick Stats\n\n`;
    content += `- **Primary Language**: ${overview.primaryLanguage}\n`;

    // Language breakdown if multiple languages
    if (overview.languages.length > 1) {
      content += `- **Languages Used**: ${overview.languages.join(', ')}\n`;
    }

    content += `- **Total Files**: ${overview.statistics.totalFiles.toLocaleString()}\n`;
    content += `- **Total Lines of Code**: ${overview.statistics.totalLines.toLocaleString()}\n`;
    content += `- **Code Files**: ${overview.statistics.codeFiles.toLocaleString()}\n`;
    content += `- **Test Files**: ${overview.statistics.testFiles.toLocaleString()}\n`;
    content += `- **Config Files**: ${overview.statistics.configFiles.toLocaleString()}\n`;
    content += `- **Project Size**: ${this.formatFileSize(overview.statistics.totalSize)}\n`;

    // Add quality score if available
    if (codeQuality.overallScore > 0) {
      content += `- **Quality Score**: ${codeQuality.overallScore.toFixed(1)}/10\n`;
    }

    // Add architecture style if detected
    if (
      architecture.style &&
      architecture.style !== 'Unknown' &&
      architecture.style !== 'preserved'
    ) {
      content += `- **Architecture**: ${architecture.style}\n`;
    }

    content += `\n`;

    // Generate Key Highlights from agent data
    content += this.generateKeyHighlights(output);

    content += `## 📚 Documentation Index\n\n`;

    // Build documentation index dynamically based on what will actually be generated
    let docIndex = 1;

    // Architecture (only if components exist)
    if (generatedFiles.has('architecture.md')) {
      content += `${docIndex++}. **[Architecture](./architecture.md)** - System architecture, components, and patterns\n`;
    }

    // File Structure (always generated)
    content += `${docIndex++}. **[File Structure](./file-structure.md)** - Project organization and directory structure\n`;

    // Dependencies (always generated)
    content += `${docIndex++}. **[Dependencies](./dependencies.md)** - External dependencies and their relationships\n`;

    // Patterns (always generated)
    content += `${docIndex++}. **[Patterns](./patterns.md)** - Design patterns and architectural patterns detected\n`;

    // Code Quality (only if there's data)
    if (generatedFiles.has('code-quality.md')) {
      content += `${docIndex++}. **[Code Quality](./code-quality.md)** - Quality metrics, issues, and complexity analysis\n`;
    }

    // Add flows, schemas, and security if they exist
    const flowSection = output.customSections.get
      ? output.customSections.get('flow-visualization')
      : (output.customSections as Record<string, any>)['flow-visualization'];
    const schemaSection = output.customSections.get
      ? output.customSections.get('schema-generator')
      : (output.customSections as Record<string, any>)['schema-generator'];
    const securitySection = output.customSections.get
      ? output.customSections.get('security-analyzer')
      : (output.customSections as Record<string, any>)['security-analyzer'];

    if (flowSection) {
      content += `${docIndex++}. **[Flow Visualizations](./flows.md)** - Data flows, process flows, and component interactions\n`;
    }
    if (schemaSection) {
      content += `${docIndex++}. **[Schema Documentation](./schemas.md)** - Database schemas, API schemas, and type definitions\n`;
    }
    if (securitySection) {
      content += `${docIndex++}. **[Security Analysis](./security.md)** - Security assessment, vulnerabilities, and recommendations\n`;
    }

    // Recommendations (moved here - after security, before KPI)
    if (generatedFiles.has('recommendations.md')) {
      content += `${docIndex++}. **[Recommendations](./recommendations.md)** - Improvement suggestions and best practices\n`;
    }

    // KPI Dashboard (only if generated by agent)
    if (generatedFiles.has('kpi.md')) {
      content += `${docIndex++}. **[Repository KPI](./kpi.md)** - Repository health metrics and performance indicators\n`;
    }

    // Metadata (always generated)
    content += `${docIndex++}. **[Metadata](./metadata.md)** - Generation information and configuration\n`;

    // Changelog (always generated)
    content += `${docIndex++}. **[Changelog](./changelog.md)** - Documentation update history and version tracking\n\n`;

    if (overview.frameworks.length > 0) {
      content += `## 🛠 Technology Stack\n\n`;
      content += `**Frameworks**: ${overview.frameworks.join(', ')}\n\n`;
    }

    if (overview.keyFeatures.length > 0) {
      content += `## ✨ Key Features\n\n`;
      overview.keyFeatures.forEach((feature: string) => {
        content += `- ${feature}\n`;
      });
      content += `\n`;
    }

    if (architecture.components.length > 0) {
      content += `## 🏗 Main Components\n\n`;
      architecture.components.slice(0, 5).forEach((comp: ComponentDescription) => {
        content += `- **${comp.name}**: ${comp.description}\n`;
      });
      if (architecture.components.length > 5) {
        content += `\n_See [Architecture](./architecture.md) for complete component list._\n`;
      }
      content += `\n`;
    }

    content += nav;
    if (options.includeMetadata) {
      content += this.generateMetadataFooter(output);
    }

    return content;
  }

  /**
   * Render directory tree recursively
   */
  private renderDirectoryTree(node: DirectoryDescription, level: number, maxDepth: number): string {
    if (level >= maxDepth) {
      return '';
    }

    const indent = '  '.repeat(level);
    let result = `${indent}${node.name}/\n`;

    if (node.children && node.children.length > 0) {
      const maxChildren = 20;
      const children = node.children.slice(0, maxChildren);

      children.forEach((child: DirectoryDescription) => {
        result += this.renderDirectoryTree(child, level + 1, maxDepth);
      });

      if (node.children.length > maxChildren) {
        result += `${indent}  ... (${node.children.length - maxChildren} more)\n`;
      }
    }

    return result;
  }

  /**
   * Get the ordered list of documentation files
   */
  private getDocumentationOrder(generatedFiles: Set<string>): string[] {
    // Define the standard order of files (MUST match index.md generation order)
    const standardOrder = [
      'index.md',
      'architecture.md',
      'file-structure.md',
      'dependencies.md',
      'patterns.md',
      'code-quality.md',
      'flows.md',
      'schemas.md',
      'security.md',
      'recommendations.md', // After security
      'kpi.md', // After recommendations
      'metadata.md',
      'changelog.md',
    ];

    // Filter to only include files that were actually generated
    return standardOrder.filter((file) => generatedFiles.has(file));
  }

  /**
   * Generate navigation links with next/previous support
   */
  private generateNavigation(
    currentFile: string,
    options: MultiFileFormatterOptions,
    generatedFiles: Set<string>,
  ): string {
    if (!options.includeNavigation) {
      return '';
    }

    const orderedFiles = this.getDocumentationOrder(generatedFiles);
    const currentIndex = orderedFiles.indexOf(currentFile);

    let nav = '\n---\n\n';

    // Navigation links
    const navLinks: string[] = [];

    // Back to index (except for index.md itself)
    if (currentFile !== 'index.md') {
      navLinks.push(`[← Back to Index](./index.md)`);
    }

    // Previous section
    if (currentIndex > 0) {
      const prevFile = orderedFiles[currentIndex - 1];
      const prevTitle = this.getFileTitle(prevFile);
      navLinks.push(`[← Previous: ${prevTitle}](./${prevFile})`);
    }

    // Next section
    if (currentIndex >= 0 && currentIndex < orderedFiles.length - 1) {
      const nextFile = orderedFiles[currentIndex + 1];
      const nextTitle = this.getFileTitle(nextFile);
      navLinks.push(`[Next: ${nextTitle} →](./${nextFile})`);
    }

    nav += navLinks.join(' | ');
    nav += '\n';

    return nav;
  }

  /**
   * Get human-readable title for a file
   */
  private getFileTitle(filename: string): string {
    const titles: Record<string, string> = {
      'index.md': 'Index',
      'architecture.md': 'Architecture',
      'file-structure.md': 'File Structure',
      'dependencies.md': 'Dependencies',
      'patterns.md': 'Patterns',
      'code-quality.md': 'Code Quality',
      'recommendations.md': 'Recommendations',
      'flows.md': 'Flow Visualizations',
      'schemas.md': 'Schema Documentation',
      'security.md': 'Security Analysis',
      'metadata.md': 'Metadata',
      'changelog.md': 'Changelog',
      'kpi.md': 'Repository KPI',
    };

    return titles[filename] || filename.replace('.md', '').replace(/-/g, ' ');
  }

  /**
   * Add navigation links to content (if not already present at the bottom)
   */
  private addNavigationToContent(
    content: string,
    currentFile: string,
    options: MultiFileFormatterOptions,
    generatedFiles: Set<string>,
  ): string {
    // Check if navigation already exists at the BOTTOM (last 500 chars)
    // This allows "Back to Index" at the top while still adding full navigation at bottom
    const lastChunk = content.slice(-500);
    const hasBottomNav =
      lastChunk.includes('[← Back to Index]') &&
      (lastChunk.includes('[← Previous:') || lastChunk.includes('[Next:'));

    if (hasBottomNav) {
      return content;
    }

    // Add navigation at the end
    const nav = this.generateNavigation(currentFile, options, generatedFiles);
    return content + nav;
  }

  private generateGenerationMetricsSection(
    output: DocumentationOutput,
    metadata: DocumentationMetadata,
  ): string {
    let content = `## ⚡ Generation Performance Metrics\n\n`;
    content += `Performance statistics from the documentation generation process (not repository metrics).\n\n`;

    // Calculate per-agent metrics from customSections
    const agentMetrics: Array<{
      name: string;
      confidence: number;
      executionTime: number;
      status: string;
    }> = [];

    for (const [agentName, section] of output.customSections.entries()) {
      // TypeScript doesn't know about these fields, but they're added by orchestrator
      const sectionData = section as CustomSection & {
        confidence?: number;
        executionTime?: number;
        status?: string;
      };

      if (sectionData.confidence !== undefined && sectionData.executionTime !== undefined) {
        agentMetrics.push({
          name: agentName,
          confidence: sectionData.confidence,
          executionTime: sectionData.executionTime,
          status: sectionData.status || 'success',
        });
      }
    }

    // Overall Performance Metrics
    const totalDuration = metadata.generationDuration / 1000; // Convert to seconds
    const totalTokens = metadata.totalTokensUsed;
    const avgConfidence =
      agentMetrics.length > 0
        ? agentMetrics.reduce((sum, m) => sum + m.confidence, 0) / agentMetrics.length
        : 0;
    const estimatedCost = (totalTokens / 1_000_000) * 3; // $3 per million tokens (rough estimate)
    const tokensPerSecond = totalDuration > 0 ? Math.round(totalTokens / totalDuration) : 0;
    const filesAnalyzed = output.overview.statistics.totalFiles;
    const filesPerSecond = totalDuration > 0 ? (filesAnalyzed / totalDuration).toFixed(2) : '0';

    content += `### Overall Performance\n\n`;
    content += `| Metric | Value | Rating |\n`;
    content += `|--------|-------|--------|\n`;
    content += `| **Total Duration** | ${totalDuration.toFixed(2)}s | ${this.getRatingEmoji(totalDuration, 'duration')} |\n`;
    content += `| **Average Confidence** | ${avgConfidence.toFixed(1)}% | ${this.getRatingEmoji(avgConfidence, 'confidence')} |\n`;
    content += `| **Total Cost** | $${estimatedCost.toFixed(4)} | ${this.getRatingEmoji(estimatedCost, 'cost')} |\n`;
    content += `| **Processing Speed** | ${filesPerSecond} files/s | ${this.getRatingEmoji(parseFloat(filesPerSecond), 'speed')} |\n`;
    content += `| **Token Efficiency** | ${tokensPerSecond.toLocaleString()} tokens/s | ${this.getRatingEmoji(tokensPerSecond, 'tokenSpeed')} |\n`;
    content += `| **Agents Executed** | ${metadata.agentsExecuted.length} | ✅ |\n\n`;

    // Agent Performance Breakdown
    if (agentMetrics.length > 0) {
      content += `### Agent Performance\n\n`;
      content += `| Agent | Confidence | Time | Status |\n`;
      content += `|-------|-----------|------|--------|\n`;

      // Sort by execution time descending
      const sortedAgents = [...agentMetrics].sort((a, b) => b.executionTime - a.executionTime);

      for (const agent of sortedAgents) {
        const confidenceEmoji = this.getRatingEmoji(agent.confidence, 'confidence');
        const statusEmoji =
          agent.status === 'success' ? '✅' : agent.status === 'partial' ? '⚠️' : '❌';
        content += `| **${agent.name}** | ${agent.confidence.toFixed(1)}% ${confidenceEmoji} | ${agent.executionTime.toFixed(1)}s | ${statusEmoji} |\n`;
      }
      content += `\n`;

      // Slowest and fastest agents
      const slowestAgent = sortedAgents[0];
      const fastestAgent = sortedAgents[sortedAgents.length - 1];

      content += `**Performance Insights**:\n\n`;
      content += `- ⏱️ **Slowest Agent**: \`${slowestAgent.name}\` (${slowestAgent.executionTime.toFixed(1)}s)\n`;
      content += `- ⚡ **Fastest Agent**: \`${fastestAgent.name}\` (${fastestAgent.executionTime.toFixed(1)}s)\n`;
      content += `- 🎯 **Highest Confidence**: \`${sortedAgents.reduce((max, a) => (a.confidence > max.confidence ? a : max)).name}\` (${sortedAgents.reduce((max, a) => (a.confidence > max.confidence ? a : max)).confidence.toFixed(1)}%)\n`;
      content += `- 📉 **Lowest Confidence**: \`${sortedAgents.reduce((min, a) => (a.confidence < min.confidence ? a : min)).name}\` (${sortedAgents.reduce((min, a) => (a.confidence < min.confidence ? a : min)).confidence.toFixed(1)}%)\n\n`;
    }

    // Quality Metrics
    const successfulAgents = agentMetrics.filter((a) => a.status === 'success').length;
    const partialAgents = agentMetrics.filter((a) => a.status === 'partial').length;
    const failedAgents = agentMetrics.filter((a) => a.status === 'failed').length;
    const successRate =
      agentMetrics.length > 0 ? ((successfulAgents / agentMetrics.length) * 100).toFixed(1) : '100';

    content += `### Quality Metrics\n\n`;
    content += `| Metric | Value |\n`;
    content += `|--------|-------|\n`;
    content += `| **Success Rate** | ${successRate}% (${successfulAgents}/${agentMetrics.length}) |\n`;
    content += `| **Successful Agents** | ${successfulAgents} ✅ |\n`;
    content += `| **Partial Results** | ${partialAgents} ⚠️ |\n`;
    content += `| **Failed Agents** | ${failedAgents} ❌ |\n`;
    content += `| **Total Gaps Identified** | ${(metadata.agentGaps || []).reduce((sum, g) => sum + g.gapCount, 0)} |\n`;
    content += `| **Warnings Generated** | ${metadata.warnings?.length || 0} |\n\n`;

    // Resource Utilization
    const codeFiles = output.overview.statistics.codeFiles;
    const testFiles = output.overview.statistics.testFiles;
    const configFiles = output.overview.statistics.configFiles;
    const totalLines = output.overview.statistics.totalLines;
    const totalSize = output.overview.statistics.totalSize;
    const tokensPerFile = filesAnalyzed > 0 ? Math.round(totalTokens / filesAnalyzed) : 0;
    const costPerFile = filesAnalyzed > 0 ? (estimatedCost / filesAnalyzed).toFixed(6) : '0';

    content += `### Resource Utilization\n\n`;
    content += `| Metric | Value |\n`;
    content += `|--------|-------|\n`;
    content += `| **Files Analyzed** | ${filesAnalyzed} (${codeFiles} code, ${testFiles} test, ${configFiles} config) |\n`;
    content += `| **Lines of Code** | ${totalLines.toLocaleString()} |\n`;
    content += `| **Project Size** | ${this.formatFileSize(totalSize)} |\n`;
    content += `| **Tokens per File** | ${tokensPerFile.toLocaleString()} |\n`;
    content += `| **Cost per File** | $${costPerFile} |\n`;
    content += `| **Tokens per Line** | ${(totalTokens / totalLines).toFixed(2)} |\n\n`;

    return content;
  }

  /**
   * Get rating emoji based on metric value and type
   */
  private getRatingEmoji(value: number, metricType: string): string {
    switch (metricType) {
      case 'duration':
        // Duration in seconds: <30s = excellent, <60s = good, <120s = ok, >=120s = slow
        if (value < 30) return '🚀';
        if (value < 60) return '✅';
        if (value < 120) return '⚠️';
        return '🐌';

      case 'confidence':
        // Confidence percentage: >=90 = excellent, >=80 = good, >=70 = ok, <70 = poor
        if (value >= 90) return '🌟';
        if (value >= 80) return '✅';
        if (value >= 70) return '⚠️';
        return '❌';

      case 'cost':
        // Cost in dollars: <$0.10 = excellent, <$0.50 = good, <$1.00 = ok, >=$1.00 = expensive
        if (value < 0.1) return '💚';
        if (value < 0.5) return '✅';
        if (value < 1.0) return '⚠️';
        return '💰';

      case 'speed':
        // Files per second: >=2.0 = excellent, >=1.0 = good, >=0.5 = ok, <0.5 = slow
        if (value >= 2.0) return '🚀';
        if (value >= 1.0) return '✅';
        if (value >= 0.5) return '⚠️';
        return '🐌';

      case 'tokenSpeed':
        // Tokens per second: >=1000 = excellent, >=500 = good, >=100 = ok, <100 = slow
        if (value >= 1000) return '🚀';
        if (value >= 500) return '✅';
        if (value >= 100) return '⚠️';
        return '🐌';

      default:
        return '📊';
    }
  }

  /**
   * Generate metadata file with generation configuration details
   */
  private generateMetadataFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
    generatedFiles: Set<string>,
  ): string {
    const nav = this.generateNavigation('metadata.md', options, generatedFiles);
    const { metadata } = output;

    let content = `# Documentation Generation Metadata\n\n`;

    content += `## Generator Information\n\n`;
    content += `- **Generator Version**: ${metadata.generatorVersion}\n`;
    content += `- **Generation Date**: ${output.timestamp.toISOString()}\n`;
    content += `- **Project Name**: ${output.projectName}\n`;
    content += `- **Generation Duration**: ${(metadata.generationDuration / 1000).toFixed(2)}s\n\n`;

    content += `## Configuration\n\n`;
    const config = metadata.configuration as Record<string, unknown>;
    if (config && Object.keys(config).length > 0) {
      content += `| Setting | Value |\n`;
      content += `|---------|-------|\n`;
      for (const [key, value] of Object.entries(config)) {
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        content += `| ${key} | ${displayValue} |\n`;
      }
      content += `\n`;
    } else {
      content += `Default configuration used.\n\n`;
    }

    content += `## Agents Executed\n\n`;
    if (metadata.agentsExecuted && metadata.agentsExecuted.length > 0) {
      content += `The following agents were executed to generate this documentation:\n\n`;
      metadata.agentsExecuted.forEach((agentName, index) => {
        content += `${index + 1}. **${agentName}**\n`;
      });
      content += `\n`;
    }

    content += `## Resource Usage\n\n`;
    content += `- **Total Tokens Used**: ${metadata.totalTokensUsed.toLocaleString()}\n`;

    // Calculate estimated cost (rough estimate based on typical pricing)
    const estimatedCost = (metadata.totalTokensUsed / 1_000_000) * 3; // $3 per million tokens
    content += `- **Estimated Cost**: ~$${estimatedCost.toFixed(4)}\n`;
    content += `- **Files Analyzed**: ${output.overview.statistics.totalFiles}\n`;
    content += `- **Total Size**: ${this.formatFileSize(output.overview.statistics.totalSize)}\n\n`;

    // Generation Performance Metrics Section
    content += this.generateGenerationMetricsSection(output, metadata);

    if (metadata.warnings && metadata.warnings.length > 0) {
      content += `## Warnings\n\n`;
      metadata.warnings.forEach((warning) => {
        content += `- ${warning}\n`;
      });
      content += `\n`;
    }

    // Agent Gap Analysis
    if (metadata.agentGaps && metadata.agentGaps.length > 0) {
      content += `## Agent Gap Analysis\n\n`;
      content += `This section shows identified gaps (missing information) for each agent. These gaps represent areas where the analysis could be enhanced with more information or deeper investigation.\n\n`;

      for (const gap of metadata.agentGaps) {
        const statusEmoji = gap.clarityScore >= 90 ? '✅' : gap.clarityScore >= 80 ? '⚠️' : '🔴';
        const statusText =
          gap.clarityScore >= 90
            ? 'Excellent'
            : gap.clarityScore >= 80
              ? 'Good'
              : gap.clarityScore >= 70
                ? 'Fair'
                : 'Needs Improvement';

        content += `### ${statusEmoji} ${gap.agentName}\n\n`;
        content += `- **Status**: ${statusText} (${gap.clarityScore.toFixed(1)}% clarity)\n`;
        content += `- **Gaps Identified**: ${gap.gapCount}\n\n`;

        if (gap.missingInformation.length > 0) {
          content += `**Missing Information**:\n\n`;
          gap.missingInformation.forEach((info, idx) => {
            content += `${idx + 1}. ${info}\n`;
          });
          content += `\n`;
        } else if (gap.clarityScore < 100) {
          content += `_Minor gaps exist but are non-blocking. Rerun with --depth deep for more comprehensive analysis._\n\n`;
        }

        content += `---\n\n`;
      }
    }

    content += nav;

    return content;
  }

  /**
   * Generate changelog file with version history
   */
  private generateChangelogFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): string {
    const date = output.timestamp.toISOString().split('T')[0];
    const config = output.metadata.configuration as { mode?: string; userPrompt?: string };
    const mode = config?.mode || 'full-generation';

    let content = `# Documentation Changelog\n\n`;
    content += `This file tracks changes and updates to the documentation over time.\n\n`;
    content += `---\n\n`;

    content += `## ${date}\n\n`;

    // Determine update type
    if (mode === 'incremental') {
      content += `### 🔄 Incremental Update\n\n`;
      if (config.userPrompt) {
        content += `**Focus Area**: ${config.userPrompt}\n\n`;
      }
    } else if (mode === 'refinement') {
      content += `### ✨ Refinement Update\n\n`;
      content += `Selected sections were regenerated based on quality evaluation.\n\n`;
    } else {
      content += `### 📝 Initial Documentation Generation\n\n`;
    }

    content += `**Changes**:\n\n`;
    content += `- Analyzed ${output.overview.statistics.totalFiles.toLocaleString()} files\n`;
    content += `- Primary language: ${output.overview.primaryLanguage}\n`;

    if (output.codeQuality.overallScore > 0) {
      content += `- Quality score: ${output.codeQuality.overallScore.toFixed(1)}/10\n`;
    }

    if (output.metadata.agentsExecuted.length > 0) {
      content += `- Agents executed: ${output.metadata.agentsExecuted.join(', ')}\n`;
    }

    content += `\n`;

    content += `**Statistics**:\n\n`;
    content += `- Total lines of code: ${output.overview.statistics.totalLines.toLocaleString()}\n`;
    content += `- Code files: ${output.overview.statistics.codeFiles.toLocaleString()}\n`;
    content += `- Test files: ${output.overview.statistics.testFiles.toLocaleString()}\n`;
    content += `- Duration: ${(output.metadata.generationDuration / 1000).toFixed(2)}s\n\n`;

    content += `---\n\n`;
    content += `_For generation configuration details, see [Metadata](./metadata.md)_\n\n`;

    if (options.includeMetadata) {
      content += this.generateMetadataFooter(output);
    }

    return content;
  }

  /**
   * Generate recommendations file
   */
  private generateRecommendationsFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
    generatedFiles: Set<string>,
  ): string {
    const nav = this.generateNavigation('recommendations.md', options, generatedFiles);
    let content = `# Recommendations\n\n`;

    if (output.codeQuality.improvements.length > 0) {
      content += `## Code Quality Improvements\n\n`;
      output.codeQuality.improvements.forEach((imp: any) => {
        content += `### ${imp.category}\n\n`;
        content += `**Priority**: ${imp.priority}\n\n`;
        content += `${imp.description}\n\n`;
        if (imp.impact) {
          content += `**Impact**: ${imp.impact}\n\n`;
        }
      });
    }

    if (output.patterns.recommendations.length > 0) {
      content += `## Pattern Recommendations\n\n`;
      output.patterns.recommendations.forEach((rec: string) => {
        content += `- ${rec}\n`;
      });
      content += `\n`;
    }

    content += nav;
    if (options.includeMetadata) {
      content += this.generateMetadataFooter(output);
    }

    return content;
  }

  /**
   * Generate code quality file
   */
  private generateCodeQualityFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
    generatedFiles: Set<string>,
  ): string {
    const nav = this.generateNavigation('code-quality.md', options, generatedFiles);
    const { codeQuality } = output;

    let content = `# Code Quality\n\n`;
    content += `**Overall Score**: ${codeQuality.overallScore.toFixed(1)}/10\n\n`;

    if (codeQuality.issues.length > 0) {
      content += `## Issues\n\n`;
      codeQuality.issues.forEach((issue: any) => {
        content += `### ${issue.severity}: ${issue.message}\n\n`;
        if (issue.file) {
          content += `**File**: \`${issue.file}\`\n`;
        }
        if (issue.line) {
          content += `**Line**: ${issue.line}\n`;
        }
        content += `\n`;
      });
    }

    if (codeQuality.improvements.length > 0) {
      content += `## Improvement Suggestions\n\n`;
      codeQuality.improvements.forEach((imp: any) => {
        content += `- ${imp.description}\n`;
      });
      content += `\n`;
    }

    content += nav;
    if (options.includeMetadata) {
      content += this.generateMetadataFooter(output);
    }

    return content;
  }

  /**
   * Generate metadata footer
   */
  private generateMetadataFooter(output: DocumentationOutput): string {
    const { metadata } = output;
    return `\n---\n\n_Generated by ${metadata.generatorVersion} on ${output.timestamp.toISOString()}_\n`;
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate Key Highlights section from agent analysis
   */
  private generateKeyHighlights(output: DocumentationOutput): string {
    const highlights: string[] = [];

    // Architecture highlights
    if (
      output.architecture.style &&
      output.architecture.style !== 'Unknown' &&
      output.architecture.style !== 'preserved'
    ) {
      highlights.push(`**Architecture**: ${output.architecture.style} architecture detected`);
    }

    if (output.architecture.patterns.length > 0) {
      const topPatterns = output.architecture.patterns.slice(0, 3).join(', ');
      highlights.push(`**Patterns**: Uses ${topPatterns}`);
    }

    // Dependency highlights
    if (output.dependencies.productionDeps.length > 0) {
      highlights.push(
        `**Dependencies**: ${output.dependencies.productionDeps.length} production dependencies`,
      );
    }

    // Code quality highlights
    if (output.codeQuality.overallScore > 0) {
      const qualityRating =
        output.codeQuality.overallScore >= 8
          ? 'Excellent'
          : output.codeQuality.overallScore >= 6
            ? 'Good'
            : output.codeQuality.overallScore >= 4
              ? 'Fair'
              : 'Needs Improvement';
      highlights.push(
        `**Code Quality**: ${qualityRating} (${output.codeQuality.overallScore.toFixed(1)}/10)`,
      );
    }

    // Security highlights
    if (output.dependencies.vulnerabilities.length > 0) {
      const critical = output.dependencies.vulnerabilities.filter(
        (v) => v.severity === 'critical',
      ).length;
      const high = output.dependencies.vulnerabilities.filter((v) => v.severity === 'high').length;
      if (critical > 0 || high > 0) {
        highlights.push(
          `**Security**: ⚠️ ${critical} critical, ${high} high severity vulnerabilities found`,
        );
      }
    }

    // Test coverage
    if (output.overview.statistics.testFiles > 0) {
      const testRatio = (
        (output.overview.statistics.testFiles / output.overview.statistics.codeFiles) *
        100
      ).toFixed(1);
      highlights.push(
        `**Testing**: ${output.overview.statistics.testFiles} test files (${testRatio}% ratio)`,
      );
    } else {
      highlights.push(`**Testing**: ⚠️ No test files detected`);
    }

    // Complexity highlights
    if (output.codeQuality.complexity.averageComplexity > 0) {
      const complexityRating =
        output.codeQuality.complexity.averageComplexity <= 5
          ? 'Low'
          : output.codeQuality.complexity.averageComplexity <= 10
            ? 'Moderate'
            : output.codeQuality.complexity.averageComplexity <= 20
              ? 'High'
              : 'Very High';
      highlights.push(
        `**Complexity**: ${complexityRating} (avg: ${output.codeQuality.complexity.averageComplexity.toFixed(1)})`,
      );
    }

    // Tech debt
    if (
      output.codeQuality.metrics.technicalDebt &&
      output.codeQuality.metrics.technicalDebt !== '0h'
    ) {
      highlights.push(`**Technical Debt**: ${output.codeQuality.metrics.technicalDebt}`);
    }

    // If no highlights found, return empty
    if (highlights.length === 0) {
      return '';
    }

    let content = `## 🎯 Key Highlights\n\n`;
    highlights.forEach((highlight) => {
      content += `- ${highlight}\n`;
    });
    content += `\n`;

    return content;
  }

  /**
   * Format and write incremental documentation updates
   * Merges agent files with existing documentation based on merge strategies
   */
  async formatIncremental(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions & { existingDocs: Map<string, string> },
  ): Promise<string[]> {
    const opts = {
      includeTOC: true,
      includeMetadata: true,
      includeNavigation: true,
      ...options,
    };

    // Ensure output directory exists
    await fs.mkdir(opts.outputDir, { recursive: true });

    const updatedFiles: string[] = [];

    // Process agent-generated files with merge strategies
    for (const [_agentName, section] of output.customSections) {
      const files = section.files || [];

      for (const file of files) {
        const filePath = path.join(opts.outputDir, file.filename);
        const existingContent = opts.existingDocs.get(file.filename);
        const mergeStrategy = file.mergeStrategy || 'replace';

        let finalContent: string;

        if (existingContent && mergeStrategy !== 'replace') {
          // Merge with existing content
          finalContent = await this.mergeContent(
            existingContent,
            file.content,
            mergeStrategy,
            file.sectionId,
          );
        } else {
          // Replace or create new
          finalContent = file.content;
        }

        await fs.writeFile(filePath, finalContent, 'utf-8');
        updatedFiles.push(file.filename);
      }
    }

    // Update orchestrator files (index, metadata, changelog)
    await this.updateIndexForIncremental(opts.outputDir, output, opts.existingDocs);
    await this.appendToChangelog(opts.outputDir, output);
    await this.updateMetadata(opts.outputDir, output);

    updatedFiles.push('index.md', 'changelog.md', 'metadata.md');

    return updatedFiles;
  }

  /**
   * Merge new content with existing content based on strategy
   */
  private async mergeContent(
    existingContent: string,
    newContent: string,
    strategy: 'append' | 'section-update',
    sectionId?: string,
  ): Promise<string> {
    if (strategy === 'append') {
      // Append as new section
      return `${existingContent}

---

## Update: ${new Date().toISOString()}

${newContent}`;
    }

    if (strategy === 'section-update' && sectionId) {
      // Replace specific section
      const sectionRegex = new RegExp(
        `(${sectionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(?=\\n#{1,2}\\s|$)`,
        'i',
      );

      if (sectionRegex.test(existingContent)) {
        return existingContent.replace(sectionRegex, `${sectionId}\n\n${newContent}\n`);
      }

      // Section not found, append
      return `${existingContent}\n\n${sectionId}\n\n${newContent}`;
    }

    // Default: append
    return `${existingContent}\n\n${newContent}`;
  }

  /**
   * Update index.md with new enhancements
   */
  private async updateIndexForIncremental(
    outputDir: string,
    output: DocumentationOutput,
    existingDocs: Map<string, string>,
  ): Promise<void> {
    const indexPath = path.join(outputDir, 'index.md');
    let indexContent = existingDocs.get('index.md') || '';

    if (!indexContent) {
      // No existing index, create new one
      const generatedFiles = new Set(Array.from(existingDocs.keys()));
      indexContent = this.generateIndexFile(output, { outputDir }, generatedFiles);
      await fs.writeFile(indexPath, indexContent, 'utf-8');
      return;
    }

    // Add link to new enhancement sections
    const enhancementLinks: string[] = [];
    for (const [_agentName, section] of output.customSections) {
      const files = section.files || [];
      for (const file of files) {
        enhancementLinks.push(`- [${file.title}](./${file.filename})`);
      }
    }

    if (enhancementLinks.length > 0) {
      const enhancementSection = `\n\n## Latest Updates\n\n${enhancementLinks.join('\n')}`;

      // Insert after main TOC
      const tocEndIndex = indexContent.indexOf('\n\n##');
      if (tocEndIndex !== -1) {
        indexContent =
          indexContent.substring(0, tocEndIndex) +
          enhancementSection +
          indexContent.substring(tocEndIndex);
      } else {
        indexContent += enhancementSection;
      }

      await fs.writeFile(indexPath, indexContent, 'utf-8');
    }
  }

  /**
   * Append entry to changelog.md
   */
  private async appendToChangelog(outputDir: string, output: DocumentationOutput): Promise<void> {
    const changelogPath = path.join(outputDir, 'changelog.md');
    const timestamp = new Date().toISOString().split('T')[0]; // Date only for readability
    const time = new Date().toISOString().split('T')[1].split('.')[0]; // Time HH:MM:SS
    const agentsExecuted = output.metadata.agentsExecuted.join(', ');
    const config = output.metadata.configuration as { mode?: string; userPrompt?: string };
    const mode = config.mode || 'generation';
    const userPrompt = config.userPrompt;

    // Build entry based on mode
    const entryType =
      mode === 'incremental'
        ? '🔄 Incremental Enhancement'
        : mode === 'refinement'
          ? '✨ Refinement Update'
          : '📝 Documentation Generated';

    let entryText = `### ${timestamp} at ${time}\n\n`;
    entryText += `- **Type**: ${entryType}\n`;
    if (userPrompt) {
      entryText += `- **Focus**: ${userPrompt}\n`;
    }
    entryText += `- **Agents**: ${agentsExecuted}\n`;
    entryText += `- **Duration**: ${Math.round(output.metadata.generationDuration / 1000)}s\n`;
    entryText += `- **Tokens**: ${output.metadata.totalTokensUsed.toLocaleString()}\n\n`;

    let changelogContent: string;
    try {
      changelogContent = await fs.readFile(changelogPath, 'utf-8');
      // Insert after "# Changelog" header
      const headerMatch = changelogContent.match(/^#\s+(?:Documentation\s+)?Changelog\s*\n+/i);
      if (headerMatch) {
        const insertPos = headerMatch.index! + headerMatch[0].length;
        changelogContent =
          changelogContent.substring(0, insertPos) +
          entryText +
          changelogContent.substring(insertPos);
      } else {
        // No header found, prepend
        changelogContent = `# Changelog\n\n${entryText}${changelogContent}`;
      }
    } catch {
      // No changelog exists, create new
      changelogContent = `# Changelog\n\n${entryText}`;
    }

    await fs.writeFile(changelogPath, changelogContent, 'utf-8');
  }

  /**
   * Update metadata.md with latest generation info
   */
  private async updateMetadata(outputDir: string, output: DocumentationOutput): Promise<void> {
    const metadataPath = path.join(outputDir, 'metadata.md');
    const generatedFiles = new Set<string>();
    const content = this.generateMetadataFile(output, { outputDir }, generatedFiles);
    await fs.writeFile(metadataPath, content, 'utf-8');
  }
}
