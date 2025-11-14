/**
 * Type definitions for MCP Server
 */

import { ArchDocConfig } from '../utils/config-loader';

/**
 * MCP Tool handler function signature
 */
export type ToolHandler = (args: Record<string, any>) => Promise<ToolResponse>;

/**
 * MCP Tool response
 */
export interface ToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * Semantic versioning for tools
 */
export interface ToolVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Tool changelog entry
 */
export interface ToolChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  breaking?: boolean;
}

/**
 * MCP Tool definition with schema and versioning
 */
export interface ToolDefinition {
  name: string;
  description: string;
  version?: string; // Semantic version (e.g., "1.0.0")
  versionInfo?: {
    current: ToolVersion;
    changelog?: ToolChangelogEntry[];
    deprecated?: boolean;
    deprecatedSince?: string;
    replacedBy?: string;
  };
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Tool context passed to handlers
 */
export interface ToolContext {
  projectPath: string;
  config: ArchDocConfig;
  logger: any; // Logger instance
}

/**
 * Handler function with context
 */
export type ContextualToolHandler = (
  args: Record<string, any>,
  context: ToolContext,
) => Promise<ToolResponse>;

/**
 * Vector store interface
 */
export interface VectorStore {
  query: (
    question: string,
    topK?: number,
  ) => Promise<Array<{ content: string; file: string; score: number }>>;
  reload: (docsPath: string) => Promise<void>;
  isReady: () => boolean;
}

/**
 * Service registry for dependency injection
 */
export interface ServiceRegistry {
  configService: any;
  documentationService: any;
  vectorStoreService: any;
}
