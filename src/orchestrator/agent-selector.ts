import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import { AgentMetadata } from '../types/agent.types';
import { LLMService } from '../llm/llm-service';

/**
 * Logger utility for AgentSelector
 */
class SelectorLogger {
  constructor(private context: string) {}

  debug(message: string): void {
    console.log(`[${this.context}] ${message}`);
  }

  error(message: string): void {
    console.error(`[${this.context}] ERROR: ${message}`);
  }

  warn(message: string): void {
    console.warn(`[${this.context}] WARNING: ${message}`);
  }
}

/**
 * AgentSelector analyzes natural language prompts to intelligently select
 * which agents should execute based on user intent.
 *
 * @example
 * // "analyze dependencies and security"
 * selector.selectAgents(prompt, registry) // → ['dependency-analyzer', 'pattern-detector']
 *
 * // "show me the file structure only"
 * selector.selectAgents(prompt, registry) // → ['file-structure']
 *
 * // "I want flow diagrams and database schemas"
 * selector.selectAgents(prompt, registry) // → ['flow-visualization', 'schema-generator']
 */
export class AgentSelector {
  private readonly logger = new SelectorLogger('AgentSelector'); /**
   * Selects agents based on natural language prompt
   *
   * @param prompt Natural language instruction (e.g., "analyze security and dependencies")
   * @param availableAgents List of all registered agents with metadata
   * @returns Array of agent names to execute (empty = all agents)
   */
  async selectAgents(prompt: string, availableAgents: AgentMetadata[]): Promise<string[]> {
    try {
      this.logger.debug(`Analyzing prompt: "${prompt}"`);
      this.logger.debug(`Available agents: ${availableAgents.map((a) => a.name).join(', ')}`);

      // Build LLM chain for agent selection
      const chain = this.buildSelectionChain(availableAgents);

      // Execute selection
      const result = await chain.invoke({ prompt });

      // Parse agent names from LLM response
      const selectedAgents = this.parseAgentNames(result, availableAgents);

      this.logger.debug(`Selected agents: ${selectedAgents.join(', ')}`);

      return selectedAgents;
    } catch (error) {
      this.logger.error(
        `Agent selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Fallback: return all agents if selection fails
      return availableAgents.map((a) => a.name);
    }
  }

  /**
   * Builds LangChain runnable for agent selection using LLM
   */
  private buildSelectionChain(availableAgents: AgentMetadata[]) {
    const llmService = LLMService.getInstance();
    const model = llmService.getChatModel({
      temperature: 0.1, // Low temperature for deterministic selection
      maxTokens: 512,
    });

    return RunnableSequence.from([
      // Format input as messages
      RunnableLambda.from((input: { prompt: string }) => [
        this.buildSystemPrompt(availableAgents),
        new HumanMessage(
          `User prompt: "${input.prompt}"\n\n` +
            `Which agents should execute? Return ONLY the agent names as a comma-separated list, or "ALL" if the user wants comprehensive analysis.`,
        ),
      ]).withConfig({ runName: 'AgentSelection-FormatPrompt' }),

      // LLM analysis
      model.withConfig({ runName: 'AgentSelection-LLMAnalysis' }),

      // Parse string output
      new StringOutputParser().withConfig({ runName: 'AgentSelection-ParseOutput' }),
    ]).withConfig({
      runName: 'AgentSelection',
    });
  }

  /**
   * Builds system prompt that describes available agents and selection rules
   */
  private buildSystemPrompt(availableAgents: AgentMetadata[]): SystemMessage {
    const agentDescriptions = availableAgents
      .map((agent) => {
        // Handle capabilities - it's an object with properties, not an array
        const capabilitiesText = [
          agent.capabilities.supportsParallel ? 'Parallel execution' : '',
          agent.capabilities.requiresFileContents ? 'Reads file contents' : '',
          agent.capabilities.supportedLanguages.length > 0
            ? `Languages: ${agent.capabilities.supportedLanguages.join(', ')}`
            : 'All languages',
        ]
          .filter(Boolean)
          .join(', ');

        const tags = agent.tags?.join(', ') || 'No tags';
        return `- **${agent.name}**: ${agent.description}\n  Capabilities: ${capabilitiesText}\n  Tags: ${tags}`;
      })
      .join('\n\n');

    return new SystemMessage(
      `You are an expert agent selector for a documentation generation system.

## Your Task
Analyze the user's natural language prompt and select which agents should execute.

## Available Agents
${agentDescriptions}

## Selection Rules
1. **Analyze user intent**: What does the user want to know about the codebase?
2. **Match to capabilities**: Which agents provide that information?
3. **Be precise**: Only select agents that directly fulfill the request
4. **Default behavior**: If unclear or user wants "everything", return "ALL"

## Keywords Guide
- "dependencies", "imports", "packages" → dependency-analyzer
- "structure", "folders", "files", "organization" → file-structure
- "patterns", "design", "architecture", "best practices" → pattern-detector
- "flows", "process", "data flow", "sequence" → flow-visualization
- "schema", "database", "entities", "models", "API" → schema-generator
- "security", "vulnerabilities" → Include pattern-detector (checks for security patterns)
- "quality", "code quality", "maintainability" → Include pattern-detector
- "comprehensive", "full", "everything", "complete" → ALL

## Output Format
Return ONLY a comma-separated list of agent names (no explanations, no markdown):
- Example 1: dependency-analyzer,pattern-detector
- Example 2: file-structure
- Example 3: ALL

If the user's request matches multiple agents, include all relevant ones.
If the request is vague or asks for comprehensive analysis, return "ALL".`,
    );
  }

  /**
   * Parses LLM response to extract valid agent names
   *
   * @param llmResponse Raw LLM output (e.g., "dependency-analyzer, file-structure" or "ALL")
   * @param availableAgents List of valid agents to validate against
   * @returns Array of valid agent names (empty = all agents)
   */
  private parseAgentNames(llmResponse: string, availableAgents: AgentMetadata[]): string[] {
    const cleaned = llmResponse.trim().toLowerCase();

    // Check for "ALL" indicator
    if (cleaned === 'all' || cleaned.includes('all agents')) {
      this.logger.debug('LLM selected ALL agents');
      return []; // Empty array signals "run all agents" to orchestrator
    }

    // Extract comma-separated names
    const names = cleaned
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    // Validate against available agents
    const validAgentNames = availableAgents.map((a) => a.name.toLowerCase());
    const validatedNames = names.filter((name) => validAgentNames.includes(name));

    // If no valid matches, fallback to all agents
    if (validatedNames.length === 0) {
      this.logger.warn(`No valid agents found in LLM response: "${llmResponse}"`);
      this.logger.warn('Falling back to ALL agents');
      return [];
    }

    // Return original case names
    return validatedNames.map((name) => {
      const agent = availableAgents.find((a) => a.name.toLowerCase() === name);
      return agent!.name;
    });
  }

  /**
   * Validates if a prompt requires agent selection or should run all
   *
   * @param prompt User input string
   * @returns true if prompt specifies particular aspects, false if generic
   */
  static shouldUseSelection(prompt: string): boolean {
    const genericKeywords = [
      'everything',
      'all',
      'complete',
      'full analysis',
      'comprehensive',
      'entire',
      'whole',
      'document',
      'generate docs',
    ];

    const promptLower = prompt.toLowerCase();

    // If prompt is very short or contains generic keywords, don't use selection
    if (prompt.trim().length < 10) {
      return false;
    }

    if (genericKeywords.some((keyword) => promptLower.includes(keyword))) {
      return false;
    }

    // Otherwise, use selection for specific requests
    return true;
  }
}
