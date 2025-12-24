/**
 * Handler Factory
 * Creates tool handlers with common patterns to eliminate duplication
 * DRY principle applied to reduce 400+ lines of copy-paste code
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { ContextualToolHandler } from '../types';
import { DocumentationService } from '../services/documentation.service';
import { OutputFormatter } from '../utils/output-formatter';

/**
 * Create a selective agent handler
 * Eliminates 6 duplicate handlers: patterns, dependencies, recommendations, validation, etc.
 */
export function createSelectiveAgentHandler(
  selectiveAgents: string[],
  userPromptPrefix?: string,
): ContextualToolHandler {
  return async (args: any, context) => {
    try {
      const docService = new DocumentationService(context.config, context.projectPath);

      // Build user prompt if prefix provided
      let userPrompt = userPromptPrefix;
      if (args.focusArea) {
        userPrompt = userPromptPrefix
          ? `${userPromptPrefix} - Focus: ${args.focusArea}`
          : `Focus: ${args.focusArea}`;
      }

      const output = await docService.runSelectiveAgents({
        selectiveAgents,
        userPrompt,
      });

      const sectionKey = selectiveAgents[0];
      const section = output.customSections.get(sectionKey) as any;

      if (!section) {
        const structuredData = {
          success: false,
          type: 'agent_analysis',
          agentName: sectionKey,
          message: `No results for ${sectionKey}`,
        };
        return OutputFormatter.createResponse(structuredData, context.clientCapabilities);
      }

      const structuredData = {
        success: true,
        type: 'agent_analysis',
        agentName: sectionKey,
        summary: section.summary || 'Analysis complete',
        tokensUsed: output.metadata.totalTokensUsed,
        findings: section.data || {},
        content: section.content || section.markdown,
        timestamp: new Date().toISOString(),
      };

      return OutputFormatter.createResponse(structuredData, context.clientCapabilities);
    } catch (error) {
      return OutputFormatter.createErrorResponse(error as Error, {
        tool: 'selective_agent',
        agents: selectiveAgents,
      });
    }
  };
}

/**
 * Create config file handler
 */
export function createCheckConfigHandler(): ContextualToolHandler {
  return async (_args: any, context) => {
    const configPath = path.join(context.projectPath, '.archdoc.config.json');

    try {
      await fs.access(configPath);

      // Read and validate config
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      let status = '✅ **Configuration Found and Valid**\n\n';
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check required fields
      if (!config.llm?.provider) {
        issues.push('❌ Missing `llm.provider` field');
      } else {
        status += `**Provider**: ${config.llm.provider}\n`;
      }

      if (!config.llm?.model) {
        recommendations.push('⚠️  Consider setting `llm.model` explicitly');
      } else {
        status += `**Model**: ${config.llm.model}\n`;
      }

      if (!config.apiKeys) {
        issues.push('❌ Missing `apiKeys` object');
      } else {
        const provider = config.llm?.provider;
        if (provider && (!config.apiKeys[provider] || config.apiKeys[provider].length === 0)) {
          issues.push(`❌ No API key configured for provider "${provider}"`);
        } else if (provider) {
          const keyPreview =
            config.apiKeys[provider].substring(0, 10) + '...' + config.apiKeys[provider].slice(-4);
          status += `**API Key**: ${keyPreview}\n`;
        }
      }

      if (config.tracing?.enabled) {
        status += `**Tracing**: Enabled (${config.tracing.project || 'N/A'})\n`;
      }

      status += '\n';

      if (issues.length > 0) {
        status += '## Issues Found:\n\n' + issues.join('\n') + '\n\n';
        status += '**Action Required**: Fix these issues in `.archdoc.config.json`\n';
      } else {
        status += '✅ Configuration is ready to use!\n\n';
        if (recommendations.length > 0) {
          status += '## Recommendations:\n\n' + recommendations.join('\n') + '\n';
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: status,
          },
        ],
      };
    } catch (_error) {
      const helpText = `❌ **No Configuration Found**

**Location**: ${configPath}

**Setup Instructions**:

1. Navigate to your project directory:
   \`\`\`bash
   cd ${context.projectPath}
   \`\`\`

2. Run the setup wizard:
   \`\`\`bash
   archdoc-mcp
   \`\`\`

3. Add your API key to \`.archdoc.config.json\`

**Required Fields**:
- \`llm.provider\` - LLM provider (anthropic, openai, google, xai)
- \`llm.model\` - Model to use
- \`apiKeys.{provider}\` - Your API key

**Example**:
\`\`\`json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514"
  },
  "apiKeys": {
    "anthropic": "sk-ant-..."
  }
}
\`\`\``;

      return {
        content: [
          {
            type: 'text',
            text: helpText,
          },
        ],
      };
    }
  };
}

