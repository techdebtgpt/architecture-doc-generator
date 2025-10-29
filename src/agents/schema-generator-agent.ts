import { Agent } from './agent.interface';
import {
  AgentContext,
  AgentResult,
  AgentMetadata,
  AgentPriority,
  AgentExecutionOptions,
} from '../types/agent.types';
import { BaseAgentWorkflow } from './base-agent-workflow';

/**
 * Schema types that can be extracted
 */
export enum SchemaType {
  DATABASE = 'database',
  API = 'api',
  GRAPHQL = 'graphql',
  TYPE_DEFINITIONS = 'type-definitions',
}

/**
 * Schema documentation result
 */
export interface SchemaDocumentation {
  type: SchemaType;
  name: string;
  description: string;
  diagram: string; // Mermaid ER diagram or class diagram
  entities: SchemaEntity[];
  relationships: SchemaRelationship[];
  insights: string[];
}

export interface SchemaEntity {
  name: string;
  type: string;
  description: string;
  fields: SchemaField[];
}

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface SchemaRelationship {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'uses' | 'extends';
  description: string;
}

/**
 * Agent that extracts and documents database schemas, API schemas, and type definitions
 * Uses self-refinement workflow to iteratively improve schema documentation
 */
export class SchemaGeneratorAgent extends BaseAgentWorkflow implements Agent {
  public getMetadata(): AgentMetadata {
    return {
      name: 'schema-generator',
      version: '1.0.0',
      description:
        'Extracts and documents database schemas (Prisma, TypeORM), API schemas (DTOs, OpenAPI), GraphQL schemas, and TypeScript type definitions with ER and class diagrams',
      priority: AgentPriority.MEDIUM,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: true,
        dependencies: ['file-structure'],
        supportsIncremental: false,
        estimatedTokens: 10000,
        supportedLanguages: ['typescript', 'javascript', 'prisma', 'graphql'],
      },
      tags: ['schema', 'database', 'api', 'types', 'erd', 'mermaid'],
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    // Check if there are schema-related files
    const schemaFiles = context.files.filter(
      (f) =>
        f.includes('schema') ||
        f.includes('entity') ||
        f.includes('dto') ||
        f.includes('types') ||
        f.includes('model') ||
        f.endsWith('.prisma') ||
        f.endsWith('.graphql') ||
        f.endsWith('.gql'),
    );
    return schemaFiles.length > 0;
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    const schemaFiles = context.files.filter(
      (f) =>
        f.includes('schema') ||
        f.includes('entity') ||
        f.includes('dto') ||
        f.includes('types') ||
        f.includes('model'),
    );

    // Base cost + per schema analysis
    return 4000 + Math.min(schemaFiles.length, 30) * 300;
  }

  public async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    // Configure adaptive refinement workflow
    // Agent will refine until clarity score >= 85 (high bar for quality)
    // Not hardcoded iterations - agent self-determines completion
    const workflowConfig = {
      maxIterations: 10, // High limit - agent decides when satisfied
      clarityThreshold: 85, // High bar ensures comprehensive schema documentation
      minImprovement: 3, // Accept small incremental improvements
      enableSelfQuestioning: true,
      maxQuestionsPerIteration: 2, // Focused, specific questions
    };

