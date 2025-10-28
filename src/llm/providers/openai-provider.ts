import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ILLMProvider } from '../llm-provider.interface';
import { TokenManager } from '../token-manager';

/**
 * OpenAI GPT provider implementation
 */
export class OpenAIProvider implements ILLMProvider {
  public readonly name = 'openai';
  private readonly apiKey: string;
  private readonly tokenManager: TokenManager;

  // Model configurations
  private readonly models = {
    'gpt-4-turbo': {
      maxInputTokens: 128000,
      maxOutputTokens: 4096,
      costPerMillionInputTokens: 10.0,
      costPerMillionOutputTokens: 30.0,
    },
    'gpt-4': {
      maxInputTokens: 8192,
      maxOutputTokens: 4096,
      costPerMillionInputTokens: 30.0,
      costPerMillionOutputTokens: 60.0,
    },
    'gpt-3.5-turbo': {
      maxInputTokens: 16384,
      maxOutputTokens: 4096,
      costPerMillionInputTokens: 0.5,
      costPerMillionOutputTokens: 1.5,
    },
  };

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
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
    const modelName = config.model || 'gpt-4-turbo';

    return new ChatOpenAI({
      openAIApiKey: this.apiKey,
      modelName,
      temperature: config.temperature ?? 0.2,
      maxTokens: config.maxTokens ?? 4096,
      topP: config.topP,
    }) as BaseChatModel;
  }

  public getAvailableModels(): string[] {
    return Object.keys(this.models);
  }

  public getModelConfig(model: string) {
    const config = this.models[model as keyof typeof this.models];
    if (!config) {
      throw new Error(`Unknown OpenAI model: ${model}`);
    }
    return config;
  }

  public async countTokens(text: string, model?: string): Promise<number> {
    return Promise.resolve(this.tokenManager.countTokens(text, model || 'gpt-4'));
  }
}
