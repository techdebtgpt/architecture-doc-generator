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

  /** Markdown-formatted detailed analysis */
  markdown: string;

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
