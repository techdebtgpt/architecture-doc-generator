import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ILLMProvider } from '../llm-provider.interface';
import { TokenManager } from '../token-manager';

/**
 * Google Gemini provider implementation
 */
export class GoogleProvider implements ILLMProvider {
  public readonly name = 'google';
  private readonly apiKey: string;
  private readonly tokenManager: TokenManager;

  // Model configurations
  private readonly models = {
    'gemini-2.5-pro': {
      maxInputTokens: 2097152,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 1.0,
      costPerMillionOutputTokens: 4.0,
    },
    'gemini-2.5-flash': {
      maxInputTokens: 1048576,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 0.05,
      costPerMillionOutputTokens: 0.2,
    },
    'gemini-2.5-flash-lite': {
      maxInputTokens: 1048576,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 0.025,
      costPerMillionOutputTokens: 0.1,
    },
    'gemini-1.5-pro': {
      maxInputTokens: 2097152,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 1.25,
      costPerMillionOutputTokens: 5.0,
    },
    'gemini-1.5-flash': {
      maxInputTokens: 1048576,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 0.075,
      costPerMillionOutputTokens: 0.3,
    },
    'gemini-pro': {
      maxInputTokens: 32768,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 0.5,
      costPerMillionOutputTokens: 1.5,
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
    const modelName = config.model || 'gemini-2.5-pro';

    return new ChatGoogleGenerativeAI({
      apiKey: this.apiKey,
      modelName,
      temperature: config.temperature ?? 0.2,
      maxOutputTokens: config.maxTokens ?? 4096,
      topP: config.topP,
    }) as BaseChatModel;
  }

  public getAvailableModels(): string[] {
    return Object.keys(this.models);
  }

  public getModelConfig(model: string) {
    const config = this.models[model as keyof typeof this.models];
    if (!config) {
      throw new Error(`Unknown Google model: ${model}`);
    }
    return config;
  }

  public async countTokens(text: string, _model?: string): Promise<number> {
    // Google uses similar tokenization to GPT-4
    return Promise.resolve(this.tokenManager.countTokens(text, 'gpt-4'));
  }
}
