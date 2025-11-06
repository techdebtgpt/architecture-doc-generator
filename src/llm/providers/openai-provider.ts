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

  // Model configurations (Updated Nov 2024 - actual OpenAI model names and pricing)
  private readonly models = {
    // Reasoning models (o1 series)
    'o1-preview': {
      maxInputTokens: 128000,
      maxOutputTokens: 32768,
      costPerMillionInputTokens: 15.0,
      costPerMillionOutputTokens: 60.0,
    },
    'o1-mini': {
      maxInputTokens: 128000,
      maxOutputTokens: 65536,
      costPerMillionInputTokens: 3.0,
      costPerMillionOutputTokens: 12.0,
    },
    // GPT-4o series (multimodal)
    'gpt-4o': {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
      costPerMillionInputTokens: 2.5,
      costPerMillionOutputTokens: 10.0,
    },
    'gpt-4o-mini': {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
      costPerMillionInputTokens: 0.15,
      costPerMillionOutputTokens: 0.6,
    },
    // GPT-4 Turbo
    'gpt-4-turbo': {
      maxInputTokens: 128000,
      maxOutputTokens: 4096,
      costPerMillionInputTokens: 10.0,
      costPerMillionOutputTokens: 30.0,
    },
    'gpt-4-turbo-preview': {
      maxInputTokens: 128000,
      maxOutputTokens: 4096,
      costPerMillionInputTokens: 10.0,
      costPerMillionOutputTokens: 30.0,
    },
    // Legacy GPT-4
    'gpt-4': {
      maxInputTokens: 8192,
      maxOutputTokens: 4096,
      costPerMillionInputTokens: 30.0,
      costPerMillionOutputTokens: 60.0,
    },
    // GPT-3.5 Turbo
    'gpt-3.5-turbo': {
      maxInputTokens: 16384,
      maxOutputTokens: 4096,
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
    const requestedModel = config.model || 'gpt-4o-mini';

    // Check if model exists in our configs, warn if not
    if (!this.models[requestedModel as keyof typeof this.models]) {
      console.warn(
        `⚠️  Unknown OpenAI model '${requestedModel}' - OpenAI may fallback to a different model. Available models: ${this.getAvailableModels().join(', ')}`,
      );
    }

    const modelName = requestedModel;

    // Reasoning models (o1 series) have special restrictions
    const isReasoningModel = modelName.startsWith('o1');

    const chatConfig: any = {
      apiKey: this.apiKey,
      model: modelName,
    };

    // Reasoning models (o1 series) only support temperature=1 and don't support other sampling params
    if (isReasoningModel) {
      // Only set temperature to 1 (required default for reasoning models)
      chatConfig.temperature = 1;
      // Use max_completion_tokens for reasoning models
      chatConfig.maxCompletionTokens = config.maxTokens ?? 4096;
      // Don't set topP for reasoning models (not supported)
    } else {
      // Standard models support all parameters
      chatConfig.temperature = config.temperature ?? 0.2;
      chatConfig.maxTokens = config.maxTokens ?? 4096;
      if (config.topP !== undefined) {
        chatConfig.topP = config.topP;
      }
    }

    return new ChatOpenAI(chatConfig) as BaseChatModel;
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
    return Promise.resolve(this.tokenManager.countTokens(text, model || 'o1-mini'));
  }
}
