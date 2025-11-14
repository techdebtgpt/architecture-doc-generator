/**
 * Telemetry Service Tests
 * Tests telemetry and metrics tracking functionality
 */

import { TelemetryService } from '../../../src/mcp-server/services/telemetry.service';

describe('TelemetryService', () => {
  let telemetry: TelemetryService;

  beforeEach(() => {
    TelemetryService.resetInstance();
    telemetry = TelemetryService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = TelemetryService.getInstance();
      const instance2 = TelemetryService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should only create one instance', () => {
      const instance1 = TelemetryService.getInstance();
      const instance2 = TelemetryService.getInstance();
      const instance3 = TelemetryService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('recordExecution', () => {
    it('should record successful execution', () => {
      telemetry.recordExecution('test_tool', {}, 100, true);

      const metrics = telemetry.getToolMetrics('test_tool');

      expect(metrics).toBeDefined();
      expect(metrics?.executionCount).toBe(1);
      expect(metrics?.successCount).toBe(1);
      expect(metrics?.errorCount).toBe(0);
    });

    it('should record failed execution', () => {
      telemetry.recordExecution('test_tool', {}, 100, false, 'Test error');

      const metrics = telemetry.getToolMetrics('test_tool');

      expect(metrics?.executionCount).toBe(1);
      expect(metrics?.successCount).toBe(0);
      expect(metrics?.errorCount).toBe(1);
      expect(metrics?.lastError).toBe('Test error');
    });

    it('should track duration metrics', () => {
      telemetry.recordExecution('test_tool', {}, 50, true);
      telemetry.recordExecution('test_tool', {}, 100, true);
      telemetry.recordExecution('test_tool', {}, 150, true);

      const metrics = telemetry.getToolMetrics('test_tool');

      expect(metrics?.totalDurationMs).toBe(300);
      expect(metrics?.averageDurationMs).toBe(100);
      expect(metrics?.minDurationMs).toBe(50);
      expect(metrics?.maxDurationMs).toBe(150);
    });

    it('should update last execution info', () => {
      telemetry.recordExecution('test_tool', {}, 100, true);
      telemetry.recordExecution('test_tool', {}, 200, false, 'Error');

      const metrics = telemetry.getToolMetrics('test_tool');

      expect(metrics?.lastExecutionDurationMs).toBe(200);
      expect(metrics?.lastError).toBe('Error');
    });

    it('should track multiple tools independently', () => {
      telemetry.recordExecution('tool1', {}, 100, true);
      telemetry.recordExecution('tool2', {}, 200, true);

      const metrics1 = telemetry.getToolMetrics('tool1');
      const metrics2 = telemetry.getToolMetrics('tool2');

      expect(metrics1?.averageDurationMs).toBe(100);
      expect(metrics2?.averageDurationMs).toBe(200);
    });

    it('should sanitize sensitive arguments', () => {
      const args = {
        question: 'What is the architecture?',
        apiKey: 'secret-key-123',
        password: 'admin-password',
      };

      telemetry.recordExecution('test_tool', args, 100, true);

      const events = telemetry.getRecentEvents(1);
      expect(events[0].args.apiKey).toBe('***REDACTED***');
      expect(events[0].args.password).toBe('***REDACTED***');
      expect(events[0].args.question).toBe('What is the architecture?');
    });
  });

  describe('getToolMetrics', () => {
    it('should return metrics for existing tool', () => {
      telemetry.recordExecution('test_tool', {}, 100, true);

      const metrics = telemetry.getToolMetrics('test_tool');

      expect(metrics).toBeDefined();
      expect(metrics?.toolName).toBe('test_tool');
    });

    it('should return undefined for non-existent tool', () => {
      const metrics = telemetry.getToolMetrics('nonexistent_tool');

      expect(metrics).toBeUndefined();
    });
  });

  describe('getAllMetrics', () => {
    it('should return all metrics', () => {
      telemetry.recordExecution('tool1', {}, 100, true);
      telemetry.recordExecution('tool2', {}, 200, false);

      const metrics = telemetry.getAllMetrics();

      expect(metrics.totalExecutions).toBe(2);
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.failedExecutions).toBe(1);
    });

    it('should include tool metrics', () => {
      telemetry.recordExecution('test_tool', {}, 100, true);

      const metrics = telemetry.getAllMetrics();

      expect(metrics.toolMetrics['test_tool']).toBeDefined();
    });

    it('should include execution events', () => {
      telemetry.recordExecution('test_tool', {}, 100, true);

      const metrics = telemetry.getAllMetrics();

      expect(metrics.executionEvents.length).toBeGreaterThan(0);
    });

    it('should calculate average duration correctly', () => {
      telemetry.recordExecution('test_tool', {}, 100, true);
      telemetry.recordExecution('test_tool', {}, 200, true);

      const metrics = telemetry.getAllMetrics();

      expect(metrics.averageDurationMs).toBe(150);
    });
  });

  describe('getMetricsSummary', () => {
    it('should provide summary metrics', () => {
      telemetry.recordExecution('tool1', {}, 100, true);
      telemetry.recordExecution('tool2', {}, 200, true);
      telemetry.recordExecution('tool1', {}, 150, false);

      const summary = telemetry.getMetricsSummary();

      expect(summary.totalExecutions).toBe(3);
      expect(summary.successRate).toBeCloseTo(66.67, 1);
      expect(summary.toolCount).toBe(2);
    });

    it('should handle empty metrics', () => {
      const summary = telemetry.getMetricsSummary();

      expect(summary.totalExecutions).toBe(0);
      expect(summary.successRate).toBe(0);
      expect(summary.toolCount).toBe(0);
    });
  });

  describe('getToolExecutionHistory', () => {
    it('should return execution history for tool', () => {
      telemetry.recordExecution('test_tool', { param1: 'value1' }, 100, true);
      telemetry.recordExecution('test_tool', { param2: 'value2' }, 200, false);
      telemetry.recordExecution('other_tool', {}, 150, true);

      const history = telemetry.getToolExecutionHistory('test_tool');

      expect(history.length).toBe(2);
      expect(history.every((e) => e.toolName === 'test_tool')).toBe(true);
    });

    it('should limit history results', () => {
      for (let i = 0; i < 100; i++) {
        telemetry.recordExecution('test_tool', {}, 100, true);
      }

      const history = telemetry.getToolExecutionHistory('test_tool', 10);

      expect(history.length).toBe(10);
    });

    it('should return empty for tool with no history', () => {
      const history = telemetry.getToolExecutionHistory('nonexistent_tool');

      expect(history.length).toBe(0);
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent execution events', () => {
      telemetry.recordExecution('tool1', {}, 100, true);
      telemetry.recordExecution('tool2', {}, 200, true);
      telemetry.recordExecution('tool1', {}, 150, false);

      const events = telemetry.getRecentEvents(10);

      expect(events.length).toBe(3);
    });

    it('should limit recent events', () => {
      for (let i = 0; i < 100; i++) {
        telemetry.recordExecution('test_tool', {}, 100, true);
      }

      const events = telemetry.getRecentEvents(10);

      expect(events.length).toBe(10);
    });
  });

  describe('getToolUsageRanking', () => {
    it('should rank tools by usage', () => {
      telemetry.recordExecution('tool1', {}, 100, true);
      telemetry.recordExecution('tool1', {}, 100, true);
      telemetry.recordExecution('tool1', {}, 100, true);
      telemetry.recordExecution('tool2', {}, 200, true);
      telemetry.recordExecution('tool2', {}, 200, true);
      telemetry.recordExecution('tool3', {}, 300, true);

      const ranking = telemetry.getToolUsageRanking();

      expect(ranking[0].toolName).toBe('tool1');
      expect(ranking[0].count).toBe(3);
      expect(ranking[1].toolName).toBe('tool2');
      expect(ranking[1].count).toBe(2);
      expect(ranking[2].toolName).toBe('tool3');
      expect(ranking[2].count).toBe(1);
    });

    it('should include success rates', () => {
      telemetry.recordExecution('tool1', {}, 100, true);
      telemetry.recordExecution('tool1', {}, 100, false);

      const ranking = telemetry.getToolUsageRanking();

      expect(ranking[0].successRate).toBe(50);
    });
  });

  describe('getToolPerformanceRanking', () => {
    it('should rank tools by performance', () => {
      telemetry.recordExecution('tool1', {}, 100, true);
      telemetry.recordExecution('tool2', {}, 200, true);
      telemetry.recordExecution('tool3', {}, 50, true);

      const ranking = telemetry.getToolPerformanceRanking();

      expect(ranking[0].toolName).toBe('tool2');
      expect(ranking[0].averageDurationMs).toBe(200);
      expect(ranking[1].toolName).toBe('tool1');
      expect(ranking[2].toolName).toBe('tool3');
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      telemetry.recordExecution('test_tool', {}, 100, true);
      telemetry.recordExecution('test_tool', {}, 200, true);

      telemetry.reset();

      const metrics = telemetry.getAllMetrics();

      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.executionEvents.length).toBe(0);
    });
  });

  describe('resetToolMetrics', () => {
    it('should clear metrics for specific tool', () => {
      telemetry.recordExecution('tool1', {}, 100, true);
      telemetry.recordExecution('tool2', {}, 200, true);

      telemetry.resetToolMetrics('tool1');

      const tool1Metrics = telemetry.getToolMetrics('tool1');
      const tool2Metrics = telemetry.getToolMetrics('tool2');

      expect(tool1Metrics).toBeUndefined();
      expect(tool2Metrics).toBeDefined();
    });
  });

  describe('Enable/Disable', () => {
    it('should respect disabled state', () => {
      telemetry.disable();

      telemetry.recordExecution('test_tool', {}, 100, true);

      const metrics = telemetry.getToolMetrics('test_tool');

      expect(metrics).toBeUndefined();
    });

    it('should allow re-enabling', () => {
      telemetry.disable();
      telemetry.recordExecution('test_tool', {}, 100, true);

      telemetry.enable();
      telemetry.recordExecution('test_tool', {}, 200, true);

      const metrics = telemetry.getToolMetrics('test_tool');

      expect(metrics?.executionCount).toBe(1); // Only after re-enable
    });

    it('should report enabled state', () => {
      expect(telemetry.isEnabled()).toBe(true);

      telemetry.disable();
      expect(telemetry.isEnabled()).toBe(false);

      telemetry.enable();
      expect(telemetry.isEnabled()).toBe(true);
    });
  });

  describe('export', () => {
    it('should export metrics as object', () => {
      telemetry.recordExecution('test_tool', {}, 100, true);

      const exported = telemetry.export();

      expect(exported).toHaveProperty('totalExecutions');
      expect(exported).toHaveProperty('toolMetrics');
    });
  });

  describe('exportAsString', () => {
    it('should export metrics as formatted string', () => {
      telemetry.recordExecution('test_tool', {}, 100, true);

      const exported = telemetry.exportAsString();

      expect(typeof exported).toBe('string');
      expect(exported).toContain('Telemetry Report');
      expect(exported).toContain('test_tool');
    });

    it('should include metrics summary in export', () => {
      telemetry.recordExecution('test_tool', {}, 100, true);
      telemetry.recordExecution('test_tool', {}, 200, false);

      const exported = telemetry.exportAsString();

      expect(exported).toContain('Total Executions');
      expect(exported).toContain('Successful');
      expect(exported).toContain('Failed');
      expect(exported).toContain('Success Rate');
    });
  });

  describe('Event Limit', () => {
    it('should maintain max events limit', () => {
      // Record more than max events (1000)
      for (let i = 0; i < 1100; i++) {
        telemetry.recordExecution('test_tool', {}, 100, true);
      }

      const metrics = telemetry.getAllMetrics();

      // Should keep only last 1000 events
      expect(metrics.executionEvents.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Sensitive Data Redaction', () => {
    it('should redact API keys', () => {
      telemetry.recordExecution('test_tool', { apiKey: 'secret-123' }, 100, true);

      const events = telemetry.getRecentEvents(1);

      expect(events[0].args.apiKey).toBe('***REDACTED***');
    });

    it('should redact passwords', () => {
      telemetry.recordExecution('test_tool', { password: 'admin-pwd' }, 100, true);

      const events = telemetry.getRecentEvents(1);

      expect(events[0].args.password).toBe('***REDACTED***');
    });

    it('should redact tokens', () => {
      telemetry.recordExecution('test_tool', { token: 'jwt-token-xyz' }, 100, true);

      const events = telemetry.getRecentEvents(1);

      expect(events[0].args.token).toBe('***REDACTED***');
    });

    it('should truncate long strings', () => {
      const longString = 'x'.repeat(200);
      telemetry.recordExecution('test_tool', { largeParam: longString }, 100, true);

      const events = telemetry.getRecentEvents(1);

      expect(events[0].args.largeParam).toContain('(truncated)');
      expect(events[0].args.largeParam.length).toBeLessThan(200);
    });

    it('should preserve non-sensitive data', () => {
      telemetry.recordExecution('test_tool', { question: 'test' }, 100, true);

      const events = telemetry.getRecentEvents(1);

      expect(events[0].args.question).toBe('test');
    });
  });

  describe('Integration Scenarios', () => {
    it('should track multiple tool executions', () => {
      telemetry.recordExecution('check_config', {}, 10, true);
      telemetry.recordExecution('generate_documentation', {}, 5000, true);
      telemetry.recordExecution('query_documentation', {}, 100, true);
      telemetry.recordExecution('query_documentation', {}, 80, true);
      telemetry.recordExecution('generate_documentation', {}, 4500, false, 'Timeout');

      const metrics = telemetry.getAllMetrics();
      const summary = telemetry.getMetricsSummary();

      expect(metrics.totalExecutions).toBe(5);
      expect(metrics.successfulExecutions).toBe(4);
      expect(summary.successRate).toBe(80);
    });

    it('should provide performance analysis', () => {
      telemetry.recordExecution('fast_tool', {}, 50, true);
      telemetry.recordExecution('slow_tool', {}, 5000, true);

      const ranking = telemetry.getToolPerformanceRanking();

      expect(ranking[0].toolName).toBe('slow_tool');
      expect(ranking[0].averageDurationMs).toBe(5000);
    });

    it('should provide usage analysis', () => {
      telemetry.recordExecution('popular_tool', {}, 100, true);
      telemetry.recordExecution('popular_tool', {}, 100, true);
      telemetry.recordExecution('popular_tool', {}, 100, true);
      telemetry.recordExecution('rare_tool', {}, 100, true);

      const ranking = telemetry.getToolUsageRanking();

      expect(ranking[0].toolName).toBe('popular_tool');
      expect(ranking[0].count).toBe(3);
    });
  });
});
