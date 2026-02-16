# ArchDoc Interactive Dashboard - UI Specification for Lovable

## 🎯 Project Overview

Build a **React-based interactive dashboard** for visualizing software architecture documentation. This is a static site generator that reads from JSON cache files (`.archdoc/cache/*.json`) and provides an intuitive, visual interface for exploring codebase architecture.

**Target Users**: Software developers, tech leads, architects, product managers, and stakeholders

**Core Value Proposition**: Transform complex architecture documentation into an interactive, visual experience that makes it easy to understand system structure, dependencies, and health metrics.

---

## 📋 Key Features & Pages

### 1. **Dashboard (Home Page)** 📊

**Purpose**: High-level overview of architecture health and key metrics

**Layout**:
- **Header**: Project name, last analysis date, quick search bar
- **Hero Section**: Architecture health score (0-100%) with circular progress indicator
- **Metrics Grid** (4 cards in 2x2 layout):
  - 🧩 **Modularity Score**: Coupling, cohesion, layer separation (0-100%)
  - 🔒 **Security Score**: Vulnerability count, risk assessment (0-100%)
  - ✅ **Test Coverage**: Overall coverage percentage with trend indicator
  - 📚 **Documentation**: README completeness, inline comments score
- **Quick Stats Row**:
  - Total files analyzed
  - Total components
  - Total dependencies
  - Lines of code
- **Recent Changes**: Timeline of last 5 architectural changes with timestamps
- **Top Risks**: List of 3-5 highest-risk components with severity badges

**Visual Style**:
- Modern, clean design with card-based layout
- Use gradient backgrounds for score cards (green for high scores, yellow for medium, red for low)
- Animated number counters for metrics
- Responsive grid layout (mobile: 1 column, tablet: 2 columns, desktop: 4 columns)

---

### 2. **Architecture Map** 🗺️

**Purpose**: Interactive visualization of component relationships and dependencies

**Main Component**: Interactive dependency graph using **Cytoscape.js** or **React Flow**

**Features**:
- **Graph Visualization**:
  - Nodes represent components/files (colored by type: services, controllers, utilities, etc.)
  - Edges represent dependencies (arrows show direction)
  - Node size based on importance (number of dependents)
  - Hover over node: Show component name, type, file path
  - Click node: Open detail panel with full component info
- **Controls Panel** (Left sidebar):
  - 🔍 Search components
  - 🎨 Filter by type (services, controllers, models, utilities)
  - 📊 Filter by layer (presentation, business logic, data access)
  - ⚠️ Filter by risk level (high, medium, low)
  - 🔄 Layout options (hierarchical, circular, force-directed)
  - 📏 Zoom controls (+, -, fit to screen)
- **Detail Panel** (Right sidebar, appears on node click):
  - Component name and type
  - File path (clickable to open in file explorer view)
  - Dependencies (incoming and outgoing)
  - Risk assessment
  - Test coverage
  - Lines of code
  - "View in File Explorer" button

**Visual Style**:
- Dark theme for graph background (easier on eyes)
- Color-coded nodes (blue: services, green: controllers, purple: models, orange: utilities)
- Animated transitions when filtering/zooming
- Minimap in bottom-right corner for navigation

---

### 3. **File Explorer** 📁

**Purpose**: Browse codebase structure with architecture metadata

**Layout**:
- **Left Panel** (30% width): Tree view of file structure
  - Expandable/collapsible folders
  - File icons based on type (TypeScript, JavaScript, JSON, etc.)
  - Badge indicators for files with issues (⚠️ warnings, ❌ errors)
- **Right Panel** (70% width): File details
  - **Header**: File path, last modified date
  - **Architecture Role**: Badge showing component type (e.g., "Core Service - Authentication Layer")
  - **Metrics Row**:
    - Lines of code
    - Test coverage percentage
    - Cyclomatic complexity
    - Risk score
  - **Dependencies Section**:
    - 🔗 **Imports** (dependencies): List of files this file depends on
    - ⬆️ **Imported By** (dependents): List of files that depend on this file
  - **User Flows Section**:
    - 🗺️ List of user journeys that touch this file
    - Show step number in each flow (e.g., "Login Flow - Step 2/5")
  - **Risk Assessment**:
    - Risk level badge (High/Medium/Low)
    - List of risk factors (e.g., "Handles sensitive data", "High coupling")
  - **Code Preview** (optional): Syntax-highlighted code snippet (first 50 lines)

