import {
  PerformanceTracker,
  trackPerformance,
  type PerformanceMetrics,
} from '@utils/performance-tracker';

describe('PerformanceTracker (MCP utils)', () => {
  describe('snapshot', () => {
    it('should return memory, cpu, and timestamp', () => {
      const snap = PerformanceTracker.snapshot();
      expect(snap.memory).toBeDefined();
      expect(snap.cpu).toBeDefined();
      expect(typeof snap.timestamp).toBe('number');
    });
  });

  describe('start/end', () => {
    it('should return metrics with deltas after start/end', () => {
      const tracker = new PerformanceTracker();
      tracker.start();
      const metrics = tracker.end();
      expect(metrics.memoryUsedMB).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUserMs).toBeDefined();
      expect(metrics.cpuSystemMs).toBeDefined();
      expect(metrics.durationMs).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryDeltaMB).toBeDefined();
      expect(metrics.cpuDeltaUserMs).toBeDefined();
      expect(metrics.cpuDeltaSystemMs).toBeDefined();
    });

    it('should return metrics without start snapshot when end called first', () => {
      const tracker = new PerformanceTracker();
      const metrics = tracker.end();
      expect(metrics.memoryUsedMB).toBeGreaterThanOrEqual(0);
      expect(metrics.durationMs).toBe(0);
    });
  });

  describe('formatMetrics', () => {
    it('should format metrics with deltas', () => {
      const metrics: PerformanceMetrics = {
        memoryUsedMB: 10,
        memoryDeltaMB: 1,
        cpuUserMs: 100,
        cpuSystemMs: 50,
        cpuDeltaUserMs: 80,
        cpuDeltaSystemMs: 40,
        durationMs: 500,
      };
      const s = PerformanceTracker.formatMetrics(metrics);
      expect(s).toContain('Memory:');
      expect(s).toContain('CPU:');
      expect(s).toContain('Duration:');
    });

    it('should format metrics without deltas', () => {
      const metrics: PerformanceMetrics = {
        memoryUsedMB: 5,
        cpuUserMs: 10,
        cpuSystemMs: 5,
        durationMs: 0,
      };
      const s = PerformanceTracker.formatMetrics(metrics);
      expect(s).toContain('5.00');
    });
  });

  describe('trackPerformance', () => {
    it('should return operation result and call onComplete', async () => {
      const onComplete = jest.fn();
      const result = await trackPerformance(() => Promise.resolve('done'), onComplete);
      expect(result).toBe('done');
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          memoryUsedMB: expect.any(Number),
          durationMs: expect.any(Number),
        }),
      );
    });

    it('should call onComplete and rethrow on operation error', async () => {
      const onComplete = jest.fn();
      await expect(
        trackPerformance(() => Promise.reject(new Error('fail')), onComplete),
      ).rejects.toThrow('fail');
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
