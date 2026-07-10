import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import {
  sendPostNewsletterSchema,
  subscribeSchema,
  subscriberListSchema,
  unsubscribeSchema,
} from './newsletter.schema';
import * as service from './newsletter.service';

export const newsletterRoutes = new Hono();

newsletterRoutes.post('/subscribe', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '请求体格式错误' }, 400);
  }
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  if (parsed.data.website) return c.json({ ok: true, message: '订阅成功。' });
  const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
  const clientKey = forwarded || c.req.header('x-real-ip') || 'unknown';
  try {
    return c.json(service.subscribe(parsed.data.email, parsed.data.source, clientKey), 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('过于频繁')) {
      return c.json({ error: error.message }, 429);
    }
    throw error;
  }
});

newsletterRoutes.post('/unsubscribe', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '请求体格式错误' }, 400);
  }
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '退订链接无效' }, 400);
  try {
    return c.json(service.unsubscribeByToken(parsed.data.token));
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : '退订失败' }, 400);
  }
});

export const adminNewsletterRoutes = new Hono<{ Variables: { userId: string } }>();
adminNewsletterRoutes.use('*', authMiddleware);

adminNewsletterRoutes.get('/', (c) => {
  const parsed = subscriberListSchema.safeParse({
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
    status: c.req.query('status'),
  });
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  return c.json(service.listSubscribers(parsed.data));
});

adminNewsletterRoutes.post('/:id/activate', (c) => {
  const subscriber = service.setSubscriberStatus(c.req.param('id'), 'active');
  if (!subscriber) return c.json({ error: '订阅者不存在' }, 404);
  return c.json(subscriber);
});

adminNewsletterRoutes.post('/:id/unsubscribe', (c) => {
  const subscriber = service.setSubscriberStatus(c.req.param('id'), 'unsubscribed');
  if (!subscriber) return c.json({ error: '订阅者不存在' }, 404);
  return c.json(subscriber);
});

adminNewsletterRoutes.delete('/:id', (c) => {
  if (!service.deleteSubscriber(c.req.param('id'))) return c.json({ error: '订阅者不存在' }, 404);
  return c.json({ ok: true });
});

adminNewsletterRoutes.post('/send-post', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '请求体格式错误' }, 400);
  }
  const parsed = sendPostNewsletterSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  try {
    return c.json(await service.sendPostNewsletter(parsed.data.postId, parsed.data.subject));
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : '邮件发送失败' }, 400);
  }
});
