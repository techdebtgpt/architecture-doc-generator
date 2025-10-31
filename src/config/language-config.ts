/**
 * Language-specific configuration for code analysis
 * Centralized and extensible language definitions
 */

/**
 * Language patterns for import detection
 */
export interface LanguageImportPatterns {
  [key: string]: RegExp | undefined;
  es6Import?: RegExp; // ES6: import ... from '...'
  commonjsRequire?: RegExp; // CommonJS: require('...')
  pythonImport?: RegExp; // Python: from ... import ...
  javaImport?: RegExp; // Java: import ...;
  goImport?: RegExp; // Go: import "..."
  csharpUsing?: RegExp; // C#: using ...;
  rustUse?: RegExp; // Rust: use ...;
  phpUse?: RegExp; // PHP: use ...;
  rubyRequire?: RegExp; // Ruby: require '...'
}

/**
 * Language file patterns
 */
export interface LanguageFilePatterns {
  extensions: string[]; // File extensions: ['.ts', '.tsx']
  namePatterns?: RegExp[]; // Filename patterns: [/\.controller\.ts$/]
  excludePatterns?: string[]; // Paths to exclude: ['node_modules', 'dist']
}

/**
 * Language component patterns for categorization
 */
export interface LanguageComponentPatterns {
  modules?: RegExp[]; // Module/package files
  controllers?: RegExp[]; // Controller/handler files
  services?: RegExp[]; // Service/business logic files
  repositories?: RegExp[]; // Data access layer files
  models?: RegExp[]; // Data models/entities
  configs?: RegExp[]; // Configuration files
  middleware?: RegExp[]; // Middleware/interceptors
  routes?: RegExp[]; // Route definitions
  tests?: RegExp[]; // Test files
  utils?: RegExp[]; // Utility/helper files
}

/**
 * Language keywords for file search scoring
 */
export interface LanguageKeywords {
  service?: string[]; // Service-related terms
  controller?: string[]; // Controller-related terms
  model?: string[]; // Model-related terms
  test?: string[]; // Test-related terms
  config?: string[]; // Config-related terms
  auth?: string[]; // Authentication-related terms
  database?: string[]; // Database-related terms
}

/**
 * Complete language configuration
 */
export interface LanguageConfig {
  name: string;
  displayName: string;
  filePatterns: LanguageFilePatterns;
  importPatterns: LanguageImportPatterns;
  componentPatterns: LanguageComponentPatterns;
  keywords: LanguageKeywords;
  frameworks?: string[]; // Common frameworks for this language
}

/**
 * TypeScript/JavaScript configuration
 */
export const TYPESCRIPT_CONFIG: LanguageConfig = {
  name: 'typescript',
  displayName: 'TypeScript/JavaScript',
  filePatterns: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    excludePatterns: ['node_modules', 'dist', 'build', '.next', 'out'],
  },
  importPatterns: {
    es6Import: /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
    commonjsRequire: /require\s*\(['"]([^'"]+)['"]\)/g,
  },
  componentPatterns: {
    modules: [/\.module\.(ts|js)$/, /index\.(ts|js)$/],
    controllers: [/\.controller\.(ts|js)$/, /\.handler\.(ts|js)$/],
    services: [/\.service\.(ts|js)$/, /\.provider\.(ts|js)$/],
    repositories: [/\.repository\.(ts|js)$/, /\.dao\.(ts|js)$/],
    models: [/\.model\.(ts|js)$/, /\.entity\.(ts|js)$/, /\.schema\.(ts|js)$/, /\.dto\.(ts|js)$/],
    configs: [/\.config\.(ts|js)$/, /\.settings\.(ts|js)$/],
    middleware: [/\.middleware\.(ts|js)$/, /\.interceptor\.(ts|js)$/, /\.guard\.(ts|js)$/],
    routes: [/\.routes?\.(ts|js)$/, /\.router\.(ts|js)$/],
    tests: [/\.test\.(ts|js)$/, /\.spec\.(ts|js)$/, /__tests__/],
    utils: [/\.util(s)?\.(ts|js)$/, /\.helper(s)?\.(ts|js)$/],
  },
  keywords: {
    service: ['service', 'provider', 'business', 'logic'],
    controller: ['controller', 'handler', 'endpoint', 'route', 'api'],
    model: ['model', 'entity', 'schema', 'dto', 'interface', 'type'],
    test: ['test', 'spec', 'mock', 'stub', 'fixture'],
    config: ['config', 'settings', 'environment', 'env'],
    auth: ['auth', 'authentication', 'authorization', 'jwt', 'token', 'session'],
    database: ['database', 'db', 'repository', 'orm', 'query', 'migration'],
  },
  frameworks: ['nestjs', 'express', 'fastify', 'next', 'react', 'angular', 'vue'],
};

