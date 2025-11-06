import { Agent } from './agent.interface';
import { AgentContext, AgentMetadata, AgentPriority, AgentFile } from '../types/agent.types';
import { BaseAgentWorkflow, AgentWorkflowState } from './base-agent-workflow';
import { LLMJsonParser } from '../utils/json-parser';
import { getSupportedLanguages, getSchemaFiles } from '../config/language-config';
import { promises as fs } from 'fs';
import path from 'path';

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
 * Schema documentation result (FIELDS REMOVED FOR ARCHITECTURAL VIEW)
 */
export interface SchemaDocumentation {
  type: SchemaType;
  name: string;
  description: string;
  diagram: string; // Mermaid ER or class diagram
  entities: SchemaEntity[];
  relationships: SchemaRelationship[];
  insights: string[];
}

/**
 * Simplified entity: name, type, short description ONLY — no fields
 */
export interface SchemaEntity {
  name: string;
  type: string;
  description: string;
  // ⛔ fields property REMOVED
}

/**
 * Relationship between two entities
 */
export interface SchemaRelationship {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'uses' | 'extends';
  description: string;
}

/**
 * Agent that extracts high-level schema architecture (entities + relationships only)
 * Uses self-refinement workflow to iteratively improve schema documentation
 */
export class SchemaGeneratorAgent extends BaseAgentWorkflow implements Agent {
  public getMetadata(): AgentMetadata {
    return {
      name: 'schema-generator',
      version: '1.1.0',
      description:
        'Documents high-level schema architecture: entities and relationships only (no fields). Supports databases, APIs, GraphQL, and type definitions with Mermaid diagrams.',
      priority: AgentPriority.MEDIUM,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: true,
        dependencies: ['file-structure'],
        supportsIncremental: false,
        estimatedTokens: 2500,
        supportedLanguages: getSupportedLanguages(),
      },
      tags: ['schema', 'architecture', 'erd', 'mermaid', 'entities', 'relationships'],
      outputFilename: 'schemas.md',
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    const schemaFiles = getSchemaFiles(context.files);
    return schemaFiles.all.length > 0;
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    const schemaFiles = getSchemaFiles(context.files);
    return 2000 + Math.min(schemaFiles.all.length, 20) * 100;
  }

  // Abstract method implementations

  protected getAgentName(): string {
    return 'schema-generator';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are a senior system architect documenting only the **high-level schema architecture**.

### 🎯 GOAL
Extract **entities** and **relationships** — **NOT fields, attributes, or data details**.

### 📌 RULES
- List **entity/model names** only (e.g., User, Post, Organization)
- For each entity, provide:
  • \`name\`: exact name from code
  • \`type\`: "table", "type", "object", or "graphql-type"
  • \`description\`: 3–6 word summary (e.g., "Tenant organizations")
- **DO NOT include any fields** — no primary keys, foreign keys, or data attributes
- **DO NOT describe field types, constraints, or structure**
- Relationships must specify:
  • \`from\` and \`to\` entity names (exact match)
  • \`type\`: "one-to-one", "one-to-many", "many-to-many", "uses", or "extends"
  • \`description\`: 1–3 word role (e.g., "owns", "creates", "belongs to")

### 🖼 DIAGRAMS
- Use \`erDiagram\` for databases: show entities and cardinality
  Example: \`erDiagram\\\\n  Organization ||--o{ User : has\`
- Use \`classDiagram\` for types/interfaces: show inheritance or composition
- Keep diagrams minimal (5–12 entities)

### 📤 OUTPUT FORMAT (STRICT JSON)
{
  "summary": "One-sentence architecture overview",
  "schemas": [
    {
      "type": "database|api|graphql|type-definitions",
      "name": "Schema name",
      "description": "4–6 word summary",
      "diagram": "erDiagram\\\\n  A ||--o{ B : has",
      "entities": [
        {"name": "A", "type": "table", "description": "Core entity"},
        {"name": "B", "type": "table", "description": "Related entity"}
      ],
      "relationships": [
        {"from": "A", "to": "B", "type": "one-to-many", "description": "owns"}
      ],
      "insights": ["Notable pattern"]
    }
  ]
}

### ⛔ ABSOLUTE RESTRICTIONS
- **NO fields** anywhere in the output
- **NO markdown**, **NO code blocks**, **NO explanations**
- Start with \`{\` and end with \`}\`
- Keep entity descriptions under 6 words
- Total output: 800–2000 tokens max

If you include any field-level data, the output is invalid.`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const schemaDetection = getSchemaFiles(context.files);
    const fileCategories = this.categorizeSchemaFiles(schemaDetection.all);

    const schemaContents = await this.readSchemaContents(context, fileCategories, 8000);

    return `Extract high-level schema architecture from this project:

**Project**: ${context.projectPath}
**Languages**: ${context.languageHints.map((h) => h.language).join(', ')}

**Schema Files Found**:
- Prisma: ${fileCategories.prisma.length}
- GraphQL: ${fileCategories.graphql.length}
- DTOs: ${fileCategories.dtos.length}
- TypeORM: ${fileCategories.typeorm.length}
- Types: ${fileCategories.types.length}

${schemaContents}

**Instructions**:
- Identify top-level entities/models only
- Infer relationships between them
- **Do NOT extract or list any fields or attributes**
- Output ONLY valid JSON in the specified architecture-only format`;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    const result = this.parseAnalysisResult(analysis);
    const schemas = result.schemas as SchemaDocumentation[] | undefined;
    if (!schemas || schemas.length === 0) {
      this.logger.info('No schemas found - will stop after this iteration', '⏹️');
      result.__FORCE_STOP__ = true;
    }
    return result;
  }

