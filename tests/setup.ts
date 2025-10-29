// Global test setup
// Environment variables are mocked in tests as needed

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.ARCHDOC_LOG_LEVEL = 'silent'; // Logger will be silent in tests

// Increase test timeout for LLM calls
jest.setTimeout(30000);

// Add custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
