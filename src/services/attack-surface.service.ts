import { promises as fs } from 'fs';
import * as path from 'path';
import type { AttackSurfaceEntry } from '../schemas/pentest-analysis.schema';

/** Result of scanning a single file for route/security context */
export interface RouteFileContext {
  authMiddleware: boolean;
  authType: 'jwt' | 'oauth' | 'session' | 'nextauth' | 'passport' | undefined;
  rateLimited: boolean;
  hasValidation: boolean;
  csrfProtected: boolean;
  corsConfigured: boolean;
  securityHeaders: boolean;
  isPrivileged: boolean;
  isFileUpload: boolean;
  roleHint: string | undefined;
}

/** Project-level security context (from app entry / middleware files) */
export interface ProjectSecurityContext {
  csrfProtected: boolean;
  corsConfigured: boolean;
  securityHeaders: boolean;
}

/**
 * Discovers API endpoints and attack surface from route definitions.
 * Supports Express, Fastify, NestJS, and Next.js App Router.
 */
export class AttackSurfaceService {
  /**
   * Discover all attack surface entries (endpoints) from project files.
   */
  async discoverEndpoints(projectPath: string, files: string[]): Promise<AttackSurfaceEntry[]> {
    const entries: AttackSurfaceEntry[] = [];
    const routeFiles = files.filter(
      (f) =>
        f.includes('route') ||
        f.includes('api') ||
        f.includes('controller') ||
        f.endsWith('app.js') ||
        f.endsWith('app.ts') ||
        f.endsWith('server.js') ||
        f.endsWith('server.ts') ||
        f.includes('/routes/') ||
        f.includes('/api/'),
    );

    const projectContext = await this.detectProjectSecurityContext(projectPath, files);

    for (const filePath of routeFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = path.relative(projectPath, filePath);
        const discovered = this.parseFile(projectPath, filePath, relativePath, content);
        entries.push(
          ...discovered.map((e) => this.mergeContext(e, content, relativePath, projectContext)),
        );
      } catch {
        continue;
      }
    }

