# Integration Guide

> How to use Architecture Documentation Generator in your projects, CI/CD pipelines, and development workflows

## Table of Contents

- [Overview](#overview)
- [CI/CD Integration](#cicd-integration)
- [NPM Scripts Integration](#npm-scripts-integration)
- [Programmatic Usage](#programmatic-usage)
- [Pre-commit Hooks](#pre-commit-hooks)
- [IDE Integration](#ide-integration)
- [Documentation Workflows](#documentation-workflows)
- [Real-World Examples](#real-world-examples)

## Overview

Architecture Documentation Generator can be integrated into your development workflow in multiple ways:

1. **CI/CD Pipeline** - Auto-generate docs on commits/PRs
2. **NPM Scripts** - Add as project scripts
3. **Programmatic API** - Use in Node.js applications
4. **Pre-commit Hooks** - Generate docs before commits
5. **IDE Integration** - Run from VS Code/WebStorm

## CI/CD Integration

### GitHub Actions

#### Basic Setup

Create `.github/workflows/docs.yml`:

```yaml
name: Generate Architecture Documentation

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  generate-docs:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install ArchDoc Generator
        run: npm install -g @archdoc/generator

      - name: Generate Documentation
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          archdoc analyze . \
            --output ./docs/architecture \
            --depth normal \
            --verbose

      - name: Commit Documentation
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add docs/architecture/
          git diff --quiet && git diff --staged --quiet || git commit -m "docs: update architecture documentation [skip ci]"
          git push
```

#### Deploy to GitHub Pages

```yaml
name: Generate and Deploy Docs

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

      - name: Install ArchDoc
        run: npm install -g @archdoc/generator

      - name: Generate Docs
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: archdoc analyze . --output ./docs --depth normal

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

#### PR Documentation Preview

```yaml
name: Documentation Preview

on:
  pull_request:
    branches: [main]

jobs:
  preview:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install ArchDoc
        run: npm install -g @archdoc/generator

      - name: Generate Quick Docs
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          archdoc analyze . \
            --output ./pr-docs \
            --depth quick \
            --no-refinement

      - name: Upload Documentation
        uses: actions/upload-artifact@v3
        with:
          name: architecture-docs
          path: ./pr-docs

      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '📚 Architecture documentation generated! Download the artifact to review.'
            })
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - docs

generate-docs:
  stage: docs
  image: node:18
  script:
    - npm install -g @archdoc/generator
    - |
      archdoc analyze . \
        --output ./docs/architecture \
        --depth normal \
        --verbose
  artifacts:
    paths:
      - docs/architecture/
    expire_in: 30 days
  only:
    - main
    - develop
  variables:
    ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
```

#### Deploy to GitLab Pages

```yaml
pages:
  stage: deploy
  image: node:18
  script:
    - npm install -g @archdoc/generator
    - archdoc analyze . --output ./public --depth normal
  artifacts:
    paths:
      - public
  only:
    - main
  variables:
    ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
```

### Jenkins

Create `Jenkinsfile`:

```groovy
pipeline {
  agent any

  environment {
    ANTHROPIC_API_KEY = credentials('anthropic-api-key')
  }

  stages {
    stage('Setup') {
      steps {
        sh 'npm install -g @archdoc/generator'
      }
    }

    stage('Generate Documentation') {
      steps {
        sh '''
          archdoc analyze . \
            --output ./docs/architecture \
            --depth normal \
            --verbose
        '''
      }
    }

    stage('Archive') {
      steps {
        archiveArtifacts artifacts: 'docs/architecture/**', fingerprint: true
      }
    }

    stage('Publish') {
      when {
        branch 'main'
      }
      steps {
        publishHTML([
          reportDir: 'docs/architecture',
          reportFiles: 'index.md',
          reportName: 'Architecture Documentation'
        ])
      }
    }
  }
}
```

### CircleCI

Create `.circleci/config.yml`:

```yaml
version: 2.1

jobs:
  generate-docs:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout

      - run:
          name: Install ArchDoc
          command: npm install -g @archdoc/generator

      - run:
          name: Generate Documentation
          command: |
            archdoc analyze . \
              --output ./docs/architecture \
              --depth normal
          environment:
            ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY

      - store_artifacts:
          path: ./docs/architecture
          destination: architecture-docs

      - persist_to_workspace:
          root: .
          paths:
            - docs/architecture

workflows:
  version: 2
  docs:
    jobs:
      - generate-docs:
          filters:
            branches:
              only:
                - main
                - develop
```

### Azure Pipelines

Create `azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
    displayName: 'Install Node.js'

  - script: |
      npm install -g @archdoc/generator
    displayName: 'Install ArchDoc Generator'

  - script: |
      archdoc analyze . \
        --output $(Build.ArtifactStagingDirectory)/docs \
        --depth normal \
        --verbose
    displayName: 'Generate Documentation'
    env:
      ANTHROPIC_API_KEY: $(ANTHROPIC_API_KEY)

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: '$(Build.ArtifactStagingDirectory)/docs'
      artifactName: 'architecture-docs'
```

## NPM Scripts Integration

### Add to `package.json`

```json
{
  "name": "my-project",
  "scripts": {
    "docs": "archdoc analyze . --output ./docs",
    "docs:quick": "archdoc analyze . --output ./docs --depth quick --no-refinement",
    "docs:deep": "archdoc analyze . --output ./docs --depth deep",
    "docs:watch": "chokidar 'src/**/*.ts' -c 'npm run docs:quick'",
    "docs:clean": "rm -rf ./docs && npm run docs",
    "docs:ci": "archdoc analyze . --output ./docs --depth normal --no-refinement --quiet"
  },
  "devDependencies": {
    "@archdoc/generator": "^0.1.0",
    "chokidar-cli": "^3.0.0"
  }
}
```

### Usage

```bash
# Generate docs
npm run docs

# Quick generation
npm run docs:quick

# Deep analysis
npm run docs:deep

# Watch mode (regenerate on changes)
npm run docs:watch

# CI-optimized generation
npm run docs:ci
```

### Example: NestJS Project

```json
{
  "scripts": {
    "docs:api": "archdoc analyze ./src --output ./docs/api --prompt 'analyze API structure and endpoints'",
    "docs:modules": "archdoc analyze ./src/app/modules --output ./docs/modules",
    "docs:full": "archdoc analyze . --output ./docs --depth deep",
    "predeploy": "npm run docs:full"
  }
}
```

### Example: Monorepo

```json
{
  "scripts": {
    "docs": "lerna run docs",
    "docs:api": "archdoc analyze ./packages/api --output ./docs/api",
    "docs:web": "archdoc analyze ./packages/web --output ./docs/web",
    "docs:shared": "archdoc analyze ./packages/shared --output ./docs/shared",
    "docs:all": "npm run docs:api && npm run docs:web && npm run docs:shared"
  }
}
```

## Programmatic Usage

### Basic Example

```typescript
import {
  DocumentationOrchestrator,
  AgentRegistry,
  FileSystemScanner,
  FileStructureAgent,
  DependencyAnalyzerAgent,
  PatternDetectorAgent,
  MultiFileMarkdownFormatter,
} from '@archdoc/generator';

async function generateDocs() {
  // Setup
  const scanner = new FileSystemScanner();
  const registry = new AgentRegistry();

  // Register agents
  registry.register(new FileStructureAgent());
  registry.register(new DependencyAnalyzerAgent());
  registry.register(new PatternDetectorAgent());

  // Create orchestrator
  const orchestrator = new DocumentationOrchestrator(registry, scanner);

  // Generate documentation
  const output = await orchestrator.generateDocumentation('./src', {
    maxTokens: 100000,
    parallel: true,
    iterativeRefinement: {
      enabled: true,
      maxIterations: 5,
      clarityThreshold: 80,
      minImprovement: 10,
    },
    agentOptions: {
      runnableConfig: {
        runName: 'MyProjectAnalysis',
      },
    },
  });

  // Format and save
  const formatter = new MultiFileMarkdownFormatter();
  await formatter.format(output, { outputDir: './docs' });

  console.log('Documentation generated!');
  console.log('Total tokens:', output.totalTokens);
  console.log('Total cost: $', output.totalCost.toFixed(2));
}

generateDocs().catch(console.error);
```

### Advanced: Custom Workflow

```typescript
import {
  DocumentationOrchestrator,
  AgentRegistry,
  FileSystemScanner,
  LLMService,
  type AgentContext,
  type DocumentationOutput,
} from '@archdoc/generator';

class CustomDocGenerator {
  private orchestrator: DocumentationOrchestrator;

  constructor() {
    const scanner = new FileSystemScanner();
    const registry = new AgentRegistry();
    this.orchestrator = new DocumentationOrchestrator(registry, scanner);

    // Configure LangSmith
    LLMService.configureLangSmith();
  }

  async generate(projectPath: string): Promise<DocumentationOutput> {
    // Custom pre-processing
    const scanResult = await this.preScan(projectPath);

    // Generate with custom options
    const output = await this.orchestrator.generateDocumentation(projectPath, {
      maxTokens: 150000,
      parallel: true,
      iterativeRefinement: {
        enabled: true,
        maxIterations: 7,
        clarityThreshold: 85,
        minImprovement: 5,
      },
      onAgentProgress: (current, total, agentName) => {
        console.log(`[${current}/${total}] ${agentName}...`);
      },
    });

    // Custom post-processing
    await this.postProcess(output);

    return output;
  }

  private async preScan(path: string) {
    console.log('Pre-scanning project...');
    // Custom scanning logic
    return {};
  }

  private async postProcess(output: DocumentationOutput) {
    console.log('Post-processing documentation...');
    // Custom formatting, validation, etc.
  }
}

// Usage
const generator = new CustomDocGenerator();
const docs = await generator.generate('./my-project');
```

### Integration with Express API

```typescript
import express from 'express';
import { DocumentationOrchestrator, AgentRegistry, FileSystemScanner } from '@archdoc/generator';

const app = express();
const scanner = new FileSystemScanner();
const registry = new AgentRegistry();
const orchestrator = new DocumentationOrchestrator(registry, scanner);

app.post('/api/generate-docs', async (req, res) => {
  try {
    const { projectPath, depth = 'normal' } = req.body;

    const depthConfigs = {
      quick: { maxIterations: 2, clarityThreshold: 70 },
      normal: { maxIterations: 5, clarityThreshold: 80 },
      deep: { maxIterations: 10, clarityThreshold: 90 },
    };

    const output = await orchestrator.generateDocumentation(projectPath, {
      maxTokens: 100000,
      parallel: true,
      iterativeRefinement: {
        enabled: true,
        ...depthConfigs[depth],
      },
    });

    res.json({
      success: true,
      summary: output.summary,
      tokens: output.totalTokens,
      cost: output.totalCost,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(3000);
```

## Pre-commit Hooks

### Using Husky

Install dependencies:

```bash
npm install --save-dev husky @archdoc/generator
npx husky install
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Generate quick docs before commit
npm run docs:quick

# Add generated docs to commit
git add docs/
```

Update `package.json`:

```json
{
  "scripts": {
    "docs:quick": "archdoc analyze . --output ./docs --depth quick --no-refinement",
    "prepare": "husky install"
  }
}
```

### Using pre-commit Framework

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: generate-docs
        name: Generate Architecture Documentation
        entry: bash -c 'archdoc analyze . --output ./docs --depth quick --no-refinement'
        language: system
        pass_filenames: false
        always_run: false
        files: \.(ts|js|py|java)$
```

## IDE Integration

### VS Code

#### Task Configuration

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Generate Architecture Docs",
      "type": "shell",
      "command": "archdoc analyze . --output ./docs --verbose",
      "group": {
        "kind": "build",
        "isDefault": false
      },
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Generate Quick Docs",
      "type": "shell",
      "command": "archdoc analyze . --output ./docs --depth quick",
      "group": "build"
    }
  ]
}
```

Run with `Ctrl+Shift+B` → Select task

#### Keyboard Shortcut

Add to `.vscode/keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+d",
    "command": "workbench.action.tasks.runTask",
    "args": "Generate Architecture Docs"
  }
]
```

### WebStorm / IntelliJ

Create Run Configuration:

1. Run → Edit Configurations
2. Add New Configuration → npm
3. Command: `run`
4. Script: `docs`
5. Save as "Generate Docs"

## Documentation Workflows

### Workflow 1: PR-Based Documentation

```yaml
# .github/workflows/pr-docs.yml
name: PR Documentation Check

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Generate Docs
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npm install -g @archdoc/generator
          archdoc analyze . --output ./pr-docs --depth quick

      - name: Check for Changes
        id: check
        run: |
          if [ -n "$(git status --porcelain docs/)" ]; then
            echo "docs_changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Comment if Outdated
        if: steps.check.outputs.docs_changed == 'true'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ Documentation may be outdated. Please run `npm run docs` and commit changes.'
            })
```

### Workflow 2: Scheduled Documentation Updates

```yaml
# .github/workflows/scheduled-docs.yml
name: Weekly Documentation Update

on:
  schedule:
    - cron: '0 0 * * 0' # Every Sunday at midnight
  workflow_dispatch: # Manual trigger

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Generate Documentation
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npm install -g @archdoc/generator
          archdoc analyze . --output ./docs --depth deep

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          commit-message: 'docs: weekly architecture documentation update'
          title: 'Weekly Architecture Documentation Update'
          body: 'Automated documentation update from ArchDoc Generator'
          branch: 'docs/weekly-update'
```

### Workflow 3: Release Documentation

```yaml
# .github/workflows/release-docs.yml
name: Release Documentation

on:
  release:
    types: [published]

jobs:
  release-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Generate Release Docs
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npm install -g @archdoc/generator
          archdoc analyze . --output ./docs-${{ github.event.release.tag_name }} --depth deep

      - name: Upload to Release
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: ./docs-${{ github.event.release.tag_name }}
          asset_name: architecture-docs-${{ github.event.release.tag_name }}.zip
          asset_content_type: application/zip
```

## Real-World Examples

### Example 1: tech-debt-api Integration

```json
{
  "name": "tech-debt-api",
  "scripts": {
    "docs:arch": "archdoc analyze ./src --output ./docs/architecture",
    "docs:modules": "archdoc analyze ./src/app/modules --output ./docs/modules --prompt 'analyze module structure and dependencies'",
    "docs:full": "npm run docs:arch && npm run docs:modules",
    "predeploy": "npm run docs:full"
  },
  "devDependencies": {
    "@archdoc/generator": "^0.1.0"
  }
}
```

GitHub Action (`.github/workflows/docs.yml`):

```yaml
name: Generate Documentation

on:
  push:
    branches: [main]
    paths:
      - 'src/**'

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: npm install

      - name: Generate Documentation
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: npm run docs:full

      - name: Commit Documentation
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/
          git diff --quiet && git diff --staged --quiet || git commit -m "docs: update architecture documentation [skip ci]"
          git push
```

### Example 2: React Application

```json
{
  "scripts": {
    "docs": "archdoc analyze ./src --output ./docs --prompt 'analyze React component architecture'",
    "docs:components": "archdoc analyze ./src/components --output ./docs/components",
    "docs:hooks": "archdoc analyze ./src/hooks --output ./docs/hooks --prompt 'analyze custom hooks'",
    "postbuild": "npm run docs"
  }
}
```

### Example 3: Microservices

```bash
#!/bin/bash
# generate-all-docs.sh

services=("api-gateway" "auth-service" "user-service" "payment-service")

for service in "${services[@]}"; do
  echo "Generating docs for $service..."
  archdoc analyze "./services/$service" \
    --output "./docs/$service" \
    --depth normal \
    --verbose
done

echo "All documentation generated!"
```

---

**See Also:**

- [📖 User Guide](./USER_GUIDE.md) - CLI usage and configuration
- [🏗️ Architecture](./ARCHITECTURE.md) - Technical details
- [📚 API Reference](./API.md) - Programmatic API docs
- [🤝 Contributing](./CONTRIBUTING.md) - Extend and customize

**Navigation:**

[🏠 Home](../README.md) · [📖 Docs Index](./README.md) · [📖 User Guide](./USER_GUIDE.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [🤝 Contributing](./CONTRIBUTING.md)
