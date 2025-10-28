/**
 * Supported LLM providers
 */
export enum LLMProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GOOGLE = 'google',
}

/**
 * LLM model configurations
 */
export interface LLMModelConfig {
  /** Provider name */
  provider: LLMProvider;

  /** Model identifier */
  modelId: string;

  /** Model display name */
  displayName: string;

  /** Maximum input tokens */
  maxInputTokens: number;

  /** Maximum output tokens */
  maxOutputTokens: number;

  /** Cost per 1M input tokens (USD) */
  costPerMillionInputTokens: number;

  /** Cost per 1M output tokens (USD) */
  costPerMillionOutputTokens: number;

  /** Supports function calling */
  supportsFunctionCalling: boolean;

  /** Supports streaming */
  supportsStreaming: boolean;

  /** Supports vision/image inputs */
  supportsVision: boolean;
}

/**
 * LLM generation parameters
 */
export interface LLMGenerationParams {
  /** Temperature for randomness (0-1) */
  temperature?: number;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Top-p nucleus sampling */
  topP?: number;

  /** Top-k sampling */
  topK?: number;

  /** Frequency penalty */
  frequencyPenalty?: number;

  /** Presence penalty */
  presencePenalty?: number;

  /** Stop sequences */
  stopSequences?: string[];

  /** Enable streaming */
  streaming?: boolean;
}

/**
 * LLM request options
 */
export interface LLMRequestOptions extends LLMGenerationParams {
  /** Provider to use */
  provider?: LLMProvider;

  /** Specific model to use */
  model?: string;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Number of retry attempts */
  retries?: number;

  /** Retry delay in milliseconds */
  retryDelay?: number;

  /** Enable caching */
  cache?: boolean;

  /** Cache TTL in seconds */
  cacheTTL?: number;

  /** Run name for LangSmith tracing */
  runName?: string;

  /** Metadata for tracing */
  metadata?: Record<string, unknown>;

  /** Tags for filtering in LangSmith */
  tags?: string[];
}

/**
 * LLM response
 */
export interface LLMResponse {
  /** Generated content */
  content: string;

  /** Token usage */
  usage: TokenUsageDetails;

  /** Model used */
  model: string;

  /** Provider used */
  provider: LLMProvider;

  /** Finish reason */
  finishReason: 'stop' | 'length' | 'content_filter' | 'function_call';

  /** Response time in milliseconds */
  responseTime: number;

  /** Was this from cache? */
  cached: boolean;

  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Detailed token usage information
 */
export interface TokenUsageDetails {
  /** Input/prompt tokens */
  inputTokens: number;

  /** Output/completion tokens */
  outputTokens: number;

  /** Total tokens */
  totalTokens: number;

  /** Cached tokens (if applicable) */
  cachedTokens?: number;

  /** Estimated cost in USD */
  estimatedCost: number;
}

/**
 * Token counting options
 */
export interface TokenCountOptions {
  /** Model to count tokens for */
  model?: string;

  /** Provider-specific encoding */
  provider?: LLMProvider;

  /** Include message overhead */
  includeMessageOverhead?: boolean;
}

/**
 * Streaming chunk callback
 */
export type StreamCallback = (chunk: {
  /** Incremental content */
  content: string;

  /** Is this the final chunk? */
  isFinal: boolean;

  /** Token usage (only on final chunk) */
  usage?: TokenUsageDetails;
}) => void | Promise<void>;

/**
 * LLM error types
 */
export enum LLMErrorType {
  API_ERROR = 'api_error',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  INVALID_REQUEST = 'invalid_request',
  AUTHENTICATION = 'authentication',
  CONTEXT_LENGTH_EXCEEDED = 'context_length_exceeded',
  CONTENT_FILTER = 'content_filter',
  UNKNOWN = 'unknown',
}

/**
 * LLM error information
 */
export interface LLMError extends Error {
  /** Error type */
  type: LLMErrorType;

  /** HTTP status code (if applicable) */
  statusCode?: number;

  /** Provider-specific error code */
  providerCode?: string;

  /** Is this error retryable? */
  retryable: boolean;

  /** Suggested retry delay in ms */
  retryAfter?: number;

  /** Original error */
  originalError?: Error;
}

/**
 * Token budget manager configuration
 */
export interface TokenBudgetConfig {
  /** Maximum total tokens allowed */
  maxTotalTokens: number;

  /** Reserve tokens for system prompts */
  systemPromptReserve: number;

  /** Reserve tokens for output */
  outputReserve: number;

  /** Truncation strategy */
  truncationStrategy: 'start' | 'end' | 'middle' | 'intelligent';

  /** Priority-based allocation */
  priorityAllocation?: Record<string, number>;
}

/**
 * Prompt template variable
 */
export interface PromptVariable {
  /** Variable name */
  name: string;

  /** Variable value */
  value: string | number | boolean | object;

  /** Token count for this variable */
  tokenCount: number;

  /** Is this variable required? */
  required: boolean;

  /** Can this variable be truncated? */
  truncatable: boolean;
}
