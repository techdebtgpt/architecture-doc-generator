import { promises as fs } from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { PerformanceTracker } from '../utils/performance-tracker';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { OpenAIEmbeddings } from '@langchain/openai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { LocalEmbeddings } from './local-embeddings.service';
import { getExcludePatterns, getTestPatterns } from '../config/language-config';

/**
 * Supported embedding providers
 * Note:
 * - 'local' (FREE, default) - Simple local embeddings, no API key, works offline
 * - 'openai' - OpenAI embeddings ($0.02/1M tokens, requires API key)
 * - 'google' - Google Vertex AI embeddings (requires API key)
 * - 'cohere', 'voyage', 'huggingface' require additional packages:
 *   - @langchain/cohere (npm install @langchain/cohere)
 *   - @langchain/community (for Voyage and HuggingFace)
 */
export type EmbeddingsProvider =
  | 'local'
  | 'openai'
  | 'google'
  | 'cohere'
  | 'voyage'
  | 'huggingface';

/**
 * Embeddings configuration
 */
export interface EmbeddingsConfig {
  provider: EmbeddingsProvider;
  apiKey?: string;
  model?: string;
}

/**
 * Create embeddings instance based on provider configuration
 */
export function createEmbeddings(config: EmbeddingsConfig): Embeddings {
  const logger = new Logger('EmbeddingsFactory');

  switch (config.provider) {
    case 'local': {
      logger.info('Using local TF-IDF embeddings (free, offline)');
      return new LocalEmbeddings({
        dimensions: 128, // Smaller vectors for local embeddings
      });
    }

    case 'openai': {
      const apiKey =
        config.apiKey || process.env.OPENAI_EMBEDDINGS_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'OpenAI embeddings require OPENAI_EMBEDDINGS_KEY or OPENAI_API_KEY environment variable',
        );
      }
      return new OpenAIEmbeddings({
        modelName: config.model || 'text-embedding-3-small',
        maxRetries: 3,
        openAIApiKey: apiKey,
      });
    }

    case 'google': {
      const apiKey = config.apiKey || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('Google embeddings require GOOGLE_API_KEY environment variable');
      }
      return new GoogleGenerativeAIEmbeddings({
        modelName: config.model || 'text-embedding-004',
        apiKey,
      });
    }

    case 'cohere':
      logger.warn('Cohere embeddings not yet implemented. Install @langchain/cohere package.');
      throw new Error(
        'Cohere embeddings require @langchain/cohere package. Run: npm install @langchain/cohere',
      );

    case 'voyage':
      logger.warn(
        'Voyage AI embeddings not yet implemented. Install @langchain/community package.',
      );
      throw new Error(
        'Voyage AI embeddings require @langchain/community package. Run: npm install @langchain/community',
      );

    case 'huggingface':
      logger.warn(
        'HuggingFace embeddings not yet implemented. Install @langchain/community package.',
      );
      throw new Error(
        'HuggingFace embeddings require @langchain/community package. Run: npm install @langchain/community',
      );

    default:
      throw new Error(`Unsupported embeddings provider: ${config.provider}`);
  }
}

/**
 * File content with metadata
 */
export interface FileContent {
  path: string;
  content: string;
  truncated: boolean;
  size: number;
  relevanceScore?: number;
}

/**
 * Search configuration
 */
export interface VectorSearchConfig {
  topK?: number; // Number of files to return
  maxFileSize?: number; // Max bytes per file
  includeExtensions?: string[]; // Only search these extensions
  excludePatterns?: string[]; // Exclude paths matching these patterns
  similarityThreshold?: number; // Minimum similarity score (0-1)
}

/**
 * Dependency graph for enhanced search
 */
