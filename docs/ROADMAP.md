# 🚀 Future Work & Roadmap

This plan treats MCP as a new foundational layer, not an afterthought. We're building breakthrough features to transform how teams manage architecture documentation.

---

## 📋 Table of Contents

- [🗂️ EPIC 1: Implement Core MCP Integration](#-epic-1-implement-core-mcp-integration)
- [🗂️ EPIC 2: Token & Cost Optimization (MCP + CLI)](#-epic-2-token--cost-optimization-mcp--cli)
- [🗂️ EPIC 3: Developer-Centric Query Interface](#-epic-3-developer-centric-query-interface)
- [🗂️ EPIC 4: Observability & CI Guardrails](#-epic-4-observability--ci-guardrails)
- [🗂️ EPIC 5: Extensibility & Ecosystem](#-epic-5-extensibility--ecosystem)
- [Contributing Ideas](#contributing-ideas)

---

## 🗂️ EPIC 1: Implement Core MCP Integration

**Goal:** Enable Cursor, Claude Code, VS Code + Copilot, and Claude Desktop to invoke ArchDoc as a native tool.

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
  - Include prompts devs can use:
    - “Use archdoc to explain this file’s role”
    - “Check if this follows our layered architecture”

---

## 🗂️ EPIC 2: Token & Cost Optimization (MCP + CLI)

**Goal:** Make every mode (CLI and MCP) as lean as possible—especially for frequent IDE use.

### Features

- ✅ **JSON-First Internal Format**
  - All agents write to `.archdoc/cache/*.json`
  - Markdown is a rendered view, not source of truth
- ✅ **Delta Analysis**
  - On rerun, only process changed files (via file hash or Git diff)
  - Cuts token use by 60–90% in iterative dev
- ✅ **Lite Mode (`--depth quick`)**
  - Disables refinement, uses minimal LLM steps
  - Default for MCP-triggered analysis
- ✅ **Local-Only Mode**
  - `archdoc analyze --llm local` → use Ollama or disable LLM entirely
  - Ideal for security-sensitive or offline teams
- ✅ **Cost Dashboard in `metadata.md`**
  - Show per-agent token count, estimated cost, and savings vs. full run

---

## 🗂️ EPIC 3: Developer-Centric Query Interface

**Goal:** Let devs ask natural questions—via CLI or IDE—and get instant, actionable answers.

### Features

- ✅ **`archdoc query` Command**
  - `archdoc query "Which service handles auth?"`
  - Uses RAG over `.archdoc/cache` → no LLM needed if answer is cached
- ✅ **`archdoc explain <file>`**
  - Returns role, journey, risks, dependencies for a single file
  - Designed for IDE hover or chat context
- ✅ **Architecture Impact Analysis**
  - `archdoc impact ./src/auth/` → “Affects: login, SSO, password reset”
- ✅ **Journey Mapping**
  - Auto-infer user journeys from routes/test names
  - Output `journeys.json`: `{ "checkout": ["payment-svc", "inventory-api"] }`
- ✅ **VS Code–Ready Metadata**
  - Generate `.archdoc/components.json` with tags like `"arch_role": "Auth Boundary"`
  - Enables future CodeLens without extension

---

## 🗂️ EPIC 4: Observability & CI Guardrails

**Goal:** Prevent architecture drift; make docs a living contract.

### Features

- ✅ **Drift Detection**
  - `archdoc diff .arch-docs/` → compare current vs. committed
  - Exit code 1 if critical change (e.g., new public API)
- ✅ **GitHub Actions Template**
  - Auto-comment PRs: “This change affects 3 services. See architecture impact.”
  - Fail build if `--max-cost` or `--compliance` thresholds breached
- ✅ **Architecture Scorecard**
  - `archdoc score` → health % + breakdown (modularity, security, test coverage)
- ✅ **Export to Confluence / Notion / HTML**
  - `archdoc export --format confluence`

---

## 🗂️ EPIC 5: Extensibility & Ecosystem

**Goal:** Make ArchDoc a platform devs can extend.

### Features

- ✅ **Custom Agent API**
  - Allow users to add `custom-agent.js` via config
- ✅ **Programmatic Library Mode**
  - Export `DocumentationOrchestrator` for embedding in build tools
- ✅ **Architecture-as-Code (Preview)**
  - Let teams define rules: “All services must have README.arch.md”
  - ArchDoc validates + reports violations

---

## 💬 Community Feedback

Have ideas? We'd love to hear them!

- 💡 **Suggest Features:** [Open an Issue](https://github.com/techdebtgpt/architecture-doc-generator/issues/new?template=feature_request.md)
- 🗣️ **Join Discussion:** [GitHub Discussions](https://github.com/techdebtgpt/architecture-doc-generator/discussions)
- ⭐ **Vote on Features:** React with 👍 on issues you care about
