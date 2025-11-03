import { Agent } from './agent.interface';
import { AgentContext, AgentMetadata, AgentPriority, AgentFile } from '../types/agent.types';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { LLMJsonParser } from '../utils/json-parser';
import {
  getSupportedLanguages,
  extractImportsFromCode,
  getPackageManagersFromLanguages,
} from '../config/language-config';
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
        supportedLanguages: getSupportedLanguages(),
      },
      tags: ['dependencies', 'packages', 'npm', 'yarn', 'pip', 'maven', 'nuget'],
      outputFilename: 'dependencies.md',
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    // Always execute if there are source files - we'll extract dependencies from imports
    return context.files.length > 0;
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    // Base cost + dependencies count estimation
    return 3000 + context.files.length * 5;
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
}

${this.getResponseLengthGuidance(_context)}

CRITICAL: You MUST respond with ONLY valid JSON matching the exact schema above. Do NOT include markdown formatting, explanations, or any text outside the JSON object. Start your response with { and end with }.`;
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

  // Helper methods

  private async extractDependencies(context: AgentContext): Promise<DependencyData> {
    const dependencies: DependencyData = {
      hasDependencies: false,
      packageManagers: [],
      production: [],
      development: [],
      total: 0,
    };

    // FIRST: Try to extract from package manager manifest files (preferred)
    const manifestData = await this.extractFromManifestFiles(context);
    if (manifestData.hasDependencies) {
      return manifestData; // Use manifest data if available
    }

    // FALLBACK: Extract dependencies from source code imports (language-agnostic)
    const importMap = new Map<string, Set<string>>(); // package -> files using it

    for (const file of context.files) {
      const filePath = path.join(context.projectPath, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        // Use centralized language-agnostic import extraction
        const imports = extractImportsFromCode(content, file);

        imports.forEach((importName) => {
          if (!importMap.has(importName)) {
            importMap.set(importName, new Set());
          }
          importMap.get(importName)!.add(file);
        });
      } catch (error) {
        this.logger.debug(`Failed to read file: ${file}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Convert import map to dependency list
    if (importMap.size > 0) {
      dependencies.hasDependencies = true;
      dependencies.production = Array.from(importMap.entries()).map(([name, files]) => ({
        name,
        version: `used in ${files.size} file(s)`,
      }));
      dependencies.total = importMap.size;

      // Detect package managers from language hints using centralized config
      const languages = context.languageHints.map((h) => h.language);
      dependencies.packageManagers = getPackageManagersFromLanguages(languages);
    }

    return dependencies;
  }

  private async extractFromManifestFiles(context: AgentContext): Promise<DependencyData> {
    const dependencies: DependencyData = {
      hasDependencies: false,
      packageManagers: [],
      production: [],
      development: [],
      total: 0,
    };

    // Look for package manager manifest files
    const manifestFiles = {
      'package.json': 'npm/yarn/pnpm',
      'requirements.txt': 'pip',
      Pipfile: 'pipenv',
      'pyproject.toml': 'poetry',
      Gemfile: 'bundler',
      'go.mod': 'go modules',
      'Cargo.toml': 'cargo',
      'composer.json': 'composer',
      'pom.xml': 'maven',
      'build.gradle': 'gradle',
    };

    for (const [filename, manager] of Object.entries(manifestFiles)) {
      const manifestPath = path.join(context.projectPath, filename);
      try {
        const content = await fs.readFile(manifestPath, 'utf-8');

        if (filename === 'package.json') {
          const pkg = JSON.parse(content);
          dependencies.packageManagers.push(manager);
          dependencies.hasDependencies = true;

          if (pkg.dependencies) {
            Object.entries(pkg.dependencies).forEach(([name, version]) => {
              dependencies.production!.push({ name, version: String(version) });
            });
          }

          if (pkg.devDependencies) {
            Object.entries(pkg.devDependencies).forEach(([name, version]) => {
              dependencies.development!.push({ name, version: String(version) });
            });
          }

          dependencies.total =
            (dependencies.production?.length || 0) + (dependencies.development?.length || 0);
        } else if (filename === 'requirements.txt') {
          dependencies.packageManagers.push(manager);
          dependencies.hasDependencies = true;

          const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
          dependencies.production = lines.map((line) => {
            const [name, version] = line.split(/[=<>~]/);
            return { name: name.trim(), version: version?.trim() || 'latest' };
          });
          dependencies.total = dependencies.production.length;
        }
        // Add more parsers for other package managers as needed

        break; // Use first found manifest
      } catch (_error) {
        // File doesn't exist or couldn't be parsed, continue to next
        continue;
      }
    }

    return dependencies;
  }

  private parseAnalysisResult(result: string): Record<string, unknown> {
    return LLMJsonParser.parse(result, {
      contextName: 'dependency-analyzer',
      logErrors: true,
      fallback: {
        summary: 'Error parsing analysis result',
        insights: [],
        vulnerabilities: [],
        recommendations: [],
        metrics: {},
        warnings: ['Failed to parse LLM response as JSON'],
      },
    });
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

  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    const markdown = await this.formatMarkdown(data, state);
    const metadata = this.getMetadata();

    return [
      {
        filename: 'dependencies.md',
        content: markdown,
        title: 'Dependency Analysis',
        category: 'analysis',
        order: metadata.priority,
      },
    ];
  }
}
