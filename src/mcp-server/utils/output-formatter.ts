/**
 * Output Formatter Utilities
 * Handles formatting tool outputs as JSON, Markdown, or hybrid based on client capabilities
 */

import { ToolResponse, ClientCapabilities } from '../types';

/**
 * Format tool output based on client capabilities
 */
export class OutputFormatter {
  /**
   * Create a response with structured data and formatted text
   */
  static createResponse(
    structuredData: Record<string, any>,
    capabilities?: ClientCapabilities,
  ): ToolResponse {
    const preferJson = capabilities?.supportsJson && !capabilities?.supportsMarkdown;

    if (preferJson) {
      // Pure JSON output for programmatic clients
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(structuredData, null, 2),
          },
        ],
        _meta: {
          structuredData,
          format: 'json',
        },
      };
    } else {
      // Markdown with embedded JSON metadata
      const markdown = this.structuredDataToMarkdown(structuredData);
      return {
        content: [
          {
            type: 'text',
            text: markdown,
          },
        ],
        _meta: {
          structuredData,
          format: 'hybrid',
        },
      };
    }
  }

  /**
   * Create an error response
   */
  static createErrorResponse(error: Error | string, context?: Record<string, any>): ToolResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const structuredData = {
      success: false,
      error: errorMessage,
      ...(context && { context }),
    };

    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${errorMessage}${context ? `\n\nContext: ${JSON.stringify(context, null, 2)}` : ''}`,
        },
      ],
      isError: true,
      _meta: {
        structuredData,
        format: 'hybrid',
      },
    };
  }

  /**
   * Convert structured data to Markdown
   */
  private static structuredDataToMarkdown(data: Record<string, any>): string {
    // Handle different data structures
    if (data.success === false && data.error) {
      return `❌ Error: ${data.error}`;
    }

    if (data.type === 'documentation_generated') {
      return this.formatDocumentationGenerated(data);
    }

    if (data.type === 'query_result') {
      return this.formatQueryResult(data);
    }

    if (data.type === 'config_check') {
      return this.formatConfigCheck(data);
    }

    if (data.type === 'agent_analysis') {
      return this.formatAgentAnalysis(data);
    }

    if (data.type === 'cache_status') {
      return this.formatCacheStatus(data);
    }

    if (data.type === 'cache_invalidated') {
      return this.formatCacheInvalidated(data);
    }

    // Fallback: JSON in code block
    return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }

  /**
   * Format documentation generation result
   */
  private static formatDocumentationGenerated(data: any): string {
    const { docsPath, agentsExecuted, totalTokens, filesGenerated, estimatedCost, fromCache } =
      data;

    let output = fromCache
      ? '✅ **Documentation Retrieved from Cache!** ⚡\n\n'
      : '✅ **Documentation Generated Successfully!**\n\n';

    output += `**Output Directory**: \`${docsPath}\`\n`;
    output += `**Agents Executed**: ${agentsExecuted?.length || 0}\n`;
    output += `**Total Tokens**: ${totalTokens?.toLocaleString() || 0}\n`;
    output += `**Files Generated**: ${filesGenerated || 0}\n`;

    if (estimatedCost && !fromCache) {
      output += `**Estimated Cost**: $${estimatedCost.toFixed(4)}\n`;
    }

    if (fromCache) {
      output += `\n⚡ **Cache Hit**: Instant response using previously generated documentation\n`;
      output += `💡 **Tip**: Use \`useCache: false\` to force fresh generation\n`;
    }

    if (agentsExecuted && agentsExecuted.length > 0) {
      output += `\n**Agents**: ${agentsExecuted.join(', ')}\n`;
    }

    output += '\n📖 Use `query_documentation` to ask questions about the architecture!';

    return output;
  }

  /**
   * Format query result
   */
  private static formatQueryResult(data: any): string {
    const { question, results, totalResults } = data;

    let output = `🔍 **Question**: ${question}\n\n`;
    output += `📚 **Relevant Documentation** (${totalResults || results?.length || 0} sections):\n\n`;

    if (results && results.length > 0) {
      for (const result of results) {
        const score = result.score ? `${(result.score * 100).toFixed(1)}%` : 'N/A';
        output += `### ${result.file} (score: ${score})\n\n`;

        const content = result.content || '';
        const preview = content.substring(0, 1000);
        output += `${preview}${content.length > 1000 ? '...' : ''}\n\n`;
      }
    } else {
      output += '_No relevant results found._\n';
    }

    return output;
  }

  /**
   * Format config check result
   */
  private static formatConfigCheck(data: any): string {
    const { valid, provider, model, apiKeyConfigured, issues, recommendations } = data;

    let output = valid
      ? '✅ **Configuration Found and Valid**\n\n'
      : '❌ **Configuration Issues Detected**\n\n';

    if (provider) output += `**Provider**: ${provider}\n`;
    if (model) output += `**Model**: ${model}\n`;
    if (apiKeyConfigured !== undefined)
      output += `**API Key**: ${apiKeyConfigured ? '✅ Configured' : '❌ Missing'}\n`;

    if (issues && issues.length > 0) {
      output += '\n## Issues Found:\n\n';
      issues.forEach((issue: string) => {
        output += `- ${issue}\n`;
      });
    }

    if (recommendations && recommendations.length > 0) {
      output += '\n## Recommendations:\n\n';
      recommendations.forEach((rec: string) => {
        output += `- ${rec}\n`;
      });
    }

    return output;
  }

  /**
   * Format agent analysis result
   */
  private static formatAgentAnalysis(data: any): string {
    const { agentName, summary, tokensUsed, findings } = data;

    let output = `## ${agentName} Analysis\n\n`;

    if (summary) {
      output += `${summary}\n\n`;
    }

    if (tokensUsed) {
      output += `_Tokens used: ${tokensUsed.toLocaleString()}_\n\n`;
    }

    if (findings && Object.keys(findings).length > 0) {
      output += '### Findings:\n\n';
      output += '```json\n';
      output += JSON.stringify(findings, null, 2);
      output += '\n```\n';
    }

    return output;
  }

  /**
   * Detect client capabilities from headers or environment
   */
  static detectClientCapabilities(headers?: Record<string, string>): ClientCapabilities {
    // Check User-Agent or custom headers
    const userAgent = headers?.['user-agent']?.toLowerCase() || '';

    return {
      supportsJson: userAgent.includes('claude') || userAgent.includes('cursor'),
      supportsMarkdown: true, // Most clients support Markdown
      interactive: userAgent.includes('cursor') || userAgent.includes('vscode'),
    };
  }

  /**
   * Format cache status
   */
  private static formatCacheStatus(data: any): string {
    const { exists, valid, filesCount, totalSize, age, metadata } = data;

    let output = '📦 **Cache Status**\n\n';

    if (!exists) {
      output += '❌ **No cache found**\n\n';
      output += 'Run `generate_documentation` to create documentation.\n';
      return output;
    }

    output += valid ? '✅ **Cache is valid**\n\n' : '⚠️  **Cache exists but may be outdated**\n\n';
    output += `**Files**: ${filesCount}\n`;
    output += `**Total Size**: ${(totalSize / 1024).toFixed(2)} KB\n`;

    if (age) {
      const ageHours = age / (1000 * 60 * 60);
      const ageDays = age / (1000 * 60 * 60 * 24);

      if (ageDays >= 1) {
        output += `**Age**: ${ageDays.toFixed(1)} days\n`;
      } else {
        output += `**Age**: ${ageHours.toFixed(1)} hours\n`;
      }
    }

    if (metadata && metadata.agentsExecuted) {
      output += `\n**Agents**: ${metadata.agentsExecuted.join(', ')}\n`;
      output += `**Tokens**: ${metadata.totalTokens?.toLocaleString() || 'N/A'}\n`;
    }

    if (!valid) {
      output +=
        '\n💡 **Tip**: Run `invalidate_cache` then `generate_documentation` for fresh analysis.\n';
    }

    return output;
  }

  /**
   * Format cache invalidation result
   */
  private static formatCacheInvalidated(data: any): string {
    return `✅ ${data.message}\n\n💡 Next call to \`generate_documentation\` will perform a fresh analysis.`;
  }
}
