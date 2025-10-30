import { promises as fs } from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

/**
 * Scored file match result
 */
export interface ScoredFile {
  path: string;
  score: number;
  matchReasons: string[];
}

/**
 * File content with metadata
 */
export interface FileContent {
  path: string;
  content: string;
  truncated: boolean;
  size: number;
}

/**
 * Search configuration
 */
export interface SearchConfig {
  topK?: number; // Number of files to return
  maxFileSize?: number; // Max bytes per file
  includeExtensions?: string[]; // Only search these extensions
  excludePatterns?: string[]; // Exclude paths matching these patterns
}

/**
 * Dependency graph for enhanced search
 */
export interface DependencyGraphData {
  imports: Array<{
    source: string;
    target: string;
    imports: string[];
    type: 'local' | 'external' | 'framework';
    resolvedPath?: string;
  }>;
  modules: Array<{
    name: string;
    path: string;
    files: string[];
    dependencies: string[];
    exports: string[];
  }>;
  graph: {
    nodes: Array<{
      id: string;
      type: 'file' | 'module' | 'external';
      name: string;
    }>;
    edges: Array<{
      from: string;
      to: string;
      type: 'import' | 'require';
    }>;
  };
}

/**
 * Memory-efficient file search service
 * Uses keyword scoring + dependency graph without embeddings to keep memory usage low
 */
export class FileSearchService {
  private logger = new Logger('FileSearchService');
  private fileCache = new Map<string, string>(); // LRU cache for file contents
  private maxCacheSize = 50; // Max number of files to cache
  private dependencyGraph?: DependencyGraphData;

  constructor(
    private projectPath: string,
    dependencyGraph?: DependencyGraphData,
  ) {
    this.dependencyGraph = dependencyGraph;
  }

  /**
   * Search files based on keywords from a question
   * Returns scored file paths without loading contents
   */
  public searchFiles(
    question: string,
    availableFiles: string[],
    config: SearchConfig = {},
  ): ScoredFile[] {
    const {
      topK = 5,
      includeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.cs'],
      excludePatterns = ['node_modules', 'dist', 'build', '.test.', '.spec.', '__tests__'],
    } = config;

    // Extract keywords from question
    const keywords = this.extractKeywords(question);
    this.logger.debug(`Extracted keywords: ${keywords.join(', ')}`, {
      question: question.substring(0, 100),
    });

    // Filter and score files
    const scoredFiles: ScoredFile[] = [];

    for (const filePath of availableFiles) {
      // Skip excluded patterns
      if (excludePatterns.some((pattern) => filePath.includes(pattern))) {
        continue;
      }

      // Check extension
      const ext = path.extname(filePath);
      if (includeExtensions.length > 0 && !includeExtensions.includes(ext)) {
        continue;
      }

      // Score the file
      const { score, reasons } = this.scoreFile(filePath, keywords, question);

      if (score > 0) {
        scoredFiles.push({
          path: filePath,
          score,
          matchReasons: reasons,
        });
      }
    }

    // Sort by score descending and return top K
    scoredFiles.sort((a, b) => b.score - a.score);
    const topFiles = scoredFiles.slice(0, topK);

    // If dependency graph available, enhance with related files
    if (this.dependencyGraph) {
      const relatedFiles = this.findRelatedFiles(
        topFiles.map((f) => f.path),
        topK,
      );
      this.logger.debug(`Enhanced with ${relatedFiles.length} related files from dependency graph`);

      // Merge and deduplicate
      const fileMap = new Map(topFiles.map((f) => [f.path, f]));
      for (const related of relatedFiles) {
        if (!fileMap.has(related.path)) {
          fileMap.set(related.path, related);
        }
      }

      const combined = Array.from(fileMap.values());
      combined.sort((a, b) => b.score - a.score);
      return combined.slice(0, topK * 2); // Allow some extra related files
    }

    return topFiles;
  }

