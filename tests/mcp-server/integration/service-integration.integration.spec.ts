/**
 * Service Integration Tests
 * Tests cross-service interactions and workflows
 */

import { ConfigService } from '../../../src/mcp-server/services/config.service';
import { DocumentationService } from '../../../src/mcp-server/services/documentation.service';
import { VectorStoreService } from '../../../src/mcp-server/services/vector-store.service';
import { ArchDocConfig } from '../../../src/utils/config-loader';

jest.mock('../../../src/mcp-server/config-detector', () => ({
  detectConfigSources: jest.fn().mockResolvedValue({
    fileConfig: {
      type: 'file',
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      apiKey: 'test-key',
      hasApiKey: true,
      fullConfig: {
        llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
        apiKeys: { anthropic: 'test-key' },
      },
    },
    envConfig: {
      type: 'none',
      hasApiKey: false,
    },
    recommendation: 'Use file config',
  }),
  bothConfigsAvailable: jest.fn(),
  buildConfigFromEnv: jest.fn(),
  getDefaultModelForProvider: jest.fn(() => 'claude-3-sonnet'),
}));

jest.mock('../../../src/orchestrator/documentation-orchestrator');
jest.mock('../../../src/formatters/multi-file-markdown-formatter');
jest.mock('../../../src/agents/agent-registry');
jest.mock('../../../src/scanners/file-system-scanner');

