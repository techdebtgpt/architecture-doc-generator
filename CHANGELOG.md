# Changelog

All notable changes to the ArchDoc Generator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking Changes

- **⚠️ Environment Variables No Longer Supported**: Environment variables for API keys and LLM settings are **NO LONGER** used as fallbacks. All configuration must be provided in `.archdoc.config.json`.
  - **Migration Required**: If using `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc., move them to config file:
    ```json
    {
      "apiKeys": {
        "anthropic": "sk-ant-...",
        "openai": "sk-proj-...",
        "google": "AIza...",
        "xai": "xai-..."
      }
    }
    ```
  - **Exception**: LangSmith tracing still uses environment variables (`LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`) as required by LangChain SDK
  - **Rationale**: Direct config passing is cleaner, more explicit, and eliminates hidden fallback behavior

### Added

- **C4 Architecture Model Generation**: New `--c4` flag to generate structured C4 architecture diagrams
  - Generates JSON model with Context, Container, and Component levels
  - Produces PlantUML diagrams (`.puml` files) for visualization
  - Accessible via CLI: `archdoc analyze --c4`
  - Programmatic API: `C4ModelOrchestrator` class
  - Output includes: `c4-model.json`, `context.puml`, `containers.puml`, `components.puml`

- **Base Orchestrator Architecture**: Introduced `BaseOrchestrator` abstract class
  - Provides common functionality for all orchestrator types
  - Includes shared logging, project scanning, and agent management
  - Enables easy extension with new orchestrator workflows
  - Both `DocumentationOrchestrator` and `C4ModelOrchestrator` extend this base

- **Shared CLI Utilities**: Created reusable setup functions for orchestrators
  - `checkConfiguration()`: Validates LLM API keys
  - `validateProjectPath()`: Resolves and validates project paths
  - `setupOutputDirectory()`: Creates output directories with defaults
  - `registerAgents()`: Centralized agent registration (single source of truth)
  - `createScanner()`: Creates FileSystemScanner instances

### Changed

- **Improved Code Organization**: Reduced code duplication by ~70% in CLI commands
  - Eliminated duplicate setup logic between orchestrator types
  - Single place to add new agents (affects all orchestrators)
  - Consistent behavior across documentation and C4 generation

- **Enhanced Documentation**:
  - Updated `README.md` with C4 model generation examples
  - Added C4 sections to `USER_GUIDE.md` with usage instructions
  - Expanded `ARCHITECTURE.md` to document orchestrator patterns
  - Enhanced `API.md` with `BaseOrchestrator` and `C4ModelOrchestrator` details

### Technical

- **Architecture Patterns Applied**:
  - Template Method Pattern: Base class defines workflow, subclasses implement specifics
  - Dependency Injection: Orchestrators receive dependencies via constructor
  - Single Responsibility: Each utility function has one focused purpose
  - Open/Closed Principle: Easy to extend without modifying existing code

- **Extensibility**: Adding new orchestrator types now requires minimal code (~4-5 lines of setup vs ~60 lines previously)

## [0.3.19] - Previous Release

See git history for changes in v0.3.19 and earlier.

---

## How to Use C4 Model Generation

### CLI Usage

```bash
# Generate C4 model for current directory
archdoc analyze --c4

# Generate C4 model for specific project
archdoc analyze /path/to/project --c4

# Custom output location
archdoc analyze --c4 --output ./architecture-docs
```

### Programmatic Usage

```typescript
import {
  C4ModelOrchestrator,
  AgentRegistry,
  FileSystemScanner,
} from '@techdebtgpt/archdoc-generator';

const registry = new AgentRegistry();
const scanner = new FileSystemScanner();
const orchestrator = new C4ModelOrchestrator(registry, scanner);

const result = await orchestrator.generateC4Model('/path/to/project');

// Access generated artifacts
console.log('Context:', result.c4Model.context);
console.log('Containers:', result.c4Model.containers);
console.log('Components:', result.c4Model.components);
console.log('PlantUML Context:', result.plantUMLModel.context);
```

### Output Structure

When using `--c4`, the following files are generated in `.arch-docs-c4/`:

- **c4-model.json**: Complete structured data model
  - System context (actors, external systems, relationships)
  - Containers (deployable units with technology stacks)
  - Components (internal modules and their interactions)

- **context.puml**: PlantUML diagram showing system boundary and external interactions
- **containers.puml**: PlantUML diagram showing deployable units and their relationships
- **components.puml**: PlantUML diagram showing internal component structure

### Rendering Diagrams

To render the PlantUML diagrams:

1. **Using PlantUML CLI**:

   ```bash
   plantuml .arch-docs-c4/*.puml
   ```

2. **Using VS Code Extension**: Install "PlantUML" extension and open `.puml` files

3. **Using Online Renderer**: Copy content to https://www.plantuml.com/plantuml/uml/

4. **Using Docker**:
   ```bash
   docker run -v $(pwd)/.arch-docs-c4:/data plantuml/plantuml:latest -tpng /data/*.puml
   ```

## Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details.

## License

Apache-2.0 - see [LICENSE](./LICENSE) file for details.