/**
 * C / C++ configuration
 */
export const C_CPP_CONFIG: LanguageConfig = {
  name: 'c_cpp',
  displayName: 'C/C++',
  filePatterns: {
    extensions: ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hh'],
    excludePatterns: ['build', 'bin', 'obj'],
  },
  importPatterns: {} as unknown as LanguageImportPatterns,
  componentPatterns: {
    modules: [/Makefile$/, /CMakeLists\.txt$/],
    tests: [/_test\.(c|cpp)$/],
    utils: [/util(s)?\.(c|cpp|h|hpp)$/],
  },
  keywords: {
    service: ['module', 'library', 'component'],
    test: ['test', 'mock', 'fixture'],
    config: ['Makefile', 'CMake'],
  },
};
// assign include regex after constant to satisfy lint/format rules
(C_CPP_CONFIG.importPatterns as any).cInclude = /#include\s+["<]([^">]+)[">]/g;

/**
 * Kotlin configuration
 */
export const KOTLIN_CONFIG: LanguageConfig = {
  name: 'kotlin',
  displayName: 'Kotlin',
  filePatterns: { extensions: ['.kt', '.kts'], excludePatterns: ['build'] },
  importPatterns: { kotlinImport: /import\s+([^\n]+)/g },
  componentPatterns: {
    controllers: [/Controller\.kt$/],
    services: [/Service\.kt$/, /UseCase\.kt$/],
    models: [/Model\.kt$/, /Entity\.kt$/],
    tests: [/Test\.kt$/, /Spec\.kt$/],
  },
  keywords: { service: ['service', 'usecase', 'interactor'], model: ['data class', 'dto'] },
  frameworks: ['spring', 'ktor', 'micronaut'],
};

/**
 * PHP configuration
 */
export const PHP_CONFIG: LanguageConfig = {
  name: 'php',
  displayName: 'PHP',
  filePatterns: { extensions: ['.php'], excludePatterns: ['vendor'] },
  importPatterns: {
    phpUse: /use\s+([^;]+);/g,
    phpRequire: /require(?:_once)?\s*\(?['"]([^'")]+)['"]\)?/g,
  },
  componentPatterns: {
    controllers: [/Controller\.php$/],
    services: [/Service\.php$/],
    models: [/Model\.php$/, /Entity\.php$/],
    tests: [/Test\.php$/],
  },
  keywords: { service: ['service', 'manager'], controller: ['controller', 'action'] },
  frameworks: ['laravel', 'symfony'],
};

/**
 * Ruby configuration
 */
