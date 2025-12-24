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

## 🗂️ EPIC 1: Implement Core MCP Integration

**Goal:** Native, high-performance integration with Cursor, Claude Code, and VS Code.

**Status**: ✅ Completed (December 2025)

### Story 1: Standardize Tool Output for AI Clients

> "As an AI client (like Claude), I want tool outputs to be pure JSON so that I can parse results reliably without being distracted by Markdown formatting."

- [x] Refactor `src/mcp-server/tools/handlers.ts` to return structured JSON.
- [x] Ensure `generate_documentation` returns a JSON summary of what was created.
- [x] Handle client-specific capabilities to decide between JSON and Markdown output.

### Story 2: Automated Multi-Client Setup

> "As a developer, I want to register ArchDoc as a tool in my IDE with one simple command."

- [x] Implement `archdoc setup-mcp cursor` (writes to `~/.cursor/mcp.json`).
- [x] Implement `archdoc setup-mcp claude-code` (writes to `~/.claude/mcp.json`).
- [x] Implement `archdoc setup-mcp vscode` (writes to `~/.vscode/mcp.json`).
- [x] Implement `archdoc setup-mcp claude-desktop` (writes to OS-specific config path).

### Story 3: Smart MCP-Aware Execution Mode

> "As a user, I want ArchDoc to respond instantly in the IDE by reusing cached analysis instead of re-running LLM agents."

- [x] Implement detection of MCP client environment via headers/env vars.
- [x] Update `DocumentationService` to check `.archdoc/cache` before running agents.
- [x] Implement "Zero-Config" fallback: trigger a `quick` analysis if no cache exists.

### Story 3b: Direct IDE Agent Invocation (Copilot, Cursor, Claude Code)

> "As a developer, I want to call ArchDoc agents directly from IDE copilots without adding a separate API key in config."

**Implementation**:

- [ ] Support MCP auth-pass-through so IDE clients can invoke agents without extra keys
- [ ] Update `setup-mcp` to advertise keyless mode for Copilot/Cursor/Claude Code
- [ ] Add capability detection to auto-select direct invocation where supported
- [ ] Document IDE-specific steps in `docs/MCP-SETUP.md` (no additional key required)

**Acceptance Criteria**:

- [ ] ArchDoc agents callable from Copilot/Cursor/Claude Code without adding a new API key
- [ ] Fallback to config-based key still works for non-MCP or unsupported clients
- [ ] Behavior covered by an integration smoke test

---

## 🗂️ EPIC 2: Token Optimization with TOON Format

### Completed earlier (Stories 4–5)

### Story 4: JSON-First Internal Structure ✅ COMPLETED

> "As a developer, I want technical details stored in JSON so that they can be easily queried by tools."

- [x] Refactor agents to output raw JSON to `.archdoc/cache/*.json`.
- [x] Create a `MarkdownRenderer` service to generate `.md` files from JSON.
- [x] Include token usage and execution metadata in JSON cache.
- [x] Update all core agents (FileStructure, Dependency, Architecture) to use renderer.

**Status**: ✅ Complete (2025-12-21)

### Story 5: Delta Analysis via Git ✅ COMPLETED

> "As a developer, I only want to pay for analyzing files I actually changed."

- [x] Implement `GitService` for Git-based change detection
- [x] Implement `FileHashService` for non-Git fallback
- [x] Update `FileSystemScanner` to mark files with change status
- [x] Update `DocumentationOrchestrator` to skip unchanged files
- [x] Add `--force`, `--since` CLI flags

**Status**: ✅ Complete (2025-12-23)

**Goal**: Reduce LLM token usage by 40%+ through structured output formats.

**Status**: 📋 Ready for implementation

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

## 🗂️ EPIC 3: Query & RAG Improvements

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

## 🗂️ EPIC 4: Observability & CI Guardrails

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

## 🗂️ EPIC 5: Extensibility

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

## 🗂️ EPIC 6: TOON-Primary Architecture (Option 3)

**Goal:** Refactor to TOON-Primary architecture where all agents output TOON format directly from LLMs, with JSON derived from TOON, achieving 30-40% token savings while maintaining backwards compatibility through SOLID/DRY refactoring.

