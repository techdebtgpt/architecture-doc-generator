module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    '.eslintrc.js',
    'jest.config.js',
    'test-integration.ts',
    'dist',
    'node_modules',
    'scripts/**/*.js',
  ],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off', // Disabled - project uses any types for dynamic LLM outputs
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'no-console': ['error', { allow: ['warn', 'error'] }], // Forbid console.log in src/, use Logger class instead
    'prettier/prettier': 'error',
  },
  overrides: [
    {
      files: ['cli/**/*.ts'],
      rules: {
        'no-console': 'off', // CLI commands use console.log for user-facing output (with chalk for colors)
      },
    },
  ],
};
