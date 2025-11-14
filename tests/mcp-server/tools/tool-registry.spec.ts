import { getAllTools, getTool, isValidTool } from '../../../src/mcp-server/tools/tool-registry';

describe('Tool Registry', () => {
  describe('getAllTools', () => {
    it('should return array of all tools', () => {
      const tools = getAllTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should have 9 tools registered', () => {
      const tools = getAllTools();

      expect(tools.length).toBe(9);
    });

    it('should include check_config tool', () => {
      const tools = getAllTools();
      const checkConfigTool = tools.find((t) => t.name === 'check_config');

      expect(checkConfigTool).toBeDefined();
      expect(checkConfigTool?.description).toBeDefined();
    });

    it('should include setup_config tool', () => {
      const tools = getAllTools();
      const setupConfigTool = tools.find((t) => t.name === 'setup_config');

      expect(setupConfigTool).toBeDefined();
    });

    it('should include generate_documentation tool', () => {
      const tools = getAllTools();
      const tool = tools.find((t) => t.name === 'generate_documentation');

      expect(tool).toBeDefined();
      expect(tool?.inputSchema).toBeDefined();
    });

    it('should include query_documentation tool', () => {
      const tools = getAllTools();
      const tool = tools.find((t) => t.name === 'query_documentation');

      expect(tool).toBeDefined();
    });

    it('should include update_documentation tool', () => {
      const tools = getAllTools();
      const tool = tools.find((t) => t.name === 'update_documentation');

      expect(tool).toBeDefined();
    });

    it('should include check_architecture_patterns tool', () => {
      const tools = getAllTools();
      const tool = tools.find((t) => t.name === 'check_architecture_patterns');

      expect(tool).toBeDefined();
    });

    it('should include analyze_dependencies tool', () => {
      const tools = getAllTools();
      const tool = tools.find((t) => t.name === 'analyze_dependencies');

      expect(tool).toBeDefined();
    });

    it('should include get_recommendations tool', () => {
      const tools = getAllTools();
      const tool = tools.find((t) => t.name === 'get_recommendations');

      expect(tool).toBeDefined();
    });

    it('should include validate_architecture tool', () => {
      const tools = getAllTools();
      const tool = tools.find((t) => t.name === 'validate_architecture');

      expect(tool).toBeDefined();
    });

    it('should not have duplicate tool names', () => {
      const tools = getAllTools();
      const names = tools.map((t) => t.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(tools.length);
    });
  });

  describe('getTool', () => {
    it('should retrieve tool by name', () => {
      const tool = getTool('check_config');

      expect(tool).toBeDefined();
      expect(tool?.name).toBe('check_config');
    });

    it('should return undefined for unknown tool', () => {
      const tool = getTool('unknown_tool');

      expect(tool).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      const validTool = getTool('check_config');
      const invalidTool = getTool('CHECK_CONFIG');

      expect(validTool).toBeDefined();
      expect(invalidTool).toBeUndefined();
    });

    it('should return all expected tool properties', () => {
      const tool = getTool('check_config');

      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
    });

    it('should retrieve configuration-related tools', () => {
      const checkConfig = getTool('check_config');
      const setupConfig = getTool('setup_config');

      expect(checkConfig?.name).toBe('check_config');
      expect(setupConfig?.name).toBe('setup_config');
    });

    it('should retrieve documentation tools', () => {
      const generate = getTool('generate_documentation');
      const query = getTool('query_documentation');
      const update = getTool('update_documentation');

      expect(generate?.name).toBe('generate_documentation');
      expect(query?.name).toBe('query_documentation');
      expect(update?.name).toBe('update_documentation');
    });

    it('should retrieve analysis tools', () => {
      const patterns = getTool('check_architecture_patterns');
      const deps = getTool('analyze_dependencies');
      const recs = getTool('get_recommendations');
      const validate = getTool('validate_architecture');

      expect(patterns?.name).toBe('check_architecture_patterns');
      expect(deps?.name).toBe('analyze_dependencies');
      expect(recs?.name).toBe('get_recommendations');
      expect(validate?.name).toBe('validate_architecture');
    });
  });

  describe('isValidTool', () => {
    it('should return true for valid tool names', () => {
      expect(isValidTool('check_config')).toBe(true);
      expect(isValidTool('setup_config')).toBe(true);
      expect(isValidTool('generate_documentation')).toBe(true);
    });

    it('should return false for invalid tool names', () => {
      expect(isValidTool('invalid_tool')).toBe(false);
      expect(isValidTool('unknown')).toBe(false);
      expect(isValidTool('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidTool('check_config')).toBe(true);
      expect(isValidTool('CHECK_CONFIG')).toBe(false);
      expect(isValidTool('Check_Config')).toBe(false);
    });

    it('should validate all 9 tools', () => {
      const validTools = [
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

      validTools.forEach((tool) => {
        expect(isValidTool(tool)).toBe(true);
      });
    });
  });

  describe('Tool Schemas', () => {
    it('should have valid inputSchema for check_config', () => {
      const tool = getTool('check_config');

      expect(tool?.inputSchema).toBeDefined();
      expect(tool?.inputSchema?.type).toBe('object');
    });

    it('should have valid inputSchema for setup_config', () => {
      const tool = getTool('setup_config');

      expect(tool?.inputSchema).toBeDefined();
      expect(tool?.inputSchema?.properties).toBeDefined();
      expect(tool?.inputSchema?.required).toBeDefined();
    });

    it('should require provider and model for setup_config', () => {
      const tool = getTool('setup_config');
      const required = tool?.inputSchema?.required || [];

      expect(required).toContain('provider');
      expect(required).toContain('model');
      expect(required).toContain('apiKey');
    });

    it('should have valid inputSchema for generate_documentation', () => {
      const tool = getTool('generate_documentation');

      expect(tool?.inputSchema).toBeDefined();
      expect(tool?.inputSchema?.properties).toBeDefined();
    });

    it('should define output directory option', () => {
      const tool = getTool('generate_documentation');
      const properties = tool?.inputSchema?.properties || {};

      expect(properties.outputDir).toBeDefined();
    });

    it('should define depth parameter', () => {
      const tool = getTool('generate_documentation');
      const properties = tool?.inputSchema?.properties || {};

      expect(properties.depth).toBeDefined();
    });

    it('should have valid inputSchema for query_documentation', () => {
      const tool = getTool('query_documentation');

      expect(tool?.inputSchema).toBeDefined();
      expect(tool?.inputSchema?.properties).toBeDefined();
      expect(tool?.inputSchema?.required).toContain('question');
    });

    it('should have valid inputSchema for update_documentation', () => {
      const tool = getTool('update_documentation');

      expect(tool?.inputSchema).toBeDefined();
      expect(tool?.inputSchema?.required).toContain('prompt');
    });

    it('should have valid inputSchema for validate_architecture', () => {
      const tool = getTool('validate_architecture');

      expect(tool?.inputSchema).toBeDefined();
      expect(tool?.inputSchema?.required).toContain('filePath');
    });
  });

  describe('Tool Descriptions', () => {
    it('should have descriptive names for all tools', () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        expect(tool.name).toBeDefined();
        expect(tool.name.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptions for all tools', () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });

    it('should have clear tool purposes', () => {
      const descriptions = getAllTools().map((t) => t.description);

      // Check that descriptions are meaningful (not empty or generic)
      descriptions.forEach((desc) => {
        expect(desc).toBeTruthy();
        expect(desc.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Tool Discovery', () => {
    it('should list all configuration tools', () => {
      const tools = getAllTools();
      const configTools = tools.filter((t) => t.name.includes('config'));

      expect(configTools.length).toBeGreaterThanOrEqual(2);
    });

    it('should list all documentation tools', () => {
      const tools = getAllTools();
      const docTools = tools.filter((t) => t.name.includes('documentation'));

      expect(docTools.length).toBeGreaterThanOrEqual(3);
    });

    it('should list all analysis tools', () => {
      const tools = getAllTools();
      const analysisTools = tools.filter(
        (t) =>
          t.name.includes('architecture') ||
          t.name.includes('dependencies') ||
          t.name.includes('recommendations') ||
          t.name.includes('validate'),
      );

      expect(analysisTools.length).toBeGreaterThanOrEqual(4);
    });

    it('should support tool categorization', () => {
      const tools = getAllTools();

      const categories = {
        config: tools.filter((t) => t.name.includes('config')),
        documentation: tools.filter((t) => t.name.includes('documentation')),
        analysis: tools.filter((t) =>
          [
            'check_architecture_patterns',
            'analyze_dependencies',
            'get_recommendations',
            'validate_architecture',
          ].includes(t.name),
        ),
      };

      expect(categories.config.length).toBeGreaterThan(0);
      expect(categories.documentation.length).toBeGreaterThan(0);
      expect(categories.analysis.length).toBeGreaterThan(0);
    });
  });

  describe('Tool Registry Consistency', () => {
    it('should maintain consistent tool information across methods', () => {
      const allTools = getAllTools();

      allTools.forEach((tool) => {
        const singleTool = getTool(tool.name);

        expect(singleTool).toEqual(tool);
      });
    });

    it('should have all tools accessible via isValidTool', () => {
      const allTools = getAllTools();

      allTools.forEach((tool) => {
        expect(isValidTool(tool.name)).toBe(true);
      });
    });

    it('should not have tools that are not in getAllTools', () => {
      const commonToolNames = [
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

      const allTools = getAllTools();
      const registeredNames = allTools.map((t) => t.name);

      commonToolNames.forEach((name) => {
        expect(registeredNames).toContain(name);
      });
    });
  });
});