/**
 * Create setup config handler
 */
export function createSetupConfigHandler(): ContextualToolHandler {
  return async (args: any, _context) => {
    const projectPath = process.cwd();
    const configPath = path.join(projectPath, '.archdoc.config.json');

    const {
      provider,
      model,
      apiKey,
      searchMode = 'keyword',
      embeddingsProvider,
      embeddingsApiKey,
      retrievalStrategy = 'smart',
      enableTracing = false,
      tracingApiKey,
      tracingProject,
    } = args;

    // Validate required fields
    if (!provider || !model || !apiKey) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Error: Missing required fields. Please provide `provider`, `model`, and `apiKey`.',
          },
        ],
        isError: true,
      };
    }

    // Validate embeddings API key if using non-local provider
    if (
      searchMode === 'vector' &&
      embeddingsProvider &&
      embeddingsProvider !== 'local' &&
      !embeddingsApiKey
    ) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error: embeddingsApiKey is required when using ${embeddingsProvider} embeddings provider.`,
          },
        ],
        isError: true,
      };
    }

    // Load existing config or create new
    let existingConfig: any = {};
    try {
      const existingContent = await fs.readFile(configPath, 'utf-8');
      existingConfig = JSON.parse(existingContent);
    } catch {
      // No existing config, start fresh
    }

    // Determine embeddings provider
    const finalEmbeddingsProvider =
      embeddingsProvider ||
      (searchMode === 'vector' ? existingConfig.llm?.embeddingsProvider || 'local' : undefined);

    // Build API keys object
    const apiKeys: any = {
      ...existingConfig.apiKeys,
      [provider]: apiKey,
    };

    // Build embeddings object if API key provided
    const embeddings: any = existingConfig.embeddings ? { ...existingConfig.embeddings } : {};
    if (embeddingsApiKey && finalEmbeddingsProvider && finalEmbeddingsProvider !== 'local') {
      embeddings[finalEmbeddingsProvider] = embeddingsApiKey;
    }

    // Build config - single definition (not duplicated!)
    const config: any = {
      llm: {
        provider,
        model,
        temperature: existingConfig.llm?.temperature || 0.2,
        maxTokens: existingConfig.llm?.maxTokens || 4096,
        embeddingsProvider: finalEmbeddingsProvider,
      },
      apiKeys,
      embeddings,
      searchMode: {
        mode: searchMode,
        strategy: retrievalStrategy,
        embeddingsProvider: finalEmbeddingsProvider,
      },
      tracing: {
        enabled: enableTracing,
        apiKey: tracingApiKey || existingConfig.tracing?.apiKey || '',
        project: tracingProject || existingConfig.tracing?.project || 'archdoc-analysis',
      },
      // Preserve other existing config
      ...existingConfig,
    };

    // Override with new values (to ensure they're not overridden by spread)
    config.llm = {
      provider,
      model,
      temperature: existingConfig.llm?.temperature || 0.2,
      maxTokens: existingConfig.llm?.maxTokens || 4096,
      embeddingsProvider: finalEmbeddingsProvider,
    };
    config.apiKeys = apiKeys;
    config.searchMode = {
      mode: searchMode,
      strategy: retrievalStrategy,
      embeddingsProvider: finalEmbeddingsProvider,
    };

    // Write config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    const summary = `✅ **Configuration ${existingConfig.llm ? 'Updated' : 'Created'} Successfully!**

**Location**: ${configPath}

**LLM Settings**:
- Provider: ${provider}
- Model: ${model}
- API Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}

**Search Configuration**:
- Mode: ${searchMode}
- Strategy: ${retrievalStrategy}${finalEmbeddingsProvider && searchMode === 'vector' ? `\n- Embeddings: ${finalEmbeddingsProvider}` : ''}

**Tracing**: ${enableTracing ? `Enabled (${tracingProject || 'archdoc-analysis'})` : 'Disabled'}

**Next Steps**:
1. The configuration has been saved
2. You can now use other tools like \`generate_documentation\`
3. Use \`check_config\` to verify the configuration anytime

💡 **Tip**: Your API key is stored locally in \`.archdoc.config.json\`. Make sure this file is in your \`.gitignore\`!`;

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  };
}
