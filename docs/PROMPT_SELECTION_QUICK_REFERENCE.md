# Prompt-Based Agent Selection - Quick Reference

## 🚀 Quick Start

```bash
# Set your API key
export ANTHROPIC_API_KEY="sk-ant-your-key"

# Use natural language to select agents
archdoc generate ./my-project --prompt "analyze dependencies only"
```

## 📋 Common Prompts

| What You Want | Prompt Examples | Agents Selected |
|---------------|-----------------|-----------------|
| **Dependencies** | `"dependencies only"`<br>`"analyze imports"`<br>`"show me what depends on what"` | dependency-analyzer |
| **File Structure** | `"file structure"`<br>`"folder organization"`<br>`"project layout"` | file-structure |
| **Design Patterns** | `"design patterns"`<br>`"architecture patterns"`<br>`"code quality"` | pattern-detector |
| **Flow Diagrams** | `"flow diagrams"`<br>`"process flows"`<br>`"sequence diagrams"` | flow-visualization |
| **Schemas** | `"database schemas"`<br>`"API schemas"`<br>`"entity relationships"` | schema-generator |
| **Security** | `"security patterns"`<br>`"vulnerabilities"`<br>`"security check"` | pattern-detector |
| **Everything** | `"comprehensive analysis"`<br>`"full documentation"`<br>`"everything"` | ALL agents |

## 🎯 Usage Patterns

### Single Agent
```bash
archdoc generate ./project --prompt "dependencies only"
```

### Multiple Agents
```bash
archdoc generate ./project --prompt "dependencies and flows"
archdoc generate ./project --prompt "file structure, patterns, and schemas"
```

### Comprehensive
```bash
archdoc generate ./project --prompt "full analysis"
```

## ⚙️ With Other Flags

### Multi-File Output
```bash
archdoc generate ./project \
  --prompt "dependencies and security" \
  --multi-file \
  --output ./docs
```

### Iterative Refinement
```bash
archdoc generate ./project \
  --prompt "architecture patterns" \
  --refinement-enabled
```

### Verbose Mode
```bash
archdoc generate ./project \
  --prompt "flows and schemas" \
  --verbose
# Shows: "Selected: flow-visualization, schema-generator"
```

### Custom Provider
```bash
archdoc generate ./project \
  --prompt "dependencies" \
  --provider openai \
  --model gpt-4-turbo
```

## 🔑 Keyword Guide

### Structure & Organization
- `file`, `folder`, `directory`, `structure`, `layout`, `organization`

### Dependencies & Imports
- `dependencies`, `imports`, `packages`, `modules`, `requires`

### Architecture & Design
- `patterns`, `design`, `architecture`, `quality`, `best practices`

### Flows & Diagrams
- `flows`, `process`, `sequence`, `diagrams`, `interactions`

### Data & Schemas
- `schema`, `database`, `entities`, `models`, `API`, `types`

### Security & Quality
- `security`, `vulnerabilities`, `quality`, `maintainability`

### Everything
- `all`, `everything`, `comprehensive`, `full`, `complete`

## ⚠️ Troubleshooting

### All Agents Run (Not Specific Subset)

**Cause**: Prompt too generic or LLM selection failed

**Fix**: Be more specific
```bash
# Instead of:
--prompt "analyze the project"

# Use:
--prompt "analyze dependencies and database schemas"
```

### "Agent selection failed" Error

**Cause**: Missing API key or network issue

**Fix**: Set environment variable
```bash
export ANTHROPIC_API_KEY="sk-ant-your-key"
# OR
export OPENAI_API_KEY="sk-your-key"
# OR
export GOOGLE_API_KEY="your-key"
```

### Wrong Agents Selected

**Cause**: Ambiguous prompt

**Fix**: Use clearer keywords from the guide above
```bash
# Instead of:
--prompt "check the code"

# Use:
--prompt "code quality and design patterns"
```

## 🆚 --prompt vs --agents

### Use `--prompt` When:
- ✅ You want intuitive natural language
- ✅ You don't remember exact agent names
- ✅ You have an API key configured
- ✅ You prefer flexibility ("dependencies" vs "imports")

### Use `--agents` When:
- ✅ You know exact agent names
- ✅ You want precise control
- ✅ You want to avoid LLM API call
- ✅ You need maximum speed (no LLM overhead)

### Example Comparison
```bash
# Natural language (--prompt)
archdoc generate ./project --prompt "dependencies and flows"

# Explicit names (--agents)
archdoc generate ./project --agents dependency-analyzer,flow-visualization
```

Both produce the same result!

## 📊 Performance

- **LLM Call**: ~0.1-0.3 seconds
- **Token Usage**: ~100-300 input, ~20-50 output
- **Cost**: < $0.001 per selection (Claude Haiku)
- **Fallback**: Automatic if selection fails

## 🔗 More Information

- **Full Guide**: [docs/PROMPT_BASED_AGENT_SELECTION.md](./PROMPT_BASED_AGENT_SELECTION.md)
- **Implementation**: [docs/PROMPT_SELECTION_IMPLEMENTATION_SUMMARY.md](./PROMPT_SELECTION_IMPLEMENTATION_SUMMARY.md)
- **User Guide**: [USER_GUIDE.md](../USER_GUIDE.md)

---

**Tip**: Start with `--verbose` to see which agents get selected, then refine your prompt if needed!
