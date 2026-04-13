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
    'claude-opus-4-6': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 5.0,
      costPerMillionOutputTokens: 25.0,
    },
    'claude-sonnet-4-6': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 3.0,
      costPerMillionOutputTokens: 15.0,
    },
    'claude-haiku-4-5-20251001': {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
      costPerMillionInputTokens: 1.0,
      costPerMillionOutputTokens: 5.0,
    },
  };

  private resolveModelName(requestedModel: unknown): string {
    if (typeof requestedModel === 'string' && requestedModel in this.models) {
      return requestedModel;
    }

    if (typeof requestedModel === 'string' && requestedModel.startsWith('claude-')) {
      // Infer cost tier from model name prefix so budget calculations remain accurate
      if (requestedModel.includes('haiku')) {
        this.logger.warn(`Unknown Anthropic model '${requestedModel}', using haiku-4-5 pricing`);
        return 'claude-haiku-4-5-20251001';
      }
      if (requestedModel.includes('opus')) {
        this.logger.warn(`Unknown Anthropic model '${requestedModel}', using opus-4-6 pricing`);
        return 'claude-opus-4-6';
      }
      // Sonnet or unknown claude variant
      this.logger.warn(`Unknown Anthropic model '${requestedModel}', using sonnet-4-6 pricing`);
    }

    return 'claude-sonnet-4-6';
  }

  constructor(apiKey?: string) {
    this.apiKey = apiKey || '';
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

  private normalizeTopP(topP: unknown): number {
    // LangChain Anthropic defaults topP to -1 when omitted, which newer Anthropic
    // models reject. Always provide a valid [0,1] value.
    if (topP === undefined || topP === null) {
      return 1;
    }

    const parsedTopP = typeof topP === 'number' ? topP : Number(topP);
    if (!Number.isFinite(parsedTopP) || parsedTopP <= 0 || parsedTopP > 1) {
      this.logger.warn(`Invalid topP value for Anthropic (${String(topP)}), defaulting to 1`);
      return 1;
    }

    return parsedTopP;
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  public getChatModel(config?: any, _agentContext?: string): ChatAnthropic {
    const modelName = this.resolveModelName(config?.model);
    const temperature = config?.temperature ?? 0.2;
    const maxTokens = config?.maxTokens ?? 8192;
    const topP = this.normalizeTopP(config?.topP);

    try {
      this.logger.debug(
        `Creating ChatAnthropic model=${modelName} maxTokens=${maxTokens} topP=${topP}`,
      );

      if (config?.temperature !== undefined) {
        this.logger.debug(
          `Ignoring temperature=${temperature} for Anthropic model=${modelName} because this model does not allow temperature and top_p together`,
        );
      }

      return new ChatAnthropic({
        apiKey: this.apiKey,
        model: modelName,
        maxTokens,
        topP,
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
    const resolvedModel = this.resolveModelName(model);
    const config = this.models[resolvedModel as keyof typeof this.models];
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
