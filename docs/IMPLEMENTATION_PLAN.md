# 🏗️ ArchDoc Implementation Plan

This document breaks down our Roadmap into **actionable User Stories and TODO items for the current quarter**. For long-term vision and completed features, see [ROADMAP.md](./ROADMAP.md).

---

## 📋 Overview

**Current Status**: v0.3.37+ (December 2025)

- ✅ Core agents (8 total): File Structure, Dependencies, Patterns, Flows, Schemas, Architecture, Security, KPI
- ✅ MCP integration for IDE use
- ✅ JSON-first cache architecture
- ✅ Delta analysis (Git + file hashing)
- ✅ RAG with hybrid retrieval (semantic + graph-based)
- 📋 Next: TOON format optimization, query API, drift detection

---

## 🗂️ EPIC 1: Token Optimization with TOON Format

**Goal**: Reduce LLM token usage by 40%+ through structured output formats.

**Status**: ✅ Ready for implementation

### Story 6: TOON Format Integration for LLM Prompts

> "As a developer, I want to reduce token costs by using TOON format in LLM prompts instead of JSON."

**What is TOON?**

- Compact, human-readable encoding of JSON data
- Combines YAML indentation with CSV-style tabular arrays
- 40% smaller than JSON for uniform arrays
- Better LLM accuracy (73.9% vs 70%)

**Implementation**:

- [ ] Install `@toon-format/toon` package
- [ ] Create `ToonMarkdownRenderer` service (converts TOON to markdown tables)
- [ ] Update agents with tabular data to use TOON:
  - [ ] `file-structure-agent`: Files, directories, patterns
  - [ ] `dependency-analyzer-agent`: Vulnerabilities, dependencies
  - [ ] `schema-generator-agent`: Entities, relationships
  - [ ] `pattern-detector-agent`: Detected patterns
- [ ] Keep JSON for deeply nested/non-uniform data (architecture components)
- [ ] Add `--toon-format` flag to CLI for opt-in
- [ ] Measure token savings in real analysis runs

**Expected Results**:

- 35-40% token reduction per agent
- 390+ tokens saved per full analysis (~10% cost reduction)
- Improved LLM accuracy on tabular data

**Acceptance Criteria**:

- [ ] All agents support TOON output (with JSON fallback)
- [ ] No breaking changes to existing output
- [ ] Documentation updated
- [ ] Token savings verified in benchmarks

---

## 🗂️ EPIC 2: Query & RAG Improvements

**Goal**: Make architecture documentation fully queryable without LLM calls.

**Status**: 📋 In planning

### Story 8: Instant CLI Query

> "As a developer, I want to ask questions about the codebase without opening a browser or waiting for LLM responses."

**Implementation**:

- [ ] Implement `archdoc query <question>` command
- [ ] Connect to existing `VectorStoreService` for semantic search
- [ ] Query `.archdoc/cache/*.json` instead of re-running LLM
- [ ] Support multiple query types:
  - [ ] Natural language: "Which services handle authentication?"
  - [ ] File-based: `archdoc explain src/auth/` → role, dependencies, risks
  - [ ] Impact analysis: `archdoc impact src/utils/` → shows dependents
- [ ] Fallback to local regex search if vector embeddings disabled

**Acceptance Criteria**:

- [ ] Query returns results in <100ms
- [ ] No API costs (use cached JSON only)
- [ ] Results ranked by relevance

### Story 9: File-to-Architecture Mapping

> "As a developer looking at a specific file, I want to know its role and dependencies instantly."

**Implementation**:

- [ ] Implement `archdoc explain <file_path>` command
- [ ] Extract architecture role from cached analysis
- [ ] Show journey mapping: which user flows touch this file
- [ ] Display critical dependencies and dependents

---

## 🗂️ EPIC 3: Observability & CI Guardrails

**Goal**: Enforce architectural integrity in every PR.

**Status**: 📋 Planned

### Story 10: Architecture Drift Detection

> "As a tech lead, I want the build to fail if a developer introduces a major architectural violation."

**Implementation**:

- [ ] Implement `archdoc diff <baseline> <current>` command
- [ ] Compare current analysis against committed baseline (`.arch-docs/baseline.json`)
- [ ] Detect "Critical Changes":
  - [ ] New public APIs
  - [ ] Circular dependencies introduced
  - [ ] Security vulnerabilities added
  - [ ] Test coverage decreased
