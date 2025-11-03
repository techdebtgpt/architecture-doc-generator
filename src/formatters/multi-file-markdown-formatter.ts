import * as path from 'path';
import * as fs from 'fs/promises';
import type {
  DocumentationOutput,
  DirectoryDescription,
  ComponentDescription,
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

    // STEP 1: Write agent-generated files (agents own their file generation)
    const agentFiles = await this.writeAgentFiles(output, opts);
    generatedFiles.push(...agentFiles);

    // STEP 2: Write orchestrator-owned files (generic/cross-cutting)
    const orchestratorFiles = await this.writeOrchestratorFiles(output, opts);
    generatedFiles.push(...orchestratorFiles);

    return generatedFiles;
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

      // Use new files array if available, fallback to markdown (backwards compat)
      const files = customSection.files || [];
      if (files.length > 0) {
        // NEW: Agent provides its own files
        for (const file of files) {
          const filePath = path.join(options.outputDir, file.filename);
          await fs.writeFile(filePath, file.content, 'utf-8');
          generatedFiles.push(filePath);
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
        await fs.writeFile(filePath, customSection.markdown, 'utf-8');
        generatedFiles.push(filePath);
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
    content += `- **Total Files**: ${overview.statistics.totalFiles.toLocaleString()}\n`;
    content += `- **Total Lines**: ${overview.statistics.totalLines.toLocaleString()}\n`;
    content += `- **Code Files**: ${overview.statistics.codeFiles.toLocaleString()}\n`;
    content += `- **Test Files**: ${overview.statistics.testFiles.toLocaleString()}\n`;
    content += `- **Quality Score**: ${codeQuality.overallScore.toFixed(1)}/10\n\n`;

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

    // Recommendations (only if there are recommendations)
    if (generatedFiles.has('recommendations.md')) {
      content += `${docIndex++}. **[Recommendations](./recommendations.md)** - Improvement suggestions and best practices\n`;
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
   * Generate navigation links
   */
  private generateNavigation(
    _currentFile: string,
    options: MultiFileFormatterOptions,
    _generatedFiles: Set<string>,
  ): string {
    if (!options.includeNavigation) {
      return '';
    }

    // No hardcoded file list - navigation is contextual to current file
    let nav = '\n---\n\n';
    nav += `[← Back to Index](./index.md)\n`;
    return nav;
  }

  /**
   * Generate metadata file
   */
  private generateMetadataFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
    generatedFiles: Set<string>,
  ): string {
    const nav = this.generateNavigation('metadata.md', options, generatedFiles);
    const { metadata } = output;

    let content = `# Metadata\n\n`;
    content += `## Generation Information\n\n`;
    content += `- **Generator Version**: ${metadata.generatorVersion}\n`;
    content += `- **Generated**: ${output.timestamp.toISOString()}\n`;
    content += `- **Project**: ${output.projectName}\n\n`;

    content += nav;
    if (options.includeMetadata) {
      content += this.generateMetadataFooter(output);
    }

    return content;
  }

  /**
   * Generate changelog file
   */
  private generateChangelogFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): string {
    let content = `# Changelog\n\n`;
    content += `## ${output.timestamp.toISOString().split('T')[0]}\n\n`;
    content += `- Documentation generated\n`;
    content += `- Analyzed ${output.overview.statistics.totalFiles} files\n`;
    content += `- Quality score: ${output.codeQuality.overallScore.toFixed(1)}/10\n\n`;

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
