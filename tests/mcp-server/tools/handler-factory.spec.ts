import {
  createSelectiveAgentHandler,
  createCheckConfigHandler,
  createSetupConfigHandler,
} from '../../../src/mcp-server/tools/handler-factory';
import { DocumentationService } from '../../../src/mcp-server/services/documentation.service';
import { ToolContext } from '../../../src/mcp-server/types';
import { ArchDocConfig } from '../../../src/utils/config-loader';

jest.mock('../../../src/mcp-server/services/documentation.service');
jest.mock('fs/promises', () => ({
  access: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

const mockDocumentationService = DocumentationService as jest.MockedClass<
  typeof DocumentationService
>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockFs = require('fs/promises') as jest.Mocked<typeof import('fs/promises')>;

describe('Handler Factory', () => {
  let mockContext: ToolContext;
  let mockConfig: ArchDocConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      llm: {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
      },
      apiKeys: {
        anthropic: 'test-key',
      },
    };

    mockContext = {
      projectPath: '/test/project',
      config: mockConfig,
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
    };
  });

  describe('createSelectiveAgentHandler', () => {
    it('should create handler for single agent', async () => {
      const agents = ['pattern-detector'];
      const handler = createSelectiveAgentHandler(agents, 'Detect patterns');

      mockDocumentationService.prototype.runSelectiveAgents = jest.fn().mockResolvedValue({
        customSections: new Map([
          ['pattern-detector', { content: 'Patterns found', markdown: 'Patterns' }],
        ]),
      });

      const result = await handler({}, mockContext);

      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
    });

    it('should create handler for multiple agents', async () => {
      const agents = ['pattern-detector', 'dependency-analyzer'];
      const handler = createSelectiveAgentHandler(agents);

      mockDocumentationService.prototype.runSelectiveAgents = jest.fn().mockResolvedValue({
        customSections: new Map([
          ['pattern-detector', { content: 'Patterns' }],
          ['dependency-analyzer', { content: 'Dependencies' }],
        ]),
      });

      const result = await handler({}, mockContext);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should include user prompt prefix in output', async () => {
      const agents = ['pattern-detector'];
      const prefix = 'Analyze this project';
      const handler = createSelectiveAgentHandler(agents, prefix);

      mockDocumentationService.prototype.runSelectiveAgents = jest
        .fn()
        .mockImplementation((options) => {
          expect(options.userPrompt).toContain(prefix);
          return Promise.resolve({
            customSections: new Map([['pattern-detector', { content: 'Results' }]]),
          });
        });

      await handler({}, mockContext);

      expect(mockDocumentationService.prototype.runSelectiveAgents).toHaveBeenCalled();
    });

    it('should append focus area to prompt if provided', async () => {
      const agents = ['pattern-detector'];
      const prefix = 'Analyze';
      const handler = createSelectiveAgentHandler(agents, prefix);

      mockDocumentationService.prototype.runSelectiveAgents = jest
        .fn()
        .mockImplementation((options) => {
          expect(options.userPrompt).toContain('Focus: auth');
          return Promise.resolve({
            customSections: new Map([['pattern-detector', { content: 'Results' }]]),
          });
        });

      await handler({ focusArea: 'auth' }, mockContext);

      expect(mockDocumentationService.prototype.runSelectiveAgents).toHaveBeenCalled();
    });

    it('should use focus area as only prompt if no prefix', async () => {
      const agents = ['pattern-detector'];
      const handler = createSelectiveAgentHandler(agents);

      mockDocumentationService.prototype.runSelectiveAgents = jest
        .fn()
        .mockImplementation((options) => {
          expect(options.userPrompt).toBe('Focus: features');
          return Promise.resolve({
            customSections: new Map([['pattern-detector', { content: 'Results' }]]),
          });
        });

      await handler({ focusArea: 'features' }, mockContext);

      expect(mockDocumentationService.prototype.runSelectiveAgents).toHaveBeenCalled();
    });

    it('should handle missing section gracefully', async () => {
      const agents = ['pattern-detector'];
      const handler = createSelectiveAgentHandler(agents);

      mockDocumentationService.prototype.runSelectiveAgents = jest.fn().mockResolvedValue({
        customSections: new Map(),
      });

      const result = await handler({}, mockContext);

      expect(result.content[0].text).toContain('No results for pattern-detector');
    });

    it('should extract content or markdown from section', async () => {
      const agents = ['pattern-detector'];
      const handler = createSelectiveAgentHandler(agents);

      mockDocumentationService.prototype.runSelectiveAgents = jest.fn().mockResolvedValue({
        customSections: new Map([['pattern-detector', { markdown: 'Markdown content' }]]),
      });

      const result = await handler({}, mockContext);

      expect(result.content[0].text).toContain('Markdown content');
    });

    it('should handle errors and return error response', async () => {
      const agents = ['pattern-detector'];
      const handler = createSelectiveAgentHandler(agents);

      mockDocumentationService.prototype.runSelectiveAgents = jest
        .fn()
        .mockRejectedValue(new Error('Agent failed'));

      const result = await handler({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Agent failed');
    });
  });

  describe('createCheckConfigHandler', () => {
    it('should create config check handler', async () => {
      const handler = createCheckConfigHandler();

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
          apiKeys: { anthropic: 'sk-ant-key' },
        }),
      );

      const result = await handler({}, mockContext);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Configuration Found');
    });

    it('should validate provider configuration', async () => {
      const handler = createCheckConfigHandler();

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          llm: { model: 'claude-3-sonnet' }, // Missing provider
          apiKeys: { anthropic: 'sk-ant-key' },
        }),
      );

      const result = await handler({}, mockContext);

      expect(result.content[0].text).toContain('Missing `llm.provider` field');
    });

    it('should check for API key configuration', async () => {
      const handler = createCheckConfigHandler();

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
          // Missing apiKeys
        }),
      );

      const result = await handler({}, mockContext);

      expect(result.content[0].text).toContain('Missing `apiKeys` object');
    });

    it('should validate API key for configured provider', async () => {
      const handler = createCheckConfigHandler();

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
          apiKeys: { openai: 'sk-key' }, // Wrong provider
        }),
      );

      const result = await handler({}, mockContext);

      expect(result.content[0].text).toContain('No API key configured for provider');
    });

    it('should show setup instructions if config not found', async () => {
      const handler = createCheckConfigHandler();

      mockFs.access.mockRejectedValue(new Error('Not found'));

      const result = await handler({}, mockContext);

      expect(result.content[0].text).toContain('No Configuration Found');
      expect(result.content[0].text).toContain('Setup Instructions');
      expect(result.content[0].text).toContain('archdoc-mcp');
    });

    it('should handle invalid JSON configuration', async () => {
      const handler = createCheckConfigHandler();

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('{ invalid json }');

      const result = await handler({}, mockContext);

      expect(result.content[0].text).toContain('No Configuration Found');
    });
  });

  describe('createSetupConfigHandler', () => {
    it('should create setup config handler', async () => {
      const handler = createSetupConfigHandler();

      mockFs.readFile.mockRejectedValue(new Error('Not found'));
      mockFs.writeFile.mockResolvedValue(undefined);

      const args = {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        apiKey: 'sk-ant-test-key',
      };

      const result = await handler(args, mockContext);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Configuration Created Successfully');
    });

    it('should validate required fields', async () => {
      const handler = createSetupConfigHandler();

      const args = {
        provider: 'anthropic',
        // Missing model and apiKey
      };

      const result = await handler(args, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required fields');
    });

    it('should support vector search configuration', async () => {
      const handler = createSetupConfigHandler();

      mockFs.readFile.mockRejectedValue(new Error('Not found'));
      mockFs.writeFile.mockResolvedValue(undefined);

      const args = {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        apiKey: 'sk-ant-key',
        searchMode: 'vector',
        embeddingsProvider: 'openai',
        embeddingsApiKey: 'sk-embed-key',
      };

      await handler(args, mockContext);

      expect(mockFs.writeFile).toHaveBeenCalled();
      const configStr = mockFs.writeFile.mock.calls[0][1] as string;
      const config = JSON.parse(configStr);

      expect(config.searchMode.mode).toBe('vector');
      expect(config.searchMode.embeddingsProvider).toBe('openai');
    });

    it('should validate embeddings API key requirement', async () => {
      const handler = createSetupConfigHandler();

      const args = {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        apiKey: 'sk-ant-key',
        searchMode: 'vector',
        embeddingsProvider: 'openai',
        // Missing embeddingsApiKey
      };

      const result = await handler(args, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('embeddingsApiKey is required');
    });

    it('should preserve existing configuration', async () => {
      const handler = createSetupConfigHandler();

      const existingConfig = {
        llm: { provider: 'anthropic', model: 'old-model', temperature: 0.5 },
        apiKeys: { anthropic: 'old-key' },
        tracing: { enabled: true, apiKey: 'old-trace-key' },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(existingConfig));
      mockFs.writeFile.mockResolvedValue(undefined);

      const args = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-new-key',
      };

      await handler(args, mockContext);

      expect(mockFs.writeFile).toHaveBeenCalled();
      const configStr = mockFs.writeFile.mock.calls[0][1] as string;
      const newConfig = JSON.parse(configStr);

      // Old settings should be preserved
      expect(newConfig.llm.temperature).toBe(0.5);
      expect(newConfig.tracing.enabled).toBe(true);
      // New settings should override
      expect(newConfig.llm.provider).toBe('openai');
      expect(newConfig.llm.model).toBe('gpt-4');
    });

    it('should include API key preview in response', async () => {
      const handler = createSetupConfigHandler();

      mockFs.readFile.mockRejectedValue(new Error('Not found'));
      mockFs.writeFile.mockResolvedValue(undefined);

      const args = {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        apiKey: 'sk-ant-1234567890-abcdef',
      };

      const result = await handler(args, mockContext);

      // Should show preview format: substring(0, 10) + ... + slice(-4)
      // "sk-ant-1234567890-abcdef"[0:10] = "sk-ant-123", slice(-4) = "cdef"
      expect(result.content[0].text).toContain('sk-ant-123');
      expect(result.content[0].text).toContain('cdef');
    });

    it('should support tracing configuration', async () => {
      const handler = createSetupConfigHandler();

      mockFs.readFile.mockRejectedValue(new Error('Not found'));
      mockFs.writeFile.mockResolvedValue(undefined);

      const args = {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        apiKey: 'sk-ant-key',
        enableTracing: true,
        tracingApiKey: 'trace-key',
        tracingProject: 'my-project',
      };

      await handler(args, mockContext);

      const configStr = mockFs.writeFile.mock.calls[0][1] as string;
      const config = JSON.parse(configStr);

      expect(config.tracing.enabled).toBe(true);
      expect(config.tracing.project).toBe('my-project');
    });
  });

  describe('Handler Factory Error Handling', () => {
    it('should handle missing context logger', async () => {
      const agents = ['pattern-detector'];
      const handler = createSelectiveAgentHandler(agents);

      const contextWithoutLogger = { ...mockContext, logger: undefined };

      mockDocumentationService.prototype.runSelectiveAgents = jest.fn().mockResolvedValue({
        customSections: new Map([['pattern-detector', { content: 'Results' }]]),
      });

      const result = await handler({}, contextWithoutLogger as any);

      expect(result).toBeDefined();
    });

    it('should handle unknown agent gracefully', async () => {
      const agents = ['unknown-agent-xyz'];
      const handler = createSelectiveAgentHandler(agents);

      mockDocumentationService.prototype.runSelectiveAgents = jest.fn().mockResolvedValue({
        customSections: new Map(),
      });

      const result = await handler({}, mockContext);

      expect(result.content[0].text).toContain('No results');
    });
  });
});
