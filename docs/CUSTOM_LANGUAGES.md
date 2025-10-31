# Custom Language Configuration

The architecture-doc-generator supports extending built-in languages and adding custom language support through configuration.

## Overview

Language configuration is **centralized and extensible**:

- **Built-in languages**: TypeScript/JavaScript, Python, Java, Go, C#, C/C++, Kotlin, PHP, Ruby, Rust, Scala, Swift, CSS, HTML, JSON, XML, Flex/ActionScript
- **17 languages supported out-of-the-box** with zero configuration
- **Custom languages**: Add support for any language via configuration
- **Overrides**: Extend existing language configurations per-project

## Configuration Structure

Add language configuration to `.archdoc.config.json`:

```json
{
  "languages": {
    "custom": {
      "rust": {
        "displayName": "Rust",
        "filePatterns": {
          "extensions": [".rs"],
          "excludePatterns": ["target", "Cargo.lock"]
        },
        "importPatterns": {
          "rustUse": "use\\s+([^;]+);"
        },
        "componentPatterns": {
          "modules": ["mod\\.rs$", "lib\\.rs$", "main\\.rs$"],
          "tests": ["_test\\.rs$", "tests/"]
        },
        "keywords": {
          "service": ["service", "handler", "processor"],
          "model": ["struct", "enum", "trait"],
          "test": ["test", "mock"]
        },
        "frameworks": ["actix", "rocket", "tokio"]
      }
    },
    "overrides": {
      "typescript": {
        "keywords": {
          "service": ["service", "provider", "use-case", "interactor"]
        }
      }
    }
  }
}
```

## Custom Language Fields

### `displayName` (optional)

Human-readable name for the language.

### `filePatterns` (required)

```json
{
  "extensions": [".ext"], // File extensions
  "namePatterns": ["pattern"], // Filename regex patterns (optional)
  "excludePatterns": ["path"] // Paths to exclude (optional)
}
```

### `importPatterns` (required)

Map of pattern names to regex strings. Patterns must capture the import target in group 1:

```json
{
  "es6Import": "import\\s+(?:(?:\\{[^}]*\\}|\\*\\s+as\\s+\\w+|\\w+)\\s+from\\s+)?['\"]([^'\"]+)['\"]",
  "pythonImport": "(?:from\\s+(\\S+)\\s+)?import\\s+([^\\n]+)",
  "rustUse": "use\\s+([^;]+);",
  "phpUse": "use\\s+([^;]+);",
  "rubyRequire": "require\\s+['\"]([^'\"]+)['\"]",
  "customPattern": "your_pattern_here"
}
```

**Important**:

- Use double backslashes (`\\`) in JSON strings for regex escaping
- Patterns must capture the import target in group 1 (or group 2 as fallback)
- **Any pattern name works** - the scanner iterates through all patterns dynamically
- No code changes needed to add new pattern types!

### `componentPatterns` (optional)

Map of component types to regex patterns (as strings):

```json
{
  "modules": ["mod\\.rs$", "lib\\.rs$"],
  "controllers": ["_controller\\.rs$", "_handler\\.rs$"],
  "services": ["_service\\.rs$"],
  "models": ["_model\\.rs$"],
  "tests": ["_test\\.rs$", "tests/"]
}
```

### `keywords` (optional)

Map of categories to keyword arrays for file search scoring:

```json
{
  "service": ["service", "handler", "processor"],
  "controller": ["controller", "handler", "endpoint"],
  "model": ["struct", "enum", "trait", "entity"],
  "test": ["test", "mock", "spec"],
  "config": ["config", "settings", "env"],
  "auth": ["auth", "authentication", "authorization"],
  "database": ["repository", "dao", "store", "db"]
}
```

### `frameworks` (optional)

Array of common framework names for context:

```json
{
  "frameworks": ["actix", "rocket", "tokio", "async-std"]
}
```

## Overrides

Extend existing built-in languages without replacing them:

