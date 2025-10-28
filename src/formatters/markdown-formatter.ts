import type { DocumentationOutput } from '../types/output.types';

/**
 * Formatter options
 */
export interface MarkdownFormatterOptions {
  /** Include table of contents */
  includeTOC?: boolean;

  /** Maximum heading depth for TOC */
  tocDepth?: number;

  /** Include metadata footer */
  includeMetadata?: boolean;

  /** Custom template variables */
  templateVars?: Record<string, string>;
}

/**
 * Formats documentation output as Markdown
 */
export class MarkdownFormatter {
  /**
   * Format documentation output as Markdown string
   */
  format(output: DocumentationOutput, options: MarkdownFormatterOptions = {}): string {
    const opts = {
      includeTOC: true,
      tocDepth: 3,
      includeMetadata: true,
      ...options,
    };

    const parts: string[] = [];

    // Title
    parts.push(`# ${output.projectName} - Architecture Documentation\n`);
    parts.push(`**Generated**: ${output.timestamp.toISOString()}\n`);
    parts.push(`**Version**: ${output.version}\n\n`);

    // Overview Section
    parts.push(`## Overview\n`);
    parts.push(`${output.overview.description}\n\n`);
    parts.push(`### Project Statistics\n`);
    parts.push(`- **Primary Language**: ${output.overview.primaryLanguage}\n`);
    parts.push(`- **Languages**: ${output.overview.languages.join(', ')}\n`);
    parts.push(`- **Total Files**: ${output.overview.statistics.totalFiles}\n`);
    parts.push(`- **Total Lines**: ${output.overview.statistics.totalLines}\n`);
    parts.push(`- **Frameworks**: ${output.overview.frameworks.join(', ') || 'None detected'}\n\n`);

    // Architecture Section
    parts.push(`## Architecture\n`);
    parts.push(`**Style**: ${output.architecture.style}\n`);
    parts.push(`**Data Flow**: ${output.architecture.dataFlow}\n\n`);
    if (output.architecture.components.length > 0) {
      parts.push(`### Components\n`);
      output.architecture.components.forEach((component) => {
        parts.push(`- **${component.name}** (${component.type}): ${component.description}\n`);
      });
      parts.push('\n');
    }

    // File Structure Section
    parts.push(`## File Structure\n`);
    parts.push(`**Root**: \`${output.fileStructure.rootStructure.path}\`\n`);
    parts.push(`**Organization Strategy**: ${output.fileStructure.organizationStrategy}\n\n`);

    // Dependencies Section
    parts.push(`## Dependencies\n`);
    parts.push(`**Production Dependencies**: ${output.dependencies.productionDeps.length}\n`);
    parts.push(`**Development Dependencies**: ${output.dependencies.developmentDeps.length}\n\n`);

    // Code Quality Section
    parts.push(`## Code Quality\n`);
    parts.push(`**Overall Score**: ${output.codeQuality.overallScore}/10\n`);
    parts.push(`**Complexity**: Average ${output.codeQuality.complexity.averageComplexity}\n\n`);

    // Custom Sections (Agent Results)
    if (output.customSections && Object.keys(output.customSections).length > 0) {
      parts.push(`## Agent Analysis\n\n`);
      parts.push(`This section contains detailed analysis from specialized agents.\n\n`);

      for (const [agentName, agentResult] of Object.entries(output.customSections)) {
        // Agent header
        parts.push(`### ${this.formatAgentName(agentName)}\n\n`);

        // Agent metadata
        parts.push(`**Status**: ${agentResult.status}\n`);
        parts.push(`**Confidence**: ${(agentResult.confidence * 100).toFixed(0)}%\n\n`);

        // Agent summary
        if (agentResult.summary) {
          parts.push(`${agentResult.summary}\n\n`);
        }

        // Agent markdown content
        if (agentResult.markdown) {
          parts.push(`${agentResult.markdown}\n\n`);
        }

        // Warnings for this agent
        if (agentResult.warnings && agentResult.warnings.length > 0) {
          parts.push(`#### Warnings\n\n`);
          agentResult.warnings.forEach((warning: string) => {
            parts.push(`- ⚠️ ${warning}\n`);
          });
          parts.push('\n');
        }
      }
    }

    // Metadata footer
    if (opts.includeMetadata) {
      parts.push(this.generateMetadataFooter(output));
    }

    return parts.join('');
  }

  /**
   * Format agent name for display (e.g., "file-structure" -> "File Structure")
   */
  private formatAgentName(name: string): string {
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate metadata footer
   */
  private generateMetadataFooter(output: DocumentationOutput): string {
    const { metadata } = output;
    if (!metadata) return '';

    const lines: string[] = [
      '---\n',
      '## Generation Metadata\n\n',
      '| Property | Value |\n',
      '|----------|-------|\n',
    ];

    lines.push(`| Generator Version | ${metadata.generatorVersion} |\n`);
    lines.push(`| Generation Duration | ${(metadata.generationDuration / 1000).toFixed(2)}s |\n`);
    lines.push(`| Total Tokens | ${metadata.totalTokensUsed} |\n`);
    lines.push(`| Agents Executed | ${metadata.agentsExecuted.join(', ')} |\n`);

    if (metadata.warnings.length > 0) {
      lines.push(`| Warnings | ${metadata.warnings.length} |\n`);
    }

    lines.push('\n');
    return lines.join('');
  }

  /**
   * Export to file
   */
  async exportToFile(
    output: DocumentationOutput,
    filePath: string,
    options?: MarkdownFormatterOptions,
  ): Promise<void> {
    const fs = await import('fs/promises');
    const content = this.format(output, options);
    await fs.writeFile(filePath, content, 'utf-8');
  }
}
