import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { posts } from '../../db/schema';
import * as service from './comments.service';
import { authMiddleware } from '../../middleware/auth';
import { commentCreateSchema, commentUpdateSchema, commentListQuerySchema } from './comments.schema';

// 公开路由（无需登录）
export const commentsRoutes = new Hono();

// GET /api/posts/:slug/comments - 获取文章的评论列表
commentsRoutes.get('/:slug/comments', async (c) => {
  const slug = c.req.param('slug');

  // 解析查询参数
  const query = commentListQuerySchema.parse({
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  });

  try {
    const result = await service.getPublicComments(slug, query.page, query.pageSize);
    return c.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === '文章不存在') {
      return c.json({ error: '文章不存在' }, 404);
    }
    throw err;
  }
});

// POST /api/posts/:slug/comments - 提交评论
commentsRoutes.post('/:slug/comments', async (c) => {
  const slug = c.req.param('slug');

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '请求体格式错误' }, 400);
  }

  // 校验输入
  const parsed = commentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  }

  // 获取 IP 和 User-Agent（用于频率限制和安全审计）
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const userAgent = c.req.header('user-agent');

  try {
    const result = await service.createComment({ ...parsed.data, postSlug: slug }, ip, userAgent);
    return c.json(
      {
        id: result.id,
        status: result.status,
        message: '评论已提交，等待审核',
      },
      201
    );
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === '文章不存在或不可评论') {
        return c.json({ error: err.message }, 404);
      }
      if (err.message === '提交过于频繁，请稍后再试') {
        return c.json({ error: err.message }, 429);
      }
    }
    throw err;
  }
});

// 后台路由（需要登录）
export const adminCommentsRoutes = new Hono<{ Variables: { userId: string } }>();

// 所有后台评论接口都需要鉴权
adminCommentsRoutes.use('*', authMiddleware);

// GET /api/admin/comments - 评论列表（后台）
adminCommentsRoutes.get('/', async (c) => {
  const query = commentListQuerySchema.parse({
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
    status: c.req.query('status'),
    postId: c.req.query('postId'),
    postSlug: c.req.query('postSlug'),
  });

  const result = await service.getAdminComments(query);
  return c.json(result);
});

// GET /api/admin/comments/:id - 单条评论详情（后台）
adminCommentsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const comment = await service.getCommentById(id);

  if (!comment) {
    return c.json({ error: '评论不存在' }, 404);
  }

  return c.json(comment);
});

// PATCH /api/admin/comments/:id - 更新评论（后台）
adminCommentsRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '请求体格式错误' }, 400);
  }

  const parsed = commentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  }

  const comment = await service.updateComment(id, parsed.data);
  if (!comment) {
    return c.json({ error: '评论不存在' }, 404);
  }

  return c.json(comment);
});

// POST /api/admin/comments/:id/approve - 批准评论
adminCommentsRoutes.post('/:id/approve', async (c) => {
  const id = c.req.param('id');
  const comment = await service.approveComment(id);

  if (!comment) {
    return c.json({ error: '评论不存在' }, 404);
  }

  return c.json({ ...comment, message: '评论已批准' });
});

// POST /api/admin/comments/:id/reject - 拒绝评论
adminCommentsRoutes.post('/:id/reject', async (c) => {
  const id = c.req.param('id');
  const comment = await service.rejectComment(id);

  if (!comment) {
    return c.json({ error: '评论不存在' }, 404);
  }

  return c.json({ ...comment, message: '评论已拒绝' });
});

// POST /api/admin/comments/:id/spam - 标记为垃圾评论
adminCommentsRoutes.post('/:id/spam', async (c) => {
  const id = c.req.param('id');
  const comment = await service.markAsSpam(id);

  if (!comment) {
    return c.json({ error: '评论不存在' }, 404);
  }

  return c.json({ ...comment, message: '评论已标记为垃圾' });
});

// DELETE /api/admin/comments/:id - 删除评论（软删除）
adminCommentsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const ok = await service.deleteComment(id);

  if (!ok) {
    return c.json({ error: '评论不存在' }, 404);
  }

  return c.json({ ok: true, message: '评论已删除' });
});
