import { Agent } from './agent.interface';
import {
  AgentContext,
  AgentResult,
  AgentMetadata,
  AgentPriority,
  AgentExecutionOptions,
} from '../types/agent.types';
import { BaseAgentWorkflow } from './base-agent-workflow';
import { promises as fs } from 'fs';
import * as path from 'path';

interface DependencyInfo {
  name: string;
  version: string;
}

interface DependencyData {
  hasDependencies: boolean;
  packageManagers: string[];
  production: DependencyInfo[];
  development: DependencyInfo[];
  total: number;
  projectName?: string;
  projectVersion?: string;
  scripts?: string[];
}

/**
 * Agent that analyzes project dependencies and their relationships
 * Uses self-refinement workflow to iteratively improve analysis
 */
export class DependencyAnalyzerAgent extends BaseAgentWorkflow implements Agent {
  public getMetadata(): AgentMetadata {
    return {
      name: 'dependency-analyzer',
      version: '1.0.0',
      description: 'Analyzes project dependencies, package managers, and dependency relationships',
      priority: AgentPriority.HIGH,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: true,
        dependencies: [],
        supportsIncremental: true,
        estimatedTokens: 4000,
        supportedLanguages: ['javascript', 'typescript', 'python', 'java', 'csharp', 'go', 'rust'],
      },
      tags: ['dependencies', 'packages', 'npm', 'yarn', 'pip', 'maven', 'nuget'],
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    // Check if package manager files exist
    const packageFiles = [
      'package.json',
      'requirements.txt',
      'pom.xml',
      'build.gradle',
      'Cargo.toml',
      'go.mod',
    ];
    return context.files.some((file) => packageFiles.some((pkg) => file.endsWith(pkg)));
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    // Base cost + dependencies count estimation
    return 3000 + context.files.length * 5;
  }

  public async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    // Adaptive configuration - agent decides when analysis is complete
    const workflowConfig = {
      maxIterations: 10,
      clarityThreshold: 85,
      minImprovement: 3,
      enableSelfQuestioning: true,
      skipSelfRefinement: false,
      maxQuestionsPerIteration: 2,
      evaluationTimeout: 15000,
    };