**Interactions**:
- Click file in tree → Load details in right panel
- Click dependency → Navigate to that file
- Click user flow → Navigate to flows page with that flow highlighted
- Search bar at top to filter files

**Visual Style**:
- Clean, VS Code-inspired file tree
- Syntax highlighting for code preview
- Color-coded risk badges (red: high, yellow: medium, green: low)

---

### 4. **User Flows** 🗂️

**Purpose**: Visualize user journeys through the codebase

**Layout**:
- **Flows List** (Left sidebar, 25% width):
  - List of all detected user flows
  - Each flow shows: name, number of steps, risk level
  - Click to select and view in main area
- **Flow Diagram** (Main area, 75% width):
  - **Mermaid.js** or **React Flow** sequence diagram
  - Shows step-by-step progression through files/components
  - Each step shows:
    - Step number
    - Component/file name
    - Brief description
  - Arrows connecting steps
  - Color-coded by risk (red steps = high risk, yellow = medium, green = low)
- **Flow Details Panel** (Bottom):
  - Flow name and description
  - Total steps
  - Overall risk assessment
  - Files involved (clickable links)
  - Potential bottlenecks or issues

**Interactions**:
- Click step in diagram → Highlight that file in file explorer
- Hover over step → Show tooltip with file path and description
- "View All Files" button → Navigate to file explorer with flow files highlighted

**Visual Style**:
- Modern flowchart design with rounded rectangles
- Gradient backgrounds for steps based on risk level
- Animated transitions between flows

---

### 5. **Drift Detection** 📈

**Purpose**: Track architectural changes over time and detect violations

**Layout**:
- **Timeline View** (Top section):
  - Horizontal timeline showing analysis snapshots
  - Each point shows date and change summary
  - Click point to view detailed diff
- **Diff Viewer** (Main section):
  - **Side-by-side comparison**:
    - Left: Baseline (committed version)
    - Right: Current (latest analysis)
  - **Change Categories**:
    - ❌ **Critical Changes** (blocks merge):
      - New public APIs
      - Circular dependencies introduced
      - Security vulnerabilities added
    - ⚠️ **Warnings** (non-blocking):
      - Test coverage decreased
      - New external dependencies
      - Layer violations
  - **Change Details**:
    - For each change: file path, change type, severity, description
    - Expandable sections for more details
- **Summary Card** (Right sidebar):
  - Overall risk level (🔴 High, 🟡 Medium, 🟢 Low)
  - Total changes count
  - Critical changes count
  - Warnings count
  - Recommendation (e.g., "❌ Do not merge" or "✅ Safe to merge")

**Interactions**:
- Click timeline point → Load that diff
- Click change → Highlight affected files
- "View in File Explorer" → Navigate to affected file
- Export diff as PDF or Markdown

**Visual Style**:
- GitHub-style diff viewer (red for removed, green for added)
- Timeline with color-coded dots (red: critical changes, yellow: warnings, green: no issues)
- Collapsible sections for better readability

---

### 6. **Search** 🔍

**Purpose**: Full-text search across all architecture documentation

**Layout**:
- **Search Bar** (Top, prominent):
  - Large search input with placeholder: "Search components, files, flows..."
  - Search icon and clear button
- **Filters** (Below search bar):
  - Type: Components, Files, Flows, Dependencies
  - Risk Level: High, Medium, Low
  - Layer: Presentation, Business Logic, Data Access
- **Results List**:
  - Each result shows:
    - Icon based on type
    - Title (component/file name)
    - Snippet of matching content (highlighted search terms)
    - File path or location
    - Metadata (type, risk level, test coverage)
  - Click result → Navigate to relevant page (file explorer, flows, etc.)
- **No Results State**:
  - Friendly message: "No results found for '[query]'"
  - Suggestions: "Try different keywords or filters"