  /**
   * Find files related to the given files via dependency edges
   * Uses the dependency graph to traverse imports/exports
   */
  private findRelatedFiles(filePaths: string[], maxRelated: number = 5): ScoredFile[] {
    if (!this.dependencyGraph) {
      return [];
    }

    const related = new Set<string>();
    const scoreMap = new Map<string, { score: number; reasons: string[] }>();

    // For each file, find files it imports and files that import it
    for (const filePath of filePaths) {
      // Find files this file imports (dependencies)
      const imports = this.dependencyGraph.imports.filter((imp) => imp.source === filePath);
      for (const imp of imports) {
        if (imp.resolvedPath && imp.type === 'local') {
          related.add(imp.resolvedPath);
          const current = scoreMap.get(imp.resolvedPath) || { score: 0, reasons: [] };
          current.score += 10; // Imported by matched file
          current.reasons.push(`imported by ${path.basename(filePath)}`);
          scoreMap.set(imp.resolvedPath, current);
        }
      }

      // Find files that import this file (dependents)
      const importers = this.dependencyGraph.imports.filter((imp) => imp.resolvedPath === filePath);
      for (const importer of importers) {
        related.add(importer.source);
        const current = scoreMap.get(importer.source) || { score: 0, reasons: [] };
        current.score += 8; // Imports matched file
        current.reasons.push(`imports ${path.basename(filePath)}`);
        scoreMap.set(importer.source, current);
      }

      // Find files in the same module
      const module = this.dependencyGraph.modules.find((m) => m.files.includes(filePath));
      if (module) {
        for (const moduleFile of module.files) {
          if (moduleFile !== filePath) {
            related.add(moduleFile);
            const current = scoreMap.get(moduleFile) || { score: 0, reasons: [] };
            current.score += 5; // Same module
            current.reasons.push(`same module (${module.name})`);
            scoreMap.set(moduleFile, current);
          }
        }
      }
    }

    // Convert to ScoredFile array
    const scoredRelated: ScoredFile[] = Array.from(related)
      .map((filePath) => {
        const data = scoreMap.get(filePath) || { score: 0, reasons: [] };
        return {
          path: filePath,
          score: data.score,
          matchReasons: data.reasons,
        };
      })
      .filter((f) => f.score > 0);

    // Sort by score and return top
    scoredRelated.sort((a, b) => b.score - a.score);
    return scoredRelated.slice(0, maxRelated);
  }

