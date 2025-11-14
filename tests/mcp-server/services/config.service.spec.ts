import { ConfigService } from '../../../src/mcp-server/services/config.service';
import { ArchDocConfig } from '../../../src/utils/config-loader';

jest.mock('../../../src/mcp-server/config-detector', () => ({
  detectConfigSources: jest.fn(),
  bothConfigsAvailable: jest.fn(),
  buildConfigFromEnv: jest.fn(),
  getDefaultModelForProvider: jest.fn(() => 'claude-3-sonnet'),
}));

describe('ConfigService', () => {
  let configService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (ConfigService as any).instance = undefined;
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = ConfigService.getInstance();
      const instance2 = ConfigService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should only create one instance', () => {
      const instance1 = ConfigService.getInstance();
      const instance2 = ConfigService.getInstance();
      const instance3 = ConfigService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('initializeConfig', () => {
    beforeEach(() => {
      configService = ConfigService.getInstance();
    });

    it('should initialize config from file', async () => {
      const projectPath = '/test/project';
      const mockConfig: ArchDocConfig = {
        llm: {
          provider: 'anthropic',
          model: 'claude-3-sonnet',
        },
        apiKeys: {
          anthropic: 'test-key',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockResolvedValue({
        fileConfig: {
          type: 'file',
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          apiKey: 'test-key',
          hasApiKey: true,
          fullConfig: mockConfig,
        },
        envConfig: {
          type: 'none',
          hasApiKey: false,
        },
      });

      const result = await configService.initializeConfig(projectPath);

      expect(result).toEqual(mockConfig);
      expect(result.llm?.provider).toBe('anthropic');
    });

    it('should initialize config from environment', async () => {
      const projectPath = '/test/project';
      const mockEnvConfig: ArchDocConfig = {
        llm: {
          provider: 'openai',
          model: 'gpt-4',
        },
        apiKeys: {
          openai: 'env-key',
        },
      };

      const {
        detectConfigSources,
        buildConfigFromEnv,
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockResolvedValue({
        fileConfig: {
          type: 'none',
          hasApiKey: false,
        },
        envConfig: {
          type: 'env',
          provider: 'openai',
          model: 'gpt-4',
          hasApiKey: true,
        },
      });
      buildConfigFromEnv.mockReturnValue(mockEnvConfig);

      const result = await configService.initializeConfig(projectPath);

      expect(result.llm?.provider).toBe('openai');
    });

    it('should cache config per project path', async () => {
      const projectPath1 = '/test/project1';
      const projectPath2 = '/test/project2';

      const mockConfig1: ArchDocConfig = {
        llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
        apiKeys: { anthropic: 'key1' },
      };

      const mockConfig2: ArchDocConfig = {
        llm: { provider: 'openai', model: 'gpt-4' },
        apiKeys: { openai: 'key2' },
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources
        .mockResolvedValueOnce({
          fileConfig: {
            type: 'file',
            provider: 'anthropic',
            model: 'claude-3-sonnet',
            hasApiKey: true,
            fullConfig: mockConfig1,
          },
          envConfig: { type: 'none', hasApiKey: false },
        })
        .mockResolvedValueOnce({
          fileConfig: {
            type: 'file',
            provider: 'openai',
            model: 'gpt-4',
            hasApiKey: true,
            fullConfig: mockConfig2,
          },
          envConfig: { type: 'none', hasApiKey: false },
        });

      const result1 = await configService.initializeConfig(projectPath1);
      const result2 = await configService.initializeConfig(projectPath2);

      expect(result1.llm?.provider).toBe('anthropic');
      expect(result2.llm?.provider).toBe('openai');
      expect(detectConfigSources).toHaveBeenCalledTimes(2);
    });

    it('should return cached config on subsequent calls with same path', async () => {
      const projectPath = '/test/project';
      const mockConfig: ArchDocConfig = {
        llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
        apiKeys: { anthropic: 'test-key' },
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockResolvedValue({
        fileConfig: {
          type: 'file',
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          hasApiKey: true,
          fullConfig: mockConfig,
        },
        envConfig: { type: 'none', hasApiKey: false },
      });

      await configService.initializeConfig(projectPath);
      await configService.initializeConfig(projectPath);

      expect(detectConfigSources).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during initialization', async () => {
      const projectPath = '/test/project';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockRejectedValue(new Error('Config load failed'));

      await expect(configService.initializeConfig(projectPath)).rejects.toThrow();
    });

    it('should handle null config gracefully', async () => {
      const projectPath = '/test/project';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockResolvedValue({
        fileConfig: null,
        envConfig: null,
      });

      await expect(configService.initializeConfig(projectPath)).rejects.toThrow();
    });
  });

  describe('Config Structure', () => {
    beforeEach(() => {
      configService = ConfigService.getInstance();
    });

    it('should validate required LLM fields', async () => {
      const projectPath = '/test/project';
      const invalidConfig: any = {
        llm: {
          // Missing provider
          model: 'claude-3-sonnet',
        },
        apiKeys: { anthropic: 'test-key' },
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockResolvedValue({
        fileConfig: invalidConfig,
        envConfig: null,
      });

      await expect(configService.initializeConfig(projectPath)).rejects.toThrow();
    });

    it('should validate API keys configuration', async () => {
      const projectPath = '/test/project';
      const incompleteConfig: any = {
        llm: {
          provider: 'anthropic',
          model: 'claude-3-sonnet',
        },
        // Missing apiKeys
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockResolvedValue({
        fileConfig: incompleteConfig,
        envConfig: null,
      });

      await expect(configService.initializeConfig(projectPath)).rejects.toThrow();
    });

    it('should support optional search mode configuration', async () => {
      const projectPath = '/test/project';
      const configWithoutSearchMode: ArchDocConfig = {
        llm: {
          provider: 'anthropic',
          model: 'claude-3-sonnet',
        },
        apiKeys: { anthropic: 'test-key' },
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockResolvedValue({
        fileConfig: {
          type: 'file',
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          hasApiKey: true,
          fullConfig: configWithoutSearchMode,
        },
        envConfig: { type: 'none', hasApiKey: false },
      });

      const result = await configService.initializeConfig(projectPath);
      expect(result).toBeDefined();
    });
  });

  describe('Clear Cache', () => {
    beforeEach(() => {
      configService = ConfigService.getInstance();
    });

    it('should clear cached configurations', async () => {
      const projectPath = '/test/project';
      const mockConfig: ArchDocConfig = {
        llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
        apiKeys: { anthropic: 'test-key' },
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockResolvedValue({
        fileConfig: {
          type: 'file',
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          hasApiKey: true,
          fullConfig: mockConfig,
        },
        envConfig: { type: 'none', hasApiKey: false },
      });

      await configService.initializeConfig(projectPath);
      configService.clearCache();
      await configService.initializeConfig(projectPath);

      expect(detectConfigSources).toHaveBeenCalledTimes(2);
    });
  });

  describe('Multiple Provider Support', () => {
    beforeEach(() => {
      configService = ConfigService.getInstance();
    });

    it('should handle Anthropic provider configuration', async () => {
      const projectPath = '/test/project';
      const config: ArchDocConfig = {
        llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
        apiKeys: { anthropic: 'sk-ant-test-key' },
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockResolvedValue({
        fileConfig: {
          type: 'file',
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          hasApiKey: true,
          fullConfig: config,
        },
        envConfig: { type: 'none', hasApiKey: false },
      });

      const result = await configService.initializeConfig(projectPath);
      expect(result.llm?.provider).toBe('anthropic');
    });

    it('should handle OpenAI provider configuration', async () => {
      const projectPath = '/test/project';
      const config: ArchDocConfig = {
        llm: { provider: 'openai', model: 'gpt-4' },
        apiKeys: { openai: 'sk-test-key' },
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockResolvedValue({
        fileConfig: {
          type: 'file',
          provider: 'openai',
          model: 'gpt-4',
          hasApiKey: true,
          fullConfig: config,
        },
        envConfig: { type: 'none', hasApiKey: false },
      });

      const result = await configService.initializeConfig(projectPath);
      expect(result.llm?.provider).toBe('openai');
    });

    it('should handle Google provider configuration', async () => {
      const projectPath = '/test/project';
      const config: ArchDocConfig = {
        llm: { provider: 'google', model: 'gemini-pro' },
        apiKeys: { google: 'test-key' },
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockResolvedValue({
        fileConfig: {
          type: 'file',
          provider: 'google',
          model: 'gemini-pro',
          hasApiKey: true,
          fullConfig: config,
        },
        envConfig: { type: 'none', hasApiKey: false },
      });

      const result = await configService.initializeConfig(projectPath);
      expect(result.llm?.provider).toBe('google');
    });
  });
});
