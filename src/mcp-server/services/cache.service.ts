/**
 * Cache Service for MCP-Aware Execution
 * Manages analysis cache to enable instant responses in MCP mode
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { Logger } from '../../utils/logger';

const logger = new Logger('CacheService');

/**
 * Cache metadata
 */
export interface CacheMetadata {
  version: string;
  projectPath: string;
  generatedAt: string;
  agentsExecuted: string[];
  totalTokens: number;
  filesCount: number;
  configHash?: string; // Hash of the config to detect changes
}

/**
 * Cache Service
 */
export class CacheService {
  private static instance: CacheService;

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get cache directory for a project
   */
  private getCacheDir(projectPath: string): string {
    return path.join(projectPath, '.arch-docs');
  }

  /**
   * Get cache metadata file path
   */
  private getMetadataPath(projectPath: string): string {
    return path.join(this.getCacheDir(projectPath), '.cache-metadata.json');
  }

  /**
   * Check if cache exists and is valid
   */
  async isCacheValid(projectPath: string, maxAge?: number): Promise<boolean> {
    try {
      const metadataPath = this.getMetadataPath(projectPath);
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata: CacheMetadata = JSON.parse(content);

      // Check if cache exists
      const cacheDir = this.getCacheDir(projectPath);
      const files = await fs.readdir(cacheDir);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      if (mdFiles.length === 0) {
        logger.debug('Cache invalid: no markdown files found');
        return false;
      }

      // Check age if specified
      if (maxAge) {
        const generatedAt = new Date(metadata.generatedAt);
        const age = Date.now() - generatedAt.getTime();
        if (age > maxAge) {
          logger.debug(`Cache expired: ${age}ms > ${maxAge}ms`);
          return false;
        }
      }

      logger.debug('Cache valid', {
        filesCount: mdFiles.length,
        generatedAt: metadata.generatedAt,
      });
      return true;
    } catch (error) {
      logger.debug('Cache invalid or missing', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get cache metadata
   */
  async getCacheMetadata(projectPath: string): Promise<CacheMetadata | null> {
    try {
      const metadataPath = this.getMetadataPath(projectPath);
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.debug('Failed to read cache metadata', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Save cache metadata
   */
  async saveCacheMetadata(projectPath: string, metadata: CacheMetadata): Promise<void> {
    try {
      const metadataPath = this.getMetadataPath(projectPath);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
      logger.debug('Cache metadata saved', { projectPath });
    } catch (error) {
      logger.warn('Failed to save cache metadata', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Read cached documentation
   */
  async readCachedDocs(projectPath: string): Promise<string> {
    const cacheDir = this.getCacheDir(projectPath);
    const files = await fs.readdir(cacheDir);
    const mdFiles = files.filter((f) => f.endsWith('.md') && !f.startsWith('.'));

    let content = '';
    for (const file of mdFiles) {
      const filePath = path.join(cacheDir, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      content += `\n\n--- ${file} ---\n\n${fileContent}`;
    }

    return content;
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(projectPath: string): Promise<void> {
    try {
      const metadataPath = this.getMetadataPath(projectPath);
      await fs.unlink(metadataPath);
      logger.info('Cache invalidated', { projectPath });
    } catch (error) {
      logger.debug('Failed to invalidate cache (may not exist)', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(projectPath: string): Promise<{
    exists: boolean;
    filesCount: number;
    totalSize: number;
    age?: number;
  }> {
    try {
      const cacheDir = this.getCacheDir(projectPath);
      const files = await fs.readdir(cacheDir);
      const mdFiles = files.filter((f) => f.endsWith('.md') && !f.startsWith('.'));

      let totalSize = 0;
      for (const file of mdFiles) {
        const filePath = path.join(cacheDir, file);
        const stat = await fs.stat(filePath);
        totalSize += stat.size;
      }

      const metadata = await this.getCacheMetadata(projectPath);
      const age = metadata ? Date.now() - new Date(metadata.generatedAt).getTime() : undefined;

      return {
        exists: mdFiles.length > 0,
        filesCount: mdFiles.length,
        totalSize,
        age,
      };
    } catch {
      return {
        exists: false,
        filesCount: 0,
        totalSize: 0,
      };
    }
  }
}
