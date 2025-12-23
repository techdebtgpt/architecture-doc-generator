import type { LLMProvider } from './llm.types';
import type { ScanResult } from './scanner.types';
import type { RunnableConfig } from '@langchain/core/runnables';

/**
 * Chat message for conversations
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Chat message history for multi-turn conversations
 */
export interface ChatHistory {
  messages: ChatMessage[];
  summary?: string;
}

/**
 * Agent execution context containing all necessary information for agent processing
 */
export interface AgentContext {
  /** Unique identifier for the agent execution */
  executionId: string;

  /** Path to the project being analyzed */
  projectPath: string;

  /** List of files discovered in the project */
  files: string[];

  /** File contents mapped by file path */
  fileContents: Map<string, string>;

  /** Project metadata (package.json, pom.xml, etc.) */
  projectMetadata: Record<string, unknown>;

  /** Previous agent results for context */
  previousResults: Map<string, AgentResult>;

  /** User-provided configuration */
  config: Record<string, unknown>;

  /** Custom user query or focus area */
  query?: string;

  /** Language-specific hints detected by scanners */
  languageHints: LanguageHint[];

  /** Token budget remaining for this execution */
  tokenBudget: number;

  /** Scan result with file and language information */
  scanResult: ScanResult;

  /** Existing documentation files for incremental updates */
  existingDocs?: Map<string, string>;

  /** Incremental mode flag - if true, agent should merge with existing docs */
  isIncrementalMode?: boolean;

  /** Refinement gaps from previous quality evaluation */
  refinementGaps?: {
    qualityScore: number;
    priority: 'high' | 'medium' | 'low';
    needsUpdate: boolean;
    improvements: string[];
    lastEvaluated: string;
  };

  /** Dependency graph from import analysis */
  dependencyGraph?: {
    imports: Array<{
      source: string;
      target: string;
      imports?: string[];
      type: 'local' | 'external' | 'framework';
      resolvedPath?: string;
    }>;
    modules: Array<{
      name: string;
      path: string;
      files: string[];
      dependencies: string[];
      exports: string[];
    }>;
    graph: {
      nodes: Array<{
        id: string;
        type: 'file' | 'module' | 'external';
        name: string;
      }>;
      edges: Array<{
        from: string;
        to: string;
        type: 'import' | 'require';
      }>;
    };
  };

  /** Shared vector store (initialized once per generation, reused across agents) */
  vectorStore?: {
    searchFiles: (query: string, topK?: number) => Promise<Array<{ path: string; score: number }>>;
    cleanup: () => void;
  };

  /** Hybrid retrieval service (combines vector search + dependency graph) */
  hybridRetrieval?: {
    retrieve: (
      query: string,
      config?: {
        strategy?: 'vector' | 'graph' | 'hybrid' | 'smart';
        topK?: number;
        vectorWeight?: number;
        graphWeight?: number;
        includeRelatedFiles?: boolean;
        maxDepth?: number;
        similarityThreshold?: number;
      },
    ) => Promise<
      Array<{
        path: string;
        content: string;
        relevanceScore: number;
        matchReasons: string[];
        relationships?: {
          imports: string[];
          importedBy: string[];
          sameModule: string[];
        };
        rank: number;
      }>
    >;
    getStats: () => {
      hasVectorStore: boolean;
      hasDependencyGraph: boolean;
      graphStats?: {
        totalNodes: number;
        totalEdges: number;
        modules: number;
      };
    };
  };
}

/**
 * Generated documentation file from an agent
 */
export interface AgentFile {
  /** Filename (e.g., "flows.md", "data-flow-diagram.md") */
  filename: string;

  /** Full markdown content */
  content: string;

  /** Human-readable title */
  title: string;

  /** Optional category for grouping (e.g., "analysis", "visualization", "detail") */
  category?: string;

  /** Optional navigation order hint (lower = earlier in TOC) */
  order?: number;

  /** Merge strategy for incremental mode (default: 'replace') */
  mergeStrategy?: 'replace' | 'append' | 'section-update';

  /** Section identifier for section-update strategy (e.g., "## Security Analysis") */
  sectionId?: string;
}

/**
 * Result returned by an agent after execution
 */
export interface AgentResult {
  /** Name of the agent that produced this result */
  agentName: string;

  /** Execution status */
  status: 'success' | 'partial' | 'failed';

  /** Structured data output */
  data: Record<string, unknown>;

  /** Human-readable summary */
  summary: string;

  /** Markdown-formatted detailed analysis (deprecated - use files instead) */
  markdown: string;

  /** Generated documentation files (NEW - agents own their file generation) */
  files?: AgentFile[];

  /** Confidence score (0-1) */
  confidence: number;

  /** Token usage for this agent */
  tokenUsage: TokenUsage;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Any errors or warnings */
  errors: string[];
  warnings: string[];

  /** Metadata for tracing and debugging */
  metadata: Record<string, unknown>;
}

/**
 * Agent priority for execution ordering
 */
export enum AgentPriority {
  CRITICAL = 1, // Must run first (e.g., file structure)
  HIGH = 2, // Important for other agents
  MEDIUM = 3, // Standard priority
  LOW = 4, // Can run last
  OPTIONAL = 5, // Only if time/tokens permit
}