  protected async formatMarkdown(
    data: Record<string, unknown>,
    _state: { context: unknown },
  ): Promise<string> {
    return this.formatMarkdownReport(data);
  }

  protected generateSummary(data: Record<string, unknown>): string {
    const summary = data.summary as string | undefined;
    return summary || 'Schema architecture documentation completed';
  }

  protected getTargetTokenRanges(): Record<
    'quick' | 'normal' | 'deep' | 'exhaustive',
    { min: number; max: number }
  > {
    return {
      quick: { min: 400, max: 800 },
      normal: { min: 800, max: 1500 },
      deep: { min: 1500, max: 2200 },
      exhaustive: { min: 2200, max: 2800 },
    };
  }

  protected getDepthSpecificGuidance(mode: 'quick' | 'normal' | 'deep' | 'exhaustive'): string {
    const guidance = {
      quick: '- Top 5 entities only\n- Core relationships\n- No minor types',
      normal: '- Main entities (5–10)\n- Clear relationships\n- Short descriptions',
      deep: '- All major entities\n- Cross-type relationships\n- Meaningful insights',
      exhaustive: '- Complete entity list\n- All inferred relationships\n- Multi-schema links',
    };
    return guidance[mode];
  }

  protected override getMaxOutputTokens(isQuickMode: boolean, _context: AgentContext): number {
    // Architecture-only output is much smaller than field-based, but still needs room for:
    // - Multiple schema types (database, GraphQL, API, types)
    // - Entity lists (can be 50+ entities in large projects)
    // - Relationships and Mermaid diagrams
    // Using default limits to avoid truncation
    return isQuickMode ? 8000 : 16000;
  }

  // Removed: identifySchemaFiles - now using getSchemaFiles() from language-config

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

  private async readSchemaContents(
    context: AgentContext,
    fileCategories: ReturnType<typeof this.categorizeSchemaFiles>,
    maxTokensPerCategory: number,
  ): Promise<string> {
    let content = '';

    // Priority order: Prisma > GraphQL > DTOs > TypeORM > Types
    const priorityCategories = [
      { name: 'Prisma', files: fileCategories.prisma, limit: 2 },
      { name: 'GraphQL', files: fileCategories.graphql, limit: 3 },
      { name: 'DTOs', files: fileCategories.dtos, limit: 5 },
      { name: 'TypeORM', files: fileCategories.typeorm, limit: 3 },
      { name: 'OpenAPI', files: fileCategories.openapi, limit: 2 },
    ];

    for (const category of priorityCategories) {
      if (category.files.length === 0) continue;

      content += `\n**${category.name} Schema Files (${category.files.length} found)**:\n`;

      const filesToRead = category.files.slice(0, category.limit);
      for (const file of filesToRead) {
        try {
          // Files in context.files are already absolute paths, don't join with projectPath
          const filePath = file;

          // Check if file exists before reading
          try {
            await fs.access(filePath);
          } catch {
            this.logger.warn(`Schema file does not exist: ${filePath}`, {
              originalPath: file,
              projectPath: context.projectPath,
            });
            content += `\n\`${file}\`: (File not found at: ${filePath})\n`;
            continue;
          }

          const fileContent = await fs.readFile(filePath, 'utf-8');

          // Truncate to stay within token budget (~4 chars per token)
          const maxChars = maxTokensPerCategory * 4;
          const truncated =
            fileContent.length > maxChars
              ? fileContent.slice(0, maxChars) + '\n... (truncated)'
              : fileContent;

          // Use relative path for display
          const relativePath = path.relative(context.projectPath, filePath);
          content += `\n\`${relativePath}\`:\n\`\`\`\n${truncated}\n\`\`\`\n`;
        } catch (error) {
          const relativePath = path.relative(context.projectPath, file);
          this.logger.warn(`Failed to read schema file: ${relativePath}`, {
            error: error instanceof Error ? error.message : String(error),
            path: file,
          });
          content += `\n\`${relativePath}\`: (Unable to read file - ${error instanceof Error ? error.message : 'unknown error'})\n`;
        }
      }

      if (category.files.length > category.limit) {
        content += `... and ${category.files.length - category.limit} more ${category.name} files\n`;
      }
    }

    return content || '\n**No schema file contents available**\n';
  }

