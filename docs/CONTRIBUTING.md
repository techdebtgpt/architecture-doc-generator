# Contributing Guide

> Guide for contributors to the Architecture Documentation Generator project

## Table of Contents

- [Welcome](#welcome)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Creating Custom Agents](#creating-custom-agents)
- [Testing](#testing)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Welcome

Thank you for considering contributing to the Architecture Documentation Generator! We welcome contributions of all kinds:

- 🐛 Bug reports and fixes
- ✨ New features and agents
- 📖 Documentation improvements
- 🎨 UI/UX enhancements
- 🧪 Tests and quality improvements
- 💡 Ideas and suggestions

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**
- API key for at least one LLM provider (Anthropic, OpenAI, or Google)

### Initial Setup

1. **Fork and Clone**

```bash
# Fork the repository on GitHub first
git clone https://github.com/YOUR_USERNAME/architecture-doc-generator.git
cd architecture-doc-generator
```

2. **Install Dependencies**

```bash
npm install
```

3. **Setup Configuration**

Create configuration file:

```bash
# Copy example config
cp .archdoc.config.example.json .arch-docs/.archdoc.config.json

# Edit and add your API key
nano .arch-docs/.archdoc.config.json
```

Add your API key for at least one LLM provider:

```json
{
  "apiKeys": {
    "anthropic": "sk-ant-your-key",
    "openai": "",
    "google": ""
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  },
  "tracing": {
    "enabled": true,
    "apiKey": "lsv2_pt_your-key",
    "project": "archdoc-dev"
  }
}
```

4. **Build Project**

```bash
npm run build
```

5. **Run Tests**

```bash
npm test
```

6. **Test CLI Locally**

```bash
# Link for local testing
npm link

# Test the CLI
archdoc analyze ./test-project --verbose
```

## Project Structure

```
architecture-doc-generator/
├── cli/                          # CLI application
│   ├── index.ts                  # Entry point
│   └── commands/                 # Command implementations
│       ├── analyze.command.ts
│       ├── generate.command.ts
│       └── export.command.ts
├── src/                          # Core library
│   ├── index.ts                  # Public API exports
│   ├── agents/                   # Agent implementations
│   │   ├── agent.interface.ts    # Agent interface
│   │   ├── agent-registry.ts     # Agent registry
│   │   ├── base-agent-workflow.ts
│   │   ├── file-structure-agent.ts
│   │   ├── dependency-analyzer-agent.ts
│   │   ├── pattern-detector-agent.ts
│   │   ├── flow-visualization-agent.ts
│   │   ├── schema-generator-agent.ts
│   │   └── architecture-analyzer-agent.ts
│   ├── orchestrator/             # Workflow coordination
│   │   ├── documentation-orchestrator.ts
│   │   └── agent-selector.ts
│   ├── scanners/                 # File system scanning
│   │   └── file-system-scanner.ts
│   ├── llm/                      # LLM service
│   │   ├── llm-service.ts
│   │   └── providers/
│   ├── formatters/               # Output formatters
│   │   ├── multi-file-markdown-formatter.ts
│   │   ├── single-file-markdown-formatter.ts
│   │   └── json-formatter.ts
│   ├── types/                    # TypeScript types
│   │   ├── agent.types.ts
│   │   ├── output.types.ts
│   │   └── config.types.ts
│   └── config/                   # Configuration
│       └── default-config.ts
├── tests/                        # Test files
│   ├── setup.ts
│   └── **/*.test.ts
├── docs/                         # Documentation
├── examples/                     # Usage examples
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── jest.config.js
└── .eslintrc.js
```

### Key Directories

- **`cli/`** - Command-line interface implementation
- **`src/agents/`** - All agent implementations
- **`src/orchestrator/`** - Workflow and execution management
- **`src/llm/`** - LLM service and provider abstractions
- **`src/formatters/`** - Output format generators
- **`tests/`** - Unit and integration tests

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/bug-description
```

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test improvements

### 2. Make Changes

Follow the [Code Style](#code-style) guidelines.

### 3. Test Changes

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format
```

### 4. Build and Test CLI

```bash
# Build
npm run build

# Test CLI locally
node dist/cli/index.js analyze ./test-project --verbose
```

### 5. Commit Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new pattern detection agent"
git commit -m "fix: resolve token counting issue"
git commit -m "docs: update installation instructions"
git commit -m "refactor: improve agent registry performance"
git commit -m "test: add tests for dependency analyzer"
```

### 6. Push and Create PR

```bash
git push origin feature/my-new-feature
```

Then create a Pull Request on GitHub.

## Creating Custom Agents

### Agent Interface

Every agent must implement the `Agent` interface:

```typescript
interface Agent {
  getMetadata(): AgentMetadata;
  execute(context: AgentContext, options?: AgentExecutionOptions): Promise<AgentResult>;
}
```

### Step-by-Step Guide

#### 1. Create Agent File

Create `src/agents/my-custom-agent.ts`:

```typescript
import { Agent, AgentContext, AgentResult, AgentMetadata, AgentPriority } from '../types/agent.types';
import { LLMService } from '../llm/llm-service';
import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

export class MyCustomAgent implements Agent {
  private llmService: LLMService;

  constructor() {
    this.llmService = LLMService.getInstance();
  }

  public getMetadata(): AgentMetadata {
    return {
      name: 'my-custom-agent',
      version: '1.0.0',
      description: 'Analyzes specific aspects of the codebase',
      priority: AgentPriority.MEDIUM,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: true,
        dependencies: [], // Other agents this depends on
        supportsIncremental: false,
        estimatedTokens: 5000,
        supportedLanguages: ['typescript', 'javascript', 'python'],
      },
      tags: ['analysis', 'custom'],
    };
  }

  public async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // Build analysis chain
      const chain = this.buildAnalysisChain(context, options);

      // Prepare input
      const input = {
        files: context.files,
        projectPath: context.projectPath,
        metadata: context.projectMetadata,
      };

      // Execute chain with unified tracing
      const analysis = await chain.invoke(input, options?.runnableConfig);

      // Format result
      return {
        agentName: this.getMetadata().name,
        status: 'success',
        data: { analysis },
        summary: `Analysis completed with ${context.files.length} files`,
        markdown: this.formatMarkdownReport(analysis),
        confidence: 0.9,
        tokenUsage: {
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
        },
        executionTime: Date.now() - startTime,
        errors: [],
        warnings: [],
        metadata: {},
      };
    } catch (error) {
      return {
        agentName: this.getMetadata().name,
        status: 'error',
        data: {},
        summary: `Analysis failed: ${error.message}`,
        markdown: '',
        confidence: 0,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        executionTime: Date.now() - startTime,
        errors: [error.message],
        warnings: [],
        metadata: {},
      };
    }
  }

  private buildAnalysisChain(context: AgentContext, options?: AgentExecutionOptions) {
    const model = this.llmService.getChatModel({ temperature: 0.2 });

    return RunnableSequence.from([
      // Step 1: Prepare data
      RunnableLambda.from(async (input: any) => {
        // Extract relevant information from files
        const fileList = input.files.join('\n');
        return { fileList, metadata: input.metadata };
      }).withConfig({ runName: 'PrepareData' }),

      // Step 2: Build prompt
      RunnableLambda.from(async (input: any) => {
        const systemPrompt = new SystemMessage(`
          You are an expert software architect analyzing a codebase.
          Your task is to [SPECIFIC ANALYSIS TASK].
          
          Provide detailed, actionable insights.
        `);

        const humanPrompt = new HumanMessage(`
          Project: ${input.metadata.name}
          Files:
          ${input.fileList}
          
          Please analyze and provide insights.
        `);

        return [systemPrompt, humanPrompt];
      }).withConfig({ runName: 'BuildPrompt' }),

      // Step 3: LLM analysis
      model.withConfig({ runName: 'LLMAnalysis' }),

      // Step 4: Parse output
      new StringOutputParser(),
    ]);
    // NOTE: No .withConfig() on the sequence itself!
  }

  private formatMarkdownReport(analysis: string): string {
    return `
# My Custom Analysis

${analysis}

---
*Generated by My Custom Agent*
    `.trim();
  }
}
```

#### 2. Register Agent

Add to `src/agents/agent-registry.ts`:

```typescript
import { MyCustomAgent } from './my-custom-agent';