**Expected Benefits:**

- 30-40% token cost reduction overall (up to 45% for tabular agents)
- Faster LLM response generation (fewer tokens to produce)
- Higher LLM accuracy on tabular data (73.9% vs 70% from TOON research)
- Improved code maintainability via SOLID principles

**Timeline:** 7-9 working days (54-74 hours)

### Story 13: Foundation - Format Abstraction Layer

> "As a developer, I want a pluggable format system that supports both JSON and TOON without code duplication."

**Phase 1 Tasks (Week 1):**

- [ ] Install `@toon-format/toon` NPM package
- [ ] Create `src/utils/format-parser.interface.ts` - Abstract `IFormatParser` interface with `parse()`, `getFormatName()`, `generateInstructions()` methods (Dependency Inversion Principle)
- [ ] Create `src/utils/toon-parser.ts` - TOON format parser implementation using `@toon-format/toon.toonToJson()`
- [ ] Create `src/utils/json-parser-adapter.ts` - Adapter wrapping existing `LLMJsonParser` to implement `IFormatParser` interface
- [ ] Create `src/utils/schema-to-toon.ts` - Utility to convert Zod schemas to TOON format examples for LLM prompts
- [ ] Create `src/services/format-factory.ts` - Factory pattern for creating parsers based on config
- [ ] Add unit tests for TOON parsing (`tests/utils/toon-parser.test.ts`) with sample KPI, dependency, and schema data
- [ ] Validate TOON→JSON conversion matches JSON parser output for identical data

**Deliverables:** ✅ Format abstraction working with passing tests

### Story 14: SOLID Refactoring - BaseAgentWorkflow

> "As a maintainer, I want BaseAgentWorkflow to follow Single Responsibility Principle and use dependency injection."

**Phase 2 Tasks (Week 1-2):**

- [ ] Refactor `BaseAgentWorkflow` constructor to accept `IFormatParser` via dependency injection
- [ ] Replace hardcoded `LLMJsonParser.parse()` calls with injected `this.formatParser.parse()` in `analyzeInitialNode()`
- [ ] Update `buildSystemPrompt()` to accept `format: 'json' | 'toon'` parameter
- [ ] Add abstract methods to `BaseAgentWorkflow`:
  - [ ] `getOutputSchema(): ZodSchema` - Each agent provides its Zod validation schema
  - [ ] `getFallbackData(): Record<string, unknown>` - Each agent provides fallback data on parse errors
- [ ] Extract `RefinementService` class from `BaseAgentWorkflow` (gap detection, question generation logic)
- [ ] Extract `WorkflowEngine` class from `BaseAgentWorkflow` (LangGraph state machine orchestration)
- [ ] Update `BaseAgentWorkflow` to become thin coordinator delegating to injected services
- [ ] Update `AgentExecutionOptions` in `src/types/agent.types.ts` to include `outputFormat?: 'json' | 'toon'` field
- [ ] Ensure no breaking changes to existing agent interface

**Deliverables:** ✅ BaseAgentWorkflow supports both JSON and TOON via DI, SOLID compliance improved

### Story 15: High-Priority Agents - TOON Schema Implementation

> "As a cost-conscious developer, I want tabular agents (KPI, Dependencies, Schemas, Patterns, FileStructure) to output TOON format for maximum token savings."

**Phase 3 Tasks (Week 2):**

#### For Each Agent (5 agents):

**KPI Analyzer Agent** (`src/agents/kpi-analyzer-agent.ts`):

- [ ] Implement `getOutputSchema()` returning existing `KPIOutputSchema`
- [ ] Implement `getFallbackData()` returning minimal health score object
- [ ] Add `buildToonSystemPrompt()` method with TOON format instructions for health scores, insights tables
- [ ] Update `buildSystemPrompt()` to check `context.outputFormat` and call appropriate prompt builder
- [ ] Test TOON output validation with real project data

**Dependency Analyzer Agent** (`src/agents/dependency-analyzer-agent.ts`):

