/**
 * Rate Limiter Service Tests
 * Tests rate limiting functionality
 */

import {
  RateLimiterService,
  RateLimitConfig,
  DEFAULT_RATE_LIMITS,
} from '../../../src/mcp-server/services/rate-limiter.service';

describe('RateLimiterService', () => {
  let rateLimiter: RateLimiterService;

  beforeEach(() => {
    RateLimiterService.resetInstance();
    rateLimiter = RateLimiterService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = RateLimiterService.getInstance();
      const instance2 = RateLimiterService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should only create one instance', () => {
      const instance1 = RateLimiterService.getInstance();
      const instance2 = RateLimiterService.getInstance();
      const instance3 = RateLimiterService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('configureToolLimit', () => {
    it('should configure rate limit for a tool', () => {
      const config: RateLimitConfig = {
        maxRequests: 5,
        windowMs: 1000,
      };

      rateLimiter.configureToolLimit('test_tool', config);

      expect(rateLimiter.getConfiguredTools()).toContain('test_tool');
    });

    it('should update existing configuration', () => {
      const config1: RateLimitConfig = {
        maxRequests: 5,
        windowMs: 1000,
      };
      const config2: RateLimitConfig = {
        maxRequests: 10,
        windowMs: 2000,
      };

      rateLimiter.configureToolLimit('test_tool', config1);
      rateLimiter.configureToolLimit('test_tool', config2);

      const info = rateLimiter.getRateLimitInfo('test_tool');
      expect(info?.limit).toBe(10);
    });

    it('should support custom key generator', () => {
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 1000,
        keyGenerator: (args) => `${args.userId}:${args.toolName}`,
      };

      rateLimiter.configureToolLimit('user_specific_tool', config);

      expect(rateLimiter.getConfiguredTools()).toContain('user_specific_tool');
    });
  });

  describe('isAllowed', () => {
    beforeEach(() => {
      const config: RateLimitConfig = {
        maxRequests: 3,
        windowMs: 1000,
      };
      rateLimiter.configureToolLimit('test_tool', config);
    });

    it('should allow requests within limit', () => {
      expect(rateLimiter.isAllowed('test_tool')).toBe(true);
      expect(rateLimiter.isAllowed('test_tool')).toBe(true);
      expect(rateLimiter.isAllowed('test_tool')).toBe(true);
    });

    it('should reject requests exceeding limit', () => {
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');

      expect(rateLimiter.isAllowed('test_tool')).toBe(false);
    });

    it('should allow requests after window expires', async () => {
      // Make 3 requests (hit limit)
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');

      expect(rateLimiter.isAllowed('test_tool')).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(rateLimiter.isAllowed('test_tool')).toBe(true);
    });

    it('should allow unconfigured tools', () => {
      expect(rateLimiter.isAllowed('unconfigured_tool')).toBe(true);
      expect(rateLimiter.isAllowed('unconfigured_tool')).toBe(true);
    });

    it('should track requests with custom key generator', () => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 1000,
        keyGenerator: (args) => `user:${args.userId}`,
      };

      rateLimiter.configureToolLimit('user_tool', config);

      // User 1 has 2 requests
      expect(rateLimiter.isAllowed('user_tool', { userId: 1 })).toBe(true);
      expect(rateLimiter.isAllowed('user_tool', { userId: 1 })).toBe(true);
      expect(rateLimiter.isAllowed('user_tool', { userId: 1 })).toBe(false);

      // User 2 is independent
      expect(rateLimiter.isAllowed('user_tool', { userId: 2 })).toBe(true);
      expect(rateLimiter.isAllowed('user_tool', { userId: 2 })).toBe(true);
      expect(rateLimiter.isAllowed('user_tool', { userId: 2 })).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 1000,
      };
      rateLimiter.configureToolLimit('test_tool', config);
    });

    it('should not report violation within limit', () => {
      rateLimiter.isAllowed('test_tool');

      const violation = rateLimiter.checkRateLimit('test_tool');

      expect(violation.exceeded).toBe(false);
      expect(violation.remainingMs).toBe(0);
      expect(violation.retryAfter).toBe(0);
    });

    it('should report violation when exceeded', () => {
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');

      const violation = rateLimiter.checkRateLimit('test_tool');

      expect(violation.exceeded).toBe(true);
      expect(violation.remainingMs).toBeGreaterThan(0);
      expect(violation.retryAfter).toBeGreaterThan(0);
    });

    it('should provide correct retry after time', async () => {
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');

      const violation = rateLimiter.checkRateLimit('test_tool');

      expect(violation.retryAfter).toBeGreaterThanOrEqual(0);
      expect(violation.retryAfter).toBeLessThanOrEqual(2); // Should be <= 1 second
    });

    it('should not report violation for unconfigured tool', () => {
      const violation = rateLimiter.checkRateLimit('unconfigured_tool');

      expect(violation.exceeded).toBe(false);
    });
  });

  describe('getRateLimitInfo', () => {
    beforeEach(() => {
      const config: RateLimitConfig = {
        maxRequests: 5,
        windowMs: 1000,
      };
      rateLimiter.configureToolLimit('test_tool', config);
    });

    it('should return rate limit info', () => {
      const info = rateLimiter.getRateLimitInfo('test_tool');

      expect(info).toBeDefined();
      expect(info?.limit).toBe(5);
      expect(info?.remaining).toBe(5);
      expect(info?.resetTime).toBeGreaterThan(Date.now());
    });

    it('should decrease remaining count after requests', () => {
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');

      const info = rateLimiter.getRateLimitInfo('test_tool');

      expect(info?.remaining).toBe(3); // 5 - 2
    });

    it('should show zero remaining when limit exceeded', () => {
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');

      const info = rateLimiter.getRateLimitInfo('test_tool');

      expect(info?.remaining).toBe(0);
    });

    it('should return undefined for unconfigured tool', () => {
      const info = rateLimiter.getRateLimitInfo('unconfigured_tool');

      expect(info).toBeUndefined();
    });

    it('should provide reset time', () => {
      const before = Date.now();
      rateLimiter.isAllowed('test_tool');
      const info = rateLimiter.getRateLimitInfo('test_tool');
      const after = Date.now();

      expect(info?.resetTime).toBeGreaterThanOrEqual(before + 1000);
      expect(info?.resetTime).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe('recordRequest', () => {
    beforeEach(() => {
      const config: RateLimitConfig = {
        maxRequests: 3,
        windowMs: 1000,
      };
      rateLimiter.configureToolLimit('test_tool', config);
    });

    it('should record request manually', () => {
      rateLimiter.recordRequest('test_tool');
      rateLimiter.recordRequest('test_tool');

      const info = rateLimiter.getRateLimitInfo('test_tool');
      expect(info?.remaining).toBe(1); // 3 - 2
    });

    it('should count manual records towards limit', () => {
      rateLimiter.recordRequest('test_tool');
      rateLimiter.recordRequest('test_tool');
      rateLimiter.recordRequest('test_tool');

      expect(rateLimiter.isAllowed('test_tool')).toBe(false);
    });
  });

  describe('resetToolLimit', () => {
    beforeEach(() => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 1000,
      };
      rateLimiter.configureToolLimit('test_tool', config);
    });

    it('should reset requests for specific tool', () => {
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');

      expect(rateLimiter.isAllowed('test_tool')).toBe(false);

      rateLimiter.resetToolLimit('test_tool');

      expect(rateLimiter.isAllowed('test_tool')).toBe(true);
    });

    it('should not affect other tools', () => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 1000,
      };
      rateLimiter.configureToolLimit('other_tool', config);

      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('other_tool');
      rateLimiter.isAllowed('other_tool');

      rateLimiter.resetToolLimit('test_tool');

      expect(rateLimiter.isAllowed('test_tool')).toBe(true);
      expect(rateLimiter.isAllowed('other_tool')).toBe(false);
    });
  });

  describe('resetAll', () => {
    it('should reset all tools', () => {
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 1000,
      };

      rateLimiter.configureToolLimit('tool1', config);
      rateLimiter.configureToolLimit('tool2', config);

      rateLimiter.isAllowed('tool1');
      rateLimiter.isAllowed('tool2');

      expect(rateLimiter.isAllowed('tool1')).toBe(false);
      expect(rateLimiter.isAllowed('tool2')).toBe(false);

      rateLimiter.resetAll();

      // Configurations remain, but request history is cleared
      expect(rateLimiter.isAllowed('tool1')).toBe(true);
      expect(rateLimiter.isAllowed('tool2')).toBe(true);
    });
  });

  describe('getConfiguredTools', () => {
    it('should return list of configured tools', () => {
      const config: RateLimitConfig = {
        maxRequests: 5,
        windowMs: 1000,
      };

      rateLimiter.configureToolLimit('tool1', config);
      rateLimiter.configureToolLimit('tool2', config);

      const tools = rateLimiter.getConfiguredTools();

      expect(tools).toContain('tool1');
      expect(tools).toContain('tool2');
      expect(tools.length).toBe(2);
    });
  });

  describe('removeToolLimit', () => {
    it('should remove rate limit for tool', () => {
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 1000,
      };
      rateLimiter.configureToolLimit('test_tool', config);

      rateLimiter.isAllowed('test_tool');
      expect(rateLimiter.isAllowed('test_tool')).toBe(false);

      rateLimiter.removeToolLimit('test_tool');

      // After removal, should allow unlimited requests
      expect(rateLimiter.isAllowed('test_tool')).toBe(true);
      expect(rateLimiter.isAllowed('test_tool')).toBe(true);
    });

    it('should be removed from configured tools list', () => {
      const config: RateLimitConfig = {
        maxRequests: 5,
        windowMs: 1000,
      };
      rateLimiter.configureToolLimit('test_tool', config);

      expect(rateLimiter.getConfiguredTools()).toContain('test_tool');

      rateLimiter.removeToolLimit('test_tool');

      expect(rateLimiter.getConfiguredTools()).not.toContain('test_tool');
    });
  });

  describe('DEFAULT_RATE_LIMITS', () => {
    it('should have configuration for all standard tools', () => {
      const standardTools = [
        'check_config',
        'setup_config',
        'generate_documentation',
        'query_documentation',
        'update_documentation',
        'check_architecture_patterns',
        'analyze_dependencies',
        'get_recommendations',
        'validate_architecture',
      ];

      standardTools.forEach((tool) => {
        expect(DEFAULT_RATE_LIMITS[tool]).toBeDefined();
        expect(DEFAULT_RATE_LIMITS[tool].maxRequests).toBeGreaterThan(0);
        expect(DEFAULT_RATE_LIMITS[tool].windowMs).toBeGreaterThan(0);
      });
    });

    it('should limit expensive operations more strictly', () => {
      const cheapOps = [DEFAULT_RATE_LIMITS.check_config, DEFAULT_RATE_LIMITS.query_documentation];
      const expensiveOps = [
        DEFAULT_RATE_LIMITS.generate_documentation,
        DEFAULT_RATE_LIMITS.update_documentation,
      ];

      const cheapLimit = cheapOps.reduce((sum, op) => sum + op.maxRequests, 0) / cheapOps.length;
      const expensiveLimit =
        expensiveOps.reduce((sum, op) => sum + op.maxRequests, 0) / expensiveOps.length;

      expect(expensiveLimit).toBeLessThan(cheapLimit);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple rapid requests correctly', async () => {
      const config: RateLimitConfig = {
        maxRequests: 5,
        windowMs: 1000,
      };
      rateLimiter.configureToolLimit('test_tool', config);

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(rateLimiter.isAllowed('test_tool'));
      }

      expect(results.filter((r) => r === true).length).toBe(5);
      expect(results.filter((r) => r === false).length).toBe(5);
    });

    it('should isolate limits between different keys', () => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 1000,
        keyGenerator: (args) => args.key,
      };
      rateLimiter.configureToolLimit('keyed_tool', config);

      // Key 1: 2 requests allowed
      expect(rateLimiter.isAllowed('keyed_tool', { key: '1' })).toBe(true);
      expect(rateLimiter.isAllowed('keyed_tool', { key: '1' })).toBe(true);
      expect(rateLimiter.isAllowed('keyed_tool', { key: '1' })).toBe(false);

      // Key 2: Independent
      expect(rateLimiter.isAllowed('keyed_tool', { key: '2' })).toBe(true);
      expect(rateLimiter.isAllowed('keyed_tool', { key: '2' })).toBe(true);
      expect(rateLimiter.isAllowed('keyed_tool', { key: '2' })).toBe(false);
    });
  });

  describe('Window Expiration', () => {
    it('should clean up old requests', async () => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 500, // Very short window
      };
      rateLimiter.configureToolLimit('test_tool', config);

      // Make 2 requests
      rateLimiter.isAllowed('test_tool');
      rateLimiter.isAllowed('test_tool');

      // Hit limit
      expect(rateLimiter.isAllowed('test_tool')).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Old requests should be cleaned up
      const info = rateLimiter.getRateLimitInfo('test_tool');
      expect(info?.remaining).toBe(config.maxRequests);
    });
  });
});
