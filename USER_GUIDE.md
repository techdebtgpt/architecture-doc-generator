# Architecture Documentation Generator - User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [CLI Usage](#cli-usage)
5. [Programmatic API](#programmatic-api)
6. [Configuration](#configuration)
7. [Output Formats](#output-formats)
8. [Advanced Usage](#advanced-usage)
9. [Examples](#examples)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

The Architecture Documentation Generator is an AI-powered tool that automatically creates comprehensive documentation for software projects. It analyzes your codebase using Large Language Models (LLMs) and generates human-readable documentation covering:

- **Project Structure** - File organization and module architecture
- **Dependencies** - External packages and internal imports
- **Design Patterns** - Identified architectural and code patterns
- **Code Quality** - Metrics, complexity analysis, and technical debt
- **Best Practices** - Recommendations for improvement

### Key Features

✅ **Language Agnostic** - Works with any programming language  
✅ **AI-Powered** - Uses Claude, GPT-4, or Gemini for intelligent analysis  
✅ **No Setup Required** - No language-specific parsers or configurations  
✅ **Multiple Formats** - Markdown, JSON, or HTML output  
✅ **Extensible** - Add custom agents for specialized analysis  
✅ **CLI & API** - Use as command-line tool or integrate into your workflow

---

## Installation

### Prerequisites

- **Node.js** 18+ and npm
- **API Key** for at least one LLM provider (Anthropic, OpenAI, or Google)

### Install from NPM

```bash
npm install -g @archdoc/generator
```

### Install from Source

```bash
git clone https://github.com/your-org/architecture-doc-generator.git
cd architecture-doc-generator
npm install
npm run build
npm link
```

### Verify Installation

```bash
archdoc --version
archdoc --help
```

---

## Quick Start

### 1. Set Your API Key

Choose one provider and set the corresponding environment variable:

```bash
# For Anthropic Claude (recommended)
export ANTHROPIC_API_KEY="sk-ant-your-key-here"

# Or for OpenAI
export OPENAI_API_KEY="sk-your-key-here"

# Or for Google Gemini
export GOOGLE_API_KEY="your-key-here"
```

**Windows (PowerShell)**:
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-your-key-here"
```

### 2. Generate Documentation

```bash
# Navigate to your project directory
cd /path/to/your/project

# Generate documentation
archdoc generate . --output ./docs
```

### 3. View Results

```bash
# Open the generated documentation
open docs/architecture.md
```

That's it! Your documentation is now available in Markdown format.

---

## CLI Usage

### Command: `generate`

Generate complete architecture documentation for a project.

```bash
archdoc generate <project-path> [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | `./docs/architecture` |
| `-f, --format <format>` | Output format (markdown, json, html) | `markdown` |
| `--provider <provider>` | LLM provider (anthropic, openai, google) | `anthropic` |
| `--model <model>` | Specific model to use | Provider default |
| `--agents <agents>` | Comma-separated list of agents | All enabled |
| `--parallel` | Run agents in parallel | `false` |
| `--config <path>` | Configuration file path | `.archdoc.config.json` |
| `--verbose` | Verbose output | `false` |
| `--no-cache` | Disable caching | Caching enabled |

#### Examples

**Basic usage:**
```bash
archdoc generate ./my-project
```

**Custom output location:**
```bash
archdoc generate ./my-project --output ./documentation
```

**Use specific LLM provider:**
```bash
archdoc generate ./my-project --provider openai --model gpt-4-turbo
```

**Enable parallel execution:**
```bash
archdoc generate ./my-project --parallel --verbose
```

**Run specific agents:**
```bash
archdoc generate ./my-project --agents file-structure,dependency-analysis
```

### Command: `analyze`

Quick structural analysis without heavy LLM usage (useful for previewing).

```bash
archdoc analyze <project-path> [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--verbose` | Detailed output | `false` |
| `--json` | Output as JSON | Text output |
| `--max-files <number>` | Maximum files to scan | `10000` |

#### Examples

**Analyze project structure:**
```bash
archdoc analyze ./my-project --verbose
```

**Get JSON output:**
```bash
archdoc analyze ./my-project --json > analysis.json
```

### Command: `export`

Convert existing documentation to different formats.

```bash
archdoc export <input-file> [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <file>` | Output file path | Same name, new extension |
| `-f, --format <format>` | Target format (markdown, json, html) | Auto-detect |

#### Examples

**Convert JSON to Markdown:**
```bash
archdoc export docs.json --format markdown --output README.md
```

**Convert Markdown to HTML:**
```bash
archdoc export architecture.md --format html
```

---

## Programmatic API

Use the generator in your Node.js applications.

### Installation

```bash
npm install @archdoc/generator
```

### Basic Usage

```typescript
import {
  DocumentationOrchestrator,
  FileSystemScanner,
  AgentRegistry,
  FileStructureAgent,
} from '@archdoc/generator';

async function generateDocs() {
  // 1. Create scanner
  const scanner = new FileSystemScanner();
  
  // 2. Register agents
  const registry = new AgentRegistry();
  registry.register(new FileStructureAgent());
  
  // 3. Create orchestrator
  const orchestrator = new DocumentationOrchestrator(registry, scanner);
  
  // 4. Generate documentation
  const docs = await orchestrator.generate('./my-project', {
    maxTokens: 100000,
    enableParallel: true,
    projectConfig: {
      enabledAgents: ['file-structure'],
      llmProvider: 'anthropic',
      llmModel: 'claude-3-5-sonnet-20241022',
    },
  });
  
  console.log('Documentation generated:', docs.projectName);
  return docs;
}
```

### Scan Files Only

```typescript
import { FileSystemScanner } from '@archdoc/generator';

const scanner = new FileSystemScanner();
const result = await scanner.scan({
  rootPath: './my-project',
  maxFiles: 10000,
  maxFileSize: 1048576, // 1MB
  respectGitignore: true,
});

console.log(`Found ${result.totalFiles} files`);
console.log('Languages:', result.languages);
```

### Use LLM Service Directly

```typescript
import { LLMService, LLMProvider } from '@archdoc/generator';

const llm = new LLMService({
  provider: LLMProvider.ANTHROPIC,
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
});

const model = llm.getChatModel({ temperature: 0.2 });
const response = await model.invoke('Analyze this code...');
```

### Format Documentation

```typescript
import { MarkdownFormatter } from '@archdoc/generator';

const formatter = new MarkdownFormatter();
const markdown = formatter.format(documentationOutput);

// Save to file
import { writeFile } from 'fs/promises';
await writeFile('./docs/architecture.md', markdown);
```

---

## Configuration

### Configuration File

Create `.archdoc.config.json` in your project root:

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.2,
    "maxTokens": 100000,
    "timeout": 60000
  },
  "scanner": {
    "maxFiles": 10000,
    "maxFileSize": 1048576,
    "respectGitignore": true,
    "includePatterns": [
      "**/*.ts",
      "**/*.js",
      "**/*.py",
      "**/*.java"
    ],
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.git/**"
    ]
  },
  "agents": {
    "enabled": [
      "file-structure",
      "dependency-analysis",
      "pattern-detection",
      "code-quality"
    ],
    "parallel": true,
    "timeout": 300000
  },
  "output": {
    "format": "markdown",
    "directory": "./docs/architecture",
    "includeMetadata": true,
    "includeTimestamp": true
  }
}
```

### Environment Variables

```bash
# LLM Provider API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...

# Optional Settings
ARCHDOC_CACHE_DIR=./cache          # Cache directory
ARCHDOC_LOG_LEVEL=info             # Logging level (debug, info, warn, error)
ARCHDOC_MAX_TOKENS=100000          # Global token limit
ARCHDOC_TIMEOUT=300000             # Timeout in milliseconds
```

### Ignore Patterns

Create `.archdocignore` file (uses .gitignore syntax):

```
# Dependencies
node_modules/
vendor/

# Build outputs
dist/
build/
*.pyc
*.class

# Large files
*.min.js
*.bundle.js

# Sensitive files
.env
*.pem
*.key
```

---

## Output Formats

### Markdown (Default)

Human-readable documentation with:
- Table of contents
- Code blocks with syntax highlighting
- Mermaid diagrams (if applicable)
- Structured sections

**Example:**
```markdown
# My Project Architecture

## Overview
A Node.js microservices application...

## Architecture
### Layered Architecture
- Presentation Layer: REST API
- Business Layer: Services
...
```

### JSON

Machine-readable structured data:

```json
{
  "projectName": "my-project",
  "timestamp": "2025-10-26T10:30:00Z",
  "overview": {
    "description": "...",
    "primaryLanguage": "TypeScript",
    "statistics": {
      "totalFiles": 245,
      "totalLines": 15234
    }
  },
  "architecture": {
    "style": "Microservices",
    "layers": [...]
  }
}
```

### HTML (Coming Soon)

Interactive documentation with:
- Searchable content
- Collapsible sections
- Syntax-highlighted code
- Responsive design

---

## Advanced Usage

### Custom Agents

Create specialized agents for your needs:

```typescript
import { Agent, AgentContext, AgentResult } from '@archdoc/generator';

export class SecurityAuditAgent implements Agent {
  getMetadata() {
    return {
      name: 'security-audit',
      description: 'Security vulnerability analysis',
      version: '1.0.0',
      priority: 'high',
      requiredAgents: ['file-structure'],
    };
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    // Analyze security vulnerabilities
    const vulnerabilities = await this.findVulnerabilities(context.scanResult);
    
    return {
      agentName: 'security-audit',
      status: 'success',
      data: vulnerabilities,
      confidence: 0.9,
      tokenUsage: { inputTokens: 500, outputTokens: 200, totalTokens: 700 },
    };
  }
}

// Register the agent
registry.register(new SecurityAuditAgent());
```

### Token Budget Management

Control LLM costs by setting token budgets:

```typescript
const orchestrator = new DocumentationOrchestrator(registry, scanner);

const docs = await orchestrator.generate('./my-project', {
  maxTokens: 50000, // Limit total token usage
  projectConfig: {
    enabledAgents: ['file-structure'], // Run fewer agents
    cacheEnabled: true, // Cache results
  },
});

console.log('Tokens used:', docs.metadata.totalTokensUsed);
```

### Incremental Updates

For large projects, generate documentation incrementally:

```typescript
// First run: full analysis
const fullDocs = await orchestrator.generate('./my-project', {
  cacheEnabled: true,
});

// Subsequent runs: only analyze changes
const updatedDocs = await orchestrator.generate('./my-project', {
  cacheEnabled: true,
  incrementalUpdate: true,
  changedFiles: ['src/module.ts'], // Only these files
});
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/docs.yml
name: Generate Documentation

on:
  push:
    branches: [main]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Generate Documentation
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npm install -g @archdoc/generator
          archdoc generate . --output ./docs
      
      - name: Deploy Documentation
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

---

## Examples

### Example 1: NestJS Application

```bash
archdoc generate ./my-nestjs-app \
  --agents file-structure,dependency-analysis,pattern-detection \
  --format markdown \
  --output ./docs
```

**Output includes:**
- Module structure (controllers, services, repositories)
- Dependency injection patterns
- Database schema
- API endpoints

### Example 2: Python Django Project

```bash
archdoc generate ./my-django-app \
  --provider openai \
  --model gpt-4-turbo \
  --verbose
```

**Output includes:**
- App structure (views, models, templates)
- ORM relationships
- URL routing
- Middleware configuration

### Example 3: React Frontend

```bash
archdoc generate ./my-react-app \
  --agents file-structure,pattern-detection \
  --format json \
  --output analysis.json
```

**Output includes:**
- Component hierarchy
- State management patterns
- Routing structure
- Build configuration

### Example 4: Monorepo

```bash
archdoc generate ./monorepo \
  --config ./monorepo.archdoc.json \
  --parallel \
  --verbose
```

**Config file:**
```json
{
  "scanner": {
    "includePatterns": [
      "packages/*/src/**/*.ts",
      "apps/*/src/**/*.ts"
    ]
  },
  "agents": {
    "enabled": ["file-structure", "dependency-analysis"],
    "parallel": true
  }
}
```

---

## Troubleshooting

### Issue: "API Key not found"

**Solution:**
```bash
# Check if environment variable is set
echo $ANTHROPIC_API_KEY

# Set it if missing
export ANTHROPIC_API_KEY="sk-ant-your-key"

# Verify in shell
archdoc generate . --verbose
```

### Issue: "Token limit exceeded"

**Solutions:**

1. **Reduce scope:**
```bash
archdoc generate . --agents file-structure
```

2. **Increase budget:**
```json
{
  "llm": {
    "maxTokens": 200000
  }
}
```

3. **Exclude large files:**
```json
{
  "scanner": {
    "maxFileSize": 524288,
    "excludePatterns": ["**/*.min.js", "**/bundle.js"]
  }
}
```

### Issue: "Out of memory"

**Solution:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" archdoc generate .
```

### Issue: "Slow generation"

**Solutions:**

1. **Enable parallel execution:**
```bash
archdoc generate . --parallel
```

2. **Reduce file count:**
```json
{
  "scanner": {
    "maxFiles": 5000
  }
}
```

3. **Use faster model:**
```bash
archdoc generate . --provider google --model gemini-1.5-flash
```

### Issue: "Incomplete documentation"

**Check:**

1. **Agent execution:**
```bash
archdoc generate . --verbose
# Look for agent failures in output
```

2. **Token budget:**
```bash
# Check if budget was exhausted
# Increase maxTokens in config
```

3. **File access:**
```bash
# Verify files are readable
archdoc analyze . --verbose
```

### Issue: "Import errors in TypeScript"

**Solution:**

After linking locally:
```bash
# In architecture-doc-generator
npm run build
npm link

# In your project
npm link @archdoc/generator

# If still issues, check tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

---

## Getting Help

### Documentation
- **Architecture Guide**: See `ARCHITECTURE.md` for system design
- **API Reference**: TypeScript definitions in `dist/src/**/*.d.ts`
- **Examples**: Check `examples/` directory

### Community
- **GitHub Issues**: Report bugs or request features
- **Discussions**: Ask questions and share ideas

### Contributing
See `CONTRIBUTING.md` for guidelines on:
- Adding new agents
- Supporting new LLM providers
- Creating output formatters
- Writing tests

---

## Best Practices

### 1. Start Small
Begin with a subset of agents to understand output:
```bash
archdoc generate . --agents file-structure
```

### 2. Use Configuration Files
Keep settings in `.archdoc.config.json` for consistency:
```bash
# Commit config to version control
git add .archdoc.config.json
```

### 3. Exclude Generated Files
Add to `.archdocignore`:
```
dist/
build/
*.generated.*
```

### 4. Monitor Token Usage
Check costs regularly:
```bash
archdoc generate . --verbose
# Look for "Total tokens used: XXXXX"
```

### 5. Cache Results
Enable caching for large projects:
```json
{
  "output": {
    "cache": true
  }
}
```

### 6. Version Documentation
Keep documentation in sync with code:
```bash
# Generate on every release
git tag v1.0.0
archdoc generate . --output docs/v1.0.0
```

---

Happy documenting! 🚀📚