// In constructor or setup method
this.register(new MyCustomAgent());
```

#### 3. Add Tests

Create `tests/agents/my-custom-agent.test.ts`:

```typescript
import { MyCustomAgent } from '../../src/agents/my-custom-agent';
import { AgentContext } from '../../src/types/agent.types';

describe('MyCustomAgent', () => {
  let agent: MyCustomAgent;
  let mockContext: AgentContext;

  beforeEach(() => {
    agent = new MyCustomAgent();
    mockContext = {
      projectPath: '/test/project',
      files: ['src/index.ts', 'src/utils.ts'],
      fileContents: new Map(),
      scanResult: {} as any,
      projectMetadata: {
        name: 'test-project',
        languages: ['typescript'],
        size: 1000,
      },
    };
  });

  it('should have correct metadata', () => {
    const metadata = agent.getMetadata();
    expect(metadata.name).toBe('my-custom-agent');
    expect(metadata.version).toBe('1.0.0');
  });

  it('should execute successfully', async () => {
    const result = await agent.execute(mockContext);
    expect(result.status).toBe('success');
    expect(result.agentName).toBe('my-custom-agent');
  });
});
```

#### 4. Document Agent

Add to `README.md` and `ARCHITECTURE.md`.

### Agent Best Practices

1. **Use LCEL Runnables** - For composable, traceable workflows
2. **Pass Config to Invoke** - Enable unified LangSmith tracing
3. **Handle Errors Gracefully** - Return error status, don't throw
4. **Estimate Tokens** - Provide realistic token estimates
5. **Format Markdown** - Consistent, readable output
6. **Support Parallel Execution** - Unless dependencies exist
7. **Log Progress** - Use verbose logging for debugging

### Example Agents to Reference

- **`file-structure-agent.ts`** - Basic analysis pattern
- **`dependency-analyzer-agent.ts`** - Complex data extraction
- **`pattern-detector-agent.ts`** - Pattern matching logic
- **`architecture-analyzer-agent.ts`** - High-level synthesis

## Testing

### Test Structure

```
tests/
├── setup.ts                    # Jest setup
├── agents/                     # Agent tests
│   ├── file-structure-agent.test.ts
│   ├── dependency-analyzer-agent.test.ts
│   └── pattern-detector-agent.test.ts
├── orchestrator/               # Orchestrator tests
│   └── documentation-orchestrator.test.ts
├── scanners/                   # Scanner tests
│   └── file-system-scanner.test.ts
├── formatters/                 # Formatter tests
│   └── multi-file-markdown-formatter.test.ts
└── integration/                # Integration tests
    └── full-workflow.test.ts
