import { encodingForModel, Tiktoken, TiktokenModel } from 'js-tiktoken';

/**
 * Token counting and management service
 */
export class TokenManager {
  private encoders: Map<string, Tiktoken> = new Map();
  private static instance: TokenManager;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Count tokens in a text string for a specific model
   */
  public countTokens(text: string, model: string = 'gpt-4'): number {
    try {
      const encoder = this.getEncoder(model);
      const tokens = encoder.encode(text);
      return tokens.length;
    } catch (_error) {
      // Fallback to rough estimation if encoding fails
      // Error silently handled - estimation is acceptable fallback
      return this.estimateTokens(text);
    }
  }

  /**
   * Count tokens for multiple texts
   */
  public countTokensBatch(texts: string[], model: string = 'gpt-4'): number {
    return texts.reduce((total, text) => total + this.countTokens(text, model), 0);
  }

  /**
   * Estimate tokens without encoding (faster but less accurate)
   */
  public estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to fit within token limit
   */
  public truncateToTokenLimit(
    text: string,
    maxTokens: number,
    modelName: string = 'gpt-4',
  ): string {
    const currentTokens = this.countTokens(text, modelName);

    if (currentTokens <= maxTokens) {
      return text;
    }

    const encoder = this.getEncoder(modelName);
    const tokens = encoder.encode(text);
    const truncatedTokens = Array.from(tokens.slice(0, maxTokens));

    return encoder.decode(truncatedTokens);
  }

  /**
   * Split text into chunks that fit within token limit
   */
  public splitIntoChunks(
    text: string,
    maxTokensPerChunk: number,
    overlap: number = 0,
    model: string = 'gpt-4',
  ): string[] {
    const encoder = this.getEncoder(model);
    const tokens = encoder.encode(text);
    const chunks: string[] = [];

    let start = 0;
    while (start < tokens.length) {
      const end = Math.min(start + maxTokensPerChunk, tokens.length);
      const chunkTokens = tokens.slice(start, end);
      chunks.push(encoder.decode(chunkTokens));

      start = end - overlap;
      if (start >= tokens.length) break;
    }

    return chunks;
  }

  /**
   * Calculate cost for token usage
   */
  public calculateCost(
    inputTokens: number,
    outputTokens: number,
    costPerMillionInput: number,
    costPerMillionOutput: number,
  ): number {
    const inputCost = (inputTokens / 1_000_000) * costPerMillionInput;
    const outputCost = (outputTokens / 1_000_000) * costPerMillionOutput;
    return inputCost + outputCost;
  }

  /**
   * Get or create encoder for a model
   */
  private getEncoder(model: string): Tiktoken {
    if (!this.encoders.has(model)) {
      try {
        // Map model names to tiktoken models
        const tiktokenModel = this.mapToTiktokenModel(model);
        const encoder = encodingForModel(tiktokenModel);
        this.encoders.set(model, encoder);
      } catch (_error) {
        // Fallback to gpt-4 encoding if model-specific encoding fails
        const encoder = encodingForModel('gpt-4' as TiktokenModel);
        this.encoders.set(model, encoder);
      }
    }
    return this.encoders.get(model)!;
  }

  /**
   * Map model names to Tiktoken model names
   */
  private mapToTiktokenModel(model: string): TiktokenModel {
    // Claude models use similar tokenization to GPT-4
    if (model.startsWith('claude')) {
      return 'gpt-4' as TiktokenModel;
    }

    // Gemini models
    if (model.startsWith('gemini')) {
      return 'gpt-4' as TiktokenModel;
    }

    // GPT models
    if (model.includes('gpt-4')) {
      return 'gpt-4' as TiktokenModel;
    }
    if (model.includes('gpt-3.5')) {
      return 'gpt-3.5-turbo' as TiktokenModel;
    }

    return 'gpt-4' as TiktokenModel;
  }

  /**
   * Free encoder resources
   */
  public dispose(): void {
    this.encoders.forEach((_encoder) => {
      // Note: js-tiktoken Tiktoken doesn't have free() method
      // Memory will be garbage collected automatically
    });
    this.encoders.clear();
  }
}
