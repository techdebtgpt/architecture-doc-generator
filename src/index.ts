// Core exports
export { LLMService, type LLMServiceConfig } from './llm/llm-service';
export { TokenManager } from './llm/token-manager';
export * from './llm/llm-provider.interface';

// Providers
export { AnthropicProvider } from './llm/providers/anthropic-provider';
export { OpenAIProvider } from './llm/providers/openai-provider';
export { GoogleProvider } from './llm/providers/google-provider';

// Agents
export * from './agents/agent.interface';
export { AgentRegistry } from './agents/agent-registry';
export { FileStructureAgent } from './agents/file-structure-agent';
export { DependencyAnalyzerAgent } from './agents/dependency-analyzer-agent';
export { PatternDetectorAgent } from './agents/pattern-detector-agent';
export { FlowVisualizationAgent } from './agents/flow-visualization-agent';
export { SchemaGeneratorAgent } from './agents/schema-generator-agent';

// Scanners
export * from './scanners/scanner.interface';
export { FileSystemScanner } from './scanners/file-system-scanner';

// Formatters
export { MarkdownFormatter } from './formatters/markdown-formatter';
export { MultiFileMarkdownFormatter } from './formatters/multi-file-markdown-formatter';
export type { MarkdownFormatterOptions } from './formatters/markdown-formatter';

// Orchestrator
export { DocumentationOrchestrator } from './orchestrator/documentation-orchestrator';
export { ClarityEvaluator } from './orchestrator/clarity-evaluator';
export { AgentSelector } from './orchestrator/agent-selector';

// Types
export * from './types/agent.types';
export * from './types/scanner.types';
export * from './types/llm.types';
export * from './types/output.types';

// Config
export * from './config/config.interface';
export { defaultConfig } from './config/default-config';

// Main class (to be implemented)
export class ArchDocGenerator {
  // Implementation coming soon
}

// Version
export const VERSION = '0.1.0';
