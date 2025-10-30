# Integration Guide

This guide explains how to integrate the ArchDoc Generator into your projects, CI/CD pipelines, and development workflows.

## 📚 Table of Contents

- [**CI/CD Integration**](#-cicd-integration)
  - [GitHub Actions](#github-actions)
  - [GitLab CI](#gitlab-ci)
- [**NPM Scripts**](#-npm-scripts)
- [**Programmatic Usage**](#-programmatic-usage)
- [**Pre-commit Hooks**](#-pre-commit-hooks)

## 🔄 CI/CD Integration

Automate your documentation generation by integrating ArchDoc Generator into your CI/CD pipeline.

### GitHub Actions

Create a workflow file at `.github/workflows/docs.yml` to generate documentation on every push to your main branch.

```yaml
name: Generate Architecture Documentation

on:
  push:
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
        run: archdoc analyze . --output ./docs/architecture

      - name: Commit Documentation
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/architecture/
          git commit -m "docs: update architecture documentation" || echo "No changes to commit"
          git push
```

### GitLab CI

For GitLab, create a `.gitlab-ci.yml` file.

```yaml
stages:
  - docs

generate-docs:
  stage: docs
  image: node:18
  script:
    - npm install -g @archdoc/generator
    - archdoc analyze . --output ./docs/architecture
  artifacts:
    paths:
      - docs/architecture/
  only:
    - main
```

## 📦 NPM Scripts

Integrate the generator into your project's `package.json` as a script.

```json
{
  "scripts": {
    "docs": "archdoc analyze . --output ./docs",
    "docs:quick": "archdoc analyze . --depth quick",
    "docs:deep": "archdoc analyze . --depth deep"
  },
  "devDependencies": {
    "@archdoc/generator": "^0.1.0"
  }
}
```

You can then run the scripts with `npm run docs`.

## 💻 Programmatic Usage

Use the ArchDoc Generator programmatically in your Node.js applications.

```typescript
import { DocumentationOrchestrator, AgentRegistry, FileSystemScanner } from '@archdoc/generator';

async function generate() {
  const scanner = new FileSystemScanner();
  const registry = new AgentRegistry();
  const orchestrator = new DocumentationOrchestrator(registry, scanner);

  const output = await orchestrator.generateDocumentation('./path/to/project');

  console.log('Documentation generated successfully:', output.summary);
}

generate();
```

## 🎣 Pre-commit Hooks

You can use a pre-commit hook to ensure your documentation is always up-to-date.

### Using Husky

1. Install Husky: `npm install husky --save-dev`
2. Initialize Husky: `npx husky install`
3. Create a pre-commit hook:

```bash
npx husky add .husky/pre-commit "npm run docs && git add docs/"
```

This will automatically generate and stage your documentation before each commit.
