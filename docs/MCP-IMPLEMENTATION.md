# MCP Implementation Guide for ArchDoc

## Table of Contents

1. [What is MCP?](#what-is-mcp)
2. [ArchDoc's MCP Architecture](#archdocs-mcp-architecture)
3. [Core Components](#core-components)
4. [How It Works](#how-it-works)
5. [Available Tools](#available-tools)
6. [Integration Points](#integration-points)
7. [Configuration & Setup](#configuration--setup)
8. [Development Guide](#development-guide)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## What is MCP?

**Model Context Protocol (MCP)** is an open standard created by Anthropic that enables AI models to safely access external tools and data sources through a standardized interface.

### Why MCP Matters

- **Standardized**: Works across multiple AI clients (Claude, Cursor, VS Code, etc.)
- **Safe**: Clients can control what tools are available and what permissions they have
- **Composable**: Multiple MCP servers can work together
- **Efficient**: Uses stdio for communication (zero network overhead)
- **Extensible**: Easy to add new tools without core protocol changes

### MCP vs Other Integration Methods

| Aspect | MCP | API | Plugin |
|--------|-----|-----|--------|
| Client Support | Multi-client | Single/Multi | Single |
| Setup Complexity | Easy | Complex | Complex |
| Performance | Excellent (stdio) | Good (HTTP) | Varies |
| Security | Built-in | Custom | Custom |
| Standard | Open Standard | Custom | Custom |

---

## ArchDoc's MCP Architecture

### Overview

ArchDoc exposes its architecture analysis capabilities through MCP, allowing AI assistants to:

- Generate comprehensive architecture documentation
- Query documentation semantically (RAG)
- Analyze code patterns and dependencies
- Validate code against architecture
- Get improvement recommendations

### High-Level Flow

```
AI Assistant (Claude/Cursor)
         ↓
   [MCP Client]
         ↓ (stdio communication)
   [ArchDoc MCP Server]
         ↓
   [Tool Handlers] → Services
         ↓
   [Documentation Service]
   [Vector Store Service]
   [Config Service]
         ↓
   Your Project Code
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   AI Assistant                           │
│              (Claude/Cursor/Copilot)                     │
└────────────────────────┬────────────────────────────────┘
                         │ MCP Protocol (stdio)
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  archdoc-mcp-server                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  MCP Server (src/mcp-server/index.ts)            │   │
│  │  - Handles tool calls                            │   │
│  │  - Manages resources                             │   │
│  │  - Routes requests                               │   │
│  └──────────────────────────────────────────────────┘   │
│           ↓                    ↓                         │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │  Tool Handlers   │  │  Tool Registry   │             │
│  │                  │  │                  │             │
│  │  • check_config  │  │  • Schemas       │             │
│  │  • setup_config  │  │  • Versioning    │             │
│  │  • generate_docs │  │  • Deprecation   │             │
│  │  • query_docs    │  │  • Changelog     │             │
│  │  • ...more       │  │                  │             │
│  └────────┬─────────┘  └──────────────────┘             │
│           ↓                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Services Layer                          │   │
│  │  ┌─────────────────┐  ┌─────────────────────┐   │   │
│  │  │ ConfigService   │  │ DocumentationSvc    │   │   │
│  │  │                 │  │                     │   │   │
│  │  │ • Initialize    │  │ • Generate docs     │   │   │
│  │  │ • Cache config  │  │ • Run agents        │   │   │
│  │  │ • Detect source │  │ • Selective runs    │   │   │
│  │  └─────────────────┘  └─────────────────────┘   │   │
│  │                                                  │   │
│  │  ┌──────────────────┐  ┌────────────────────┐   │   │
│  │  │ VectorStoreService│  │ TelemetryService  │   │   │
│  │  │                  │  │                    │   │   │
│  │  │ • Query semantics│  │ • Track execution  │   │   │
│  │  │ • RAG indexing   │  │ • Metrics          │   │   │
│  │  │ • Vector search  │  │ • Performance      │   │   │
│  │  └──────────────────┘  └────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
│                       ↓                                  │
│          ┌────────────────────────────┐                 │
│          │  LLM Service               │                 │
│          │  - Anthropic (Claude)      │                 │
│          │  - OpenAI (GPT)            │                 │
│          │  - Google (Gemini)         │                 │
│          │  - xAI (Grok)              │                 │
│          └────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
                         ↓
                  Your Project Code
```

---

## Core Components

### 1. MCP Server (`src/mcp-server/index.ts`)

**Responsibilities:**
- Initialize and manage MCP protocol
- Handle stdio transport
- Route tool calls to handlers
- Manage resources (generated documentation)
- Error handling and logging

**Key Methods:**
```typescript
setRequestHandler(ListToolsRequestSchema)      // List available tools
setRequestHandler(CallToolRequestSchema)       // Execute tool calls
setRequestHandler(ListResourcesRequestSchema)  // List available resources
setRequestHandler(ReadResourceRequestSchema)   // Read resource content
```

### 2. Tool Registry (`src/mcp-server/tools/tool-registry.ts`)

**Purpose:** Central definition of all available tools

**Contains:**
- Tool definitions with JSON schemas
- Versioning information
- Changelog and deprecation info
- Parameter validation

**Example Tool Definition:**
```typescript
check_config: {
  name: 'check_config',
  description: 'Verify configuration is valid',
  version: '1.0.0',
  inputSchema: {
    type: 'object',
    properties: {},
  },
}
```

**Functions Provided:**
- `getAllTools()` - Get all available tools
- `getTool(name)` - Get specific tool definition
- `getToolVersion(name)` - Get tool version
- `isToolDeprecated(name)` - Check deprecation status
- `compareVersions(a, b)` - Version comparison

### 3. Tool Handlers (`src/mcp-server/tools/handlers.ts`)

**Purpose:** Implement actual tool functionality

**Handler Signature:**
```typescript
type ContextualToolHandler = (
  args: Record<string, any>,
  context: ToolContext,
) => Promise<ToolResponse>;
```

**Available Context:**
```typescript
interface ToolContext {
  projectPath: string;      // Current project directory
  config: ArchDocConfig;    // Configuration object
  logger: Logger;           // Logger instance
}
```

**Handler Factory:**
- `createSelectiveAgentHandler()` - Run specific documentation agents
- `createCheckConfigHandler()` - Validate configuration
- `createSetupConfigHandler()` - Initialize configuration

### 4. Configuration Service (`src/mcp-server/services/config.service.ts`)

**Responsibilities:**
- Centralized configuration management
- Singleton pattern
- Configuration caching
- Intelligent detection of config sources

**Detection Logic:**
1. Check for `.archdoc.config.json` with API keys
2. Fall back to environment variables (ANTHROPIC_API_KEY, etc.)
3. Throw error if neither found

**Methods:**
```typescript
static getInstance(): ConfigService
async initializeConfig(projectPath): Promise<ArchDocConfig>
clearCache(): void
getConfig(projectPath): ArchDocConfig | undefined
```

### 5. Documentation Service (`src/mcp-server/services/documentation.service.ts`)

**Responsibilities:**
- Orchestrate documentation generation
- Run selective agents
- Manage output formatting
- Track progress and costs

**Key Methods:**
```typescript
async generateDocumentation(options): Promise<GeneratedDocs>
async runSelectiveAgents(options): Promise<CustomSections>
async queryDocumentation(question): Promise<string>
```

### 6. Vector Store Service (`src/mcp-server/services/vector-store.service.ts`)

**Responsibilities:**
- Semantic search over generated documentation
- RAG (Retrieval-Augmented Generation) indexing
- Vector embeddings management

**Methods:**
```typescript
async initialize(docsPath): Promise<void>
async searchFiles(query, topK): Promise<SearchResult[]>
isReady(): boolean
async reset(): Promise<void>
```

### 7. Telemetry Service (`src/mcp-server/services/telemetry.service.ts`)

**Responsibilities:**
- Track tool execution metrics
- Measure performance
- Redact sensitive data
- Generate reports

**Metrics Tracked:**
- Execution count per tool
- Success/failure rates
- Duration statistics (min, max, average)
- Error logs
- Tool usage ranking

### 8. Configuration Detector (`src/mcp-server/config-detector.ts`)

**Purpose:** Detect and resolve configuration sources

**Functions:**
- `detectConfigSources()` - Detect file and environment configs
- `bothConfigsAvailable()` - Check if both sources exist
- `buildConfigFromEnv()` - Build config from environment variables
- `getDefaultModelForProvider()` - Get default model for LLM provider

---

## How It Works

### 1. Server Startup

```typescript
// src/mcp-server/index.ts
async function start() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('ArchDoc MCP Server started on stdio transport');
}
```

**Process:**
1. Create MCP Server with capabilities (tools, resources)
2. Register request handlers
3. Connect to stdio transport
4. Wait for incoming requests

### 2. Tool Call Flow

```
Client Request: { name: "generate_documentation", arguments: {...} }
         ↓
MCP Server receives via stdio
         ↓
Route to CallToolRequestSchema handler
         ↓
Extract tool name and arguments
         ↓
Initialize ConfigService
         ↓
Load/detect configuration
         ↓
Create ToolContext
         ↓
Get tool handler from registry
         ↓
Execute handler with context
         ↓
Convert response to MCP format
         ↓
Send response back to client
```

### 3. Configuration Resolution

```
MCP starts with project path
         ↓
Call detectConfigSources()
         ↓
Check 1: Is .archdoc.config.json present with API key?
    YES → Use project config ✅
    NO → Check environment variables
         ↓
Check 2: Are ANTHROPIC_API_KEY etc. set?
    YES → Use environment config ✅
    NO → Throw error ❌
```

### 4. Documentation Generation Workflow

```
generate_documentation called
         ↓
Initialize DocumentationService
         ↓
Scan project files
         ↓
Determine depth/scope:
  - quick: Fast analysis
  - normal: 5 iterations
  - deep: 10 iterations
         ↓
Execute selected agents:
  - architecture-analyzer
  - security-analyzer
  - dependency-analyzer
  - pattern-detector
  - etc.
         ↓
Format and save documentation
         ↓
Initialize VectorStore for RAG
         ↓
Return success response
```

### 5. Query Documentation Workflow

```
query_documentation called
         ↓
Load generated docs from .arch-docs/
         ↓
Initialize VectorStore (if needed)
         ↓
Semantic search using RAG
         ↓
Retrieve top-k relevant sections
         ↓
Format and return results
```

---

## Available Tools

### 1. `check_config`

**Purpose:** Verify configuration validity

**Parameters:** None

**Response:**
```typescript
{
  content: [{
    type: 'text',
    text: 'Configuration Found' | 'No Configuration Found'
  }],
  isError: boolean
}
```

**Use Cases:**
- Verify setup before using other tools
- Debug configuration issues
- Get setup instructions if missing

### 2. `setup_config`

**Purpose:** Create or update configuration

**Parameters:**
- `provider` (required): 'anthropic' | 'openai' | 'google' | 'xai'
- `model` (required): Model name for selected provider
- `apiKey` (required): API key
- `searchMode` (optional): 'keyword' | 'vector'
- `embeddingsProvider` (optional): 'local' | 'openai' | 'google'
- `embeddingsApiKey` (optional): API key for embeddings
- `enableTracing` (optional): boolean
- `tracingApiKey` (optional): LangSmith API key
- `tracingProject` (optional): LangSmith project name

**Response:** Configuration saved confirmation

### 3. `generate_documentation`

**Purpose:** Generate architecture documentation

**Parameters:**
- `outputDir` (optional): Default '.arch-docs'
- `depth` (optional): 'quick' | 'normal' | 'deep'
- `focusArea` (optional): e.g., "security", "performance"
- `selectiveAgents` (optional): Array of agent names
- `maxCostDollars` (optional): Budget limit

**Response:** Generation status and location

### 4. `query_documentation`

**Purpose:** Semantic search over documentation

**Parameters:**
- `question` (required): Your question
- `topK` (optional): Number of results, default 5

**Response:** Relevant sections from documentation

### 5. `update_documentation`

**Purpose:** Add new focus areas incrementally

**Parameters:**
- `prompt` (required): What to analyze
- `existingDocsPath` (optional): Path to existing docs

**Response:** Updated documentation

### 6. `check_architecture_patterns`

**Purpose:** Detect design patterns and anti-patterns

**Parameters:**
- `filePaths` (optional): Specific files to analyze

**Response:** Patterns found

### 7. `analyze_dependencies`

**Purpose:** Analyze project dependencies

**Parameters:**
- `includeDevDeps` (optional): Include dev deps, default true

**Response:** Dependency analysis

### 8. `get_recommendations`

**Purpose:** Get improvement suggestions

**Parameters:**
- `focusArea` (optional): 'security' | 'performance' | 'maintainability' | 'all'

**Response:** Prioritized recommendations

### 9. `validate_architecture`

**Purpose:** Validate code against architecture

**Parameters:**
- `filePath` (required): File to validate

**Response:** Validation results

---

## Integration Points

### 1. LLM Provider Integration

ArchDoc supports multiple LLM providers through configuration:

```typescript
// Configuration selects provider
{
  "llm": {
    "provider": "anthropic",  // or openai, google, xai
    "model": "claude-sonnet-4-20250514"
  },
  "apiKeys": {
    "anthropic": "sk-ant-..."
  }
}
```

**Providers:**
- **Anthropic (Claude):** Latest models, recommended
- **OpenAI (GPT):** GPT-4o, o1 series
- **Google (Gemini):** Latest Gemini models
- **xAI (Grok):** Grok series

### 2. Vector Store Integration

Semantic search uses configurable embeddings:

```typescript
{
  "searchMode": {
    "mode": "vector",
    "embeddingsProvider": "local",  // or openai, google
    "strategy": "smart"  // or vector, graph, hybrid
  }
}
```

### 3. Tracing Integration (Optional)

For debugging and monitoring:

```typescript
{
  "tracing": {
    "enabled": true,
    "apiKey": "langsmith-key",
    "project": "archdoc-project"
  }
}
```

### 4. AI Client Integration

Configuration files for different clients:

```
Cursor:         ~/.cursor/mcp.json
Claude Code:    ~/.claude/mcp.json
VS Code:        ~/.vscode/mcp.json
Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
```

---

## Configuration & Setup

### Project-Based Configuration

Store in project root:

```bash
# .archdoc.config.json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514"
  },
  "apiKeys": {
    "anthropic": "sk-ant-..."
  },
  "searchMode": {
    "mode": "vector",
    "embeddingsProvider": "local"
  }
}
```

**Add to .gitignore:**
```
.archdoc.config.json
```

### Environment-Based Configuration

No config file needed:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export DEFAULT_LLM_PROVIDER="anthropic"
export DEFAULT_LLM_MODEL="claude-sonnet-4-20250514"

archdoc-mcp-server
```

### Configuration Priority

1. `.archdoc.config.json` (if has API key) → Use it
2. Environment variables (if set) → Use them
3. Neither → Error

---

## Development Guide

### Adding a New Tool

**Step 1: Define Tool in Registry**

```typescript
// src/mcp-server/tools/tool-registry.ts
export const TOOLS = {
  my_new_tool: {
    name: 'my_new_tool',
    description: 'What this tool does',
    version: '1.0.0',
    inputSchema: {
      type: 'object',
      properties: {
        param1: { type: 'string' },
      },
      required: ['param1'],
    },
  },
}
```

**Step 2: Implement Handler**

```typescript
// src/mcp-server/tools/handlers.ts
export function getToolHandler(name: string): ContextualToolHandler | null {
  switch (name) {
    case 'my_new_tool':
      return createMyNewToolHandler();
    // ...
  }
}

function createMyNewToolHandler(): ContextualToolHandler {
  return async (args, context) => {
    try {
      // Your implementation
      const result = await myLogic(args, context);

      return {
        content: [{
          type: 'text',
          text: result,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.message}`,
        }],
        isError: true,
      };
    }
  };
}
```

**Step 3: Add Tests**

```typescript
// tests/mcp-server/tools/handlers.spec.ts
describe('createMyNewToolHandler', () => {
  it('should handle parameters correctly', async () => {
    const handler = createMyNewToolHandler();
    const result = await handler({ param1: 'value' }, mockContext);

    expect(result.content[0].type).toBe('text');
    expect(result.isError).toBe(false);
  });
});
```

### Testing Tools Locally

```bash
# Run MCP server in development mode
npm run mcp:dev

# The server listens on stdio
# Send MCP protocol messages for testing
```

---

## Testing

### Test Structure

```
tests/mcp-server/
├── services/
│   ├── config.service.spec.ts
│   ├── documentation.service.spec.ts
│   ├── vector-store.service.spec.ts
│   ├── telemetry.service.spec.ts
│   └── rate-limiter.service.spec.ts
├── tools/
│   ├── handler-factory.spec.ts
│   ├── handlers.spec.ts
│   └── tool-registry.spec.ts
└── integration/
    ├── mcp-protocol.integration.spec.ts
    ├── service-integration.integration.spec.ts
    └── workflow.integration.spec.ts
```

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test handler-factory.spec.ts

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Integration tests only
npm test -- tests/mcp-server/integration
```

### Test Patterns Used

**Mock Setup:**
```typescript
jest.mock('../../../src/mcp-server/services/documentation.service');
const mockDocumentationService = DocumentationService as jest.MockedClass<
  typeof DocumentationService
>;
```

**Handler Testing:**
```typescript
it('should execute tool with context', async () => {
  const handler = createCheckConfigHandler();
  const result = await handler({}, mockContext);

  expect(result).toHaveProperty('content');
  expect(result.content[0].type).toBe('text');
});
```

### Singleton Pattern Testing

```typescript
beforeEach(() => {
  // Reset singleton for clean test state
  (TelemetryService as any).instance = undefined;
  telemetry = TelemetryService.getInstance();
});
```

---

## Troubleshooting

### Common Issues

#### 1. "No Configuration Found"

**Cause:** Neither `.archdoc.config.json` nor environment variables found

**Solution:**
```bash
# Create config
archdoc config --init

# OR set environment variables
export ANTHROPIC_API_KEY="sk-ant-..."
export DEFAULT_LLM_PROVIDER="anthropic"
```

#### 2. "Unknown tool: X"

**Cause:** Tool not registered in tool-registry.ts

**Solution:** Verify tool is defined in TOOLS object and handler exists

#### 3. Server Won't Start

**Cause:** Build not updated

**Solution:**
```bash
npm run build
npm run mcp:build
```

#### 4. Tests Failing with Mock Issues

**Common Problem:** fs/promises getter properties can't be reassigned

**Solution:** Use jest.mock() factory function:
```typescript
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));
```

#### 5. Slow Documentation Generation

**Cause:** Deep analysis selected

**Solution:**
- Use `depth: "quick"` for testing
- Use `searchMode: "keyword"` (faster than vector)
- Limit with `selectiveAgents`
- Set `maxCostDollars` budget

### Debugging Tips

**Enable Verbose Logging:**
```typescript
logger.debug('message', details);
```

**Check Configuration:**
```bash
archdoc check-config
```

**Verify Tool Registration:**
```typescript
import { getAllTools, getTool } from './tools/tool-registry';
console.log(getAllTools());
console.log(getTool('my_tool'));
```

**Test Handler Directly:**
```typescript
const handler = createCheckConfigHandler();
const result = await handler({}, context);
console.log(JSON.stringify(result, null, 2));
```

---

## Summary

ArchDoc's MCP implementation provides:

✅ **9 powerful tools** for architecture analysis
✅ **Multi-client support** (Claude, Cursor, Copilot, VS Code)
✅ **Flexible configuration** (project-based or environment-based)
✅ **Comprehensive testing** (429 tests, all passing)
✅ **Clean architecture** (services, handlers, registry pattern)
✅ **Semantic search** (RAG with vector store)
✅ **Telemetry & monitoring** (performance tracking)
✅ **Tool versioning** (deprecation support)

**Status:** Production ready 🚀
