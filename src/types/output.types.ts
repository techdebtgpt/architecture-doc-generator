/**
 * Output format types
 */
export enum OutputFormat {
  MARKDOWN = 'markdown',
  JSON = 'json',
  HTML = 'html',
  CONFLUENCE = 'confluence',
  PDF = 'pdf',
  DOCX = 'docx',
}

/**
 * Documentation sections
 */
export enum DocumentationSection {
  OVERVIEW = 'overview',
  ARCHITECTURE = 'architecture',
  FILE_STRUCTURE = 'file-structure',
  DEPENDENCIES = 'dependencies',
  PATTERNS = 'patterns',
  CODE_QUALITY = 'code-quality',
  MODULES = 'modules',
  APIs = 'apis',
  DATABASE = 'database',
  DEPLOYMENT = 'deployment',
  TESTING = 'testing',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
}

/**
 * Documentation output configuration
 */
export interface OutputConfig {
  /** Output format */
  format: OutputFormat;

  /** Output directory path */
  outputDir: string;

  /** Output file name (without extension) */
  fileName?: string;

  /** Sections to include */
  sections?: DocumentationSection[];

  /** Include table of contents */
  includeTOC?: boolean;

  /** Include diagrams */
  includeDiagrams?: boolean;

  /** Include code snippets */
  includeCodeSnippets?: boolean;

  /** Maximum snippet length */
  maxSnippetLength?: number;

  /** Custom template path */
  templatePath?: string;

  /** Custom CSS for HTML output */
  customCSS?: string;

  /** Theme for syntax highlighting */
  syntaxTheme?: string;

  /** Split into multiple files */
  splitFiles?: boolean;

  /** Include metadata */
  includeMetadata?: boolean;
}

/**
 * Complete documentation output
 */
export interface DocumentationOutput {
  /** Project name */
  projectName: string;

  /** Generation timestamp */
  timestamp: Date;

  /** Documentation version */
  version: string;

  /** Overview section */
  overview: DocumentationOverview;

  /** Architecture section */
  architecture: ArchitectureDocumentation;

  /** File structure section */
  fileStructure: FileStructureDocumentation;

  /** Dependencies section */
  dependencies: DependencyDocumentation;

  /** Patterns section */
  patterns: PatternDocumentation;

  /** Code quality section */
  codeQuality: CodeQualityDocumentation;

  /** Custom sections */
  customSections: Map<string, CustomSection>;

  /** Generation metadata */
  metadata: DocumentationMetadata;
}

/**
 * Documentation overview
 */
export interface DocumentationOverview {
  /** Project description */
  description: string;

  /** Primary language */
  primaryLanguage: string;

  /** All languages used */
  languages: string[];

  /** Detected frameworks */
  frameworks: string[];

  /** Project type (web, mobile, library, etc.) */
  projectType: string;

  /** Key features */
  keyFeatures: string[];

  /** Project statistics */
  statistics: ProjectStatistics;
}

/**
 * Architecture documentation
 */
export interface ArchitectureDocumentation {
  /** Architecture style (microservices, monolith, etc.) */
  style: string;

  /** Architecture patterns detected */
  patterns: string[];

  /** System components */
  components: ComponentDescription[];

  /** Component relationships */
  relationships: ComponentRelationship[];

  /** Data flow description */
  dataFlow: string;

  /** Architecture diagram (Mermaid syntax) */
  diagram?: string;

  /** Design principles observed */
  designPrinciples: string[];
}

/**
 * File structure documentation
 */
export interface FileStructureDocumentation {
  /** Root directory structure */
  rootStructure: DirectoryDescription;

  /** Key directories explained */
  keyDirectories: Map<string, string>;

  /** File organization strategy */
  organizationStrategy: string;

  /** Naming conventions */
  namingConventions: string[];

  /** Structure diagram */
  diagram?: string;
}

/**
 * Dependency documentation
 */
