import { AgentRegistry } from '../agents/agent-registry';
import { FileSystemScanner } from '../scanners/file-system-scanner';
import { Logger } from '../utils/logger';
import { ScanResult } from '../types/scanner.types';

/**
 * Base orchestrator providing common functionality for all orchestrators
 */
export abstract class BaseOrchestrator {
  protected logger: Logger;

  constructor(
    protected readonly agentRegistry: AgentRegistry,
    protected readonly scanner: FileSystemScanner,
    loggerName: string,
  ) {
    this.logger = new Logger(loggerName);
  }

  /**
   * Scan project files
   */
  protected async scanProject(projectPath: string): Promise<ScanResult> {
    this.logger.info('Scanning project files...');

    const scanResult = await this.scanner.scan({
      rootPath: projectPath,
      maxFiles: 10000,
      maxFileSize: 1048576, // 1MB
      respectGitignore: true,
      includeHidden: false,
      followSymlinks: false,
    });

    this.logger.info(
      `Found ${scanResult.totalFiles} files in ${scanResult.totalDirectories} directories`,
    );

    return scanResult;
  }

  /**
   * Get all registered agents
   */
  protected getRegisteredAgents(): string[] {
    const agents = this.agentRegistry.getAllAgents();
    const agentNames = agents.map((a) => a.getMetadata().name);
    this.logger.info(`Registered ${agentNames.length} agents: ${agentNames.join(', ')}`);
    return agentNames;
  }

  /**
   * Abstract method that each orchestrator must implement
   */
  abstract execute(projectPath: string, options?: any): Promise<any>;
}
