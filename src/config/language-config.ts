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
  packageManager?: string; // Package manager name (e.g., 'npm/yarn', 'pip', 'maven/gradle')
  packageFiles?: string[]; // Package manager files (package.json, requirements.txt, etc.)
  testPatterns?: string[]; // Test file patterns to exclude (e.g., '.test.', '.spec.', '__tests__')
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
  packageManager: 'npm/yarn',
  packageFiles: ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'],
  testPatterns: ['.test.', '.spec.', '__tests__'],
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
  packageFiles: [
    'CMakeLists.txt',
    'Makefile',
    'meson.build',
    'conanfile.txt',
    'conanfile.py',
    'vcpkg.json',
  ],
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
  packageManager: 'gradle/maven',
  packageFiles: ['build.gradle.kts', 'build.gradle', 'pom.xml', 'settings.gradle.kts'],
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
  packageManager: 'composer',
  packageFiles: ['composer.json', 'composer.lock'],
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
  packageManager: 'bundler',
  packageFiles: ['Gemfile', 'Gemfile.lock', '*.gemspec'],
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
  packageManager: 'cargo',
  packageFiles: ['Cargo.toml', 'Cargo.lock'],
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
  packageManager: 'sbt/maven',
  packageFiles: ['build.sbt', 'build.sc', 'pom.xml'],
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
  packageManager: 'swift package manager',
  packageFiles: ['Package.swift', 'Podfile', 'Podfile.lock', 'Cartfile', 'Cartfile.resolved'],
};

/**
 * Dart configuration
 */
export const DART_CONFIG: LanguageConfig = {
  name: 'dart',
  displayName: 'Dart',
  filePatterns: {
    extensions: ['.dart'],
    excludePatterns: ['build', '.dart_tool', '.packages'],
  },
  importPatterns: {
    dartImport: /import\s+['"]([^'"]+)['"]/g,
    dartExport: /export\s+['"]([^'"]+)['"]/g,
  },
  componentPatterns: {
    controllers: [/_controller\.dart$/, /_page\.dart$/],
    services: [/_service\.dart$/, /_provider\.dart$/, /_repository\.dart$/],
    models: [/_model\.dart$/, /_entity\.dart$/, /_dto\.dart$/],
    configs: [/config\.dart$/],
    tests: [/_test\.dart$/, /test\//],
    utils: [/_util(s)?\.dart$/, /_helper(s)?\.dart$/],
  },
  keywords: {
    service: ['service', 'provider', 'repository', 'bloc', 'cubit'],
    controller: ['controller', 'page', 'screen', 'widget'],
    model: ['model', 'entity', 'dto', 'class'],
    test: ['test', 'mock', 'widget test', 'integration test'],
    config: ['config', 'environment'],
  },
  frameworks: ['flutter', 'dart shelf', 'aqueduct'],
  packageManager: 'pub',
  packageFiles: ['pubspec.yaml', 'pubspec.lock'],
  testPatterns: ['_test.dart', '/test/'],
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
  packageManager: 'pip',
  packageFiles: [
    'requirements.txt',
    'Pipfile',
    'Pipfile.lock',
    'poetry.lock',
    'pyproject.toml',
    'setup.py',
    'setup.cfg',
  ],
  testPatterns: ['test_', '_test.py', 'conftest.py', '/tests/'],
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
    service: ['service', 'manager', 'provider', 'factory'],
    controller: ['controller', 'resource', 'endpoint', 'rest'],
    model: ['model', 'entity', 'dto', 'pojo', 'vo'],
    test: ['test', 'mock', 'junit', 'mockito'],
    config: ['config', 'configuration', 'properties', 'settings'],
    auth: ['auth', 'security', 'jwt', 'token', 'principal'],
    database: ['repository', 'dao', 'jpa', 'hibernate', 'mybatis'],
  },
  frameworks: ['spring', 'springboot', 'quarkus', 'micronaut', 'jakarta'],
  packageManager: 'maven/gradle',
  packageFiles: [
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
    'settings.gradle',
    'gradle.properties',
    'ivy.xml',
  ],
  testPatterns: ['Test.java', 'IT.java', '/test/', '/tests/'],
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
  packageManager: 'go modules',
  packageFiles: ['go.mod', 'go.sum'],
  testPatterns: ['_test.go', '/test/'],
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
    service: ['service', 'manager', 'provider', 'handler'],
    controller: ['controller', 'apicontroller'],
    model: ['model', 'entity', 'dto', 'viewmodel'],
    test: ['test', 'mock', 'xunit', 'nunit'],
    config: ['config', 'settings', 'configuration', 'options'],
    auth: ['auth', 'identity', 'jwt', 'token'],
    database: ['repository', 'context', 'dbcontext', 'entity'],
  },
  frameworks: ['aspnet', 'dotnet', 'entityframework', 'dapper'],
  packageManager: 'nuget',
  packageFiles: ['*.csproj', '*.sln', 'packages.config', 'paket.dependencies', 'global.json'],
  testPatterns: ['Test.cs', 'Tests.cs', 'Spec.cs', 'Specs.cs', '/test/', '/tests/'],
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
    this.register(DART_CONFIG);
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
 * Helper: Get all supported language names from the registry
 */
