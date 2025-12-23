import { promises as fs, Stats } from 'fs';
import * as path from 'path';
import glob from 'fast-glob';
import type { Entry } from 'fast-glob';
import { IScanner, IIgnorePatternHandler } from './scanner.interface';
import {
  ScanOptions,
  ScanResult,
  FileEntry,
  FileEntryType,
  DirectoryNode,
  DeltaAnalysisMetadata,
} from '../types/scanner.types';
import { GitService } from '../services/git-service';
import { FileHashService } from '../services/file-hash-service';
import { Logger } from '../utils/logger';
import { getLanguageRegistry } from '../config/language-config';

/**
 * File system scanner implementation
 */
export class FileSystemScanner implements IScanner {
  public readonly name = 'file-system';
  private ignoreHandler?: IIgnorePatternHandler;
  private gitService: GitService;
  private fileHashService: FileHashService;
  private logger: Logger;

  constructor(ignoreHandler?: IIgnorePatternHandler) {
    this.ignoreHandler = ignoreHandler;
    this.gitService = GitService.getInstance();
    this.fileHashService = FileHashService.getInstance();
    this.logger = new Logger('FileSystemScanner');
  }

  public async canScan(path: string): Promise<boolean> {
    try {
      const stat = await fs.stat(path);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  public getConfig(): Record<string, unknown> {
    return {
      name: this.name,
      hasIgnoreHandler: !!this.ignoreHandler,
    };
  }

  public async scan(options: ScanOptions): Promise<ScanResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    // Load ignore patterns if handler is available
    if (this.ignoreHandler && options.respectGitignore) {
      await this.ignoreHandler.loadPatterns(options.rootPath);
    }

    // Build glob patterns
    const includePatterns = options.includePatterns || ['**/*'];
    const excludePatterns = this.buildExcludePatterns(options);

    // Scan files using fast-glob
    const globOptions = {
      cwd: options.rootPath,
      absolute: true,
      followSymbolicLinks: options.followSymlinks || false,
      ignore: excludePatterns,
      dot: options.includeHidden || false,
      stats: true,
      suppressErrors: true,
    };

    const entries = await glob(includePatterns, globOptions);
    const files: FileEntry[] = [];
    const languageDistribution = new Map<string, number>();
    let totalSize = 0;
    let ignoredFiles = 0;

    // Process each file
    for (const entry of entries) {
      if (files.length >= (options.maxFiles || 10000)) {
        warnings.push(`Reached maximum file limit of ${options.maxFiles || 10000}`);
        break;
      }

      try {
        // Extract path from glob entry (with stats: true, it returns objects)
        const filePath = typeof entry === 'string' ? entry : (entry as Entry).path;
        const fileEntry = await this.processFileEntry(filePath, options.rootPath, options);

        if (!fileEntry) {
          ignoredFiles++;
          continue;
        }

        // Check file size limit
        if (fileEntry.size > (options.maxFileSize || 1048576)) {
          warnings.push(`File ${fileEntry.relativePath} exceeds size limit`);
          ignoredFiles++;
          continue;
        }

        files.push(fileEntry);
        totalSize += fileEntry.size;

        // Update language distribution
        if (fileEntry.detectedType) {
          const current = languageDistribution.get(fileEntry.detectedType) || 0;
          languageDistribution.set(fileEntry.detectedType, current + 1);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        warnings.push(`Error processing ${entry}: ${errorMessage}`);
        // Error already captured in warnings array
      }
    }

    // Build directory tree
    const directoryTree = await this.buildDirectoryTree(options.rootPath, files);

    // Calculate language info
    const languages = this.calculateLanguageInfo(languageDistribution, files.length);

    // Count directories
    const uniqueDirs = new Set(files.map((f) => f.path.substring(0, f.path.lastIndexOf('/'))));
    const totalDirectories = uniqueDirs.size;

    // Perform delta analysis to detect changed files (unless force is enabled)
    const deltaAnalysis = options.force
      ? {
          enabled: false,
          changedFiles: 0,
          newFiles: files.length,
          deletedFiles: 0,
          unchangedFiles: 0,
          detectionMethod: 'none' as const,
        }
      : await this.performDeltaAnalysis(options.rootPath, files, options.since);

    const scanDuration = Date.now() - startTime;

    return {
      rootPath: options.rootPath,
      projectPath: options.rootPath,
      files,
      totalFiles: files.length,
      totalSize,
      totalDirectories,
      ignoredFiles,
      directoryTree,
      languages,
      languageDistribution,
      scanDuration,
      warnings,
      deltaAnalysis,
      metadata: {
        scanner: this.name,
        options,
        performance: {
          scanDuration,
          filesPerSecond: Math.round(files.length / (scanDuration / 1000)),
        },
      },
    };
  }

  /**
   * Perform delta analysis to detect changed files
   */
  private async performDeltaAnalysis(
    projectPath: string,
    files: FileEntry[],
    since?: string,
  ): Promise<DeltaAnalysisMetadata> {
    // Check if Git repository
    const isGitRepo = await this.gitService.isGitRepository(projectPath);

    if (isGitRepo) {
      return await this.performGitDeltaAnalysis(projectPath, files, since);
    } else {
      return await this.performHashDeltaAnalysis(projectPath, files);
    }
  }

  /**
   * Perform delta analysis using Git
   */
  private async performGitDeltaAnalysis(
    projectPath: string,
    files: FileEntry[],
    since?: string,
  ): Promise<DeltaAnalysisMetadata> {
    const baseCommit = since || this.gitService.getCurrentCommitHash(projectPath);
    const changedFilePaths = new Set(this.gitService.getChangedFiles(projectPath, since));

    let changedFiles = 0;
    let newFiles = 0;
    let unchangedFiles = 0;

    // Mark each file with its change status
    for (const file of files) {
      const isTracked = this.gitService.isFileTracked(projectPath, file.relativePath);

      if (!isTracked) {
        file.changeStatus = 'new';
        newFiles++;
      } else if (changedFilePaths.has(file.relativePath)) {
        file.changeStatus = 'modified';
        changedFiles++;
      } else {
        file.changeStatus = 'unchanged';
        unchangedFiles++;
      }
    }

    this.logger.info(
      `Git delta analysis: ${changedFiles} changed, ${newFiles} new, ${unchangedFiles} unchanged`,
    );

    return {
      enabled: true,
      baseCommit: baseCommit || undefined,
      changedFiles,
      newFiles,
      deletedFiles: 0, // Git doesn't track deleted files in scan
      unchangedFiles,
      detectionMethod: 'git',
    };
  }

  /**
   * Perform delta analysis using file hashing
   */
  private async performHashDeltaAnalysis(
    projectPath: string,
    files: FileEntry[],
  ): Promise<DeltaAnalysisMetadata> {
    const cacheDir = path.join(projectPath, '.arch-docs', 'cache');
    const filePaths = files.map((f) => f.relativePath);

    const result = await this.fileHashService.getChangedFiles(projectPath, filePaths, cacheDir);

    // Mark each file with its change status
    for (const file of files) {
      if (result.new.includes(file.relativePath)) {
        file.changeStatus = 'new';
      } else if (result.changed.includes(file.relativePath)) {
        file.changeStatus = 'modified';
      } else {
        file.changeStatus = 'unchanged';
      }
    }

    this.logger.info(
      `Hash delta analysis: ${result.changed.length} changed, ${result.new.length} new, ${result.unchanged.length} unchanged`,
    );

    return {
      enabled: true,
      changedFiles: result.changed.length,
      newFiles: result.new.length,
      deletedFiles: result.deleted.length,
      unchangedFiles: result.unchanged.length,
      detectionMethod: 'hash',
    };
  }

  /**
   * Calculate language information with metadata
   */
  private calculateLanguageInfo(
    distribution: Map<string, number>,
    totalFiles: number,
  ): Array<{ language: string; fileCount: number; percentage: number; confidence: number }> {
    const languages: Array<{
      language: string;
      fileCount: number;
      percentage: number;
      confidence: number;
    }> = [];

    for (const [language, count] of distribution.entries()) {
      languages.push({
        language,
        fileCount: count,
        percentage: (count / totalFiles) * 100,
        confidence: 1.0, // High confidence for extension-based detection
      });
    }

    return languages.sort((a, b) => b.fileCount - a.fileCount);
  }

  private buildExcludePatterns(options: ScanOptions): string[] {
    const patterns: string[] = [];

    // Get all language-specific exclude patterns from language config
    const languageRegistry = getLanguageRegistry();
    const allLanguagePatterns = languageRegistry.getAllExcludePatterns();

    // Convert language-specific patterns to glob format with **/ prefix for recursive matching
    const languageGlobPatterns = new Set<string>();
    for (const pattern of allLanguagePatterns) {
      // Skip empty patterns
      if (!pattern || pattern.trim() === '') continue;

      const trimmed = pattern.trim();

      // Handle patterns that start with . (hidden files/dirs like .next, .gradle)
      if (trimmed.startsWith('.')) {
        languageGlobPatterns.add(`**/${trimmed}/**`);
        languageGlobPatterns.add(`**/${trimmed}`);
      }
      // Handle patterns that already have **/ prefix
      else if (trimmed.startsWith('**/')) {
        languageGlobPatterns.add(trimmed);
      }
      // Handle absolute patterns (starting with /)
      else if (trimmed.startsWith('/')) {
        const withoutSlash = trimmed.substring(1);
        languageGlobPatterns.add(`**/${withoutSlash}/**`);
        languageGlobPatterns.add(`**/${withoutSlash}`);
      }
      // Regular patterns - add both directory and file variants
      else {
        // Directory pattern (with trailing /**)
        languageGlobPatterns.add(`**/${trimmed}/**`);
        // File/directory pattern (without trailing /**)
        languageGlobPatterns.add(`**/${trimmed}`);
      }
    }

    // Add common system patterns (use **/ prefix to match at any depth)
    const commonPatterns = [
      '**/.git/**',
      '**/coverage/**',
      '**/.nyc_output/**',
      '**/.cache/**',
      '**/.parcel-cache/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/.svelte-kit/**',
      '**/.docusaurus/**',
      '**/.serverless/**',
      '**/.fusebox/**',
      '**/*.log',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/.idea/**',
      '**/.vscode/**',
      '**/.vs/**',
    ];

    // Combine all patterns
    patterns.push(...Array.from(languageGlobPatterns), ...commonPatterns);

    // Add patterns from .gitignore if handler is available and respectGitignore is enabled
    // Note: .gitignore patterns are used as-is (not modified with **/ prefix)
    // The ignore handler's shouldIgnore() method is also called in processFileEntry for double-checking
    // We add them here to fast-glob's ignore list for better performance, but keep them as-is
    if (this.ignoreHandler && options.respectGitignore) {
      const gitignorePatterns = this.ignoreHandler.getPatterns();
      // Use .gitignore patterns as-is - they're already in the correct format
      // The ignore package handles them correctly, and fast-glob can use them directly
      for (const pattern of gitignorePatterns) {
        if (pattern && pattern.trim() && !pattern.startsWith('#')) {
          // Use pattern as-is from .gitignore (already transformed to root-relative in handler)
          patterns.push(pattern.trim());
        }
      }
    }

    // User-defined exclude patterns
    if (options.excludePatterns) {
      patterns.push(...options.excludePatterns);
    }

    return patterns;
  }

  private async processFileEntry(
    fullPath: string,
    rootPath: string,
    options: ScanOptions,
  ): Promise<FileEntry | null> {
    const relativePath = path.relative(rootPath, fullPath);

    // Check ignore patterns
    if (this.ignoreHandler?.shouldIgnore(relativePath)) {
      return null;
    }

    // Check file extension filters
    const extension = path.extname(fullPath).slice(1).toLowerCase();

    if (options.allowedExtensions?.length && !options.allowedExtensions.includes(extension)) {
      return null;
    }

    if (options.excludedExtensions?.includes(extension)) {
      return null;
    }

    try {
      const stat = await fs.stat(fullPath);

      const entry: FileEntry = {
        path: fullPath,
        relativePath,
        type: this.getFileEntryType(stat),
        size: stat.size,
        extension,
        lastModified: stat.mtime,
        isIgnored: false,
        detectedType: this.detectFileType(extension, relativePath),
      };

      return entry;
    } catch {
      return null;
    }
  }

  private getFileEntryType(stat: Stats): FileEntryType {
    if (stat.isFile()) return FileEntryType.FILE;
    if (stat.isDirectory()) return FileEntryType.DIRECTORY;
    if (stat.isSymbolicLink()) return FileEntryType.SYMLINK;
    return FileEntryType.FILE;
  }

  private detectFileType(extension: string, relativePath: string): string | undefined {
    // Programming languages
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      kt: 'kotlin',
      go: 'go',
      rs: 'rust',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      scala: 'scala',
      clj: 'clojure',
      hs: 'haskell',
      elm: 'elm',
      dart: 'dart',
      lua: 'lua',
      r: 'r',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
      ps1: 'powershell',
      yml: 'yaml',
      yaml: 'yaml',
      json: 'json',
      xml: 'xml',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      md: 'markdown',
      mdx: 'markdown',
      tex: 'latex',
      dockerfile: 'docker',
    };

    // Check extension
    if (languageMap[extension]) {
      return languageMap[extension];
    }

    // Check filename patterns
    const filename = path.basename(relativePath).toLowerCase();
    if (filename === 'dockerfile') return 'docker';
    if (filename === 'makefile') return 'makefile';
    if (filename === 'rakefile') return 'ruby';
    if (filename === 'gemfile') return 'ruby';
    if (filename.endsWith('file')) return 'config';

    return undefined;
  }

  private async buildDirectoryTree(rootPath: string, files: FileEntry[]): Promise<DirectoryNode> {
    const root: DirectoryNode = {
      name: path.basename(rootPath),
      path: rootPath,
      children: [],
      files: [],
      totalSize: 0,
      fileCount: 0,
    };

    // Group files by directory
    const directoryMap = new Map<string, DirectoryNode>();
    directoryMap.set(rootPath, root);

    for (const file of files) {
      const dirPath = path.dirname(file.path);

      if (!directoryMap.has(dirPath)) {
        // Create directory node
        const dirNode: DirectoryNode = {
          name: path.basename(dirPath),
          path: dirPath,
          children: [],
          files: [],
          totalSize: 0,
          fileCount: 0,
        };
        directoryMap.set(dirPath, dirNode);
      }

      const dirNode = directoryMap.get(dirPath)!;
      if (file.type === FileEntryType.FILE) {
        dirNode.files.push(file);
        dirNode.totalSize += file.size;
        dirNode.fileCount++;
      }
    }

    // Build hierarchy
    for (const [dirPath, dirNode] of directoryMap) {
      if (dirPath === rootPath) continue;

      const parentPath = path.dirname(dirPath);
      const parentNode = directoryMap.get(parentPath);

      if (parentNode) {
        parentNode.children.push(dirNode);
        parentNode.totalSize += dirNode.totalSize;
        parentNode.fileCount += dirNode.fileCount;
      }
    }

    return root;
  }
}
