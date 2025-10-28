import * as path from 'path';
import * as fs from 'fs/promises';
import type {
  DocumentationOutput,
  DirectoryDescription,
  DependencyInfo,
  PatternInstance,
  QualityIssue,
  ImprovementSuggestion,
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

    // Generate index file
    const indexPath = path.join(opts.outputDir, 'index.md');
    await fs.writeFile(indexPath, this.generateIndexFile(output, opts), 'utf-8');
    generatedFiles.push(indexPath);

    // Generate architecture file (only if there's data)
    if (output.architecture.components.length > 0) {
      const archPath = path.join(opts.outputDir, 'architecture.md');
      await fs.writeFile(archPath, this.generateArchitectureFile(output, opts), 'utf-8');
      generatedFiles.push(archPath);
    }

    // Generate file structure file
    const structurePath = path.join(opts.outputDir, 'file-structure.md');
    const fileStructureAgent = (output.customSections as any)['file-structure'];
    if (fileStructureAgent?.markdown) {
      // Use agent's markdown if available
      await fs.writeFile(structurePath, fileStructureAgent.markdown, 'utf-8');
    } else {
      // Fallback to generated format
      await fs.writeFile(structurePath, this.generateFileStructureFile(output, opts), 'utf-8');
    }
    generatedFiles.push(structurePath);

    // Generate dependencies file
    const depsPath = path.join(opts.outputDir, 'dependencies.md');
    const dependencyAgent = (output.customSections as any)['dependency-analyzer'];
    if (dependencyAgent?.markdown) {
      await fs.writeFile(depsPath, dependencyAgent.markdown, 'utf-8');
    } else {
      await fs.writeFile(depsPath, this.generateDependenciesFile(output, opts), 'utf-8');
    }
    generatedFiles.push(depsPath);

    // Generate patterns file
    const patternsPath = path.join(opts.outputDir, 'patterns.md');
    const patternAgent = (output.customSections as any)['pattern-detector'];
    if (patternAgent?.markdown) {
      await fs.writeFile(patternsPath, patternAgent.markdown, 'utf-8');
    } else {
      await fs.writeFile(patternsPath, this.generatePatternsFile(output, opts), 'utf-8');
    }
    generatedFiles.push(patternsPath);

    // Generate code quality file (only if there's actual data)
    if (
      output.codeQuality.improvements.length > 0 ||
      output.codeQuality.issues.length > 0 ||
      output.codeQuality.overallScore > 0
    ) {
      const qualityPath = path.join(opts.outputDir, 'code-quality.md');
      await fs.writeFile(qualityPath, this.generateCodeQualityFile(output, opts), 'utf-8');
      generatedFiles.push(qualityPath);
    }

    // Generate recommendations file (only if there are recommendations)
    if (output.codeQuality.improvements.length > 0 || output.patterns.recommendations.length > 0) {
      const recsPath = path.join(opts.outputDir, 'recommendations.md');
      await fs.writeFile(recsPath, this.generateRecommendationsFile(output, opts), 'utf-8');
      generatedFiles.push(recsPath);
    }

    // Generate flows file (if flow-visualization agent ran)
    const flowSection = output.customSections.get
      ? output.customSections.get('flow-visualization')
      : (output.customSections as any)['flow-visualization'];
    if (flowSection) {
      const flowsPath = path.join(opts.outputDir, 'flows.md');
      await fs.writeFile(flowsPath, this.generateFlowsFile(flowSection, output, opts), 'utf-8');
      generatedFiles.push(flowsPath);
    }

    // Generate schemas file (if schema-generator agent ran)
    const schemaSection = output.customSections.get
      ? output.customSections.get('schema-generator')
      : (output.customSections as any)['schema-generator'];
    if (schemaSection) {
      const schemasPath = path.join(opts.outputDir, 'schemas.md');
      await fs.writeFile(
        schemasPath,
        this.generateSchemasFile(schemaSection, output, opts),
        'utf-8',
      );
      generatedFiles.push(schemasPath);
    }

    // Generate metadata file
    const metaPath = path.join(opts.outputDir, 'metadata.md');
    await fs.writeFile(metaPath, this.generateMetadataFile(output, opts), 'utf-8');
    generatedFiles.push(metaPath);

    // Generate agent-specific files
    const agentFiles = await this.generateAgentFiles(output, opts);
    generatedFiles.push(...agentFiles);

    return generatedFiles;
  }

  /**
   * Generate index file with navigation and overview
   */
  private generateIndexFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): string {
    const nav = this.generateNavigation('index.md', options);
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
    if (architecture.components.length > 0) {
      content += `${docIndex++}. **[Architecture](./architecture.md)** - System architecture, components, and patterns\n`;
    }

    // File Structure (always generated)
    content += `${docIndex++}. **[File Structure](./file-structure.md)** - Project organization and directory structure\n`;

    // Dependencies (always generated)
    content += `${docIndex++}. **[Dependencies](./dependencies.md)** - External dependencies and their relationships\n`;

    // Patterns (always generated)
    content += `${docIndex++}. **[Patterns](./patterns.md)** - Design patterns and architectural patterns detected\n`;

    // Code Quality (only if there's data)
    if (
      output.codeQuality.improvements.length > 0 ||
      output.codeQuality.issues.length > 0 ||
      output.codeQuality.overallScore > 0
    ) {
      content += `${docIndex++}. **[Code Quality](./code-quality.md)** - Quality metrics, issues, and complexity analysis\n`;
    }

    // Recommendations (only if there are recommendations)
    if (output.codeQuality.improvements.length > 0 || output.patterns.recommendations.length > 0) {
      content += `${docIndex++}. **[Recommendations](./recommendations.md)** - Improvement suggestions and best practices\n`;
    }

    // Add flows and schemas if they exist
    const flowSection = output.customSections.get
      ? output.customSections.get('flow-visualization')
      : (output.customSections as Record<string, any>)['flow-visualization'];
    const schemaSection = output.customSections.get
      ? output.customSections.get('schema-generator')
      : (output.customSections as Record<string, any>)['schema-generator'];

    if (flowSection) {
      content += `${docIndex++}. **[Flow Visualizations](./flows.md)** - Data flows, process flows, and component interactions\n`;
    }
    if (schemaSection) {
      content += `${docIndex++}. **[Schema Documentation](./schemas.md)** - Database schemas, API schemas, and type definitions\n`;
    }

    // Metadata (always generated)
    content += `${docIndex++}. **[Metadata](./metadata.md)** - Generation information and configuration\n\n`;

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
   * Generate architecture documentation file
   */
  private generateArchitectureFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): string {
    const nav = this.generateNavigation('architecture.md', options);
    const { architecture } = output;

    let content = `# Architecture\n\n`;
    content += `[← Back to Index](./index.md) | [Next: File Structure →](./file-structure.md)\n\n`;
    content += `---\n\n`;

    content += `## Architecture Style\n\n`;
    content += `**Style**: ${architecture.style}\n\n`;

    if (architecture.patterns.length > 0) {
      content += `**Architecture Patterns**: ${architecture.patterns.join(', ')}\n\n`;
    }

    if (architecture.designPrinciples.length > 0) {
      content += `## Design Principles\n\n`;
      architecture.designPrinciples.forEach((principle: string) => {
        content += `- ${principle}\n`;
      });
      content += `\n`;
    }

    if (architecture.components.length > 0) {
      content += `## System Components\n\n`;
      architecture.components.forEach((comp: ComponentDescription) => {
        content += `### ${comp.name}\n\n`;
        content += `**Type**: ${comp.type}\n\n`;
        content += `${comp.description}\n\n`;

        if (comp.responsibilities.length > 0) {
          content += `**Responsibilities**:\n`;
          comp.responsibilities.forEach((resp: string) => {
            content += `- ${resp}\n`;
          });
          content += `\n`;
        }

        if (comp.dependencies.length > 0) {
          content += `**Dependencies**: ${comp.dependencies.join(', ')}\n\n`;
        }
      });
    }

    if (architecture.dataFlow) {
      content += `## Data Flow\n\n`;
      content += `${architecture.dataFlow}\n\n`;
    }

    if (architecture.diagram) {
      content += `## Architecture Diagram\n\n`;
      content += `\`\`\`mermaid\n${architecture.diagram}\n\`\`\`\n\n`;
    }

    content += nav;
    if (options.includeMetadata) {
      content += this.generateMetadataFooter(output);
    }

    return content;
  }

  /**
   * Generate file structure documentation file
   */
  private generateFileStructureFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): string {
    const nav = this.generateNavigation('file-structure.md', options);
    const { fileStructure } = output;

    let content = `# File Structure\n\n`;
    content += `[← Back: Architecture](./architecture.md) | [Next: Dependencies →](./dependencies.md)\n\n`;
    content += `---\n\n`;

    content += `## Organization Strategy\n\n`;
    content += `${fileStructure.organizationStrategy}\n\n`;

    if (fileStructure.namingConventions.length > 0) {
      content += `## Naming Conventions\n\n`;
      fileStructure.namingConventions.forEach((convention: string) => {
        content += `- ${convention}\n`;
      });
      content += `\n`;
    }

    content += `## Directory Structure\n\n`;
    content += `\`\`\`\n`;
    content += this.renderDirectoryTree(fileStructure.rootStructure, 0, 4);
    content += `\`\`\`\n\n`;

    if (fileStructure.keyDirectories.size > 0) {
      content += `## Key Directories\n\n`;
      for (const [dirPath, purpose] of fileStructure.keyDirectories.entries()) {
        content += `### \`${dirPath}\`\n\n`;
        content += `${purpose}\n\n`;
      }
    }

    if (fileStructure.diagram) {
      content += `## Structure Diagram\n\n`;
      content += `\`\`\`mermaid\n${fileStructure.diagram}\n\`\`\`\n\n`;
    }

    content += nav;
    if (options.includeMetadata) {
      content += this.generateMetadataFooter(output);
    }

    return content;
  }

  /**
   * Generate dependencies documentation file
   */
  private generateDependenciesFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): string {
    const nav = this.generateNavigation('dependencies.md', options);
    const { dependencies } = output;

    let content = `# Dependencies\n\n`;
    content += `[← Back: File Structure](./file-structure.md) | [Next: Patterns →](./patterns.md)\n\n`;
    content += `---\n\n`;

    if (dependencies.productionDeps.length > 0) {
      content += `## Production Dependencies\n\n`;
      content += `Total: ${dependencies.productionDeps.length}\n\n`;
      content += `| Package | Version | License | Description |\n`;
      content += `|---------|---------|---------|-------------|\n`;

      dependencies.productionDeps.slice(0, 50).forEach((dep: DependencyInfo) => {
        const desc =
          dep.description.length > 60 ? dep.description.substring(0, 57) + '...' : dep.description;
        content += `| ${dep.name} | ${dep.version} | ${dep.license} | ${desc} |\n`;
      });

      if (dependencies.productionDeps.length > 50) {
        content += `\n_Showing first 50 of ${dependencies.productionDeps.length} production dependencies._\n`;
      }
      content += `\n`;
    }

    if (dependencies.developmentDeps.length > 0) {
      content += `## Development Dependencies\n\n`;
      content += `Total: ${dependencies.developmentDeps.length}\n\n`;
      content += `| Package | Version | License | Description |\n`;
      content += `|---------|---------|---------|-------------|\n`;

      dependencies.developmentDeps.slice(0, 30).forEach((dep: DependencyInfo) => {
        const desc =
          dep.description.length > 60 ? dep.description.substring(0, 57) + '...' : dep.description;
        content += `| ${dep.name} | ${dep.version} | ${dep.license} | ${desc} |\n`;
      });

      if (dependencies.developmentDeps.length > 30) {
        content += `\n_Showing first 30 of ${dependencies.developmentDeps.length} development dependencies._\n`;
      }
      content += `\n`;
    }

    if (dependencies.outdatedDeps.length > 0) {
      content += `## Outdated Dependencies\n\n`;
      content += `| Package | Current | Latest | License |\n`;
      content += `|---------|---------|--------|----------|\n`;
      dependencies.outdatedDeps.forEach((dep: DependencyInfo) => {
        content += `| ${dep.name} | ${dep.version} | ${dep.latestVersion || 'N/A'} | ${dep.license} |\n`;
      });
      content += `\n`;
    }

    if (dependencies.vulnerabilities.length > 0) {
      content += `## Security Vulnerabilities\n\n`;
      dependencies.vulnerabilities.forEach((vuln) => {
        content += `### ⚠️ ${vuln.dependency} - ${vuln.severity.toUpperCase()}\n\n`;
        content += `${vuln.description}\n\n`;
        content += `**Recommendation**: ${vuln.recommendation}\n\n`;
      });
    }

    if (dependencies.insights.length > 0) {
      content += `## Insights\n\n`;
      dependencies.insights.forEach((insight: string) => {
        content += `- ${insight}\n`;
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
   * Generate patterns documentation file
   */
  private generatePatternsFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): string {
    const nav = this.generateNavigation('patterns.md', options);
    const { patterns } = output;

    let content = `# Design Patterns\n\n`;
    content += `[← Back: Dependencies](./dependencies.md) | [Next: Code Quality →](./code-quality.md)\n\n`;
    content += `---\n\n`;

    if (patterns.designPatterns.length > 0) {
      content += `## Design Patterns\n\n`;
      patterns.designPatterns.forEach((pattern: PatternInstance) => {
        content += `### ${pattern.name}\n\n`;
        content += `**Type**: ${pattern.type}\n\n`;
        content += `**Confidence**: ${(pattern.confidence * 100).toFixed(0)}%\n\n`;
        content += `${pattern.description}\n\n`;

        if (pattern.locations.length > 0) {
          content += `**Locations**: ${pattern.locations.slice(0, 5).join(', ')}`;
          if (pattern.locations.length > 5) {
            content += ` (and ${pattern.locations.length - 5} more)`;
          }
          content += `\n\n`;
        }

        if (pattern.examples.length > 0 && pattern.examples[0]) {
          content += `**Example**:\n\`\`\`typescript\n${pattern.examples[0]}\n\`\`\`\n\n`;
        }
      });
    }

    if (patterns.architecturalPatterns.length > 0) {
      content += `## Architectural Patterns\n\n`;
      patterns.architecturalPatterns.forEach((pattern: PatternInstance) => {
        content += `### ${pattern.name}\n\n`;
        content += `${pattern.description}\n\n`;
        if (pattern.locations.length > 0) {
          content += `**Used in**: ${pattern.locations.join(', ')}\n\n`;
        }
      });
    }

    if (patterns.codePatterns.length > 0) {
      content += `## Code Patterns\n\n`;
      patterns.codePatterns.forEach((pattern: PatternInstance) => {
        content += `- **${pattern.name}**: ${pattern.description}\n`;
      });
      content += `\n`;
    }

    if (patterns.antiPatterns.length > 0) {
      content += `## Anti-Patterns Detected\n\n`;
      patterns.antiPatterns.forEach((pattern: PatternInstance) => {
        content += `### ⚠️ ${pattern.name}\n\n`;
        content += `${pattern.description}\n\n`;
        if (pattern.locations.length > 0) {
          content += `**Found in**: ${pattern.locations.join(', ')}\n\n`;
        }
      });
    }

    if (patterns.recommendations.length > 0) {
      content += `## Pattern Recommendations\n\n`;
      patterns.recommendations.forEach((rec: string) => {
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
   * Generate code quality documentation file
   */
  private generateCodeQualityFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): string {
    const nav = this.generateNavigation('code-quality.md', options);
    const { codeQuality } = output;

    let content = `# Code Quality\n\n`;
    content += `[← Back: Patterns](./patterns.md) | [Next: Recommendations →](./recommendations.md)\n\n`;
    content += `---\n\n`;

    content += `## Overall Quality Score\n\n`;
    content += `**Score**: ${codeQuality.overallScore.toFixed(1)}/10\n\n`;

    const { metrics } = codeQuality;
    content += `## Quality Metrics\n\n`;
    content += `| Metric | Score |\n`;
    content += `|--------|-------|\n`;
    content += `| Maintainability | ${metrics.maintainability.toFixed(1)}/10 |\n`;
    content += `| Reliability | ${metrics.reliability.toFixed(1)}/10 |\n`;
    content += `| Security | ${metrics.security.toFixed(1)}/10 |\n`;
    if (metrics.testCoverage !== undefined) {
      content += `| Test Coverage | ${metrics.testCoverage.toFixed(1)}% |\n`;
    }
    content += `| Code Smells | ${metrics.codeSmells} |\n`;
    content += `| Technical Debt | ${metrics.technicalDebt} |\n\n`;

    if (codeQuality.complexity.highComplexityFiles.length > 0) {
      content += `## Complexity Analysis\n\n`;
      content += `**Average Complexity**: ${codeQuality.complexity.averageComplexity.toFixed(2)}\n\n`;
      content += `### High Complexity Files\n\n`;
      content += `| File | Complexity | Functions | Recommendation |\n`;
      content += `|------|------------|-----------|----------------|\n`;
      codeQuality.complexity.highComplexityFiles.forEach((file) => {
        const fileName = file.file.length > 40 ? '...' + file.file.slice(-37) : file.file;
        const rec =
          file.recommendation.length > 50
            ? file.recommendation.substring(0, 47) + '...'
            : file.recommendation;
        content += `| ${fileName} | ${file.complexity.toFixed(1)} | ${file.functions} | ${rec} |\n`;
      });
      content += `\n`;
    }

    if (codeQuality.issues.length > 0) {
      content += `## Issues Found\n\n`;

      const criticalIssues = codeQuality.issues.filter(
        (i: QualityIssue) => i.severity === 'critical',
      );
      const majorIssues = codeQuality.issues.filter((i: QualityIssue) => i.severity === 'major');
      const minorIssues = codeQuality.issues.filter((i: QualityIssue) => i.severity === 'minor');

      if (criticalIssues.length > 0) {
        content += `### 🔴 Critical Issues (${criticalIssues.length})\n\n`;
        criticalIssues.slice(0, 10).forEach((issue: QualityIssue) => {
          content += `- **${issue.type}** in \`${issue.file}\`${issue.line ? `:${issue.line}` : ''}\n`;
          content += `  ${issue.description}\n`;
          content += `  _Suggestion: ${issue.suggestion}_\n\n`;
        });
      }

      if (majorIssues.length > 0) {
        content += `### 🟡 Major Issues (${majorIssues.length})\n\n`;
        majorIssues.slice(0, 10).forEach((issue: QualityIssue) => {
          content += `- **${issue.type}** in \`${issue.file}\`${issue.line ? `:${issue.line}` : ''}\n`;
          content += `  ${issue.description}\n\n`;
        });
      }

      if (minorIssues.length > 0) {
        content += `### 🔵 Minor Issues (${minorIssues.length})\n\n`;
        content += `_${minorIssues.length} minor issues detected. Review code quality report for details._\n\n`;
      }
    }

    if (codeQuality.bestPractices.length > 0) {
      content += `## Best Practices Observed\n\n`;
      codeQuality.bestPractices.forEach((practice: string) => {
        content += `- ✅ ${practice}\n`;
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
   * Generate recommendations documentation file
   */
  private generateRecommendationsFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): string {
    const nav = this.generateNavigation('recommendations.md', options);
    const { codeQuality, patterns, dependencies } = output;

    let content = `# Recommendations\n\n`;
    content += `[← Back: Code Quality](./code-quality.md) | [Next: Metadata →](./metadata.md)\n\n`;
    content += `---\n\n`;

    content += `## Improvement Suggestions\n\n`;

    if (codeQuality.improvements.length > 0) {
      const highPriority = codeQuality.improvements.filter(
        (i: ImprovementSuggestion) => i.priority === 'high',
      );
      const mediumPriority = codeQuality.improvements.filter(
        (i: ImprovementSuggestion) => i.priority === 'medium',
      );
      const lowPriority = codeQuality.improvements.filter(
        (i: ImprovementSuggestion) => i.priority === 'low',
      );

      if (highPriority.length > 0) {
        content += `### 🔴 High Priority\n\n`;
        highPriority.forEach((imp: ImprovementSuggestion) => {
          content += `#### ${imp.category}\n\n`;
          content += `${imp.description}\n\n`;
          content += `- **Impact**: ${imp.impact}\n`;
          content += `- **Effort**: ${imp.effort}\n\n`;
        });
      }

      if (mediumPriority.length > 0) {
        content += `### 🟡 Medium Priority\n\n`;
        mediumPriority.forEach((imp: ImprovementSuggestion) => {
          content += `#### ${imp.category}\n\n`;
          content += `${imp.description}\n\n`;
          content += `- **Impact**: ${imp.impact}\n`;
          content += `- **Effort**: ${imp.effort}\n\n`;
        });
      }

      if (lowPriority.length > 0) {
        content += `### 🔵 Low Priority\n\n`;
        lowPriority.forEach((imp: ImprovementSuggestion) => {
          content += `- **${imp.category}**: ${imp.description}\n`;
        });
        content += `\n`;
      }
    }

    if (patterns.recommendations.length > 0) {
      content += `## Pattern Recommendations\n\n`;
      patterns.recommendations.forEach((rec: string) => {
        content += `- ${rec}\n`;
      });
      content += `\n`;
    }

    if (dependencies.insights.length > 0) {
      content += `## Dependency Insights\n\n`;
      dependencies.insights.forEach((insight: string) => {
        content += `- ${insight}\n`;
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
   * Generate flows documentation file
   */
  private generateFlowsFile(
    flowSection: any,
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): string {
    let content = `# Flow Visualizations\n\n`;
    content += `[← Back: Recommendations](./recommendations.md) | [Next: Schemas →](./schemas.md)\n\n`;
    content += `---\n\n`;

    content += flowSection.content;
    content += `\n`;

    if (options.includeMetadata) {
      content += this.generateMetadataFooter(output);
    }

    return content;
  }

  /**
   * Generate schemas documentation file
   */
  private generateSchemasFile(
    schemaSection: any,
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): string {
    let content = `# Schema Documentation\n\n`;
    content += `[← Back: Flows](./flows.md) | [Next: Metadata →](./metadata.md)\n\n`;
    content += `---\n\n`;

    content += schemaSection.content;
    content += `\n`;

    if (options.includeMetadata) {
      content += this.generateMetadataFooter(output);
    }

    return content;
  }

  /**
   * Generate metadata documentation file
   */
  private generateMetadataFile(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): string {
    const nav = this.generateNavigation('metadata.md', options);
    const { metadata } = output;

    let content = `# Generation Metadata\n\n`;
    content += `[← Back: Recommendations](./recommendations.md) | [Back to Index →](./index.md)\n\n`;
    content += `---\n\n`;

    content += `## Generation Info\n\n`;
    content += `- **Generator Version**: ${metadata.generatorVersion}\n`;
    content += `- **Generated**: ${output.timestamp.toISOString()}\n`;
    content += `- **Duration**: ${(metadata.generationDuration / 1000).toFixed(2)}s\n`;
    content += `- **Total Tokens**: ${metadata.totalTokensUsed.toLocaleString()}\n\n`;

    content += `## Agents Executed\n\n`;
    metadata.agentsExecuted.forEach((agent: string) => {
      content += `- ${agent}\n`;
    });
    content += `\n`;

    if (Object.keys(metadata.configuration).length > 0) {
      content += `## Configuration\n\n`;
      content += `\`\`\`json\n${JSON.stringify(metadata.configuration, null, 2)}\n\`\`\`\n\n`;
    }

    if (metadata.warnings.length > 0) {
      content += `## Warnings\n\n`;
      metadata.warnings.forEach((warning: string) => {
        content += `- ⚠️ ${warning}\n`;
      });
      content += `\n`;
    }

    content += nav;

    return content;
  }

  /**
   * Generate agent-specific files from custom sections
   */
  private async generateAgentFiles(
    output: DocumentationOutput,
    options: MultiFileFormatterOptions,
  ): Promise<string[]> {
    const generatedFiles: string[] = [];

    // Handle both Map and plain object for customSections
    const sectionsIterator =
      output.customSections instanceof Map
        ? output.customSections.entries()
        : Object.entries(output.customSections as Record<string, any>);

    for (const [agentName, section] of sectionsIterator) {
      const customSection = section as {
        title: string;
        content: string;
        metadata: Record<string, unknown>;
      };

      const fileName = `${agentName}.md`;
      const filePath = path.join(options.outputDir, fileName);

      let content = `# ${customSection.title}\n\n`;
      content += `[← Back to Index](./index.md)\n\n`;
      content += `---\n\n`;
      content += `${customSection.content}\n\n`;

      if (Object.keys(customSection.metadata || {}).length > 0) {
        content += `## Metadata\n\n`;
        content += `\`\`\`json\n${JSON.stringify(customSection.metadata, null, 2)}\n\`\`\`\n\n`;
      }

      if (options.includeMetadata) {
        content += this.generateMetadataFooter(output);
      }

      await fs.writeFile(filePath, content, 'utf-8');
      generatedFiles.push(filePath);
    }

    return generatedFiles;
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
  private generateNavigation(currentFile: string, options: MultiFileFormatterOptions): string {
    if (!options.includeNavigation) {
      return '';
    }

    const files = [
      'index.md',
      'architecture.md',
      'file-structure.md',
      'dependencies.md',
      'patterns.md',
      'code-quality.md',
      'recommendations.md',
      'metadata.md',
    ];

    const currentIndex = files.indexOf(currentFile);
    if (currentIndex === -1) {
      return '\n---\n\n[← Back to Index](./index.md)\n';
    }

    let nav = '\n---\n\n';

    if (currentIndex > 0) {
      const prev = files[currentIndex - 1];
      const prevName = this.formatFileName(prev);
      nav += `[← ${prevName}](./${prev})`;
    }

    if (currentIndex < files.length - 1) {
      const next = files[currentIndex + 1];
      const nextName = this.formatFileName(next);
      if (currentIndex > 0) {
        nav += ' | ';
      }
      nav += `[${nextName} →](./${next})`;
    }

    nav += '\n';
    return nav;
  }

  /**
   * Format file name for display
   */
  private formatFileName(fileName: string): string {
    return fileName
      .replace('.md', '')
      .split('-')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate metadata footer
   */
  private generateMetadataFooter(output: DocumentationOutput): string {
    const { metadata } = output;
    return `\n---\n\n_Generated by ${metadata.generatorVersion} on ${output.timestamp.toISOString()}_\n`;
  }
}
