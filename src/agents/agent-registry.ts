import { Agent } from './agent.interface';

/**
 * Agent registry for managing and executing agents
 */
export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();

  /**
   * Register an agent
   */
  public register(agent: Agent): void {
    const metadata = agent.getMetadata();

    if (this.agents.has(metadata.name)) {
      throw new Error(`Agent with name ${metadata.name} is already registered`);
    }

    this.agents.set(metadata.name, agent);
  }

  /**
   * Unregister an agent
   */
  public unregister(agentName: string): boolean {
    return this.agents.delete(agentName);
  }

  /**
   * Get agent by name
   */
  public getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  /**
   * Get all registered agents
   */
  public getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by priority
   */
  public getAgentsByPriority(): Agent[] {
    return this.getAllAgents().sort((a, b) => {
      const aPriority = a.getMetadata().priority;
      const bPriority = b.getMetadata().priority;
      return aPriority - bPriority;
    });
  }

  /**
   * Get agents that can run in parallel
   */
  public getParallelAgents(): Agent[] {
    return this.getAllAgents().filter((agent) => agent.getMetadata().capabilities.supportsParallel);
  }

  /**
   * Get agents for specific languages
   */
  public getAgentsForLanguages(languages: string[]): Agent[] {
    return this.getAllAgents().filter((agent) => {
      const supportedLangs = agent.getMetadata().capabilities.supportedLanguages;
      return supportedLangs.length === 0 || supportedLangs.some((lang) => languages.includes(lang));
    });
  }

  /**
   * Get agents with specific tags
   */
  public getAgentsByTags(tags: string[]): Agent[] {
    return this.getAllAgents().filter((agent) => {
      const agentTags = agent.getMetadata().tags;
      return tags.some((tag) => agentTags.includes(tag));
    });
  }

  /**
   * Check if an agent is registered
   */
  public hasAgent(name: string): boolean {
    return this.agents.has(name);
  }

  /**
   * Get agent count
   */
  public getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Clear all agents
   */
  public clear(): void {
    this.agents.clear();
  }

  /**
   * Resolve agent execution order based on dependencies
   */
  public resolveExecutionOrder(agentNames?: string[]): string[] {
    const agents = agentNames
      ? (agentNames.map((name) => this.getAgent(name)).filter(Boolean) as Agent[])
      : this.getAgentsByPriority();

    const resolved: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (agent: Agent) => {
      const metadata = agent.getMetadata();
      const name = metadata.name;

      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving agent: ${name}`);
      }

      visiting.add(name);

      // Visit dependencies first
      for (const depName of metadata.capabilities.dependencies) {
        const depAgent = this.getAgent(depName);
        if (depAgent) {
          visit(depAgent);
        }
      }

      visiting.delete(name);
      visited.add(name);
      resolved.push(name);
    };

    agents.forEach((agent) => visit(agent));
    return resolved;
  }
}
