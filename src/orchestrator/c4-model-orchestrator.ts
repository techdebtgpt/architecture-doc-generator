import { AgentRegistry } from '../agents/agent-registry';
import { FileSystemScanner } from '../scanners/file-system-scanner';
import { Logger } from '../utils/logger';
import { LLMService } from '../llm/llm-service';
import { AgentResult, AgentContext } from '../types/agent.types';
import { StateGraph, END, StateGraphArgs, MemorySaver } from '@langchain/langgraph';

export interface OrchestratorOptions {
  maxTokens?: number;
  maxCostDollars?: number;
  parallel?: boolean;
  userPrompt?: string;
  [key: string]: any;
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

  async generateC4Model(projectPath: string, options: OrchestratorOptions = {}): Promise<any> {
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
        finalState = (state as any)[lastNodeName] || finalState;
      }
    }

    this.logger.info('C4 model generation completed.');
    return {
      c4Model: finalState.c4Model,
      plantUMLModel: finalState.plantUMLModel,
    };
  }

  private buildWorkflow() {
    const graph = new StateGraph({
      channels: C4ModelState,
    });

    graph.addNode('executeAgent', this.executeAgentNode.bind(this));
    graph.addNode('generateC4Context', this.generateC4Context.bind(this));
    graph.addNode('generateC4Containers', this.generateC4Containers.bind(this));
    graph.addNode('generateC4Components', this.generateC4Components.bind(this));
    graph.addNode('aggregateC4Model', this.aggregateC4Model.bind(this));
    graph.addNode('generatePlantUML', this.generatePlantUML.bind(this));

    const entryPoint = 'executeAgent' as '__start__';
    graph.setEntryPoint(entryPoint);

    graph.addConditionalEdges(
      entryPoint,
      (state: C4State) => {
        if (state.currentAgentIndex < state.agentNames.length) {
          return 'continue';
        }
        return 'finished';
      },
      {
        continue: entryPoint,
        finished: 'generateC4Context' as '__start__',
      },
    );

    graph.addEdge('generateC4Context' as '__start__', 'generateC4Containers' as '__start__');
    graph.addEdge('generateC4Containers' as '__start__', 'generateC4Components' as '__start__');
    graph.addEdge('generateC4Components' as '__start__', 'aggregateC4Model' as '__start__');
    graph.addEdge('aggregateC4Model' as '__start__', 'generatePlantUML' as '__start__');
    graph.addEdge('generatePlantUML' as '__start__', END);

    return graph.compile({ checkpointer: this.checkpointer });
  }

  private async executeAgentNode(state: C4State): Promise<Partial<C4State>> {
    const { scanResult, projectPath, currentAgentIndex, agentNames, agentResults } = state;

    const agentName = agentNames[currentAgentIndex];
    this.logger.info(`Executing agent: ${agentName}`);
    const agent = this.agentRegistry.getAgent(agentName);

    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    const context: AgentContext = {
      executionId: `c4-${agentName}-${Date.now()}`,
      projectPath,
      files: scanResult.files.map((f: any) => f.path),
      fileContents: new Map(),
      projectMetadata: {},
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
    const newAgentResults = new Map(agentResults);
    newAgentResults.set(agentName, result);

    return {
      agentResults: newAgentResults,
      currentAgentIndex: currentAgentIndex + 1,
    };
  }

  private async generateC4Context(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('Generating C4 Context diagram...');
    const { agentResults } = state;
    const model = this.llmService.getChatModel({ temperature: 0.2 });

    const agentSummaries = Array.from(agentResults.values())
      .map((r) => `### ${r.agentName}\n${r.summary}`)
      .join('\n\n');

    const prompt = `
Based on the following analysis from multiple agents, generate a C4 Model 'Context' diagram description in JSON format.
Identify the main software system, the users/actors that interact with it, and other systems it depends on.

**Agent Summaries:**
${agentSummaries}

**JSON Output Format:**
{
  "system": {
    "name": "System Name",
    "description": "System Description"
  },
  "actors": [
    {
      "name": "Actor Name",
      "description": "Actor Description"
    }
  ],
  "externalSystems": [
    {
      "name": "External System Name",
      "description": "External System Description"
    }
  ],
  "relationships": [
    {
      "source": "Actor/System Name",
      "destination": "System Name",
      "description": "Interaction Description"
    }
  ]
}
`;
    const result = await model.invoke(prompt);
    let c4Context = null;
    try {
      c4Context = JSON.parse(result.content.toString());
    } catch (error) {
      this.logger.error('Failed to parse C4 Context JSON:', error);
    }

    return { c4Context };
  }

  private async generateC4Containers(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('Generating C4 Containers diagram...');
    const { agentResults, c4Context } = state;
    const model = this.llmService.getChatModel({ temperature: 0.2 });

    const agentSummaries = Array.from(agentResults.values())
      .map((r) => `### ${r.agentName}\n${r.summary}`)
      .join('\n\n');

    const prompt = `
Based on the C4 Context and agent summaries, generate a C4 'Containers' diagram description in JSON.
A container is a deployable unit like an API, a web app, a database, or a microservice.

**C4 Context:**
${JSON.stringify(c4Context, null, 2)}

**Agent Summaries:**
${agentSummaries}

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
      c4Containers = JSON.parse(result.content.toString());
    } catch (error) {
      this.logger.error('Failed to parse C4 Containers JSON:', error);
    }
    return { c4Containers };
  }

  private async generateC4Components(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('Generating C4 Components diagram...');
    const { agentResults, c4Containers } = state;
    const model = this.llmService.getChatModel({ temperature: 0.2 });

    const agentSummaries = Array.from(agentResults.values())
      .map((r) => `### ${r.agentName}\n${r.summary}`)
      .join('\n\n');

    const prompt = `
Based on the C4 Containers and agent summaries, generate a C4 'Components' diagram description in JSON for each container.
A component is a module or a group of related functions within a container.

**C4 Containers:**
${JSON.stringify(c4Containers, null, 2)}

**Agent Summaries:**
${agentSummaries}

**JSON Output Format (one entry per container):**
{
  "containerName": "Container Name",
  "components": [
    {
      "name": "Component Name",
      "description": "Component's responsibility"
    }
  ],
  "relationships": [
    {
      "source": "Component/Container/Actor Name",
      "destination": "Component Name",
      "description": "Interaction Description"
    }
  ]
}
`;
    const result = await model.invoke(prompt);
    let c4Components = null;
    try {
      c4Components = JSON.parse(result.content.toString());
    } catch (error) {
      this.logger.error('Failed to parse C4 Components JSON:', error);
    }
    return { c4Components };
  }

  private async aggregateC4Model(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('Aggregating C4 model...');
    const { c4Context, c4Containers, c4Components } = state;
    const c4Model = {
      context: c4Context,
      containers: c4Containers,
      components: c4Components,
    };
    return { c4Model };
  }

  private async generatePlantUML(state: C4State): Promise<Partial<C4State>> {
    this.logger.info('Generating PlantUML from C4 model...');
    const { c4Model } = state;

    if (!c4Model) {
      this.logger.warn('C4 model is not available, skipping PlantUML generation.');
      return { plantUMLModel: null };
    }

    const plantUMLModel = {
      context: this.generateContextPlantUML(c4Model.context),
      containers: this.generateContainersPlantUML(c4Model.containers),
      components: this.generateComponentsPlantUML(c4Model.components),
    };

    return { plantUMLModel };
  }

  private generateContextPlantUML(context: any): string {
    if (!context) return '';
    let puml = '@startuml\n';
    puml += `!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml\n\n`;
    context.actors?.forEach((actor: any) => {
      puml += `Person(${actor.name.replace(/\s/g, '')}, "${actor.name}", "${actor.description}")\n`;
    });
    puml += `System(${context.system.name.replace(/\s/g, '')}, "${context.system.name}", "${context.system.description}")\n`;
    context.externalSystems?.forEach((extSystem: any) => {
      puml += `System_Ext(${extSystem.name.replace(/\s/g, '')}, "${extSystem.name}", "${extSystem.description}")\n`;
    });
    context.relationships?.forEach((rel: any) => {
      puml += `Rel(${rel.source.replace(/\s/g, '')}, ${rel.destination.replace(/\s/g, '')}, "${rel.description}")\n`;
    });
    puml += '@enduml\n';
    return puml;
  }

  private generateContainersPlantUML(containers: any): string {
    if (!containers) return '';
    let puml = '@startuml\n';
    puml += `!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml\n\n`;
    containers.containers?.forEach((container: any) => {
      puml += `Container(${container.name.replace(/\s/g, '')}, "${container.name}", "${container.technology}", "${container.description}")\n`;
    });
    containers.relationships?.forEach((rel: any) => {
      puml += `Rel(${rel.source.replace(/\s/g, '')}, ${rel.destination.replace(/\s/g, '')}, "${rel.description}", "${rel.technology}")\n`;
    });
    puml += '@enduml\n';
    return puml;
  }

  private generateComponentsPlantUML(components: any): string {
    if (!components) return '';
    let puml = '@startuml\n';
    puml += `!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml\n\n`;
    puml += `Container_Boundary(${components.containerName.replace(/\s/g, '')}, "${components.containerName}") {\n`;
    components.components?.forEach((component: any) => {
      puml += `  Component(${component.name.replace(/\s/g, '')}, "${component.name}", "${component.description}")\n`;
    });
    puml += '}\n';
    components.relationships?.forEach((rel: any) => {
      puml += `Rel(${rel.source.replace(/\s/g, '')}, ${rel.destination.replace(/\s/g, '')}, "${rel.description}")\n`;
    });
    puml += '@enduml\n';
    return puml;
  }
}
