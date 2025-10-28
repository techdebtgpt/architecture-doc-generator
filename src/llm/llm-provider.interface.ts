import { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * Base interface for LLM providers
 */
export interface ILLMProvider {
  /** Provider name */
  readonly name: string;

  /** Get chat model instance */
  getChatModel(config: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }): BaseChatModel;

  /** Get available models */
  getAvailableModels(): string[];

  /** Get model configuration */
  getModelConfig(model: string): {
    maxInputTokens: number;
    maxOutputTokens: number;
    costPerMillionInputTokens: number;
    costPerMillionOutputTokens: number;
  };

  /** Count tokens for a given text */
  countTokens(text: string, model?: string): Promise<number>;

  /** Check if provider is configured */
  isConfigured(): boolean;
}
