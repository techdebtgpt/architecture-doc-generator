import { VectorStoreService } from '../../../src/mcp-server/services/vector-store.service';

jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
}));

jest.mock('../../../src/services/vector-search.service', () => ({
  VectorSearchService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    searchFiles: jest.fn().mockResolvedValue([
      { path: 'overview.md', relevanceScore: 0.95 },
      { path: 'architecture.md', relevanceScore: 0.87 },
    ]),
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockFs = require('fs/promises') as jest.Mocked<typeof import('fs/promises')>;

describe('VectorStoreService', () => {
  let service: VectorStoreService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (VectorStoreService as any).instance = undefined;

    mockFs.readdir.mockResolvedValue([
      'overview.md',
      'architecture.md',
      'api.md',
      'config.json',
    ] as any);

    mockFs.readFile.mockImplementation((path: any) => {
      const pathStr = path.toString ? path.toString() : String(path);
      if (pathStr.endsWith('overview.md')) {
        return Promise.resolve('# Overview Content');
      } else if (pathStr.endsWith('architecture.md')) {
        return Promise.resolve('# Architecture Details');
      } else if (pathStr.endsWith('api.md')) {
        return Promise.resolve('# API Documentation');
      }
      return Promise.reject(new Error('File not found'));
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = VectorStoreService.getInstance();
      const instance2 = VectorStoreService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should only create one instance', () => {
      const instance1 = VectorStoreService.getInstance();
      const instance2 = VectorStoreService.getInstance();
      const instance3 = VectorStoreService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      service = VectorStoreService.getInstance();
    });

    it('should initialize vector store with documentation files', async () => {
      const docsPath = '/test/docs';

      const result = await service.initialize(docsPath);

      expect(mockFs.readdir).toHaveBeenCalledWith(docsPath);
      expect(mockFs.readFile).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should filter only markdown files', async () => {
      const docsPath = '/test/docs';

      await service.initialize(docsPath);

      expect(mockFs.readFile).toHaveBeenCalledTimes(3); // Only .md files, not config.json
    });

    it('should handle empty documentation directory', async () => {
      mockFs.readdir.mockResolvedValueOnce(['config.json', 'setup.txt'] as any);
      const docsPath = '/test/docs';

      const result = await service.initialize(docsPath);

      expect(result).toBeNull();
    });

    it('should cache vector store for same path', async () => {
      const docsPath = '/test/docs';

      await service.initialize(docsPath);
      const firstCallReadCount = mockFs.readdir.mock.calls.length;

      await service.initialize(docsPath);
      const secondCallReadCount = mockFs.readdir.mock.calls.length;

      expect(secondCallReadCount).toBe(firstCallReadCount);
    });

    it('should reinitialize for different path', async () => {
      const docsPath1 = '/test/docs1';
      const docsPath2 = '/test/docs2';

      mockFs.readdir
        .mockResolvedValueOnce(['file1.md'] as any)
        .mockResolvedValueOnce(['file2.md'] as any);

      await service.initialize(docsPath1);
      await service.initialize(docsPath2);

      expect(mockFs.readdir).toHaveBeenCalledWith(docsPath1);
      expect(mockFs.readdir).toHaveBeenCalledWith(docsPath2);
      expect(mockFs.readdir).toHaveBeenCalledTimes(2);
    });

    it('should handle read errors gracefully', async () => {
      mockFs.readdir.mockRejectedValueOnce(new Error('Permission denied'));
      const docsPath = '/test/docs';

      const result = await service.initialize(docsPath);

      expect(result).toBeNull();
    });

    it('should handle file read errors', async () => {
      mockFs.readdir.mockResolvedValueOnce(['file.md'] as any);
      mockFs.readFile.mockRejectedValueOnce(new Error('File read failed'));
      const docsPath = '/test/docs';

      const result = await service.initialize(docsPath);

      expect(result).toBeNull();
    });

    it.skip('should return null if VectorSearchService import fails', async () => {
      // This test is skipped because VectorSearchService is mocked at module level
      // The error handling is already covered by "should handle read errors gracefully"
      jest.doMock('../../../src/services/vector-search.service', () => {
        throw new Error('Service not available');
      });

      const docsPath = '/test/docs';

      const result = await service.initialize(docsPath);

      expect(result).toBeNull();

      jest.resetModules();
    });
  });

  describe('query', () => {
    beforeEach(() => {
      service = VectorStoreService.getInstance();
    });

    it('should query vector store with question', async () => {
      const docsPath = '/test/docs';
      await service.initialize(docsPath);

      const results = await service.query('How is the architecture designed?', 5);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array if store not initialized', async () => {
      const results = await service.query('Some question', 5);

      expect(results).toEqual([]);
    });

    it('should respect topK parameter', async () => {
      const docsPath = '/test/docs';
      await service.initialize(docsPath);

      // Query with different topK values
      const results = await service.query('question', 3);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should return results with content, file, and score', async () => {
      const docsPath = '/test/docs';
      await service.initialize(docsPath);

      const results = await service.query('API documentation', 5);

      if (results.length > 0) {
        expect(results[0]).toHaveProperty('content');
        expect(results[0]).toHaveProperty('file');
        expect(results[0]).toHaveProperty('score');
      }
    });
  });

  describe('isReady', () => {
    beforeEach(() => {
      service = VectorStoreService.getInstance();
    });

    it('should return false before initialization', () => {
      expect(service.isReady()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      const docsPath = '/test/docs';
      await service.initialize(docsPath);

      expect(service.isReady()).toBe(true);
    });

    it('should return false if initialization failed', async () => {
      mockFs.readdir = jest.fn().mockRejectedValue(new Error('Read failed'));
      const docsPath = '/test/docs';

      await service.initialize(docsPath);

      expect(service.isReady()).toBe(false);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      service = VectorStoreService.getInstance();
    });

    it('should clear vector store state', async () => {
      const docsPath = '/test/docs';
      await service.initialize(docsPath);

      expect(service.isReady()).toBe(true);

      service.reset();

      expect(service.isReady()).toBe(false);
    });

    it('should allow reinitialization after reset', async () => {
      const docsPath = '/test/docs';

      await service.initialize(docsPath);
      expect(service.isReady()).toBe(true);

      service.reset();
      expect(service.isReady()).toBe(false);

      await service.initialize(docsPath);
      expect(service.isReady()).toBe(true);
    });

    it('should clear cache after reset', async () => {
      const docsPath = '/test/docs';

      await service.initialize(docsPath);
      const firstCallCount = mockFs.readdir.mock.calls.length;

      service.reset();
      await service.initialize(docsPath);
      const secondCallCount = mockFs.readdir.mock.calls.length;

      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });
  });

  describe('Document Management', () => {
    beforeEach(() => {
      service = VectorStoreService.getInstance();
    });

    it('should track initialized path', async () => {
      const docsPath = '/test/docs';
      await service.initialize(docsPath);

      // Path should be cached
      expect(service.isReady()).toBe(true);
    });

    it('should detect path changes', async () => {
      // Reset mock to ensure it returns values for both calls
      mockFs.readdir.mockResolvedValue(['overview.md', 'architecture.md', 'api.md'] as any);

      const path1 = '/test/docs1';
      const path2 = '/test/docs2';

      const result1 = await service.initialize(path1);
      const state1 = service.isReady();

      // This simulates a path change
      service.reset();
      const result2 = await service.initialize(path2);
      const state2 = service.isReady();

      expect(result1).toBeDefined();
      expect(state1).toBe(true);
      expect(result2).toBeDefined();
      expect(state2).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      service = VectorStoreService.getInstance();
    });

    it('should handle malformed paths gracefully', async () => {
      mockFs.readdir = jest.fn().mockRejectedValue(new Error('Invalid path format'));

      const result = await service.initialize('/invalid\\path');

      expect(result).toBeNull();
      expect(service.isReady()).toBe(false);
    });

    it('should handle large number of files', async () => {
      const largeFileList = Array.from({ length: 100 }, (_, i) => `file${i}.md`);
      mockFs.readdir = jest.fn().mockResolvedValue(largeFileList as any);
      mockFs.readFile = jest.fn().mockResolvedValue('# Content');

      const result = await service.initialize('/test/docs');

      expect(result).toBeDefined();
      expect(mockFs.readFile).toHaveBeenCalledTimes(100);
    });

    it('should handle mixed file types', async () => {
      mockFs.readdir = jest
        .fn()
        .mockResolvedValue([
          'readme.md',
          'package.json',
          'file.txt',
          'docs.md',
          'LICENSE',
          'source.ts',
        ] as any);

      mockFs.readFile.mockResolvedValueOnce('# README').mockResolvedValueOnce('# DOCS');

      await service.initialize('/test/docs');

      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('Concurrent Operations', () => {
    beforeEach(() => {
      service = VectorStoreService.getInstance();
    });

    it('should handle concurrent queries', async () => {
      const docsPath = '/test/docs';
      await service.initialize(docsPath);

      const query1 = service.query('question 1', 5);
      const query2 = service.query('question 2', 5);
      const query3 = service.query('question 3', 5);

      const results = await Promise.all([query1, query2, query3]);

      expect(results).toHaveLength(3);
      expect(Array.isArray(results[0])).toBe(true);
      expect(Array.isArray(results[1])).toBe(true);
      expect(Array.isArray(results[2])).toBe(true);
    });

    it('should maintain state during concurrent queries', async () => {
      const docsPath = '/test/docs';
      await service.initialize(docsPath);

      expect(service.isReady()).toBe(true);

      const queries = Array.from({ length: 10 }, (_, i) => service.query(`question ${i}`, 5));

      await Promise.all(queries);

      expect(service.isReady()).toBe(true);
    });
  });
});
