import { Retry } from '@utils/retry';

describe('Retry (MCP utils)', () => {
  describe('execute', () => {
    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('ok');
      const result = await Retry.execute(fn);
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure then succeed', async () => {
      const fn = jest.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('ok');
      jest.useFakeTimers();
      const p = Retry.execute(fn, { initialDelayMs: 100, maxAttempts: 3 });
      await jest.advanceTimersByTimeAsync(100);
      const result = await p;
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('should throw after maxAttempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fail'));
      await expect(Retry.execute(fn, { maxAttempts: 2, initialDelayMs: 10 })).rejects.toThrow(
        'always fail',
      );
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('permanent'));
      await expect(
        Retry.execute(fn, {
          maxAttempts: 3,
          retryableErrors: (e: unknown) => (e as Error).message !== 'permanent',
        }),
      ).rejects.toThrow('permanent');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeWithJsonRetry', () => {
    it('should return result when validateJson passes', async () => {
      const fn = jest.fn().mockResolvedValue({ valid: true });
      const result = await Retry.executeWithJsonRetry(
        fn,
        (r) => (r as { valid?: boolean }).valid === true,
      );
      expect(result).toEqual({ valid: true });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry when validateJson fails then succeed', async () => {
      const fn = jest
        .fn()
        .mockResolvedValueOnce({ valid: false })
        .mockResolvedValueOnce({ valid: true });
      jest.useFakeTimers();
      const p = Retry.executeWithJsonRetry(fn, (r) => (r as { valid?: boolean }).valid === true, {
        initialDelayMs: 50,
      });
      await jest.advanceTimersByTimeAsync(50);
      const result = await p;
      expect(result).toEqual({ valid: true });
      expect(fn).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });
  });

  describe('configs', () => {
    it('should expose api, fileIO, jsonParsing configs', () => {
      expect(Retry.configs.api.maxAttempts).toBe(3);
      expect(Retry.configs.fileIO.retryableErrors).toBeDefined();
      expect(Retry.configs.jsonParsing.maxAttempts).toBe(2);
    });
  });
});
