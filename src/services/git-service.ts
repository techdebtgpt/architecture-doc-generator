import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger';

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
   * @param sinceCommit - Commit hash to compare against (optional, defaults to HEAD)
   * @returns Array of changed file paths relative to project root
   */
  public getChangedFiles(projectPath: string, sinceCommit?: string): string[] {
    try {
      // If no commit specified, get all tracked files that have uncommitted changes
      if (!sinceCommit) {
        // Get modified files (staged and unstaged)
        const modifiedFiles = execSync('git diff --name-only HEAD', {
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

        const allChanges = [...new Set([...modifiedFiles, ...untrackedFiles])];
        this.logger.debug(`Found ${allChanges.length} changed files (uncommitted)`);
        return allChanges;
      }

      // Get files changed since specific commit
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
    } catch (error) {
      this.logger.warn(`Failed to get changed files: ${(error as Error).message}`);
      return [];
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