```

### Writing Tests

#### Unit Test Example

```typescript
import { FileStructureAgent } from '../../src/agents/file-structure-agent';

describe('FileStructureAgent', () => {
  let agent: FileStructureAgent;

  beforeEach(() => {
    agent = new FileStructureAgent();
  });

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = agent.getMetadata();
      
      expect(metadata.name).toBe('file-structure');
      expect(metadata.priority).toBeDefined();
      expect(metadata.capabilities.supportsParallel).toBe(true);
    });
  });

  describe('execute', () => {
    it('should analyze file structure', async () => {
      const context = createMockContext();
      const result = await agent.execute(context);
      
      expect(result.status).toBe('success');
      expect(result.markdown).toContain('# File Structure');
    });

    it('should handle errors gracefully', async () => {
      const context = createInvalidContext();
      const result = await agent.execute(context);
      
      expect(result.status).toBe('error');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
```

#### Integration Test Example

```typescript
import { DocumentationOrchestrator } from '../../src/orchestrator/documentation-orchestrator';

describe('Full Documentation Workflow', () => {
  it('should generate complete documentation', async () => {
    const orchestrator = createOrchestrator();
    const projectPath = './test-fixtures/sample-project';
    
    const output = await orchestrator.generateDocumentation(projectPath, {
      maxTokens: 10000,
      parallel: false,
      iterativeRefinement: { enabled: false }
    });
    
    expect(output.projectName).toBe('sample-project');
    expect(output.agentResults.size).toBeGreaterThan(0);
    expect(output.summary).toBeDefined();
  });
});
```

### Mocking LLM Calls

```typescript
jest.mock('../../src/llm/llm-service', () => ({
  LLMService: {
    getInstance: jest.fn(() => ({
      getChatModel: jest.fn(() => ({
        invoke: jest.fn().mockResolvedValue({
          content: 'Mock analysis result'
        })
      }))
    }))
  }
}));
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# Specific file
npm test -- file-structure-agent.test.ts

# Integration tests
npm run test:integration
```

## Code Style

### TypeScript Guidelines

- Use **TypeScript** for all code
- Enable **strict mode**
- Provide explicit **return types**
- Use **interfaces** for public APIs
- Use **types** for internal structures

### Formatting

```typescript
// ✅ Good
export class MyAgent implements Agent {
  private llmService: LLMService;

  constructor() {
    this.llmService = LLMService.getInstance();
  }

  public async execute(context: AgentContext): Promise<AgentResult> {
    // Implementation
  }
}

// ❌ Bad
export class MyAgent implements Agent{
    private llmService:LLMService;
    constructor(){
        this.llmService=LLMService.getInstance()
    }
    public async execute(context:AgentContext):Promise<AgentResult>{
        // Implementation
    }
}
```

### Naming Conventions

- **Classes**: `PascalCase` - `FileStructureAgent`
- **Interfaces**: `PascalCase` - `Agent`, `AgentContext`
- **Methods**: `camelCase` - `execute()`, `getMetadata()`
- **Constants**: `UPPER_SNAKE_CASE` - `MAX_FILE_SIZE`
- **Files**: `kebab-case` - `file-structure-agent.ts`

### Import Order

```typescript
// 1. External dependencies
import { RunnableSequence } from '@langchain/core/runnables';
import chalk from 'chalk';

// 2. Internal imports
import { Agent, AgentContext } from '../types/agent.types';
import { LLMService } from '../llm/llm-service';
```

### Comments and Documentation

```typescript
/**
 * Analyzes file structure and organization of a project.
 * 
 * @remarks
 * This agent examines the directory tree, identifies key files,
 * and provides insights into project organization.
 * 
 * @example
 * ```typescript
 * const agent = new FileStructureAgent();
 * const result = await agent.execute(context);
 * ```
 */
export class FileStructureAgent implements Agent {
  /**
   * Executes the file structure analysis.
   * 
   * @param context - The agent execution context
   * @param options - Optional execution options
   * @returns Analysis result with markdown documentation
   */
  public async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    // Implementation
  }
}
```

### Linting

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Pull Request Process

### 1. Before Submitting

- ✅ Tests pass (`npm test`)
- ✅ Linting passes (`npm run lint`)
- ✅ Code is formatted (`npm run format`)
- ✅ Documentation updated
- ✅ Commit messages follow conventions
- ✅ Branch is up to date with `main`

### 2. PR Title

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add security analysis agent
fix: resolve token counting bug in LLM service
docs: update integration guide with examples
refactor: improve agent registry performance
test: add tests for pattern detector agent
```

### 3. PR Description

Use the template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass
- [ ] No new warnings

## Related Issues
Closes #123
```

### 4. Review Process

- Code will be reviewed by maintainers
- Address feedback promptly
- Keep PR focused and manageable
- Respond to comments professionally

### 5. Merging

- PRs require 1 approval
- All CI checks must pass
- Maintainers will merge approved PRs

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0) - Breaking changes
- **MINOR** (0.1.0) - New features, backwards compatible
- **PATCH** (0.0.1) - Bug fixes

### Release Steps (Maintainers Only)

1. **Update Version**

```bash
npm version patch  # or minor, or major
```

2. **Update Changelog**

Add release notes to `CHANGELOG.md`

3. **Build**

```bash
npm run build
```

4. **Test**

```bash
npm test
npm run test:integration
```

5. **Publish**

```bash
npm publish
```

6. **Tag Release**

```bash
git tag v0.1.0
git push origin v0.1.0
```

7. **Create GitHub Release**

Add release notes and artifacts

## Community

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- No harassment or discrimination

### Getting Help

- 📖 Read the [documentation](./README.md)
- 💬 [GitHub Discussions](https://github.com/ritech/architecture-doc-generator/discussions)
- 🐛 [Report Issues](https://github.com/ritech/architecture-doc-generator/issues)
- 📧 Email: support@ritech.com

### Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes

---

**Thank you for contributing! 🎉**

**See Also:**

- [📖 User Guide](./USER_GUIDE.md) - How to use the tool
- [🏗️ Architecture](./ARCHITECTURE.md) - System design
- [🔌 Integration Guide](./INTEGRATION_GUIDE.md) - CI/CD integration
- [📚 API Reference](./API.md) - Programmatic API

**Navigation:**

[🏠 Home](../README.md) · [📖 Docs Index](./README.md) · [📖 User Guide](./USER_GUIDE.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [🔌 Integration](./INTEGRATION_GUIDE.md)
