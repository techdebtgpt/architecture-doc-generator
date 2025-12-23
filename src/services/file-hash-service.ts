import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '../utils/logger';

/**
 * Hash cache structure
 */
interface FileHashCache {
  version: string;
  timestamp: string;
  hashes: Record<string, string>; // filepath -> hash
}

/**
 * Service for file hashing to detect changes in non-Git projects
 */
export class FileHashService {
  private logger = new Logger('FileHashService');
  private static instance: FileHashService;
  private readonly CACHE_VERSION = '1.0.0';

  private constructor() {}

  public static getInstance(): FileHashService {
    if (!FileHashService.instance) {
      FileHashService.instance = new FileHashService();
    }
    return FileHashService.instance;
  }

  /**
   * Calculate hash of file contents
   */
  public async calculateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      this.logger.debug(`Failed to hash ${filePath}: ${(error as Error).message}`);
      return '';
    }
  }

  /**
   * Load hash cache from disk
   */
  public async loadHashCache(cacheDir: string): Promise<FileHashCache | null> {
    try {
      const cachePath = path.join(cacheDir, 'file-hashes.json');
      const content = await fs.readFile(cachePath, 'utf-8');
      const cache = JSON.parse(content) as FileHashCache;

      if (cache.version !== this.CACHE_VERSION) {
        this.logger.warn(`Hash cache version mismatch: ${cache.version} vs ${this.CACHE_VERSION}`);
        return null;
      }

      this.logger.debug(`Loaded hash cache with ${Object.keys(cache.hashes).length} entries`);
      return cache;
    } catch (error) {
      this.logger.debug(`Failed to load hash cache: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Save hash cache to disk
   */
  public async saveHashCache(cacheDir: string, hashes: Record<string, string>): Promise<void> {
    try {
      await fs.mkdir(cacheDir, { recursive: true });

      const cache: FileHashCache = {
        version: this.CACHE_VERSION,
        timestamp: new Date().toISOString(),
        hashes,
      };

      const cachePath = path.join(cacheDir, 'file-hashes.json');
      await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8');

      this.logger.debug(`Saved hash cache with ${Object.keys(hashes).length} entries`);
    } catch (error) {
      this.logger.warn(`Failed to save hash cache: ${(error as Error).message}`);
    }
  }

  /**
   * Get changed files by comparing current hashes with cached hashes
   * @returns Object with changed, new, and deleted file paths
   */
  public async getChangedFiles(
    projectPath: string,
    currentFiles: string[],
    cacheDir: string,
  ): Promise<{
    changed: string[];
    new: string[];
    deleted: string[];
    unchanged: string[];
  }> {
    const cache = await this.loadHashCache(cacheDir);

    if (!cache) {
      // No cache exists, all files are "new"
      this.logger.info('No hash cache found, treating all files as new');
      return {
        changed: [],
        new: currentFiles,
        deleted: [],
        unchanged: [],
      };
    }

    const changed: string[] = [];
    const newFiles: string[] = [];
    const unchanged: string[] = [];
    const currentHashes: Record<string, string> = {};

    // Check each current file
    for (const file of currentFiles) {
      const fullPath = path.join(projectPath, file);
      const currentHash = await this.calculateFileHash(fullPath);

      if (!currentHash) {
        continue; // Skip files we can't hash
      }

      currentHashes[file] = currentHash;

      const cachedHash = cache.hashes[file];

      if (!cachedHash) {
        // File is new
        newFiles.push(file);
      } else if (cachedHash !== currentHash) {
        // File has changed
        changed.push(file);
      } else {
        // File is unchanged
        unchanged.push(file);
      }
    }

    // Find deleted files (in cache but not in current files)
    const currentFileSet = new Set(currentFiles);
    const deleted = Object.keys(cache.hashes).filter((file) => !currentFileSet.has(file));

    // Save updated hash cache
    await this.saveHashCache(cacheDir, currentHashes);

    this.logger.info(
      `Hash comparison: ${changed.length} changed, ${newFiles.length} new, ${deleted.length} deleted, ${unchanged.length} unchanged`,
    );

    return { changed, new: newFiles, deleted, unchanged };
  }

  /**
   * Calculate hashes for all files and save to cache
   */
  public async buildHashCache(
    projectPath: string,
    files: string[],
    cacheDir: string,
  ): Promise<void> {
    const hashes: Record<string, string> = {};

    for (const file of files) {
      const fullPath = path.join(projectPath, file);
      const hash = await this.calculateFileHash(fullPath);
      if (hash) {
        hashes[file] = hash;
      }
    }

    await this.saveHashCache(cacheDir, hashes);
    this.logger.info(`Built hash cache for ${Object.keys(hashes).length} files`);
  }
}
