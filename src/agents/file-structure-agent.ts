import { Agent } from './agent.interface';
import { AgentContext, AgentMetadata, AgentPriority, AgentFile } from '../types/agent.types';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { LLMJsonParser } from '../utils/json-parser';
import { getTestPatterns } from '../config/language-config';
import { MarkdownRenderer } from '../services/markdown-renderer.service';

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
      outputFilename: 'file-structure.md',
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

  // Abstract method implementations for BaseAgentWorkflow

  protected getAgentName(): string {
    return 'file-structure';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert software architect analyzing project file structures and organization patterns.

Your task is to analyze a project's file and directory structure and provide insights about:

1. **Organization Strategy**: How files and directories are organized
2. **Naming Conventions**: Patterns in file and directory naming
3. **Structure Patterns**: Common architectural patterns evident from structure
4. **Recommendations**: Improvements for better organization

Analyze the structure for:
- Clarity and logical grouping
- Consistency in naming
- Separation of concerns
- Scalability of the organization
- Framework/platform conventions

Be concise but informative. Focus on key patterns and actionable recommendations.

Provide your analysis in this JSON format:
{
  "summary": "Brief overview of the project structure (2-3 sentences)",
  "structure": {
    "organizationStrategy": "How the project is organized (1-2 sentences)",
    "keyDirectories": ["dir1", "dir2", "dir3"],
    "directoryPurposes": {"dir1": "purpose", "dir2": "purpose"}
  },
  "patterns": {
    "architectural": ["pattern1", "pattern2"],
    "organizational": ["pattern1", "pattern2"]
  },
  "conventions": {
    "naming": ["convention1", "convention2"],
    "grouping": ["convention1", "convention2"]
  },
  "recommendations": [
    "actionable recommendation 1",
    "actionable recommendation 2"
  ],
  "warnings": [
    "warning1 if any structural issues found",
    "warning2 if applicable"
  ]
}

Focus on key insights and actionable recommendations. Be concise.

${this.getResponseLengthGuidance(_context)}

CRITICAL: You MUST respond with ONLY valid JSON matching the exact schema above. Do NOT include markdown formatting, explanations, or any text outside the JSON object. Start your response with { and end with }.`;
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

Please analyze this structure and provide insights about organization, patterns, and recommendations for improvement.

Respond with ONLY valid JSON - no markdown, no code blocks, no explanations. Start with { and end with }.`;

    return content;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    return this.parseAnalysisResult(analysis);
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: Record<string, unknown>,
  ): Promise<string> {
    return MarkdownRenderer.getInstance().render(this.getAgentName(), data);
  }

  protected generateSummary(data: Record<string, unknown>): string {
    const analysis = data as { summary?: string };
    return analysis.summary || 'File structure analysis completed';
  }

  protected getTargetTokenRanges(): Record<
    'quick' | 'normal' | 'deep' | 'exhaustive',
    { min: number; max: number }
  > {
    return {
      quick: { min: 500, max: 1500 },
      normal: { min: 1500, max: 4000 },
      deep: { min: 4000, max: 8000 },
      exhaustive: { min: 8000, max: 12000 },
    };
  }

  protected getDepthSpecificGuidance(mode: 'quick' | 'normal' | 'deep' | 'exhaustive'): string {
    const guidance = {
      quick: '- Focus on main directories and patterns\n- Provide 3-5 recommendations',
      normal:
        '- Analyze organization strategy and conventions\n- Include 5-10 patterns and recommendations',
      deep: '- Detailed analysis of all directory structures\n- Include 10-15 patterns and conventions with examples',
      exhaustive:
        '- Comprehensive file structure documentation\n- Document every organizational pattern and naming convention\n- Provide 15-20 detailed recommendations',
    };

    return guidance[mode];
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

    // Test files - use centralized test patterns
    const testPatterns = getTestPatterns();
    if (testPatterns.some((pattern) => name.includes(pattern.toLowerCase()))) {
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
    return LLMJsonParser.parse(result, {
      contextName: 'file-structure',
      logErrors: true,
      fallback: {
        summary: 'Error parsing analysis result',
        structure: {},
        patterns: { architectural: [], organizational: [] },
        conventions: { naming: [], grouping: [] },
        recommendations: [],
        warnings: ['Failed to parse LLM response as JSON'],
      },
    });
  }

  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    const markdown = await this.formatMarkdown(data, state);
    const metadata = this.getMetadata();

    return [
      {
        filename: 'file-structure.md',
        content: markdown,
        title: 'File Structure & Organization',
        category: 'structure',
        order: metadata.priority,
      },
    ];
  }
}