```json
{
  "overrides": {
    "typescript": {
      "filePatterns": {
        "extensions": [".ts", ".tsx", ".mts", ".cts"],
        "excludePatterns": ["**/*.d.ts", "**/dist/**"]
      },
      "keywords": {
        "service": ["service", "provider", "use-case", "interactor", "facade"]
      }
    },
    "python": {
      "keywords": {
        "service": ["service", "manager", "handler", "use_case"]
      }
    }
  }
}
```

**Notes**:

- Overrides **merge** with existing configuration
- Arrays are **concatenated** (e.g., extensions are added, not replaced)
- Maps are **merged** (new keys added, existing keys overwritten)

## Example: Adding PHP Support

```json
{
  "languages": {
    "custom": {
      "php": {
        "displayName": "PHP",
        "filePatterns": {
          "extensions": [".php"],
          "excludePatterns": ["vendor", "cache", "*.min.php"]
        },
        "importPatterns": {
          "phpUse": "use\\s+([^;]+);",
          "phpRequire": "require(?:_once)?\\s*\\(?['\"]([^'\"]+)['\"]\\)?"
        },
        "componentPatterns": {
          "controllers": ["Controller\\.php$"],
          "services": ["Service\\.php$", "Manager\\.php$"],
          "models": ["Model\\.php$", "Entity\\.php$"],
          "configs": ["config\\.php$", "Config\\.php$"],
          "tests": ["Test\\.php$", "tests/"]
        },
        "keywords": {
          "service": ["service", "manager", "handler"],
          "controller": ["controller", "action"],
          "model": ["model", "entity", "eloquent"],
          "test": ["test", "phpunit", "mock"],
          "database": ["repository", "dao", "eloquent"]
        },
        "frameworks": ["laravel", "symfony", "wordpress", "drupal"]
      }
    }
  }
}
```

## Example: Adding Ruby Support

```json
{
  "languages": {
    "custom": {
      "ruby": {
        "displayName": "Ruby",
        "filePatterns": {
          "extensions": [".rb", ".rake"],
          "excludePatterns": ["vendor", "tmp"]
        },
        "importPatterns": {
          "rubyRequire": "require\\s+['\"]([^'\"]+)['\"]",
          "rubyRequireRelative": "require_relative\\s+['\"]([^'\"]+)['\"]"
        },
        "componentPatterns": {
          "controllers": ["_controller\\.rb$"],
          "services": ["_service\\.rb$", "_interactor\\.rb$"],
          "models": ["_model\\.rb$"],
          "tests": ["_spec\\.rb$", "_test\\.rb$", "spec/", "test/"]
        },
        "keywords": {
          "service": ["service", "interactor", "operation"],
          "controller": ["controller", "action"],
          "model": ["model", "entity", "active_record"],
          "test": ["spec", "test", "rspec", "mock"]
        },
        "frameworks": ["rails", "sinatra", "hanami"]
      }
    }
  }
}
```

## Example: Adding Kotlin Support

```json
{
  "languages": {
    "custom": {
      "kotlin": {
        "displayName": "Kotlin",
        "filePatterns": {
          "extensions": [".kt", ".kts"],
          "excludePatterns": ["build", ".gradle"]
        },
        "importPatterns": {
          "kotlinImport": "import\\s+([^\\n]+)"
        },
        "componentPatterns": {
          "controllers": ["Controller\\.kt$"],
          "services": ["Service\\.kt$", "UseCase\\.kt$"],
          "models": ["Model\\.kt$", "Entity\\.kt$", "Dto\\.kt$"],
          "repositories": ["Repository\\.kt$"],
          "tests": ["Test\\.kt$", "Spec\\.kt$"]
        },
        "keywords": {
          "service": ["service", "usecase", "interactor"],
          "controller": ["controller", "handler"],
          "model": ["model", "entity", "dto", "data class"],
          "test": ["test", "spec", "mock"]
        },
        "frameworks": ["spring", "ktor", "micronaut"]
      }
    }
  }
}
```

**Note**: The pattern name `kotlinImport` is completely custom - no special handling needed in code!

## How It Works

