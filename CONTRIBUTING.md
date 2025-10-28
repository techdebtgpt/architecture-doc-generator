# Contributing to ArchDoc Generator

Thank you for your interest in contributing to ArchDoc Generator! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Creating Custom Agents](#creating-custom-agents)
- [Documentation](#documentation)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/architecture-doc-generator.git`
3. Add upstream remote: `git remote add upstream https://github.com/ritech/architecture-doc-generator.git`

## Development Setup

```bash
cd architecture-doc-generator
npm install
npm run build
```

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- TypeScript >= 5.0.0

### Environment Variables

Create a `.env` file:

```bash
# Choose one LLM provider
ANTHROPIC_API_KEY=your_key
# OR
OPENAI_API_KEY=your_key
# OR
GOOGLE_API_KEY=your_key

# Optional: LangSmith tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_key
LANGCHAIN_PROJECT=archdoc-dev
```

## Making Changes

### Branch Naming

- `feature/your-feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation changes
- `refactor/code-improvement` - Code refactoring
- `test/test-improvements` - Test additions or changes

### Commit Messages

Follow conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(agents): add security analysis agent
fix(scanner): handle symlinks correctly
docs(readme): update installation instructions
```

### Code Style

- Follow TypeScript best practices
- Use 2 spaces for indentation
- Run `npm run lint:fix` before committing
- Ensure all tests pass: `npm test`

### Type Safety

- Avoid `any` types - use proper TypeScript types
- Document public APIs with JSDoc comments
- Export types for public interfaces

## Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# Integration tests
npm run test:integration
```

### Writing Tests

Place tests in `tests/` directory mirroring `src/` structure:

```typescript
// tests/unit/agents/file-structure-agent.spec.ts
import { FileStructureAgent } from '@agents/file-structure-agent';

describe('FileStructureAgent', () => {
  let agent: FileStructureAgent;

  beforeEach(() => {
    agent = new FileStructureAgent();
  });

  it('should analyze directory structure', async () => {
    const context = createMockContext();
    const result = await agent.execute(context);
    
    expect(result.status).toBe('success');
    expect(result.data).toHaveProperty('directoryTree');
  });
});
```

### Test Coverage

Maintain at least 70% code coverage:
- Unit tests for all agents
- Integration tests for workflows
- E2E tests for CLI commands

## Submitting Changes

1. **Update from upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run quality checks**:
   ```bash
   npm run lint
   npm test
   npm run build
   ```

3. **Push to your fork**:
   ```bash
   git push origin your-branch-name
   ```

4. **Create Pull Request**:
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes you made and why
   - Include screenshots for UI changes
   - List any breaking changes

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Added/updated unit tests
- [ ] Added/updated integration tests
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No new warnings or errors
- [ ] Commit messages follow conventions
```

## Creating Custom Agents

Want to contribute a new agent? Here's the process:

1. **Create agent file**: `src/agents/your-agent.ts`

```typescript
import { Agent } from './agent.interface';
import { AgentContext, AgentResult, AgentMetadata, AgentPriority } from '../types/agent.types';
import { LLMService } from '@llm/llm-service';

export class YourAgent implements Agent {
  private llmService: LLMService;

  constructor() {
    this.llmService = LLMService.getInstance();
  }

  getMetadata(): AgentMetadata {
    return {
      name: 'your-agent',
      version: '1.0.0',
      description: 'What your agent does',
      priority: AgentPriority.MEDIUM,
      capabilities: {
        supportsParallel: true,
        requiresFileContents: true,
        dependencies: [],
        supportsIncremental: true,
        estimatedTokens: 5000,
        supportedLanguages: [], // Empty = all languages
      },
      tags: ['analysis', 'your-category'],
    };
  }

  async canExecute(context: AgentContext): Promise<boolean> {
    // Check if agent can run with this context
    return context.files.length > 0;
  }

  async estimateTokens(context: AgentContext): Promise<number> {
    // Estimate token usage
    return context.files.length * 100;
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      // Your analysis logic here
      const analysis = await this.analyzeProject(context);
      
      return {
        agentName: 'your-agent',
        status: 'success',
        data: analysis,
        summary: 'Analysis completed',
        markdown: this.generateMarkdown(analysis),
        confidence: 0.9,
        tokenUsage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
        executionTime: Date.now() - startTime,
        errors: [],
        warnings: [],
        metadata: {},
      };
    } catch (error) {
      return {
        agentName: 'your-agent',
        status: 'failed',
        data: {},
        summary: `Failed: ${error.message}`,
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

  private async analyzeProject(context: AgentContext): Promise<any> {
    // Implementation
  }

  private generateMarkdown(analysis: any): string {
    // Generate markdown documentation
    return `## Your Agent Analysis\n\n${JSON.stringify(analysis, null, 2)}`;
  }
}
```

2. **Create tests**: `tests/unit/agents/your-agent.spec.ts`

3. **Create documentation**: Document your agent in `docs/AGENTS.md`

4. **Submit PR** with:
   - Agent implementation
   - Unit tests (>70% coverage)
   - Integration test
   - Documentation
   - Example usage

## Documentation

- Update README.md for user-facing changes
- Update API_REFERENCE.md for API changes
- Add examples to `examples/` directory
- Document new features in CHANGELOG.md

### Documentation Style

- Use clear, concise language
- Include code examples
- Add diagrams where helpful (Mermaid syntax)
- Keep formatting consistent

## Questions?

- Open an issue for bugs or feature requests
- Join discussions for questions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ArchDoc Generator! 🎉