    return this.executeWorkflow(
      context,
      workflowConfig,
      options?.runnableConfig as Record<string, unknown> | undefined,
    );
  }

  // Abstract method implementations

  protected getAgentName(): string {
    return 'schema-generator';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert database architect and API designer specializing in schema documentation.

Analyze the provided codebase and extract **schema information** for:

1. **Database Schemas**: Prisma, TypeORM, Sequelize, SQL DDL
2. **API Schemas**: DTOs, OpenAPI/Swagger definitions, REST interfaces
3. **GraphQL Schemas**: Type definitions, queries, mutations
4. **Type Definitions**: TypeScript interfaces, classes, enums

**Output Format (JSON)**:
\`\`\`json
{
  "summary": "Brief overview of schemas found",
  "schemas": [
    {
      "type": "database|api|graphql|type-definitions",
      "name": "Schema Name",
      "description": "What this schema represents",
      "diagram": "erDiagram\\n  ENTITY1 ||--o{ ENTITY2 : has",
      "entities": [
        {
          "name": "EntityName",
          "type": "table|model|type|class",
          "description": "Entity purpose",
          "fields": [
            {
              "name": "fieldName",
              "type": "string",
              "required": true,
              "description": "Field purpose"
            }
          ]
        }
      ],
      "relationships": [
        {
          "from": "Entity1",
          "to": "Entity2",
          "type": "one-to-one|one-to-many|many-to-many",
          "description": "Relationship meaning"
        }
      ],
      "insights": ["Key insight 1", "Key insight 2"]
    }
  ],
  "warnings": ["Any limitations or notes"]
}
\`\`\`

**Mermaid Syntax for Diagrams**:
- Use \`erDiagram\` for database schemas
- Use \`classDiagram\` for type definitions
- Include cardinality (||--o{, }o--||, etc.)

Provide **comprehensive schema documentation** with valid Mermaid syntax.`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const schemaFiles = this.identifySchemaFiles(context.files);
    const fileCategories = this.categorizeSchemaFiles(schemaFiles);

    return `Extract schema information from this project:

**Project**: ${context.projectPath}
**Languages**: ${context.languageHints.map((h) => h.language).join(', ')}

**Schema Files Found**:
- Prisma: ${fileCategories.prisma.length}
- TypeORM: ${fileCategories.typeorm.length}
- DTOs: ${fileCategories.dtos.length}
- GraphQL: ${fileCategories.graphql.length}
- Types: ${fileCategories.types.length}

**Sample Files**:
${Object.entries(fileCategories)
  .filter(([, files]) => files.length > 0)
  .map(([category, files]) => `${category}: ${files.slice(0, 3).join(', ')}`)
  .join('\n')}

Extract and document all schema definitions with Mermaid diagrams.`;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    return this.parseAnalysisResult(analysis);
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: { context: unknown },
  ): Promise<string> {
    return this.formatMarkdownReport(data);
  }

  protected generateSummary(data: Record<string, unknown>): string {
    const summary = data.summary as string | undefined;
    return summary || 'Schema documentation completed';
  }

  private identifySchemaFiles(files: string[]): string[] {
    return files.filter((f) => {
      const lower = f.toLowerCase();
      return (
        f.endsWith('.prisma') ||
        f.endsWith('.graphql') ||
        f.endsWith('.gql') ||
        lower.includes('schema') ||
        lower.includes('entity.ts') ||
        lower.includes('entity.js') ||
        lower.includes('model.ts') ||
        lower.includes('model.js') ||
        lower.includes('dto.ts') ||
        lower.includes('dto.js') ||
        lower.includes('types.ts') ||
        lower.includes('types.js') ||
        lower.includes('interfaces.ts') ||
        f.endsWith('.d.ts')
      );
    });
  }

  private categorizeSchemaFiles(files: string[]): {
    prisma: string[];
    typeorm: string[];
    sequelize: string[];
    graphql: string[];
    dtos: string[];
    types: string[];
    openapi: string[];
  } {
    return {
      prisma: files.filter((f) => f.endsWith('.prisma')),
      typeorm: files.filter((f) => f.toLowerCase().includes('entity')),
      sequelize: files.filter((f) => f.toLowerCase().includes('model')),
      graphql: files.filter((f) => f.endsWith('.graphql') || f.endsWith('.gql')),
      dtos: files.filter((f) => f.toLowerCase().includes('dto')),
      types: files.filter((f) => f.toLowerCase().includes('types') || f.endsWith('.d.ts')),
      openapi: files.filter(
        (f) => f.toLowerCase().includes('swagger') || f.toLowerCase().includes('openapi'),
      ),
    };
  }

  private parseAnalysisResult(result: string): Record<string, unknown> {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to parse as direct JSON
      return JSON.parse(result);
    } catch (_error) {
      // Fallback: return a basic structure
      return {
        schemas: [],
        summary: 'Failed to parse schema analysis results',
        warnings: ['Could not parse LLM response as valid JSON'],
      };
    }
  }

  private formatMarkdownReport(analysis: Record<string, unknown>): string {
    // Type-safe accessors
    const summary = analysis.summary as string | undefined;
    const schemas = analysis.schemas as SchemaDocumentation[] | undefined;
    const warnings = analysis.warnings as string[] | undefined;

    let markdown = `# Schema Documentation\n\n`;
    markdown += `${summary || 'Schema documentation analysis completed'}\n\n`;

    if (schemas && schemas.length > 0) {
      markdown += `## Extracted Schemas\n\n`;

      for (const schema of schemas) {
        markdown += `### ${schema.name}\n\n`;
        markdown += `**Type**: ${schema.type}\n\n`;
        markdown += `${schema.description}\n\n`;

        markdown += `#### Diagram\n\n`;
        markdown += `\`\`\`mermaid\n${schema.diagram}\n\`\`\`\n\n`;

        if (schema.entities && schema.entities.length > 0) {
          markdown += `#### Entities\n\n`;
          markdown += `| Entity | Type | Fields |\n`;
          markdown += `|--------|------|--------|\n`;
          schema.entities.forEach((entity: SchemaEntity) => {
            const fieldCount = entity.fields ? entity.fields.length : 0;
            markdown += `| ${entity.name} | ${entity.type} | ${fieldCount} fields |\n`;
          });
          markdown += `\n`;
        }

        if (schema.relationships && schema.relationships.length > 0) {
          markdown += `#### Relationships\n\n`;
          markdown += `| From | To | Type | Description |\n`;
          markdown += `|------|-------|------|-------------|\n`;
          schema.relationships.forEach((rel: SchemaRelationship) => {
            markdown += `| ${rel.from} | ${rel.to} | ${rel.type} | ${rel.description} |\n`;
          });
          markdown += `\n`;
        }

        if (schema.insights && schema.insights.length > 0) {
          markdown += `#### Key Insights\n\n`;
          schema.insights.forEach((insight: string) => {
            markdown += `- ${insight}\n`;
          });
          markdown += `\n`;
        }
      }
    } else {
      markdown += `_No schemas identified in the codebase._\n\n`;
    }

    if (warnings && warnings.length > 0) {
      markdown += `## Warnings\n\n`;
      warnings.forEach((warning: string) => {
        markdown += `- ⚠️ ${warning}\n`;
      });
      markdown += `\n`;
    }

    return markdown;
  }
}