export interface DependencyGraphData {
  imports: Array<{
    source: string;
    target: string;
    imports?: string[];
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
 * RAG-based vector search service using in-memory embeddings
 * Provides semantic similarity search instead of keyword-based matching
 */
export class VectorSearchService {
  private logger = new Logger('VectorSearchService');
  private vectorStore?: MemoryVectorStore;
  private embeddings: Embeddings;
  private fileCache = new Map<string, string>(); // LRU cache for file contents
  private maxCacheSize = 50; // Max number of files to cache
  private dependencyGraph?: DependencyGraphData;
  private isInitialized = false;

  constructor(
    private projectPath: string,
    dependencyGraph?: DependencyGraphData,
    embeddingsConfigOrInstance?: EmbeddingsConfig | Embeddings,
  ) {
    this.dependencyGraph = dependencyGraph;

    // Support both EmbeddingsConfig and Embeddings instance for backwards compatibility
    if (embeddingsConfigOrInstance && 'embedDocuments' in embeddingsConfigOrInstance) {
      // It's an Embeddings instance
      this.embeddings = embeddingsConfigOrInstance;
    } else if (embeddingsConfigOrInstance) {
      // It's an EmbeddingsConfig
      this.embeddings = createEmbeddings(embeddingsConfigOrInstance as EmbeddingsConfig);
    } else {
      // Default: OpenAI embeddings
      this.embeddings = createEmbeddings({
        provider: 'openai',
        model: 'text-embedding-3-small',
      });
    }
  }

  /**
   * Initialize the vector store with file contents
   * Must be called before searching
   */
  public async initialize(
    availableFiles: string[],
    config: VectorSearchConfig = {},
  ): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('Vector store already initialized, skipping');
      return;
    }

    this.logger.info(`Initializing vector store with ${availableFiles.length} files...`);
    const startTime = Date.now();
    const perfTracker = new PerformanceTracker();
    perfTracker.start();

    const excludePatterns = config.excludePatterns ?? getExcludePatterns();
    const maxFileSize = config.maxFileSize ?? 100000; // 100KB default

    // Filter files
    const filteredFiles = availableFiles.filter((filePath) => {
      // Skip excluded patterns
      if (excludePatterns.some((pattern) => filePath.includes(pattern))) {
        return false;
      }

      // Skip test files by default (can override with includeExtensions)
      if (this.isTestFile(filePath) && !config.includeExtensions) {
        return false;
      }

      // Check extension if specified
      if (config.includeExtensions && config.includeExtensions.length > 0) {
        const ext = path.extname(filePath);
        return config.includeExtensions.includes(ext);
      }

      return true;
    });

    this.logger.info(
      `Filtered to ${filteredFiles.length} files (excluded ${availableFiles.length - filteredFiles.length})`,
    );

    // Load file contents and create documents
    const documents: Document[] = [];
    const batchSize = 50; // Process in batches to show progress
    let loadedCount = 0;
    let skippedCount = 0;

    this.logger.info(`Loading ${filteredFiles.length} files into memory...`);

    for (let i = 0; i < filteredFiles.length; i += batchSize) {
      const batch = filteredFiles.slice(i, Math.min(i + batchSize, filteredFiles.length));

      for (const filePath of batch) {
        try {
          const fullPath = path.isAbsolute(filePath)
            ? filePath
            : path.join(this.projectPath, filePath);

          const stat = await fs.stat(fullPath);

          // Skip files that are too large
          if (stat.size > maxFileSize * 2) {
            skippedCount++;
            this.logger.debug(`Skipped (too large): ${filePath} (${stat.size} bytes)`);
            continue;
          }

          const content = await fs.readFile(fullPath, 'utf-8');

          // Truncate if needed
          const finalContent =
            content.length > maxFileSize ? content.substring(0, maxFileSize) : content;

          // Create document with metadata
          documents.push(
            new Document({
              pageContent: finalContent,
              metadata: {
                path: filePath,
                filename: path.basename(filePath),
                extension: path.extname(filePath),
                size: stat.size,
                directory: path.dirname(filePath),
              },
            }),
          );

          // Cache the content
          this.updateCache(filePath, content);
          loadedCount++;
        } catch (error) {
          skippedCount++;
          this.logger.debug(`Failed to load file: ${filePath}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Log progress with loader bar
      const processed = Math.min(i + batchSize, filteredFiles.length);
      const percentage = ((processed / filteredFiles.length) * 100).toFixed(1);
      const barLength = 20;
      const filledLength = Math.round((processed / filteredFiles.length) * barLength);
      const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

      this.logger.info(
        `📂 Loading files: [${bar}] ${percentage}% (${loadedCount} loaded, ${skippedCount} skipped)`,
      );
    }

    if (documents.length === 0) {
      this.logger.warn('No documents loaded - vector store will be empty');
      this.logger.warn(`Attempted: ${filteredFiles.length}, Loaded: 0, Skipped: ${skippedCount}`);
      this.isInitialized = true;
      return;
    }

    this.logger.info(
      `✓ Loaded ${documents.length} documents (${loadedCount} files, ${skippedCount} skipped)`,
    );

    // Create vector store with embeddings
    this.logger.info(`🔧 Creating embeddings for ${documents.length} documents...`);
    this.vectorStore = await MemoryVectorStore.fromDocuments(documents, this.embeddings);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const perfMetrics = perfTracker.end();
    this.logger.info(
      `Vector store initialized in ${duration}s with ${documents.length} documents | ${PerformanceTracker.formatMetrics(perfMetrics)}`,
    );
    this.isInitialized = true;
  }

  /**
   * Search files using semantic similarity
   * Returns files sorted by relevance to the query
   */
  public async searchFiles(query: string, config: VectorSearchConfig = {}): Promise<FileContent[]> {
    if (!this.isInitialized || !this.vectorStore) {
      throw new Error('Vector store not initialized. Call initialize() before searching.');
    }

    const topK = config.topK ?? 5;
    const similarityThreshold = config.similarityThreshold ?? 0.5;

    this.logger.debug(`Searching for: "${query.substring(0, 100)}..." (topK=${topK})`);

    // Perform similarity search with scores
    const results = await this.vectorStore.similaritySearchWithScore(query, topK * 2); // Get extra for filtering

    // Filter by similarity threshold and convert to FileContent
    const fileContents: FileContent[] = [];

    for (const [doc, score] of results) {
      // Convert score to similarity (cosine similarity, higher is better)
      const similarity = 1 - score; // MemoryVectorStore returns distance, not similarity

      if (similarity < similarityThreshold) {
        continue;
      }

      const filePath = doc.metadata.path as string;

      // Get full content from cache or disk
      let content = this.fileCache.get(filePath);
      if (!content) {
        try {
          const fullPath = path.isAbsolute(filePath)
            ? filePath
            : path.join(this.projectPath, filePath);
          content = await fs.readFile(fullPath, 'utf-8');
          this.updateCache(filePath, content);
        } catch (error) {
          this.logger.debug(`Failed to read file: ${filePath}`, {
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
      }

      const maxFileSize = config.maxFileSize ?? 100000;
      const truncated = content.length > maxFileSize;
      const finalContent = truncated ? content.substring(0, maxFileSize) : content;

      fileContents.push({
        path: filePath,
        content: finalContent,
        truncated,
        size: content.length,
        relevanceScore: similarity,
      });

      if (fileContents.length >= topK) {
        break;
      }
    }

    // Enhance with dependency graph if available
    if (this.dependencyGraph && fileContents.length > 0) {
      const relatedFiles = await this.findRelatedFiles(
        fileContents.map((f) => f.path),
        Math.min(topK, 5),
        config.maxFileSize,
      );

      this.logger.debug(`Enhanced with ${relatedFiles.length} related files from dependency graph`);

      // Merge and deduplicate
      const fileMap = new Map(fileContents.map((f) => [f.path, f]));
      for (const related of relatedFiles) {
        if (!fileMap.has(related.path)) {
          fileMap.set(related.path, related);
        }
      }

      const combined = Array.from(fileMap.values());
      combined.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
      return combined.slice(0, topK * 2); // Allow some extra related files
    }

    this.logger.info(
      `Found ${fileContents.length} files with similarity >= ${similarityThreshold}`,
    );

    return fileContents;
  }

  /**
   * Find files related to the given files via dependency edges
   * Uses the dependency graph to traverse imports/exports
   */
  private async findRelatedFiles(
    filePaths: string[],
    maxRelated: number = 5,
    maxFileSize?: number,
  ): Promise<FileContent[]> {
    if (!this.dependencyGraph) {
      return [];
    }

    const related = new Map<string, number>();

    // For each file, find files it imports and files that import it
    for (const filePath of filePaths) {
      // Find files this file imports (dependencies)
      const imports = this.dependencyGraph.imports.filter((imp) => imp.source === filePath);
      for (const imp of imports) {
        if (imp.resolvedPath && imp.type === 'local') {
          const current = related.get(imp.resolvedPath) || 0;
          related.set(imp.resolvedPath, current + 0.4); // Relevance boost for imports
        }
      }

      // Find files that import this file (dependents)
      const importers = this.dependencyGraph.imports.filter((imp) => imp.resolvedPath === filePath);
      for (const importer of importers) {
        const current = related.get(importer.source) || 0;
        related.set(importer.source, current + 0.3); // Relevance boost for importers
      }

      // Find files in the same module
      const module = this.dependencyGraph.modules.find((m) => m.files.includes(filePath));
      if (module) {
        for (const moduleFile of module.files) {
          if (moduleFile !== filePath) {
            const current = related.get(moduleFile) || 0;
            related.set(moduleFile, current + 0.2); // Relevance boost for same module
          }
        }
      }
    }

    // Convert to FileContent array
    const relatedArray: FileContent[] = [];

    for (const [filePath, relevanceScore] of related.entries()) {
      try {
        // Get content from cache or disk
        let content = this.fileCache.get(filePath);
        if (!content) {
          const fullPath = path.isAbsolute(filePath)
            ? filePath
            : path.join(this.projectPath, filePath);
          content = await fs.readFile(fullPath, 'utf-8');
          this.updateCache(filePath, content);
        }

        const size = maxFileSize ?? 100000;
        const truncated = content.length > size;
        const finalContent = truncated ? content.substring(0, size) : content;

        relatedArray.push({
          path: filePath,
          content: finalContent,
          truncated,
          size: content.length,
          relevanceScore,
        });
      } catch (error) {
        this.logger.debug(`Failed to read related file: ${filePath}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Sort by relevance and return top
    relatedArray.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    return relatedArray.slice(0, maxRelated);
  }

  /**
   * Clear the vector store and cache
   */
  public clear(): void {
    this.vectorStore = undefined;
    this.fileCache.clear();
    this.isInitialized = false;
  }

  /**
   * Check if a file is a test file based on centralized test patterns
   */
  private isTestFile(filePath: string): boolean {
    const fileName = filePath.toLowerCase();
    const testPatterns = getTestPatterns();
    return testPatterns.some((pattern) => fileName.includes(pattern.toLowerCase()));
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

  /**
   * Get embedding statistics
   */
  public getStats(): {
    initialized: boolean;
    documentCount: number;
    cacheSize: number;
  } {
    return {
      initialized: this.isInitialized,
      documentCount: this.vectorStore ? (this.vectorStore['memoryVectors']?.length ?? 0) : 0,
      cacheSize: this.fileCache.size,
    };
  }
}
