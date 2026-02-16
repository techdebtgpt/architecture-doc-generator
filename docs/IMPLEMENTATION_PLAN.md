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
- Reference: [TOON Format Specification](https://github.com/toon-format/toon)

**Implementation Tasks**:

- [ ] **Setup & Dependencies**
  - [ ] Install `@toon-format/toon` package: `npm install @toon-format/toon`
  - [ ] Add TypeScript type definitions if needed
  - [ ] Update `package.json` with new dependency

- [ ] **Core Service Development**
  - [ ] Create `src/services/toon-markdown-renderer.service.ts`
  - [ ] Implement `ToonMarkdownRenderer` class with methods:
    - `convertToToon(data: any): string` - Convert JSON to TOON format
    - `convertToMarkdownTable(toonData: string): string` - Render as markdown
    - `validateToonOutput(toon: string): boolean` - Validate TOON syntax
  - [ ] Add unit tests in `src/services/__tests__/toon-markdown-renderer.service.test.ts`

- [ ] **Agent Integration** (Update prompt templates and output formatters)
  - [ ] `src/agents/file-structure-agent.ts`:
    - [ ] Convert file lists, directory trees, and pattern arrays to TOON
    - [ ] Estimate: ~150 tokens saved per run
  - [ ] `src/agents/dependency-analyzer-agent.ts`:
    - [ ] Convert vulnerability tables and dependency lists to TOON
    - [ ] Estimate: ~120 tokens saved per run
  - [ ] `src/agents/schema-generator-agent.ts`:
    - [ ] Convert entity tables and relationship matrices to TOON
    - [ ] Estimate: ~80 tokens saved per run
  - [ ] `src/agents/pattern-detector-agent.ts`:
    - [ ] Convert detected pattern lists to TOON
    - [ ] Estimate: ~40 tokens saved per run
  - [ ] Keep JSON for: architecture components, nested configs, non-uniform data

- [ ] **CLI Integration**
  - [ ] Add `--toon-format` flag to `cli/commands/analyze.command.ts`
  - [ ] Add `toonFormat: boolean` to config schema in `cli/utils/config-prompts.ts`
  - [ ] Update help text and documentation
  - [ ] Default: `false` (opt-in for backward compatibility)

- [ ] **Benchmarking & Validation**
  - [ ] Create benchmark script: `scripts/benchmark-toon.ts`
  - [ ] Run analysis on 3 sample projects (small, medium, large)
  - [ ] Measure token counts: JSON vs TOON for each agent
  - [ ] Document results in `docs/BENCHMARKS.md`

**Expected Results**:

- **Token Reduction**: 35-40% per agent (390+ tokens saved per full analysis)
- **Cost Savings**: ~10% reduction in LLM API costs
- **Accuracy Improvement**: 73.9% vs 70% on tabular data parsing
- **Performance**: No measurable latency increase

**Acceptance Criteria**:

- [ ] All 4 target agents support TOON output with JSON fallback
- [ ] `--toon-format` flag works correctly in CLI
- [ ] No breaking changes to existing JSON output (default behavior)
- [ ] Unit tests achieve >90% coverage for TOON service
- [ ] Token savings verified: ≥35% reduction in benchmarks
- [ ] Documentation updated:
  - [ ] `README.md` - Feature announcement
  - [ ] `docs/CONFIGURATION.md` - Flag usage
  - [ ] `docs/BENCHMARKS.md` - Performance data

---

## 🗂️ EPIC 2: Query & RAG Improvements

**Goal**: Make architecture documentation fully queryable without LLM calls.

**Status**: 📋 In planning

### Story 8: Instant CLI Query

> "As a developer, I want to ask questions about the codebase without opening a browser or waiting for LLM responses."

**Implementation Tasks**:

- [ ] **Command Infrastructure**
  - [ ] Create `cli/commands/query.command.ts`
  - [ ] Add command registration in `cli/index.ts`
  - [ ] Define command signature: `archdoc query "<question>" [--format json|markdown]`
  - [ ] Add `--verbose` flag for debugging

- [ ] **Query Service Development**
  - [ ] Create `src/services/query.service.ts`
  - [ ] Implement `QueryService` class with methods:
    - `executeQuery(question: string, options: QueryOptions): Promise<QueryResult>`
    - `rankResults(results: SearchResult[]): RankedResult[]`
    - `formatOutput(results: RankedResult[], format: 'json'|'markdown'): string`
  - [ ] Connect to existing `VectorStoreService` for semantic search
  - [ ] Query `.archdoc/cache/*.json` files (no LLM calls)

- [ ] **Query Type Support**
  - [ ] **Natural Language Queries**:
    - [ ] Example: `archdoc query "Which services handle authentication?"`
    - [ ] Parse question → extract keywords → semantic search
    - [ ] Return: Relevant files, components, and code snippets
  - [ ] **File-Based Queries**:
    - [ ] Example: `archdoc query "src/auth/" --type file`
    - [ ] Return: Role, purpose, dependencies, risks, test coverage
  - [ ] **Impact Analysis**:
    - [ ] Example: `archdoc query "src/utils/" --type impact`
    - [ ] Return: Dependent files, affected user flows, risk score

- [ ] **Search Strategies**
  - [ ] **Primary**: Vector embeddings (if enabled)
    - [ ] Use cosine similarity for ranking
    - [ ] Threshold: ≥0.7 similarity score
  - [ ] **Fallback**: Regex + keyword search (if vectors disabled)
    - [ ] Use TF-IDF for relevance ranking
    - [ ] Search across: file names, comments, architecture descriptions

- [ ] **Performance Optimization**
  - [ ] Implement in-memory cache for frequently accessed JSON files
  - [ ] Add index for fast file path lookups
  - [ ] Target: <100ms response time for 90% of queries

**Acceptance Criteria**:

- [ ] Query returns results in <100ms (p90)
- [ ] Zero API costs (uses cached JSON only)
- [ ] Results ranked by relevance (top 10 shown by default)
- [ ] Supports all 3 query types (natural language, file-based, impact)
- [ ] Graceful fallback when vector embeddings disabled
- [ ] Unit tests: >85% coverage
- [ ] Integration tests: 5+ real-world query scenarios

---

### Story 9: File-to-Architecture Mapping

> "As a developer looking at a specific file, I want to know its role and dependencies instantly."

**Implementation Tasks**:

- [ ] **Command Development**
  - [ ] Create `cli/commands/explain.command.ts`
  - [ ] Command signature: `archdoc explain <file_path> [--depth shallow|deep]`
  - [ ] Add `--json` flag for programmatic use

- [ ] **Explain Service**
  - [ ] Create `src/services/file-explainer.service.ts`
  - [ ] Implement `FileExplainerService` class:
    - `explainFile(filePath: string, depth: 'shallow'|'deep'): FileExplanation`
    - `getArchitectureRole(filePath: string): string`
    - `getJourneyMapping(filePath: string): UserFlow[]`
    - `getDependencies(filePath: string): DependencyGraph`

- [ ] **Data Extraction from Cache**
  - [ ] Parse `.archdoc/cache/architecture-analysis.json` for component roles
  - [ ] Parse `.archdoc/cache/dependency-graph.json` for dependency tree
  - [ ] Parse `.archdoc/cache/user-flows.json` for journey mapping
  - [ ] Parse `.archdoc/cache/security-analysis.json` for risk assessment

- [ ] **Output Format**
  ```markdown
  📄 File: src/auth/auth.service.ts

  🏗️ Architecture Role: Core Service - Authentication Layer
  📦 Component: Authentication Module

  🔗 Dependencies (3):
    ↓ src/utils/crypto.ts (encryption)
    ↓ src/config/auth.config.ts (configuration)
    ↓ @nestjs/jwt (external)

  ⬆️ Dependents (7):
    ↑ src/controllers/auth.controller.ts
    ↑ src/guards/jwt.guard.ts
    ... (5 more)

  🗺️ User Flows (2):
    • Login Flow (Step 2/5)
    • Password Reset Flow (Step 3/4)

  ⚠️ Risk Assessment: Medium
    - Handles sensitive data (passwords, tokens)
    - 7 dependents (high coupling)
  ```

- [ ] **Journey Mapping Integration**
  - [ ] Show which user flows touch this file
  - [ ] Display step number in each flow
  - [ ] Highlight critical path files

**Acceptance Criteria**:

- [ ] `archdoc explain <file>` returns comprehensive file analysis
- [ ] Shows architecture role, dependencies, dependents, user flows
- [ ] Response time: <50ms (reading from cache)
- [ ] Works for any file in the analyzed codebase
- [ ] Handles missing cache gracefully (suggests running `archdoc analyze`)
- [ ] Output format: Both human-readable markdown and JSON
- [ ] Unit tests: >90% coverage

---

## 🗂️ EPIC 3: Observability & CI Guardrails

**Goal**: Enforce architectural integrity in every PR.

**Status**: 📋 Planned

### Story 10: Architecture Drift Detection

> "As a tech lead, I want the build to fail if a developer introduces a major architectural violation."

**Implementation Tasks**:

- [ ] **Command Development**
  - [ ] Create `cli/commands/diff.command.ts`
  - [ ] Command signature: `archdoc diff [--baseline <path>] [--threshold <level>]`
  - [ ] Default baseline: `.archdoc/baseline.json` (committed to repo)
  - [ ] Support comparing specific cache files or full analysis

- [ ] **Diff Service**
  - [ ] Create `src/services/architecture-diff.service.ts`
  - [ ] Implement `ArchitectureDiffService` class:
    - `compareAnalyses(baseline: Analysis, current: Analysis): DiffReport`
    - `detectCriticalChanges(diff: DiffReport): CriticalChange[]`
    - `calculateRiskScore(changes: CriticalChange[]): number`
    - `generateDiffReport(changes: CriticalChange[], format: 'console'|'json'|'markdown'): string`

- [ ] **Critical Change Detection**
  - [ ] **New Public APIs**:
    - [ ] Detect new exported functions, classes, interfaces
    - [ ] Flag breaking changes to existing APIs
    - [ ] Severity: Medium (requires documentation)
  - [ ] **Circular Dependencies**:
    - [ ] Compare dependency graphs
    - [ ] Detect new cycles introduced
    - [ ] Severity: High (architectural violation)
  - [ ] **Security Vulnerabilities**:
    - [ ] Compare security analysis results
    - [ ] Flag new vulnerabilities (by CVE ID)
    - [ ] Severity: Critical (blocks merge)
  - [ ] **Test Coverage Decrease**:
    - [ ] Compare coverage percentages
    - [ ] Threshold: >5% decrease = warning, >10% = error
    - [ ] Severity: Medium (quality regression)
  - [ ] **New External Dependencies**:
    - [ ] Detect added npm packages
    - [ ] Flag dependencies with known vulnerabilities
    - [ ] Severity: Low (requires review)
  - [ ] **Architectural Layer Violations**:
    - [ ] Detect imports that violate layer boundaries
    - [ ] Example: UI layer importing database layer directly
    - [ ] Severity: High (architectural violation)

- [ ] **Exit Codes for CI/CD**
  - [ ] Exit 0: No critical changes or changes within thresholds
  - [ ] Exit 1: Critical changes detected (blocks PR)
  - [ ] Exit 2: Analysis failed (missing baseline, cache errors)
  - [ ] Exit 3: Warnings only (non-blocking, informational)

- [ ] **Configuration**
  - [ ] Create `.archdoc/drift-config.json`:
    ```json
    {
      "thresholds": {
        "coverageDecrease": 5,
        "newVulnerabilities": 0,
        "circularDependencies": 0
      },
      "ignorePatterns": ["**/test/**", "**/mocks/**"],
      "blockingChanges": ["security", "circular-deps"],
      "warningChanges": ["new-apis", "coverage"]
    }
    ```
  - [ ] Support overrides via CLI flags

- [ ] **Baseline Management**
  - [ ] Command: `archdoc baseline --save` (creates/updates baseline)
  - [ ] Store in `.archdoc/baseline.json`
  - [ ] Include in version control
  - [ ] Update baseline after approved architectural changes

**Acceptance Criteria**:

- [ ] Runs successfully in GitHub Actions (CI/CD integration)
- [ ] Clear, actionable diff report in console (color-coded)
- [ ] Configurable thresholds via config file and CLI flags
- [ ] Detects all 6 critical change types
- [ ] Correct exit codes for CI/CD automation
- [ ] Performance: <5s for typical project diff
- [ ] Documentation: CI/CD setup guide in `docs/CI-INTEGRATION.md`
- [ ] Unit tests: >90% coverage
- [ ] Integration tests: 10+ drift scenarios

---

### Story 11: Automated PR Comments

> "As a reviewer, I want to see the architectural impact of a PR directly in the GitHub UI."

**Implementation Tasks**:

- [ ] **GitHub Action Template**
  - [ ] Create `.github/workflows/arch-check.yml`:
    ```yaml
    name: Architecture Check
    on: [pull_request]
    jobs:
      arch-analysis:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - uses: techdebtgpt/archdoc-action@v1
            with:
              baseline: .archdoc/baseline.json
              comment-on-pr: true
              fail-on-critical: true
    ```
  - [ ] Publish action to GitHub Marketplace
  - [ ] Add configuration options: thresholds, output format, comment style

- [ ] **PR Comment Generator**
  - [ ] Create `src/services/pr-comment-generator.service.ts`
  - [ ] Implement `PRCommentGeneratorService` class:
    - `generateImpactSummary(diff: DiffReport): string`
    - `formatAsMarkdown(summary: ImpactSummary): string`
    - `postComment(prNumber: number, comment: string): Promise<void>`

- [ ] **Impact Summary Content**
  ```markdown
  ## 🏗️ Architecture Impact Summary

  **Risk Level**: 🟡 Medium

  ### 📊 Changes Overview
  - **Files Changed**: 12 (3 in core architecture)
  - **New Dependencies**: 2 (axios@1.6.0, lodash@4.17.21)
  - **Test Coverage**: 78% → 76% (-2%)

  ### ⚠️ Critical Changes
  - ❌ **Circular Dependency Introduced**
    - `src/services/user.service.ts` ↔️ `src/services/auth.service.ts`
    - **Action Required**: Refactor to break cycle

  ### 📝 New Public APIs (2)
  - `src/api/users.controller.ts::createUser()` (POST /api/users)
  - `src/api/users.controller.ts::deleteUser()` (DELETE /api/users/:id)

  ### 🔗 Dependency Changes
  - ✅ Added: `axios@1.6.0` (HTTP client)
  - ⚠️ Added: `lodash@4.17.21` (Consider tree-shaking or specific imports)

  ### 🗺️ Affected User Flows
  - Login Flow (modified step 3/5)
  - User Registration Flow (new endpoint)

  ---

  **Recommendation**: ❌ **Do not merge** until circular dependency is resolved.

  <details>
  <summary>View Full Diff Report</summary>

  [Detailed JSON diff]

  </details>
  ```

- [ ] **GitHub API Integration**
  - [ ] Use `@actions/github` for posting comments
  - [ ] Support GitHub Enterprise
  - [ ] Handle rate limiting gracefully
  - [ ] Update existing comment instead of creating duplicates

- [ ] **Configuration Options**
  - [ ] `commentStyle`: 'full' | 'summary' | 'critical-only'
  - [ ] `updateExisting`: true (edit previous comment) | false (new comment)
  - [ ] `includeRecommendation`: true | false
  - [ ] `collapseDetails`: true (use `<details>`) | false

**Acceptance Criteria**:

- [ ] GitHub Action template works out-of-the-box
- [ ] PR comments posted automatically on every PR
- [ ] Impact summary includes: risk level, changes overview, critical changes, new APIs, dependencies, affected flows
- [ ] Comments are clear, actionable, and well-formatted
- [ ] Updates existing comment instead of spamming
- [ ] Works with GitHub Enterprise
- [ ] Configurable via workflow file
- [ ] Documentation: `docs/GITHUB-ACTION.md` with setup guide
- [ ] Published to GitHub Marketplace

---

## 🗂️ EPIC 4: Extensibility

**Goal**: Empower teams to customize their analysis.

**Status**: 📋 Planned

### Story 12: Custom Agent API

> "As a user, I want to add my own domain-specific analysis agents."

**Implementation Tasks**:

- [ ] **Base Agent Interface**
  - [ ] Create `src/agents/base-agent.interface.ts`:
    ```typescript
    export interface BaseAgent {
      name: string;
      version: string;
      description: string;

      analyze(context: AnalysisContext): Promise<AgentResult>;
      validate(result: AgentResult): boolean;
      getSchema(): JSONSchema;
    }

    export interface AnalysisContext {
      projectPath: string;
      config: ArchDocConfig;
      cache: CacheService;
      logger: Logger;
      dependencies?: Map<string, any>; // Results from other agents
    }

    export interface AgentResult {
      agentName: string;
      timestamp: Date;
      data: any;
      metadata: {
        tokensUsed?: number;
        executionTime: number;
        cacheHit: boolean;
      };
    }
    ```
  - [ ] Create abstract `AbstractAgent` class implementing common functionality
  - [ ] Add TypeScript type definitions for all interfaces

- [ ] **Dynamic Loading Mechanism**
  - [ ] Create `src/services/agent-loader.service.ts`
  - [ ] Implement `AgentLoaderService` class:
    - `loadCustomAgents(directory: string): Promise<BaseAgent[]>`
    - `validateAgent(agent: any): boolean`
    - `registerAgent(agent: BaseAgent): void`
    - `getAgent(name: string): BaseAgent | undefined`
  - [ ] Support loading from:
    - [ ] `custom-agents/*.ts` (TypeScript)
    - [ ] `custom-agents/*.js` (JavaScript/CommonJS)
    - [ ] `custom-agents/*.mjs` (ES Modules)
  - [ ] Use dynamic `import()` for ES modules
  - [ ] Validate agent implements `BaseAgent` interface
  - [ ] Handle loading errors gracefully

- [ ] **Configuration-Based Agent Selection**
  - [ ] Update `.archdoc/config.json` schema:
    ```json
    {
      "agents": {
        "builtin": ["file-structure", "dependencies", "patterns"],
        "custom": [
          {
            "name": "my-custom-agent",
            "path": "./custom-agents/my-agent.ts",
            "enabled": true,
            "config": { /* agent-specific config */ }
          }
        ],
        "executionOrder": ["dependencies", "my-custom-agent", "patterns"]
      }
    }
    ```
  - [ ] Support enabling/disabling agents via config
  - [ ] Allow custom execution order (for agent dependencies)
  - [ ] Pass agent-specific config to agent constructor

- [ ] **Custom Output Formats**
  - [ ] Support custom output formatters:
    ```typescript
    export interface OutputFormatter {
      format(result: AgentResult): string;
      getFileExtension(): string;
    }
    ```
  - [ ] Built-in formatters: JSON, Markdown, TOON, HTML
  - [ ] Allow agents to specify preferred formatter
  - [ ] Support custom formatters in `custom-formatters/` directory

- [ ] **Agent Lifecycle Hooks**
  - [ ] `beforeAnalysis(context: AnalysisContext): Promise<void>`
  - [ ] `afterAnalysis(result: AgentResult): Promise<void>`
  - [ ] `onError(error: Error): Promise<void>`
  - [ ] `cleanup(): Promise<void>`

- [ ] **Example Custom Agent**
  - [ ] Create `examples/custom-agents/database-schema-agent.ts`:
    - Analyzes database schema files (SQL, Prisma, TypeORM)
    - Detects schema migrations
    - Identifies missing indexes
  - [ ] Include comprehensive comments and documentation
  - [ ] Demonstrate all BaseAgent features

- [ ] **CLI Integration**
  - [ ] Auto-discover custom agents in `custom-agents/` directory
  - [ ] Command: `archdoc agents list` (show all available agents)
  - [ ] Command: `archdoc agents validate <path>` (validate custom agent)
  - [ ] Flag: `--agents <comma-separated-list>` (run specific agents only)

- [ ] **Documentation**
  - [ ] Create `docs/CUSTOM-AGENTS.md`:
    - [ ] Getting started guide
    - [ ] BaseAgent API reference
    - [ ] Example implementations
    - [ ] Best practices
    - [ ] Troubleshooting
  - [ ] Add TypeDoc comments to all interfaces
  - [ ] Create video tutorial (optional)

**Acceptance Criteria**:

- [ ] `BaseAgent` interface is well-defined and documented
- [ ] Dynamic loading works for `.ts`, `.js`, and `.mjs` files
- [ ] Custom agents can be enabled/disabled via config
- [ ] Execution order is configurable
- [ ] Custom agents receive context (project path, config, cache, logger)
- [ ] Custom agents can depend on results from other agents
- [ ] Error handling: Invalid agents don't crash the analysis
- [ ] Example custom agent works out-of-the-box
- [ ] CLI commands for listing and validating agents
- [ ] Documentation is comprehensive and beginner-friendly
- [ ] Unit tests: >85% coverage
- [ ] Integration tests: 3+ custom agent scenarios

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

### Next Quarter (Q2 2026)

- 📋 **EPIC 7: Interactive Dashboard UI**: React-based visual documentation portal
- 📋 **Drift Detection**: Architecture compliance checking
- 📋 **GitHub Actions**: Automated PR impact comments
- 📋 **Architecture Scorecard**: Health metrics and trend tracking

### Q3-Q4 2026

- 📋 **Custom Agents**: Extensibility API for domain-specific analysis
- 📋 **Penetration Testing Agent**: Attack surface mapping and vulnerability detection
- 📋 **Threat Modeling**: STRIDE analysis and attack trees
- 📋 **Security Tool Integration**: Burp Suite, OWASP ZAP, Semgrep
- 📋 **Pentest Report Export**: Professional security assessment reports

---

## 🎨 EPIC 7: Interactive Dashboard UI

**Goal**: Provide a visual, interactive interface for exploring architecture documentation.

**Status**: 📋 Planned (Q2 2026)

### Story 12A: Interactive HTML Dashboard

> "As a team member, I want a visual, interactive dashboard to explore architecture documentation in my browser."

**Implementation Tasks**:

- [ ] **Project Setup**
  - [ ] Create `dashboard/` directory: `npm create vite@latest dashboard -- --template react-ts`
  - [ ] Install core dependencies: `react-router-dom`, `tailwindcss`, `@headlessui/react`
  - [ ] Install visualization libraries: `cytoscape`, `mermaid`, `recharts`
  - [ ] Install utilities: `lucide-react`, `fuse.js`
  - [ ] Configure Tailwind CSS and TypeScript

- [ ] **Dashboard Generator Service**
  - [ ] Create `src/services/dashboard-generator.service.ts`
  - [ ] Implement dashboard generation, JSON copying, React build, metadata injection

- [ ] **Core Pages** (9 pages total)
  - [ ] Dashboard Home (health overview, metrics, recent changes)
  - [ ] Architecture Map (Cytoscape.js dependency graph)
  - [ ] File Explorer (tree view with details)
  - [ ] User Flows (Mermaid.js diagrams)
  - [ ] Drift Detection (timeline and diff viewer)
  - [ ] Search (full-text with Fuse.js)
  - [ ] Attack Surface (endpoint security analysis)
  - [ ] Vulnerability Explorer (OWASP categorization)
  - [ ] Threat Model (STRIDE matrix, attack trees)

- [ ] **CLI Integration**
  - [ ] `archdoc export --format html-interactive --output ./docs-site`
  - [ ] `archdoc serve [--port 3000]`
  - [ ] `archdoc deploy --platform <github-pages|netlify|vercel>`

- [ ] **Customization**
  - [ ] `--logo`, `--primary-color`, `--title`, `--theme` flags

- [ ] **PWA Support**
  - [ ] Service worker for offline capability
  - [ ] `manifest.json` for installability

**Acceptance Criteria**:

- [ ] All 9 pages render correctly
- [ ] Bundle size <500KB gzipped
- [ ] Lighthouse score >90
- [ ] WCAG AA accessibility compliance
- [ ] Deploys to GitHub Pages, Netlify, Vercel
- [ ] Works offline (PWA)
- [ ] Unit tests >80% coverage
- [ ] Documentation: `FRONTEND-INTEGRATION-GUIDE.md` complete

---

## 🗂️ EPIC 6: Security & Penetration Testing

**Goal**: Make ArchDoc a valuable tool for security assessments and penetration testing.

**Status**: 📋 Planned (Q3-Q4 2026)

### Story 13: Penetration Testing Agent

> "As a security engineer, I want to automatically identify attack surfaces and vulnerabilities in the codebase architecture."

**Implementation Tasks**:

- [ ] **Agent Infrastructure**
  - [ ] Create `src/agents/penetration-testing-agent.ts`
  - [ ] Define output schema: `pentest-analysis.schema.ts`

- [ ] **Attack Surface Mapping**
  - [ ] Parse route definitions (Express, Fastify, NestJS)
  - [ ] Identify authentication and authorization requirements
  - [ ] Detect rate limiting, input validation, CSRF protection
  - [ ] Flag privileged routes and file upload endpoints

- [ ] **Vulnerability Detection**
  - [ ] SQL Injection (unsanitized queries)
  - [ ] XSS (unescaped output)
  - [ ] Authentication weaknesses
  - [ ] Exposed secrets (hardcoded keys)
  - [ ] Insecure dependencies (CVE scanning)

- [ ] **Privilege Escalation Analysis**
  - [ ] Map authorization flows
  - [ ] Identify missing authorization checks
  - [ ] Detect RBAC bypasses

- [ ] **OWASP Top 10 Mapping**
  - [ ] Categorize findings by OWASP Top 10 (2021)
  - [ ] Assign severity scores
  - [ ] Provide remediation recommendations

**Acceptance Criteria**:

- [ ] Detects 10+ common vulnerability types
- [ ] Maps all API endpoints with security controls
- [ ] Identifies privilege escalation paths
- [ ] Generates `pentest-analysis.json`
- [ ] Unit tests >85% coverage

---

### Story 14: Threat Modeling

> "As a security architect, I want to generate STRIDE threat models automatically from the codebase architecture."

**Implementation Tasks**:

- [ ] **STRIDE Analysis**
  - [ ] Spoofing: Weak authentication
  - [ ] Tampering: Unvalidated inputs
  - [ ] Repudiation: Missing audit logs
  - [ ] Information Disclosure: Exposed sensitive data
  - [ ] Denial of Service: Missing rate limiting
  - [ ] Elevation of Privilege: Authorization bypasses

- [ ] **Attack Tree Visualization**
  - [ ] Generate attack trees from architecture
  - [ ] Calculate likelihood and impact scores
  - [ ] Create Mermaid diagrams

- [ ] **Risk Scoring**
  - [ ] Implement CVSS v3.1 calculator
  - [ ] Custom risk scoring for architecture issues
  - [ ] Prioritization matrix

- [ ] **Data Flow Security**
  - [ ] Track sensitive data (PII, PCI, PHI)
  - [ ] Identify unencrypted transmission
  - [ ] Flag insufficient access controls

**Acceptance Criteria**:

- [ ] Generates STRIDE threat models
- [ ] Creates attack tree visualizations
- [ ] Calculates CVSS scores
- [ ] Outputs `threat-model.json`
- [ ] Unit tests >85% coverage

---

### Story 15: Security Tool Integration

> "As a penetration tester, I want to export ArchDoc findings to my existing security tools."

**Implementation Tasks**:

- [ ] **Burp Suite Export**
  - [ ] Generate target scope XML
  - [ ] Export authentication configurations
  - [ ] CLI: `archdoc export --format burp --output burp-config.xml`

- [ ] **OWASP ZAP Integration**
  - [ ] Generate ZAP context files
  - [ ] Export API definitions (OpenAPI/Swagger)
  - [ ] CLI: `archdoc export --format zap --output zap-context.xml`

- [ ] **Semgrep Integration**
  - [ ] Run Semgrep analysis
  - [ ] Merge findings with ArchDoc analysis
  - [ ] CLI: `archdoc analyze --semgrep`

- [ ] **Dependency Scanning**
  - [ ] Integrate Snyk, npm audit
  - [ ] Merge CVE findings

**Acceptance Criteria**:

- [ ] Exports work with Burp Suite, OWASP ZAP
- [ ] Semgrep integration runs successfully
- [ ] Dependency scanning detects known CVEs
- [ ] CLI commands documented

---

### Story 16: Pentest Report Export

> "As a security consultant, I want to generate professional penetration testing reports from ArchDoc findings."

**Implementation Tasks**:

- [ ] **Report Generator Service**
  - [ ] Create `src/services/pentest-report-generator.service.ts`
  - [ ] Define report templates (PDF, Markdown, HTML)

- [ ] **Report Sections**
  - [ ] Executive summary (non-technical)
  - [ ] Technical findings with CVSS scores
  - [ ] Remediation roadmap with priorities

- [ ] **Export Formats**
  - [ ] PDF (Puppeteer/PDFKit)
  - [ ] Markdown (developer-friendly)
  - [ ] HTML (interactive dashboard)

- [ ] **Compliance Mapping**
  - [ ] PCI DSS requirements
  - [ ] GDPR security controls
  - [ ] SOC 2 / ISO 27001 controls

**Acceptance Criteria**:

- [ ] Generates professional PDF reports
- [ ] Includes all required sections
- [ ] Supports multiple export formats
- [ ] Compliance mapping works correctly

---

### Story 17: Security Dashboard UI

> "As a security team member, I want a visual dashboard to explore attack surfaces and vulnerabilities."

**Implementation Tasks**:

- [ ] **Attack Surface View**
  - [ ] Add route: `/security/attack-surface`
  - [ ] Interactive map of entry points
  - [ ] Risk-based filtering

- [ ] **Vulnerability Explorer**
  - [ ] Add route: `/security/vulnerabilities`
  - [ ] List view with severity badges
  - [ ] OWASP category filters

- [ ] **Threat Model Visualization**
  - [ ] Add route: `/security/threat-model`
  - [ ] STRIDE matrix heatmap
  - [ ] Attack tree diagrams

**Acceptance Criteria**:

- [ ] All security pages render correctly
- [ ] Visualizations are interactive
- [ ] Data loads from `pentest-analysis.json` and `threat-model.json`
- [ ] UI matches design system
- [ ] WCAG AA accessible

---

## 🔗 Related Documents

- **[ROADMAP.md](./ROADMAP.md)** - Long-term vision and completed features
- **[SECURITY-IMPLEMENTATION-PLAN.md](./SECURITY-IMPLEMENTATION-PLAN.md)** - Detailed security feature implementation
- **[UI-SPECIFICATION.md](./UI-SPECIFICATION.md)** - Interactive dashboard UI specifications
- **[FRONTEND-INTEGRATION-GUIDE.md](./FRONTEND-INTEGRATION-GUIDE.md)** - Deployment and integration guide
- **[ARCHITECTURE-SCHEMAS.md](./ARCHITECTURE-SCHEMAS.md)** - System architecture diagrams
- **[docs/ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture
- **[docs/CONTRIBUTING.md](./CONTRIBUTING.md)** - Developer guide
- **[docs/MCP-SETUP.md](./MCP-SETUP.md)** - MCP configuration

---

## 💬 Feedback & Contributions

Have ideas or want to contribute? We'd love to hear from you!

- 💡 **Suggest Features**: [Open an Issue](https://github.com/techdebtgpt/architecture-doc-generator/issues/new?template=feature_request.md)
- 🗣️ **Join Discussion**: [GitHub Discussions](https://github.com/techdebtgpt/architecture-doc-generator/discussions)
- 🤝 **Contribute**: See [CONTRIBUTING.md](./CONTRIBUTING.md)

