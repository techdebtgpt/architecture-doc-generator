/**
 * File system entry types
 */
export enum FileEntryType {
  FILE = 'file',
  DIRECTORY = 'directory',
  SYMLINK = 'symlink',
}

/**
 * File system entry information
 */
export interface FileEntry {
  /** Absolute path to the file */
  path: string;

  /** Relative path from project root */
  relativePath: string;

  /** Entry type */
  type: FileEntryType;

  /** File size in bytes */
  size: number;

  /** File extension (without dot) */
  extension: string;

  /** Last modified timestamp */
  lastModified: Date;

  /** Is this file ignored by .gitignore or similar? */
  isIgnored: boolean;

  /** Detected language/mime type */
  detectedType?: string;
}

/**
 * Scan configuration options
 */
export interface ScanOptions {
  /** Root directory to scan */
  rootPath: string;

  /** Maximum depth to traverse */
  maxDepth?: number;

  /** Maximum number of files to scan */
  maxFiles?: number;

  /** Maximum file size in bytes */
  maxFileSize?: number;

  /** Include hidden files */
  includeHidden?: boolean;

  /** Follow symbolic links */
  followSymlinks?: boolean;

  /** Custom include patterns (glob) */
  includePatterns?: string[];

  /** Custom exclude patterns (glob) */
  excludePatterns?: string[];

  /** Respect .gitignore files */
  respectGitignore?: boolean;

  /** Read file contents during scan */
  readContents?: boolean;

  /** File extensions to include (empty = all) */
  allowedExtensions?: string[];

  /** File extensions to exclude */
  excludedExtensions?: string[];
}

/**
 * Scan result containing discovered files and metadata
 */
export interface ScanResult {
  /** Root path that was scanned */
  rootPath: string;

  /** Project path for display */
  projectPath: string;

  /** All discovered file entries */
  files: FileEntry[];

  /** Total number of files found */
  totalFiles: number;

  /** Total size of all files in bytes */
  totalSize: number;

  /** Total number of directories found */
  totalDirectories: number;

  /** Number of files ignored */
  ignoredFiles: number;

  /** Directory structure tree */
  directoryTree: DirectoryNode;

  /** Detected programming languages with metadata */
  languages: LanguageInfo[];

  /** Language distribution */
  languageDistribution: Map<string, number>;

  /** Scan duration in milliseconds */
  scanDuration: number;

  /** Scan warnings */
  warnings: string[];

  /** Scan metadata */
  metadata: Record<string, unknown>;
}

/**
 * Language detection information
 */
export interface LanguageInfo {
  /** Programming language name */
  language: string;

  /** Framework detected (if any) */
  framework?: string;

  /** Number of files in this language */
  fileCount: number;

  /** Percentage of total files */
  percentage: number;

  /** Confidence level (0-1) */
  confidence: number;
}

/**
 * Directory tree node
 */
export interface DirectoryNode {
  /** Directory name */
  name: string;

  /** Full path */
  path: string;

  /** Child directories */
  children: DirectoryNode[];

  /** Files in this directory */
  files: FileEntry[];

  /** Total size of this directory and children */
  totalSize: number;

  /** File count in this directory and children */
  fileCount: number;
}

/**
 * Git repository information
 */
export interface GitInfo {
  /** Is this a git repository? */
  isGitRepo: boolean;

  /** Current branch name */
  currentBranch?: string;

  /** Remote repository URL */
  remoteUrl?: string;

  /** Last commit hash */
  lastCommit?: string;

  /** Number of total commits */
  totalCommits?: number;

  /** Git tags */
  tags?: string[];

  /** Contributors */
  contributors?: GitContributor[];

  /** .gitignore patterns */
  gitignorePatterns?: string[];
}

/**
 * Git contributor information
 */
export interface GitContributor {
  /** Contributor name */
  name: string;

  /** Contributor email */
  email: string;

  /** Number of commits */
  commits: number;

  /** Lines added */
  additions?: number;

  /** Lines removed */
  deletions?: number;
}

/**
 * Progress callback for scanning operations
 */
export type ScanProgressCallback = (progress: {
  /** Current file being processed */
  currentFile: string;

  /** Number of files processed */
  processedFiles: number;

  /** Total files to process */
  totalFiles: number;

  /** Progress percentage (0-100) */
  percentage: number;

  /** Current phase */
  phase: 'discovering' | 'analyzing' | 'filtering' | 'complete';
}) => void;
