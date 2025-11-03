import { Logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: ((error: unknown) => boolean) | RegExp[];
  onRetry?: (attempt: number, error: unknown) => void | Promise<void>;
}

/**
 * Retry utility with exponential backoff for handling transient failures
 */
export class Retry {
  private static logger = new Logger('Retry');

  /**
   * Execute a function with retry logic
   *
   * @param fn - Function to execute
   * @param options - Retry configuration
   * @returns Result of successful execution
   */
  public static async execute<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const {
      maxAttempts = 3,
      initialDelayMs = 1000,
      maxDelayMs = 10000,
      backoffMultiplier = 2,
      retryableErrors,
      onRetry,
    } = options;

    let lastError: unknown;
    let currentDelay = initialDelayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (retryableErrors && !this.isRetryableError(error, retryableErrors)) {
          throw error; // Non-retryable error, fail immediately
        }

        // Last attempt, throw error
        if (attempt === maxAttempts) {
          this.logger.error(
            `Failed after ${maxAttempts} attempts`,
            error instanceof Error ? error.message : String(error),
          );
          throw error;
        }

        // Log retry attempt
        this.logger.warn(
          `Attempt ${attempt}/${maxAttempts} failed, retrying in ${currentDelay}ms...`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );

        // Call onRetry callback
        if (onRetry) {
          await onRetry(attempt, error);
        }

        // Wait before retry
        await this.sleep(currentDelay);

        // Exponential backoff
        currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
      }
    }

    throw lastError;
  }

  /**
   * Execute with retry for JSON parsing failures specifically
   * Useful for LLM responses that may return invalid JSON on first attempt
   */
  public static async executeWithJsonRetry<T>(
    fn: (attempt: number) => Promise<T>,
    validateJson: (result: T) => boolean,
    options: Omit<RetryOptions, 'retryableErrors'> = {},
  ): Promise<T> {
    const maxAttempts = options.maxAttempts || 2; // Default 2 attempts for JSON
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn(attempt);

        // Validate JSON structure
        if (validateJson(result)) {
          if (attempt > 1) {
            this.logger.info(`✅ JSON validation succeeded on attempt ${attempt}`);
          }
          return result;
        }

        // Invalid JSON structure
        throw new Error('Invalid JSON structure returned');
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          this.logger.error(
            `JSON validation failed after ${maxAttempts} attempts`,
            error instanceof Error ? error.message : String(error),
          );
          throw error;
        }

        this.logger.warn(
          `Attempt ${attempt}/${maxAttempts} returned invalid JSON, retrying with stricter prompt...`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );

        if (options.onRetry) {
          await options.onRetry(attempt, error);
        }

        // Small delay before retry
        await this.sleep(options.initialDelayMs || 500);
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable based on configured rules
   */
  private static isRetryableError(
    error: unknown,
    rules: ((error: unknown) => boolean) | RegExp[],
  ): boolean {
    if (typeof rules === 'function') {
      return rules(error);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return rules.some((pattern) => pattern.test(errorMessage));
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Common retry configurations
   */
  public static readonly configs = {
    /**
     * Configuration for network/API retries
     */
    api: {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
      retryableErrors: [
        /timeout/i,
        /ECONNRESET/i,
        /ETIMEDOUT/i,
        /ENOTFOUND/i,
        /429/i, // Too many requests
        /503/i, // Service unavailable
        /504/i, // Gateway timeout
      ],
    },

    /**
     * Configuration for file I/O retries
     */
    fileIO: {
      maxAttempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
      retryableErrors: [/EBUSY/i, /EMFILE/i, /EAGAIN/i],
    },

    /**
     * Configuration for JSON parsing retries (LLM responses)
     */
    jsonParsing: {
      maxAttempts: 2,
      initialDelayMs: 500,
      maxDelayMs: 1000,
      backoffMultiplier: 1,
    },
  };
}
