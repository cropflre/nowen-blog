import { Hono } from 'hono';
import * as service from './comments.service';
import { authMiddleware } from '../../middleware/auth';
import { getSiteSettings } from '../settings/settings.service';
import { commentCreateSchema, commentUpdateSchema, commentListQuerySchema } from './comments.schema';

export const commentsRoutes = new Hono();

commentsRoutes.get('/:slug/comments', async (c) => {
  const parsed = commentListQuerySchema.safeParse({
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  });
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);

  try {
    return c.json(await service.getPublicComments(c.req.param('slug'), parsed.data.page, parsed.data.pageSize));
  } catch (err) {
    if (err instanceof Error && err.message === '文章不存在') {
      return c.json({ error: '文章不存在' }, 404);
    }
    throw err;
  }
});

commentsRoutes.post('/:slug/comments', async (c) => {
  if (!getSiteSettings().commentsEnabled) {
    return c.json({ error: '站点评论功能当前已关闭' }, 403);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '请求体格式错误' }, 400);
  }

  const parsed = commentCreateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);

  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const userAgent = c.req.header('user-agent');

  try {
    const result = await service.createComment(
      { ...parsed.data, postSlug: c.req.param('slug') },
      ip,
      userAgent,
    );
    return c.json(
      { id: result.id, status: result.status, message: '评论已提交，等待审核' },
      201,
    );
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === '文章不存在或不可评论') return c.json({ error: err.message }, 404);
      if (err.message === '提交过于频繁，请稍后再试') return c.json({ error: err.message }, 429);
    }
    throw err;
  }
});

export const adminCommentsRoutes = new Hono<{ Variables: { userId: string } }>();
adminCommentsRoutes.use('*', authMiddleware);

adminCommentsRoutes.get('/', async (c) => {
  const parsed = commentListQuerySchema.safeParse({
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
    status: c.req.query('status'),
    postId: c.req.query('postId'),
    postSlug: c.req.query('postSlug'),
  });
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  return c.json(await service.getAdminComments(parsed.data));
});

adminCommentsRoutes.get('/:id', async (c) => {
  const comment = await service.getCommentById(c.req.param('id'));
  if (!comment) return c.json({ error: '评论不存在' }, 404);
  return c.json(comment);
});

adminCommentsRoutes.patch('/:id', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '请求体格式错误' }, 400);
  }
  const parsed = commentUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  const comment = await service.updateComment(c.req.param('id'), parsed.data);
  if (!comment) return c.json({ error: '评论不存在' }, 404);
  return c.json(comment);
});

adminCommentsRoutes.post('/:id/approve', async (c) => {
  const comment = await service.approveComment(c.req.param('id'));
  if (!comment) return c.json({ error: '评论不存在' }, 404);
  return c.json({ ...comment, message: '评论已批准' });
});

adminCommentsRoutes.post('/:id/reject', async (c) => {
  const comment = await service.rejectComment(c.req.param('id'));
  if (!comment) return c.json({ error: '评论不存在' }, 404);
  return c.json({ ...comment, message: '评论已拒绝' });
});

adminCommentsRoutes.post('/:id/spam', async (c) => {
  const comment = await service.markAsSpam(c.req.param('id'));
  if (!comment) return c.json({ error: '评论不存在' }, 404);
  return c.json({ ...comment, message: '评论已标记为垃圾' });
});

adminCommentsRoutes.delete('/:id', async (c) => {
  const ok = await service.deleteComment(c.req.param('id'));
  if (!ok) return c.json({ error: '评论不存在' }, 404);
  return c.json({ ok: true, message: '评论已删除' });
});