export function getSupportedLanguages(): string[] {
  return getLanguageRegistry()
    .getAll()
    .map((config) => config.name);
}

/**
 * Helper: Get all unique keywords of a specific category across all languages
 */
export function getKeywordsByCategory(category: keyof LanguageKeywords): string[] {
  const keywords = new Set<string>();
  const registry = getLanguageRegistry();

  for (const config of registry.getAll()) {
    const categoryKeywords = config.keywords[category];
    if (categoryKeywords) {
      categoryKeywords.forEach((keyword) => keywords.add(keyword));
    }
  }

  return Array.from(keywords);
}

/**
 * Helper: Get all security-related keywords (auth + database) across all languages
 */
export function getSecurityKeywords(): string[] {
  const authKeywords = getKeywordsByCategory('auth');
  const databaseKeywords = getKeywordsByCategory('database');

  // Add common security-specific terms not in language configs
  const additionalSecurityTerms = [
    'security',
    'crypto',
    'bcrypt',
    'hash',
    'passport',
    'oauth',
    'login',
    'password',
    'credential',
    'secret',
    'key',
    '.env',
    'middleware',
    'guard',
    'config',
    'settings',
  ];

  return [...new Set([...authKeywords, ...databaseKeywords, ...additionalSecurityTerms])];
}

/**
 * Helper: Get language name from file extension
 * Uses the language registry to map extensions to language names
 */
export function getLanguageFromExtension(filePath: string): string {
  const ext = filePath.includes('.') ? '.' + filePath.split('.').pop()?.toLowerCase() : '';

  if (!ext) {
    return 'text';
  }

  const registry = getLanguageRegistry();
  const config = registry.detectFromExtension(ext);

  return config?.name || ext.slice(1) || 'text';
}

/**
 * Helper: Check if file matches a specific component pattern across all languages
 * @param filePath - Full path to the file
 * @param componentType - Type of component to check (models, controllers, services, etc.)
 * @returns true if file matches the pattern for any registered language
 */
