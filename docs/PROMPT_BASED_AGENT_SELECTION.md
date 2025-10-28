# Prompt-Based Agent Selection

## Overview

ArchDoc Generator now supports **natural language agent selection** using the `--prompt` flag. Instead of manually specifying agent names with `--agents`, you can describe what you want in plain English, and an LLM will intelligently select the appropriate agents.

## Quick Examples

```bash
# Analyze only dependencies
archdoc generate ./my-project --prompt "analyze dependencies only"

# Security and quality analysis
archdoc generate ./my-project --prompt "check for security issues and code quality"

# Flow diagrams and schemas
archdoc generate ./my-project --prompt "I want flow diagrams and database schemas"

# File structure only
archdoc generate ./my-project --prompt "just show me the file structure"

# Comprehensive analysis (equivalent to running all agents)
archdoc generate ./my-project --prompt "full comprehensive analysis"
```

## How It Works

1. **LLM-Powered Selection**: The system uses an LLM (Claude, GPT-4, or Gemini) to analyze your natural language prompt
2. **Agent Metadata Matching**: The LLM considers each agent's:
   - Name and description
   - Capabilities (parallel execution, file reading, language support)
   - Tags for categorization
3. **Intelligent Mapping**: Keywords in your prompt are matched to agent capabilities:
   - "dependencies", "imports", "packages" → `dependency-analyzer`
   - "structure", "folders", "files" → `file-structure`
   - "patterns", "design", "architecture" → `pattern-detector`
   - "flows", "process", "sequence" → `flow-visualization`
   - "schema", "database", "entities" → `schema-generator`
4. **Fallback Logic**: If the LLM cannot determine specific agents or you request "everything", all agents run

## Available Agents

| Agent Name | Description | Common Keywords |
|------------|-------------|-----------------|
| `file-structure` | Analyzes project organization, directory structure, file types | structure, folders, files, organization |
| `dependency-analyzer` | Maps imports, packages, internal/external dependencies | dependencies, imports, packages, modules |
| `pattern-detector` | Identifies design patterns, anti-patterns, best practices | patterns, design, architecture, quality |
| `flow-visualization` | Generates flow diagrams (data, process, auth, API) | flows, process, sequence, diagrams |
| `schema-generator` | Extracts database schemas, API schemas, type definitions | schema, database, entities, models, API |

## Comparison: --prompt vs --agents

### Explicit Agent Names (`--agents`)

```bash
# You specify exact agent names (comma-separated)
archdoc generate ./project --agents file-structure,dependency-analyzer

# Pros:
# - Precise control
# - No LLM API call needed
# - Fast execution

# Cons:
# - Must know agent names
# - Less intuitive
```

### Natural Language (`--prompt`)

```bash
# You describe what you want in plain English
archdoc generate ./project --prompt "analyze dependencies and file structure"

# Pros:
# - Intuitive and user-friendly
# - No need to memorize agent names
# - Flexible phrasing ("dependencies" vs "imports" both work)

# Cons:
# - Requires API key for LLM provider
# - Small overhead from LLM call (~0.1s)
# - Fallback to all agents if LLM fails
```

## Configuration

### API Keys

Prompt-based selection requires an LLM provider API key:

```bash
# Anthropic (recommended)
export ANTHROPIC_API_KEY="sk-ant-your-key"

# OpenAI
export OPENAI_API_KEY="sk-your-key"

# Google
export GOOGLE_API_KEY="your-key"
```

### Provider Selection

By default, the system uses Anthropic Claude. You can specify a different provider:

```bash
archdoc generate ./project \
  --prompt "analyze dependencies" \
  --provider openai \
  --model gpt-4-turbo
```

## Advanced Usage

### Combining with Other Flags

```bash
# Natural language selection + multi-file output
archdoc generate ./project \
  --prompt "dependencies and flows" \
  --multi-file \
  --output ./docs

# Natural language selection + iterative refinement
archdoc generate ./project \
  --prompt "comprehensive analysis" \
  --refinement-enabled \
  --refinement-max-iterations 3

# Natural language selection + verbose output
archdoc generate ./project \
  --prompt "security and quality" \
  --verbose
```

### Verbose Mode

Use `--verbose` to see which agents were selected:

```bash
archdoc generate ./project --prompt "analyze dependencies" --verbose

# Output:
# Prompt: "analyze dependencies"
# Selected: dependency-analyzer
```

## Keyword Guide

Here are common phrases and the agents they typically map to:

### File Structure
- "file structure", "folder organization", "directory layout"
- "show me the files", "project structure"