**Search Features**:
- Real-time search (as you type)
- Fuzzy matching (typo-tolerant)
- Highlight matching terms in results
- Recent searches (saved in local storage)

**Visual Style**:
- Clean, Google-style search interface
- Card-based results layout
- Smooth animations for result appearance

---

### 7. **Attack Surface** 🎯

**Purpose**: Visualize all entry points and potential attack vectors

**Layout**:
- **Header Section**:
  - Total endpoints count
  - High-risk endpoints count
  - Authentication coverage percentage
  - Last analysis date
- **Filters Panel** (Left sidebar, 25% width):
  - 🔍 Search endpoints
  - 📊 Filter by HTTP method (GET, POST, PUT, DELETE)
  - 🔐 Filter by authentication (None, JWT, OAuth, Session)
  - ⚠️ Filter by risk level (Critical, High, Medium, Low)
  - 🎨 Filter by endpoint type (Public API, Admin, File Upload)
- **Endpoint List** (Main area, 75% width):
  - **Card-based layout**, each card shows:
    - HTTP method badge (color-coded: GET=blue, POST=green, DELETE=red)
    - Endpoint path (e.g., `/api/users/:id`)
    - Authentication requirement badge
    - Risk level badge (Critical/High/Medium/Low)
    - Security controls summary:
      - ✅ Rate limiting enabled / ❌ Missing
      - ✅ Input validation / ❌ Missing
      - ✅ CSRF protection / ❌ Missing
    - Click to expand: Show detailed security analysis
- **Detail Panel** (Expandable):
  - Full endpoint details (parameters, request/response)
  - Security vulnerabilities found
  - Recommended mitigations
  - Code location (file path, line number)
  - "View in File Explorer" button

**Interactions**:
- Click endpoint card → Expand to show details
- Click "View in File Explorer" → Navigate to file
- Export filtered list as CSV or PDF

**Visual Style**:
- Risk-based color coding (red: critical, orange: high, yellow: medium, green: low)
- Badge-heavy design for quick scanning
- Collapsible cards for better space management

---

### 8. **Vulnerability Explorer** 🔍

**Purpose**: Browse and manage security vulnerabilities

**Layout**:
- **Summary Cards** (Top row):
  - 🔴 **Critical**: Count of critical vulnerabilities
  - 🟠 **High**: Count of high-severity vulnerabilities
  - 🟡 **Medium**: Count of medium-severity vulnerabilities
  - 🟢 **Low**: Count of low-severity vulnerabilities
- **Filters Panel** (Left sidebar, 25% width):
  - 🏷️ Filter by OWASP category:
    - A01: Broken Access Control
    - A02: Cryptographic Failures
    - A03: Injection
    - A04: Insecure Design
    - A05: Security Misconfiguration
    - A06: Vulnerable Components
    - A07: Auth Failures
    - A08: Data Integrity Failures
    - A09: Logging Failures
    - A10: SSRF
  - 📊 Filter by CVSS score range (0-10)
  - 🔍 Filter by vulnerability type (SQL Injection, XSS, CSRF, etc.)
  - ✅ Show fixed / 🔄 Show open only
- **Vulnerability List** (Main area, 75% width):
  - **Table view** with columns:
    - Severity badge
    - Vulnerability title
    - OWASP category
    - CVSS score
    - Affected file(s)
    - Status (Open/Fixed)
  - Click row → Open detail panel
- **Detail Panel** (Right sidebar, slides in on click):
  - **Header**: Vulnerability title, severity badge, CVSS score
  - **Description**: What the vulnerability is and why it's dangerous
  - **Evidence**: Code snippet showing the vulnerable code
  - **Impact**: Potential consequences (data breach, privilege escalation, etc.)
  - **Remediation**: Step-by-step fix instructions
  - **References**: Links to OWASP, CVE, security advisories
  - **Actions**:
    - "Mark as Fixed" button
    - "Export Finding" (PDF, Markdown)
    - "View in File Explorer"

**Interactions**:
- Click vulnerability → Open detail panel
- Filter and sort vulnerabilities
- Export filtered list for reporting
- Mark vulnerabilities as fixed (saved in local storage)

**Visual Style**:
- Clean table design with severity color coding
- Syntax-highlighted code snippets
- Collapsible sections in detail panel