- [ ] Implement exit codes for CI/CD:
  - Exit 0: No critical changes
  - Exit 1: Critical changes detected
  - Exit 2: Analysis failed

**Acceptance Criteria**:

- [ ] Can run in GitHub Actions
- [ ] Clear diff report in console
- [ ] Configurable thresholds

### Story 11: Automated PR Comments

> "As a reviewer, I want to see the architectural impact of a PR directly in the GitHub UI."

**Implementation**:

- [ ] Create GitHub Action template (`.github/workflows/arch-check.yml`)
- [ ] Generate "Impact Summary" for PR descriptions
- [ ] Auto-comment on PRs with:
  - Files changed in architecture
  - New dependencies introduced
  - Risk assessment

---

## 🗂️ EPIC 4: Extensibility

**Goal**: Empower teams to customize their analysis.

**Status**: 📋 Planned

### Story 12: Custom Agent API

> "As a user, I want to add my own domain-specific analysis agents."

**Implementation**:

- [ ] Define standard `BaseAgent` interface for third-party extensions
- [ ] Implement dynamic loading mechanism for `custom-agents/*.ts`
- [ ] Allow configuration-based agent selection
- [ ] Support for custom output formats

---

## 📊 Current Work (v0.3.37+)

### Completed

- ✅ **Core Agents**: 8 agents covering structure, dependencies, patterns, security
- ✅ **MCP Integration**: Cursor, Claude Code, VS Code, Claude Desktop
- ✅ **JSON Cache**: `.archdoc/cache/` with structured outputs
- ✅ **Delta Analysis**: Git-based + file hash fallback (60-90% savings)
- ✅ **RAG Search**: Semantic + graph-based hybrid retrieval
- ✅ **LangSmith Tracing**: Full observability with token tracking
- ✅ **Dynamic TOC**: Auto-generated table of contents

### In Progress

- 📋 **TOON Format**: Token optimization (35-40% reduction)
- 📋 **Query API**: Natural language search over cached docs
- 📋 **Prettier Check**: CI/CD lint improvements

### Next Quarter

- 📋 **Drift Detection**: Architecture compliance checking
- 📋 **GitHub Actions**: Automated PR impact comments
- 📋 **Custom Agents**: Extensibility API

---

## 🔗 Related Documents

- **[ROADMAP.md](./ROADMAP.md)** - Long-term vision and completed features
- **[docs/ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture
- **[docs/CONTRIBUTING.md](./CONTRIBUTING.md)** - Developer guide
- **[docs/MCP-SETUP.md](./MCP-SETUP.md)** - MCP configuration

---

## 💬 Feedback & Contributions

Have ideas or want to contribute? We'd love to hear from you!

- 💡 **Suggest Features**: [Open an Issue](https://github.com/techdebtgpt/architecture-doc-generator/issues/new?template=feature_request.md)
- 🗣️ **Join Discussion**: [GitHub Discussions](https://github.com/techdebtgpt/architecture-doc-generator/discussions)
- 🤝 **Contribute**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
- [ ] Fallback to local regex search if vector embeddings are disabled.

### Story 9: File-to-Architecture Mapper

> "As a developer looking at a specific file, I want to know its role and dependencies instantly."

- [ ] Implement `archdoc explain <file_path>`.
- [ ] Extract "Journey Mapping" to show which user flows touch this file.

---

## 🗂️ EPIC 4: Observability & CI Guardrails

**Goal:** Enforce architectural integrity in every PR.

### Story 10: Architecture Drift Detection

> "As a tech lead, I want the build to fail if a developer introduces a major architectural violation."

- [ ] Implement `archdoc diff <dir>` to compare current analysis against a committed baseline.
- [ ] Define "Critical Changes" (e.g., new public API, circular dependency).
- [ ] Implement exit codes for CI/CD failure.

### Story 11: Automated PR Comments

> "As a reviewer, I want to see the architectural impact of a PR directly in the GitHub UI."

- [ ] Create a reusable GitHub Action template.
- [ ] Generate an "Impact Summary" for PR descriptions.

---

## 🗂️ EPIC 5: Extensibility

**Goal:** Empower teams to customize their analysis.

### Story 12: Custom Agent API

> "As a user, I want to add my own domain-specific analysis agents."

- [ ] Implement a dynamic loading mechanism for `custom-agents/*.js`.
- [ ] Define a standard `BaseAgent` interface for third-party extensions.
- [ ] Allow configuration-based agent selection.
