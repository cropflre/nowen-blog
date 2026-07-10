import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth';
import * as service from './analytics.service';

const viewBodySchema = z.object({
  referrer: z.string().max(500).nullable().optional(),
});

function getClientIp(headers: { get(name: string): string | undefined }): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

/** 浏览器端显式上报文章访问，避免数据读取、预渲染和爬虫请求误计数。 */
export const postViewRoutes = new Hono();

postViewRoutes.post('/:slug/views', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = viewBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  }

  const result = service.recordPostView({
    slug: c.req.param('slug'),
    visitorId: c.req.header('x-visitor-id'),
    ip: getClientIp({ get: (name) => c.req.header(name) }),
    userAgent: c.req.header('user-agent'),
    referrer: parsed.data.referrer,
  });

  if (!result) return c.json({ error: '文章不存在' }, 404);
  return c.json(result);
});

/** 后台统计数据。 */
export const adminAnalyticsRoutes = new Hono<{ Variables: { userId: string } }>();
adminAnalyticsRoutes.use('*', authMiddleware);
adminAnalyticsRoutes.get('/dashboard', (c) => c.json(service.getDashboardStats()));
