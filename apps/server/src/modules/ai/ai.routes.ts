import { Hono, type Context } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import { aiGenerateSchema, aiSettingsUpdateSchema } from './ai.schema';
import * as service from './ai.service';

export const adminAiRoutes = new Hono<{ Variables: { userId: string } }>();
adminAiRoutes.use('*', authMiddleware);

const activeUsers = new Set<string>();

function errorResponse(c: Context, error: unknown) {
  const message = error instanceof Error ? error.message : 'AI 请求失败';
  const status = error instanceof service.AiConfigError ? 400 : 502;
  return c.json({ error: message }, status);
}

adminAiRoutes.get('/settings', (c) => c.json(service.getAiSettings()));

adminAiRoutes.put('/settings', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = aiSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  return c.json(service.updateAiSettings(parsed.data));
});

adminAiRoutes.post('/test', async (c) => {
  try {
    return c.json(await service.testAiConnection());
  } catch (error) {
    return errorResponse(c, error);
  }
});

adminAiRoutes.get('/models', async (c) => {
  try {
    return c.json({ items: await service.listAiModels() });
  } catch (error) {
    return errorResponse(c, error);
  }
});

adminAiRoutes.post('/generate', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = aiGenerateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);

  const userId = c.get('userId');
  if (activeUsers.has(userId)) {
    return c.json({ error: '已有 AI 写作任务正在执行，请等待完成后再试' }, 429);
  }

  activeUsers.add(userId);
  try {
    return c.json(await service.generateWithAi(parsed.data));
  } catch (error) {
    return errorResponse(c, error);
  } finally {
    activeUsers.delete(userId);
  }
});
