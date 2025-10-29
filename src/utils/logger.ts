/* eslint-disable no-console */
import pino from 'pino';
import chalk from 'chalk';

/**
 * Logger configuration based on environment
 */
const isTest = process.env.NODE_ENV === 'test';
const logLevel = process.env.ARCHDOC_LOG_LEVEL || (isTest ? 'silent' : 'info');

/**
 * Log level priorities for filtering
 */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/**
 * Enhanced Logger class with colorful console-like output and singleton pattern.
 * Provides clean, visual logging similar to console.log but with structured logging support.
 *
 * Features:
 * - Colorful output with emoji icons for different log levels
 * - Clean formatting similar to console.log
 * - Singleton root logger with child loggers per context
 * - Consistent output in both development and production
 * - Matches tech-debt-api singleton service patterns
 *
 * @example
 * const logger = new Logger('FileStructureAgent');
 * logger.info('Starting analysis', { fileCount: 156 });
 * logger.error('Failed to process file', new Error('File not found'), { file: 'test.ts' });
 */
export class Logger {
  private static rootLogger: pino.Logger;
  private context: string;
  private logger: pino.Logger;

  constructor(context: string) {
    this.context = context;

    // Initialize root Pino logger once (singleton pattern) - kept for future extensibility
    if (!Logger.rootLogger) {
      Logger.rootLogger = pino({
        level: logLevel === 'silent' ? 'silent' : 'debug',
        enabled: false, // Disabled - using console output directly
      });
    }

    // Create child logger with context
    this.logger = Logger.rootLogger.child({ context });
  }

  /**
   * Check if a log level should be output based on current log level setting
   */
  private shouldLog(level: keyof typeof LOG_LEVELS): boolean {
    if (logLevel === 'silent') return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[logLevel as keyof typeof LOG_LEVELS];
  }

  /**
   * Format metadata object for display
   */
  private formatMeta(meta?: object): string {
    if (!meta || Object.keys(meta).length === 0) return '';
    return ' ' + chalk.gray(JSON.stringify(meta));
  }

  /**
   * Get timestamp string
   */
  private getTimestamp(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0]; // HH:MM:SS
  }

  /**
   * Log debug-level message (gray with 🔍 icon or custom emoji)
   * @param message - The log message
   * @param emojiOrMeta - Optional custom emoji string, OR metadata object
   */
  debug(message: string, emojiOrMeta?: string | object): void {
    if (!this.shouldLog('debug')) return;

    const { emoji, meta } = this.parseEmojiAndMeta(emojiOrMeta);
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const icon = emoji || '🔍';
    const contextStr = chalk.gray(`[${this.context}]`);
    const msg = chalk.gray(message);
    console.log(`${timestamp} ${icon} ${contextStr} ${msg}${this.formatMeta(meta)}`);
  }

  /**
   * Log info-level message (blue with ℹ️ icon or custom emoji)
   * @param message - The log message
   * @param emojiOrMeta - Optional custom emoji string, OR metadata object
   */
  info(message: string, emojiOrMeta?: string | object): void {
    if (!this.shouldLog('info')) return;

    const { emoji, meta } = this.parseEmojiAndMeta(emojiOrMeta);
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const icon = emoji ? `${emoji}` : 'ℹ️';
    const contextStr = chalk.cyan(`[${this.context}]`);
    const msg = chalk.white(message);
    console.log(`${timestamp} ${icon} ${contextStr} ${msg}${this.formatMeta(meta)}`);
  }

  /**
   * Log warning message (yellow with ⚠️ icon or custom emoji)
   * @param message - The log message
   * @param emojiOrMeta - Optional custom emoji string, OR metadata object
   */
  warn(message: string, emojiOrMeta?: string | object): void {
    if (!this.shouldLog('warn')) return;

    const { emoji, meta } = this.parseEmojiAndMeta(emojiOrMeta);
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const icon = emoji ? `${emoji}` : '⚠️';
    const contextStr = chalk.yellow(`[${this.context}]`);
    const msg = chalk.yellow(message);
    console.log(`${timestamp} ${icon} ${contextStr} ${msg}${this.formatMeta(meta)}`);
  }

  /**
   * Log error message (red with ❌ icon or custom emoji)
   * @param message - The log message
   * @param emojiOrError - Optional custom emoji string, OR error object
   * @param meta - Optional metadata object (only used if second param is emoji)
   */
  error(message: string, emojiOrError?: string | unknown, meta?: object): void {
    if (!this.shouldLog('error')) return;

    let emoji: string | undefined;
    let error: unknown;
    let actualMeta = meta;

    // Parse parameters: could be (message, emoji), (message, error), or (message, emoji, meta/error)
    if (typeof emojiOrError === 'string' && emojiOrError.length <= 3) {
      // It's an emoji
      emoji = emojiOrError;
      // meta is already set from third parameter
    } else {
      // It's an error object
      error = emojiOrError;
      actualMeta = meta;
    }

    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const icon = emoji || '❌';
    const contextStr = chalk.red(`[${this.context}]`);
    const msg = chalk.red(message);
    console.error(`${timestamp} ${icon} ${contextStr} ${msg}${this.formatMeta(actualMeta)}`);

    // Print error stack if available
    if (error instanceof Error && error.stack) {
      console.error(chalk.red(error.stack));
    } else if (error) {
      console.error(chalk.red(String(error)));
    }
  }

  /**
   * Parse emoji and meta from a single parameter that could be either
   */
  private parseEmojiAndMeta(emojiOrMeta?: string | object): { emoji?: string; meta?: object } {
    if (typeof emojiOrMeta === 'string') {
      // Single emoji character or very short string
      if (emojiOrMeta.length <= 3) {
        return { emoji: emojiOrMeta, meta: undefined };
      }
      // Long string is not emoji, treat as invalid
      return { emoji: undefined, meta: undefined };
    }
    // It's metadata
    return { emoji: undefined, meta: emojiOrMeta };
  }

  /**
   * Get the underlying pino logger instance for advanced usage
   */
  getLogger(): pino.Logger {
    return this.logger;
  }

  /**
   * Get the singleton root logger instance (for testing or advanced usage)
   */
  static getRootLogger(): pino.Logger | undefined {
    return Logger.rootLogger;
  }
}
