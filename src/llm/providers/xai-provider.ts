import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ILLMProvider } from '../llm-provider.interface';
import { TokenManager } from '../token-manager';

/**
 * xAI Grok provider implementation
 * Uses OpenAI-compatible API
 */
export class XAIProvider implements ILLMProvider {
  public readonly name = 'xai';
  private readonly apiKey: string;
  private readonly tokenManager: TokenManager;

  // Model configurations
  private readonly models = {
    'grok-3-beta': {
      maxInputTokens: 131072,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 5.0,
      costPerMillionOutputTokens: 15.0,
    },
    'grok-2': {
      maxInputTokens: 131072,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 2.0,
      costPerMillionOutputTokens: 10.0,
    },
  };

  constructor(apiKey?: string) {
    this.apiKey = apiKey || '';
    this.tokenManager = TokenManager.getInstance();
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  public getChatModel(config: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }): BaseChatModel {
    const modelName = config.model || 'grok-3-beta';

    return new ChatOpenAI({
      openAIApiKey: this.apiKey,
      modelName,
      temperature: config.temperature ?? 0.2,
      maxTokens: config.maxTokens ?? 4096,
      topP: config.topP,
      configuration: {
        baseURL: 'https://api.x.ai/v1',
      },
    }) as BaseChatModel;
  }

  public getAvailableModels(): string[] {
    return Object.keys(this.models);
  }

  public getModelConfig(model: string) {
    const config = this.models[model as keyof typeof this.models];
    if (!config) {
      throw new Error(`Unknown xAI model: ${model}`);
    }
    return config;
  }

  public async countTokens(text: string, model?: string): Promise<number> {
    // xAI uses similar tokenization to GPT-4
    return Promise.resolve(this.tokenManager.countTokens(text, model || 'gpt-4'));
  }
}
