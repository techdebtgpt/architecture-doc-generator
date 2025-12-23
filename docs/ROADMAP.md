# 🚀 Future Work & Roadmap

**Long-term vision and strategic direction for ArchDoc Generator.**

For current, actionable implementation items and quarterly goals, see [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

This plan treats **MCP as foundational** and focuses on breakthrough features that transform how teams manage architecture documentation.

---

## 📋 Table of Contents

- [Current Status](#-current-status)
- [EPIC 1: Core MCP Integration](#-epic-1-implement-core-mcp-integration)
- [EPIC 2: Token & Cost Optimization](#-epic-2-token--cost-optimization-mcp--cli)
- [EPIC 3: Developer-Centric Query Interface](#-epic-3-developer-centric-query-interface)
- [EPIC 4: Observability & CI Guardrails](#-epic-4-observability--ci-guardrails)
- [EPIC 5: Extensibility & Ecosystem](#-epic-5-extensibility--ecosystem)
- [Contributing Ideas](#contributing-ideas)

---

## ✅ Current Status (v0.3.37+, December 2025)

### Completed in This Release

- ✅ **MCP Protocol Implementation**: Full support for Cursor, Claude Code, VS Code + Copilot, Claude Desktop
- ✅ **8 Specialized Agents**: File Structure, Dependencies, Patterns, Flows, Schemas, Architecture, Security, KPI
- ✅ **JSON-First Cache**: `.archdoc/cache/*.json` with structured outputs and zero-LLM-cost lookups
- ✅ **Delta Analysis**: Git-based + file hash fallback (60-90% cost reduction on incremental runs)
- ✅ **RAG with Hybrid Retrieval**: Semantic search (TF-IDF) + dependency graph analysis (FREE)
- ✅ **LangSmith Tracing**: Full observability with multi-step traces and token tracking
- ✅ **Dynamic Documentation**: Auto-generated index, navigation, formatted markdown output
- ✅ **Prettier & ESLint**: CI/CD quality checks (Node 20.x only)

### Next in Pipeline

- 📋 **TOON Format Optimization** (Q1 2026): 35-40% token reduction
- 📋 **Query API Enhancements** (Q1 2026): Natural language search, file explain, impact analysis
- 📋 **Architecture Drift Detection** (Q2 2026): PR compliance checks, GitHub Actions integration

---

## 🗂️ EPIC 1: Implement Core MCP Integration

**Goal:** Enable Cursor, Claude Code, VS Code + Copilot, and Claude Desktop to invoke ArchDoc as a native tool.

**Status**: ✅ COMPLETED (v0.3.30+)

### Features

- ✅ **MCP Protocol Compliance**
  - Implement MCP spec for tools (`tools.list`, `tools.call`)
  - Return schema-compliant JSON responses (no Markdown in tool output)
- ✅ **MCP Setup Commands**
  - `archdoc setup-mcp cursor`
  - `archdoc setup-mcp claude-code`
  - `archdoc setup-mcp vscode`
  - `archdoc setup-mcp claude-desktop`
  - Each writes config + registers ArchDoc as a local tool
- ✅ **MCP-Aware Execution Mode**
  - Detect when called via MCP (`X-MCP-Client` header or env var)
  - Skip LLM calls → use only local analysis + cache
  - Return structured JSON: `{ "component": "...", "file": "...", "summary": "..." }`
- ✅ **Zero-Config MCP for Existing Projects**
  - If `.archdoc/` cache exists, MCP mode works without re-running full analysis
  - If not, trigger lightweight `archdoc analyze --depth quick --no-refinement`
- ✅ **Documentation & Templates**
  - Add `docs/MCP-SETUP.md` with screenshots for each IDE
  - Include prompts devs can use

---

## 🗂️ EPIC 2: Token & Cost Optimization (MCP + CLI)

**Goal:** Make every mode (CLI and MCP) as lean as possible—especially for frequent IDE use.

**Status**: ✅ COMPLETED core features (v0.3.37+), 📋 Ongoing (TOON integration pending)

### Features - Completed

- ✅ **JSON-First Internal Format**
  - All agents write to `.archdoc/cache/*.json`
  - Markdown is a rendered view, not source of truth
  - Enables multi-format exports (HTML, PDF, Confluence)
- ✅ **Delta Analysis**
  - On rerun, only process changed files (via file hash or Git diff)
  - Cuts token use by 60–90% in iterative dev
  - Smart caching and incremental updates
- ✅ **Lite Mode (`--depth quick`)**
  - Disables refinement, uses minimal LLM steps
  - Default for MCP-triggered analysis
  - Fast turnaround for IDE queries
- ✅ **Local-Only Mode**
  - `archdoc analyze --llm local` → use Ollama or disable LLM entirely
  - Ideal for security-sensitive or offline teams
- ✅ **Cost Dashboard in `metadata.md`**
  - Show per-agent token count, estimated cost, and savings vs. full run
  - Tracks execution time, confidence scores, clarity metrics

### Features - In Progress

- 📋 **TOON Format Integration** (Q1 2026)
  - Reduce prompt tokens by 35-40% through structured output formats
  - Improve LLM accuracy on tabular data (73.9% vs 70%)
  - Hybrid: TOON for uniform arrays, JSON for nested structures

---

## 🗂️ EPIC 3: Developer-Centric Query Interface

**Goal:** Let devs ask natural questions—via CLI or IDE—and get instant, actionable answers.

**Status**: ✅ RAG foundation complete (v0.3.37+), 📋 Query API pending (Q1 2026)

### Features - Completed

- ✅ **RAG Foundation**
  - Hybrid retrieval combining semantic search + dependency graph
  - FREE local TF-IDF embeddings (no API costs)
  - Searches over cached `.archdoc/` JSON files
- ✅ **VS Code Metadata**
  - Generate `.archdoc/components.json` with architecture tags
  - Enables future CodeLens integration without extension

### Features - In Progress

- 📋 **`archdoc query` Command** (Q1 2026)
  - Natural language: "Which service handles auth?"
  - Uses RAG over `.archdoc/cache` → no LLM needed if cached
  - <100ms response time for cached queries
- 📋 **`archdoc explain <file>`** (Q1 2026)
  - Returns role, journey, risks, dependencies for a single file
  - Designed for IDE hover or chat context
  - Example: `archdoc explain src/auth.service.ts` → architecture role, critical deps
- 📋 **Architecture Impact Analysis** (Q2 2026)
  - `archdoc impact ./src/auth/` → "Affects: login, SSO, password reset"
  - Dependency impact mapping
- 📋 **Journey Mapping** (Q2 2026)
  - Auto-infer user journeys from routes/test names
  - Output `journeys.json`: `{ "checkout": ["payment-svc", "inventory-api"] }`

---

## 🗂️ EPIC 4: Observability & CI Guardrails

**Goal:** Prevent architecture drift; make docs a living contract.

**Status**: 📋 Planned (Q2 2026+)

### Features

- 📋 **Drift Detection**
  - `archdoc diff .arch-docs/` → compare current vs. committed
  - Exit code 1 if critical change (e.g., new public API)
  - Track: new dependencies, circular refs, security issues
- 📋 **GitHub Actions Template**
  - Auto-comment PRs: "This change affects 3 services. See architecture impact."
  - Fail build if `--max-cost` or `--compliance` thresholds breached
  - Integration with branch protection rules
- 📋 **Architecture Scorecard**
  - `archdoc score` → health % + breakdown (modularity, security, test coverage)
  - Trend tracking over time
  - Actionable recommendations
- 📋 **Export Integrations**
  - `archdoc export --format confluence` → push to Confluence
  - `archdoc export --format notion` → Notion database integration
  - `archdoc export --format html` → static site generation

---

## 🗂️ EPIC 5: Extensibility & Ecosystem

**Goal:** Make ArchDoc a platform devs can extend.

**Status**: 📋 Planned (Q2-Q3 2026+)

### Features

- 📋 **Custom Agent API**
  - Allow users to add `custom-agent.js` via config
  - Extend analysis with domain-specific logic
- 📋 **Programmatic Library Mode**
  - Export `DocumentationOrchestrator` for embedding in build tools
  - Use ArchDoc as a library in your own tools
- 📋 **Architecture-as-Code (Preview)**
  - Let teams define rules: "All services must have README.arch.md"
  - ArchDoc validates + reports violations
  - Example: "No circular dependencies between layers"

---

## 🗂️ Summary Timeline

| Quarter      | Focus                                     | Status         |
| ------------ | ----------------------------------------- | -------------- |
| **Q4 2025**  | MCP, Delta Analysis, RAG Foundation       | ✅ COMPLETE    |
| **Q1 2026**  | TOON Optimization, Query API              | 📋 IN PROGRESS |
| **Q2 2026**  | Drift Detection, GitHub Actions, Scoring  | 📋 PLANNED     |
| **Q3 2026**  | Custom Agents, Library Mode               | 📋 PLANNED     |
| **Q4 2026+** | Architecture-as-Code, Enterprise Features | 📋 ROADMAP     |

---

## 💬 Community Feedback

Have ideas? We'd love to hear them!

- 💡 **Suggest Features**: [Open an Issue](https://github.com/techdebtgpt/architecture-doc-generator/issues/new?template=feature_request.md)
- 🗣️ **Join Discussion**: [GitHub Discussions](https://github.com/techdebtgpt/architecture-doc-generator/discussions)
- ⭐ **Vote on Features**: React with 👍 on issues you care about
- 🤝 **Contribute**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
