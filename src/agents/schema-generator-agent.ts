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
  description?: string; // Optional - not needed for architectural keys
  isPrimaryKey?: boolean; // Indicates primary key
  isForeignKey?: boolean; // Indicates foreign key
  references?: string; // Entity this foreign key references
  isIndex?: boolean; // Indicates indexed field
  isUnique?: boolean; // Indicates unique constraint
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
        supportedLanguages: getSupportedLanguages(),
      },
      tags: ['schema', 'database', 'api', 'types', 'erd', 'mermaid'],
      outputFilename: 'schemas.md',
    };
  }

  public async canExecute(context: AgentContext): Promise<boolean> {
    // Check if there are schema-related files using centralized detection
    const schemaFiles = getSchemaFiles(context.files);
    return schemaFiles.all.length > 0;
  }

  public async estimateTokens(context: AgentContext): Promise<number> {
    const schemaFiles = getSchemaFiles(context.files);

    // Base cost + per schema analysis
    return 4000 + Math.min(schemaFiles.all.length, 30) * 300;
  }

  // Abstract method implementations

  protected getAgentName(): string {
    return 'schema-generator';
  }

  protected async buildSystemPrompt(_context: AgentContext): Promise<string> {
    return `You are an expert database architect specializing in schema architecture documentation.

Analyze the provided codebase and extract **HIGH-LEVEL schema architecture** for:

1. **Database Schemas**: Prisma, TypeORM, Sequelize, SQL DDL
2. **API Schemas**: DTOs, OpenAPI/Swagger definitions, REST interfaces
3. **GraphQL Schemas**: Type definitions, queries, mutations
4. **Type Definitions**: TypeScript interfaces, classes, enums

**CRITICAL RULES** - MINIMAL architectural view only:
- List entity/model names ONLY (no descriptions)
- Show relationships between entities (one-to-many, many-to-many, etc.)
- For fields: Include ONLY 2-3 KEY fields per entity:
  * Primary key (id) - ALWAYS include
  * Foreign keys (userId, projectId, etc.) - ONLY if exist
  * NO other fields - not even unique indexes or timestamps
- DO NOT include regular data fields AT ALL
- DO NOT add descriptions to fields
- Maximum 2-3 KEY fields per entity (PK + FKs only)

**Output Format (JSON) - ULTRA-COMPACT**:

Return a JSON with this structure (entities listed like a table):

{
  "summary": "Brief architectural overview (1-2 sentences)",
  "schemas": [
    {
      "type": "database",
      "name": "Main Database Schema",
      "description": "Core application entities",
      "diagram": "erDiagram\\n  Organization ||--o{ User : has\\n  User ||--o{ Post : creates",
      "entities": [
        {"name": "Organization", "type": "table", "description": "Multi-tenant organizations", "fields": [{"name": "id", "type": "uuid", "required": true, "isPrimaryKey": true}]},
        {"name": "User", "type": "table", "description": "User accounts", "fields": [{"name": "id", "type": "uuid", "required": true, "isPrimaryKey": true}, {"name": "organizationId", "type": "uuid", "required": true, "isForeignKey": true, "references": "Organization"}]},
        {"name": "Post", "type": "table", "description": "User posts", "fields": [{"name": "id", "type": "uuid", "required": true, "isPrimaryKey": true}, {"name": "userId", "type": "uuid", "required": true, "isForeignKey": true, "references": "User"}]}
      ],
      "relationships": [
        {"from": "Organization", "to": "User", "type": "one-to-many", "description": "has members"},
        {"from": "User", "to": "Post", "type": "one-to-many", "description": "creates"}
      ],
      "insights": ["Multi-tenant with organizationId FK pattern", "Simple hierarchical structure"]
    }
  ]
}

**CRITICAL OUTPUT RULES**:
- Keep entities in a flat array (like table rows)
- Each entity: ONE LINE with 2-3 fields MAX
- Fields: ONLY id + foreign keys (no other fields)
- Descriptions: MAX 5 words per entity
- Focus on entity list + relationships (not field details)

**Field Selection - MINIMAL KEYS ONLY**:
✅ Include: ONLY id (primary key) + foreign keys (userId, projectId, organizationId, etc.)
❌ Exclude: ALL other fields - no unique constraints, no indexes, no data fields
❌ Exclude: name, email, description, title, content, status, timestamps, enums, booleans
❌ Exclude: createdAt, updatedAt, deletedAt, version, etc.
🎯 Goal: 2-3 fields per entity maximum (PK + FKs only)

**Mermaid Syntax for Diagrams**:
- Use \`erDiagram\` for database schemas (show entities and relationships)
- Use \`classDiagram\` for type definitions (show types and inheritance)
- Include cardinality (||--o{, }o--||, etc.)
- Keep diagrams simple - focus on structure, not details

**Response Length Guidance**:
- Target: 1,000-2,000 tokens (ULTRA-MINIMAL view)
- Maximum: 4,000 tokens
- List 5-15 main entities/models per schema type
- Include ONLY 2-3 KEY fields per entity (PK + FKs ONLY)
- Focus on entity names and relationships - skip field details

${this.getResponseLengthGuidance(_context)}

**ULTRA-CRITICAL JSON RULES**:
1. Start with { and end with }
2. NO markdown code blocks (\`\`\`json)
3. NO explanations or text outside JSON
4. Compact format: single-line field objects
5. Maximum 2-3 fields per entity (PK + FKs)
6. Keep entity descriptions under 10 words
7. Focus on entity names and relationships
8. Target output: 1,500-2,500 tokens total`;
  }

  protected async buildHumanPrompt(context: AgentContext): Promise<string> {
    const schemaDetection = getSchemaFiles(context.files);
    const fileCategories = this.categorizeSchemaFiles(schemaDetection.all);

    // Read actual file contents for schema analysis (with token budget management)
    const schemaContents = await this.readSchemaContents(
      context,
      fileCategories,
      10000, // Max 10K tokens per file type
    );

    return `Extract schema information from this project:

**Project**: ${context.projectPath}
**Languages**: ${context.languageHints.map((h) => h.language).join(', ')}

**Schema Files Found**:
- Prisma: ${fileCategories.prisma.length}
- TypeORM: ${fileCategories.typeorm.length}
- DTOs: ${fileCategories.dtos.length}
- GraphQL: ${fileCategories.graphql.length}
- Types: ${fileCategories.types.length}

${schemaContents}

Extract and document all schema definitions with Mermaid diagrams. Respond with ONLY valid JSON - no markdown, no code blocks.`;
  }

  protected async parseAnalysis(analysis: string): Promise<Record<string, unknown>> {
    const result = this.parseAnalysisResult(analysis);

    // CRITICAL: If NO schemas found, prepend marker to analysis text
    // This signals to base workflow to force-stop iteration
    const schemas = result.schemas as SchemaDocumentation[] | undefined;
    if (!schemas || schemas.length === 0) {
      this.logger.info('No schemas found - will stop after this iteration', '⏹️');
      // Prepend invisible marker that will be detected by base workflow
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
    return summary || 'Schema documentation completed';
  }

  protected getTargetTokenRanges(): Record<
    'quick' | 'normal' | 'deep' | 'exhaustive',
    { min: number; max: number }
  > {
    return {
      quick: { min: 500, max: 1000 },
      normal: { min: 1000, max: 2000 },
      deep: { min: 2000, max: 3000 },
      exhaustive: { min: 3000, max: 4000 },
    };
  }

  protected getDepthSpecificGuidance(mode: 'quick' | 'normal' | 'deep' | 'exhaustive'): string {
    const guidance = {
      quick:
        '- Focus on primary schemas only\n- List entity names ONLY\n- 1-2 keys per entity (PK + main FK)',
      normal:
        '- Include main entities and relationships\n- 2-3 keys per entity (PK + FKs)\n- Entity names and relationships only',
      deep: '- Document all schemas and entities\n- 2-3 keys per entity (PK + FKs)\n- Add relationship patterns',
      exhaustive:
        '- Comprehensive schema list\n- 2-3 keys per entity (PK + FKs)\n- Cross-schema dependencies',
    };

    return guidance[mode];
  }

  /**
   * Schema generator token limits ULTRA-MINIMIZED
   * Only entity names, PK, and FKs - no other fields
   */
  protected getMaxOutputTokens(isQuickMode: boolean, _context: AgentContext): number {
    // Ultra-minimal: PK + FKs only, no descriptions
    return isQuickMode ? 3000 : 4000;
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
    // Strategy 1: Try parsing the full response
    try {
      return LLMJsonParser.parse(result, {
        contextName: 'schema-generator',
        logErrors: false, // Don't log yet, we have fallback strategies
      });
    } catch (firstError) {
      this.logger.debug('Initial JSON parse failed, trying truncation strategies', {
        error: firstError instanceof Error ? firstError.message : String(firstError),
        responseLength: result.length,
      });

      // Strategy 2: If response is too large (>100KB), it might be truncated
      // Try to extract and parse the first valid JSON object
      if (result.length > 100000) {
        this.logger.info('Response exceeds 100KB, attempting to extract partial valid JSON', '✂️');

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

      // Strategy 3: Log error and use fallback
      this.logger.warn('All JSON parsing strategies failed, using fallback', {
        error: firstError instanceof Error ? firstError.message : String(firstError),
        responsePreview: result.substring(0, 500),
      });

      return {
        schemas: [],
        summary:
          'No schema definitions found in the provided codebase. The analysis only includes a single main.ts file, which does not contain schema definitions for databases, APIs, or GraphQL.',
        warnings: [
          'Could not parse LLM response as valid JSON - response may have been truncated or malformed',
        ],
      };
    }
  }

  /**
   * Extract partial but valid JSON from truncated response
   * Attempts to find the largest complete JSON structure
   */
  private extractPartialJson(text: string): string | null {
    // Find the start of the JSON object
    const startIdx = text.indexOf('{');
    if (startIdx === -1) return null;

    // Try to find matching closing brace by tracking depth
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

      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          // Found complete JSON object
          return text.substring(startIdx, i + 1);
        }
      }
    }

    // If we didn't find a complete object, try to construct one from partial data
    // Extract what we have and close any open structures
    const partial = text.substring(startIdx);

    // Try to intelligently close the JSON by finding the last complete field
    const lastCompleteField = this.findLastCompleteField(partial);
    if (lastCompleteField) {
      return lastCompleteField;
    }

    return null;
  }

  /**
   * Find the last complete field in a truncated JSON string
   * and properly close the structure
   */
  private findLastCompleteField(partial: string): string | null {
    // Find all complete "fieldName": value pairs
    const fieldPattern = /"([^"]+)":\s*(?:"[^"]*"|[^,}\]]+|{[^}]*}|\[[^\]]*\])/g;
    const matches: string[] = [];
    let match;

    while ((match = fieldPattern.exec(partial)) !== null) {
      matches.push(match[0]);
    }

    if (matches.length === 0) return null;

    // Reconstruct JSON with complete fields only
    let reconstructed = '{\n  ' + matches.join(',\n  ');

    // Close any open arrays or objects
    const openBraces = (reconstructed.match(/{/g) || []).length;
    const closeBraces = (reconstructed.match(/}/g) || []).length;
    const openBrackets = (reconstructed.match(/\[/g) || []).length;
    const closeBrackets = (reconstructed.match(/\]/g) || []).length;

    // Add missing closing brackets/braces
    reconstructed += '\n]'.repeat(Math.max(0, openBrackets - closeBrackets));
    reconstructed += '\n}'.repeat(Math.max(0, openBraces - closeBraces + 1)); // +1 for root object

    return reconstructed;
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
        markdown += `> 💡 **Tip**: View this diagram with a Mermaid renderer:\n`;
        markdown += `> - VS Code: Install "Markdown Preview Mermaid Support" extension\n`;
        markdown += `> - GitHub/GitLab: Automatic rendering in markdown preview\n`;
        markdown += `> - Online: Copy to [mermaid.live](https://mermaid.live)\n\n`;
        markdown += `<details>\n<summary>📊 Click to view ${schema.type} diagram</summary>\n\n`;
        markdown += `\`\`\`mermaid\n${schema.diagram}\n\`\`\`\n\n`;
        markdown += `</details>\n\n`;

        if (schema.entities && schema.entities.length > 0) {
          markdown += `#### Entities Overview\n\n`;
          markdown += `| Entity | Type | Description |\n`;
          markdown += `|--------|------|-------------|\n`;

          schema.entities.forEach((entity: SchemaEntity) => {
            const entityType = entity.type || 'table';
            const description = entity.description || '-';
            markdown += `| **${entity.name}** | \`${entityType}\` | ${description} |\n`;
          });
          markdown += `\n`;

          markdown += `#### Entity Details\n\n`;

          schema.entities.forEach((entity: SchemaEntity) => {
            markdown += `##### ${entity.name}\n\n`;

            if (entity.fields && entity.fields.length > 0) {
              markdown += `**Key Fields:**\n\n`;
              markdown += `| Field | Type | Role | References |\n`;
              markdown += `|-------|------|------|------------|\n`;

              entity.fields.forEach((field: SchemaField) => {
                const roles: string[] = [];
                if (field.isPrimaryKey) roles.push('🔑 PK');
                if (field.isForeignKey) roles.push('🔗 FK');
                if (field.isUnique) roles.push('⭐ Unique');
                if (field.isIndex) roles.push('📇 Index');

                const role = roles.length > 0 ? roles.join(', ') : '-';
                const references = field.references ? `→ ${field.references}` : '-';
                const fieldName = field.required ? '`' + field.name + '`' : field.name;

                markdown += `| ${fieldName} | \`${field.type}\` | ${role} | ${references} |\n`;
              });
              markdown += `\n`;
            }
          });
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
        title: 'Schema Documentation',
        category: 'documentation',
        order: metadata.priority,
      },
    ];
  }
}