export const RUBY_CONFIG: LanguageConfig = {
  name: 'ruby',
  displayName: 'Ruby',
  filePatterns: { extensions: ['.rb', '.rake'], excludePatterns: ['vendor', 'tmp'] },
  importPatterns: { rubyRequire: /require\s+['"]([^'"\]]+)['"]/g },
  componentPatterns: {
    controllers: [/_controller\.rb$/],
    services: [/_service\.rb$/],
    models: [/_model\.rb$/],
    tests: [/_spec\.rb$/, /spec\//, /test\//],
  },
  keywords: { service: ['service', 'interactor'], test: ['spec', 'rspec'] },
  frameworks: ['rails', 'sinatra'],
};

/**
 * Rust configuration
 */
export const RUST_CONFIG: LanguageConfig = {
  name: 'rust',
  displayName: 'Rust',
  filePatterns: { extensions: ['.rs'], excludePatterns: ['target'] },
  importPatterns: { rustUse: /use\s+([^;]+);/g },
  componentPatterns: {
    modules: [/mod\.rs$/, /lib\.rs$/, /main\.rs$/],
    tests: [/^tests\//, /_test\.rs$/],
  },
  keywords: { service: ['service', 'handler'], model: ['struct', 'enum', 'trait'] },
  frameworks: ['tokio', 'actix', 'rocket'],
};

/**
 * Scala configuration
 */
export const SCALA_CONFIG: LanguageConfig = {
  name: 'scala',
  displayName: 'Scala',
  filePatterns: { extensions: ['.scala'], excludePatterns: ['target', 'out'] },
  importPatterns: { scalaImport: /import\s+([^\n]+)/g },
  componentPatterns: {
    services: [/Service\.scala$/],
    models: [/Model\.scala$/],
    tests: [/Spec\.scala$/],
  },
  keywords: { service: ['service', 'actor'], model: ['case class', 'trait'] },
  frameworks: ['akka', 'play'],
};

/**
 * Swift configuration
 */
export const SWIFT_CONFIG: LanguageConfig = {
  name: 'swift',
  displayName: 'Swift',
  filePatterns: { extensions: ['.swift'], excludePatterns: ['build'] },
  importPatterns: { swiftImport: /import\s+([^\n]+)/g },
  componentPatterns: { controllers: [/Controller\.swift$/], tests: [/Tests?\//] },
  keywords: { service: ['service', 'manager'], model: ['struct', 'class'] },
  frameworks: ['swiftui', 'vapor'],
};

/**
 * CSS/HTML/JSON/XML helpers
 */
export const CSS_CONFIG: LanguageConfig = {
  name: 'css',
  displayName: 'CSS',
  filePatterns: { extensions: ['.css', '.scss', '.sass'], excludePatterns: ['node_modules'] },
  importPatterns: { cssImport: /@import\s+["']([^"']+)["']/g },
  componentPatterns: {},
  keywords: { config: ['theme', 'variables'] },
};

export const HTML_CONFIG: LanguageConfig = {
  name: 'html',
  displayName: 'HTML',
  filePatterns: { extensions: ['.html', '.htm'], excludePatterns: ['node_modules'] },
  // capture src/href in tags
  importPatterns: { htmlSrc: /<(?:script|link|img)[^>]+(?:src|href)=["']([^"']+)["']/g },
  componentPatterns: {},
  keywords: {},
};

export const JSON_CONFIG: LanguageConfig = {
  name: 'json',
  displayName: 'JSON',
  filePatterns: { extensions: ['.json'], excludePatterns: ['node_modules'] },
  importPatterns: {},
  componentPatterns: {},
  keywords: {},
};

export const XML_CONFIG: LanguageConfig = {
  name: 'xml',
  displayName: 'XML',
  filePatterns: { extensions: ['.xml'], excludePatterns: ['node_modules'] },
  importPatterns: { xmlInclude: /<xi:include[^>]+href=["']([^"']+)["']/g },
  componentPatterns: {},
  keywords: {},
};

/**
 * Flex / ActionScript (MXML) configuration
 */
export const FLEX_CONFIG: LanguageConfig = {
  name: 'flex',
  displayName: 'Flex/ActionScript',
  filePatterns: { extensions: ['.as', '.mxml'], excludePatterns: ['bin', 'build'] },
  importPatterns: { actionscriptImport: /import\s+([^;]+);/g },
  componentPatterns: {},
  keywords: {},
};

/**
 * Python configuration
 */
export const PYTHON_CONFIG: LanguageConfig = {
  name: 'python',
  displayName: 'Python',
  filePatterns: {
    extensions: ['.py', '.pyi', '.pyx'],
    excludePatterns: ['venv', '__pycache__', '.pytest_cache', 'dist', 'build'],
  },
  importPatterns: {
    pythonImport: /(?:from\s+(\S+)\s+)?import\s+([^\n]+)/g,
  },
  componentPatterns: {
    modules: [/__init__\.py$/, /__main__\.py$/],
    controllers: [/_view(s)?\.py$/, /_handler(s)?\.py$/, /_endpoint(s)?\.py$/],
    services: [/_service(s)?\.py$/, /_manager(s)?\.py$/, /_provider(s)?\.py$/],
    repositories: [/_repository\.py$/, /_dao\.py$/, /_store\.py$/],
    models: [/_model(s)?\.py$/, /_schema(s)?\.py$/, /_entity\.py$/],
    configs: [/config\.py$/, /settings\.py$/, /constants\.py$/],
    middleware: [/_middleware\.py$/, /_decorator(s)?\.py$/],
    routes: [/_routes?\.py$/, /_urls\.py$/, /_api\.py$/],
    tests: [/test_.*\.py$/, /.*_test\.py$/, /conftest\.py$/],
    utils: [/_util(s)?\.py$/, /_helper(s)?\.py$/, /_tool(s)?\.py$/],
  },
  keywords: {
    service: ['service', 'manager', 'handler', 'processor'],
    controller: ['view', 'handler', 'endpoint', 'api', 'route'],
    model: ['model', 'schema', 'entity', 'dataclass'],
    test: ['test', 'mock', 'fixture', 'pytest'],
    config: ['config', 'settings', 'environment', 'constants'],
    auth: ['auth', 'authentication', 'authorization', 'jwt', 'token'],
    database: ['database', 'db', 'repository', 'orm', 'query', 'migration'],
  },
  frameworks: ['django', 'flask', 'fastapi', 'pyramid', 'tornado'],
};

/**
 * Java configuration
 */
export const JAVA_CONFIG: LanguageConfig = {
  name: 'java',
  displayName: 'Java',
  filePatterns: {
    extensions: ['.java'],
    excludePatterns: ['target', 'build', '.gradle', '.m2'],
  },
  importPatterns: {
    javaImport: /import\s+(static\s+)?([^;]+);/g,
  },
  componentPatterns: {
    controllers: [/Controller\.java$/, /Resource\.java$/, /Endpoint\.java$/],
    services: [/Service\.java$/, /Manager\.java$/, /Provider\.java$/],
    repositories: [/Repository\.java$/, /DAO\.java$/, /Mapper\.java$/],
    models: [/Model\.java$/, /Entity\.java$/, /DTO\.java$/, /POJO\.java$/],
    configs: [/Config\.java$/, /Configuration\.java$/, /Properties\.java$/],
    tests: [/Test\.java$/, /IT\.java$/],
    utils: [/Util(s)?\.java$/, /Helper(s)?\.java$/, /Tool(s)?\.java$/],
  },
  keywords: {
    service: ['service', 'manager', 'handler', 'processor'],
    controller: ['controller', 'resource', 'endpoint', 'rest'],
    model: ['model', 'entity', 'dto', 'pojo', 'bean'],
    test: ['test', 'mock', 'junit', 'mockito'],
    config: ['config', 'configuration', 'properties', 'settings'],
    auth: ['auth', 'security', 'jwt', 'token', 'principal'],
    database: ['repository', 'dao', 'jpa', 'hibernate', 'mybatis'],
  },
  frameworks: ['spring', 'springboot', 'quarkus', 'micronaut', 'jakarta'],
};

/**
 * Go configuration
 */
export const GO_CONFIG: LanguageConfig = {
  name: 'go',
  displayName: 'Go',
  filePatterns: {
    extensions: ['.go'],
    excludePatterns: ['vendor', 'bin'],
  },
  importPatterns: {
    goImport: /import\s+(?:\(\s*([^)]+)\s*\)|"([^"]+)")/g,
  },
  componentPatterns: {
    controllers: [/_handler\.go$/, /_controller\.go$/],
    services: [/_service\.go$/, /_manager\.go$/],
    repositories: [/_repository\.go$/, /_store\.go$/],
    models: [/_model\.go$/, /_entity\.go$/, /_dto\.go$/],
    configs: [/config\.go$/],
    middleware: [/_middleware\.go$/],
    routes: [/_routes?\.go$/, /_router\.go$/],
    tests: [/_test\.go$/],
    utils: [/_util(s)?\.go$/, /_helper(s)?\.go$/],
  },
  keywords: {
    service: ['service', 'manager', 'handler', 'usecase'],
    controller: ['handler', 'controller', 'endpoint'],
    model: ['model', 'entity', 'dto', 'struct'],
    test: ['test', 'mock', 'suite'],
    config: ['config', 'settings', 'env'],
    auth: ['auth', 'jwt', 'token', 'middleware'],
    database: ['repository', 'store', 'dao', 'db'],
  },
  frameworks: ['gin', 'echo', 'fiber', 'chi', 'gorilla'],
};

/**
 * C# configuration
 */
export const CSHARP_CONFIG: LanguageConfig = {
  name: 'csharp',
  displayName: 'C#',
  filePatterns: {
    extensions: ['.cs', '.csx'],
    excludePatterns: ['bin', 'obj', 'packages'],
  },
  importPatterns: {
    csharpUsing: /using\s+(?:static\s+)?([^;]+);/g,
  },
  componentPatterns: {
    controllers: [/Controller\.cs$/, /ApiController\.cs$/],
    services: [/Service\.cs$/, /Manager\.cs$/, /Provider\.cs$/],
    repositories: [/Repository\.cs$/, /Store\.cs$/],
    models: [/Model\.cs$/, /Entity\.cs$/, /DTO\.cs$/, /ViewModel\.cs$/],
    configs: [/Config\.cs$/, /Settings\.cs$/, /Configuration\.cs$/],
    middleware: [/Middleware\.cs$/, /Filter\.cs$/],
    tests: [/Test(s)?\.cs$/, /Spec(s)?\.cs$/],
    utils: [/Util(s)?\.cs$/, /Helper(s)?\.cs$/, /Extension(s)?\.cs$/],
  },
  keywords: {
    service: ['service', 'manager', 'handler', 'provider'],
    controller: ['controller', 'api', 'endpoint'],
    model: ['model', 'entity', 'dto', 'viewmodel'],
    test: ['test', 'mock', 'xunit', 'nunit'],
    config: ['config', 'settings', 'configuration', 'options'],
    auth: ['auth', 'identity', 'jwt', 'token'],
    database: ['repository', 'context', 'dbcontext', 'entity'],
  },
  frameworks: ['aspnet', 'dotnet', 'entityframework', 'dapper'],
};

/**
 * Language registry
 */
export class LanguageRegistry {
  private static instance: LanguageRegistry;
  private languages: Map<string, LanguageConfig> = new Map();

  private constructor() {
    // Register built-in languages
    this.register(TYPESCRIPT_CONFIG);
    this.register(PYTHON_CONFIG);
    this.register(JAVA_CONFIG);
    this.register(GO_CONFIG);
    this.register(CSHARP_CONFIG);
    // Additional popular language support
    this.register(C_CPP_CONFIG);
    this.register(KOTLIN_CONFIG);
    this.register(PHP_CONFIG);
    this.register(RUBY_CONFIG);
    this.register(RUST_CONFIG);
    this.register(SCALA_CONFIG);
    this.register(SWIFT_CONFIG);
    this.register(CSS_CONFIG);
    this.register(HTML_CONFIG);
    this.register(JSON_CONFIG);
    this.register(XML_CONFIG);
    this.register(FLEX_CONFIG);
  }

  public static getInstance(): LanguageRegistry {
    if (!LanguageRegistry.instance) {
      LanguageRegistry.instance = new LanguageRegistry();
    }
    return LanguageRegistry.instance;
  }

  /**
   * Register a new language or override existing
   */
  public register(config: LanguageConfig): void {
    this.languages.set(config.name.toLowerCase(), config);
  }

  /**
   * Get language configuration by name
   */
  public get(languageName: string): LanguageConfig | undefined {
    return this.languages.get(languageName.toLowerCase());
  }

  /**
   * Get all registered languages
   */
  public getAll(): LanguageConfig[] {
    return Array.from(this.languages.values());
  }

  /**
   * Check if language is supported
   */
  public isSupported(languageName: string): boolean {
    return this.languages.has(languageName.toLowerCase());
  }

  /**
   * Detect language from file extension
   */
  public detectFromExtension(extension: string): LanguageConfig | undefined {
    const ext = extension.toLowerCase();
    for (const config of this.languages.values()) {
      if (config.filePatterns.extensions.includes(ext)) {
        return config;
      }
    }
    return undefined;
  }

  /**
   * Get all file extensions across all languages
   */
  public getAllExtensions(): string[] {
    const extensions = new Set<string>();
    for (const config of this.languages.values()) {
      for (const ext of config.filePatterns.extensions) {
        extensions.add(ext);
      }
    }
    return Array.from(extensions);
  }

  /**
   * Get all exclude patterns across all languages
   */
  public getAllExcludePatterns(): string[] {
    const patterns = new Set<string>();
    for (const config of this.languages.values()) {
      if (config.filePatterns.excludePatterns) {
        for (const pattern of config.filePatterns.excludePatterns) {
          patterns.add(pattern);
        }
      }
    }
    return Array.from(patterns);
  }

  /**
   * Merge custom configuration with default
   */
  public extend(languageName: string, partial: Partial<LanguageConfig>): void {
    const existing = this.get(languageName);
    if (!existing) {
      throw new Error(`Language ${languageName} not found. Register it first.`);
    }

    const merged: LanguageConfig = {
      ...existing,
      ...partial,
      filePatterns: {
        ...existing.filePatterns,
        ...partial.filePatterns,
        extensions: [
          ...existing.filePatterns.extensions,
          ...(partial.filePatterns?.extensions || []),
        ],
      },
      keywords: {
        ...existing.keywords,
        ...partial.keywords,
      },
      componentPatterns: {
        ...existing.componentPatterns,
        ...partial.componentPatterns,
      },
    };

    this.register(merged);
  }
}

/**
 * Get the global language registry instance
 */
export function getLanguageRegistry(): LanguageRegistry {
  return LanguageRegistry.getInstance();
}

/**
 * Helper: Register a custom language
 */
export function registerLanguage(config: LanguageConfig): void {
  getLanguageRegistry().register(config);
}

/**
 * Helper: Extend existing language configuration
 */
export function extendLanguage(languageName: string, partial: Partial<LanguageConfig>): void {
  getLanguageRegistry().extend(languageName, partial);
}

/**
 * Apply custom language configuration from user config
 * Converts string patterns to RegExp and merges with built-in languages
 */
export function applyLanguageConfig(languageConfig?: {
  custom?: Record<
    string,
    {
      displayName?: string;
      filePatterns?: {
        extensions?: string[];
        namePatterns?: string[];
        excludePatterns?: string[];
      };
      importPatterns?: Record<string, string>;
      componentPatterns?: Record<string, string[]>;
      keywords?: Record<string, string[]>;
      frameworks?: string[];
    }
  >;
  overrides?: Record<
    string,
    {
      filePatterns?: {
        extensions?: string[];
        excludePatterns?: string[];
      };
      keywords?: Record<string, string[]>;
    }
  >;
}): void {
  const registry = getLanguageRegistry();

  // Apply custom languages
  if (languageConfig?.custom) {
    for (const [name, config] of Object.entries(languageConfig.custom)) {
      const languageConfig: LanguageConfig = {
        name: name.toLowerCase(),
        displayName: config.displayName || name,
        filePatterns: {
          extensions: config.filePatterns?.extensions || [],
          excludePatterns: config.filePatterns?.excludePatterns,
        },
        importPatterns: {},
        componentPatterns: {},
        keywords: config.keywords || {},
        frameworks: config.frameworks,
      };

      // Convert string patterns to RegExp for imports
      if (config.importPatterns) {
        for (const [key, pattern] of Object.entries(config.importPatterns)) {
          try {
            languageConfig.importPatterns[key as keyof LanguageImportPatterns] = new RegExp(
              pattern,
              'g',
            );
          } catch (error) {
            console.warn(
              `Invalid regex pattern for ${name}.importPatterns.${key}: ${pattern}`,
              error,
            );
          }
        }
      }

      // Convert string patterns to RegExp for components
      if (config.componentPatterns) {
        for (const [key, patterns] of Object.entries(config.componentPatterns)) {
          try {
            languageConfig.componentPatterns[key as keyof LanguageComponentPatterns] = patterns.map(
              (p) => new RegExp(p),
            );
          } catch (error) {
            console.warn(`Invalid regex patterns for ${name}.componentPatterns.${key}`, error);
          }
        }
      }

      registry.register(languageConfig);
    }
  }

  // Apply overrides to existing languages
  if (languageConfig?.overrides) {
    for (const [name, overrides] of Object.entries(languageConfig.overrides)) {
      const existing = registry.get(name);
      if (!existing) {
        console.warn(`Cannot override non-existent language: ${name}`);
        continue;
      }

      const partial: Partial<LanguageConfig> = {};

      if (overrides.filePatterns) {
        partial.filePatterns = {
          ...existing.filePatterns,
          ...overrides.filePatterns,
        };
      }

      if (overrides.keywords) {
        partial.keywords = {
          ...existing.keywords,
          ...overrides.keywords,
        };
      }

      registry.extend(name, partial);
    }
  }
}
