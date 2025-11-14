/**
 * Telemetry Service
 * Tracks tool usage and performance metrics
 */

import { Logger } from '../../utils/logger';

/**
 * Tool execution metrics
 */
export interface ToolMetrics {
  toolName: string;
  executionCount: number;
  successCount: number;
  errorCount: number;
  totalDurationMs: number;
  averageDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  lastExecutedAt: number;
  lastExecutionDurationMs: number;
  lastError?: string;
}

/**
 * Execution event
 */
export interface ExecutionEvent {
  toolName: string;
  args: Record<string, any>;
  durationMs: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

/**
 * System metrics summary
 */
export interface SystemMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDurationMs: number;
  totalDurationMs: number;
  toolMetrics: Record<string, ToolMetrics>;
  executionEvents: ExecutionEvent[];
}

/**
 * Singleton telemetry service
 */
export class TelemetryService {
  private static instance: TelemetryService;
  private logger = new Logger('Telemetry');
  private metrics = new Map<string, ToolMetrics>();
  private events: ExecutionEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events
  private enabled = true;

  private constructor() {}

  /**
   * Get or create singleton instance
   */
  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  /**
   * Record tool execution
   */
  recordExecution(
    toolName: string,
    args: Record<string, any>,
    durationMs: number,
    success: boolean,
    error?: string,
  ): void {
    if (!this.enabled) return;

    // Update tool metrics
    let metrics = this.metrics.get(toolName);
    if (!metrics) {
      metrics = {
        toolName,
        executionCount: 0,
        successCount: 0,
        errorCount: 0,
        totalDurationMs: 0,
        averageDurationMs: 0,
        minDurationMs: durationMs,
        maxDurationMs: durationMs,
        lastExecutedAt: Date.now(),
        lastExecutionDurationMs: durationMs,
      };
      this.metrics.set(toolName, metrics);
    }

    // Update metrics
    metrics.executionCount++;
    metrics.totalDurationMs += durationMs;
    metrics.averageDurationMs = metrics.totalDurationMs / metrics.executionCount;
    metrics.minDurationMs = Math.min(metrics.minDurationMs, durationMs);
    metrics.maxDurationMs = Math.max(metrics.maxDurationMs, durationMs);
    metrics.lastExecutedAt = Date.now();
    metrics.lastExecutionDurationMs = durationMs;

    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
      metrics.lastError = error;
    }

    // Record event
    const event: ExecutionEvent = {
      toolName,
      args: this.sanitizeArgs(args),
      durationMs,
      success,
      error,
      timestamp: Date.now(),
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    this.logger.debug(
      `Tool '${toolName}' executed in ${durationMs}ms (${success ? 'success' : 'error'})`,
    );
  }