- [ ] Implement `getOutputSchema()` returning existing dependency schema
- [ ] Implement `getFallbackData()` returning empty dependency lists
- [ ] Add `buildToonSystemPrompt()` with TOON format for package lists, vulnerabilities table
- [ ] Update `buildSystemPrompt()` to support dual formats
- [ ] Test TOON output with multi-language projects

**Schema Generator Agent** (`src/agents/schema-generator-agent.ts`):

- [ ] Implement `getOutputSchema()` returning existing schema definitions schema
- [ ] Implement `getFallbackData()` returning "no schemas found" state
- [ ] Add `buildToonSystemPrompt()` with TOON format for entity tables, relationships
- [ ] Update `buildSystemPrompt()` to support dual formats
- [ ] Test TOON output with Prisma, TypeORM, GraphQL schemas

**File Structure Agent** (`src/agents/file-structure-agent.ts`):

- [ ] Implement `getOutputSchema()` returning file structure schema
- [ ] Implement `getFallbackData()` returning empty file lists
- [ ] Add `buildToonSystemPrompt()` with TOON format for directory trees, file lists
- [ ] Update `buildSystemPrompt()` to support dual formats
- [ ] Test TOON output with nested monorepo structures

**Pattern Detector Agent** (`src/agents/pattern-detector-agent.ts`):

- [ ] Implement `getOutputSchema()` returning pattern detection schema
- [ ] Implement `getFallbackData()` returning empty pattern lists
- [ ] Add `buildToonSystemPrompt()` with TOON format for design patterns table, anti-patterns table
- [ ] Update `buildSystemPrompt()` to support dual formats
- [ ] Test TOON output with various framework patterns

**Integration:**

- [ ] Create integration test suite validating TOON → JSON → Markdown pipeline for all 5 agents
- [ ] Measure token savings per agent (target: ≥30% for file structure/patterns, ≥40% for KPI/deps/schemas)

**Deliverables:** ✅ 5 high-priority agents support both JSON and TOON output with validated token savings

### Story 16: Medium-Priority Agents - Partial TOON Support

> "As a developer, I want complex agents (Flows, Architecture, Security) to use TOON for tabular data while keeping JSON for nested/diagram content."

**Phase 4 Tasks (Week 3):**

**Flow Visualization Agent** (`src/agents/flow-visualization-agent.ts`):

- [ ] Implement `getOutputSchema()` returning flow analysis schema
- [ ] Implement `getFallbackData()` returning empty flow state
- [ ] Add hybrid prompt: TOON format for insights lists, JSON for Mermaid diagram text
- [ ] Update `buildSystemPrompt()` to support dual formats
- [ ] Test TOON output preserves diagram quality

**Architecture Analyzer Agent** (`src/agents/architecture-analyzer-agent.ts`):

- [ ] Implement `getOutputSchema()` returning architecture schema
- [ ] Implement `getFallbackData()` returning minimal architecture state
- [ ] Add hybrid prompt: TOON format for component lists, JSON for nested component trees and C4 diagrams
- [ ] Update `buildSystemPrompt()` to support dual formats
- [ ] Test TOON output maintains architectural insights quality

**Security Analyzer Agent** (`src/agents/security-analyzer-agent.ts`):

- [ ] Implement `getOutputSchema()` returning security findings schema
- [ ] Implement `getFallbackData()` returning empty vulnerability state
- [ ] Add `buildToonSystemPrompt()` with TOON format for vulnerability tables, findings arrays
- [ ] Update `buildSystemPrompt()` to support dual formats
- [ ] Test TOON output preserves security detail accuracy

**Integration:**

- [ ] Integration tests for all 3 medium-priority agents
- [ ] Measure token savings (target: 20-25% for flows/architecture, 35-40% for security)

**Deliverables:** ✅ All 8 agents support TOON (full or partial) with validated savings

### Story 17: CLI Integration & Orchestrator Updates

> "As a user, I want to opt-in to TOON format via CLI flag while keeping JSON as the default for backwards compatibility."

**Phase 5 Tasks (Week 3):**