    return this.deduplicateEntries(entries);
  }

  /**
   * Detect project-level security controls (CSRF, CORS, security headers) from app entry files.
   */
  private async detectProjectSecurityContext(
    _projectPath: string,
    files: string[],
  ): Promise<ProjectSecurityContext> {
    const appEntryPattern =
      /(?:^|[/\\])(?:main|app|server|index)\.(?:ts|js|tsx|jsx)$|(?:^|[/\\])app\.module\.(?:ts|js)$/i;
    const appFiles = files.filter((f) => appEntryPattern.test(f.replace(/\\/g, '/')));
    let csrfProtected = false;
    let corsConfigured = false;
    let securityHeaders = false;

    for (const filePath of appFiles.slice(0, 10)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lower = content.toLowerCase();
        if (
          /csrf|csurf|csrftoken|sameSite|same-site|xsrf/i.test(content) ||
          lower.includes('csrf') ||
          (lower.includes('cookie') && (lower.includes('samesite') || lower.includes('same-site')))
        ) {
          csrfProtected = true;
        }
        if (
          /\.use\s*\(\s*cors|cors\s*\(|enableCors|app\.enableCors|access-control|Access-Control/i.test(
            content,
          )
        ) {
          corsConfigured = true;
        }
        if (
          /helmet\s*\(|x-frame-options|xcontenttypeoptions|content-security-policy|strict-transport-security|csp\s*\(|hsts/i.test(
            lower,
          ) ||
          /X-Frame-Options|X-Content-Type-Options|Content-Security-Policy|Strict-Transport-Security/i.test(
            content,
          )
        ) {
          securityHeaders = true;
        }
      } catch {
        continue;
      }
    }
    return { csrfProtected, corsConfigured, securityHeaders };
  }

  /**
   * Parse a single file and extract endpoints based on framework patterns.
   * Returns raw entries (path, method, sourceFile, and any per-route flags).
   */
  private parseFile(
    projectPath: string,
    filePath: string,
    relativePath: string,
    content: string,
  ): AttackSurfaceEntry[] {
    const entries: AttackSurfaceEntry[] = [];

    // Next.js App Router: app/api/.../route.js or route.ts
    const nextAppRoute = this.parseNextAppRouterRoute(projectPath, filePath, relativePath, content);
    if (nextAppRoute.length > 0) {
      entries.push(...nextAppRoute);
      return entries;
    }

    // Express: app.METHOD(path) or router.METHOD(path)
    entries.push(...this.parseExpressRoutes(content, relativePath));

    // Fastify: fastify.METHOD(path) or .get/.post
    entries.push(...this.parseFastifyRoutes(content, relativePath));

    // NestJS: @Controller + @Get/@Post etc.
    entries.push(...this.parseNestJsRoutes(content, relativePath));

    return entries;
  }

  /**
   * Next.js App Router: path from file location (app/api/foo/route.js -> /api/foo), methods from exports.
   */
  private parseNextAppRouterRoute(
    _projectPath: string,
    _filePath: string,
    relativePath: string,
    content: string,
  ): AttackSurfaceEntry[] {
    if (!relativePath.replace(/\\/g, '/').match(/^(app\/)?api\/.+\/route\.(js|ts|jsx|tsx)$/i)) {
      return [];
    }
    const pathFromFile =
      relativePath
        .replace(/\\/g, '/')
        .replace(/^app\/?/, '/')
        .replace(/\/route\.(js|ts|jsx|tsx)$/i, '')
        .replace(/\/index$/i, '') || '/';
    const apiPath = pathFromFile.startsWith('/') ? pathFromFile : `/${pathFromFile}`;

    const methods: string[] = [];
    if (
      /\bexport\s+(async\s+)?function\s+GET\b|export\s+{\s*GET\b|export\s+const\s+GET\s*=/m.test(
        content,
      )
    )
      methods.push('GET');
    if (
      /\bexport\s+(async\s+)?function\s+POST\b|export\s+{\s*POST\b|export\s+const\s+POST\s*=/m.test(
        content,
      )
    )
      methods.push('POST');
    if (
      /\bexport\s+(async\s+)?function\s+PUT\b|export\s+{\s*PUT\b|export\s+const\s+PUT\s*=/m.test(
        content,
      )
    )
      methods.push('PUT');
    if (
      /\bexport\s+(async\s+)?function\s+PATCH\b|export\s+{\s*PATCH\b|export\s+const\s+PATCH\s*=/m.test(
        content,
      )
    )
      methods.push('PATCH');
    if (
      /\bexport\s+(async\s+)?function\s+DELETE\b|export\s+{\s*DELETE\b|export\s+const\s+DELETE\s*=/m.test(
        content,
      )
    )
      methods.push('DELETE');
    if (methods.length === 0) methods.push('GET'); // default for route.js

    const sensitive = /upload|auth|login|signin|signup|password|payment|admin|delete|user/i.test(
      apiPath,
    );
    return methods.map((method) => ({
      path: apiPath,
      method,
      sourceFile: relativePath,
      sensitiveOperation: sensitive,
    }));
  }

  /**
   * Express: app.get('/path', ...) or router.get('/path', ...)
   */
  private parseExpressRoutes(content: string, relativePath: string): AttackSurfaceEntry[] {
    const entries: AttackSurfaceEntry[] = [];
    const methodRegex =
      /(?:app|router)\s*\.\s*(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const hasUpload = /multer|upload\.single|upload\.array|formidable|busboy|multipart/i.test(
      content,
    );
    let m: RegExpExecArray | null;
    while ((m = methodRegex.exec(content)) !== null) {
      const method = m[1].toUpperCase();
      const routePath = m[2].trim();
      const path = routePath.startsWith('/') ? routePath : `/${routePath}`;
      const sensitive =
        /\/admin|\/payment|\/order|\/users\/[^/]*\/delete|delete|upload|stripe|webhook/i.test(
          path,
        ) ||
        (method !== 'GET' && /\/users|\/auth|\/password/i.test(path));
      entries.push({
        path,
        method: method === 'ALL' ? undefined : method,
        sourceFile: relativePath,
        sensitiveOperation: sensitive,
        isFileUpload: hasUpload,
      });
    }
    return entries;
  }

  /**
   * Fastify: fastify.get('/path', ...) or .get(...)
   */
  private parseFastifyRoutes(content: string, relativePath: string): AttackSurfaceEntry[] {
    const entries: AttackSurfaceEntry[] = [];
    const methodRegex =
      /(?:fastify|app)\s*\.\s*(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const hasUpload = /multer|upload|formidable|busboy|multipart/i.test(content);
    let m: RegExpExecArray | null;
    while ((m = methodRegex.exec(content)) !== null) {
      const method = m[1].toUpperCase();
      const routePath = m[2].trim();
      const path = routePath.startsWith('/') ? routePath : `/${routePath}`;
      const sensitive =
        /\/admin|\/payment|\/order|delete|upload|stripe|webhook/i.test(path) ||
        (method !== 'GET' && /\/users|\/auth/i.test(path));
      entries.push({
        path,
        method: method === 'ALL' ? undefined : method,
        sourceFile: relativePath,
        sensitiveOperation: sensitive,
        isFileUpload: hasUpload,
      });
    }
    // fastify.route({ method: 'GET', url: '/path', ... })
    const routeObjRegex =
      /(?:method|method:\s*)\s*['"](GET|POST|PUT|PATCH|DELETE)['"].*?(?:url|url:\s*)\s*['"`]([^'"`]+)['"`]/gs;
    while ((m = routeObjRegex.exec(content)) !== null) {
      const path = m[2].trim().startsWith('/') ? m[2].trim() : `/${m[2].trim()}`;
      const sensitive = /\/admin|\/payment|\/order|delete|upload|stripe|webhook/i.test(path);
      entries.push({
        path,
        method: m[1].toUpperCase(),
        sourceFile: relativePath,
        sensitiveOperation: sensitive,
        isFileUpload: hasUpload,
      });
    }
    return entries;
  }

  /**
   * NestJS: @Controller('path') with @Get(), @Post(), etc.
   */
  private parseNestJsRoutes(content: string, relativePath: string): AttackSurfaceEntry[] {
    const entries: AttackSurfaceEntry[] = [];
    const controllerMatch = content.match(/@Controller\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/);
    const basePath = controllerMatch ? controllerMatch[1].trim() || '/' : '/';
    const base = basePath.startsWith('/') ? basePath : `/${basePath}`;
    const hasUpload = /FileInterceptor|UploadedFile|@UseInterceptors\s*\([^)]*File/i.test(content);
    const hasRoles = /@Roles\s*\(|RolesGuard|RequireRole/i.test(content);
    const roleMatch = content.match(/@Roles\s*\(\s*['"`](\w+)['"`]\)/);
    const roleHint = roleMatch ? roleMatch[1] : undefined;

    const decoratorRegex = /@(Get|Post|Put|Patch|Delete|All)\s*\(\s*['"`]?([^'"`)]*)['"`]?\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = decoratorRegex.exec(content)) !== null) {
      const method = m[1].toUpperCase();
      const subPath = (m[2] || '').trim();
      const fullPath = subPath ? `${base}/${subPath}`.replace(/\/+/g, '/') : base;
      const pathNorm = fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
      const isPrivileged = /\/admin|\/dashboard|\/manage|\/internal/i.test(pathNorm) || hasRoles;
      const sensitive =
        /\/admin|\/payment|\/order|delete|upload|user|auth|password/i.test(pathNorm) ||
        (method !== 'GET' && /user|auth|article|comment|profile/i.test(pathNorm));
      entries.push({
        path: pathNorm,
        method: method === 'ALL' ? undefined : method,
        sourceFile: relativePath,
        sensitiveOperation: sensitive,
        isPrivileged,
        isFileUpload: hasUpload,
        roleHint: roleHint ?? undefined,
      });
    }
    if (entries.length === 0 && controllerMatch) {
      const pathNorm = base.startsWith('/') ? base : `/${base}`;
      entries.push({
        path: pathNorm,
        sourceFile: relativePath,
        isPrivileged: /\/admin|\/dashboard|\/manage|\/internal/i.test(pathNorm) || hasRoles,
        isFileUpload: hasUpload,
        roleHint: roleHint ?? undefined,
      });
    }
    return entries;
  }

  /**
   * Detect auth, rate limiting, validation, CSRF/CORS/headers (file-level), privileged, and file upload in the route file.
   */
  private detectRouteFileContext(content: string, routePath: string): RouteFileContext {
    const lower = content.toLowerCase();
    let authType: RouteFileContext['authType'];
    if (lower.includes('nextauth') || lower.includes('getserversession')) authType = 'nextauth';
    else if (lower.includes('jwt') || lower.includes('jsonwebtoken') || lower.includes('verify('))
      authType = 'jwt';
    else if (lower.includes('passport') || lower.includes('authenticate(')) authType = 'passport';
    else if (
      lower.includes('session') &&
      (lower.includes('express-session') || lower.includes('req.session'))
    )
      authType = 'session';
    else if (lower.includes('oauth') || lower.includes('oauth2')) authType = 'oauth';

    const authMiddleware =
      !!authType ||
      /auth\s*\(|requireAuth|isAuthenticated|verifyToken|checkAuth|middleware\s*\(.*auth/i.test(
        content,
      );
    const rateLimited = /rateLimit|rate-limit|rate_limit|express-rate-limit|throttle/i.test(
      content,
    );
    const hasValidation = /joi\.|yup\.|validate\s*\(|class-validator|zod\.|validator\./i.test(
      content,
    );

    const csrfProtected =
      /csrf|csurf|csrftoken|sameSite|same-site|xsrf/i.test(content) ||
      (lower.includes('cookie') && (lower.includes('samesite') || lower.includes('same-site')));
    const corsConfigured = /\.use\s*\(\s*cors|cors\s*\(|enableCors|access-control/i.test(content);
    const securityHeaders =
      /helmet\s*\(|x-frame-options|xcontenttypeoptions|content-security-policy|strict-transport-security/i.test(
        lower,
      ) ||
      /X-Frame-Options|X-Content-Type-Options|Content-Security-Policy|Strict-Transport-Security/i.test(
        content,
      );

    const privilegedPath = /\/admin|\/dashboard|\/manage|\/internal|\/backend|\/staff/i.test(
      routePath,
    );
    const rbacInFile =
      /@Roles\s*\(|@UseGuards\s*\([^)]*RolesGuard|RequireRole|hasRole|checkRole|rbac|roleGuard/i.test(
        content,
      );
    const roleMatch = content.match(
      /@Roles\s*\(\s*['"`](\w+)['"`]\)|RequireRole\s*\(\s*['"`](\w+)['"`]|role\s*[=:]\s*['"`](\w+)['"`]/i,
    );
    const roleHint = roleMatch ? roleMatch[1] || roleMatch[2] || roleMatch[3] : undefined;
    const isPrivileged = privilegedPath || !!roleHint || rbacInFile;

    const isFileUpload =
      /multer|upload\.single|upload\.array|\.array\s*\(\s*['"`]|formidable|busboy|multipart|FormData|fileupload|express\.fileupload/i.test(
        content,
      ) ||
      /@UseInterceptors\s*\([^)]*FileInterceptor|@UploadedFile|UploadedFile\s*\(/i.test(content);

    return {
      authMiddleware,
      authType,
      rateLimited,
      hasValidation,
      csrfProtected,
      corsConfigured,
      securityHeaders,
      isPrivileged,
      isFileUpload,
      roleHint,
    };
  }

  /**
   * Heuristic: route has object-level path param (e.g. /users/:id) with no auth/role hint
   * → possible IDOR / missing object-level authorization.
   */
  private static hasPathParam(path: string): boolean {
    return /\/:[^/]+/.test(path);
  }

  private mergeContext(
    entry: AttackSurfaceEntry,
    content: string,
    relativePath: string,
    projectContext: ProjectSecurityContext,
  ): AttackSurfaceEntry {
    const ctx = this.detectRouteFileContext(content, entry.path);
    const merged: AttackSurfaceEntry = {
      ...entry,
      sourceFile: entry.sourceFile ?? relativePath,
      authRequired: ctx.authMiddleware,
      authType: ctx.authType,
      rateLimited: ctx.rateLimited,
      inputValidation: ctx.hasValidation,
      csrfProtected: projectContext.csrfProtected || ctx.csrfProtected,
      corsConfigured: projectContext.corsConfigured || ctx.corsConfigured,
      securityHeaders: projectContext.securityHeaders || ctx.securityHeaders,
      isPrivileged: entry.isPrivileged ?? ctx.isPrivileged,
      isFileUpload: entry.isFileUpload ?? ctx.isFileUpload,
      roleHint: entry.roleHint ?? ctx.roleHint,
    };
    const hasAuthOrRole =
      merged.authRequired === true || (merged.roleHint != null && merged.roleHint !== '');
    if (AttackSurfaceService.hasPathParam(merged.path) && !hasAuthOrRole) {
      merged.possibleIdor = true;
      merged.securityHint = 'possible IDOR / missing object-level auth';
    }
    return merged;
  }

  private deduplicateEntries(entries: AttackSurfaceEntry[]): AttackSurfaceEntry[] {
    const seen = new Set<string>();
    return entries.filter((e) => {
      const key = `${e.method ?? '*'}:${e.path}:${e.sourceFile ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
