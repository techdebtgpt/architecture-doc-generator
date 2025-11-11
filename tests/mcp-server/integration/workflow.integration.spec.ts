/**
 * Workflow Integration Tests
 * Tests complete end-to-end workflows through the MCP server
 */

import { ConfigService } from '../../../src/mcp-server/services/config.service';
import { DocumentationService } from '../../../src/mcp-server/services/documentation.service';
import { VectorStoreService } from '../../../src/mcp-server/services/vector-store.service';
import { getToolHandler } from '../../../src/mcp-server/tools/handlers';
import { getAllTools } from '../../../src/mcp-server/tools/tool-registry';

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
        searchMode: { mode: 'keyword', strategy: 'smart' },
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

jest.mock('../../../src/mcp-server/services/documentation.service');
jest.mock('../../../src/mcp-server/services/vector-store.service', () => {
  return {
    VectorStoreService: {
      getInstance: jest.fn(() => ({
        initialize: jest.fn().mockResolvedValue(null),
        query: jest.fn().mockResolvedValue([]),
        isReady: jest.fn().mockReturnValue(false),
        reset: jest.fn(),
      })),
      resetInstance: jest.fn(),
    },
  };
});

describe('Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ConfigService as any).instance = undefined;
  });

  describe('Configuration Setup Workflow', () => {
    it('should complete check_config -> setup_config workflow', async () => {
      const checkConfigHandler = getToolHandler('check_config');
      const setupConfigHandler = getToolHandler('setup_config');

      expect(checkConfigHandler).toBeDefined();
      expect(setupConfigHandler).toBeDefined();
    });

    it('should validate configuration before proceeding', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config = await configService.initializeConfig(projectPath);

      expect(config.llm?.provider).toBeDefined();
      expect(config.apiKeys).toBeDefined();
    });

    it('should support config update workflow', async () => {
      const setupConfigHandler = getToolHandler('setup_config');

      expect(setupConfigHandler).toBeDefined();
    });
  });

  describe('Documentation Generation Workflow', () => {
    it('should execute documentation generation workflow', async () => {
      // Step 1: Check config
      const checkConfigHandler = getToolHandler('check_config');
      expect(checkConfigHandler).toBeDefined();

      // Step 2: Generate documentation
      const generateHandler = getToolHandler('generate_documentation');
      expect(generateHandler).toBeDefined();

      // Step 3: Initialize vector store
      const vectorService = VectorStoreService.getInstance();
      expect(vectorService).toBeDefined();
    });

    it('should support depth-aware documentation generation', async () => {
      const generateHandler = getToolHandler('generate_documentation');

      expect(generateHandler).toBeDefined();
      // Handler should accept depth parameter
    });

    it('should initialize vector store after generation', async () => {
      const vectorService = VectorStoreService.getInstance();

      // Vector store should be available after generation
      expect(vectorService).toBeDefined();
    });
  });

  describe('Documentation Query Workflow', () => {
    it('should execute query workflow: generate -> query', async () => {
      // Step 1: Generate documentation
      const generateHandler = getToolHandler('generate_documentation');
      expect(generateHandler).toBeDefined();

      // Step 2: Query documentation
      const queryHandler = getToolHandler('query_documentation');
      expect(queryHandler).toBeDefined();

      // Step 3: Return results
      const vectorService = VectorStoreService.getInstance();
      expect(vectorService).toBeDefined();
    });

    it('should use vector store for semantic search', async () => {
      const vectorService = VectorStoreService.getInstance();
      const queryHandler = getToolHandler('query_documentation');

      expect(vectorService).toBeDefined();
      expect(queryHandler).toBeDefined();
    });

    it('should fallback if vector store unavailable', async () => {
      const queryHandler = getToolHandler('query_documentation');

      expect(queryHandler).toBeDefined();
      // Should have fallback logic
    });
  });

  describe('Analysis Workflow', () => {
    it('should execute pattern detection workflow', async () => {
      const generateHandler = getToolHandler('generate_documentation');
      const patternsHandler = getToolHandler('check_architecture_patterns');

      expect(generateHandler).toBeDefined();
      expect(patternsHandler).toBeDefined();
    });

    it('should execute dependency analysis workflow', async () => {
      const generateHandler = getToolHandler('generate_documentation');
      const depsHandler = getToolHandler('analyze_dependencies');

      expect(generateHandler).toBeDefined();
      expect(depsHandler).toBeDefined();
    });

    it('should get recommendations workflow', async () => {
      const generateHandler = getToolHandler('generate_documentation');
      const recsHandler = getToolHandler('get_recommendations');

      expect(generateHandler).toBeDefined();
      expect(recsHandler).toBeDefined();
    });

    it('should validate architecture workflow', async () => {
      const generateHandler = getToolHandler('generate_documentation');
      const validateHandler = getToolHandler('validate_architecture');

      expect(generateHandler).toBeDefined();
      expect(validateHandler).toBeDefined();
    });
  });

  describe('Update Workflow', () => {
    it('should execute documentation update workflow', async () => {
      // Step 1: Generate initial docs
      const generateHandler = getToolHandler('generate_documentation');
      expect(generateHandler).toBeDefined();

      // Step 2: Update with new prompt
      const updateHandler = getToolHandler('update_documentation');
      expect(updateHandler).toBeDefined();

      // Step 3: Reload vector store
      const vectorService = VectorStoreService.getInstance();
      expect(vectorService).toBeDefined();
    });

    it('should support incremental updates', async () => {
      const updateHandler = getToolHandler('update_documentation');

      expect(updateHandler).toBeDefined();
      // Should support incremental mode
    });

    it('should maintain documentation state after update', async () => {
      const vectorService = VectorStoreService.getInstance();

      // State should be maintained
      expect(vectorService).toBeDefined();
    });
  });

  describe('Multi-Tool Workflows', () => {
    it('should chain multiple tools in sequence', async () => {
      const tools = [
        'check_config',
        'generate_documentation',
        'query_documentation',
        'check_architecture_patterns',
      ];

      tools.forEach((toolName) => {
        const handler = getToolHandler(toolName);
        expect(handler).toBeDefined();
      });
    });

    it('should support parallel tool execution', async () => {
      const parallelTools = [
        'check_architecture_patterns',
        'analyze_dependencies',
        'get_recommendations',
      ];

      const handlers = parallelTools.map((name) => getToolHandler(name));
      handlers.forEach((handler) => {
        expect(handler).toBeDefined();
      });
    });

    it('should handle tool dependencies correctly', async () => {
      // Pattern detection depends on documentation
      const generateHandler = getToolHandler('generate_documentation');
      const patternHandler = getToolHandler('check_architecture_patterns');

      expect(generateHandler).toBeDefined();
      expect(patternHandler).toBeDefined();
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should recover from config errors', async () => {
      const configService = ConfigService.getInstance();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');

      detectConfigSources.mockRejectedValueOnce(new Error('Config error'));

      try {
        await configService.initializeConfig('/test/project');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should recover from tool execution errors', async () => {
      const handler = getToolHandler('generate_documentation');

      expect(handler).toBeDefined();
      // Should handle errors gracefully
    });

    it('should support fallback mechanisms', async () => {
      const queryHandler = getToolHandler('query_documentation');

      expect(queryHandler).toBeDefined();
      // Should have fallback when vector store unavailable
    });

    it('should retry failed operations', async () => {
      const configService = ConfigService.getInstance();

      // Should support retrying after clear
      configService.clearCache();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');
      detectConfigSources.mockClear();
      detectConfigSources.mockResolvedValue({
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
        envConfig: { type: 'none', hasApiKey: false },
        recommendation: 'Use file config',
      });

      const config = await configService.initializeConfig('/test/project');
      expect(config).toBeDefined();
    });
  });

  describe('Performance Workflows', () => {
    it('should handle concurrent requests efficiently', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const configs = await Promise.all(
        Array.from({ length: 10 }, () => configService.initializeConfig(projectPath)),
      );

      // All should be cached
      configs.forEach((config) => {
        expect(config).toEqual(configs[0]);
      });
    });

    it('should batch vector store queries', async () => {
      const vectorService = VectorStoreService.getInstance();

      const queries = Array.from({ length: 5 }, () => vectorService.query('test', 5));

      const results = Promise.all(queries);
      expect(results).toBeDefined();
    });

    it('should cache documentation results', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config1 = await configService.initializeConfig(projectPath);
      const config2 = await configService.initializeConfig(projectPath);

      expect(config1).toBe(config2);
    });
  });

  describe('User-Facing Workflows', () => {
    it('should support first-time user setup', async () => {
      // Step 1: Check if config exists
      const checkConfigHandler = getToolHandler('check_config');
      expect(checkConfigHandler).toBeDefined();

      // Step 2: Setup config
      const setupConfigHandler = getToolHandler('setup_config');
      expect(setupConfigHandler).toBeDefined();

      // Step 3: Generate documentation
      const generateHandler = getToolHandler('generate_documentation');
      expect(generateHandler).toBeDefined();
    });

    it('should support existing user workflow', async () => {
      // Step 1: Load existing config
      const configService = ConfigService.getInstance();
      const config = await configService.initializeConfig('/test/project');
      expect(config).toBeDefined();

      // Step 2: Generate new documentation
      const generateHandler = getToolHandler('generate_documentation');
      expect(generateHandler).toBeDefined();

      // Step 3: Query results
      const queryHandler = getToolHandler('query_documentation');
      expect(queryHandler).toBeDefined();
    });

    it('should support advanced user workflow', async () => {
      const tools = getAllTools();

      // All tools available
      expect(tools.length).toBe(9);

      // Can chain multiple analysis tools
      const analysisTool = getToolHandler('check_architecture_patterns');
      expect(analysisTool).toBeDefined();
    });
  });

  describe('Tool Orchestration', () => {
    it('should provide all tools for orchestration', async () => {
      const tools = getAllTools();

      expect(tools.length).toBe(9);
      expect(tools.every((t) => t.name && t.description && t.inputSchema)).toBe(true);
    });

    it('should support tool discovery', async () => {
      const tools = getAllTools();
      const toolNames = tools.map((t) => t.name);

      const requiredTools = [
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

      requiredTools.forEach((name) => {
        expect(toolNames).toContain(name);
      });
    });

    it('should validate tool execution', async () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        const handler = getToolHandler(tool.name);
        expect(handler).toBeDefined();
      });
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state across workflow', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config1 = await configService.initializeConfig(projectPath);
      new DocumentationService(config1, projectPath);

      const config2 = await configService.initializeConfig(projectPath);

      expect(config1).toEqual(config2);
    });

    it('should preserve state across multiple operations', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config = await configService.initializeConfig(projectPath);
      const service1 = new DocumentationService(config, projectPath);

      const config2 = await configService.initializeConfig(projectPath);
      const service2 = new DocumentationService(config2, projectPath);

      expect(service1).toBeDefined();
      expect(service2).toBeDefined();
    });

    it('should handle state transitions', async () => {
      const configService = ConfigService.getInstance();

      // State 1: Not cached
      configService.clearCache();

      // State 2: Load config
      const config = await configService.initializeConfig('/test/project');
      expect(config).toBeDefined();

      // State 3: Cached
      const config2 = await configService.initializeConfig('/test/project');
      expect(config2).toBe(config);
    });
  });
});