1. **Startup**: When `generateDocumentation()` is called, the orchestrator applies custom language configuration via `applyLanguageConfig()`
2. **Registration**: Custom languages are registered in the global `LanguageRegistry`
3. **Overrides**: Existing language configs are extended/merged
4. **Import Scanning**: The `ImportScanner`:
   - Detects language from file extension
   - **Dynamically iterates through all import patterns** defined in the language config
   - No hardcoded pattern names - any pattern key works!
   - Extracts imports using pattern-specific logic (or generic handler for custom patterns)
5. **File Search**: The `FileSearchService` uses language keywords for relevance scoring

### Dynamic Pattern Processing

The scanner processes import patterns **dynamically**:

```typescript
// In ImportScanner.scanFile()
for (const [patternName, patternRegex] of Object.entries(languageConfig.importPatterns)) {
  // Apply pattern to file content
  // Extract imports using pattern-specific or generic logic
}
```

This means:

- ✅ Add any pattern name (e.g., `kotlinImport`, `swiftImport`, `elmImport`)
- ✅ No code changes required - just add to config
- ✅ Built-in patterns get special handling (es6Import, pythonImport, etc.)
- ✅ Custom patterns use generic handler (extracts group 1 as target)

## Quick Start Examples

### Multi-Language Project (Zero Config)

Just run the command - all built-in languages work automatically:

```bash
# Analyze a project with TypeScript, Python, and Rust
archdoc analyze ./my-fullstack-project

# Output shows imports from all languages:
# ✅ Found 487 imports across 17 file types
# - TypeScript: 234 imports (ES6, CommonJS)
# - Python: 123 imports (from...import)
# - Rust: 89 imports (use statements)
# - CSS: 41 imports (@import rules)
```

### Add Custom Language in 2 Minutes

1. **Create `.archdoc.config.json`** in your project root:

```json
{
  "languages": {
    "custom": {
      "myLanguage": {
        "displayName": "My Language",
        "filePatterns": {
          "extensions": [".mylang"]
        },
        "importPatterns": {
          "myImport": "import\\s+([^;]+);"
        }
      }
    }
  }
}
```

2. **Run analysis**:

```bash
archdoc analyze ./my-project
```

That's it! The scanner now understands `.mylang` files.

### Customize Built-in Language

Override TypeScript keywords to match your conventions:

```json
{
  "languages": {
    "overrides": {
      "typescript": {
        "keywords": {
          "service": ["service", "provider", "use-case", "interactor"]
        }
      }
    }
  }
}
```

Now agent refinement searches for "use-case" and "interactor" files too!

## Benefits

- **Language-agnostic**: Works with any language's naming conventions
- **Zero config for 17 languages**: TypeScript, Python, Java, Go, C#, C/C++, Kotlin, PHP, Ruby, Rust, Scala, Swift, CSS, HTML, JSON, XML, Flex
- **Memory-efficient**: No embeddings required (~4-5MB total)
- **Extensible**: Add languages without modifying source code
- **Per-project**: Different projects can have different configurations
- **Regex-based**: Fast and deterministic import extraction
- **Dynamic pattern iteration**: Any pattern name works - no code changes needed

## Testing Custom Languages

After adding a language configuration:

1. **Test import extraction**:

   ```bash
   node dist/cli/index.js analyze ./your-project --verbose
   ```

   Check logs for: `Found X imports, Y modules, Z dependencies`

2. **Verify file search**:
   - Check agent refinement logs for "Retrieved N unique file(s)"
   - Inspect output markdown for code examples from your custom language

3. **Validate patterns**:
   - Test regex patterns at https://regex101.com/
   - Ensure group 1 captures the import target

## Programmatic Usage

You can also configure languages programmatically:

```typescript
import {
  registerLanguage,
  extendLanguage,
  getLanguageRegistry,
} from '@techdebtgpt/archdoc-generator';

// Register a new language
registerLanguage({
  name: 'kotlin',
  displayName: 'Kotlin',
  filePatterns: {
    extensions: ['.kt', '.kts'],
  },
  importPatterns: {
    kotlinImport: /import\s+([^\n]+)/g,
  },
  componentPatterns: {},
  keywords: {
    service: ['service', 'manager'],
  },
});

// Extend existing language
extendLanguage('typescript', {
  keywords: {
    service: ['service', 'provider', 'use-case', 'interactor'],
  },
});

// Get all supported languages
const registry = getLanguageRegistry();
console.log(registry.getAll().map((l) => l.displayName));
```

