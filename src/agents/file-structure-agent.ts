import { Agent } from './agent.interface';
import {
  AgentContext,
  AgentResult,
  AgentMetadata,
  AgentPriority,
  AgentExecutionOptions,
} from '../types/agent.types';
import { BaseAgentWorkflow } from './base-agent-workflow';

/**
 * Agent that analyzes project file structure and organization
 * Uses self-refinement workflow to iteratively improve analysis
 */
export class FileStructureAgent extends BaseAgentWorkflow implements Agent {
  public getMetadata(): AgentMetadata {
    return {
      name: 'file-structure',
      version: '1.0.0',
      description:
        'Analyzes project file and directory structure, naming conventions, and organization patterns',
      priority: AgentPriority.CRITICAL,
      capabilities: {
        supportsParallel: false,
        requiresFileContents: false,
        dependencies: [],
        supportsIncremental: true,
        estimatedTokens: 3000,
        supportedLanguages: [], // Language agnostic
      },
      tags: ['structure', 'organization', 'files', 'directories'],
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    // Always can execute if there are files to analyze
    return context.files.length > 0;
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    const fileCount = context.files.length;
    const directoryCount = new Set(context.files.map((f) => f.split('/')[0])).size;

    // Base cost + files + directories
    return 2000 + fileCount * 2 + directoryCount * 10;
  }

  // Override execute to customize workflow configuration
  public async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    // Adaptive configuration - agent decides when analysis is complete
    const workflowConfig = {
      maxIterations: 10, // High limit - agent self-determines when satisfied
      clarityThreshold: 85, // High bar - ensures thorough analysis
      minImprovement: 3, // Accept small incremental improvements
      enableSelfQuestioning: true,
      skipSelfRefinement: false,
      maxQuestionsPerIteration: 2, // Focused questions for targeted improvements
      evaluationTimeout: 15000,
    };

    // Execute with adaptive self-refinement
    return this.executeWorkflow(
      context,
      workflowConfig,
      options?.runnableConfig as Record<string, unknown> | undefined,
    );
  }

  // Abstract method implementations for BaseAgentWorkflow

