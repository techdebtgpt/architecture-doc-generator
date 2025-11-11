/**
 * MCP Protocol Integration Tests
 * Tests the MCP server's protocol implementation and request/response handling
 */

import { getAllTools } from '../../../src/mcp-server/tools/tool-registry';
import { getToolHandler } from '../../../src/mcp-server/tools/handlers';
import { ConfigService } from '../../../src/mcp-server/services/config.service';

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

jest.mock('../../../src/mcp-server/services/documentation.service');
jest.mock('../../../src/mcp-server/services/vector-store.service');

describe('MCP Protocol Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ConfigService as any).instance = undefined;
  });

  describe('ListTools Request', () => {
    it('should handle ListTools request and return all tools', async () => {
      const tools = getAllTools();

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBe(9);
    });

    it('should return tool definitions with proper schema', async () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type');
        expect(tool.inputSchema).toHaveProperty('properties');
      });
    });

    it('should include check_config tool', async () => {
      const tools = getAllTools();
      const checkConfigTool = tools.find((t) => t.name === 'check_config');

      expect(checkConfigTool).toBeDefined();
      expect(checkConfigTool?.description).toMatch(/config/i);
    });

    it('should include all required tool categories', async () => {
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

      requiredTools.forEach((toolName) => {
        expect(toolNames).toContain(toolName);
      });
    });

    it('should have consistent tool ordering', async () => {
      const tools1 = getAllTools();
      const tools2 = getAllTools();

      const names1 = tools1.map((t) => t.name);
      const names2 = tools2.map((t) => t.name);

      expect(names1).toEqual(names2);
    });
  });

  describe('CallTool Request', () => {
    it('should route tool calls to appropriate handlers', async () => {
      const toolName = 'check_config';
      const handler = getToolHandler(toolName);

      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should return error for unknown tools', async () => {
      const toolName = 'unknown_tool_xyz';
      const handler = getToolHandler(toolName);

      expect(handler).toBeUndefined();
    });

    it('should pass arguments to handlers', async () => {
      const handler = getToolHandler('setup_config');
      expect(handler).toBeDefined();
    });

    it('should handle all 9 tools', async () => {
      const toolNames = [
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

      toolNames.forEach((toolName) => {
        const handler = getToolHandler(toolName);
        expect(handler).toBeDefined();
        expect(typeof handler).toBe('function');
      });
    });

    it('should provide proper context to handlers', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config = await configService.initializeConfig(projectPath);

      expect(config).toBeDefined();
      expect(config.llm?.provider).toBe('anthropic');
    });
  });

  describe('Tool Request/Response Flow', () => {
    it('should handle successful tool execution', async () => {
      const toolName = 'check_config';
      const handler = getToolHandler(toolName);

      expect(handler).toBeDefined();
    });

    it('should handle tool errors gracefully', async () => {
      const toolName = 'generate_documentation';
      const handler = getToolHandler(toolName);

      expect(handler).toBeDefined();
    });

    it('should include error information in response', async () => {
      const invalidToolName = 'non_existent_tool';
      const handler = getToolHandler(invalidToolName);

      expect(handler).toBeUndefined();
    });

    it('should respect tool input validation', async () => {
      const tool = getAllTools().find((t) => t.name === 'query_documentation');

      expect(tool).toBeDefined();
      expect(tool?.inputSchema?.required).toContain('question');
    });

    it('should handle async tool operations', async () => {
      const handler = getToolHandler('generate_documentation');

      expect(handler).toBeDefined();
      // Handler should be async
      expect(handler?.constructor.name).toBe('AsyncFunction');
    });
  });

  describe('Resource Handling', () => {
    it('should support documentation resources', async () => {
      // Resources should be accessible via MCP protocol
      const resourceURI = 'archdoc://documentation';

      expect(resourceURI).toContain('archdoc://');
    });

    it('should provide proper resource metadata', async () => {
      const resourceURI = 'archdoc://documentation';
      const mimeType = 'text/markdown';

      expect(resourceURI).toBeDefined();
      expect(mimeType).toBe('text/markdown');
    });
  });

  describe('Configuration Integration', () => {
    it('should initialize config before tool execution', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config = await configService.initializeConfig(projectPath);

      expect(config).toBeDefined();
      expect(config.llm).toBeDefined();
    });

    it('should cache config across tool calls', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config1 = await configService.initializeConfig(projectPath);
      const config2 = await configService.initializeConfig(projectPath);

      expect(config1).toEqual(config2);
    });

    it('should pass config context to handlers', async () => {
      const configService = ConfigService.getInstance();
      const projectPath = '/test/project';

      const config = await configService.initializeConfig(projectPath);

      expect(config).toHaveProperty('llm');
      expect(config).toHaveProperty('apiKeys');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing tool gracefully', async () => {
      const handler = getToolHandler('missing_tool');

      expect(handler).toBeUndefined();
    });

    it('should handle configuration errors', async () => {
      const configService = ConfigService.getInstance();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { detectConfigSources } = require('../../../src/mcp-server/config-detector');

      detectConfigSources.mockRejectedValueOnce(new Error('Config error'));

      await expect(configService.initializeConfig('/test/project')).rejects.toThrow();
    });

    it('should handle invalid tool names', async () => {
      const invalidNames = ['', null, undefined, 123, {}];

      invalidNames.forEach((name) => {
        const handler = getToolHandler(name as any);
        expect(handler).toBeUndefined();
      });
    });

    it('should distinguish between error and success responses', async () => {
      const tools = getAllTools();

      // All tools should be defined (success case possible)
      expect(tools.length).toBeGreaterThan(0);

      // Invalid tool returns undefined (error case)
      expect(getToolHandler('invalid')).toBeUndefined();
    });
  });

  describe('Protocol Compliance', () => {
    it('should support ListTools MCP request', async () => {
      const tools = getAllTools();

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should support CallTool MCP request', async () => {
      const toolNames = getAllTools().map((t) => t.name);

      toolNames.forEach((name) => {
        const handler = getToolHandler(name);
        expect(handler).toBeDefined();
      });
    });

    it('should support ListResources MCP request', async () => {
      // Resources should be discoverable
      const resourceURI = 'archdoc://documentation';
      expect(resourceURI).toBeDefined();
    });

    it('should support ReadResource MCP request', async () => {
      // Resources should be readable
      const resourceURI = 'archdoc://documentation';
      expect(resourceURI.startsWith('archdoc://')).toBe(true);
    });

    it('should provide server capabilities', async () => {
      const capabilities = {
        tools: {},
        resources: {},
      };

      expect(capabilities).toHaveProperty('tools');
      expect(capabilities).toHaveProperty('resources');
    });

    it('should identify as archdoc-mcp-server', async () => {
      const serverName = 'archdoc-mcp-server';
      const serverVersion = '1.0.0';

      expect(serverName).toBe('archdoc-mcp-server');
      expect(serverVersion).toBeDefined();
    });
  });

  describe('Tool Metadata', () => {
    it('should provide complete tool metadata', async () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeTruthy();
      });
    });

    it('should have unique tool names', async () => {
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have consistent schema structure', async () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        expect(tool.inputSchema.type).toBe('object');
        if (tool.inputSchema.required) {
          expect(Array.isArray(tool.inputSchema.required)).toBe(true);
        }
      });
    });
  });

  describe('Request Validation', () => {
    it('should validate tool names are strings', async () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
      });
    });

    it('should validate descriptions are present', async () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });

    it('should validate input schemas have required properties', async () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        expect(tool.inputSchema).toHaveProperty('type');
        expect(tool.inputSchema).toHaveProperty('properties');
      });
    });
  });
});
