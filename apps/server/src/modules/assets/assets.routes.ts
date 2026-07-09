import { Hono } from 'hono';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import * as service from './assets.service';
import { UploadError } from './assets.service';
import { authMiddleware } from '../../middleware/auth';
import { assetListQuery, assetUpdateSchema } from './assets.schema';
import { env } from '../../config/env';

function asFile(v: unknown): File | null {
  if (
    v &&
    typeof (v as { arrayBuffer?: unknown }).arrayBuffer === 'function' &&
    typeof (v as { name?: unknown }).name !== 'undefined'
  ) {
    return v as File;
  }
  return null;
}

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export const adminAssetsRoutes = new Hono<{ Variables: { userId: string } }>();
// 媒体库管理全部需要登录
adminAssetsRoutes.use('*', authMiddleware);

adminAssetsRoutes.post('/upload', async (c) => {
  let body;
  try {
    body = await c.req.parseBody({ maxFileSize: env.maxUploadSize } as never);
  } catch {
    return c.json({ error: '文件过大' }, 413);
  }
  const file = asFile(body['file']);
  if (!file) return c.json({ error: '缺少 file 字段或非法文件' }, 400);
  try {
    const asset = await service.uploadAsset(file);
    return c.json(asset, 201);
  } catch (e) {
    if (e instanceof UploadError) return c.json({ error: e.message }, 400);
    throw e;
  }
});

adminAssetsRoutes.get('/', async (c) => {
  const q = assetListQuery.parse(c.req.query());
  return c.json(await service.listAssets(q.page, q.pageSize));
});

adminAssetsRoutes.get('/:id', async (c) => {
  const a = await service.getAssetById(c.req.param('id'));
  if (!a) return c.json({ error: 'Not Found' }, 404);
  return c.json(a);
});

adminAssetsRoutes.patch('/:id', async (c) => {
  const parsed = assetUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  const a = await service.updateAsset(c.req.param('id'), parsed.data);
  if (!a) return c.json({ error: 'Not Found' }, 404);
  return c.json(a);
});

adminAssetsRoutes.delete('/:id', async (c) => {
  try {
    const ok = await service.deleteAsset(c.req.param('id'));
    if (!ok) return c.json({ error: 'Not Found' }, 404);
    return c.json({ ok: true });
  } catch (e) {
    if (e instanceof UploadError) return c.json({ error: e.message }, 400);
    throw e;
  }
});

/**
 * 开发环境（及生产静态层备选）暴露上传文件。
 * 生产部署优先由 nginx / 静态层直接服务 /uploads（见 BLOG-10.4 文档），此处作为兜底。
 */
export const uploadsRoutes = new Hono();
uploadsRoutes.get('/*', (c) => {
  const sub = c.req.path.replace(/^\/uploads\/?/, '');
  if (!sub || /[\/\\]|\.\./.test(sub)) return c.json({ error: 'forbidden' }, 403);
  const root = resolve(process.cwd(), env.uploadDir);
  const full = resolve(root, sub);
  if (full !== root && !full.startsWith(root + sep)) return c.json({ error: 'forbidden' }, 403);
  if (!existsSync(full)) return c.json({ error: 'not found' }, 404);
  const data = readFileSync(full);
  const mime = MIME_BY_EXT[extname(full).toLowerCase()] ?? 'application/octet-stream';
  return new Response(data, {
    headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=86400' },
  });
});
