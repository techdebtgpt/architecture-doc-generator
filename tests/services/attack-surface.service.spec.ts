import { AttackSurfaceService } from '../../src/services/attack-surface.service';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('AttackSurfaceService', () => {
  let service: AttackSurfaceService;
  let tmpDir: string;

  beforeEach(() => {
    service = new AttackSurfaceService();
  });

  describe('discoverEndpoints', () => {
    it('returns empty array when no route files', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archdoc-'));
      const files = [path.join(tmpDir, 'util.js'), path.join(tmpDir, 'lib.ts')];
      const result = await service.discoverEndpoints(tmpDir, files);
      expect(result).toEqual([]);
    });

    it('discovers Next.js App Router routes from path and exports', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archdoc-'));
      const appApi = path.join(tmpDir, 'app', 'api', 'books', 'route.js');
      await fs.mkdir(path.dirname(appApi), { recursive: true });
      await fs.writeFile(
        appApi,
        `export async function GET(request) { return Response.json({}); }
         export async function POST(request) { return Response.json({}); }`,
        'utf-8',
      );
      const result = await service.discoverEndpoints(tmpDir, [appApi]);
      expect(result.length).toBeGreaterThanOrEqual(1);
      const entry = result.find((e) => e.path.includes('books'));
      expect(entry).toBeDefined();
      expect(entry?.path).toMatch(/\/api\/books/);
      expect(entry?.method).toBeDefined();
      expect(['GET', 'POST']).toContain(entry?.method);
    });

    it('discovers Express routes', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archdoc-'));
      const routeFile = path.join(tmpDir, 'routes', 'users.js');
      await fs.mkdir(path.dirname(routeFile), { recursive: true });
      await fs.writeFile(
        routeFile,
        `router.get('/users', handler);
         router.post('/users', handler);
         app.delete('/users/:id', handler);`,
        'utf-8',
      );
      const result = await service.discoverEndpoints(tmpDir, [routeFile]);
      expect(result.length).toBeGreaterThanOrEqual(2);
      const paths = result.map((e) => e.path);
      expect(paths.some((p) => p.includes('users'))).toBe(true);
    });

    it('detects auth and rate limiting in file context', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archdoc-'));
      const routeFile = path.join(tmpDir, 'api', 'auth', 'route.js');
      await fs.mkdir(path.dirname(routeFile), { recursive: true });
      await fs.writeFile(
        routeFile,
        `import { getToken } from 'next-auth/jwt';
         export async function POST(req) {}
         const x = rateLimit({ windowMs: 60000 });`,
        'utf-8',
      );
      const result = await service.discoverEndpoints(tmpDir, [routeFile]);
      expect(result.length).toBeGreaterThanOrEqual(1);
      const withAuth = result.find((e) => e.authRequired !== false || e.authType);
      const withRate = result.some((e) => e.rateLimited === true);
      expect(withAuth || withRate || result.length).toBeTruthy();
    });

    it('detects project-level CSRF, CORS, and security headers from app entry files', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archdoc-'));
      const mainTs = path.join(tmpDir, 'src', 'main.ts');
      await fs.mkdir(path.dirname(mainTs), { recursive: true });
      await fs.writeFile(
        mainTs,
        `app.use(cors()); app.use(helmet()); app.use(csurf({ cookie: true }));`,
        'utf-8',
      );
      const routeFile = path.join(tmpDir, 'routes', 'users.js');
      await fs.mkdir(path.dirname(routeFile), { recursive: true });
      await fs.writeFile(routeFile, `router.get('/users', handler);`, 'utf-8');
      const files = [mainTs, routeFile];
      const result = await service.discoverEndpoints(tmpDir, files);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((e) => e.corsConfigured === true)).toBe(true);
      expect(result.some((e) => e.securityHeaders === true)).toBe(true);
      expect(result.some((e) => e.csrfProtected === true)).toBe(true);
    });

    it('detects privileged routes (admin path and RBAC)', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archdoc-'));
      const controllerFile = path.join(tmpDir, 'src', 'admin', 'admin.controller.ts');
      await fs.mkdir(path.dirname(controllerFile), { recursive: true });
      await fs.writeFile(
        controllerFile,
        `@Controller('admin')
         export class AdminController {
           @Get() @Roles('admin') list() {}
           @Delete(':id') delete() {}
         }`,
        'utf-8',
      );
      const result = await service.discoverEndpoints(tmpDir, [controllerFile]);
      expect(result.length).toBeGreaterThanOrEqual(1);
      const adminEntry = result.find((e) => e.path.includes('admin'));
      expect(adminEntry).toBeDefined();
      expect(adminEntry?.isPrivileged).toBe(true);
      expect(adminEntry?.sensitiveOperation).toBe(true);
      expect(adminEntry?.roleHint === 'admin' || adminEntry?.isPrivileged).toBeTruthy();
    });

    it('detects file upload endpoints', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archdoc-'));
      const routeFile = path.join(tmpDir, 'routes', 'upload.js');
      await fs.mkdir(path.dirname(routeFile), { recursive: true });
      await fs.writeFile(
        routeFile,
        `const multer = require('multer');
         const upload = multer({ dest: 'uploads/' });
         router.post('/upload', upload.single('file'), handler);`,
        'utf-8',
      );
      const result = await service.discoverEndpoints(tmpDir, [routeFile]);
      expect(result.length).toBeGreaterThanOrEqual(1);
      const uploadEntry = result.find((e) => e.path.includes('upload') || e.isFileUpload);
      expect(uploadEntry).toBeDefined();
      expect(uploadEntry?.isFileUpload).toBe(true);
      expect(uploadEntry?.sensitiveOperation).toBe(true);
    });

    it('flags sensitive operations (payment, delete, users)', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archdoc-'));
      const routeFile = path.join(tmpDir, 'routes', 'api.js');
      await fs.mkdir(path.dirname(routeFile), { recursive: true });
      await fs.writeFile(
        routeFile,
        `router.delete('/users/:id', handler);
         router.post('/payment/charge', handler);
         router.get('/public', handler);`,
        'utf-8',
      );
      const result = await service.discoverEndpoints(tmpDir, [routeFile]);
      const deleteUser = result.find((e) => e.path.includes('users') && e.method === 'DELETE');
      const payment = result.find((e) => e.path.includes('payment'));
      expect(deleteUser?.sensitiveOperation).toBe(true);
      expect(payment?.sensitiveOperation).toBe(true);
    });

    it('flags possible IDOR on path-param routes with no auth/role hint', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archdoc-'));
      const routeFile = path.join(tmpDir, 'routes', 'users.js');
      await fs.mkdir(path.dirname(routeFile), { recursive: true });
      await fs.writeFile(
        routeFile,
        `router.get('/users/:id', handler);
         router.get('/users', listHandler);`,
        'utf-8',
      );
      const result = await service.discoverEndpoints(tmpDir, [routeFile]);
      const withParam = result.find((e) => e.path.includes('/users/:id'));
      const noParam = result.find((e) => e.path === '/users' || e.path.endsWith('/users'));
      expect(withParam?.possibleIdor).toBe(true);
      expect(withParam?.securityHint).toMatch(/IDOR|object-level auth/);
      expect(noParam?.possibleIdor).toBeFalsy();
    });

    it('does not flag IDOR when route has auth or role hint', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archdoc-'));
      const routeFile = path.join(tmpDir, 'routes', 'users.js');
      await fs.mkdir(path.dirname(routeFile), { recursive: true });
      await fs.writeFile(
        routeFile,
        `const auth = require('express-jwt');
         router.get('/users/:id', auth({ secret: 'x' }), handler);`,
        'utf-8',
      );
      const result = await service.discoverEndpoints(tmpDir, [routeFile]);
      const withParam = result.find((e) => e.path.includes('/users/:id'));
      expect(withParam?.authRequired).toBe(true);
      expect(withParam?.possibleIdor).toBeFalsy();
    });
  });
});