  /**
   * Retrieve file contents for scored files
   * Implements LRU caching to reduce disk reads
   */
  public async retrieveFiles(
    scoredFiles: ScoredFile[],
    config: SearchConfig = {},
  ): Promise<FileContent[]> {
    const { maxFileSize = 100000 } = config; // 100KB default limit

    const results: FileContent[] = [];

    for (const scored of scoredFiles) {
      try {
        const fullPath = path.isAbsolute(scored.path)
          ? scored.path
          : path.join(this.projectPath, scored.path);

        // Check cache first
        let content = this.fileCache.get(scored.path);

        if (!content) {
          // Read from disk
          const stat = await fs.stat(fullPath);

          // Skip files that are too large
          if (stat.size > maxFileSize * 2) {
            this.logger.debug(`Skipping large file: ${scored.path} (${stat.size} bytes)`);
            continue;
          }

          content = await fs.readFile(fullPath, 'utf-8');

          // Update cache (with LRU eviction)
          this.updateCache(scored.path, content);
        }

        // Truncate if needed
        const truncated = content.length > maxFileSize;
        const finalContent = truncated ? content.substring(0, maxFileSize) : content;

        results.push({
          path: scored.path,
          content: finalContent,
          truncated,
          size: content.length,
        });

        this.logger.debug(
          `Retrieved file: ${scored.path} (${finalContent.length} chars${truncated ? ', truncated' : ''})`,
        );
      } catch (error) {
        this.logger.debug(`Failed to read file: ${scored.path}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Clear the file cache
   */
  public clearCache(): void {
    this.fileCache.clear();
  }

  /**
   * Extract keywords from a question
   * Focuses on technical terms, file names, patterns
   */
  private extractKeywords(question: string): string[] {
    // Convert to lowercase for matching
    const lowerQuestion = question.toLowerCase();

    // Remove common words
    const stopWords = new Set([
      'the',
      'is',
      'are',
      'was',
      'were',
      'what',
      'where',
      'when',
      'how',
      'why',
      'which',
      'who',
      'does',
      'do',
      'did',
      'can',
      'could',
      'would',
      'should',
      'have',
      'has',
      'had',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'this',
      'that',
      'these',
      'those',
    ]);

    // Split into words and filter
    const words = lowerQuestion.split(/\W+/).filter((w) => w.length > 2 && !stopWords.has(w));

    // Add technical terms that appear in the question
    const technicalTerms = [
      'service',
      'controller',
      'repository',
      'model',
      'entity',
      'dto',
      'middleware',
      'guard',
      'interceptor',
      'decorator',
      'module',
      'component',
      'config',
      'util',
      'helper',
      'test',
      'spec',
      'interface',
      'type',
      'class',
      'function',
      'method',
      'route',
      'endpoint',
      'api',
      'database',
      'schema',
      'migration',
      'seed',
      'auth',
      'authentication',
      'authorization',
      'validation',
      'error',
      'exception',
      'handler',
      'filter',
      'pipe',
      'strategy',
      'pattern',
      'factory',
      'builder',
      'adapter',
      'proxy',
      'singleton',
      'observer',
    ];

    const matchedTerms = technicalTerms.filter((term) => lowerQuestion.includes(term));

    return [...new Set([...words, ...matchedTerms])];
  }

  /**
   * Score a file path based on keywords and question context
   * Returns score and reasons for transparency
   */
  private scoreFile(
    filePath: string,
    keywords: string[],
    question: string,
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    const fileName = path.basename(filePath).toLowerCase();
    const dirName = path.dirname(filePath).toLowerCase();

    // 1. Keyword matches in filename (highest weight)
    for (const keyword of keywords) {
      if (fileName.includes(keyword)) {
        score += 15;
        reasons.push(`filename contains '${keyword}'`);
      }
    }

    // 2. Keyword matches in directory path (medium weight)
    for (const keyword of keywords) {
      if (dirName.includes(keyword) && !fileName.includes(keyword)) {
        score += 8;
        reasons.push(`directory contains '${keyword}'`);
      }
    }

    // 3. File type relevance based on question context
    const lowerQuestion = question.toLowerCase();

    // Service-related questions
    if (
      (lowerQuestion.includes('service') || lowerQuestion.includes('business logic')) &&
      fileName.includes('service')
    ) {
      score += 12;
      reasons.push('service file for service-related question');
    }

    // Controller/API questions
    if (
      (lowerQuestion.includes('api') ||
        lowerQuestion.includes('endpoint') ||
        lowerQuestion.includes('route') ||
        lowerQuestion.includes('controller')) &&
      (fileName.includes('controller') || fileName.includes('route') || fileName.includes('api'))
    ) {
      score += 12;
      reasons.push('controller/route file for API-related question');
    }

    // Data/model questions
    if (
      (lowerQuestion.includes('model') ||
        lowerQuestion.includes('entity') ||
        lowerQuestion.includes('schema') ||
        lowerQuestion.includes('data')) &&
      (fileName.includes('model') ||
        fileName.includes('entity') ||
        fileName.includes('schema') ||
        fileName.includes('dto'))
    ) {
      score += 12;
      reasons.push('data model file for schema-related question');
    }

    // Authentication/security questions
    if (
      (lowerQuestion.includes('auth') ||
        lowerQuestion.includes('security') ||
        lowerQuestion.includes('login')) &&
      (fileName.includes('auth') || fileName.includes('security') || fileName.includes('guard'))
    ) {
      score += 15;
      reasons.push('auth/security file for security-related question');
    }

    // Configuration questions
    if (
      lowerQuestion.includes('config') &&
      (fileName.includes('config') || fileName.includes('settings') || fileName.includes('.env'))
    ) {
      score += 12;
      reasons.push('configuration file for config-related question');
    }

    // Error handling questions
    if (
      (lowerQuestion.includes('error') || lowerQuestion.includes('exception')) &&
      (fileName.includes('error') ||
        fileName.includes('exception') ||
        fileName.includes('filter') ||
        fileName.includes('handler'))
    ) {
      score += 12;
      reasons.push('error handling file for error-related question');
    }

    // Testing questions
    if (
      lowerQuestion.includes('test') &&
      (fileName.includes('.test.') || fileName.includes('.spec.') || dirName.includes('test'))
    ) {
      score += 10;
      reasons.push('test file for testing-related question');
    }

    // 4. Penalize test files for non-testing questions
    if (
      !lowerQuestion.includes('test') &&
      (fileName.includes('.test.') || fileName.includes('.spec.'))
    ) {
      score = Math.max(0, score - 5);
      reasons.push('test file (penalty for non-testing question)');
    }

    // 5. Boost for main/index files
    if (fileName === 'index.ts' || fileName === 'main.ts' || fileName === 'app.ts') {
      score += 5;
      reasons.push('main entry file');
    }

    return { score, reasons };
  }

  /**
   * Update cache with LRU eviction
   */
  private updateCache(filePath: string, content: string): void {
    // If cache is full, remove oldest entry
    if (this.fileCache.size >= this.maxCacheSize) {
      const firstKey = this.fileCache.keys().next().value;
      if (firstKey) {
        this.fileCache.delete(firstKey);
      }
    }

    this.fileCache.set(filePath, content);
  }
}
