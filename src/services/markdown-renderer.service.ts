import {
  FileStructureAnalysis,
  DependencyAnalysis,
  ArchitectureAnalysis,
} from '../types/agent.types';

/**
 * Service to render JSON analysis data into Markdown
 */
export class MarkdownRenderer {
  private static instance: MarkdownRenderer;

  private constructor() {}

  public static getInstance(): MarkdownRenderer {
    if (!MarkdownRenderer.instance) {
      MarkdownRenderer.instance = new MarkdownRenderer();
    }
    return MarkdownRenderer.instance;
  }

  /**
   * Render markdown for a specific agent
   */
  public render(agentName: string, data: Record<string, unknown>): string {
    switch (agentName) {
      case 'file-structure':
        return this.renderFileStructure(data as unknown as FileStructureAnalysis);
      case 'dependency-analyzer':
        return this.renderDependencyAnalysis(data as unknown as DependencyAnalysis);
      case 'architecture-analyzer':
        return this.renderArchitectureAnalysis(data as unknown as ArchitectureAnalysis);
      default:
        return this.renderGeneric(data);
    }
  }

  /**
   * Render File Structure Analysis
   */
  private renderFileStructure(data: FileStructureAnalysis): string {
    const { summary, structure, patterns, conventions, recommendations, warnings } = data;

    const orgStrategy = structure?.organizationStrategy || 'Not specified';
    const keyDirs = structure?.keyDirectories || [];
    const dirPurposes = structure?.directoryPurposes || {};
    const archPatterns = patterns?.architectural || [];
    const orgPatterns = patterns?.organizational || [];
    const namingConventions = conventions?.naming || [];
    const groupingConventions = conventions?.grouping || [];

    return `# 📁 File Structure Analysis

## Overview
${summary || 'Analysis completed'}

## Structure Organization
**Strategy**: ${orgStrategy}

### Key Directories
${
  keyDirs.length > 0
    ? keyDirs
        .map((dir) => `- **${dir}**: ${dirPurposes[dir] || 'Purpose not specified'}`)
        .join('\n')
    : 'No key directories identified'
}

## Patterns Detected

### Architectural Patterns
${
  archPatterns.length > 0
    ? archPatterns.map((p) => `- ${p}`).join('\n')
    : 'No architectural patterns detected'
}

### Organizational Patterns
${
  orgPatterns.length > 0
    ? orgPatterns.map((p) => `- ${p}`).join('\n')
    : 'No organizational patterns detected'
}

## Conventions

### Naming Conventions
${
  namingConventions.length > 0
    ? namingConventions.map((c) => `- ${c}`).join('\n')
    : 'No naming conventions detected'
}

### Grouping Conventions
${
  groupingConventions.length > 0
    ? groupingConventions.map((c) => `- ${c}`).join('\n')
    : 'No grouping conventions detected'
}

## Recommendations
${
  recommendations && recommendations.length > 0
    ? recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')
    : 'No recommendations available'
}

${
  warnings && warnings.length > 0
    ? `
## ⚠️ Warnings
${warnings.map((w) => `- ${w}`).join('\n')}
`
    : ''
}`;
  }

  /**
   * Render Dependency Analysis
   */
  private renderDependencyAnalysis(data: DependencyAnalysis): string {
    const { summary, metrics, insights, vulnerabilities, recommendations, warnings } = data;

    // We assume 'total' and 'packageManagers' might be merged into data in the future
    // For now, we handle what's strictly in the interface
    const totalDeps = data.totalDependencies || 0;
    const pkgManagers = (data.packageManagers as string[]) || [];

    return `# 📦 Dependency Analysis

## Overview
${summary || 'Analysis completed'}

**Total Dependencies**: ${totalDeps}
**Package Managers**: ${pkgManagers.join(', ') || 'None detected'}

## Metrics
${
  metrics
    ? Object.entries(metrics)
        .map(([k, v]) => `- **${k}**: ${v}/10`)
        .join('\n')
    : 'No metrics available'
}

## Key Insights
${
  insights && insights.length > 0
    ? insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')
    : 'No insights available'
}

${
  vulnerabilities && vulnerabilities.length > 0
    ? `
## 🔒 Security Concerns
${vulnerabilities
  .map((v) => `- **${v.package}** (${v.severity?.toUpperCase() || 'UNKNOWN'}): ${v.description}`)
  .join('\n')}
`
    : ''
}

## 💡 Recommendations
${
  recommendations && recommendations.length > 0
    ? recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')
    : 'No recommendations available'
}

${
  warnings && warnings.length > 0
    ? `
## ⚠️ Warnings
${warnings.map((w) => `- ${w}`).join('\n')}
`
    : ''
}`;
  }

