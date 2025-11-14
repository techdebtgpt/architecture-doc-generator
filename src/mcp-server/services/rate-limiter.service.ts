/**
 * Rate Limiter Service
 * Manages rate limiting for MCP tools
 */

import { Logger } from '../../utils/logger';

/**
 * Rate limit configuration for a tool
 */
export interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  keyGenerator?: (args: Record<string, any>) => string; // Custom key generator (default: tool name)
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

/**
 * Rate limit violation info
 */
export interface RateLimitViolation {
  exceeded: boolean;
  remainingMs: number;
  retryAfter: number;
}

/**
 * Singleton rate limiter service
 */
export class RateLimiterService {
  private static instance: RateLimiterService;
  private logger = new Logger('RateLimiter');
  private configs = new Map<string, RateLimitConfig>();
  private requests = new Map<string, Array<{ timestamp: number }>>();

  private constructor() {}

  /**
   * Get or create singleton instance
   */
  static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  /**
   * Configure rate limit for a tool
   */
  configureToolLimit(toolName: string, config: RateLimitConfig): void {
    this.configs.set(toolName, config);
    this.logger.info(
      `Configured rate limit for ${toolName}: ${config.maxRequests} requests per ${config.windowMs}ms`,
    );
  }

  /**
   * Check if request is allowed
   */
  isAllowed(toolName: string, args?: Record<string, any>): boolean {
    const config = this.configs.get(toolName);
    if (!config) {
      return true; // No limit configured
    }

    const key = config.keyGenerator ? config.keyGenerator(args ?? {}) : toolName;
    const now = Date.now();

    // Get or create request history
    let history = this.requests.get(key);
    if (!history) {
      history = [];
      this.requests.set(key, history);
    }

    // Remove old requests outside the window
    const windowStart = now - config.windowMs;
    while (history.length > 0 && history[0].timestamp < windowStart) {
      history.shift();
    }

    // Check limit
    if (history.length < config.maxRequests) {
      history.push({ timestamp: now });
      return true;
    }

    return false;
  }

  /**
   * Check and get rate limit info
   */
  checkRateLimit(toolName: string, args?: Record<string, any>): RateLimitViolation {
    const config = this.configs.get(toolName);
    if (!config) {
      return {
        exceeded: false,
        remainingMs: 0,
        retryAfter: 0,
      };
    }

    const key = config.keyGenerator ? config.keyGenerator(args ?? {}) : toolName;
    const now = Date.now();

    // Get request history
    const history = this.requests.get(key);
    if (!history) {
      return {
        exceeded: false,
        remainingMs: 0,
        retryAfter: 0,
      };
    }

    // Remove old requests outside the window
    const windowStart = now - config.windowMs;
    while (history.length > 0 && history[0].timestamp < windowStart) {
      history.shift();
    }

    // Check if limit exceeded
    if (history.length >= config.maxRequests) {
      const oldestRequest = history[0].timestamp;
      const resetTime = oldestRequest + config.windowMs;
      const remainingMs = resetTime - now;
      const retryAfter = Math.ceil(remainingMs / 1000); // in seconds

      return {
        exceeded: true,
        remainingMs,
        retryAfter,
      };
    }

    return {
      exceeded: false,
      remainingMs: 0,
      retryAfter: 0,
    };
  }

  /**
   * Get current rate limit info
   */
  getRateLimitInfo(toolName: string, args?: Record<string, any>): RateLimitInfo | undefined {
    const config = this.configs.get(toolName);
    if (!config) {
      return undefined;
    }

    const key = config.keyGenerator ? config.keyGenerator(args ?? {}) : toolName;
    const now = Date.now();

    const history = this.requests.get(key);
    if (!history) {
      return {
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
        limit: config.maxRequests,
      };
    }

    // Remove old requests
    const windowStart = now - config.windowMs;
    while (history.length > 0 && history[0].timestamp < windowStart) {
      history.shift();
    }

    const remaining = Math.max(0, config.maxRequests - history.length);
    const resetTime =
      history.length > 0 ? history[0].timestamp + config.windowMs : now + config.windowMs;

    return {
      remaining,
      resetTime,
      limit: config.maxRequests,
    };
  }

  /**
   * Record a request
   */
  recordRequest(toolName: string, args?: Record<string, any>): void {
    const config = this.configs.get(toolName);
    if (!config) {
      return;
    }

    const key = config.keyGenerator ? config.keyGenerator(args ?? {}) : toolName;
    const now = Date.now();

    let history = this.requests.get(key);
    if (!history) {
      history = [];
      this.requests.set(key, history);
    }

    // Remove old requests
    const windowStart = now - config.windowMs;
    while (history.length > 0 && history[0].timestamp < windowStart) {
      history.shift();
    }

    history.push({ timestamp: now });
  }

  /**
   * Reset rate limit for a tool
   */
  resetToolLimit(toolName: string): void {
    this.requests.delete(toolName);
    this.logger.info(`Reset rate limit for ${toolName}`);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.requests.clear();
    this.logger.info('Reset all rate limits');
  }

  /**
   * Get all configured tools
   */
  getConfiguredTools(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Remove rate limit for a tool
   */
  removeToolLimit(toolName: string): void {
    this.configs.delete(toolName);
    this.requests.delete(toolName);
    this.logger.info(`Removed rate limit for ${toolName}`);
  }

  /**
   * Clear singleton instance (for testing)
   */
  static resetInstance(): void {
    (RateLimiterService as any).instance = undefined;
  }
}

/**
 * Default rate limits per tool
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  check_config: {
    maxRequests: 10,
    windowMs: 60000, // 10 requests per minute
  },
  setup_config: {
    maxRequests: 5,
    windowMs: 60000, // 5 requests per minute
  },
  generate_documentation: {
    maxRequests: 2,
    windowMs: 60000, // 2 requests per minute (expensive operation)
  },
  query_documentation: {
    maxRequests: 20,
    windowMs: 60000, // 20 requests per minute
  },
  update_documentation: {
    maxRequests: 3,
    windowMs: 60000, // 3 requests per minute (expensive operation)
  },
  check_architecture_patterns: {
    maxRequests: 5,
    windowMs: 60000, // 5 requests per minute
  },
  analyze_dependencies: {
    maxRequests: 5,
    windowMs: 60000, // 5 requests per minute
  },
  get_recommendations: {
    maxRequests: 5,
    windowMs: 60000, // 5 requests per minute
  },
  validate_architecture: {
    maxRequests: 10,
    windowMs: 60000, // 10 requests per minute
  },
};