---

### 9. **Threat Model** 🛡️

**Purpose**: Visualize STRIDE threat analysis and attack paths

**Layout**:
- **Tab Navigation** (Top):
  - 📊 STRIDE Matrix
  - 🌳 Attack Trees
  - 🗺️ Data Flow Security

#### **Tab 1: STRIDE Matrix**

- **Heatmap Grid** (6x6 matrix):
  - Rows: Component categories (API, Auth, Database, File System, External Services, UI)
  - Columns: STRIDE categories (Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation)
  - Each cell shows:
    - Threat count
    - Color intensity based on severity (red=high, yellow=medium, green=low)
  - Click cell → Show list of threats in that category
- **Threat Details Panel** (Bottom):
  - List of threats for selected cell
  - Each threat shows: description, affected components, mitigation status

#### **Tab 2: Attack Trees**

- **Tree Selector** (Left sidebar):
  - List of attack scenarios (e.g., "Compromise User Account", "Data Exfiltration")
  - Click to load attack tree
- **Attack Tree Visualization** (Main area):
  - **Interactive tree diagram** (using D3.js or React Flow):
    - Root node: Attack goal (e.g., "Access Admin Panel")
    - Child nodes: Attack steps (e.g., "Steal JWT Token", "Exploit IDOR")
    - Leaf nodes: Attack techniques (e.g., "Phishing", "SQL Injection")
  - **Node Details**:
    - Likelihood score (Low/Medium/High)
    - Impact score (Low/Medium/High)
    - Mitigation status (✅ Mitigated / ❌ Open)
  - Color-coded by risk (red=high, yellow=medium, green=low)
- **Attack Path Details** (Right sidebar):
  - Selected attack path summary
  - Required preconditions
  - Mitigation recommendations

#### **Tab 3: Data Flow Security**

- **Data Flow Diagram**:
  - Visual representation of sensitive data flows
  - Nodes: Components (API, Database, External Services)
  - Edges: Data flows (labeled with data type: PII, PCI, PHI)
  - Color-coded by encryption status:
    - 🟢 Green: Encrypted in transit and at rest
    - 🟡 Yellow: Partially encrypted
    - 🔴 Red: Unencrypted
- **Sensitive Data List** (Left sidebar):
  - List of sensitive data types detected
  - Click to highlight flows in diagram
- **Flow Details Panel** (Bottom):
  - Selected flow details
  - Encryption status
  - Access controls
  - Compliance requirements (GDPR, PCI DSS)

**Interactions**:
- Switch between tabs
- Click heatmap cells, tree nodes, flow edges → Show details
- Export threat model as PDF or Markdown
- Filter by severity, mitigation status

**Visual Style**:
- Professional threat modeling aesthetics
- Color-coded risk indicators
- Interactive diagrams with smooth animations

---

## 🎨 Design System

### **Color Palette**
- **Primary**: `#3B82F6` (Blue) - Used for buttons, links, active states
- **Secondary**: `#8B5CF6` (Purple) - Used for accents, highlights
- **Success**: `#10B981` (Green) - Used for high scores, safe states
- **Warning**: `#F59E0B` (Yellow) - Used for medium risk, warnings
- **Danger**: `#EF4444` (Red) - Used for high risk, errors
- **Neutral**:
  - Background: `#F9FAFB` (Light mode), `#111827` (Dark mode)
  - Text: `#111827` (Light mode), `#F9FAFB` (Dark mode)
  - Borders: `#E5E7EB` (Light mode), `#374151` (Dark mode)

### **Typography**
- **Font Family**: `Inter` (from Google Fonts)
- **Headings**:
  - H1: 2.5rem, bold
  - H2: 2rem, semibold
  - H3: 1.5rem, semibold
- **Body**: 1rem, regular
- **Small**: 0.875rem, regular

### **Spacing**
- Use Tailwind CSS spacing scale (4px increments)
- Container max-width: 1280px
- Page padding: 1.5rem (mobile), 2rem (desktop)

### **Components**
- **Buttons**: Rounded corners (8px), padding (12px 24px), hover effects
- **Cards**: White background (light mode), shadow, rounded corners (12px)
- **Badges**: Small, rounded-full, colored based on severity
- **Icons**: Use **Lucide React** icon library