### Dependencies
- "dependencies", "imports", "packages", "modules"
- "what depends on what", "dependency graph"

### Design Patterns
- "patterns", "design patterns", "architecture patterns"
- "code quality", "best practices", "anti-patterns"
- "security", "vulnerabilities" (pattern-detector checks security patterns)

### Flow Visualization
- "flows", "flow diagrams", "process flows", "data flows"
- "sequence diagrams", "component interactions"
- "API flows", "authentication flows"

### Schema Generation
- "schemas", "database", "entities", "models"
- "API schemas", "DTOs", "GraphQL"
- "type definitions", "ER diagrams"

### Comprehensive Analysis
- "everything", "all", "complete", "full analysis"
- "comprehensive", "entire project", "whole codebase"

## Troubleshooting

### "Agent selection failed" Error

If you see this error, the system falls back to running all agents. Common causes:

1. **Missing API Key**: Set your LLM provider API key
   ```bash
   export ANTHROPIC_API_KEY="your-key"
   ```

2. **Invalid Provider**: Ensure provider is correctly configured
   ```bash
   archdoc generate ./project --prompt "..." --provider anthropic
   ```

3. **Network Issues**: Check internet connection for LLM API access

### All Agents Run Instead of Selected Subset

This happens when:
1. Your prompt is too generic ("analyze the project", "document everything")
2. The LLM cannot determine specific agents
3. Agent selection failed and fell back to default behavior

**Solution**: Be more specific in your prompt:
```bash
# Too generic:
archdoc generate ./project --prompt "analyze the code"

# More specific:
archdoc generate ./project --prompt "analyze dependencies and database schemas"
```

## Examples by Use Case

### New Developer Onboarding

```bash
# Give new devs a comprehensive overview
archdoc generate ./project \
  --prompt "show file structure, dependencies, and design patterns" \
  --multi-file \
  --output ./onboarding-docs
```

### Security Audit

```bash
# Focus on security-related analysis
archdoc generate ./project \
  --prompt "security patterns and dependency vulnerabilities" \
  --output ./security-audit.md
```

### Architecture Review

```bash
# High-level architectural documentation
archdoc generate ./project \
  --prompt "architecture patterns, flow diagrams, and component dependencies" \
  --multi-file
```

### Database Schema Documentation

```bash
# Document data models and schemas
archdoc generate ./project \
  --prompt "database schemas and entity relationships" \
  --output ./schema-docs.md
```

### Quick Dependency Check

```bash
# Fast dependency analysis only
archdoc generate ./project \
  --prompt "dependencies only" \
  --no-cache
```

## API Reference

### CLI Syntax

```
archdoc generate <project-path> --prompt "<natural-language-description>" [options]
```

### Options

- `--prompt <text>`: Natural language description of what to analyze
- `--provider <provider>`: LLM provider for selection (anthropic|openai|google)
- `--model <model>`: Specific LLM model to use
- `--verbose`: Show selected agents and reasoning
- `--agents <names>`: Alternative to --prompt (explicit agent names)

### Exit Codes

- `0`: Success (agents selected and documentation generated)
- `1`: Error (invalid path, missing dependencies, etc.)

## Performance Considerations

- **Agent Selection Overhead**: ~0.1-0.3 seconds for LLM call
- **Token Usage**: ~100-300 input tokens, ~20-50 output tokens per selection
- **Caching**: Selection results are not cached (dynamic per prompt)
- **Fallback Cost**: If selection fails, all agents run (higher token usage)

## Future Enhancements

Planned improvements for prompt-based selection:

1. **Context-Aware Selection**: Consider project type (web app, library, CLI tool)
2. **Multi-Turn Clarification**: Ask follow-up questions if prompt is ambiguous
3. **Selection History**: Remember previous selections for similar prompts
4. **Confidence Scores**: Show how confident the LLM is about agent selection
5. **Dry-Run Mode**: Preview which agents would run without executing them

## Related Documentation

- [Agent Development Guide](./AGENT_DEVELOPMENT_GUIDE.md) - Create custom agents
- [Enhanced Orchestrator Design](./docs/ENHANCED_ORCHESTRATOR_DESIGN.md) - System architecture
- [User Guide](./USER_GUIDE.md) - General usage patterns
- [CLI Reference](./CLI_REFERENCE.md) - Complete CLI documentation

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/architecture-doc-generator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/architecture-doc-generator/discussions)
- **Documentation**: [Full Docs](./docs/)

---

**Note**: Prompt-based agent selection requires an active LLM provider API key. Without it, the system falls back to running all registered agents.