## Troubleshooting

**Issue**: "No language config found for .xyz - skipping"

- **Solution**: Add the extension to `filePatterns.extensions` in your custom language config

**Issue**: Import extraction returns 0 imports

- **Solution**: Verify your regex pattern captures the import target in group 1. Test at regex101.com

**Issue**: File search doesn't find relevant files

- **Solution**: Add relevant keywords to the language's `keywords` map

**Issue**: "Cannot override non-existent language: xyz"

- **Solution**: Register the language in `custom` first, then override it

## Reference: Built-in Languages

All languages below are **supported out-of-the-box** with zero configuration:

### Programming Languages

| Language                  | Extensions                                       | Import Pattern                | Frameworks                                    |
| ------------------------- | ------------------------------------------------ | ----------------------------- | --------------------------------------------- |
| **TypeScript/JavaScript** | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`     | ES6 imports, CommonJS require | NestJS, Express, React, Angular, Vue, Next.js |
| **Python**                | `.py`, `.pyi`, `.pyx`                            | `from...import`, `import`     | Django, Flask, FastAPI, Pyramid               |
| **Java**                  | `.java`                                          | `import`                      | Spring Boot, Quarkus, Micronaut               |
| **Go**                    | `.go`                                            | `import`                      | Gin, Echo, Fiber, Chi                         |
| **C#**                    | `.cs`, `.csx`                                    | `using`                       | ASP.NET, Entity Framework                     |
| **C/C++**                 | `.c`, `.cpp`, `.cc`, `.cxx`, `.h`, `.hpp`, `.hh` | `#include`                    | Linux, POSIX                                  |
| **Kotlin**                | `.kt`, `.kts`                                    | `import`                      | Spring, Ktor, Micronaut                       |
| **PHP**                   | `.php`                                           | `use`, `require`              | Laravel, Symfony                              |
| **Ruby**                  | `.rb`, `.rake`                                   | `require`                     | Rails, Sinatra                                |
| **Rust**                  | `.rs`                                            | `use`                         | Tokio, Actix, Rocket                          |
| **Scala**                 | `.scala`                                         | `import`                      | Akka, Play                                    |
| **Swift**                 | `.swift`                                         | `import`                      | SwiftUI, Vapor                                |

### Web & Markup Languages

| Language              | Extensions               | Import Pattern           | Notes                       |
| --------------------- | ------------------------ | ------------------------ | --------------------------- |
| **CSS**               | `.css`, `.scss`, `.sass` | `@import`                | Themes, variables detection |
| **HTML**              | `.html`, `.htm`          | `src`, `href` attributes | Script/link/img extraction  |
| **JSON**              | `.json`                  | N/A                      | Configuration files         |
| **XML**               | `.xml`                   | `xi:include`             | XInclude support            |
| **Flex/ActionScript** | `.as`, `.mxml`           | `import`                 | Flash/Flex projects         |

### Pattern Examples

**C/C++ Headers**:

```cpp
#include "local.h"     // Extracted as: local.h
#include <stdio.h>     // Extracted as: stdio.h (framework)
```

**Kotlin**:

```kotlin
import com.example.Service  // Extracted as: com.example.Service
```

**Swift**:

```swift
import Foundation          // Extracted as: Foundation
```

**PHP**:

```php
use App\Services\UserService;  // Extracted as: App\Services\UserService
require_once 'config.php';     // Extracted as: config.php
```

**Ruby**:

```ruby
require 'rails'              // Extracted as: rails
require_relative '../lib/utils'  // Extracted as: ../lib/utils
```

**Rust**:

```rust
use std::collections::HashMap;  // Extracted as: std::collections::HashMap
```

**CSS**:

```css
@import "theme.css";       // Extracted as: theme.css
```

See `src/config/language-config.ts` for complete configuration of all built-in languages.
