import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { BaseChatMessageHistory, InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { BaseMessage } from '@langchain/core/messages';
import { ILLMProvider } from './llm-provider.interface';
import { AnthropicProvider } from './providers/anthropic-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { GoogleProvider } from './providers/google-provider';
import { TokenManager } from './token-manager';
import { LLMProvider, LLMRequestOptions, LLMResponse, TokenUsageDetails } from '../types/llm.types';

/**
 * Main LLM service for managing multiple providers
 */
export class LLMService {
  private static instance: LLMService;
  private providers: Map<LLMProvider, ILLMProvider> = new Map();
  private tokenManager: TokenManager;
  private defaultProvider: LLMProvider;
  private chatHistories: Map<string, BaseChatMessageHistory> = new Map();

  private constructor() {
    this.tokenManager = TokenManager.getInstance();

    // Configure LangSmith tracing if enabled
    this.configureLangSmith();

    // Initialize providers
    this.providers.set(LLMProvider.ANTHROPIC, new AnthropicProvider());
    this.providers.set(LLMProvider.OPENAI, new OpenAIProvider());
    this.providers.set(LLMProvider.GOOGLE, new GoogleProvider());

    // Set default provider based on configuration
    this.defaultProvider = this.getDefaultProviderFromEnv();
  }

  /**
   * Configure LangSmith tracing
   */
  private configureLangSmith(): void {
    // Check if LangSmith is enabled
    if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
      process.env.LANGCHAIN_ENDPOINT =
        process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com';
      process.env.LANGCHAIN_PROJECT = process.env.LANGCHAIN_PROJECT || 'archdoc-generator';
      process.env.LANGCHAIN_CALLBACKS_BACKGROUND =
        process.env.LANGCHAIN_CALLBACKS_BACKGROUND || 'true';

      console.log(`✅ LangSmith tracing enabled - Project: ${process.env.LANGCHAIN_PROJECT}`);
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  /**
   * Get chat model with configuration
   */
  public getChatModel(options: LLMRequestOptions = {}): BaseChatModel {
    const provider = options.provider || this.defaultProvider;
    const llmProvider = this.providers.get(provider);

    if (!llmProvider) {
      throw new Error(`LLM provider ${provider} not found`);
    }

    // Detailed debug logging for provider selection and configuration
    // eslint-disable-next-line no-console
    console.debug(
      `[LLMService] getChatModel provider=${provider} model=${options.model || '(default)'} temperature=${options.temperature ?? '(default)'} maxTokens=${options.maxTokens ?? '(default)'} `,
    );

    if (!llmProvider.isConfigured()) {
      // eslint-disable-next-line no-console
      console.error(
        `[LLMService] LLM provider ${provider} is NOT configured. isConfigured() returned false.`,
      );
      throw new Error(`LLM provider ${provider} is not configured. Please set API key.`);
    }

    try {
      const model = llmProvider.getChatModel({
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
      });

      // eslint-disable-next-line no-console
      console.debug(`[LLMService] created model for provider=${provider}`);
      return model;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[LLMService] error creating model for provider=${provider}:`,
        (err as any)?.message ?? err,
      );
      throw err;
    }
  }

  /**
   * Get chat model with message history support
   */
  public getChatModelWithHistory(_sessionId: string, options: LLMRequestOptions = {}): any {
    const model = this.getChatModel(options);

    return new RunnableWithMessageHistory({
      runnable: model,
      getMessageHistory: async (sid: string) => {
        if (!this.chatHistories.has(sid)) {
          this.chatHistories.set(sid, new InMemoryChatMessageHistory());
        }
        return this.chatHistories.get(sid)!;
      },
      inputMessagesKey: 'input',
      historyMessagesKey: 'history',
    });
  }

  /**
   * Invoke model with automatic retry and error handling
   */
  public async invoke(
    messages: BaseMessage[],
    options: LLMRequestOptions = {},
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = this.getChatModel(options);
    const provider = options.provider || this.defaultProvider;

    let lastError: Error | null = null;
    const maxRetries = options.retries || 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await model.invoke(messages);
        const responseTime = Date.now() - startTime;

        // Extract token usage
        const usage = this.extractTokenUsage(result, provider, options.model);

        return {
          content: result.content as string,
          usage,
          model: options.model || this.getDefaultModel(provider),
          provider,
          finishReason: 'stop',
          responseTime,
          cached: false,
          metadata: {},
        };
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = (options.retryDelay || 1000) * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Failed to invoke LLM after multiple retries');
  }

  /**
   * Count tokens in text
   */
  public async countTokens(
    text: string,
    provider: LLMProvider = this.defaultProvider,
    model?: string,
  ): Promise<number> {
    const llmProvider = this.providers.get(provider);
    if (!llmProvider) {
      throw new Error(`LLM provider ${provider} not found`);
    }
    return llmProvider.countTokens(text, model);
  }

  /**
   * Truncate text to fit within token limit
   */
  public truncateToTokenLimit(text: string, maxTokens: number, model: string = 'gpt-4'): string {
    return this.tokenManager.truncateToTokenLimit(text, maxTokens, model);
  }

  /**
   * Split text into chunks
   */
  public splitIntoChunks(
    text: string,
    maxTokensPerChunk: number,
    overlap: number = 0,
    model: string = 'gpt-4',
  ): string[] {
    return this.tokenManager.splitIntoChunks(text, maxTokensPerChunk, overlap, model);
  }

  /**
   * Get available models for a provider
   */
  public getAvailableModels(provider: LLMProvider): string[] {
    const llmProvider = this.providers.get(provider);
    if (!llmProvider) {
      throw new Error(`LLM provider ${provider} not found`);
    }
    return llmProvider.getAvailableModels();
  }

  /**
   * Get model configuration
   */
  public getModelConfig(provider: LLMProvider, model: string) {
    const llmProvider = this.providers.get(provider);
    if (!llmProvider) {
      throw new Error(`LLM provider ${provider} not found`);
    }
    return llmProvider.getModelConfig(model);
  }

  /**
   * Calculate cost for token usage
   */
  public calculateCost(usage: TokenUsageDetails, provider: LLMProvider, model: string): number {
    const config = this.getModelConfig(provider, model);
    return this.tokenManager.calculateCost(
      usage.inputTokens,
      usage.outputTokens,
      config.costPerMillionInputTokens,
      config.costPerMillionOutputTokens,
    );
  }

  /**
   * Clear chat history for a session
   */
  public clearChatHistory(sessionId: string): void {
    this.chatHistories.delete(sessionId);
  }

  /**
   * Clear all chat histories
   */
  public clearAllChatHistories(): void {
    this.chatHistories.clear();
  }

  /**
   * Contextually rewrite a query based on chat history
   */
  public async contextualizeQuery(
    query: string,
    chatHistory: BaseMessage[],
    options: LLMRequestOptions = {},
  ): Promise<string> {
    if (chatHistory.length === 0) {
      return query;
    }

    const model = this.getChatModel({ ...options, temperature: 0 });

    const prompt = `Given a chat history and the latest user question which might reference context in the chat history, formulate a standalone question which can be understood without the chat history. Do NOT answer the question, just reformulate it if needed and otherwise return it as is.

Chat History:
${chatHistory.map((m) => `${m._getType()}: ${m.content}`).join('\n')}

Latest Question: ${query}

Standalone Question:`;

    const result = await model.invoke([{ role: 'user', content: prompt }]);
    return (result.content as string).trim();
  }

  // Private helper methods

  private getDefaultProviderFromEnv(): LLMProvider {
    const provider = process.env.ARCHDOC_LLM_PROVIDER?.toLowerCase();

    switch (provider) {
      case 'openai':
        return LLMProvider.OPENAI;
      case 'google':
        return LLMProvider.GOOGLE;
      case 'anthropic':
      default:
        return LLMProvider.ANTHROPIC;
    }
  }

  private getDefaultModel(provider: LLMProvider): string {
    switch (provider) {
      case LLMProvider.ANTHROPIC:
        return process.env.ARCHDOC_LLM_MODEL || 'claude-sonnet-4-20250514';
      case LLMProvider.OPENAI:
        return process.env.ARCHDOC_LLM_MODEL || 'gpt-4-turbo';
      case LLMProvider.GOOGLE:
        return process.env.ARCHDOC_LLM_MODEL || 'gemini-1.5-pro';
      default:
        return 'claude-sonnet-4-20250514';
    }
  }

  private extractTokenUsage(result: any, provider: LLMProvider, model?: string): TokenUsageDetails {
    // Extract usage from response metadata
    const usage = result.usage_metadata || result.response_metadata?.usage || {};

    const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
    const outputTokens = usage.output_tokens || usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || inputTokens + outputTokens;

    const modelName = model || this.getDefaultModel(provider);
    const config = this.getModelConfig(provider, modelName);

    const estimatedCost = this.tokenManager.calculateCost(
      inputTokens,
      outputTokens,
      config.costPerMillionInputTokens,
      config.costPerMillionOutputTokens,
    );

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      cachedTokens: usage.cache_read_input_tokens || 0,
      estimatedCost,
    };
  }

  private isNonRetryableError(error: any): boolean {
    // Don't retry on authentication, invalid request, or content filter errors
    const nonRetryablePatterns = [
      'authentication',
      'invalid_api_key',
      'invalid_request',
      'content_filter',
      'context_length_exceeded',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return nonRetryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.tokenManager.dispose();
    this.clearAllChatHistories();
  }
}
