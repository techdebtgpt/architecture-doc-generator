module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.types.ts',
    '!src/index.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 70,
      lines: 25,
      statements: 30,
    },
  },
  moduleNameMapper: {
    '^@agents/(.*)$': '<rootDir>/src/agents/$1',
    '^@orchestrator/(.*)$': '<rootDir>/src/orchestrator/$1',
    '^@scanners/(.*)$': '<rootDir>/src/scanners/$1',
    '^@parsers/(.*)$': '<rootDir>/src/parsers/$1',
    '^@prompts/(.*)$': '<rootDir>/src/prompts/$1',
    '^@llm/(.*)$': '<rootDir>/src/llm/$1',
    '^@outputs/(.*)$': '<rootDir>/src/outputs/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@cache/(.*)$': '<rootDir>/src/cache/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
        },
      },
    ],
  },
};
