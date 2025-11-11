import {
  handleGenerateDocumentation,
  handleQueryDocumentation,
  handleUpdateDocumentation,
  handleCheckPatterns,
  handleAnalyzeDependencies,
  handleGetRecommendations,
  handleValidateArchitecture,
  TOOL_HANDLERS,
  getToolHandler,
} from '../../../src/mcp-server/tools/handlers';
import { DocumentationService } from '../../../src/mcp-server/services/documentation.service';
import { VectorStoreService } from '../../../src/mcp-server/services/vector-store.service';
import { ToolContext } from '../../../src/mcp-server/types';
import { ArchDocConfig } from '../../../src/utils/config-loader';

jest.mock('../../../src/mcp-server/services/documentation.service');
jest.mock('../../../src/mcp-server/services/vector-store.service');

const mockDocumentationService = DocumentationService as jest.MockedClass<
  typeof DocumentationService
>;
const mockVectorStoreService = VectorStoreService as any;

describe('Tool Handlers', () => {
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

    // Setup default VectorStoreService mock
    mockVectorStoreService.getInstance.mockReturnValue({
      initialize: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue([]),
      isReady: jest.fn().mockReturnValue(false),
      reset: jest.fn(),
    } as any);
  });

  describe('handleGenerateDocumentation', () => {
    it('should generate documentation', async () => {
      mockDocumentationService.prototype.generateDocumentation = jest.fn().mockResolvedValue({
        output: {
          metadata: {
            agentsExecuted: ['analyzer'],
            totalTokensUsed: 5000,
          },
          customSections: new Map([['overview', { files: ['overview.md'] }]]),
        },
        docsPath: '/test/docs',
      });

      mockDocumentationService.prototype.formatOutput = jest
        .fn()
        .mockReturnValue('✅ Documentation generated successfully!');

      mockVectorStoreService.getInstance.mockReturnValueOnce({
        initialize: jest.fn().mockResolvedValue({}),
      } as any);

      const result = await handleGenerateDocumentation({ outputDir: '/custom/docs' }, mockContext);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Documentation generated successfully');
    });

    it('should pass depth parameter to service', async () => {
      mockDocumentationService.prototype.generateDocumentation = jest.fn().mockResolvedValue({
        output: {
          metadata: { agentsExecuted: [], totalTokensUsed: 0 },
          customSections: new Map(),
        },
        docsPath: '/docs',
      });

      mockDocumentationService.prototype.formatOutput = jest.fn().mockReturnValue('Generated');

      mockVectorStoreService.getInstance.mockReturnValueOnce({
        initialize: jest.fn(),
      } as any);

      await handleGenerateDocumentation({ depth: 'deep' }, mockContext);

      expect(mockDocumentationService.prototype.generateDocumentation).toHaveBeenCalledWith(
        expect.objectContaining({ depth: 'deep' }),
      );
    });

    it('should initialize vector store after generation', async () => {
      const mockVectorService = {
        initialize: jest.fn().mockResolvedValue({}),
      };

      mockDocumentationService.prototype.generateDocumentation = jest.fn().mockResolvedValue({
        output: { metadata: {}, customSections: new Map() },
        docsPath: '/docs',
      });

      mockDocumentationService.prototype.formatOutput = jest.fn().mockReturnValue('Generated');

      mockVectorStoreService.getInstance.mockReturnValueOnce(mockVectorService as any);

      await handleGenerateDocumentation({}, mockContext);

      expect(mockVectorService.initialize).toHaveBeenCalledWith('/docs');
    });

    it('should handle generation errors', async () => {
      mockDocumentationService.prototype.generateDocumentation = jest
        .fn()
        .mockRejectedValue(new Error('Generation failed'));

      const result = await handleGenerateDocumentation({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Generation failed');
    });

    it('should support focus area parameter', async () => {
      mockDocumentationService.prototype.generateDocumentation = jest.fn().mockResolvedValue({
        output: { metadata: {}, customSections: new Map() },
        docsPath: '/docs',
      });

      mockDocumentationService.prototype.formatOutput = jest.fn().mockReturnValue('Generated');

      mockVectorStoreService.getInstance.mockReturnValueOnce({
        initialize: jest.fn(),
      } as any);

      await handleGenerateDocumentation({ focusArea: 'api' }, mockContext);

      expect(mockDocumentationService.prototype.generateDocumentation).toHaveBeenCalledWith(
        expect.objectContaining({ focusArea: 'api' }),
      );
    });

    it('should support selective agents', async () => {
      const agents = ['pattern-detector', 'dependency-analyzer'];

      mockDocumentationService.prototype.generateDocumentation = jest.fn().mockResolvedValue({
        output: { metadata: {}, customSections: new Map() },
        docsPath: '/docs',
      });

      mockDocumentationService.prototype.formatOutput = jest.fn().mockReturnValue('Generated');

      mockVectorStoreService.getInstance.mockReturnValueOnce({
        initialize: jest.fn(),
      } as any);

      await handleGenerateDocumentation({ selectiveAgents: agents }, mockContext);

      expect(mockDocumentationService.prototype.generateDocumentation).toHaveBeenCalledWith(
        expect.objectContaining({ selectiveAgents: agents }),
      );
    });

    it('should support max cost parameter', async () => {
      mockDocumentationService.prototype.generateDocumentation = jest.fn().mockResolvedValue({
        output: { metadata: {}, customSections: new Map() },
        docsPath: '/docs',
      });

      mockDocumentationService.prototype.formatOutput = jest.fn().mockReturnValue('Generated');

      mockVectorStoreService.getInstance.mockReturnValueOnce({
        initialize: jest.fn(),
      } as any);

      await handleGenerateDocumentation({ maxCostDollars: 15.0 }, mockContext);

      expect(mockDocumentationService.prototype.generateDocumentation).toHaveBeenCalledWith(
        expect.objectContaining({ maxCostDollars: 15.0 }),
      );
    });
  });

  describe('handleQueryDocumentation', () => {
    it('should query documentation with vector search', async () => {
      const mockVectorService = {
        isReady: jest.fn().mockReturnValue(true),
        query: jest.fn().mockResolvedValue([
          {
            content: 'Architecture details',
            file: 'architecture.md',
            score: 0.95,
          },
        ]),
      };

      mockVectorStoreService.getInstance.mockReturnValueOnce(mockVectorService as any);

      const result = await handleQueryDocumentation(
        { question: 'What is the architecture?' },
        mockContext,
      );

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Architecture details');
    });

    it('should initialize vector store if not ready', async () => {
      const mockVectorService = {
        isReady: jest.fn().mockReturnValue(false),
        initialize: jest.fn().mockResolvedValue({}),
        query: jest.fn().mockResolvedValue([]),
      };

      mockVectorStoreService.getInstance.mockReturnValueOnce(mockVectorService as any);

      mockDocumentationService.prototype.readDocumentationFallback = jest
        .fn()
        .mockResolvedValue('Documentation content');

      await handleQueryDocumentation(
        { question: 'Query' },
        { ...mockContext, projectPath: '/project' },
      );

      expect(mockVectorService.initialize).toHaveBeenCalledWith(
        expect.stringMatching(/[/\\]project[/\\].arch-docs/),
      );
    });

    it('should fallback to full documentation if vector search unavailable', async () => {
      const mockVectorService = {
        isReady: jest.fn().mockReturnValue(false),
        initialize: jest.fn().mockResolvedValue(null),
      };

      mockVectorStoreService.getInstance.mockReturnValueOnce(mockVectorService as any);

      mockDocumentationService.prototype.readDocumentationFallback = jest
        .fn()
        .mockResolvedValue('Full documentation content here');

      const result = await handleQueryDocumentation({ question: 'Query' }, mockContext);

      expect(result.content[0].text).toContain('Full documentation content here');
      expect(result.content[0].text).toContain('Vector search not available');
    });

    it('should support custom topK parameter', async () => {
      const mockVectorService = {
        isReady: jest.fn().mockReturnValue(true),
        query: jest.fn().mockResolvedValue([]),
      };

      mockVectorStoreService.getInstance.mockReturnValueOnce(mockVectorService as any);

      await handleQueryDocumentation({ question: 'Query', topK: 10 }, mockContext);

      expect(mockVectorService.query).toHaveBeenCalledWith('Query', 10);
    });

    it('should handle query errors gracefully', async () => {
      const mockVectorService = {
        isReady: jest.fn().mockReturnValue(true),
        query: jest.fn().mockRejectedValue(new Error('Query failed')),
      };

      mockVectorStoreService.getInstance.mockReturnValueOnce(mockVectorService as any);

      const result = await handleQueryDocumentation({ question: 'Query' }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Query failed');
    });
  });

  describe('handleUpdateDocumentation', () => {
    it('should update documentation with prompt', async () => {
      mockDocumentationService.prototype.updateDocumentation = jest.fn().mockResolvedValue({
        output: {
          metadata: {
            agentsExecuted: ['analyzer'],
            totalTokensUsed: 3000,
          },
        },
        docsPath: '/docs',
      });

      const mockVectorService = {
        initialize: jest.fn().mockResolvedValue({}),
      };

      mockVectorStoreService.getInstance.mockReturnValueOnce(mockVectorService as any);

      const result = await handleUpdateDocumentation({ prompt: 'Add authentication' }, mockContext);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Documentation updated');
    });

    it('should reload vector store after update', async () => {
      const mockVectorService = {
        initialize: jest.fn().mockResolvedValue({}),
      };

      mockDocumentationService.prototype.updateDocumentation = jest.fn().mockResolvedValue({
        output: { metadata: { agentsExecuted: [] } },
        docsPath: '/docs',
      });

      mockVectorStoreService.getInstance.mockReturnValueOnce(mockVectorService as any);

      await handleUpdateDocumentation({ prompt: 'Update' }, mockContext);

      expect(mockVectorService.initialize).toHaveBeenCalledWith('/docs');
    });

    it('should handle update errors', async () => {
      mockDocumentationService.prototype.updateDocumentation = jest
        .fn()
        .mockRejectedValue(new Error('Update failed'));

      const result = await handleUpdateDocumentation({ prompt: 'Update' }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Update failed');
    });
  });

  describe('Selective Agent Handlers', () => {
    it('should handle pattern detection', async () => {
      mockDocumentationService.prototype.runSelectiveAgents = jest.fn().mockResolvedValue({
        customSections: new Map([['pattern-detector', { content: 'Patterns found' }]]),
      });

      const result = await handleCheckPatterns({}, mockContext);

      expect(result.content[0].text).toContain('Patterns found');
    });

    it('should handle dependency analysis', async () => {
      mockDocumentationService.prototype.runSelectiveAgents = jest.fn().mockResolvedValue({
        customSections: new Map([['dependency-analyzer', { content: 'Dependencies' }]]),
      });

      const result = await handleAnalyzeDependencies({}, mockContext);

      expect(result.content[0].text).toContain('Dependencies');
    });

    it('should handle recommendations', async () => {
      mockDocumentationService.prototype.runSelectiveAgents = jest.fn().mockResolvedValue({
        customSections: new Map([['recommendation-engine', { content: 'Recommendations' }]]),
      });

      const result = await handleGetRecommendations({}, mockContext);

      expect(result.content[0].text).toContain('Recommendations');
    });
  });

  describe('handleValidateArchitecture', () => {
    it('should validate architecture', async () => {
      mockDocumentationService.prototype.runSelectiveAgents = jest.fn().mockResolvedValue({
        customSections: new Map([['architecture-validator', { content: 'Validation results' }]]),
      });

      const result = await handleValidateArchitecture({ filePath: '/src/main.ts' }, mockContext);

      expect(result.content[0].text).toContain('Validation results');
    });

    it('should pass file path to validator', async () => {
      mockDocumentationService.prototype.runSelectiveAgents = jest.fn().mockResolvedValue({
        customSections: new Map([['architecture-validator', { content: 'Results' }]]),
      });

      await handleValidateArchitecture({ filePath: '/src/api/routes.ts' }, mockContext);

      expect(mockDocumentationService.prototype.runSelectiveAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('/src/api/routes.ts'),
        }),
      );
    });

    it('should handle validation errors', async () => {
      mockDocumentationService.prototype.runSelectiveAgents = jest
        .fn()
        .mockRejectedValue(new Error('Validation failed'));

      const result = await handleValidateArchitecture({ filePath: '/src/main.ts' }, mockContext);

      expect(result.isError).toBe(true);
    });
  });

  describe('TOOL_HANDLERS Registry', () => {
    it('should have all 9 handlers registered', () => {
      expect(Object.keys(TOOL_HANDLERS).length).toBe(9);
    });

    it('should have check_config handler', () => {
      expect(TOOL_HANDLERS.check_config).toBeDefined();
      expect(typeof TOOL_HANDLERS.check_config).toBe('function');
    });

    it('should have setup_config handler', () => {
      expect(TOOL_HANDLERS.setup_config).toBeDefined();
      expect(typeof TOOL_HANDLERS.setup_config).toBe('function');
    });

    it('should have generate_documentation handler', () => {
      expect(TOOL_HANDLERS.generate_documentation).toBeDefined();
      expect(typeof TOOL_HANDLERS.generate_documentation).toBe('function');
    });

    it('should have query_documentation handler', () => {
      expect(TOOL_HANDLERS.query_documentation).toBeDefined();
      expect(typeof TOOL_HANDLERS.query_documentation).toBe('function');
    });

    it('should have update_documentation handler', () => {
      expect(TOOL_HANDLERS.update_documentation).toBeDefined();
      expect(typeof TOOL_HANDLERS.update_documentation).toBe('function');
    });

    it('should have check_architecture_patterns handler', () => {
      expect(TOOL_HANDLERS.check_architecture_patterns).toBeDefined();
    });

    it('should have analyze_dependencies handler', () => {
      expect(TOOL_HANDLERS.analyze_dependencies).toBeDefined();
    });

    it('should have get_recommendations handler', () => {
      expect(TOOL_HANDLERS.get_recommendations).toBeDefined();
    });

    it('should have validate_architecture handler', () => {
      expect(TOOL_HANDLERS.validate_architecture).toBeDefined();
    });
  });

  describe('getToolHandler Function', () => {
    it('should retrieve handler by tool name', () => {
      const handler = getToolHandler('check_config');

      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should return undefined for unknown tool', () => {
      const handler = getToolHandler('unknown_tool_xyz');

      expect(handler).toBeUndefined();
    });

    it('should retrieve all registered tool handlers', () => {
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
      });
    });

    it('should be case-sensitive', () => {
      const validHandler = getToolHandler('check_config');
      const invalidHandler = getToolHandler('CHECK_CONFIG');

      expect(validHandler).toBeDefined();
      expect(invalidHandler).toBeUndefined();
    });
  });
});
