import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger';

/**
 * Cache structure for storing the last analysis commit hash
 */
interface AnalysisCommitCache {
  version: string;
  commitHash: string;
  timestamp: string;
}

/**
 * Service for Git operations to detect changed files
 */
export class GitService {
  private logger = new Logger('GitService');
  private static instance: GitService;

  private constructor() {}

  public static getInstance(): GitService {
    if (!GitService.instance) {
      GitService.instance = new GitService();
    }
    return GitService.instance;
  }

  /**
   * Check if the given directory is a Git repository
   */
  public async isGitRepository(projectPath: string): Promise<boolean> {
    try {
      const gitDir = path.join(projectPath, '.git');
      const stats = await fs.stat(gitDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get the current Git commit hash
   */
  public getCurrentCommitHash(projectPath: string): string | null {
    try {
      const hash = execSync('git rev-parse HEAD', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      return hash;
    } catch (error) {
      this.logger.debug(`Failed to get current commit hash: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get list of changed files since a specific commit
   * @param projectPath - Project root directory
   * @param sinceCommit - Commit hash/branch/tag to compare against (from --since flag)
   * @param lastAnalysisCommit - Commit hash from the last analysis run (from cache)
   * @returns Array of changed file paths relative to project root
   */
  public getChangedFiles(
    projectPath: string,
    sinceCommit?: string,
    lastAnalysisCommit?: string,
  ): string[] {
    try {
      // Priority 1: Explicit --since flag (compare against specific commit/branch/tag)
      if (sinceCommit) {
        const changedFiles = execSync(`git diff --name-only ${sinceCommit}..HEAD`, {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        })
          .trim()
          .split('\n')
          .filter((f) => f.length > 0);

        this.logger.debug(`Found ${changedFiles.length} changed files since ${sinceCommit}`);
        return changedFiles;
      }

      // Priority 2: Compare against last analysis commit (from cache)
      if (lastAnalysisCommit) {
        // Get files changed between last analysis commit and HEAD (committed changes)
        const committedChanges = execSync(`git diff --name-only ${lastAnalysisCommit}..HEAD`, {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        })
          .trim()
          .split('\n')
          .filter((f) => f.length > 0);

        // Also include uncommitted changes (staged + unstaged)
        const uncommittedChanges = execSync('git diff --name-only HEAD', {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        })
          .trim()
          .split('\n')
          .filter((f) => f.length > 0);

        // Get untracked files
        const untrackedFiles = execSync('git ls-files --others --exclude-standard', {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        })
          .trim()
          .split('\n')
          .filter((f) => f.length > 0);

        const allChanges = [
          ...new Set([...committedChanges, ...uncommittedChanges, ...untrackedFiles]),
        ];
        this.logger.debug(
          `Found ${allChanges.length} changed files since last analysis (${lastAnalysisCommit.substring(0, 8)})`,
        );
        return allChanges;
      }

      // Priority 3: No reference point — only uncommitted changes
      // (This path should rarely be hit now; the scanner handles the no-cache case separately)
      const modifiedFiles = execSync('git diff --name-only HEAD', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      })
        .trim()
        .split('\n')
        .filter((f) => f.length > 0);

      const untrackedFiles = execSync('git ls-files --others --exclude-standard', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      })
        .trim()
        .split('\n')
        .filter((f) => f.length > 0);

      const allChanges = [...new Set([...modifiedFiles, ...untrackedFiles])];
      this.logger.debug(`Found ${allChanges.length} changed files (uncommitted)`);
      return allChanges;
    } catch (error) {
      this.logger.warn(`Failed to get changed files: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Load the commit hash from the last successful analysis run
   * @param cacheDir - Path to the cache directory (e.g., .arch-docs/cache)
   * @returns The stored commit hash, or null if no previous analysis exists
   */
  public async loadLastAnalysisCommit(cacheDir: string): Promise<string | null> {
    try {
      const cachePath = path.join(cacheDir, 'last-analysis-commit.json');
      const content = await fs.readFile(cachePath, 'utf-8');
      const cache = JSON.parse(content) as AnalysisCommitCache;

      if (cache.version !== '1.0.0') {
        this.logger.warn(`Analysis commit cache version mismatch: ${cache.version}`);
        return null;
      }

      this.logger.debug(
        `Loaded last analysis commit: ${cache.commitHash.substring(0, 8)} (${cache.timestamp})`,
      );
      return cache.commitHash;
    } catch {
      this.logger.debug('No previous analysis commit found in cache');
      return null;
    }
  }

  /**
   * Save the current commit hash after a successful analysis
   * @param cacheDir - Path to the cache directory (e.g., .arch-docs/cache)
   * @param commitHash - The current HEAD commit hash
   */
  public async saveLastAnalysisCommit(cacheDir: string, commitHash: string): Promise<void> {
    try {
      await fs.mkdir(cacheDir, { recursive: true });

      const cache: AnalysisCommitCache = {
        version: '1.0.0',
        commitHash,
        timestamp: new Date().toISOString(),
      };

      const cachePath = path.join(cacheDir, 'last-analysis-commit.json');
      await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8');

      this.logger.debug(`Saved analysis commit: ${commitHash.substring(0, 8)}`);
    } catch (error) {
      this.logger.warn(`Failed to save analysis commit: ${(error as Error).message}`);
    }
  }

  /**
   * Get all tracked files in the repository
   */
  public getAllTrackedFiles(projectPath: string): string[] {
    try {
      const files = execSync('git ls-files', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      })
        .trim()
        .split('\n')
        .filter((f) => f.length > 0);

      this.logger.debug(`Found ${files.length} tracked files`);
      return files;
    } catch (error) {
      this.logger.warn(`Failed to get tracked files: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Check if a file is tracked by Git
   */
  public isFileTracked(projectPath: string, filePath: string): boolean {
    try {
      execSync(`git ls-files --error-unmatch "${filePath}"`, {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the last commit that modified a specific file
   */
  public getLastCommitForFile(projectPath: string, filePath: string): string | null {
    try {
      const hash = execSync(`git log -1 --format=%H -- "${filePath}"`, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      return hash || null;
    } catch (error) {
      this.logger.debug(`Failed to get last commit for ${filePath}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get Git status for a file
   * @returns 'modified' | 'added' | 'deleted' | 'untracked' | 'unchanged'
   */
  public getFileStatus(
    projectPath: string,
    filePath: string,
  ): 'modified' | 'added' | 'deleted' | 'untracked' | 'unchanged' {
    try {
      // Check if file is untracked
      if (!this.isFileTracked(projectPath, filePath)) {
        return 'untracked';
      }

      // Get status
      const status = execSync(`git status --porcelain "${filePath}"`, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();

      if (!status) {
        return 'unchanged';
      }

      const statusCode = status.substring(0, 2);
      if (statusCode.includes('M')) return 'modified';
      if (statusCode.includes('A')) return 'added';
      if (statusCode.includes('D')) return 'deleted';
      if (statusCode.includes('?')) return 'untracked';

      return 'unchanged';
    } catch (error) {
      this.logger.debug(`Failed to get status for ${filePath}: ${(error as Error).message}`);
      return 'unchanged';
    }
  }
}