    return this.executeWorkflow(
      context,
      workflowConfig,
      options?.runnableConfig as Record<string, unknown> | undefined,
    );
  }

  // Abstract method implementations for BaseAgentWorkflow

  protected getAgentName(): string {
    return 'dependency-analyzer';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert software architect analyzing project dependencies and package management.

Your task is to analyze project dependencies and provide comprehensive insights about:

1. **Dependency Health**: Version management, update strategies
2. **Security Analysis**: Vulnerabilities, risks, recommendations
3. **Package Management**: Tools used, configuration quality
4. **Dependency Relationships**: Key dependencies, dependency tree insights

Provide your analysis in this JSON format:
{
  "summary": "Comprehensive overview of dependency management",
  "insights": ["insight1", "insight2", ...],
  "vulnerabilities": [{"package": "...", "severity": "...", "description": "..."}],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "warnings": ["warning1", "warning2", ...]
}`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const dependencyData = await this.extractDependencies(context);

    const content = `Analyze these project dependencies:

**Project**: ${context.projectPath}
**Package Managers**: ${dependencyData.packageManagers?.join(', ') || 'None detected'}

**Production Dependencies** (${dependencyData.production?.length || 0}):
${
  (dependencyData.production || [])
    .slice(0, 20)
    .map((dep: DependencyInfo) => `- ${dep.name}@${dep.version}`)
    .join('\n') || 'None'
}
${dependencyData.production?.length > 20 ? `\n... and ${dependencyData.production.length - 20} more` : ''}

**Development Dependencies** (${dependencyData.development?.length || 0}):
${
  (dependencyData.development || [])
    .slice(0, 10)
    .map((dep: DependencyInfo) => `- ${dep.name}@${dep.version}`)
    .join('\n') || 'None'
}

**Detected Languages**: ${context.languageHints.map((h) => h.language).join(', ')}

Please analyze dependency health, security, and provide recommendations.`;

    return content;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    return this.parseAnalysisResult(analysis);
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    state: Record<string, unknown>,
  ): Promise<string> {
    const context = state.context as AgentContext;
    const dependencyData = await this.extractDependencies(context);
    return this.formatMarkdownReport(data, dependencyData);
  }

  protected generateSummary(data: Record<string, unknown>): string {
    const analysis = data as { summary?: string };
    return analysis.summary || 'Dependency analysis completed';
  }

  // Helper methods (unchanged)

  private async extractDependencies(context: AgentContext): Promise<DependencyData> {
    const dependencies: DependencyData = {
      hasDependencies: false,
      packageManagers: [],
      production: [],
      development: [],
      total: 0,
    };

    // Check for package.json (Node.js)
    const packageJsonPath = path.join(context.projectPath, 'package.json');
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);

      dependencies.hasDependencies = true;
      dependencies.packageManagers.push('npm/yarn');
      dependencies.projectName = pkg.name;
      dependencies.projectVersion = pkg.version;

      if (pkg.dependencies) {
        dependencies.production = Object.entries(pkg.dependencies).map(([name, version]) => ({
          name,
          version: version as string,
        }));
      }

      if (pkg.devDependencies) {
        dependencies.development = Object.entries(pkg.devDependencies).map(([name, version]) => ({
          name,
          version: version as string,
        }));
      }

      dependencies.total = dependencies.production.length + dependencies.development.length;
      dependencies.scripts = pkg.scripts ? Object.keys(pkg.scripts) : [];
    } catch (error) {
      // Package.json not found or invalid, continue checking other formats
      this.logger.debug('Package.json not found or invalid', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Check for requirements.txt (Python)
    const requirementsPath = path.join(context.projectPath, 'requirements.txt');
    try {
      const content = await fs.readFile(requirementsPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim() && !line.startsWith('#'));

      dependencies.hasDependencies = true;
      dependencies.packageManagers.push('pip');
      dependencies.production = lines.map((line) => {
        const [name, version] = line.split('==');
        return { name: name.trim(), version: version?.trim() || 'latest' };
      });
      dependencies.total = dependencies.production.length;
    } catch (error) {
      // requirements.txt not found, continue
      this.logger.debug('requirements.txt not found', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return dependencies;
  }

  private parseAnalysisResult(result: string): Record<string, unknown> {
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        summary: 'Failed to parse structured analysis',
        insights: [],
        vulnerabilities: [],
        recommendations: [],
        metrics: {},
        warnings: ['Failed to parse LLM response as JSON'],
      };
    } catch (error) {
      this.logger.warn('Failed to parse dependency analysis result', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        summary: 'Error parsing analysis result',
        insights: [],
        vulnerabilities: [],
        recommendations: [],
        metrics: {},
        warnings: [`Parse error: ${(error as Error).message}`],
      };
    }
  }

  private formatMarkdownReport(
    analysis: Record<string, unknown>,
    dependencyData: DependencyData,
  ): string {
    // Type-safe accessors
    const summary = (analysis.summary as string) || 'Dependency analysis completed';
    const metrics = (analysis.metrics as Record<string, number>) || {};
    const insights = (analysis.insights as string[]) || [];
    const vulnerabilities = (analysis.vulnerabilities as Array<Record<string, string>>) || [];
    const recommendations = (analysis.recommendations as string[]) || [];
    const warnings = (analysis.warnings as string[]) || [];
    const packageManagers = (dependencyData.packageManagers as string[]) || [];

    return `# 📦 Dependency Analysis

## Overview
${summary}

**Total Dependencies**: ${dependencyData.total || 0}
**Package Managers**: ${packageManagers.join(', ') || 'None detected'}

## Metrics
${
  Object.entries(metrics)
    .map(([key, value]) => `- **${key}**: ${value}/10`)
    .join('\n') || 'No metrics available'
}

## Key Insights
${insights.map((insight: string, index: number) => `${index + 1}. ${insight}`).join('\n') || 'No insights available'}

${
  vulnerabilities.length > 0
    ? `
## 🔒 Security Concerns
${vulnerabilities
  .map(
    (vuln) =>
      `- **${vuln.package}** (${vuln.severity?.toUpperCase() || 'UNKNOWN'}): ${vuln.description}`,
  )
  .join('\n')}
`
    : ''
}

## 💡 Recommendations
${recommendations.map((rec: string, index: number) => `${index + 1}. ${rec}`).join('\n') || 'No recommendations available'}

${
  warnings.length > 0
    ? `
## ⚠️ Warnings
${warnings.map((warning: string) => `- ${warning}`).join('\n')}
`
    : ''
}`;
  }
}
