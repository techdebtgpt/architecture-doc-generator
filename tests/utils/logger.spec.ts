import { Logger } from '../../src/utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    // Reset environment for each test
    process.env.NODE_ENV = 'test';
    process.env.ARCHDOC_LOG_LEVEL = 'silent';
  });

  it('should create logger instances with context', () => {
    const logger1 = new Logger('Agent1');
    const logger2 = new Logger('Agent2');

    expect(logger1).toBeDefined();
    expect(logger2).toBeDefined();
    expect(logger1).not.toBe(logger2);
  });

  it('should share the same root logger (singleton)', () => {
    // Create two loggers to ensure root is initialized
    new Logger('Agent1');
    new Logger('Agent2');

    const root1 = Logger.getRootLogger();
    const root2 = Logger.getRootLogger();

    expect(root1).toBeDefined();
    expect(root2).toBeDefined();
    expect(root1).toBe(root2); // Same instance
  });

  it('should have all logging methods', () => {
    const logger = new Logger('TestAgent');

    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('should not throw when logging in silent mode', () => {
    const logger = new Logger('TestAgent');

    expect(() => logger.debug('Debug message')).not.toThrow();
    expect(() => logger.info('Info message')).not.toThrow();
    expect(() => logger.warn('Warning message')).not.toThrow();
    expect(() => logger.error('Error message')).not.toThrow();
  });

  it('should handle error objects', () => {
    const logger = new Logger('TestAgent');
    const error = new Error('Test error');

    expect(() => logger.error('Error occurred', error)).not.toThrow();
    expect(() => logger.error('Error occurred', error, { extra: 'data' })).not.toThrow();
  });

  it('should handle metadata objects', () => {
    const logger = new Logger('TestAgent');

    expect(() => logger.info('Message with meta', { key: 'value' })).not.toThrow();
    expect(() => logger.debug('Debug with meta', { count: 42 })).not.toThrow();
  });

  it('should provide access to underlying pino logger', () => {
    const logger = new Logger('TestAgent');
    const pinoLogger = logger.getLogger();

    expect(pinoLogger).toBeDefined();
    expect(typeof pinoLogger.info).toBe('function');
  });
});