  /**
   * Generic fall-back renderer
   */
  /**
   * Render Architecture Analysis
   */
  private renderArchitectureAnalysis(analysis: ArchitectureAnalysis): string {
    let report = `# 🏗️ System Architecture\n\n`;
    report += `[← Back to Index](./index.md)\n\n`;
    report += `---\n\n`;

    report += `## Overview\n\n`;
    report += `${analysis.summary}\n\n`;

    report += `## Architectural Style\n\n`;
    report += `**Style**: ${analysis.style}\n\n`;

    if (analysis.layers && analysis.layers.length > 0) {
      report += `## System Layers\n\n`;
      analysis.layers.forEach((layer, index) => {
        report += `${index + 1}. ${layer}\n`;
      });
      report += `\n`;
    }

    if (analysis.components && analysis.components.length > 0) {
      report += `## Main Components\n\n`;
      analysis.components.forEach((comp) => {
        report += `### ${comp.name}\n\n`;
        report += `**Type**: ${comp.type}\n\n`;
        report += `${comp.description}\n\n`;

        if (comp.responsibilities && comp.responsibilities.length > 0) {
          report += `**Responsibilities**:\n`;
          comp.responsibilities.forEach((resp) => {
            report += `- ${resp}\n`;
          });
          report += `\n`;
        }

        if (comp.dependencies && comp.dependencies.length > 0) {
          report += `**Dependencies**: ${comp.dependencies.join(', ')}\n\n`;
        }

        if (comp.technologies && comp.technologies.length > 0) {
          report += `**Technologies**: ${comp.technologies.join(', ')}\n\n`;
        }
      });
    }

    if (analysis.integrations && analysis.integrations.length > 0) {
      report += `## External Integrations\n\n`;
      analysis.integrations.forEach((integration) => {
        report += `- ${integration}\n`;
      });
      report += `\n`;
    }

    if (analysis.diagram) {
      report += `## Architecture Diagram\n\n`;
      report += `> 💡 **Tip**: View this diagram with a Mermaid renderer:\n`;
      report += `> - VS Code: Install "Markdown Preview Mermaid Support" extension\n`;
      report += `> - GitHub/GitLab: Automatic rendering in markdown preview\n`;
      report += `> - Online: Copy to [mermaid.live](https://mermaid.live)\n\n`;
      report += `<details>\n<summary>📊 Click to view component diagram</summary>\n\n`;
      report += `\`\`\`mermaid\n${analysis.diagram}\n\`\`\`\n\n`;
      report += `</details>\n\n`;
    }

    if (analysis.insights && analysis.insights.length > 0) {
      report += `## 💡 Key Insights\n\n`;
      analysis.insights.forEach((insight, index) => {
        report += `${index + 1}. ${insight}\n`;
      });
      report += `\n`;
    }

    // Recommendations section (before metadata)
    if (analysis.warnings && analysis.warnings.length > 0) {
      report += `## 💡 Recommendations\n\n`;
      report += `Based on the architectural analysis, consider the following improvements:\n\n`;
      analysis.warnings.forEach((warning) => {
        // Convert warnings to actionable recommendations
        report += `- **Address**: ${warning}\n`;
      });
      report += `\n`;
    }

    // Add Architecture Metadata section (project-specific, not agent metadata)
    report += `## Architecture Metadata\n\n`;
    report += `| Property | Value |\n`;
    report += `|----------|-------|\n`;
    report += `| **Architecture Style** | ${analysis.style} |\n`;

    if (analysis.layers && analysis.layers.length > 0) {
      report += `| **Layers** | ${analysis.layers.join(', ')} |\n`;
    }

    if (analysis.components && analysis.components.length > 0) {
      report += `| **Total Components** | ${analysis.components.length} |\n`;
    }

    if (analysis.integrations && analysis.integrations.length > 0) {
      report += `| **External Integrations** | ${analysis.integrations.join(', ')} |\n`;
    }

    report += `| **Analysis Date** | ${new Date().toISOString().split('T')[0]} |\n`;
    report += `\n`;

    report += `---\n\n`;
    report += `_Architecture analysis completed on ${new Date().toISOString()}_\n`;

    return report;
  }

  /**
   * Generic fall-back renderer
   */
  private renderGeneric(data: Record<string, unknown>): string {
    return `# Analysis Result

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
`;
  }
}
