import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Load and parse the .archdoc.config.json file
 * @param verbose - Whether to log verbose output
 * @returns Parsed config object or empty object if not found
 */
export async function loadUserConfig(verbose: boolean = false): Promise<any> {
  let userConfig: any = {};

  try {
    const configPath = path.join(process.cwd(), '.archdoc.config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    userConfig = JSON.parse(configContent);

    // Initialize LLMService with config BEFORE agents are constructed
    const { LLMService } = await import('../../src/llm/llm-service');
    LLMService.getInstance(userConfig);

    if (verbose) {
      console.log(chalk.blue('\n📄 Config loaded from: ' + configPath));
    }
  } catch (_error) {
    if (verbose) {
      console.log(chalk.yellow('\n⚠️  No config file found, using defaults'));
    }
  }

  return userConfig;
}
