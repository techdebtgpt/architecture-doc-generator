import { VectorSearchService, FileContent } from './vector-search.service';
import { Logger } from '../utils/logger';
import type { DependencyGraphData } from './vector-search.service';

/**
 * Hybrid retrieval strategy combining vector search and graph traversal
 */
export enum RetrievalStrategy {
  VECTOR_ONLY = 'vector', // Pure semantic similarity
  GRAPH_ONLY = 'graph', // Pure dependency/import relationships
  HYBRID = 'hybrid', // Combine both (default)
  SMART = 'smart', // Adaptive based on query type
}

/**
 * Enhanced file result with relationship information
 */
export interface HybridFileResult extends FileContent {
  relevanceScore: number;
  matchReasons: string[];
  relationships?: {
    imports: string[]; // Files this file imports
    importedBy: string[]; // Files that import this file
    sameModule: string[]; // Files in the same module
    inheritance?: string[]; // Classes this extends/implements
  };
  rank: number; // Combined ranking score
}

/**
 * Hybrid retrieval configuration
 */
export interface HybridRetrievalConfig {
  strategy?: RetrievalStrategy;
  topK?: number;
  vectorWeight?: number; // 0-1, weight for vector similarity (default: 0.6)
  graphWeight?: number; // 0-1, weight for graph relationships (default: 0.4)
  includeRelatedFiles?: boolean; // Include files related via imports/modules
  maxDepth?: number; // Max graph traversal depth (default: 2)
  similarityThreshold?: number; // Min similarity for vector results
}

/**
 * Hybrid Retrieval Service
 * Combines vector search (semantic similarity) with dependency graph (structural relationships)
 *
 * Use cases:
 * 1. Find files semantically related to a query (vector)
 * 2. Find files structurally related via imports/modules (graph)
 * 3. Combine both for better context (hybrid)
 *
 * Example:
 * Query: "authentication logic"
 * - Vector: Finds auth-related files by content similarity
 * - Graph: Adds files that import/export auth modules
 * - Result: Complete authentication context including dependencies
 */
export class HybridRetrievalService {
  private logger = new Logger('HybridRetrievalService');

  constructor(
    private readonly vectorService: VectorSearchService,
    private readonly dependencyGraph?: DependencyGraphData,
  ) {}

  /**
   * Retrieve files using hybrid strategy
   */
  async retrieve(query: string, config: HybridRetrievalConfig = {}): Promise<HybridFileResult[]> {
    const strategy = config.strategy || RetrievalStrategy.HYBRID;
    const topK = config.topK || 10;
    const vectorWeight = config.vectorWeight ?? 0.6;
    const graphWeight = config.graphWeight ?? 0.4;

    this.logger.debug(
      `Retrieving with strategy: ${strategy}, query: "${query.substring(0, 50)}..."`,
    );

    // Adaptive strategy based on query
    const adaptedStrategy =
      strategy === RetrievalStrategy.SMART ? this.detectQueryType(query) : strategy;

    switch (adaptedStrategy) {
      case RetrievalStrategy.VECTOR_ONLY:
        return this.retrieveVectorOnly(query, topK, config);

      case RetrievalStrategy.GRAPH_ONLY:
        return this.retrieveGraphOnly(query, topK, config);

      case RetrievalStrategy.HYBRID:
      default:
        return this.retrieveHybrid(query, topK, vectorWeight, graphWeight, config);
    }
  }

  /**
   * Vector-only retrieval (semantic similarity)
   */
  private async retrieveVectorOnly(
    query: string,
    topK: number,
    config: HybridRetrievalConfig,
  ): Promise<HybridFileResult[]> {
    this.logger.debug('Using vector-only retrieval');

    const vectorResults = await this.vectorService.searchFiles(query, {
      topK,
      similarityThreshold: config.similarityThreshold,
    });

    return vectorResults.map((file, idx) => ({
      ...file,
      relevanceScore: file.relevanceScore || 0,
      matchReasons: ['Semantic similarity'],
      rank: idx + 1,
    }));
  }

