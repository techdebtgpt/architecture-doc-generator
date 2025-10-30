import { ChatAnthropic } from '@langchain/anthropic';
import { ILLMProvider } from '../llm-provider.interface';
import { TokenManager } from '../token-manager';
import { Logger } from '../../utils/logger';

/**
 * Anthropic Claude provider implementation
 */
export class AnthropicProvider implements ILLMProvider {
  public readonly name = 'anthropic';
  private readonly apiKey: string;
  private readonly tokenManager: TokenManager;
  private readonly logger: Logger;

  // Model configurations
  private readonly models = {
    'claude-opus-4-1-20250805': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 15.0,
      costPerMillionOutputTokens: 75.0,
    },
    'claude-sonnet-4-5-20250929': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 3.0,
      costPerMillionOutputTokens: 15.0,
    },
    'claude-haiku-4-5-20251001': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 0.25,
      costPerMillionOutputTokens: 1.25,
    },
    'claude-sonnet-4-20250514': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 3.0,
      costPerMillionOutputTokens: 15.0,
    },
    'claude-sonnet-4-20250514-thinking': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 3.0,
      costPerMillionOutputTokens: 15.0,
    },
    'claude-opus-4-20250514': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 15.0,
      costPerMillionOutputTokens: 75.0,
    },
    'claude-opus-4-20250514-thinking': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 15.0,
      costPerMillionOutputTokens: 75.0,
    },
    'claude-3-7-sonnet-latest': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 3.0,
      costPerMillionOutputTokens: 15.0,
    },
    'claude-3-7-sonnet-20250219': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 3.0,
      costPerMillionOutputTokens: 15.0,
    },
    'claude-3-5-sonnet-latest': {
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
    'claude-3-5-sonnet-20240620': {
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
    this.logger = new Logger('AnthropicProvider');

    try {
      const masked = this.maskKey(this.apiKey);
      this.logger.debug(`Initialized. configured=${this.isConfigured()} maskedKey=${masked}`);
    } catch (e) {
      this.logger.debug(`Initialized. (error masking key) ${(e as Error)?.message ?? e}`);
    }
  }

  private maskKey(key: string): string {
    if (!key) return 'NOT_SET';
    if (key.length <= 12) return `${key.slice(0, 4)}...`;
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  public getChatModel(config?: any, _agentContext?: string): ChatAnthropic {
    const modelName = config?.model || 'claude-sonnet-4-5-20250929';
    const temperature = config?.temperature ?? 0.2;
    const maxTokens = config?.maxTokens ?? 4096;

    try {
      this.logger.debug(
        `Creating ChatAnthropic model=${modelName} temperature=${temperature} maxTokens=${maxTokens}`,
      );
      return new ChatAnthropic({
        apiKey: this.apiKey,
        model: modelName,
        temperature,
        maxTokens,
        topP: config?.topP,
      });
    } catch (err) {
      this.logger.error(`Failed to create ChatAnthropic model: ${(err as Error)?.message ?? err}`);
      throw err;
    }
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
