import { AgentRegistry } from '../agents/agent-registry';
import { FileSystemScanner } from '../scanners/file-system-scanner';
import { Logger } from '../utils/logger';
import { LLMService } from '../llm/llm-service';
import { AgentResult, AgentContext } from '../types/agent.types';
import { StateGraph, END, StateGraphArgs, MemorySaver } from '@langchain/langgraph';
import type { ScanResult } from '../types/scanner.types';

export interface OrchestratorOptions {
  maxTokens?: number;
  maxCostDollars?: number;
  parallel?: boolean;
  userPrompt?: string;
  [key: string]: any;
}

export interface C4ModelOutput {
  projectName: string;
  timestamp: Date;
  c4Model: {
    context: any;
    containers: any;
    components: any;
  };
  plantUMLModel: {
    context: string;
    containers: string;
    components: string;
  };
  scanResult: ScanResult;
  agentResults: Map<string, AgentResult>;
  metadata: {
    generationDuration: number;
    agentsExecuted: string[];
    totalFiles: number;
    totalDirectories: number;
    languages: string[];
  };
}

// Define the state for the C4 model generation workflow
const C4ModelState: StateGraphArgs<any>['channels'] = {
  projectPath: {
    value: (_: string, y: string) => y,
    default: () => '',
  },
  options: {
    value: (_: OrchestratorOptions, y: OrchestratorOptions) => y,
    default: () => ({}),
  },
  scanResult: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  agentResults: {
    value: (x: Map<string, AgentResult>, y: Map<string, AgentResult>) => {
      const newMap = new Map(x);
      for (const [key, value] of y.entries()) {
        newMap.set(key, value);
      }
      return newMap;
    },
    default: () => new Map(),
  },
  c4Model: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  plantUMLModel: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  c4Context: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  c4Containers: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  c4Components: {
    value: (_: any, y: any) => y,
    default: () => null,
  },
  currentAgentIndex: {
    value: (_: number, y: number) => y,
    default: () => 0,
  },
  agentNames: {
    value: (_: string[], y: string[]) => y,
    default: () => [],
  },
};

type C4State = {
  projectPath: string;
  options: OrchestratorOptions;
  scanResult: any;
  agentResults: Map<string, AgentResult>;
  c4Model: any;
  plantUMLModel: any;
  c4Context: any;
  c4Containers: any;
  c4Components: any;
  currentAgentIndex: number;
  agentNames: string[];
};

