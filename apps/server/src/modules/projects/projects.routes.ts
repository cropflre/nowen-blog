import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import { projectCreateSchema, projectUpdateSchema } from './projects.schema';
import * as service from './projects.service';

export const projectsRoutes = new Hono();

projectsRoutes.get('/', (c) => {
  const rawLimit = Number(c.req.query('limit') ?? 24);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.trunc(rawLimit))) : 24;
  return c.json({ items: service.listPublicProjects(limit) });
});

export const adminProjectsRoutes = new Hono<{ Variables: { userId: string } }>();
adminProjectsRoutes.use('*', authMiddleware);

adminProjectsRoutes.get('/', (c) => c.json({ items: service.listAdminProjects() }));

adminProjectsRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  return c.json(service.createProject(parsed.data), 201);
});

adminProjectsRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  const project = service.updateProject(c.req.param('id'), parsed.data);
  if (!project) return c.json({ error: '项目不存在' }, 404);
  return c.json(project);
});

adminProjectsRoutes.delete('/:id', (c) => {
  if (!service.deleteProject(c.req.param('id'))) return c.json({ error: '项目不存在' }, 404);
  return c.json({ ok: true });
});
