/**
 * Vector Store Service
 * Manages RAG vector store lifecycle and queries
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { Logger } from '../../utils/logger';
import { VectorStore } from '../types';

const logger = new Logger('VectorStoreService');

/**
 * Vector store service with singleton pattern
 */
export class VectorStoreService {
  private static instance: VectorStoreService;
  private vectorStore: VectorStore | null = null;
  private lastInitPath: string | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): VectorStoreService {
    if (!VectorStoreService.instance) {
      VectorStoreService.instance = new VectorStoreService();
    }
    return VectorStoreService.instance;
  }

  /**
   * Initialize vector store for a documentation path
   */
  async initialize(docsPath: string): Promise<VectorStore | null> {
    // Return cached if same path
    if (this.vectorStore && this.lastInitPath === docsPath && this.vectorStore.isReady?.()) {
      return this.vectorStore;
    }

    logger.info('Initializing documentation vector store for RAG...');

    try {
      const { VectorSearchService } = await import('../../services/vector-search.service');

      // Load all markdown files from documentation
      const files = await fs.readdir(docsPath);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      if (mdFiles.length === 0) {
        logger.warn('No markdown files found in documentation path');
        return null;
      }

      const documents: { content: string; path: string; metadata: Record<string, unknown> }[] = [];

      for (const file of mdFiles) {
        const filePath = path.join(docsPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        documents.push({
          content,
          path: filePath,
          metadata: {
            filename: file,
            type: 'documentation',
            section: file.replace('.md', ''),
          },
        });
      }

      // Create in-memory vector store
      const vectorService = new VectorSearchService(docsPath, null as any, {
        provider: 'local', // Use free local embeddings
      });

      // Initialize with documentation content
      await vectorService.initialize(
        documents.map((d) => d.path),
        { maxFileSize: 1000000 },
      );

      // Create wrapper
      this.vectorStore = {
        query: async (question: string, topK = 5) => {
          const results = await vectorService.searchFiles(question, { topK });

          return results.map((r) => ({
            content: documents.find((d) => d.path === r.path)?.content || '',
            file: path.basename(r.path),
            score: r.relevanceScore || 0,
          }));
        },
        reload: async (newDocsPath: string) => {
          this.vectorStore = null;
          this.lastInitPath = null;
          await this.initialize(newDocsPath);
        },
        isReady: () => true,
      };

      this.lastInitPath = docsPath;

      logger.info(`✅ Vector store initialized with ${documents.length} documentation files`);

      return this.vectorStore;
    } catch (error) {
      logger.warn(
        `Failed to initialize vector store: ${error instanceof Error ? error.message : String(error)}`,
      );
      logger.info('RAG queries will fall back to keyword search');
      return null;
    }
  }

  /**
   * Query vector store
   */
  async query(
    question: string,
    topK = 5,
  ): Promise<Array<{ content: string; file: string; score: number }>> {
    if (!this.vectorStore) {
      return [];
    }

    return this.vectorStore.query(question, topK);
  }

  /**
   * Check if vector store is ready
   */
  isReady(): boolean {
    return this.vectorStore !== null && this.vectorStore.isReady?.();
  }

  /**
   * Reset vector store
   */
  reset(): void {
    this.vectorStore = null;
    this.lastInitPath = null;
  }
}
