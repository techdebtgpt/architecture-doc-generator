import { promises as fs } from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { getLanguageRegistry } from '../config/language-config';

/**
 * Represents a single import statement
 */
export interface ImportInfo {
  source: string; // File that contains the import
  target: string; // Module/file being imported
  imports?: string[]; // Specific symbols imported (optional)
  type: 'local' | 'external' | 'framework'; // Type of import
  resolvedPath?: string; // Resolved file path for local imports
}

/**
 * Module/component information
 */
export interface ModuleInfo {
  name: string;
  path: string;
  files: string[];
  dependencies: string[]; // Other modules this depends on
  exports: string[]; // What this module exports
}

/**
 * Dependency graph
 */
export interface DependencyGraph {
  nodes: Array<{
    id: string; // File path
    type: 'file' | 'module' | 'external';
    name: string;
  }>;
  edges: Array<{
    from: string; // Source file
    to: string; // Target file/module
    type: 'import' | 'require';
  }>;
}

/**
 * Import scanner - extracts dependencies from import statements
 * Language-agnostic approach using regex patterns
 */
export class ImportScanner {
  private logger = new Logger('ImportScanner');
  private languageRegistry = getLanguageRegistry();

  /**
   * Scan project for imports and build dependency graph
   */
  public async scanProject(
    projectPath: string,
    files: string[],
  ): Promise<{
    imports: ImportInfo[];
    modules: ModuleInfo[];
    graph: DependencyGraph;
  }> {
    this.logger.info(`Scanning ${files.length} files for imports...`);

    const imports: ImportInfo[] = [];

    // Process files in batches to avoid memory issues
    const batchSize = 50;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchImports = await Promise.all(batch.map((file) => this.scanFile(projectPath, file)));
      imports.push(...batchImports.flat());
    }

    this.logger.info(`Found ${imports.length} import statements`);

    // Build modules from directory structure
    const modules = this.identifyModules(projectPath, imports);
    this.logger.info(`Identified ${modules.length} modules`);

    // Build dependency graph
    const graph = this.buildDependencyGraph(imports, modules);
    this.logger.info(
      `Built dependency graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`,
    );

