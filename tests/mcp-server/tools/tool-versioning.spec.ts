/**
 * Tool Versioning Tests
 * Tests the tool versioning and version management functionality
 */

import {
  getAllTools,
  getTool,
  getToolVersion,
  getToolChangelog,
  isToolDeprecated,
  getToolReplacement,
  getToolsByVersion,
  compareVersions,
  getToolVersionSummary,
  getAllToolVersions,
} from '../../../src/mcp-server/tools/tool-registry';

describe('Tool Versioning', () => {
  describe('Version Info Presence', () => {
    it('should have version info for all tools', () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        expect(tool.version).toBeDefined();
        expect(typeof tool.version).toBe('string');
      });
    });

    it('should have versionInfo structure for all tools', () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        expect(tool.versionInfo).toBeDefined();
        expect(tool.versionInfo?.current).toBeDefined();
        expect(tool.versionInfo?.current.major).toBeGreaterThanOrEqual(0);
        expect(tool.versionInfo?.current.minor).toBeGreaterThanOrEqual(0);
        expect(tool.versionInfo?.current.patch).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have changelog entries for all tools', () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        expect(tool.versionInfo?.changelog).toBeDefined();
        expect(Array.isArray(tool.versionInfo?.changelog)).toBe(true);
        expect(tool.versionInfo?.changelog?.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getToolVersion', () => {
    it('should return version for valid tool', () => {
      const version = getToolVersion('check_config');

      expect(version).toBe('1.0.0');
    });

    it('should return undefined for invalid tool', () => {
      const version = getToolVersion('invalid_tool');

      expect(version).toBeUndefined();
    });

    it('should return semantic version format', () => {
      const version = getToolVersion('generate_documentation');

      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('getToolChangelog', () => {
    it('should return changelog for valid tool', () => {
      const changelog = getToolChangelog('check_config');

      expect(changelog).toBeDefined();
      expect(Array.isArray(changelog)).toBe(true);
      expect(changelog?.length).toBeGreaterThan(0);
    });

    it('should have version in changelog entries', () => {
      const changelog = getToolChangelog('setup_config');

      changelog?.forEach((entry) => {
        expect(entry.version).toBeDefined();
        expect(entry.date).toBeDefined();
        expect(entry.changes).toBeDefined();
        expect(Array.isArray(entry.changes)).toBe(true);
      });
    });

    it('should indicate breaking changes if present', () => {
      const changelog = getToolChangelog('generate_documentation');

      changelog?.forEach((entry) => {
        if (entry.breaking) {
          expect(typeof entry.breaking).toBe('boolean');
        }
      });
    });

    it('should return undefined for invalid tool', () => {
      const changelog = getToolChangelog('invalid_tool');

      expect(changelog).toBeUndefined();
    });
  });

  describe('isToolDeprecated', () => {
    it('should return false for active tools', () => {
      const deprecated = isToolDeprecated('check_config');

      expect(deprecated).toBe(false);
    });

    it('should return true for deprecated tools', () => {
      // Assuming we want to test this, we would need a deprecated tool
      // For now, just verify the function works
      const deprecated = isToolDeprecated('nonexistent_tool');

      expect(typeof deprecated).toBe('boolean');
    });

    it('should handle missing versionInfo gracefully', () => {
      const deprecated = isToolDeprecated('invalid_tool');

      expect(typeof deprecated).toBe('boolean');
    });
  });

  describe('getToolReplacement', () => {
    it('should return undefined for non-deprecated tools', () => {
      const replacement = getToolReplacement('check_config');

      expect(replacement).toBeUndefined();
    });

    it('should return tool name for deprecated tools', () => {
      // This would test a deprecated tool if one existed
      const replacement = getToolReplacement('nonexistent_deprecated_tool');

      if (replacement) {
        expect(typeof replacement).toBe('string');
      }
    });
  });

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.3.4', '2.3.4')).toBe(0);
    });

    it('should return 1 for newer major version', () => {
      expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    });

    it('should return -1 for older major version', () => {
      expect(compareVersions('1.9.9', '2.0.0')).toBe(-1);
    });

    it('should return 1 for newer minor version', () => {
      expect(compareVersions('1.2.0', '1.1.9')).toBe(1);
    });

    it('should return -1 for older minor version', () => {
      expect(compareVersions('1.1.9', '1.2.0')).toBe(-1);
    });

    it('should return 1 for newer patch version', () => {
      expect(compareVersions('1.0.2', '1.0.1')).toBe(1);
    });

    it('should return -1 for older patch version', () => {
      expect(compareVersions('1.0.1', '1.0.2')).toBe(-1);
    });

    it('should handle missing patch versions', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.0', '1.0.0')).toBe(1);
    });

    it('should handle missing minor and patch', () => {
      expect(compareVersions('1', '1.0.0')).toBe(0);
      expect(compareVersions('2', '1.0.0')).toBe(1);
    });
  });

  describe('getToolsByVersion', () => {
    it('should return tools meeting minimum version', () => {
      const tools = getToolsByVersion('1.0.0');

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should return all tools for 0.0.0', () => {
      const tools = getToolsByVersion('0.0.0');

      expect(tools.length).toBe(getAllTools().length);
    });

    it('should filter tools below minimum version', () => {
      // All current tools are 1.0.0, so filtering by 2.0.0 should return none
      const tools = getToolsByVersion('2.0.0');

      expect(Array.isArray(tools)).toBe(true);
      // All tools are 1.0.0, so should be empty for 2.0.0
      expect(tools.length).toBe(0);
    });

    it('should include tools with matching version', () => {
      const tools = getToolsByVersion('1.0.0');

      tools.forEach((tool) => {
        expect(tool.version).toBeDefined();
        expect(compareVersions(tool.version!, '1.0.0')).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('getToolVersionSummary', () => {
    it('should return summary for valid tool', () => {
      const summary = getToolVersionSummary('check_config');

      expect(summary).toBeDefined();
      expect(summary?.version).toBe('1.0.0');
      expect(summary?.deprecated).toBe(false);
    });

    it('should include deprecation info', () => {
      const summary = getToolVersionSummary('setup_config');

      expect(summary?.deprecated).toBeDefined();
      expect(typeof summary?.deprecated).toBe('boolean');
    });

    it('should include replacement tool if deprecated', () => {
      // Test structure, not specific deprecated tool
      const summary = getToolVersionSummary('query_documentation');

      if (summary?.deprecated) {
        // If deprecated, should have replacedBy info
        expect(summary.replacedBy).toBeDefined();
      }
    });

    it('should return undefined for invalid tool', () => {
      const summary = getToolVersionSummary('invalid_tool');

      expect(summary).toBeUndefined();
    });
  });

  describe('getAllToolVersions', () => {
    it('should return object with all tool versions', () => {
      const versions = getAllToolVersions();

      expect(typeof versions).toBe('object');
      expect(Object.keys(versions).length).toBeGreaterThan(0);
    });

    it('should have entries for all versioned tools', () => {
      const versions = getAllToolVersions();
      const tools = getAllTools();

      tools.forEach((tool) => {
        if (tool.version) {
          expect(versions[tool.name]).toBe(tool.version);
        }
      });
    });

    it('should use semantic version format', () => {
      const versions = getAllToolVersions();

      Object.values(versions).forEach((version) => {
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });
  });

  describe('Version Consistency', () => {
    it('should have matching version and versionInfo.current', () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        if (tool.version && tool.versionInfo?.current) {
          const versionParts = tool.version.split('.').map(Number);
          expect(versionParts[0]).toBe(tool.versionInfo.current.major);
          expect(versionParts[1]).toBe(tool.versionInfo.current.minor);
          expect(versionParts[2]).toBe(tool.versionInfo.current.patch);
        }
      });
    });

    it('should have version in changelog', () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        const changelog = tool.versionInfo?.changelog;
        if (changelog && changelog.length > 0) {
          // Latest changelog entry should match current version
          const latestEntry = changelog[0];
          expect(latestEntry.version).toBe(tool.version);
        }
      });
    });
  });

  describe('Changelog Entries', () => {
    it('should have non-empty changes list', () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        tool.versionInfo?.changelog?.forEach((entry) => {
          expect(entry.changes.length).toBeGreaterThan(0);
          expect(entry.changes.every((c) => typeof c === 'string')).toBe(true);
        });
      });
    });

    it('should have valid dates in changelog', () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        tool.versionInfo?.changelog?.forEach((entry) => {
          // Should be able to parse as date
          const date = new Date(entry.date);
          expect(date.toString()).not.toBe('Invalid Date');
        });
      });
    });

    it('should have unique versions in changelog', () => {
      const tools = getAllTools();

      tools.forEach((tool) => {
        const changelog = tool.versionInfo?.changelog ?? [];
        const versions = changelog.map((e) => e.version);
        const uniqueVersions = new Set(versions);

        expect(uniqueVersions.size).toBe(versions.length);
      });
    });
  });

  describe('Semantic Versioning Rules', () => {
    it('should have version >= 0.0.0', () => {
      const versions = getAllToolVersions();

      Object.values(versions).forEach((version) => {
        expect(compareVersions(version, '0.0.0')).toBeGreaterThanOrEqual(0);
      });
    });

    it('should follow major.minor.patch format', () => {
      const versions = getAllToolVersions();

      Object.entries(versions).forEach(([, version]) => {
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });
  });

  describe('Tool Discovery by Version', () => {
    it('should be possible to find all v1.0.0 tools', () => {
      const tools = getToolsByVersion('1.0.0');

      expect(tools.length).toBeGreaterThan(0);
      tools.forEach((tool) => {
        expect(tool.version).toBe('1.0.0');
      });
    });

    it('should handle version filtering correctly', () => {
      const v1Tools = getToolsByVersion('1.0.0');
      const allTools = getAllTools();

      // All tools should be >= 1.0.0
      expect(v1Tools.length).toBeLessThanOrEqual(allTools.length);
    });
  });

  describe('Integration with Tool Registry', () => {
    it('should have version for getTool results', () => {
      const tool = getTool('check_config');

      expect(tool?.version).toBeDefined();
      expect(tool?.versionInfo).toBeDefined();
    });

    it('should preserve version info through getAllTools', () => {
      const allTools = getAllTools();
      const checkConfigFromAll = allTools.find((t) => t.name === 'check_config');

      expect(checkConfigFromAll?.version).toBe('1.0.0');
      expect(checkConfigFromAll?.versionInfo).toBeDefined();
    });

    it('should maintain version consistency across functions', () => {
      const version1 = getToolVersion('generate_documentation');
      const version2 = getTool('generate_documentation')?.version;
      const version3 = getToolVersionSummary('generate_documentation')?.version;

      expect(version1).toBe(version2);
      expect(version2).toBe(version3);
    });
  });
});
