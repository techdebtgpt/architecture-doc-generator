# 🏗️ ArchDoc Implementation Plan

This document breaks down our Roadmap into actionable User Stories and small TODO items.

---

## 🗂️ EPIC 1: Implement Core MCP Integration

**Goal:** Native, high-performance integration with Cursor, Claude Code, and VS Code.

### Story 1: Standardize Tool Output for AI Clients

> "As an AI client (like Claude), I want tool outputs to be pure JSON so that I can parse results reliably without being distracted by Markdown formatting."

- [ ] Refactor `src/mcp-server/tools/handlers.ts` to return structured JSON.
- [ ] Ensure `generate_documentation` returns a JSON summary of what was created.
- [ ] Handle client-specific capabilities to decide between JSON and Markdown output.

### Story 2: Automated Multi-Client Setup

> "As a developer, I want to register ArchDoc as a tool in my IDE with one simple command."

- [ ] Implement `archdoc setup-mcp cursor` (writes to `~/.cursor/mcp.json`).
- [ ] Implement `archdoc setup-mcp claude-code` (writes to `~/.claude/mcp.json`).
- [ ] Implement `archdoc setup-mcp vscode` (writes to `~/.vscode/mcp.json`).
- [ ] Implement `archdoc setup-mcp claude-desktop` (writes to OS-specific config path).

### Story 3: Smart MCP-Aware Execution Mode

> "As a user, I want ArchDoc to respond instantly in the IDE by reusing cached analysis instead of re-running LLM agents."

- [ ] Implement detection of MCP client environment via headers/env vars.
- [ ] Update `DocumentationService` to check `.archdoc/cache` before running agents.
- [ ] Implement "Zero-Config" fallback: trigger a `quick` analysis if no cache exists.

---

## 🗂️ EPIC 2: Token & Cost Optimization

**Goal:** Reduce LLM costs by 90% for iterative development.

### Story 4: JSON-First Internal Structure ✅ COMPLETED

> "As a developer, I want technical details stored in JSON so that they can be easily queried by tools."

- [x] Refactor agents to output raw JSON to `.archdoc/cache/*.json`.
- [x] Create a `MarkdownRenderer` service to generate `.md` files from JSON.
- [x] Include token usage and execution metadata in JSON cache.
- [x] Update all core agents (FileStructure, Dependency, Architecture) to use renderer.

**Status**: ✅ Complete (2025-12-21)
**Details**: See [Story 4 Walkthrough](file:///../.gemini/antigravity/brain/28fc2c8a-23ed-40a3-a35c-e2debe470d91/walkthrough.md)

### Story 5: Delta Analysis via Git ✅ COMPLETED

> "As a developer, I only want to pay for analyzing files I actually changed."

- [x] Implement `GitService` for Git-based change detection
- [x] Implement `FileHashService` for non-Git fallback
- [x] Update `FileSystemScanner` to mark files with change status
- [x] Update `DocumentationOrchestrator` to skip unchanged files
- [x] Add `--force`, `--since` CLI flags

**Status**: ✅ Complete (2025-01-XX)
**Details**: Delta analysis automatically detects changed files using Git (or file hashing for non-Git projects) and only analyzes modified/new files, reducing costs by 60-90% on incremental runs.
**Expected Savings**: 60-90% token reduction on incremental runs

### Story 6: TOON Format Integration for LLM Prompts

> "As a developer, I want to reduce token costs by using TOON format in LLM prompts instead of JSON."

- [ ] Install `@toon-format/toon` package
- [ ] Replace `JSON.stringify()` in agent prompts with TOON encoding
- [ ] Update `file-structure-agent`, `pattern-detector-agent`, and other agents that send structured data to LLMs
- [ ] Keep JSON for cache files (universal compatibility)
- [ ] Measure token savings (expected 60-90% reduction in prompt tokens)

**Status**: 📋 Planned
**Expected Savings**: 60-90% token reduction in LLM prompts

### Story 7: Real-time Cost Dashboard

> "As a project lead, I want to see exactly how much each analysis costs."

- [ ] Inject token counting into the `LLMService` base class.
- [ ] Record per-agent costs in the result object.
- [ ] Update `kpi.md` or `metadata.md` with a "Savings vs Full Run" metric.

---

## 🗂️ EPIC 3: Developer-Centric Query Interface

**Goal:** Turn documentation into an interactive expert.

### Story 8: Instant CLI Query

> "As a developer, I want to ask questions about the codebase without opening a browser."

- [ ] Implement `archdoc query <question>`.
- [ ] Connect the query command to the existing `VectorStoreService`.
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
