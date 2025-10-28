import {
  AgentContext,
  AgentResult,
  AgentMetadata,
  AgentExecutionOptions,
} from '../types/agent.types';

/**
 * Base interface for all agents
 */
export interface Agent {
  /** Get agent metadata */
  getMetadata(): AgentMetadata;

  /** Execute agent analysis */
  execute(context: AgentContext, options?: AgentExecutionOptions): Promise<AgentResult>;

  /** Validate if agent can run with given context */
  canExecute(context: AgentContext): Promise<boolean>;

  /** Estimate token usage for this agent */
  estimateTokens(context: AgentContext): Promise<number>;
}
