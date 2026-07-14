import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';

/**
 * 旧版“空间 / 版本 / 仓库同步”后台接口已停用。
 * 新后台只使用 /api/admin/help-centers，避免管理员接触技术概念。
 */
export const adminDocsRoutes = new Hono<{ Variables: { userId: string } }>();
adminDocsRoutes.use('*', authMiddleware);
adminDocsRoutes.all('*', (c) =>
  c.json(
    {
      error: '旧版文档管理接口已停用，请使用帮助中心后台。',
      replacement: '/api/admin/help-centers',
    },
    410,
  ),
);
