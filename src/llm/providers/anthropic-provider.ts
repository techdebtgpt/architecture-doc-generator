import { ChatAnthropic } from '@langchain/anthropic';
import { ILLMProvider } from '../llm-provider.interface';
import { TokenManager } from '../token-manager';

/**
 * Anthropic Claude provider implementation
 */
export class AnthropicProvider implements ILLMProvider {
  public readonly name = 'anthropic';
  private readonly apiKey: string;
  private readonly tokenManager: TokenManager;

  // Model configurations
  private readonly models = {
    'claude-sonnet-4-20250514': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 3.0,
      costPerMillionOutputTokens: 15.0,
    },
    'claude-3-5-sonnet-20241022': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 3.0,
      costPerMillionOutputTokens: 15.0,
    },
    'claude-3-5-haiku-20241022': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 0.8,
      costPerMillionOutputTokens: 4.0,
    },
    'claude-3-opus-20240229': {
      maxInputTokens: 200000,
      maxOutputTokens: 4096,
      costPerMillionInputTokens: 15.0,
      costPerMillionOutputTokens: 75.0,
    },
  };

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.tokenManager = TokenManager.getInstance();
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  public getChatModel(config?: any): ChatAnthropic {
    const modelName = config?.model || 'claude-sonnet-4-20250514';

    return new ChatAnthropic({
      apiKey: this.apiKey,
      model: modelName,
      temperature: config?.temperature ?? 0.2,
      maxTokens: config?.maxTokens ?? 4096,
      topP: config?.topP,
    });
  }

  public getAvailableModels(): string[] {
    return Object.keys(this.models);
  }

  public getModelConfig(model: string) {
    const config = this.models[model as keyof typeof this.models];
    if (!config) {
      throw new Error(`Unknown Anthropic model: ${model}`);
    }
    return config;
  }

  async countTokens(text: string, _model?: string): Promise<number> {
    // Anthropic uses similar tokenization to GPT-4
    return this.tokenManager.countTokens(text, 'gpt-4');
  }
}