- [ ] Add `--output-format <json|toon>` CLI flag to `cli/commands/analyze.command.ts`
- [ ] Update config schema (`src/config/config.interface.ts`) to support `outputFormat?: 'json' | 'toon'` field
- [ ] Update `DocumentationOrchestrator` (`src/orchestrator/documentation-orchestrator.ts`) to:
  - [ ] Read `outputFormat` from config or CLI flag (default: `'json'`)
  - [ ] Create appropriate format parser via `FormatFactory`
  - [ ] Inject parser into agents during construction
  - [ ] Pass format through `AgentExecutionOptions.outputFormat`
- [ ] Verify `MultiFileMarkdownFormatter.writeJsonCache()` still receives JSON (TOON converted by parser)
- [ ] Ensure Markdown output identical regardless of source format
- [ ] Add `--output-format toon` to README examples with warning about experimental status

**Deliverables:** ✅ CLI flag works end-to-end, JSON cache format unchanged

### Story 18: Benchmarking & Performance Validation

> "As a project lead, I want concrete metrics proving TOON saves 30-40% on token costs without quality regression."

**Phase 5 Tasks (Week 3):**

- [ ] Create benchmark script (`scripts/benchmark-toon-vs-json.ts`) that:
  - [ ] Runs same analysis with `--output-format json` and `--output-format toon`
  - [ ] Compares token usage per agent
  - [ ] Compares total execution time
  - [ ] Validates Markdown output is semantically identical
  - [ ] Tests on 3-5 real-world projects (small, medium, large)
- [ ] Document benchmark results in `docs/TOON_BENCHMARK_RESULTS.md`
- [ ] Verify metrics:
  - [ ] Token savings ≥30% overall (≥40% for tabular agents)
  - [ ] Performance regression <5% (TOON parsing overhead)
  - [ ] LLM output quality maintained (no broken JSON, no missing fields)
- [ ] Load testing: Confirm TOON parsing doesn't introduce memory leaks on large outputs
- [ ] Add performance metrics to `metadata.md` generation (show TOON vs JSON comparison)

**Deliverables:** ✅ Benchmarks confirm 30-40% savings with <5% performance impact

### Story 19: Documentation & Migration Guide

> "As a new contributor or user, I want clear documentation on when to use TOON, how it works, and migration steps."

**Phase 6 Tasks (Week 4):**

- [ ] Create `docs/TOON_FORMAT.md`:
  - [ ] TOON format specification and syntax rules
  - [ ] Examples of TOON vs JSON for each agent type
  - [ ] Token savings breakdown per agent
  - [ ] When to use TOON vs JSON (tabular data = TOON, nested/diagrams = JSON)
- [ ] Create `docs/TOON_MIGRATION_GUIDE.md`:
  - [ ] Step-by-step upgrade path from JSON to TOON
  - [ ] Breaking changes checklist (none expected, but document guarantees)
  - [ ] Rollback procedure if issues arise
  - [ ] FAQ for common TOON parsing errors
- [ ] Update `README.md`:
  - [ ] Add TOON format to Features section
  - [ ] Add `--output-format toon` examples to Quick Start
  - [ ] Add "Token Savings" section with benchmark results
  - [ ] Add warning about experimental status in v0.4.0
- [ ] Update `CHANGELOG.md`:
  - [ ] v0.4.0 entry: "Added TOON format support (opt-in via `--output-format toon`)"
  - [ ] List all modified agents
  - [ ] Document expected token savings
- [ ] Update `docs/ARCHITECTURE.md`:
  - [ ] Add Format Abstraction Layer diagram
  - [ ] Document `IFormatParser` interface and implementations
  - [ ] Show TOON→JSON→Markdown pipeline flow
- [ ] Add TOON examples to `docs/API.md` for programmatic usage

**Deliverables:** ✅ Complete documentation ready for v0.4.0 release

### Story 20: Testing & Quality Assurance

> "As a maintainer, I want comprehensive test coverage ensuring TOON doesn't break existing functionality."

**Testing Tasks (Continuous):**

- [ ] **Unit Tests:**
  - [ ] TOON parser with edge cases (malformed TOON, missing fields, Unicode)
  - [ ] JSON parser adapter maintains existing behavior
  - [ ] Format factory creates correct parsers based on config
  - [ ] Schema-to-TOON converter handles all Zod types