export class C4ModelOrchestrator {
  private logger = new Logger('C4ModelOrchestrator');
  private workflow: ReturnType<typeof this.buildWorkflow>;
  private checkpointer = new MemorySaver();
  private llmService = LLMService.getInstance();

  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly scanner: FileSystemScanner,
  ) {
    this.workflow = this.buildWorkflow();
  }

  /**
   * Strip markdown code blocks from LLM output before parsing JSON
   */
  private stripMarkdownCodeBlocks(text: string): string {
    const trimmed = text.trim();

    // Remove ```json\n...\n``` or ```\n...\n``` (handles multiline)
    const codeBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/;
    const match = trimmed.match(codeBlockRegex);
    if (match) {
      return match[1].trim();
    }

    // Also try to extract JSON if there's markdown before/after
    const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    return trimmed;
  }

  async generateC4Model(
    projectPath: string,
    options: OrchestratorOptions = {},
  ): Promise<C4ModelOutput> {
    this.logger.info('Starting C4 model generation...');

    // 1. Scan project
    const scanResult = await this.scanner.scan({
      rootPath: projectPath,
      maxFiles: 10000,
      maxFileSize: 1048576,
      respectGitignore: true,
      includeHidden: false,
      followSymlinks: false,
    });

    // 2. Get agents
    const agents = this.agentRegistry.getAllAgents();
    const agentNames = agents.map((a) => a.getMetadata().name);

    // 3. Initial state
    const initialState: C4State = {
      projectPath,
      options,
      scanResult,
      agentNames,
      agentResults: new Map(),
      c4Model: null,
      plantUMLModel: null,
      c4Context: null,
      c4Containers: null,
      c4Components: null,
      currentAgentIndex: 0,
    };

    // 4. Execute workflow
    const config = {
      configurable: {
        thread_id: `c4-gen-${Date.now()}`,
      },
      recursionLimit: 100,
    };

    let finalState: C4State = initialState;
    for await (const state of await this.workflow.stream(initialState, config)) {
      const nodeNames = Object.keys(state);
      if (nodeNames.length > 0) {
        const lastNodeName = nodeNames[nodeNames.length - 1];
        const nodeState = (state as any)[lastNodeName];
        // Merge node state into finalState
        finalState = { ...finalState, ...nodeState };
      }
    }

    this.logger.info('C4 model generation completed.');
    this.logger.debug(
      'Final state c4Model:',
      JSON.stringify({
        hasC4Model: !!finalState.c4Model,
        hasContext: !!finalState.c4Context,
        hasContainers: !!finalState.c4Containers,
        hasComponents: !!finalState.c4Components,
      }),
    );

    return {
      projectName: projectPath.split(/[/\\]/).pop() || 'Unknown Project',
      timestamp: new Date(),
      c4Model: finalState.c4Model || {
        context: finalState.c4Context,
        containers: finalState.c4Containers,
        components: finalState.c4Components,
      },
      plantUMLModel: {
        context: finalState.plantUMLModel?.context || '',
        containers: finalState.plantUMLModel?.containers || '',
        components: finalState.plantUMLModel?.components || '',
      },
      scanResult,
      agentResults: finalState.agentResults || new Map(),
      metadata: {
        generationDuration: Date.now() - Date.now(),
        agentsExecuted: Array.from((finalState.agentResults || new Map()).keys()),
        totalFiles: scanResult.totalFiles,
        totalDirectories: scanResult.totalDirectories,
        languages: scanResult.languages.map((l) => l.language),
      },
    };
  }

  private buildWorkflow() {
    const graph = new StateGraph({
      channels: C4ModelState,
    });

    /**
     * C4 Model Generation Workflow (Iterative, Agent-on-Demand)
     *
     * The workflow follows the C4 model hierarchy and queries agents as needed:
     * 1. Context (Level 1) → System boundary, actors, external systems
     * 2. Containers (Level 2) → Deployable units, technology stack
     * 3. Components (Level 3) → Internal modules, responsibilities
     * 4. Aggregate & Generate → Combine results and create PlantUML
     *
     * Agents can be called multiple times with specific questions.
     */
    graph.addNode('generateC4Context', this.generateC4Context.bind(this));
    graph.addNode('generateC4Containers', this.generateC4Containers.bind(this));
    graph.addNode('generateC4Components', this.generateC4Components.bind(this));
    graph.addNode('aggregateC4Model', this.aggregateC4Model.bind(this));
    graph.addNode('generatePlantUML', this.generatePlantUML.bind(this));

    // Start with Context (Level 1)
    graph.setEntryPoint('generateC4Context' as '__start__');

    // Flow: Context → Containers → Components → Aggregate → PlantUML
    graph.addEdge('generateC4Context' as '__start__', 'generateC4Containers' as '__start__');
    graph.addEdge('generateC4Containers' as '__start__', 'generateC4Components' as '__start__');
    graph.addEdge('generateC4Components' as '__start__', 'aggregateC4Model' as '__start__');
    graph.addEdge('aggregateC4Model' as '__start__', 'generatePlantUML' as '__start__');
    graph.addEdge('generatePlantUML' as '__start__', END);

    return graph.compile({ checkpointer: this.checkpointer });
  }

  /**
   * Helper: Query specific agents on-demand with targeted questions
   * This allows the orchestrator to call agents multiple times with different contexts
   */
  private async queryAgents(
    state: C4State,
    agentNames: string[],
    purpose: string,
  ): Promise<Map<string, AgentResult>> {
    this.logger.info(`Querying agents for ${purpose}: ${agentNames.join(', ')}`);

    const results = new Map<string, AgentResult>();
    const { scanResult, projectPath, agentResults } = state;

    for (const agentName of agentNames) {
      // Skip if already queried (unless we want to re-query)
      if (agentResults.has(agentName)) {
        this.logger.debug(`Using cached result for ${agentName}`);
        results.set(agentName, agentResults.get(agentName)!);
        continue;
      }

      const agent = this.agentRegistry.getAgent(agentName);
      if (!agent) {
        this.logger.warn(`Agent ${agentName} not found, skipping`);
        continue;
      }

      this.logger.info(`Executing ${agentName} for ${purpose}...`);

      const context: AgentContext = {
        executionId: `c4-${purpose}-${agentName}-${Date.now()}`,
        projectPath,
        files: scanResult.files.map((f: any) => f.path),
        fileContents: new Map(),
        projectMetadata: { c4Purpose: purpose },
        previousResults: agentResults,
        config: {},
        languageHints: scanResult.languages.map((lang: any) => ({
          language: lang.language,
          confidence: lang.percentage / 100,
          indicators: [lang.language],
          coverage: lang.percentage,
        })),
        tokenBudget: 100000,
        scanResult,
      };

      const result = await agent.execute(context);
      results.set(agentName, result);
    }

    return results;
  }

  private async generateC4Context(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('📊 Generating C4 Context (Level 1: System Boundary)...');

    /**
     * C4 Context Requirements:
     * - System name and description (what the system does)
     * - Actors (users, personas, external entities that interact with the system)
     * - External Systems (databases, APIs, third-party services the system depends on)
     * - Relationships (how actors and external systems interact with the main system)
     *
     * Agents needed:
     * - architecture-analyzer: Understand overall system purpose and boundaries
     * - file-structure: Identify project structure and boundaries
     */
    const contextAgents = await this.queryAgents(
      state,
      ['architecture-analyzer', 'file-structure'],
      'C4 Context',
    );

    // Update state with agent results
    const updatedAgentResults = new Map(state.agentResults);
    contextAgents.forEach((result, name) => updatedAgentResults.set(name, result));

    const model = this.llmService.getChatModel({ temperature: 0.2, maxTokens: 16384 });

    // Get FULL analysis (not truncated summaries) and actual file samples
    const architectureResult = contextAgents.get('architecture-analyzer');
    const structureResult = contextAgents.get('file-structure');

    // Extract actual insights from markdown content
    const architectureAnalysis = this.extractAnalysisInsights(
      architectureResult?.markdown || '',
      5000,
    );
    const structureAnalysis = this.extractAnalysisInsights(structureResult?.markdown || '', 3000);

    // Get sample file contents for context
    const sampleFiles = this.getSampleFileContents(state, 10);

    const prompt = `
You are generating a C4 Model **Context Diagram (Level 1)** for a software system.

**Purpose**: Show the system as a black box, focusing on:
- The main software system (name and high-level purpose)
- Actors (users, personas, roles) who interact with it
- External systems (databases, APIs, third-party services) it depends on
- Relationships between actors, external systems, and the main system

**IMPORTANT**: Base your analysis on the ACTUAL codebase insights below. Do NOT invent generic examples.

**Architecture Analysis:**
${architectureAnalysis}

**Project Structure:**
${structureAnalysis}

**Sample Files:**
${sampleFiles}

**Instructions:**
1. Identify the ACTUAL system name from package.json, README, or code structure
2. List REAL actors based on API endpoints, authentication, user roles in code
3. List ACTUAL external systems from imports, API calls, database connections
4. Define SPECIFIC relationships based on actual code patterns

**JSON Output Format:**
{
  "system": {
    "name": "Actual System Name (from code)",
    "description": "What the system actually does (from README/code)"
  },
  "actors": [
    {
      "name": "Actual Actor Role (from code)",
      "description": "What this actor actually does in the system"
    }
  ],
  "externalSystems": [
    {
      "name": "Actual External System (from imports/config)",
      "description": "How this external system is actually used"
    }
  ],
  "relationships": [
    {
      "source": "Actor/System Name",
      "destination": "System Name",
      "description": "Actual interaction pattern (from code)"
    }
  ]
}

Return ONLY valid JSON, no markdown formatting.
`;
    const result = await model.invoke(prompt);
    let c4Context = null;

    this.logger.debug('=== C4 CONTEXT RAW OUTPUT ===');
    this.logger.debug(result.content.toString().substring(0, 500));
    this.logger.debug('=== END RAW OUTPUT ===');

    try {
      const cleanedOutput = this.stripMarkdownCodeBlocks(result.content.toString());
      c4Context = JSON.parse(cleanedOutput);
      this.logger.info('✅ C4 Context parsed successfully');
    } catch (error) {
      this.logger.error('Failed to parse C4 Context JSON:', error);
      this.logger.error('Raw output length:', result.content.toString().length);
    }

    return { c4Context, agentResults: updatedAgentResults };
  }

  private async generateC4Containers(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('📦 Generating C4 Containers (Level 2: Deployable Units)...');

    /**
     * C4 Containers Requirements:
     * - Containers (deployable/executable units: web app, API, database, microservice, mobile app)
     * - Technology choices for each container (Node.js, React, PostgreSQL, etc.)
     * - Relationships between containers (HTTP, gRPC, JDBC, message queue, etc.)
     *
     * Agents needed:
     * - architecture-analyzer: System structure and technical choices (if not already queried)
     * - dependency-analyzer: External dependencies and technology stack
     */
    const containerAgents = await this.queryAgents(
      state,
      ['architecture-analyzer', 'dependency-analyzer'],
      'C4 Containers',
    );

    // Update state with agent results
    const updatedAgentResults = new Map(state.agentResults);
    containerAgents.forEach((result, name) => updatedAgentResults.set(name, result));

    const model = this.llmService.getChatModel({ temperature: 0.2, maxTokens: 16384 });

    // Get FULL analysis (not truncated summaries)
    const architectureResult = containerAgents.get('architecture-analyzer');
    const dependencyResult = containerAgents.get('dependency-analyzer');

    const architectureAnalysis = this.extractAnalysisInsights(
      architectureResult?.markdown || '',
      5000,
    );
    const dependencyAnalysis = this.extractAnalysisInsights(dependencyResult?.markdown || '', 4000);

    // Get sample files for technology stack identification
    const sampleFiles = this.getSampleFileContents(state, 8);

    const { c4Context } = state;

    const prompt = `
You are generating a C4 Model **Containers Diagram (Level 2)** for a software system.

**Purpose**: Break down the system into containers (deployable/executable units):
- Web applications, mobile apps, desktop apps
- APIs, microservices, serverless functions
- Databases (SQL, NoSQL, caches)
- Message brokers, event streams
- File systems, CDNs

For each container, specify:
- Name (clear, descriptive)
- Technology (programming language, framework, database type)
- Description (what it does, its responsibility)

Also define relationships between containers (HTTP REST, gRPC, JDBC, message queue, etc.)

**IMPORTANT**: Base your analysis on the ACTUAL codebase. Identify real containers from:
- package.json dependencies (Express = API, React = Web App, etc.)
- Dockerfile, docker-compose.yml (containerized services)
- Database connections in code (PostgreSQL, MongoDB, Redis)
- Import statements and service classes

**C4 Context (from Level 1):**
${c4Context ? JSON.stringify(c4Context, null, 2).substring(0, 1000) : 'Not available'}

**Architecture Analysis:**
${architectureAnalysis}

**Dependency & Technology Stack:**
${dependencyAnalysis}

**Sample Files:**
${sampleFiles}

**JSON Output Format:**
{
  "containers": [
    {
      "name": "Container Name",
      "technology": "e.g., Node.js, React, PostgreSQL",
      "description": "Container Description"
    }
  ],
  "relationships": [
    {
      "source": "Container/Actor Name",
      "destination": "Container Name",
      "description": "Interaction Description",
      "technology": "e.g., HTTPS, gRPC, JDBC"
    }
  ]
}
`;
    const result = await model.invoke(prompt);
    let c4Containers = null;
    try {
      const cleanedOutput = this.stripMarkdownCodeBlocks(result.content.toString());
      this.logger.debug('=== C4 CONTAINERS CLEANED OUTPUT ===');
      this.logger.debug(cleanedOutput);
      this.logger.debug('=== END CLEANED OUTPUT ===');

      c4Containers = JSON.parse(cleanedOutput);
      this.logger.info('✅ C4 Containers parsed successfully');
    } catch (error) {
      this.logger.error('Failed to parse C4 Containers JSON:', error);
      this.logger.error('Raw output length:', result.content.toString().length);
      this.logger.debug('=== C4 CONTAINERS RAW OUTPUT (first 1000 chars) ===');
      this.logger.debug(result.content.toString().substring(0, 1000));
      this.logger.debug('=== END RAW OUTPUT ===');
    }
    return { c4Containers, agentResults: updatedAgentResults };
  }

  private async generateC4Components(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('🧩 Generating C4 Components (Level 3: Internal Modules)...');

    /**
     * C4 Components Requirements:
     * - Components (modules, classes, services within a container)
     * - Component responsibilities (what each component does)
     * - Component relationships (dependencies, interactions)
     *
     * Agents needed:
     * - architecture-analyzer: Component structure (if not already queried)
     * - pattern-detector: Design patterns and module organization
     */
    const componentAgents = await this.queryAgents(
      state,
      ['architecture-analyzer', 'pattern-detector'],
      'C4 Components',
    );

    // Update state with agent results
    const updatedAgentResults = new Map(state.agentResults);
    componentAgents.forEach((result, name) => updatedAgentResults.set(name, result));

    const model = this.llmService.getChatModel({ temperature: 0.2, maxTokens: 16384 });

    // Get FULL analysis (not truncated summaries)
    const architectureResult = componentAgents.get('architecture-analyzer');
    const patternResult = componentAgents.get('pattern-detector');

    const architectureAnalysis = this.extractAnalysisInsights(
      architectureResult?.markdown || '',
      5000,
    );
    const patternAnalysis = this.extractAnalysisInsights(patternResult?.markdown || '', 4000);

    // Get sample files to identify actual components
    const sampleFiles = this.getSampleFileContents(state, 15);

    const { c4Containers } = state;

    const prompt = `
You are generating a C4 Model **Components Diagram (Level 3)** for a software system.

**Purpose**: Zoom into a container and show its internal building blocks (components):

**IMPORTANT**: Analyze the ACTUAL codebase structure. Identify real components from:
- Class names and module exports
- Service layer, controller layer, repository pattern
- Design patterns in code (Factory, Strategy, Observer, etc.)
- File/folder organization (src/services/, src/controllers/, src/models/)

**Architecture Analysis:**
${architectureAnalysis}

**Design Patterns & Modules:**
${patternAnalysis}

**Sample Files (Component Structure):**
${sampleFiles}
- Modules, packages, namespaces
- Services, controllers, repositories
- Classes, interfaces, utilities
- Internal relationships and dependencies

For each component, specify:
- Name (clear, descriptive)
- Description (responsibility, what it does)
- Type/role (e.g., Controller, Service, Repository, Utility)

Also define relationships between components (uses, depends on, calls, etc.)

**C4 Containers (from Level 2):**
${c4Containers ? JSON.stringify(c4Containers, null, 2).substring(0, 1000) : 'Not available'}

**JSON Output Format (Focus on ONE primary container):**
{
  "containerName": "Primary Container Name (from actual codebase)",
  "components": [
    {
      "name": "Actual Component Name (class/service/module)",
      "description": "What this component actually does"
    }
  ],
  "relationships": [
    {
      "source": "Component Name",
      "destination": "Component Name",
      "description": "How they interact (calls, uses, depends on)"
    }
  ]
}

**CRITICAL**: Return ONLY the JSON object above. No explanations, no markdown, no additional text.
If you cannot identify components, return:
{
  "containerName": "Main Application",
  "components": [],
  "relationships": []
}
`;
    const result = await model.invoke(prompt);
    let c4Components = null;

    this.logger.debug('=== C4 COMPONENTS RAW OUTPUT ===');
    this.logger.debug(result.content.toString());
    this.logger.debug('=== END RAW OUTPUT ===');

    try {
      let cleanedOutput = this.stripMarkdownCodeBlocks(result.content.toString());

      // Additional cleanup: Extract only the JSON object
      const jsonMatch = cleanedOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedOutput = jsonMatch[0];
      }

      this.logger.debug('=== C4 COMPONENTS CLEANED OUTPUT (first 500 chars) ===');
      this.logger.debug(cleanedOutput.substring(0, 500));
      this.logger.debug('=== END CLEANED OUTPUT ===');

      c4Components = JSON.parse(cleanedOutput);
      this.logger.info('✅ C4 Components parsed successfully');

      // Validate structure
      if (!c4Components.components || !Array.isArray(c4Components.components)) {
        this.logger.warn('Components array is missing or invalid, using empty array');
        c4Components.components = [];
      }
    } catch (error) {
      this.logger.error('Failed to parse C4 Components JSON:', error);
      this.logger.error('Raw output length:', result.content.toString().length);
      this.logger.debug('=== C4 COMPONENTS RAW OUTPUT (first 1000 chars) ===');
      this.logger.debug(result.content.toString().substring(0, 1000));
      this.logger.debug('=== END RAW OUTPUT ===');
      // Return empty structure instead of null
      c4Components = {
        containerName: 'Unknown',
        components: [],
        relationships: [],
      };
    }
    return { c4Components, agentResults: updatedAgentResults };
  }

  private async aggregateC4Model(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('🔗 Aggregating C4 model (all levels)...');
    const { c4Context, c4Containers, c4Components } = state;

    // Debug logging
    this.logger.debug('State keys:', Object.keys(state));
    this.logger.debug('c4Context type:', typeof c4Context);
    this.logger.debug('c4Containers type:', typeof c4Containers);
    this.logger.debug('c4Components type:', typeof c4Components);

    // Log summary of what was generated
    this.logger.info(
      `✅ C4 Context: ${c4Context ? '✓' : '✗'} (System boundary, actors, external systems)`,
    );
    this.logger.info(
      `✅ C4 Containers: ${c4Containers ? '✓' : '✗'} (Deployable units, technology)`,
    );
    this.logger.info(
      `✅ C4 Components: ${c4Components ? '✓' : '✗'} (Internal modules, responsibilities)`,
    );

    const c4Model = {
      context: c4Context,
      containers: c4Containers,
      components: c4Components,
    };

    this.logger.debug(
      'c4Model structure:',
      JSON.stringify({
        hasContext: !!c4Model.context,
        hasContainers: !!c4Model.containers,
        hasComponents: !!c4Model.components,
      }),
    );

    return { c4Model };
  }

  private async generatePlantUML(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('Generating PlantUML from C4 model...');
    const { c4Model } = state;

    if (!c4Model) {
      this.logger.warn('C4 model is not available, skipping PlantUML generation.');
      return { plantUMLModel: null };
    }

    this.logger.debug(
      'C4 Model structure:',
      JSON.stringify({
        hasContext: !!c4Model.context,
        hasContainers: !!c4Model.containers,
        hasComponents: !!c4Model.components,
      }),
    );

    try {
      this.logger.info('Generating Context PlantUML...');
      const contextPuml = this.generateContextPlantUML(c4Model.context);
      this.logger.info(`✅ Context PlantUML generated (${contextPuml.length} chars)`);

      this.logger.info('Generating Containers PlantUML...');
      const containersPuml = this.generateContainersPlantUML(c4Model.containers);
      this.logger.info(`✅ Containers PlantUML generated (${containersPuml.length} chars)`);

      this.logger.info('Generating Components PlantUML...');
      const componentsPuml = this.generateComponentsPlantUML(c4Model.components);
      this.logger.info(`✅ Components PlantUML generated (${componentsPuml.length} chars)`);

      const plantUMLModel = {
        context: contextPuml,
        containers: containersPuml,
        components: componentsPuml,
      };

      return { plantUMLModel };
    } catch (error) {
      this.logger.error('Error generating PlantUML:', error);
      throw error;
    }
  }

  /**
   * Sanitize a name for use as a PlantUML identifier
   * Removes spaces, parentheses, and other special characters
   */
  private sanitizePlantUMLId(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Extract meaningful insights from agent markdown output
   * Focuses on key sections and removes boilerplate
   */
  private extractAnalysisInsights(markdown: string, maxChars: number): string {
    if (!markdown) return 'No analysis available';

    // Remove markdown headers, but keep content
    let insights = markdown
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/^\s*[-*+]\s+/gm, '• ') // Normalize lists
      .trim();

    // Truncate to max length
    if (insights.length > maxChars) {
      insights = insights.substring(0, maxChars) + '...';
    }

    return insights;
  }

  /**
   * Get sample file contents for context
   * Prioritizes key files like package.json, README, config files
   */
  private getSampleFileContents(state: C4State, maxFiles: number): string {
    const { scanResult } = state;
    if (!scanResult?.files) return 'No files available';

    // Prioritize important files
    const priorityPatterns = [
      /package\.json$/,
      /README\.md$/i,
      /tsconfig\.json$/,
      /\.config\.(js|ts)$/,
      /index\.(ts|js)$/,
      /main\.(ts|js)$/,
      /app\.(ts|js)$/,
    ];

    const files = scanResult.files
      .filter((f: any) => f.path && f.content)
      .sort((a: any, b: any) => {
        const aScore = priorityPatterns.findIndex((p) => p.test(a.path));
        const bScore = priorityPatterns.findIndex((p) => p.test(b.path));
        if (aScore !== -1 && bScore === -1) return -1;
        if (aScore === -1 && bScore !== -1) return 1;
        return aScore - bScore;
      })
      .slice(0, maxFiles);

    return files
      .map((f: any) => {
        const content = f.content.length > 500 ? f.content.substring(0, 500) + '...' : f.content;
        return `\n--- ${f.path} ---\n${content}`;
      })
      .join('\n');
  }

  private generateContextPlantUML(context: any): string {
    if (!context) return '';
    let puml = '@startuml\n';
    puml += `!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml\n\n`;
    context.actors?.forEach((actor: any) => {
      if (actor?.name) {
        puml += `Person(${this.sanitizePlantUMLId(actor.name)}, "${actor.name}", "${actor.description || ''}")\n`;
      }
    });
    if (context.system?.name) {
      puml += `System(${this.sanitizePlantUMLId(context.system.name)}, "${context.system.name}", "${context.system.description || ''}")\n`;
    }
    context.externalSystems?.forEach((extSystem: any) => {
      if (extSystem?.name) {
        puml += `System_Ext(${this.sanitizePlantUMLId(extSystem.name)}, "${extSystem.name}", "${extSystem.description || ''}")\n`;
      }
    });
    context.relationships?.forEach((rel: any) => {
      if (rel?.source && rel?.destination) {
        puml += `Rel(${this.sanitizePlantUMLId(rel.source)}, ${this.sanitizePlantUMLId(rel.destination)}, "${rel.description || ''}")\n`;
      }
    });
    puml += '@enduml\n';
    return puml;
  }

  private generateContainersPlantUML(containers: any): string {
    if (!containers) return '';
    let puml = '@startuml\n';
    puml += `!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml\n\n`;
    containers.containers?.forEach((container: any) => {
      if (container?.name) {
        puml += `Container(${this.sanitizePlantUMLId(container.name)}, "${container.name}", "${container.technology || ''}", "${container.description || ''}")\n`;
      }
    });
    containers.relationships?.forEach((rel: any) => {
      if (rel?.source && rel?.destination) {
        puml += `Rel(${this.sanitizePlantUMLId(rel.source)}, ${this.sanitizePlantUMLId(rel.destination)}, "${rel.description || ''}", "${rel.technology || ''}")\n`;
      }
    });
    puml += '@enduml\n';
    return puml;
  }

  private generateComponentsPlantUML(components: any): string {
    if (!components) return '';
    let puml = '@startuml\n';
    puml += `!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml\n\n`;
    if (components.containerName) {
      puml += `Container_Boundary(${this.sanitizePlantUMLId(components.containerName)}, "${components.containerName}") {\n`;
      components.components?.forEach((component: any) => {
        if (component?.name) {
          puml += `  Component(${this.sanitizePlantUMLId(component.name)}, "${component.name}", "${component.description || ''}")\n`;
        }
      });
      puml += '}\n';
    }
    components.relationships?.forEach((rel: any) => {
      if (rel?.source && rel?.destination) {
        puml += `Rel(${this.sanitizePlantUMLId(rel.source)}, ${this.sanitizePlantUMLId(rel.destination)}, "${rel.description || ''}")\n`;
      }
    });
    puml += '@enduml\n';
    return puml;
  }
}