    return { imports, modules, graph };
  }

  /**
   * Scan a single file for import statements
   */
  private async scanFile(projectPath: string, filePath: string): Promise<ImportInfo[]> {
    try {
      const fullPath = path.join(projectPath, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');

      const imports: ImportInfo[] = [];

      // Detect language from file extension
      const ext = path.extname(filePath);
      const languageConfig = this.languageRegistry.detectFromExtension(ext);

      if (!languageConfig) {
        this.logger.debug(`No language config found for ${ext} - skipping ${filePath}`);
        return imports;
      }

      // Apply all import patterns from the language configuration dynamically
      const patterns = languageConfig.importPatterns;

      // Iterate through all patterns defined in the language config
      for (const [patternName, patternRegex] of Object.entries(patterns)) {
        if (!patternRegex) continue;

        try {
          const regex = new RegExp(patternRegex.source, patternRegex.flags);
          let match: RegExpExecArray | null;

          while ((match = regex.exec(content)) !== null) {
            // Extract target from first non-empty capture group
            const target = match[1] || match[2] || match[0];
            if (!target) continue;

            // Special handling for specific pattern types
            const importInfo = this.extractImportInfo(
              patternName,
              match,
              filePath,
              projectPath,
              target,
            );

            imports.push(importInfo);
          }
        } catch (error) {
          this.logger.debug(
            `Error applying pattern ${patternName} to ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      return imports;
    } catch (error) {
      this.logger.debug(`Failed to scan file: ${filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Extract import info based on pattern type and match groups
   * This method handles pattern-specific logic for different import styles
   */
  private extractImportInfo(
    patternName: string,
    match: RegExpExecArray,
    filePath: string,
    projectPath: string,
    target: string,
  ): ImportInfo {
    // Handle special cases based on pattern name
    switch (patternName) {
      case 'es6Import':
      case 'commonjsRequire': {
        // ES6/CommonJS: extract named imports from clause
        const importClause = match[0];
        const imports = this.extractNamedImports(importClause);
        return {
          source: filePath,
          target,
          imports,
          type: this.classifyImport(target),
          resolvedPath: this.resolveLocalImport(projectPath, filePath, target),
        };
      }

      case 'pythonImport': {
        // Python: from X import Y, Z
        const modulePath = match[1] || match[2]?.split(',')[0].trim() || target;
        const importNames = match[2]?.split(',').map((n) => n.trim()) || [];
        return {
          source: filePath,
          target: modulePath,
          imports: importNames,
          type: this.classifyImport(modulePath),
          resolvedPath: this.resolveLocalImport(projectPath, filePath, modulePath),
        };
      }

      case 'javaImport': {
        // Java: import com.package.ClassName;
        const importPath = match[2]?.trim() || match[1] || target;
        const parts = importPath.split('.');
        const className = parts[parts.length - 1];
        return {
          source: filePath,
          target: importPath,
          imports: [className],
          type: this.classifyImport(importPath),
        };
      }

      case 'goImport': {
        // Go: import ("pkg1" "pkg2") or import "pkg"
        const importList = match[1] || match[2] || target;
        const imports_go = importList
          .split('\n')
          .map((line) => line.trim().replace(/"/g, ''))
          .filter((line) => line && !line.startsWith('//'));

        // If multiple imports, return first one (caller will iterate)
        const firstImport = imports_go[0] || target;
        return {
          source: filePath,
          target: firstImport,
          imports: [],
          type: this.classifyImport(firstImport),
        };
      }

      default: {
        // Generic handler for all other patterns (C#, Rust, PHP, Ruby, custom languages)
        return {
          source: filePath,
          target,
          imports: [],
          type: this.classifyImport(target),
          resolvedPath: this.resolveLocalImport(projectPath, filePath, target),
        };
      }
    }
  }

  /**
   * Extract named imports from import clause
   */
  private extractNamedImports(importClause: string): string[] {
    const namedImportsMatch = importClause.match(/\{([^}]+)\}/);
    if (namedImportsMatch) {
      return namedImportsMatch[1].split(',').map((name) => name.trim());
    }

    const defaultImportMatch = importClause.match(/import\s+(\w+)\s+from/);
    if (defaultImportMatch) {
      return [defaultImportMatch[1]];
    }

    const namespaceImportMatch = importClause.match(/import\s+\*\s+as\s+(\w+)/);
    if (namespaceImportMatch) {
      return [namespaceImportMatch[1]];
    }

    return [];
  }

  /**
   * Classify import as local, external, or framework
   */
  private classifyImport(modulePath: string): 'local' | 'external' | 'framework' {
    // Local imports start with . or @/
    if (modulePath.startsWith('.') || modulePath.startsWith('@/')) {
      return 'local';
    }

    // Framework imports (common frameworks)
    const frameworks = [
      '@nestjs',
      '@angular',
      'react',
      'vue',
      'express',
      'fastify',
      'django',
      'flask',
      'spring',
      'asp.net',
    ];

    if (frameworks.some((fw) => modulePath.startsWith(fw) || modulePath.includes(fw))) {
      return 'framework';
    }

    // Everything else is external library
    return 'external';
  }

  /**
   * Resolve local import to actual file path
   */
  private resolveLocalImport(
    projectPath: string,
    sourceFile: string,
    importPath: string,
  ): string | undefined {
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
      return undefined;
    }

    const sourceDir = path.dirname(sourceFile);

    // Handle path aliases (@/ -> src/)
    let resolvedPath = importPath;
    if (importPath.startsWith('@/')) {
      resolvedPath = importPath.replace('@/', 'src/');
    } else {
      resolvedPath = path.join(sourceDir, importPath);
    }

    // Normalize path
    resolvedPath = path.normalize(resolvedPath);

    // Try common extensions
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.cs'];
    for (const ext of extensions) {
      const withExt = resolvedPath + ext;
      if (this.fileExists(path.join(projectPath, withExt))) {
        return withExt;
      }
    }

    // Try index files
    for (const ext of extensions) {
      const indexFile = path.join(resolvedPath, `index${ext}`);
      if (this.fileExists(path.join(projectPath, indexFile))) {
        return indexFile;
      }
    }

    return resolvedPath;
  }

  /**
   * Check if file exists (sync for simplicity in resolver)
   */
  private fileExists(_fullPath: string): boolean {
    // Note: In real implementation, we'd cache file existence checks
    // For now, assume file exists if path looks reasonable
    return true;
  }

  /**
   * Identify modules from directory structure and imports
   */
  private identifyModules(_projectPath: string, imports: ImportInfo[]): ModuleInfo[] {
    const modules = new Map<string, ModuleInfo>();

    // Group files by directory (modules are typically organized by folder)
    for (const imp of imports) {
      if (imp.type === 'local' && imp.resolvedPath) {
        const dir = path.dirname(imp.resolvedPath);

        // Consider top 2 levels as module boundaries (e.g., src/auth/, src/user/)
        const parts = dir.split(/[/\\]/);
        const modulePath = parts.slice(0, Math.min(2, parts.length)).join('/');

        if (!modules.has(modulePath)) {
          modules.set(modulePath, {
            name: parts[parts.length - 1] || modulePath,
            path: modulePath,
            files: [],
            dependencies: [],
            exports: [],
          });
        }

        const module = modules.get(modulePath)!;
        if (!module.files.includes(imp.source)) {
          module.files.push(imp.source);
        }
        if (imp.resolvedPath && !module.files.includes(imp.resolvedPath)) {
          module.files.push(imp.resolvedPath);
        }
      }
    }

    // Build module dependencies (modules that depend on other modules)
    for (const imp of imports) {
      if (imp.type === 'local' && imp.resolvedPath) {
        const sourceModule = this.getModulePath(imp.source);
        const targetModule = this.getModulePath(imp.resolvedPath);

        if (sourceModule && targetModule && sourceModule !== targetModule) {
          const module = modules.get(sourceModule);
          if (module && !module.dependencies.includes(targetModule)) {
            module.dependencies.push(targetModule);
          }
        }
      }
    }

    return Array.from(modules.values());
  }

  /**
   * Get module path from file path (e.g., src/auth/auth.service.ts -> src/auth)
   */
  private getModulePath(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts.slice(0, Math.min(2, parts.length)).join('/');
  }

  /**
   * Build dependency graph from imports
   */
  private buildDependencyGraph(imports: ImportInfo[], modules: ModuleInfo[]): DependencyGraph {
    const nodes = new Set<string>();
    const edges: Array<{ from: string; to: string; type: 'import' | 'require' }> = [];

    // Add file nodes
    for (const imp of imports) {
      nodes.add(imp.source);
      if (imp.resolvedPath) {
        nodes.add(imp.resolvedPath);
        edges.push({
          from: imp.source,
          to: imp.resolvedPath,
          type: 'import',
        });
      } else if (imp.type === 'external') {
        // Add external dependencies as nodes
        nodes.add(imp.target);
        edges.push({
          from: imp.source,
          to: imp.target,
          type: 'import',
        });
      }
    }

    // Add module nodes
    for (const module of modules) {
      nodes.add(module.path);
    }

    return {
      nodes: Array.from(nodes).map((id) => ({
        id,
        type: this.getNodeType(id),
        name: path.basename(id),
      })),
      edges,
    };
  }

  /**
   * Determine node type
   */
  private getNodeType(nodePath: string): 'file' | 'module' | 'external' {
    if (nodePath.includes('/') && !nodePath.includes('.')) {
      return 'module';
    }
    if (!nodePath.startsWith('.') && !nodePath.startsWith('/')) {
      return 'external';
    }
    return 'file';
  }
}