- [ ] **Integration Tests:**
  - [ ] Each agent with TOON format on real project data
  - [ ] Full pipeline: analyze → cache → markdown → query (verify queries still work)
  - [ ] CLI flag parsing and format propagation
  - [ ] Error handling: LLM returns invalid TOON (fallback to JSON retry?)
- [ ] **Regression Tests:**
  - [ ] Existing JSON tests still pass (no breaking changes)
  - [ ] Markdown output byte-identical for JSON vs TOON input (same semantic content)
  - [ ] Token counting accuracy (TOON tokens counted correctly)
  - [ ] LangSmith tracing shows TOON format in traces
- [ ] **Performance Tests:**
  - [ ] TOON parsing speed vs JSON parsing speed
  - [ ] Memory usage for large TOON outputs (10K+ line tables)
  - [ ] Concurrent agent execution with TOON format
- [ ] **User Acceptance Tests:**
  - [ ] Test on 5+ open-source projects (different languages, sizes)
  - [ ] Validate KPI dashboard accuracy with TOON vs JSON
  - [ ] Verify dependency vulnerabilities detected correctly
  - [ ] Confirm schema diagrams render properly

**Deliverables:** ✅ All tests passing, no regressions

---

## 📊 TOON Option 3 - Implementation Metrics

### Expected Token Savings Per Agent

| Agent                 | Current Tokens | TOON Tokens | Savings | Category    |
| --------------------- | -------------- | ----------- | ------- | ----------- |
| KPI Analyzer          | 3,500          | 2,100       | **40%** | Tabular     |
| Dependency Analyzer   | 4,000          | 2,400       | **40%** | Tabular     |
| Schema Generator      | 2,500          | 1,625       | **35%** | Tabular     |
| Pattern Detector      | 2,800          | 1,960       | **30%** | Tabular     |
| File Structure        | 3,000          | 2,100       | **30%** | Mixed       |
| Security Analyzer     | 3,200          | 2,080       | **35%** | Tabular     |
| Flow Visualization    | 5,000          | 4,000       | **20%** | Partial     |
| Architecture Analyzer | 5,500          | 4,400       | **20%** | Partial     |
| **Total**             | **29,500**     | **20,665**  | **30%** | **Overall** |

### Cost Impact (Claude Sonnet 4 @ $3.00/1M input tokens)

- **Savings per run:** ~$0.026 (2.6 cents)
- **Savings per 100 runs/month:** $2.60/month
- **Savings per 1,000 runs/month:** $26.00/month
- **Savings per 10,000 runs/month:** $260.00/month

### Release Timeline

- **v0.4.0** (Target: Q1 2025): TOON support added with `--output-format toon` flag (opt-in, default: JSON)
- **v0.5.0** (Target: Q2 2025): TOON enabled by default with `--output-format json` fallback
- **v1.0.0** (Target: Q3 2025): Remove JSON prompts entirely (TOON-only, JSON legacy flag deprecated)

### Success Criteria

**Must-Have for v0.4.0:**

- [ ] All 8 agents support TOON output via CLI flag
- [ ] JSON cache format unchanged (backwards compatible)
- [ ] Markdown output semantically identical
- [ ] Token savings ≥30% measured on 5+ real projects
- [ ] No breaking changes (JSON remains default)
- [ ] Integration tests pass for all agents
- [ ] Documentation complete (TOON_FORMAT.md, MIGRATION_GUIDE.md)

**Should-Have for v0.5.0:**

- [ ] TOON enabled by default with `--legacy-json` fallback
- [ ] SOLID refactoring complete (RefinementService, WorkflowEngine extracted)
- [ ] Performance benchmarks show <5% regression
- [ ] Query system works transparently on TOON-derived JSON cache

**Nice-to-Have for v1.0.0:**

- [ ] Remove JSON prompts entirely (TOON-only)
- [ ] Native TOON query parsing (no JSON conversion)
- [ ] Drift detection uses TOON diffs for faster comparison

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

- ✅ **EPIC 1 - Core MCP Integration**: Completed (structured JSON output, multi-client setup, cache-aware execution)
- 📋 **EPIC 2 - TOON Format**: Token optimization (35-40% reduction)
- 📋 **EPIC 3 - Query API**: Natural language search over cached docs
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