  private parseAnalysisResult(result: string): Record<string, unknown> {
    try {
      return LLMJsonParser.parse(result, {
        contextName: 'schema-generator',
        logErrors: false,
      });
    } catch (firstError) {
      this.logger.debug('Initial JSON parse failed', { error: String(firstError) });

      if (result.length > 100000) {
        const extracted = this.extractPartialJson(result);
        if (extracted) {
          try {
            return LLMJsonParser.parse(extracted, {
              contextName: 'schema-generator',
              logErrors: false,
            });
          } catch {
            // Continue to fallback
          }
        }
      }

      this.logger.warn('All JSON parsing failed, using fallback', {
        responsePreview: result.substring(0, 500),
      });

      return {
        schemas: [],
        summary: 'No schema architecture detected.',
        warnings: ['Could not parse LLM response as valid JSON.'],
      };
    }
  }

  private extractPartialJson(text: string): string | null {
    const startIdx = text.indexOf('{');
    if (startIdx === -1) return null;

    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = startIdx; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          return text.substring(startIdx, i + 1);
        }
      }
    }

    return null;
  }

  private formatMarkdownReport(analysis: Record<string, unknown>): string {
    const summary = analysis.summary as string | undefined;
    const schemas = analysis.schemas as SchemaDocumentation[] | undefined;
    const warnings = analysis.warnings as string[] | undefined;

    let markdown = `# Schema Architecture Documentation\n\n`;
    markdown += `${summary || 'High-level schema architecture extracted.'}\n\n`;

    if (schemas && schemas.length > 0) {
      markdown += `## Extracted Architectures\n\n`;

      for (const schema of schemas) {
        markdown += `### ${schema.name}\n\n`;
        markdown += `**Type**: ${schema.type}\n\n`;
        markdown += `${schema.description}\n\n`;

        markdown += `#### Architecture Diagram\n\n`;
        markdown += `> 💡 **Tip**: Render this with a Mermaid viewer (VS Code, GitHub, [mermaid.live](https://mermaid.live))\n\n`;
        markdown += `<details>\n<summary>📊 View ${schema.type} diagram</summary>\n\n`;
        markdown += `\`\`\`mermaid\n${schema.diagram}\n\`\`\`\n\n`;
        markdown += `</details>\n\n`;

        if (schema.entities && schema.entities.length > 0) {
          markdown += `#### Entities\n\n`;
          markdown += `| Entity | Type | Description |\n`;
          markdown += `|--------|------|-------------|\n`;
          schema.entities.forEach((entity) => {
            markdown += `| **${entity.name}** | \`${entity.type}\` | ${entity.description} |\n`;
          });
          markdown += `\n`;
        }

        if (schema.relationships && schema.relationships.length > 0) {
          markdown += `#### Relationships\n\n`;
          markdown += `| From | To | Type | Description |\n`;
          markdown += `|------|----|------|-------------|\n`;
          schema.relationships.forEach((rel) => {
            markdown += `| ${rel.from} | ${rel.to} | ${rel.type} | ${rel.description} |\n`;
          });
          markdown += `\n`;
        }

        if (schema.insights && schema.insights.length > 0) {
          markdown += `#### Key Insights\n\n`;
          schema.insights.forEach((insight) => {
            markdown += `- ${insight}\n`;
          });
          markdown += `\n`;
        }
      }
    } else {
      markdown += `_No schema architecture identified._\n\n`;
    }

    if (warnings && warnings.length > 0) {
      markdown += `## Warnings\n\n`;
      warnings.forEach((warning) => {
        markdown += `- ⚠️ ${warning}\n`;
      });
      markdown += `\n`;
    }

    return markdown;
  }

  protected async generateFiles(
    data: Record<string, unknown>,
    state: typeof AgentWorkflowState.State,
  ): Promise<AgentFile[]> {
    const markdown = await this.formatMarkdown(data, state);
    const metadata = this.getMetadata();

    return [
      {
        filename: 'schemas.md',
        content: markdown,
        title: 'Schema Architecture Documentation',
        category: 'documentation',
        order: metadata.priority,
      },
    ];
  }
}
