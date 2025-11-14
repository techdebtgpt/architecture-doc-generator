/**
 * Configuration Service
 * Centralized config management and initialization
 */

import { ArchDocConfig } from '../../utils/config-loader';
import { Logger } from '../../utils/logger';
import {
  detectConfigSources,
  bothConfigsAvailable,
  buildConfigFromEnv,
  getDefaultModelForProvider,
} from '../config-detector';

const logger = new Logger('ConfigService');

/**
 * Configuration service with singleton pattern
 */
export class ConfigService {
  private static instance: ConfigService;
  private cachedConfig: Map<string, ArchDocConfig> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Initialize and return configuration for a project
   * Implements intelligent detection with caching
   */
  async initializeConfig(projectPath: string): Promise<ArchDocConfig> {
    // Check cache first
    if (this.cachedConfig.has(projectPath)) {
      return this.cachedConfig.get(projectPath)!;
    }

    // Detect configuration sources
    const { fileConfig, envConfig } = await detectConfigSources(projectPath);

    logger.info(`\n📋 Configuration Detection:`);
    logger.info(
      `  File Config (.archdoc.config.json): ${fileConfig.hasApiKey ? '✅ Found' : '❌ Not found'}`,
    );
    logger.info(
      `  Env Config (ANTHROPIC_API_KEY, etc.): ${envConfig.hasApiKey ? '✅ Found' : '❌ Not found'}\n`,
    );

    let config: ArchDocConfig | null = null;
    let configSource = 'none';

    // Case 1: Both configs available - use project config (takes precedence)
    if (bothConfigsAvailable(fileConfig, envConfig)) {
      logger.info('📋 Both configurations available!');
      logger.info(`   Using: Project Config (.archdoc.config.json)`);
      logger.info(`   (To use editor env vars instead, remove .archdoc.config.json)\n`);

      config = fileConfig.fullConfig || null;
      configSource = 'file';
    }
    // Case 2: Only file config available
    else if (fileConfig.hasApiKey) {
      logger.info('📋 Using: Project Config (.archdoc.config.json)\n');
      config = fileConfig.fullConfig || null;
      configSource = 'file';
    }
    // Case 3: Only environment variables available
    else if (envConfig.hasApiKey) {
      logger.info('💡 Using: Editor Environment Variables');
      logger.info(`   Provider: ${envConfig.provider}`);
      logger.info(
        `   Model: ${envConfig.model || getDefaultModelForProvider(envConfig.provider)}\n`,
      );

      config = buildConfigFromEnv();
      configSource = 'environment';
    }
    // Case 4: No configuration found
    else {
      const error = `
❌ No configuration found!

Please choose ONE option:

**Option 1: Create Project Config**
  Run: archdoc config --init
  Then configure your provider and API key

**Option 2: Set Environment Variables**
  export ANTHROPIC_API_KEY="sk-ant-..."
  export DEFAULT_LLM_PROVIDER="anthropic"
  export DEFAULT_LLM_MODEL="claude-sonnet-4-20250514"

📖 See docs/MCP-SETUP.md for more details
      `;

      logger.error(error);
      throw new Error(error);
    }

    // Validate config
    if (!config) {
      throw new Error(
        'Failed to build configuration: config is null. This should not happen. Check that .archdoc.config.json is valid JSON.',
      );
    }

    logger.info(`✅ Configuration loaded from: ${configSource}`);

    // Cache and return
    this.cachedConfig.set(projectPath, config);

    // Initialize LLMService with config BEFORE creating agents
    const { LLMService } = await import('../../llm/llm-service');
    LLMService.getInstance(config);

    return config;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cachedConfig.clear();
  }

  /**
   * Get cached config
   */
  getConfig(projectPath: string): ArchDocConfig | undefined {
    return this.cachedConfig.get(projectPath);
  }
}