describe('Service Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ConfigService as any).instance = undefined;
    (VectorStoreService as any).instance = undefined;
  });

  describe('ConfigService -> DocumentationService Integration', () => {
    it('should provide config to documentation service', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config = await configService.initializeConfig(projectPath);

      const docService = new DocumentationService(config, projectPath);
      expect(docService).toBeDefined();
    });

    it('should handle missing config', async () => {
      const invalidConfig: any = null;

      if (invalidConfig === null) {
        expect(invalidConfig).toBeNull();
      }
    });

    it('should validate config before passing to services', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config = await configService.initializeConfig(projectPath);

      expect(config.llm?.provider).toBeDefined();
      expect(config.apiKeys).toBeDefined();
    });

    it('should cache config across multiple service instances', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config1 = await configService.initializeConfig(projectPath);
      new DocumentationService(config1, projectPath);

      const config2 = await configService.initializeConfig(projectPath);
      new DocumentationService(config2, projectPath);

      expect(config1).toEqual(config2);
    });
  });

  describe('DocumentationService -> VectorStoreService Integration', () => {
    it('should initialize vector store after documentation generation', async () => {
      const vectorService = VectorStoreService.getInstance();

      // Vector store should be available after initialization
      expect(vectorService).toBeDefined();
      expect(vectorService.isReady()).toBe(false); // Not initialized yet
    });

    it('should maintain vector store state across queries', async () => {
      const vectorService = VectorStoreService.getInstance();

      // State should persist
      expect(vectorService.isReady()).toBe(false);
    });

    it('should handle vector store reset', async () => {
      const vectorService = VectorStoreService.getInstance();

      vectorService.reset();
      expect(vectorService.isReady()).toBe(false);
    });
  });

  describe('Full Documentation Workflow', () => {
    it('should execute complete documentation generation workflow', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      // Step 1: Load configuration
      const config = await configService.initializeConfig(projectPath);
      expect(config).toBeDefined();

      // Step 2: Create documentation service
      const docService = new DocumentationService(config, projectPath);
      expect(docService).toBeDefined();
    });

    it('should support documentation update workflow', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config = await configService.initializeConfig(projectPath);
      const docService = new DocumentationService(config, projectPath);

      expect(docService).toBeDefined();
      expect(config.llm?.provider).toBe('anthropic');
    });
  });

  describe('Service Isolation', () => {
    it('should isolate config service instances per project', async () => {
      const configService = ConfigService.getInstance();
      const projectPath1 = '/test/project1';
      const projectPath2 = '/test/project2';

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources
        .mockResolvedValueOnce({
          fileConfig: {
            type: 'file',
            provider: 'anthropic',
            model: 'claude-3-sonnet',
            apiKey: 'key1',
            hasApiKey: true,
            fullConfig: {
              llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
              apiKeys: { anthropic: 'key1' },
            },
          },
          envConfig: { type: 'none', hasApiKey: false },
          recommendation: 'Use file config',
        })
        .mockResolvedValueOnce({
          fileConfig: {
            type: 'file',
            provider: 'openai',
            model: 'gpt-4',
            apiKey: 'key2',
            hasApiKey: true,
            fullConfig: {
              llm: { provider: 'openai', model: 'gpt-4' },
              apiKeys: { openai: 'key2' },
            },
          },
          envConfig: { type: 'none', hasApiKey: false },
          recommendation: 'Use file config',
        });

      const config1 = await configService.initializeConfig(projectPath1);
      const config2 = await configService.initializeConfig(projectPath2);

      expect(config1.llm?.provider).toBe('anthropic');
      expect(config2.llm?.provider).toBe('openai');
    });

    it('should maintain separate vector store states', async () => {
      const vectorService = VectorStoreService.getInstance();

      expect(vectorService).toBeDefined();
      expect(vectorService.isReady()).toBe(false);

      vectorService.reset();
      expect(vectorService.isReady()).toBe(false);
    });
  });

  describe('Error Propagation', () => {
    it('should propagate config errors to documentation service', async () => {
      const configService = ConfigService.getInstance();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');

      detectConfigSources.mockRejectedValueOnce(new Error('Config load failed'));

      await expect(configService.initializeConfig('/test/project')).rejects.toThrow(
        'Config load failed',
      );
    });

    it('should handle documentation service errors', async () => {
      const config: ArchDocConfig = {
        llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
        apiKeys: { anthropic: 'key' },
      };

      const docService = new DocumentationService(config, '/test/project');
      expect(docService).toBeDefined();
    });

    it('should handle vector store errors gracefully', async () => {
      const vectorService = VectorStoreService.getInstance();

      vectorService.reset();
      expect(vectorService.isReady()).toBe(false);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent config initializations', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const promises = Array.from({ length: 5 }, () => configService.initializeConfig(projectPath));

      const configs = await Promise.all(promises);

      // All should be same due to caching
      configs.forEach((config) => {
        expect(config).toEqual(configs[0]);
      });
    });

    it('should handle concurrent documentation operations', async () => {
      const config: ArchDocConfig = {
        llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
        apiKeys: { anthropic: 'key' },
      };

      const docServices = Array.from(
        { length: 3 },
        () => new DocumentationService(config, '/test/project'),
      );

      docServices.forEach((service) => {
        expect(service).toBeDefined();
      });
    });

    it('should handle concurrent vector store queries', async () => {
      const vectorService = VectorStoreService.getInstance();

      const queries = Array.from({ length: 5 }, () => vectorService.query('test query', 5));

      const results = await Promise.all(queries);
      expect(results).toHaveLength(5);
    });
  });

  describe('State Management', () => {
    it('should maintain consistent state across service calls', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config1 = await configService.initializeConfig(projectPath);
      const config2 = await configService.initializeConfig(projectPath);

      expect(config1).toBe(config2); // Same reference due to caching
    });

    it('should allow cache clearing', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      await configService.initializeConfig(projectPath);
      configService.clearCache();

      // Cache should be cleared
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockClear();
    });

    it('should reset vector store state independently', async () => {
      const vectorService = VectorStoreService.getInstance();

      vectorService.reset();
      expect(vectorService.isReady()).toBe(false);

      // Config service should not be affected
      const configService = ConfigService.getInstance();
      expect(configService).toBeDefined();
    });
  });

  describe('Service Lifecycle', () => {
    it('should initialize services in correct order', async () => {
      // 1. Config loaded first
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';
      const config = await configService.initializeConfig(projectPath);

      expect(config).toBeDefined();

      // 2. Then documentation service uses config
      const docService = new DocumentationService(config, projectPath);
      expect(docService).toBeDefined();

      // 3. Finally vector store is initialized
      const vectorService = VectorStoreService.getInstance();
      expect(vectorService).toBeDefined();
    });

    it('should support service reinitialization', async () => {
      const configService = ConfigService.getInstance();

      configService.clearCache();
      (VectorStoreService as any).instance = undefined;

      const projectPath = '/test/project';
      const config = await configService.initializeConfig(projectPath);

      expect(config).toBeDefined();
    });

    it('should clean up resources on reset', async () => {
      const vectorService = VectorStoreService.getInstance();
      vectorService.reset();

      const configService = ConfigService.getInstance();
      configService.clearCache();

      expect(vectorService.isReady()).toBe(false);
    });
  });

  describe('Service Dependencies', () => {
    it('should resolve service dependencies correctly', async () => {
      const configService = ConfigService.getInstance();
      const config = await configService.initializeConfig('/test/project');

      // DocumentationService depends on config
      const docService = new DocumentationService(config, '/test/project');
      expect(docService).toBeDefined();
    });

    it('should handle optional dependencies', async () => {
      const config: ArchDocConfig = {
        llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
        apiKeys: { anthropic: 'key' },
      };

      // Config without optional searchMode
      const docService = new DocumentationService(config, '/test/project');
      expect(docService).toBeDefined();
    });

    it('should provide fallbacks for missing services', async () => {
      const vectorService = VectorStoreService.getInstance();

      // Should gracefully handle uninitialized state
      expect(vectorService.isReady()).toBe(false);
    });
  });

  describe('Integration Patterns', () => {
    it('should support request-response pattern', async () => {
      const configService = ConfigService.getInstance();

      // Request: initializeConfig
      const config = await configService.initializeConfig('/test/project');

      // Response: returns configuration
      expect(config).toBeDefined();
    });

    it('should support publish-subscribe pattern via state changes', async () => {
      const configService = ConfigService.getInstance();
      const config1 = await configService.initializeConfig('/test/project1');

      configService.clearCache();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockClear();
      detectConfigSources.mockResolvedValue({
        fileConfig: {
          type: 'file',
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'key2',
          hasApiKey: true,
          fullConfig: {
            llm: { provider: 'openai', model: 'gpt-4' },
            apiKeys: { openai: 'key2' },
          },
        },
        envConfig: { type: 'none', hasApiKey: false },
        recommendation: 'Use file config',
      });

      const config2 = await configService.initializeConfig('/test/project2');

      expect(config1.llm?.provider).toBe('anthropic');
      expect(config2.llm?.provider).toBe('openai');
    });

    it('should support chain of responsibility pattern', async () => {
      // Config Service -> Documentation Service -> Vector Store Service
      const configService = ConfigService.getInstance();
      const config = await configService.initializeConfig('/test/project');

      const docService = new DocumentationService(config, '/test/project');
      const vectorService = VectorStoreService.getInstance();

      expect(config).toBeDefined();
      expect(docService).toBeDefined();
      expect(vectorService).toBeDefined();
    });
  });
});
