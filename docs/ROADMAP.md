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
- [EPIC 6: Security & Penetration Testing](#-epic-6-security--penetration-testing)
- [EPIC 7: Interactive Dashboard UI](#-epic-7-interactive-dashboard-ui)
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
  - **Goal**: Reduce prompt tokens by 35-40% through structured output formats
  - **Approach**: Hybrid format - TOON for uniform arrays, JSON for nested structures
  - **Target Agents**: File Structure, Dependencies, Schema, Pattern Detection
  - **Expected Savings**: ~390 tokens per full analysis (~10% cost reduction)
  - **Accuracy Improvement**: 73.9% vs 70% on tabular data parsing
  - **Implementation**:
    - New `ToonMarkdownRenderer` service
    - Opt-in via `--toon-format` CLI flag
    - Backward compatible (JSON remains default)
  - **Success Metrics**:
    - ≥35% token reduction in benchmarks
    - Zero breaking changes to existing output
    - >90% test coverage for TOON service

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
  - **Natural Language Queries**: "Which service handles auth?"
  - **File-Based Queries**: `archdoc query "src/auth/" --type file`
  - **Impact Analysis**: `archdoc query "src/utils/" --type impact`
  - **Performance**: <100ms response time (p90) for cached queries
  - **Zero Cost**: Uses RAG over `.archdoc/cache` → no LLM calls needed
  - **Fallback Strategy**: Vector embeddings (primary) → TF-IDF + regex (fallback)
  - **Output Formats**: Markdown (human-readable) and JSON (programmatic)

- 📋 **`archdoc explain <file>`** (Q1 2026)
  - **Purpose**: Instant file context for developers
  - **Returns**: Architecture role, dependencies, dependents, user flows, risk assessment
  - **Use Cases**:
    - IDE hover tooltips
    - Chat context in Cursor/Claude Code
    - Quick reference during code review
  - **Example**: `archdoc explain src/auth.service.ts`
    ```
    🏗️ Role: Core Service - Authentication Layer
    🔗 Dependencies: 3 (crypto.ts, auth.config.ts, @nestjs/jwt)
    ⬆️ Dependents: 7 files
    🗺️ User Flows: Login (Step 2/5), Password Reset (Step 3/4)
    ⚠️ Risk: Medium (handles sensitive data)
    ```
  - **Performance**: <50ms (reading from cache)
  - **Journey Mapping**: Shows which user flows touch this file

- 📋 **Architecture Impact Analysis** (Q2 2026)
  - **Command**: `archdoc impact ./src/auth/`
  - **Output**: "Affects: login, SSO, password reset flows"
  - **Features**:
    - Dependency impact mapping (upstream + downstream)
    - Affected user flows identification
    - Risk scoring based on coupling and criticality
    - Breaking change detection
  - **Use Cases**: Pre-refactoring analysis, PR impact assessment

- 📋 **Journey Mapping** (Q2 2026)
  - **Auto-Inference**: Extract user journeys from routes, test names, API endpoints
  - **Output**: `journeys.json` with flow definitions
  - **Example**: `{ "checkout": ["cart-svc", "payment-api", "inventory-svc"] }`
  - **Visualization**: Mermaid diagrams showing flow sequences
  - **Integration**: Links files to specific journey steps

---

## 🗂️ EPIC 4: Observability & CI Guardrails

**Goal:** Prevent architecture drift; make docs a living contract.

**Status**: 📋 Planned (Q2 2026+)

### Features

- 📋 **Drift Detection** (Q2 2026)
  - **Command**: `archdoc diff [--baseline <path>] [--threshold <level>]`
  - **Baseline**: Compare current analysis vs. `.archdoc/baseline.json` (committed to repo)
  - **Critical Change Detection**:
    - ❌ New public APIs (requires documentation)
    - ❌ Circular dependencies introduced (architectural violation)
    - ❌ Security vulnerabilities added (blocks merge)
    - ⚠️ Test coverage decreased >5% (quality regression)
    - ⚠️ New external dependencies (requires review)
    - ⚠️ Architectural layer violations (e.g., UI → Database direct import)
  - **Exit Codes**:
    - `0`: No critical changes
    - `1`: Critical changes detected (blocks PR)
    - `2`: Analysis failed
    - `3`: Warnings only (non-blocking)
  - **Configuration**: `.archdoc/drift-config.json` with customizable thresholds
  - **Performance**: <5s for typical project diff

- 📋 **GitHub Actions Template** (Q2 2026)
  - **Auto-Deploy**: `.github/workflows/arch-check.yml` template
  - **PR Comments**: Automated architecture impact summaries
    ```markdown
    ## 🏗️ Architecture Impact Summary
    Risk Level: 🟡 Medium
    - Files Changed: 12 (3 in core architecture)
    - New Dependencies: 2 (axios@1.6.0, lodash@4.17.21)
    - Test Coverage: 78% → 76% (-2%)
    ⚠️ Circular Dependency Introduced: user.service ↔️ auth.service
    ```
  - **CI/CD Integration**:
    - Fail build if critical changes detected
    - Configurable thresholds via workflow file
    - Branch protection rule integration
  - **GitHub Marketplace**: Published action for easy adoption
  - **Enterprise Support**: Works with GitHub Enterprise

- 📋 **Architecture Scorecard** (Q2 2026)
  - **Command**: `archdoc score [--trend]`
  - **Health Metrics**:
    - 📊 Overall Score: 0-100%
    - 🧩 Modularity: Coupling, cohesion, layer separation
    - 🔒 Security: Vulnerability count, sensitive data handling
    - ✅ Test Coverage: Unit, integration, E2E coverage
    - 📚 Documentation: README completeness, inline comments
    - 🔄 Maintainability: Cyclomatic complexity, code duplication
  - **Trend Tracking**: Historical score comparison over time
  - **Actionable Recommendations**:
    - "Reduce coupling in auth module (score: 45/100)"
    - "Add integration tests for payment flow (coverage: 23%)"
  - **Export**: JSON, Markdown, HTML dashboard

- 📋 **Export Integrations** (Q2-Q3 2026)
  - **Confluence**: `archdoc export --format confluence --space ARCH`
    - Auto-creates pages with proper hierarchy
    - Updates existing pages (version control)
    - Preserves formatting and diagrams
  - **Notion**: `archdoc export --format notion --database <id>`
    - Creates database entries for each component
    - Syncs architecture metadata
    - Supports Notion blocks and embeds
  - **Interactive HTML Dashboard**: `archdoc export --format html-interactive --output ./docs-site`
    - **React-based static site generation** (no backend required)
    - **Interactive Visualizations**:
      - 🗺️ Dependency graphs with zoom, pan, filter (D3.js/Cytoscape.js)
      - 🏗️ Component hierarchy tree view
      - 🗂️ User flow diagrams with file-to-flow connections
      - 📈 Drift detection timeline (historical changes)
    - **Core Features**:
      - 🔍 Full-text search across components and files
      - 📊 Architecture scorecard dashboard with charts
      - 📁 File explorer with architecture roles and metadata
      - 🎨 Dark/light theme support
      - 📱 Responsive design, mobile-friendly
    - **Deployment Options**:
      - GitHub Pages, Netlify, Vercel (one-click deploy)
      - Self-hosted (static files, no server needed)
      - Offline-capable (PWA support)
    - **Use Cases**:
      - Team collaboration and architecture reviews
      - Onboarding new developers (visual codebase exploration)
      - Stakeholder presentations (non-technical audiences)
      - Documentation portal for large teams
  - **HTML** (Static): `archdoc export --format html --output ./docs-site`
    - Simple static site generation with search
    - Markdown-rendered documentation
    - Basic navigation and TOC
  - **PDF**: `archdoc export --format pdf --output architecture.pdf`
    - Professional formatting for stakeholder reports
    - Table of contents, bookmarks, cross-references

---

## 🗂️ EPIC 5: Extensibility & Ecosystem

**Goal:** Make ArchDoc a platform devs can extend.

**Status**: 📋 Planned (Q2-Q3 2026+)

### Features

- 📋 **Custom Agent API** (Q2 2026)
  - **Purpose**: Enable domain-specific analysis extensions
  - **Interface**: `BaseAgent` with standardized methods:
    - `analyze(context: AnalysisContext): Promise<AgentResult>`
    - `validate(result: AgentResult): boolean`
    - `getSchema(): JSONSchema`
  - **Dynamic Loading**: Support `.ts`, `.js`, `.mjs` files from `custom-agents/` directory
  - **Configuration**: Enable/disable agents via `.archdoc/config.json`
  - **Execution Order**: Configurable agent dependencies and sequencing
  - **Lifecycle Hooks**: `beforeAnalysis`, `afterAnalysis`, `onError`, `cleanup`
  - **Example Agents**:
    - Database schema analyzer (SQL, Prisma, TypeORM)
    - GraphQL schema validator
    - Microservice communication mapper
  - **CLI Commands**:
    - `archdoc agents list` - Show all available agents
    - `archdoc agents validate <path>` - Validate custom agent
    - `archdoc analyze --agents <list>` - Run specific agents only

- 📋 **Programmatic Library Mode** (Q3 2026)
  - **NPM Package**: `@archdoc/core` for embedding in build tools
  - **API**:
    ```typescript
    import { DocumentationOrchestrator } from '@archdoc/core';

    const orchestrator = new DocumentationOrchestrator({
      projectPath: './src',
      agents: ['dependencies', 'security'],
      outputFormat: 'json'
    });

    const result = await orchestrator.analyze();
    ```
  - **Use Cases**:
    - Webpack/Vite plugins for build-time analysis
    - Custom CI/CD pipelines
    - IDE extensions and language servers
    - Documentation generators
  - **TypeScript Support**: Full type definitions included
  - **Streaming API**: Real-time progress updates during analysis

- 📋 **Architecture-as-Code (Preview)** (Q3-Q4 2026)
  - **Rule Definition**: `.archdoc/rules.yaml` for architectural policies
    ```yaml
    rules:
      - name: "All services must have README"
        type: file-exists
        pattern: "**/services/*/README.md"
        severity: error

      - name: "No circular dependencies"
        type: dependency-check
        allow-cycles: false
        severity: error

      - name: "UI layer isolation"
        type: import-restriction
        from: "src/ui/**"
        disallow: "src/database/**"
        severity: error
    ```
  - **Validation**: `archdoc validate --rules .archdoc/rules.yaml`
  - **Built-in Rule Types**:
    - File existence/naming conventions
    - Dependency constraints (circular, layer violations)
    - Import restrictions (layer boundaries)
    - Test coverage requirements
    - Documentation completeness
    - Security policies (no hardcoded secrets, approved dependencies)
  - **Custom Rules**: JavaScript/TypeScript rule definitions
  - **Reporting**: Detailed violation reports with remediation suggestions
  - **CI Integration**: Fail builds on rule violations

---

## 🗂️ EPIC 6: Security & Penetration Testing

**Goal:** Make ArchDoc a valuable tool for security assessments and penetration testing.

**Status**: 📋 Planned (Q3-Q4 2026+)

### Features

- 📋 **Penetration Testing Agent** (Q3 2026)
  - **Attack Surface Mapping**:
    - Enumerate all API endpoints with authentication requirements
    - Identify file upload endpoints (potential upload vulnerabilities)
    - Map admin panels and privileged routes
    - Detect rate limiting and input validation status
    - Flag endpoints with weak security controls
  - **Vulnerability Detection**:
    - SQL Injection risks (unsanitized queries)
    - XSS vulnerabilities (unescaped output)
    - CSRF protection gaps
    - Authentication weaknesses (weak password policies, session management)
    - Exposed secrets (hardcoded API keys, credentials)
    - Insecure deserialization
    - Path traversal risks
  - **Privilege Escalation Analysis**:
    - Map authorization flows (User → Admin paths)
    - Identify missing authorization checks
    - Detect role-based access control (RBAC) bypasses
    - Highlight components with elevated privileges
  - **OWASP Top 10 Mapping**:
    - Categorize findings by OWASP Top 10 (2021)
    - Severity scoring (Critical, High, Medium, Low)
    - Remediation recommendations per category
  - **Output**: `pentest-analysis.json` with structured findings

- 📋 **Threat Modeling** (Q3 2026)
  - **STRIDE Analysis**:
    - **S**poofing: Weak authentication points
    - **T**ampering: Unvalidated inputs, missing integrity checks
    - **R**epudiation: Missing audit logs, non-repudiation gaps
    - **I**nformation Disclosure: Exposed sensitive data, verbose errors
    - **D**enial of Service: Missing rate limiting, resource exhaustion
    - **E**levation of Privilege: Authorization bypasses, RBAC flaws
  - **Attack Tree Visualization**:
    - Visual representation of attack paths
    - Entry point → Target component chains
    - Likelihood and impact scoring
    - Mitigation effectiveness analysis
  - **Risk Scoring**:
    - CVSS v3.1 integration for vulnerabilities
    - Custom risk scoring for architecture issues
    - Prioritization matrix (likelihood × impact)
  - **Data Flow Security**:
    - Track sensitive data through the system
    - Identify unencrypted data transmission
    - Flag insufficient access controls on sensitive data
  - **Output**: `threat-model.json` with STRIDE findings and attack trees

- 📋 **Security Tool Integration** (Q4 2026)
  - **Burp Suite Export**:
    - Generate target scope file (endpoints, domains)
    - Export authentication configurations
    - Create scan configurations for identified endpoints
  - **OWASP ZAP Integration**:
    - Generate ZAP context files
    - Export API definitions (OpenAPI/Swagger)
    - Configure authentication and session management
  - **Semgrep Integration**:
    - Run static code analysis for security patterns
    - Custom rules for framework-specific vulnerabilities
    - Integration with existing Semgrep rulesets
  - **Dependency Scanning**:
    - Integration with Snyk, npm audit, OWASP Dependency-Check
    - CVE tracking and remediation guidance
    - License compliance checking
  - **SAST/DAST Coordination**:
    - Export architecture map for DAST tools
    - Correlate SAST findings with architecture components
    - Unified vulnerability dashboard

- 📋 **Pentest Report Export** (Q4 2026)
  - **Professional PDF Reports**:
    - Executive summary (non-technical)
    - Attack surface overview
    - Vulnerability findings with CVSS scores
    - Exploitation paths and proof-of-concept
    - Remediation roadmap with priorities
  - **Report Sections**:
    - Scope and methodology
    - Findings summary (Critical/High/Medium/Low)
    - Detailed technical findings with evidence
    - OWASP Top 10 compliance matrix
    - Risk assessment and business impact
    - Remediation recommendations with timelines
  - **Export Formats**:
    - PDF (stakeholder reports)
    - Markdown (developer-friendly)
    - JSON (tool integration)
    - HTML (interactive dashboard)
  - **Compliance Mapping**:
    - PCI DSS requirements
    - GDPR security controls
    - SOC 2 Type II criteria
    - ISO 27001 controls

- 📋 **Security Dashboard (UI)** (Q4 2026)
  - **Attack Surface View**:
    - Visual map of all entry points
    - Color-coded by risk level
    - Interactive filtering (endpoint type, auth method)
  - **Vulnerability Explorer**:
    - List view with severity badges
    - Filtering by OWASP category, CVSS score
    - Click to view detailed findings and remediation
  - **Threat Model Visualization**:
    - STRIDE matrix heatmap
    - Attack tree diagrams (interactive)
    - Data flow diagrams with security annotations
  - **Penetration Testing Checklist**:
    - OWASP Testing Guide checklist
    - Track testing progress
    - Export findings for reporting

---

## 🎨 EPIC 7: Interactive Dashboard UI

**Goal:** Provide a visual, interactive web interface for exploring architecture documentation.

**Status**: 📋 Planned (Q2 2026)

### Features

- 📋 **Interactive HTML Dashboard** (Q2 2026)
  - **React-based Static Site Generation**:
    - No backend required - fully static deployment
    - Built with React + Vite + TypeScript
    - Generates from `.archdoc/cache/*.json` files
    - Command: `archdoc export --format html-interactive --output ./docs-site`

  - **Core Pages** (6 pages):
    - 🏠 **Dashboard Home**: Architecture health overview, metrics cards, recent changes
    - 🗺️ **Architecture Map**: Interactive dependency graph (Cytoscape.js) with zoom, pan, filter
    - 📁 **File Explorer**: Tree view with file details, roles, dependencies, risk levels
    - 🔄 **User Flows**: Mermaid.js sequence diagrams for user journeys
    - 📊 **Drift Detection**: Timeline view with side-by-side diff viewer
    - 🔍 **Search**: Full-text search with Fuse.js, filters by type/risk/layer

  - **Interactive Visualizations**:
    - Dependency graphs with multiple layouts (hierarchical, circular, force-directed)
    - Color-coded nodes by risk level and component type
    - Click-through navigation to file details
    - Filterable and searchable components
    - Responsive design (mobile, tablet, desktop)

  - **Deployment Options**:
    - **GitHub Pages**: `archdoc deploy --platform github-pages`
    - **Netlify**: `archdoc deploy --platform netlify` (with password protection)
    - **Vercel**: `archdoc deploy --platform vercel`
    - **Self-hosted**: Static files, no server needed
    - **AWS S3**: Static website hosting

  - **Customization**:
    - `--logo <path>`: Custom branding
    - `--primary-color <hex>`: Custom theme color
    - `--title <string>`: Custom dashboard title
    - `--theme <light|dark|auto>`: Default theme

  - **PWA Support**:
    - Service worker for offline capability
    - Installable as desktop/mobile app
    - Fast loading with caching

  - **Use Cases**:
    - Team collaboration and architecture reviews
    - Onboarding new developers (visual codebase exploration)
    - Stakeholder presentations (non-technical audiences)
    - Documentation portal for large teams
    - Architecture drift monitoring

  - **Performance Targets**:
    - Bundle size: <500KB gzipped
    - Initial load: <3s
    - Lighthouse score: >90
    - WCAG AA accessibility compliance

> **Note**: Security-specific dashboard features (Attack Surface, Vulnerability Explorer, Threat Model) are part of EPIC 6.

---

## 🗂️ Summary Timeline

| Quarter      | Focus                                     | Status         |
| ------------ | ----------------------------------------- | -------------- |
| **Q4 2025**  | MCP, Delta Analysis, RAG Foundation       | ✅ COMPLETE    |
| **Q1 2026**  | TOON Optimization, Query API              | 📋 IN PROGRESS |
| **Q2 2026**  | Interactive Dashboard UI (EPIC 7), Drift Detection, GitHub Actions | 📋 PLANNED     |
| **Q3 2026**  | Custom Agents, Pentest Agent, Threat Modeling | 📋 PLANNED     |
| **Q4 2026**  | Security Integrations, Pentest Reports, Security Dashboard | 📋 PLANNED     |
| **Q1 2027+** | Architecture-as-Code, Enterprise Features | 📋 ROADMAP     |

---

## 💬 Community Feedback

Have ideas? We'd love to hear them!

- 💡 **Suggest Features**: [Open an Issue](https://github.com/techdebtgpt/architecture-doc-generator/issues/new?template=feature_request.md)
- 🗣️ **Join Discussion**: [GitHub Discussions](https://github.com/techdebtgpt/architecture-doc-generator/discussions)
- ⭐ **Vote on Features**: React with 👍 on issues you care about
- 🤝 **Contribute**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