  /**
   * Get metrics for specific tool
   */
  getToolMetrics(toolName: string): ToolMetrics | undefined {
    return this.metrics.get(toolName);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): SystemMetrics {
    const toolMetrics: Record<string, ToolMetrics> = {};
    let totalExecutions = 0;
    let successfulExecutions = 0;
    let failedExecutions = 0;
    let totalDurationMs = 0;

    for (const [name, metrics] of this.metrics.entries()) {
      toolMetrics[name] = metrics;
      totalExecutions += metrics.executionCount;
      successfulExecutions += metrics.successCount;
      failedExecutions += metrics.errorCount;
      totalDurationMs += metrics.totalDurationMs;
    }

    const averageDurationMs = totalExecutions > 0 ? totalDurationMs / totalExecutions : 0;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageDurationMs,
      totalDurationMs,
      toolMetrics,
      executionEvents: this.events,
    };
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    totalExecutions: number;
    successRate: number;
    averageDurationMs: number;
    toolCount: number;
  } {
    const metrics = this.getAllMetrics();
    const successRate =
      metrics.totalExecutions > 0
        ? (metrics.successfulExecutions / metrics.totalExecutions) * 100
        : 0;

    return {
      totalExecutions: metrics.totalExecutions,
      successRate,
      averageDurationMs: metrics.averageDurationMs,
      toolCount: Object.keys(metrics.toolMetrics).length,
    };
  }

  /**
   * Get execution history for tool
   */
  getToolExecutionHistory(toolName: string, limit = 50): ExecutionEvent[] {
    return this.events.filter((e) => e.toolName === toolName).slice(-limit);
  }

  /**
   * Get recent execution events
   */
  getRecentEvents(limit = 50): ExecutionEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get tool usage ranking
   */
  getToolUsageRanking(): Array<{ toolName: string; count: number; successRate: number }> {
    const ranking: Array<{ toolName: string; count: number; successRate: number }> = [];

    for (const [name, metrics] of this.metrics.entries()) {
      const successRate =
        metrics.executionCount > 0 ? (metrics.successCount / metrics.executionCount) * 100 : 0;

      ranking.push({
        toolName: name,
        count: metrics.executionCount,
        successRate,
      });
    }

    return ranking.sort((a, b) => b.count - a.count);
  }

  /**
   * Get tools by performance
   */
  getToolPerformanceRanking(): Array<{ toolName: string; averageDurationMs: number }> {
    const ranking: Array<{ toolName: string; averageDurationMs: number }> = [];

    for (const [name, metrics] of this.metrics.entries()) {
      ranking.push({
        toolName: name,
        averageDurationMs: metrics.averageDurationMs,
      });
    }

    return ranking.sort((a, b) => b.averageDurationMs - a.averageDurationMs);
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics.clear();
    this.events = [];
    this.logger.info('Telemetry metrics reset');
  }

  /**
   * Reset tool metrics
   */
  resetToolMetrics(toolName: string): void {
    this.metrics.delete(toolName);
    this.events = this.events.filter((e) => e.toolName !== toolName);
    this.logger.info(`Reset metrics for tool: ${toolName}`);
  }

  /**
   * Enable telemetry
   */
  enable(): void {
    this.enabled = true;
    this.logger.info('Telemetry enabled');
  }

  /**
   * Disable telemetry
   */
  disable(): void {
    this.enabled = false;
    this.logger.info('Telemetry disabled');
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Export metrics as JSON
   */
  export(): object {
    return this.getAllMetrics();
  }

  /**
   * Export metrics as formatted string
   */
  exportAsString(): string {
    const metrics = this.getAllMetrics();

    let report = `
=== Telemetry Report ===

Total Executions: ${metrics.totalExecutions}
Successful: ${metrics.successfulExecutions}
Failed: ${metrics.failedExecutions}
Success Rate: ${((metrics.successfulExecutions / metrics.totalExecutions) * 100 || 0).toFixed(2)}%
Average Duration: ${metrics.averageDurationMs.toFixed(2)}ms
Total Duration: ${metrics.totalDurationMs.toFixed(0)}ms

=== Per Tool Metrics ===
`;

    for (const [name, toolMetrics] of Object.entries(metrics.toolMetrics)) {
      const successRate =
        toolMetrics.executionCount > 0
          ? ((toolMetrics.successCount / toolMetrics.executionCount) * 100).toFixed(2)
          : '0.00';

      report += `
${name}:
  Executions: ${toolMetrics.executionCount}
  Success Rate: ${successRate}%
  Average Duration: ${toolMetrics.averageDurationMs.toFixed(2)}ms
  Min/Max Duration: ${toolMetrics.minDurationMs}ms / ${toolMetrics.maxDurationMs}ms
  Last Execution: ${new Date(toolMetrics.lastExecutedAt).toISOString()}
`;

      if (toolMetrics.lastError) {
        report += `  Last Error: ${toolMetrics.lastError}\n`;
      }
    }

    return report;
  }

  /**
   * Clear singleton instance (for testing)
   */
  static resetInstance(): void {
    (TelemetryService as any).instance = undefined;
  }

  /**
   * Sanitize args to remove sensitive data
   */
  private sanitizeArgs(args: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const sensitiveFields = ['apiKey', 'token', 'password', 'secret'];

    for (const [key, value] of Object.entries(args)) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = `${value.substring(0, 50)}... (truncated)`;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
