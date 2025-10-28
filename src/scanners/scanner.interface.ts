import { ScanOptions, ScanResult, FileEntry, GitInfo } from '../types/scanner.types';

/**
 * Base interface for file system scanners
 */
export interface IScanner {
  /** Scanner name */
  readonly name: string;

  /** Scan a directory and return structured results */
  scan(options: ScanOptions): Promise<ScanResult>;

  /** Check if scanner can handle the given path */
  canScan(path: string): Promise<boolean>;

  /** Get scanner configuration */
  getConfig(): Record<string, unknown>;
}

/**
 * Scanner for ignore patterns (gitignore, etc.)
 */
export interface IIgnorePatternHandler {
  /** Load ignore patterns from files */
  loadPatterns(rootPath: string): Promise<void>;

  /** Check if a file should be ignored */
  shouldIgnore(filePath: string): boolean;

  /** Get all loaded patterns */
  getPatterns(): string[];

  /** Add custom pattern */
  addPattern(pattern: string): void;

  /** Clear all patterns */
  clear(): void;
}

/**
 * Git repository scanner interface
 */
export interface IGitScanner {
  /** Check if path is a git repository */
  isGitRepository(path: string): Promise<boolean>;

  /** Get git repository information */
  getGitInfo(path: string): Promise<GitInfo>;

  /** Get git ignore patterns */
  getGitIgnorePatterns(path: string): Promise<string[]>;

  /** Get file modification history */
  getFileHistory(filePath: string): Promise<GitFileHistory[]>;
}

/**
 * Git file history entry
 */
export interface GitFileHistory {
  /** Commit hash */
  commit: string;

  /** Author name */
  author: string;

  /** Author email */
  email: string;

  /** Commit date */
  date: Date;

  /** Commit message */
  message: string;

  /** Changes in this commit */
  changes: {
    additions: number;
    deletions: number;
  };
}

/**
 * File content analyzer interface
 */
export interface IFileAnalyzer {
  /** Detect file type and language */
  analyzeFile(entry: FileEntry): Promise<FileAnalysis>;

  /** Extract metadata from file content */
  extractMetadata(content: string, fileType: string): Promise<FileMetadata>;

  /** Check if file is binary */
  isBinary(content: Buffer): boolean;

  /** Get file complexity metrics */
  getComplexityMetrics(content: string, language: string): Promise<ComplexityMetrics>;
}

/**
 * File analysis result
 */
export interface FileAnalysis {
  /** Detected language */
  language: string;

  /** Framework detected */
  framework?: string;

  /** File category */
  category: 'source' | 'test' | 'config' | 'documentation' | 'resource' | 'build' | 'other';

  /** Confidence of detection (0-1) */
  confidence: number;

  /** Line count */
  lineCount: number;

  /** Is the file executable? */
  isExecutable: boolean;

  /** File encoding */
  encoding: string;

  /** Dependencies found in file */
  dependencies: string[];
}

/**
 * File metadata
 */
export interface FileMetadata {
  /** Package/module name */
  packageName?: string;

  /** Version information */
  version?: string;

  /** Author information */
  author?: string;

  /** License */
  license?: string;

  /** Description */
  description?: string;

  /** Keywords/tags */
  keywords: string[];

  /** Entry points */
  entryPoints: string[];

  /** Build scripts */
  scripts: Record<string, string>;

  /** Configuration settings */
  configuration: Record<string, unknown>;
}

/**
 * Code complexity metrics
 */
export interface ComplexityMetrics {
  /** Cyclomatic complexity */
  cyclomaticComplexity: number;

  /** Cognitive complexity */
  cognitiveComplexity: number;

  /** Number of functions */
  functionCount: number;

  /** Number of classes */
  classCount: number;

  /** Average function length */
  averageFunctionLength: number;

  /** Nesting depth */
  maxNestingDepth: number;

  /** Technical debt ratio */
  technicalDebtRatio: number;
}