### **Theme Toggle**
- Light/Dark mode switcher in header
- Smooth transitions between themes
- Save preference in local storage

---

## 🛠️ Technical Requirements

### **Framework & Libraries**
- **React 18+** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components (optional, for faster development)
- **Cytoscape.js** or **React Flow** for dependency graphs
- **Mermaid.js** for flow diagrams
- **Recharts** or **Chart.js** for metrics charts
- **Lucide React** for icons
- **Fuse.js** for fuzzy search

### **Data Source**
- Read from JSON files in `/public/archdoc-data/` directory:
  - `architecture-analysis.json` - Component roles and structure
  - `dependency-graph.json` - Dependency relationships
  - `user-flows.json` - User journey definitions
  - `security-analysis.json` - Risk assessments
  - `metrics.json` - Health scores and statistics
  - `drift-history.json` - Historical changes
  - `pentest-analysis.json` - Attack surface and vulnerability findings
  - `threat-model.json` - STRIDE analysis and attack trees

### **Performance**
- Lazy load pages (code splitting)
- Virtualize large lists (react-window)
- Debounce search input
- Cache search results
- Optimize graph rendering (limit visible nodes, use clustering)

### **Responsive Design**
- Mobile-first approach
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- Collapsible sidebars on mobile
- Touch-friendly controls

### **Accessibility**
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- Color contrast compliance (WCAG AA)

---

## 📱 User Flows

### **Primary User Flow: Exploring Architecture**
1. User lands on **Dashboard** → Sees health overview
2. User clicks on low modularity score → Navigates to **Architecture Map**
3. User filters by "High Risk" components → Graph updates
4. User clicks on a high-risk node → Detail panel opens
5. User clicks "View in File Explorer" → Navigates to **File Explorer** with file selected
6. User sees dependencies → Clicks on a dependency → Navigates to that file
7. User sees file is part of "Login Flow" → Clicks flow → Navigates to **User Flows** with flow highlighted

### **Secondary User Flow: Reviewing Changes**
1. User navigates to **Drift Detection**
2. User sees timeline with recent change → Clicks on latest point
3. User reviews critical changes → Sees circular dependency introduced
4. User clicks on affected file → Navigates to **File Explorer**
5. User reviews dependencies → Identifies issue
6. User exports diff as PDF for team review

### **Tertiary User Flow: Security Assessment**
1. User navigates to **Attack Surface**
2. User filters by "High Risk" endpoints → Sees list of vulnerable endpoints
3. User clicks on endpoint with SQL injection risk → Detail panel opens
4. User reviews vulnerability details and code snippet
5. User clicks "View in Vulnerability Explorer" → Navigates to **Vulnerability Explorer**
6. User filters by "Injection" category → Sees all injection vulnerabilities
7. User clicks on SQL injection finding → Reviews OWASP mapping and remediation
8. User navigates to **Threat Model** → Reviews STRIDE matrix
9. User clicks on "Tampering" cell → Sees unvalidated input threats
10. User exports pentest report as PDF for security team review

---

## 🚀 Deployment

- **Output**: Static HTML/CSS/JS files
- **Hosting Options**:
  - GitHub Pages
  - Netlify
  - Vercel
  - Self-hosted (any static file server)
- **Build Command**: `npm run build`
- **Output Directory**: `dist/`
- **PWA Support**: Add service worker for offline capability

---

## 📝 Additional Notes

- **No Backend Required**: All data is read from static JSON files
- **Offline-First**: Once loaded, app works without internet
- **Fast Load Times**: Target <3s initial load, <1s page transitions
- **Modern Browser Support**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Print-Friendly**: CSS print styles for documentation export

---

## 🎯 Success Metrics

- **Performance**: Lighthouse score >90
- **Accessibility**: WCAG AA compliance
- **Bundle Size**: <500KB gzipped
- **User Satisfaction**: Intuitive navigation, <5 clicks to any information

---

**Ready to build in Lovable!** 🚀

This specification provides all the details needed to create a beautiful, functional, and performant architecture documentation dashboard.