export function isComponentType(
  filePath: string,
  componentType: keyof LanguageComponentPatterns,
): boolean {
  const registry = getLanguageRegistry();

  for (const config of registry.getAll()) {
    const patterns = config.componentPatterns[componentType];
    if (patterns) {
      for (const pattern of patterns) {
        if (pattern.test(filePath)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Helper: Get all files that match a specific component pattern
 * @param files - Array of file paths to filter
 * @param componentType - Type of component (models, controllers, services, etc.)
 * @returns Filtered array of files matching the component pattern
 */
export function getComponentFiles(
  files: string[],
  componentType: keyof LanguageComponentPatterns,
): string[] {
  return files.filter((file) => isComponentType(file, componentType));
}

/**
 * Helper: Get all schema-related files (models, configs, types)
 * Special helper for schema detection across all languages
 */
export function getSchemaFiles(files: string[]): {
  models: string[];
  configs: string[];
  all: string[];
} {
  const models = getComponentFiles(files, 'models');
  const configs = getComponentFiles(files, 'configs');

  // Additional schema-specific patterns (Prisma, GraphQL, OpenAPI)
  // Note: .d.ts files are TypeScript definitions, not database schemas
  // Only include actual schema files: Prisma, GraphQL, OpenAPI
  const schemaSpecific = files.filter(
    (f) =>
      f.endsWith('.prisma') ||
      f.endsWith('.graphql') ||
      f.endsWith('.gql') ||
      (f.toLowerCase().includes('schema') && !f.endsWith('.d.ts')) || // Exclude .d.ts
      f.toLowerCase().includes('openapi') ||
      f.toLowerCase().includes('swagger'),
  );

  const all = [...new Set([...models, ...configs, ...schemaSpecific])];

  return { models, configs, all };
}

/**
 * Helper: Check if a file is a code file (not config, docs, etc.)
 * Uses language registry to determine if file extension is a programming language
 */
export function isCodeFile(filePath: string): boolean {
  const ext = filePath.includes('.') ? '.' + filePath.split('.').pop()?.toLowerCase() : '';

  if (!ext) {
    return false;
  }

  const registry = getLanguageRegistry();
  const config = registry.detectFromExtension(ext);

  // Exclude non-code languages like JSON, XML, HTML, CSS
  const nonCodeLanguages = ['json', 'xml', 'html', 'css'];

  return config !== undefined && !nonCodeLanguages.includes(config.name);
}

/**
 * Helper: Get all code files from a list
 * @param files - Array of file paths
 * @returns Array of code files (excludes config, docs, assets)
 */
export function getCodeFiles(files: string[]): string[] {
  return files.filter((file) => isCodeFile(file));
}

/**
 * Get all package manager files (package.json, requirements.txt, pom.xml, etc.)
 * from all registered languages
 * @param files - Array of file paths to filter
 * @returns Array of package manager files
 */
export function getPackageFiles(files: string[]): string[] {
  const registry = getLanguageRegistry();
  const packageFilePatterns = new Set<string>();

  for (const config of registry.getAll()) {
    if (config.packageFiles) {
      config.packageFiles.forEach((pattern) => packageFilePatterns.add(pattern));
    }
  }

  return files.filter((file) => {
    const basename = file.split('/').pop() || '';
    return Array.from(packageFilePatterns).some((pattern) => {
      // Handle wildcard patterns (e.g., *.csproj, *.gemspec)
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(basename);
      }
      // Handle exact matches
      return basename === pattern;
    });
  });
}

/**
 * Get all test file patterns from all registered languages
 * Returns patterns like '.test.', '.spec.', '__tests__', 'test_', etc.
 * @returns Array of test patterns
 */
export function getTestPatterns(): string[] {
  const registry = getLanguageRegistry();
  const patterns = new Set<string>();

  for (const config of registry.getAll()) {
    if (config.testPatterns) {
      config.testPatterns.forEach((pattern) => patterns.add(pattern));
    }
  }

  return Array.from(patterns);
}

/**
 * Get all exclude patterns from all registered languages
 * Combines common patterns (node_modules, dist, build) with test patterns
 * @returns Array of exclude patterns
 */
export function getExcludePatterns(): string[] {
  const commonPatterns = ['node_modules', 'dist', 'build', 'out', 'bin', 'obj', 'vendor', 'target'];
  const testPatterns = getTestPatterns();
  return [...commonPatterns, ...testPatterns];
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
      packageManager?: string;
      packageFiles?: string[];
      testPatterns?: string[];
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
      packageManager?: string;
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
        packageManager: config.packageManager,
        packageFiles: config.packageFiles,
        testPatterns: config.testPatterns,
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

      if (overrides.packageManager) {
        partial.packageManager = overrides.packageManager;
      }

      registry.extend(name, partial);
    }
  }
}

/**
 * Check if a file matches test patterns from any language
 * @param filePath - Path to the file to check
 * @returns True if the file matches any test pattern
 */
export function matchesTestPattern(filePath: string): boolean {
  const fileName = filePath.toLowerCase();
  const testPatterns = getTestPatterns();
  return testPatterns.some((pattern) => fileName.includes(pattern.toLowerCase()));
}

/**
 * Check if a file is a package manager file
 * @param filePath - Path to the file to check
 * @returns True if the file is a package manager file
 */
export function matchesPackageFile(filePath: string): boolean {
  const packageFiles = getPackageFiles([filePath]);
  return packageFiles.length > 0;
}

/**
 * Get all valid component types
 * @returns Array of component type keys
 */
export function getComponentTypes(): Array<keyof LanguageComponentPatterns> {
  return [
    'modules',
    'controllers',
    'services',
    'repositories',
    'models',
    'configs',
    'middleware',
    'routes',
    'tests',
    'utils',
  ];
}

/**
 * Get all valid keyword categories
 * @returns Array of keyword category keys
 */
export function getKeywordCategories(): Array<keyof LanguageKeywords> {
  return ['service', 'controller', 'model', 'test', 'config', 'auth', 'database'];
}

/**
 * Get package managers from language names
 * @param languageNames - Array of language names (e.g., ['TypeScript', 'Python'])
 * @returns Array of unique package manager names
 */
export function getPackageManagersFromLanguages(languageNames: string[]): string[] {
  const registry = getLanguageRegistry();
  const packageManagers = new Set<string>();

  for (const langName of languageNames) {
    const config = registry.get(langName.toLowerCase());
    if (config?.packageManager) {
      packageManagers.add(config.packageManager);
    }
  }

  return Array.from(packageManagers);
}

/**
 * Extract import/require statements from source code using language-specific patterns
 * Filters out relative imports (starting with '.', '/', or containing internal paths)
 * @param content - Source code content
 * @param filePath - Path to the file (used to detect language)
 * @returns Array of external package/module names
 */
export function extractImportsFromCode(content: string, filePath: string): string[] {
  const imports = new Set<string>();
  const ext = filePath.includes('.') ? '.' + filePath.split('.').pop()?.toLowerCase() : '';

  if (!ext) {
    return [];
  }

  const registry = getLanguageRegistry();
  const config = registry.detectFromExtension(ext);

  if (!config || !config.importPatterns) {
    return [];
  }

  // Apply all import patterns for this language
  for (const [patternName, pattern] of Object.entries(config.importPatterns)) {
    if (!pattern) continue;

    // Reset regex lastIndex for global regexes
    pattern.lastIndex = 0;

    const matches = content.matchAll(pattern);
    for (const match of matches) {
      // Extract the import path from capture groups
      // Patterns can have 1 or 2 capture groups depending on syntax
      const importPath = match[1] || match[2];
      if (!importPath) continue;

      // Filter out relative imports and internal paths
      if (importPath.startsWith('.') || importPath.startsWith('/')) {
        continue;
      }

      // Extract package name based on language conventions
      let packageName = importPath.trim();

      // TypeScript/JavaScript: Handle scoped packages (@org/package)
      if (
        config.name === 'typescript' &&
        (patternName === 'es6Import' || patternName === 'commonjsRequire')
      ) {
        if (packageName.startsWith('@')) {
          // Scoped package: take first 2 parts (@org/package)
          packageName = packageName.split('/').slice(0, 2).join('/');
        } else {
          // Regular package: take first part before /
          packageName = packageName.split('/')[0];
        }
      }

      // Python: Handle module paths (package.module)
      if (config.name === 'python') {
        // For "from X import Y", use X; for "import X.Y", use X
        if (patternName === 'pythonImport') {
          // First capture group is the module in "from X import Y"
          const fromModule = match[1];
          if (fromModule) {
            packageName = fromModule.split('.')[0];
          } else {
            // Second capture group is "import X.Y.Z" - take root
            packageName = packageName.split('.')[0];
          }
        }
      }

      // Java: Extract root package (first 2 parts: org.springframework)
      if (config.name === 'java') {
        const parts = packageName.split('.');
        if (parts.length >= 2) {
          packageName = `${parts[0]}.${parts[1]}`;
        }
      }

      // C#: Extract root namespace (first part)
      if (config.name === 'csharp') {
        const rootNamespace = packageName.split('.')[0];
        // Filter out System namespace (built-in)
        if (rootNamespace !== 'System') {
          packageName = rootNamespace;
        } else {
          continue;
        }
      }

      // Go: Extract package name (last part of path: github.com/org/repo → repo)
      if (config.name === 'go') {
        packageName = packageName.split('/').pop() || packageName;
      }

      // Ruby: Already clean, just trim
      if (config.name === 'ruby') {
        packageName = packageName.trim();
      }

      // Rust: Handle use statements (can be complex like std::collections::HashMap)
      if (config.name === 'rust') {
        // Take root crate name
        packageName = packageName.split('::')[0];
      }

      if (packageName) {
        imports.add(packageName);
      }
    }
  }

  return Array.from(imports);
}