  /**
   * Graph-only retrieval (dependency relationships)
   */
  private async retrieveGraphOnly(
    query: string,
    topK: number,
    config: HybridRetrievalConfig,
  ): Promise<HybridFileResult[]> {
    this.logger.debug('Using graph-only retrieval');

    if (!this.dependencyGraph) {
      this.logger.warn('No dependency graph available, falling back to vector search');
      return this.retrieveVectorOnly(query, topK, config);
    }

    // Extract keywords from query for graph matching
    const keywords = this.extractKeywords(query);

    // Find matching files in graph by keywords
    const matchedFiles = this.findFilesInGraph(keywords);

    // Enhance with relationships
    return matchedFiles.slice(0, topK).map((filePath, idx) => ({
      path: filePath,
      content: '', // Would need to load content separately
      truncated: false,
      size: 0,
      relevanceScore: 1 - idx / matchedFiles.length,
      matchReasons: ['Dependency graph match'],
      relationships: this.getFileRelationships(filePath),
      rank: idx + 1,
    }));
  }

  /**
   * Hybrid retrieval (combine vector + graph)
   */
  private async retrieveHybrid(
    query: string,
    topK: number,
    vectorWeight: number,
    graphWeight: number,
    config: HybridRetrievalConfig,
  ): Promise<HybridFileResult[]> {
    this.logger.debug(`Using hybrid retrieval (vector: ${vectorWeight}, graph: ${graphWeight})`);

    // Step 1: Get vector search results
    const vectorResults = await this.vectorService.searchFiles(query, {
      topK: topK * 2, // Get more for re-ranking
      similarityThreshold: config.similarityThreshold || 0.3,
    });

    this.logger.debug(`Vector search returned ${vectorResults.length} results`);

    // Step 2: Build file score map
    const fileScores = new Map<string, HybridFileResult>();

    // Add vector results with weighted scores
    vectorResults.forEach((file) => {
      fileScores.set(file.path, {
        ...file,
        relevanceScore: file.relevanceScore || 0,
        matchReasons: ['Vector similarity'],
        rank: 0,
      });
    });

    // Step 3: Enhance with graph relationships
    if (this.dependencyGraph && config.includeRelatedFiles !== false) {
      const filePaths = Array.from(fileScores.keys());

      for (const filePath of filePaths) {
        const relationships = this.getFileRelationships(filePath);
        const currentFile = fileScores.get(filePath)!;

        // Update relationships
        currentFile.relationships = relationships;

        // Boost score based on graph centrality
        const graphScore = this.calculateGraphScore(relationships);
        const currentScore = currentFile.relevanceScore;
        const combinedScore = currentScore * vectorWeight + graphScore * graphWeight;

        currentFile.relevanceScore = combinedScore;
        currentFile.matchReasons.push(`Graph score: ${graphScore.toFixed(2)}`);

        // Add related files with lower scores
        if (config.maxDepth && config.maxDepth > 0 && relationships) {
          const relatedFiles = [
            ...relationships.imports.slice(0, 3),
            ...relationships.importedBy.slice(0, 3),
            ...relationships.sameModule.slice(0, 2),
          ];

          for (const relatedPath of relatedFiles) {
            if (!fileScores.has(relatedPath)) {
              // Add related file with propagated score
              const propagatedScore = combinedScore * 0.3; // 30% of parent score

              fileScores.set(relatedPath, {
                path: relatedPath,
                content: '', // Would be loaded on demand
                truncated: false,
                size: 0,
                relevanceScore: propagatedScore,
                matchReasons: [`Related to ${filePath.split('/').pop()}`],
                relationships: this.getFileRelationships(relatedPath),
                rank: 0,
              });
            }
          }
        }
      }
    }

    // Step 4: Sort by combined score and return top K
    const rankedResults = Array.from(fileScores.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK)
      .map((file, idx) => ({
        ...file,
        rank: idx + 1,
      }));

    this.logger.info(`Hybrid retrieval returned ${rankedResults.length} results`);

    return rankedResults;
  }

