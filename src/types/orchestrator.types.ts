import { AgentExecutionOptions } from './agent.types';

export interface OrchestratorOptions {
  incrementalMode?: boolean;
  existingDocsPath?: string;
  userPrompt?: string;
  languageConfig?: any;
  selectiveAgents?: string[];
  onAgentProgress?: (current: number, total: number, name: string) => void;
  iterativeRefinement?: {
    maxIterations?: number;
    clarityThreshold?: number;
  };
  agentOptions?: AgentExecutionOptions;
  maxTokens?: number;
  runName?: string;
  maxCostDollars?: number;
}
