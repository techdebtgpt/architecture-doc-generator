/**
 * Performance tracking utility for monitoring memory and CPU usage
 */

export interface PerformanceMetrics {
  memoryUsedMB: number;
  memoryDeltaMB?: number;
  cpuUserMs: number;
  cpuSystemMs: number;
  cpuDeltaUserMs?: number;
  cpuDeltaSystemMs?: number;
  durationMs: number;
}

export interface PerformanceSnapshot {
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  timestamp: number;
}

/**
 * Performance tracker for measuring resource usage
 */
export class PerformanceTracker {
  private startSnapshot?: PerformanceSnapshot;

  /**
   * Take a snapshot of current performance metrics
   */
  public static snapshot(): PerformanceSnapshot {
    return {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: Date.now(),
    };
  }

  /**
   * Start tracking performance
   */
  public start(): void {
    this.startSnapshot = PerformanceTracker.snapshot();
  }

  /**
   * Stop tracking and calculate metrics
   */
  public end(): PerformanceMetrics {
    const endSnapshot = PerformanceTracker.snapshot();

    if (!this.startSnapshot) {
      // No start snapshot, return current values only
      return {
        memoryUsedMB: this.bytesToMB(endSnapshot.memory.heapUsed),
        cpuUserMs: this.microToMilli(endSnapshot.cpu.user),
        cpuSystemMs: this.microToMilli(endSnapshot.cpu.system),
        durationMs: 0,
      };
    }

    // Calculate deltas
    const memoryDeltaMB =
      this.bytesToMB(endSnapshot.memory.heapUsed) -
      this.bytesToMB(this.startSnapshot.memory.heapUsed);
    const cpuDeltaUserMs =
      this.microToMilli(endSnapshot.cpu.user) - this.microToMilli(this.startSnapshot.cpu.user);
    const cpuDeltaSystemMs =
      this.microToMilli(endSnapshot.cpu.system) - this.microToMilli(this.startSnapshot.cpu.system);
    const durationMs = endSnapshot.timestamp - this.startSnapshot.timestamp;

    return {
      memoryUsedMB: this.bytesToMB(endSnapshot.memory.heapUsed),
      memoryDeltaMB,
      cpuUserMs: this.microToMilli(endSnapshot.cpu.user),
      cpuSystemMs: this.microToMilli(endSnapshot.cpu.system),
      cpuDeltaUserMs,
      cpuDeltaSystemMs,
      durationMs,
    };
  }

  /**
   * Format metrics as a human-readable string
   */
  public static formatMetrics(metrics: PerformanceMetrics): string {
    const parts: string[] = [];

    // Memory
    if (metrics.memoryDeltaMB !== undefined) {
      const sign = metrics.memoryDeltaMB >= 0 ? '+' : '';
      parts.push(`Memory: ${sign}${metrics.memoryDeltaMB.toFixed(2)}MB`);
    } else {
      parts.push(`Memory: ${metrics.memoryUsedMB.toFixed(2)}MB`);
    }

    // CPU
    if (metrics.cpuDeltaUserMs !== undefined && metrics.cpuDeltaSystemMs !== undefined) {
      parts.push(
        `CPU: ${metrics.cpuDeltaUserMs.toFixed(0)}ms user, ${metrics.cpuDeltaSystemMs.toFixed(0)}ms system`,
      );
    } else {
      parts.push(
        `CPU: ${metrics.cpuUserMs.toFixed(0)}ms user, ${metrics.cpuSystemMs.toFixed(0)}ms system`,
      );
    }

    // Duration
    if (metrics.durationMs > 0) {
      parts.push(`Duration: ${(metrics.durationMs / 1000).toFixed(1)}s`);
    }

    return parts.join(' | ');
  }

  /**
   * Convert bytes to megabytes
   */
  private bytesToMB(bytes: number): number {
    return bytes / 1024 / 1024;
  }

  /**
   * Convert microseconds to milliseconds
   */
  private microToMilli(micro: number): number {
    return micro / 1000;
  }
}

/**
 * Utility function to track performance of an async operation
 *
 * @param operation - The async operation to track
 * @param onComplete - Optional callback with performance metrics
 * @returns The result of the operation
 *
 * @example
 * ```typescript
 * const result = await trackPerformance(
 *   () => expensiveOperation(),
 *   (metrics) => logger.info(`Operation complete: ${PerformanceTracker.formatMetrics(metrics)}`)
 * );
 * ```
 */
export async function trackPerformance<T>(
  operation: () => Promise<T>,
  onComplete?: (metrics: PerformanceMetrics) => void,
): Promise<T> {
  const tracker = new PerformanceTracker();
  tracker.start();

  try {
    const result = await operation();
    const metrics = tracker.end();

    if (onComplete) {
      onComplete(metrics);
    }

    return result;
  } catch (error) {
    const metrics = tracker.end();

    if (onComplete) {
      onComplete(metrics);
    }

    throw error;
  }
}