  /**
   * Get file relationships from dependency graph
   */
  private getFileRelationships(filePath: string): HybridFileResult['relationships'] {
    if (!this.dependencyGraph) {
      return { imports: [], importedBy: [], sameModule: [] };
    }

    // Files this file imports
    const imports = this.dependencyGraph.imports
      .filter((imp) => imp.source === filePath && imp.resolvedPath)
      .map((imp) => imp.resolvedPath!);

    // Files that import this file
    const importedBy = this.dependencyGraph.imports
      .filter((imp) => imp.resolvedPath === filePath)
      .map((imp) => imp.source);

    // Files in the same module
    const module = this.dependencyGraph.modules.find((m) => m.files.includes(filePath));
    const sameModule = module ? module.files.filter((f) => f !== filePath) : [];

    return {
      imports: [...new Set(imports)],
      importedBy: [...new Set(importedBy)],
      sameModule: [...new Set(sameModule)],
    };
  }

  /**
   * Calculate graph-based score (centrality measure)
   * Files with more connections are more central/important
   */
  private calculateGraphScore(relationships: HybridFileResult['relationships']): number {
    if (!relationships) return 0;

    const importCount = relationships.imports.length;
    const importedByCount = relationships.importedBy.length;
    const moduleCount = relationships.sameModule.length;

    // Weighted centrality score
    // Being imported by others is more important (0.5) than importing (0.3)
    const score =
      importedByCount * 0.5 + // High value for files others depend on
      importCount * 0.3 + // Medium value for files with dependencies
      moduleCount * 0.2; // Lower value for module cohesion

    // Normalize to 0-1 range (assuming max 10 connections of each type)
    return Math.min(score / 10, 1);
  }

  /**
   * Detect query type to choose optimal strategy
   */
  private detectQueryType(query: string): RetrievalStrategy {
    const lowerQuery = query.toLowerCase();

    // Keywords suggesting structural/graph queries
    const graphKeywords = [
      'import',
      'depend',
      'call',
      'extend',
      'implement',
      'inherit',
      'module',
      'related to',
      'connected',
      'uses',
    ];

    // Keywords suggesting semantic/concept queries
    const vectorKeywords = [
      'authentication',
      'security',
      'validation',
      'processing',
      'handling',
      'logic',
      'implementation',
      'algorithm',
    ];

    const hasGraphKeywords = graphKeywords.some((kw) => lowerQuery.includes(kw));
    const hasVectorKeywords = vectorKeywords.some((kw) => lowerQuery.includes(kw));

    if (hasGraphKeywords && !hasVectorKeywords) {
      return RetrievalStrategy.GRAPH_ONLY;
    } else if (hasVectorKeywords && !hasGraphKeywords) {
      return RetrievalStrategy.VECTOR_ONLY;
    } else {
      return RetrievalStrategy.HYBRID;
    }
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3); // Filter short words
  }

  /**
   * Find files in graph matching keywords
   */
  private findFilesInGraph(keywords: string[]): string[] {
    if (!this.dependencyGraph) return [];

    const matchedFiles = new Set<string>();

    // Search in graph nodes
    for (const node of this.dependencyGraph.graph.nodes) {
      const nodeName = node.name.toLowerCase();
      if (keywords.some((kw) => nodeName.includes(kw))) {
        if (node.type === 'file') {
          matchedFiles.add(node.id);
        }
      }
    }

    // Search in modules
    for (const module of this.dependencyGraph.modules) {
      const moduleName = module.name.toLowerCase();
      if (keywords.some((kw) => moduleName.includes(kw))) {
        module.files.forEach((f) => matchedFiles.add(f));
      }
    }

    return Array.from(matchedFiles);
  }

  /**
   * Get statistics about retrieval performance
   */
  getStats(): {
    hasVectorStore: boolean;
    hasDependencyGraph: boolean;
    graphStats?: {
      totalNodes: number;
      totalEdges: number;
      modules: number;
    };
  } {
    return {
      hasVectorStore: !!this.vectorService,
      hasDependencyGraph: !!this.dependencyGraph,
      graphStats: this.dependencyGraph
        ? {
            totalNodes: this.dependencyGraph.graph.nodes.length,
            totalEdges: this.dependencyGraph.graph.edges.length,
            modules: this.dependencyGraph.modules.length,
          }
        : undefined,
    };
  }
}
