import { promises as fs } from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

/**
 * Import/dependency information
 */
export interface ImportInfo {
  source: string; // File doing the import
  target: string; // Module being imported
  imports: string[]; // Named imports
  type: 'local' | 'external' | 'framework'; // Import type
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

      // TypeScript/JavaScript ES6 imports
      const es6ImportRegex =
        /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
      let match;
      while ((match = es6ImportRegex.exec(content)) !== null) {
        const modulePath = match[1];
        const importClause = match[0];

        // Extract named imports
        const namedImports = this.extractNamedImports(importClause);

        imports.push({
          source: filePath,
          target: modulePath,
          imports: namedImports,
          type: this.classifyImport(modulePath),
          resolvedPath: this.resolveLocalImport(projectPath, filePath, modulePath),
        });
      }

      // CommonJS require statements
      const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        const modulePath = match[1];

        imports.push({
          source: filePath,
          target: modulePath,
          imports: [], // Require doesn't have named imports in same way
          type: this.classifyImport(modulePath),
          resolvedPath: this.resolveLocalImport(projectPath, filePath, modulePath),
        });
      }

      // Python imports
      const pythonImportRegex = /(?:from\s+(\S+)\s+)?import\s+([^\n]+)/g;
      while ((match = pythonImportRegex.exec(content)) !== null) {
        const modulePath = match[1] || match[2].split(',')[0].trim();
        const importNames = match[2].split(',').map((n) => n.trim());

        imports.push({
          source: filePath,
          target: modulePath,
          imports: importNames,
          type: this.classifyImport(modulePath),
          resolvedPath: this.resolveLocalImport(projectPath, filePath, modulePath),
        });
      }

      // Java imports
      const javaImportRegex = /import\s+(static\s+)?([^;]+);/g;
      while ((match = javaImportRegex.exec(content)) !== null) {
        const importPath = match[2].trim();
        const parts = importPath.split('.');
        const className = parts[parts.length - 1];

        imports.push({
          source: filePath,
          target: importPath,
          imports: [className],
          type: this.classifyImport(importPath),
        });
      }

      // Go imports
      const goImportRegex = /import\s+(?:\(\s*([^)]+)\s*\)|"([^"]+)")/g;
      while ((match = goImportRegex.exec(content)) !== null) {
        const importList = match[1] || match[2];
        const imports_go = importList
          .split('\n')
          .map((line) => line.trim().replace(/"/g, ''))
          .filter((line) => line && !line.startsWith('//'));

        for (const imp of imports_go) {
          imports.push({
            source: filePath,
            target: imp,
            imports: [],
            type: this.classifyImport(imp),
          });
        }
      }

      // C# using statements
      const csharpUsingRegex = /using\s+(?:static\s+)?([^;]+);/g;
      while ((match = csharpUsingRegex.exec(content)) !== null) {
        const namespace = match[1].trim();

        imports.push({
          source: filePath,
          target: namespace,
          imports: [],
          type: this.classifyImport(namespace),
        });
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
