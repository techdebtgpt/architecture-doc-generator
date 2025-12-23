import * as fs from 'fs/promises';
import * as path from 'path';
import glob from 'fast-glob';
import ignore from 'ignore';
import { IIgnorePatternHandler } from './scanner.interface';
import { Logger } from '../utils/logger';

/**
 * GitIgnore pattern handler implementation
 * Loads and applies .gitignore patterns from the project
 * Supports .gitignore files at multiple directory levels (like Git does)
 */
export class GitIgnoreHandler implements IIgnorePatternHandler {
  private logger: Logger;
  private ig = ignore();
  private patterns: string[] = [];

  constructor() {
    this.logger = new Logger('GitIgnoreHandler');
  }

  /**
   * Load ignore patterns from .gitignore files
   * Recursively searches for all .gitignore files in the project
   * Patterns from subdirectory .gitignore files apply relative to their directory
   */
  public async loadPatterns(rootPath: string): Promise<void> {
    this.ig = ignore();
    this.patterns = [];

    try {
      // Find all .gitignore files recursively (but exclude .git directory itself)
      const gitignoreFiles = await glob('**/.gitignore', {
        cwd: rootPath,
        absolute: true,
        ignore: ['**/.git/**', '**/node_modules/**'], // Don't search in .git or node_modules
        dot: true,
        suppressErrors: true,
      });

      // Sort by depth (root first, then subdirectories) to match Git's behavior
      gitignoreFiles.sort((a, b) => {
        const depthA = a.split(path.sep).length;
        const depthB = b.split(path.sep).length;
        return depthA - depthB;
      });

      let loadedCount = 0;
      for (const gitignorePath of gitignoreFiles) {
        try {
          const content = await fs.readFile(gitignorePath, 'utf-8');
          const gitignoreDir = path.dirname(gitignorePath);
          const relativeDir = path.relative(rootPath, gitignoreDir);
          const isRoot = !relativeDir || relativeDir === '.';

          // Process each line in the .gitignore file
          const lines = content.split('\n');
          const processedLines: string[] = [];

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
              processedLines.push(line); // Keep comments and empty lines
              continue;
            }

            // For subdirectory .gitignore files, patterns apply relative to that directory
            // We need to transform patterns to be root-relative for the ignore package
            // Example: subdir/.gitignore with pattern "local" should match "subdir/local"
            // But we keep the original gitignore pattern format (no automatic **/ prefix)
            let pattern = trimmed;

            // If this is a subdirectory .gitignore (not root)
            if (!isRoot) {
              const normalizedDir = relativeDir.replace(/\\/g, '/'); // Normalize separators

              // Handle different pattern types
              if (pattern.startsWith('!')) {
                // Negation pattern (!pattern)
                const negatedPattern = pattern.substring(1);
                const transformed = this.transformPattern(negatedPattern, normalizedDir);
                pattern = `!${transformed}`;
              } else {
                // Regular pattern - transform to root-relative but keep original format
                pattern = this.transformPattern(pattern, normalizedDir);
              }
            }

            // Store the pattern as-is (no automatic **/ prefix - gitignore patterns are used as written)
            processedLines.push(pattern);
            this.patterns.push(pattern);
          }

          // Add processed patterns to ignore instance
          this.ig.add(processedLines.join('\n'));

          loadedCount++;
          const patternCount = lines.filter((l) => l.trim() && !l.trim().startsWith('#')).length;
          this.logger.debug(
            `Loaded .gitignore from: ${isRoot ? 'root' : relativeDir} (${patternCount} patterns)`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to read .gitignore at ${gitignorePath}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      if (loadedCount > 0) {
        this.logger.info(`Loaded ${loadedCount} .gitignore file(s) from ${rootPath}`);
      } else {
        this.logger.debug('No .gitignore files found');
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load .gitignore patterns: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Transform a pattern from a subdirectory .gitignore to be root-relative
   * @param pattern The pattern from the .gitignore file
   * @param dirPath The directory path relative to root (e.g., "subdir" or "packages/app")
   * @returns Transformed pattern that works from root
   */
  private transformPattern(pattern: string, dirPath: string): string {
    // Patterns starting with ** match anywhere, no transformation needed
    if (pattern.startsWith('**/')) {
      return pattern;
    }

    // Patterns starting with / are absolute from that directory
    if (pattern.startsWith('/')) {
      return `${dirPath}${pattern}`;
    }

    // Relative patterns - prefix with directory path
    // Ensure we don't double-prefix if pattern already starts with dirPath
    if (pattern.startsWith(dirPath + '/')) {
      return pattern;
    }

    return `${dirPath}/${pattern}`;
  }

  /**
   * Check if a file path should be ignored
   */
  public shouldIgnore(filePath: string): boolean {
    // Normalize path separators for cross-platform compatibility
    const normalizedPath = filePath.replace(/\\/g, '/');
    return this.ig.ignores(normalizedPath);
  }

  /**
   * Get all loaded patterns
   */
  public getPatterns(): string[] {
    return [...this.patterns];
  }

  /**
   * Add a custom pattern
   */
  public addPattern(pattern: string): void {
    this.ig.add(pattern);
    this.patterns.push(pattern);
  }

  /**
   * Clear all patterns
   */
  public clear(): void {
    this.ig = ignore();
    this.patterns = [];
  }
}
