import { Hono } from 'hono';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import * as service from './assets.service';
import { AssetInUseError, UploadError } from './assets.service';
import { authMiddleware } from '../../middleware/auth';
import { assetListQuery, assetUpdateSchema } from './assets.schema';
import { env } from '../../config/env';

function asFile(value: unknown): File | null {
  if (
    value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === 'function' &&
    typeof (value as { name?: unknown }).name !== 'undefined'
  ) {
    return value as File;
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
  } catch (error) {
    if (error instanceof UploadError) return c.json({ error: error.message }, 400);
    throw error;
  }
});

adminAssetsRoutes.get('/', async (c) => {
  const query = assetListQuery.parse(c.req.query());
  return c.json(await service.listAssets(query.page, query.pageSize));
});

adminAssetsRoutes.get('/:id/references', async (c) => {
  const result = await service.findAssetReferences(c.req.param('id'));
  if (!result) return c.json({ error: 'Not Found' }, 404);
  return c.json({ ...result, count: result.references.length });
});

adminAssetsRoutes.get('/:id', async (c) => {
  const asset = await service.getAssetById(c.req.param('id'));
  if (!asset) return c.json({ error: 'Not Found' }, 404);
  return c.json(asset);
});

adminAssetsRoutes.patch('/:id', async (c) => {
  const parsed = assetUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  }
  const asset = await service.updateAsset(c.req.param('id'), parsed.data);
  if (!asset) return c.json({ error: 'Not Found' }, 404);
  return c.json(asset);
});

adminAssetsRoutes.delete('/:id', async (c) => {
  try {
    const force = c.req.query('force') === 'true';
    const ok = await service.deleteAsset(c.req.param('id'), force);
    if (!ok) return c.json({ error: 'Not Found' }, 404);
    return c.json({ ok: true });
  } catch (error) {
    if (error instanceof AssetInUseError) {
      return c.json({ error: error.message, references: error.references }, 409);
    }
    if (error instanceof UploadError) return c.json({ error: error.message }, 400);
    throw error;
  }
});

/** 开发环境及生产静态层备选：暴露上传文件。 */
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
