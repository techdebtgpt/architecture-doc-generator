/**
 * Tests for config-loader (loadArchDocConfig, getConfigPath, hasConfig)
 */
import * as path from 'path';
import {
  loadArchDocConfig,
  getConfigPath,
  hasConfig,
  ArchDocConfig,
} from '../../src/utils/config-loader';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const fs = jest.requireMock<{ existsSync: jest.Mock; readFileSync: jest.Mock }>('fs');

describe('config-loader', () => {
  const projectPath = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfigPath', () => {
    it('should return path to .archdoc.config.json in project root', () => {
      const result = getConfigPath(projectPath);
      expect(result).toBe(path.join(projectPath, '.archdoc.config.json'));
    });

    it('should use process.cwd() when projectPath is omitted', () => {
      const result = getConfigPath();
      expect(result).toBe(path.join(process.cwd(), '.archdoc.config.json'));
    });
  });

  describe('hasConfig', () => {
    it('should return true when root config exists', () => {
      fs.existsSync.mockReturnValueOnce(true);

      const result = hasConfig(projectPath);
      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith(path.join(projectPath, '.archdoc.config.json'));
    });

    it('should return true when .arch-docs config exists', () => {
      fs.existsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const result = hasConfig(projectPath);
      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join(projectPath, '.arch-docs', '.archdoc.config.json'),
      );
    });

    it('should return false when no config exists', () => {
      fs.existsSync.mockReturnValue(false);

      const result = hasConfig(projectPath);
      expect(result).toBe(false);
    });
  });

  describe('loadArchDocConfig', () => {
    it('should return null when no config file exists', () => {
      fs.existsSync.mockReturnValue(false);

      const result = loadArchDocConfig(projectPath, false);
      expect(result).toBeNull();
    });

    it('should load config from root when present', () => {
      const configPath = path.join(projectPath, '.archdoc.config.json');
      const config: ArchDocConfig = {
        llm: { provider: 'anthropic', model: 'claude-3-sonnet' },
        apiKeys: { anthropic: 'test-key' },
      };
      fs.existsSync.mockImplementation((p: string) => p === configPath);
      fs.readFileSync.mockReturnValue(JSON.stringify(config));

      const result = loadArchDocConfig(projectPath, false);
      expect(result).toEqual(config);
      expect(fs.readFileSync).toHaveBeenCalledWith(configPath, 'utf-8');
    });

    it('should fallback to .arch-docs config when root config missing', () => {
      const archDocsPath = path.join(projectPath, '.arch-docs', '.archdoc.config.json');
      const config: ArchDocConfig = { llm: { model: 'claude-3-sonnet' } };
      fs.existsSync
        .mockReturnValueOnce(false)
        .mockImplementation((p: string) => p === archDocsPath);
      fs.readFileSync.mockReturnValue(JSON.stringify(config));

      const result = loadArchDocConfig(projectPath, false);
      expect(result).toEqual(config);
      expect(fs.readFileSync).toHaveBeenCalledWith(archDocsPath, 'utf-8');
    });

    it('should return null when config file is invalid JSON', () => {
      const configPath = path.join(projectPath, '.archdoc.config.json');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      fs.existsSync.mockImplementation((p: string) => p === configPath);
      fs.readFileSync.mockReturnValue('not valid json');

      const result = loadArchDocConfig(projectPath, false);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