export interface DependencyDocumentation {
  /** Production dependencies */
  productionDeps: DependencyInfo[];

  /** Development dependencies */
  developmentDeps: DependencyInfo[];

  /** Dependency graph */
  dependencyGraph: DependencyGraph;

  /** Outdated dependencies */
  outdatedDeps: DependencyInfo[];

  /** Security vulnerabilities */
  vulnerabilities: VulnerabilityInfo[];

  /** Dependency insights */
  insights: string[];
}

/**
 * Pattern documentation
 */
export interface PatternDocumentation {
  /** Design patterns detected */
  designPatterns: PatternInstance[];

  /** Architectural patterns */
  architecturalPatterns: PatternInstance[];

  /** Code patterns */
  codePatterns: PatternInstance[];

  /** Anti-patterns detected */
  antiPatterns: PatternInstance[];

  /** Pattern recommendations */
  recommendations: string[];
}

/**
 * Code quality documentation
 */
export interface CodeQualityDocumentation {
  /** Overall quality score (0-10) */
  overallScore: number;

  /** Quality metrics */
  metrics: QualityMetrics;

  /** Issues found */
  issues: QualityIssue[];

  /** Best practices observed */
  bestPractices: string[];

  /** Improvement suggestions */
  improvements: ImprovementSuggestion[];

  /** Code complexity analysis */
  complexity: ComplexityAnalysis;
}

/**
 * Custom documentation section
 */
export interface CustomSection {
  /** Section title */
  title: string;

  /** Section content (markdown) */
  content: string;

  /** Section metadata */
  metadata: Record<string, unknown>;

  /** Generated files from agent (for agent-owned file generation) */
  files?: Array<{
    filename: string;
    content: string;
    title: string;
    category?: string;
    order?: number;
    mergeStrategy?: 'replace' | 'append' | 'section-update';
    sectionId?: string;
  }>;
}

/**
 * Documentation metadata
 */
export interface DocumentationMetadata {
  /** Generator version */
  generatorVersion: string;

  /** Generation duration in ms */
  generationDuration: number;

  /** Total tokens used */
  totalTokensUsed: number;

  /** Agents executed */
  agentsExecuted: string[];

  /** Configuration used */
  configuration: Record<string, unknown>;

  /** Warnings generated */
  warnings: string[];
}

// Supporting types

export interface ProjectStatistics {
  totalFiles: number;
  totalLines: number;
  totalSize: number;
  codeFiles: number;
  testFiles: number;
  configFiles: number;
}

export interface ComponentDescription {
  name: string;
  type: string;
  description: string;
  responsibilities: string[];
  dependencies: string[];
}

export interface ComponentRelationship {
  from: string;
  to: string;
  type: string;
  description: string;
}

export interface DirectoryDescription {
  name: string;
  path: string;
  purpose: string;
  children: DirectoryDescription[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  description: string;
  license: string;
  isOutdated: boolean;
  latestVersion?: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;
  name: string;
  version: string;
  type: 'direct' | 'transitive';
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: string;
}

export interface VulnerabilityInfo {
  dependency: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

export interface PatternInstance {
  name: string;
  type: string;
  description: string;
  locations: string[];
  confidence: number;
  examples: string[];
}

export interface QualityMetrics {
  maintainability: number;
  reliability: number;
  security: number;
  testCoverage?: number;
  codeSmells: number;
  technicalDebt: string;
}

export interface QualityIssue {
  severity: 'critical' | 'major' | 'minor' | 'info';
  type: string;
  description: string;
  file: string;
  line?: number;
  suggestion: string;
}

export interface ImprovementSuggestion {
  category: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  effort: string;
}

export interface ComplexityAnalysis {
  averageComplexity: number;
  highComplexityFiles: ComplexityFile[];
  complexityDistribution: Map<string, number>;
}

export interface ComplexityFile {
  file: string;
  complexity: number;
  functions: number;
  recommendation: string;
}