/**
 * Agent capabilities flags
 */
export interface AgentCapabilities {
  /** Can this agent run in parallel with others? */
  supportsParallel: boolean;

  /** Does this agent require file contents? */
  requiresFileContents: boolean;

  /** Does this agent depend on other agents? */
  dependencies: string[];

  /** Can this agent handle incremental updates? */
  supportsIncremental: boolean;

  /** Estimated token usage */
  estimatedTokens: number;

  /** Languages this agent specializes in (empty = all) */
  supportedLanguages: string[];
}

/**
 * Language detection hint
 */
export interface LanguageHint {
  /** Programming language detected */
  language: string;

  /** Framework or platform detected */
  framework?: string;

  /** Confidence of detection (0-1) */
  confidence: number;

  /** File patterns that led to this detection */
  indicators: string[];

  /** Percentage of project files in this language */
  coverage: number;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  /** Input tokens consumed */
  inputTokens: number;

  /** Output tokens generated */
  outputTokens: number;

  /** Total tokens */
  totalTokens: number;

  /** Cached input tokens (Anthropic prompt caching) */
  cachedInputTokens?: number;

  /** Cache creation tokens (Anthropic prompt caching) */
  cacheCreationTokens?: number;

  /** Estimated cost in USD */
  estimatedCost?: number;
}

/**
 * Agent execution metadata
 */
export interface AgentMetadata {
  /** Agent name */
  name: string;

  /** Agent version */
  version: string;

  /** Agent description */
  description: string;

  /** Agent priority */
  priority: AgentPriority;

  /** Agent capabilities */
  capabilities: AgentCapabilities;

  /** Agent tags for filtering */
  tags: string[];

  /** Optional: Primary output filename (e.g., 'dependencies.md'). If not specified, defaults to '{name}.md' */
  outputFilename?: string;
}

/**
 * Streaming callback for real-time updates
 */
export type AgentStreamCallback = (chunk: {
  agentName: string;
  type: 'token' | 'progress' | 'result';
  content: string | number | Partial<AgentResult>;
}) => void;

/**
 * Agent execution options
 */
export interface AgentExecutionOptions {
  /** Enable streaming output */
  streaming?: boolean;

  /** Stream callback function */
  onStream?: AgentStreamCallback;

  /** Maximum execution time in ms */
  timeout?: number;

  /** Retry failed executions */
  retryOnFailure?: boolean;

  /** Maximum retry attempts */
  maxRetries?: number;

  /** Custom LLM configuration */
  llmConfig?: Partial<LLMConfig>;

  /** Runnable config for LangSmith tracing context (passed from parent runnable) */
  runnableConfig?: RunnableConfig;

  /** Maximum questions per refinement iteration (depth mode) */
  maxQuestionsPerIteration?: number;

  /** Skip self-refinement workflow for faster execution (quick mode) */
  skipSelfRefinement?: boolean;

  /** Search mode for file retrieval: 'vector' (semantic, slower but more accurate) or 'keyword' (fast, less accurate) */
  searchMode?: 'vector' | 'keyword';
}

/**
 * LLM configuration for agents
 */
export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * File Structure Agent Agent Result Data
 */
export interface FileStructureAnalysis {
  summary: string;
  structure: {
    organizationStrategy: string;
    keyDirectories: string[];
    directoryPurposes: Record<string, string>;
    [key: string]: unknown;
  };
  patterns: {
    architectural: string[];
    organizational: string[];
    [key: string]: unknown;
  };
  conventions: {
    naming: string[];
    grouping: string[];
    [key: string]: unknown;
  };
  recommendations: string[];
  warnings: string[];
  [key: string]: unknown;
}

/**
 * Dependency Analyzer Agent Result Data
 */
export interface DependencyAnalysis {
  summary: string;
  metrics: Record<string, number>;
  insights: string[];
  vulnerabilities: Array<{
    package: string;
    severity: string;
    description: string;
    [key: string]: unknown;
  }>;
  recommendations: string[];
  warnings: string[];
  [key: string]: unknown;
}

/**
 * Architectural styles
 */
export enum ArchitecturalStyle {
  MONOLITHIC = 'monolithic',
  MICROSERVICES = 'microservices',
  LAYERED = 'layered',
  EVENT_DRIVEN = 'event-driven',
  HEXAGONAL = 'hexagonal',
  SERVERLESS = 'serverless',
  MODULAR_MONOLITH = 'modular-monolith',
}

/**
 * Component information
 */
export interface ComponentInfo {
  name: string;
  type: string;
  description: string;
  responsibilities: string[];
  dependencies: string[];
  technologies: string[];
  [key: string]: unknown;
}

/**
 * Architecture analysis result
 */
export interface ArchitectureAnalysis {
  style: ArchitecturalStyle;
  components: ComponentInfo[];
  layers: string[];
  integrations: string[];
  diagram: string; // Mermaid C4 or component diagram
  insights: string[];
  summary: string;
  warnings: string[];
  [key: string]: unknown;
}