  protected getAgentName(): string {
    return 'file-structure';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert software architect analyzing project file structures and organization patterns.

Your task is to analyze a project's file and directory structure and provide COMPREHENSIVE, DETAILED insights about:

1. **Organization Strategy**: How files and directories are organized - provide extensive analysis
2. **Naming Conventions**: Patterns in file and directory naming - be thorough
3. **Structure Patterns**: Common architectural patterns evident from structure - list ALL patterns found
4. **Recommendations**: Improvements for better organization - provide actionable, detailed recommendations

Analyze the structure for:
- Clarity and logical grouping - explain in detail
- Consistency in naming - provide specific examples
- Separation of concerns - identify each concern
- Scalability of the organization - discuss growth potential
- Framework/platform conventions - identify all conventions used

**IMPORTANT**: Be EXTREMELY DETAILED and COMPREHENSIVE. Do not limit your response. Include:
- Detailed explanations for each finding
- Specific file and directory examples
- Multiple patterns if detected
- Extensive recommendations with reasoning
- Detailed warnings with context

Provide your analysis in this JSON format:
{
  "summary": "Comprehensive overview of the project structure with detailed insights (4-6 sentences minimum)",
  "structure": {
    "organizationStrategy": "Detailed description of how project is organized, including philosophy and approach (multiple paragraphs if needed)",
    "keyDirectories": ["dir1", "dir2", "dir3", ...],
    "directoryPurposes": {"dir1": "detailed purpose description", "dir2": "detailed purpose description", ...}
  },
  "patterns": {
    "architectural": ["pattern1 with detailed explanation", "pattern2 with context", "pattern3...", ...],
    "organizational": ["pattern1 with examples", "pattern2 with reasoning", ...]
  },
  "conventions": {
    "naming": ["convention1 with examples from the codebase", "convention2 with rationale", ...],
    "grouping": ["convention1 with specific examples", "convention2 with reasoning", ...]
  },
  "recommendations": [
    "recommendation1 with detailed reasoning and expected benefits",
    "recommendation2 with specific steps and examples",
    "recommendation3 with trade-offs and considerations",
    ...
  ],
  "warnings": [
    "warning1 with specific locations and severity explanation",
    "warning2 with context and potential impact",
    ...
  ]
}

Be thorough, detailed, and comprehensive. Focus on actionable insights with extensive context and reasoning.`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const fileTree = this.buildFileTree(context.files);
    const directoryStructure = this.analyzeDirectoryStructure(context.files);
    const fileTypes = this.categorizeFiles(context.files);

    const content = `Analyze this project structure:

**Project Path**: ${context.projectPath}

**File Tree**:
${fileTree}

**Directory Structure**:
${JSON.stringify(directoryStructure, null, 2)}

**File Type Distribution**:
${JSON.stringify(fileTypes, null, 2)}

**Detected Languages**: ${context.languageHints.map((h) => h.language).join(', ')}

**Project Metadata**: ${JSON.stringify(context.projectMetadata, null, 2)}

Please analyze this structure and provide insights about organization, patterns, and recommendations for improvement.`;

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
    return this.formatMarkdownReport(data, context);
  }

  protected generateSummary(data: Record<string, unknown>): string {
    const analysis = data as { summary?: string };
    return analysis.summary || 'File structure analysis completed';
  }

  // Original helper methods (unchanged)

  private buildFileTree(files: string[]): string {
    // Create a simple tree representation
    const tree = new Map<string, Set<string>>();

    files.forEach((file) => {
      const parts = file.split('/');
      for (let i = 0; i < parts.length - 1; i++) {
        const dir = parts.slice(0, i + 1).join('/');
        const child = parts[i + 1];

        if (!tree.has(dir)) {
          tree.set(dir, new Set());
        }
        tree.get(dir)!.add(child);
      }
    });

    // Build tree string representation
    let result = '';
    const visited = new Set<string>();

    const buildLevel = (dir: string, depth: number = 0) => {
      if (visited.has(dir)) return;
      visited.add(dir);

      const indent = '  '.repeat(depth);
      const dirName = dir.split('/').pop() || dir;
      result += `${indent}${dirName}/\n`;

      const children = Array.from(tree.get(dir) || []).sort();
      children.forEach((child) => {
        const childPath = `${dir}/${child}`;
        if (tree.has(childPath)) {
          buildLevel(childPath, depth + 1);
        } else {
          result += `${indent}  ${child}\n`;
        }
      });
    };

    // Start with root directories
    const rootDirs = new Set<string>();
    files.forEach((file) => {
      const root = file.split('/')[0];
      rootDirs.add(root);
    });

    Array.from(rootDirs)
      .sort()
      .forEach((root) => {
        buildLevel(root);
      });

    return result.trim();
  }

  private analyzeDirectoryStructure(files: string[]): Record<string, number> {
    const structure: Record<string, number> = {};
    const dirCounts = new Map<string, number>();
    const fileCounts = new Map<string, number>();

    files.forEach((file) => {
      const parts = file.split('/');

      // Count directories at each level
      for (let i = 0; i < parts.length - 1; i++) {
        const dir = parts.slice(0, i + 1).join('/');
        dirCounts.set(dir, (dirCounts.get(dir) || 0) + 1);
      }

      // Count files in each directory
      if (parts.length > 1) {
        const parentDir = parts.slice(0, -1).join('/');
        fileCounts.set(parentDir, (fileCounts.get(parentDir) || 0) + 1);
      }
    });

    structure.totalDirectories = dirCounts.size;
    structure.totalFiles = files.length;
    structure.averageFilesPerDirectory = files.length / Math.max(dirCounts.size, 1);
    structure.maxDepth = Math.max(...files.map((f) => f.split('/').length));

    return structure;
  }

  private categorizeFiles(files: string[]): Record<string, number> {
    const categories: Record<string, number> = {};

    files.forEach((file) => {
      const extension = file.split('.').pop()?.toLowerCase() || '';
      const category = this.getFileCategory(file, extension);
      categories[category] = (categories[category] || 0) + 1;
    });

    return categories;
  }

  private getFileCategory(filename: string, extension: string): string {
    const name = filename.toLowerCase();

    // Test files
    if (name.includes('test') || name.includes('spec') || name.includes('__tests__')) {
      return 'test';
    }

    // Configuration files
    if (
      ['json', 'yml', 'yaml', 'toml', 'ini', 'conf'].includes(extension) ||
      name.includes('config') ||
      name.includes('setting')
    ) {
      return 'configuration';
    }

    // Documentation
    if (['md', 'txt', 'rst', 'adoc'].includes(extension) || name.includes('readme')) {
      return 'documentation';
    }

    // Build/tooling
    if (
      ['dockerfile', 'makefile', 'jenkinsfile'].includes(name) ||
      ['gradle', 'pom', 'build'].some((term) => name.includes(term))
    ) {
      return 'build';
    }

    // Source code
    if (['ts', 'js', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'cs'].includes(extension)) {
      return 'source';
    }

    // Assets/resources
    if (['png', 'jpg', 'svg', 'css', 'scss', 'less'].includes(extension)) {
      return 'assets';
    }

    return 'other';
  }

  private parseAnalysisResult(result: string): Record<string, unknown> {
    try {
      // Try to parse as JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback parsing
      return {
        summary: 'Failed to parse structured analysis',
        structure: {},
        patterns: { architectural: [], organizational: [] },
        conventions: { naming: [], grouping: [] },
        recommendations: [],
        warnings: ['Failed to parse LLM response as JSON'],
      };
    } catch (error) {
      return {
        summary: 'Error parsing analysis result',
        structure: {},
        patterns: { architectural: [], organizational: [] },
        conventions: { naming: [], grouping: [] },
        recommendations: [],
        warnings: [`Parse error: ${(error as Error).message}`],
      };
    }
  }

  private formatMarkdownReport(analysis: Record<string, unknown>, context: AgentContext): string {
    // Type-safe accessors
    const summary = (analysis.summary as string) || 'File structure analysis completed';
    const structure = (analysis.structure as Record<string, unknown>) || {};
    const patterns = (analysis.patterns as Record<string, unknown>) || {};
    const conventions = (analysis.conventions as Record<string, unknown>) || {};
    const recommendations = (analysis.recommendations as string[]) || [];
    const warnings = (analysis.warnings as string[]) || [];

    const orgStrategy = (structure.organizationStrategy as string) || 'Not specified';
    const keyDirs = (structure.keyDirectories as string[]) || [];
    const dirPurposes = (structure.directoryPurposes as Record<string, string>) || {};
    const archPatterns = (patterns.architectural as string[]) || [];
    const orgPatterns = (patterns.organizational as string[]) || [];
    const namingConventions = (conventions.naming as string[]) || [];
    const groupingConventions = (conventions.grouping as string[]) || [];

    return `# 📁 File Structure Analysis

## Overview
${summary}

## Structure Organization
**Strategy**: ${orgStrategy}

### Key Directories
${
  keyDirs.length > 0
    ? keyDirs
        .map((dir: string) => `- **${dir}**: ${dirPurposes[dir] || 'Purpose not specified'}`)
        .join('\n')
    : 'No key directories identified'
}

## Patterns Detected

### Architectural Patterns
${archPatterns.length > 0 ? archPatterns.map((pattern: string) => `- ${pattern}`).join('\n') : 'No architectural patterns detected'}

### Organizational Patterns
${orgPatterns.length > 0 ? orgPatterns.map((pattern: string) => `- ${pattern}`).join('\n') : 'No organizational patterns detected'}

## Conventions

### Naming Conventions
${namingConventions.length > 0 ? namingConventions.map((conv: string) => `- ${conv}`).join('\n') : 'No naming conventions detected'}

### Grouping Conventions
${groupingConventions.length > 0 ? groupingConventions.map((conv: string) => `- ${conv}`).join('\n') : 'No grouping conventions detected'}

## Recommendations
${recommendations.length > 0 ? recommendations.map((rec: string, index: number) => `${index + 1}. ${rec}`).join('\n') : 'No recommendations available'}

${
  warnings.length > 0
    ? `
## ⚠️ Warnings
${warnings.map((warning: string) => `- ${warning}`).join('\n')}
`
    : ''
}

---
*Analysis completed in ${Date.now() - Date.parse(context.executionId)}ms*`;
  }
}
