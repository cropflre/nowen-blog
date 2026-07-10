import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import { siteSettingsSchema } from './settings.schema';
import * as service from './settings.service';

export const settingsRoutes = new Hono();

settingsRoutes.get('/', (c) => c.json(service.getSiteSettings()));

export const adminSettingsRoutes = new Hono<{ Variables: { userId: string } }>();
adminSettingsRoutes.use('*', authMiddleware);

adminSettingsRoutes.get('/', (c) => c.json(service.getAdminSiteSettings()));

adminSettingsRoutes.put('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '请求体格式错误' }, 400);
  }

  const parsed = siteSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  }

  return c.json(service.updateSiteSettings(parsed.data));
});
