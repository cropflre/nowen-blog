import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, extname, resolve, sep } from 'node:path';
import { count, desc, eq } from 'drizzle-orm';
import { db, sqlite } from '../../db/client';
import { assets } from '../../db/schema';
import { env } from '../../config/env';
import { nowIso, randomId } from '../../lib/format';

export type AssetRow = typeof assets.$inferSelect;

export type AssetReference = {
  type: 'post_cover' | 'post_content' | 'site_setting' | 'version' | 'autosave';
  id: string;
  title: string;
  field: string;
};

export class AssetInUseError extends Error {
  constructor(public readonly references: AssetReference[]) {
    super('媒体文件正在被使用');
    this.name = 'AssetInUseError';
  }
}

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_EXTENSION));

function normalizeFileName(value: string): string {
  const parsed = basename(value || 'image');
  return parsed.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'image';
}

function storageRoot(): string {
  const root = resolve(env.uploadDir);
  mkdirSync(root, { recursive: true });
  return root;
}

function safeStoragePath(storageKey: string): string {
  const root = storageRoot();
  const full = resolve(root, storageKey);
  if (full !== root && !full.startsWith(root + sep)) throw new Error('媒体存储路径越界');
  return full;
}

function extensionFor(filename: string, mimeType: string): string {
  const extension = extname(filename).toLowerCase();
  if (extension && extension.length <= 10) return extension;
  return MIME_EXTENSION[mimeType] ?? '';
}

export async function createAsset(input: {
  buffer: Uint8Array;
  filename: string;
  mimeType: string;
  alt?: string | null;
  uploadedBy: string;
}): Promise<AssetRow> {
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) throw new Error('仅支持常见图片格式');
  if (input.buffer.byteLength <= 0) throw new Error('文件内容为空');
  if (input.buffer.byteLength > env.maxUploadSize) throw new Error('图片超过上传大小限制');

  const filename = normalizeFileName(input.filename);
  const extension = extensionFor(filename, input.mimeType);
  const digest = createHash('sha256').update(input.buffer).digest('hex');
  const existing = await db.query.assets.findFirst({ where: eq(assets.hash, digest) });
  if (existing) return existing;

  const id = randomId('ast_');
  const now = nowIso();
  const storageKey = `${id}${extension}`;
  const url = `/uploads/${storageKey}`;
  writeFileSync(safeStoragePath(storageKey), input.buffer);
  try {
    await db
      .insert(assets)
      .values({
        id,
        url,
        filename,
        mimeType: input.mimeType,
        size: input.buffer.byteLength,
        alt: input.alt ?? null,
        hash: digest,
        storageKey,
        uploadedBy: input.uploadedBy,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  } catch (error) {
    try {
      unlinkSync(safeStoragePath(storageKey));
    } catch {
      // Ignore cleanup failures and keep the original database error.
    }
    throw error;
  }
  return (await getAssetById(id))!;
}

export async function listAssets(page = 1, pageSize = 24): Promise<{
  items: AssetRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const safePage = Math.max(1, Math.trunc(page));
  const safeSize = Math.max(1, Math.min(100, Math.trunc(pageSize)));
  const offset = (safePage - 1) * safeSize;
  const rows = await db.query.assets.findMany({
    orderBy: [desc(assets.createdAt)],
    limit: safeSize,
    offset,
  });
  const [{ total }] = await db.select({ total: count() }).from(assets);
  return { items: rows, total, page: safePage, pageSize: safeSize };
}

export async function getAssetById(id: string): Promise<AssetRow | null> {
  return (await db.query.assets.findFirst({ where: eq(assets.id, id) })) ?? null;
}

export async function updateAsset(
  id: string,
  input: { alt?: string | null; filename?: string | null },
): Promise<AssetRow | null> {
  const existing = await getAssetById(id);
  if (!existing) return null;
  const patch: Partial<AssetRow> = { updatedAt: nowIso() };
  if (input.alt !== undefined) patch.alt = input.alt;
  if (input.filename !== undefined) patch.filename = input.filename;
  await db.update(assets).set(patch).where(eq(assets.id, id)).run();
  return getAssetById(id);
}

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

export async function findAssetReferences(id: string): Promise<{
  asset: AssetRow;
  references: AssetReference[];
} | null> {
  const asset = await getAssetById(id);
  if (!asset) return null;
  const references: AssetReference[] = [];
  const pattern = likePattern(asset.url);

  const postRows = sqlite
    .prepare(
      `SELECT id, title, cover_url AS coverUrl, content_md AS contentMd
       FROM posts
       WHERE cover_url = ? OR content_md LIKE ? ESCAPE '\\'`,
    )
    .all(asset.url, pattern) as Array<{ id: string; title: string; coverUrl: string | null; contentMd: string }>;
  for (const post of postRows) {
    if (post.coverUrl === asset.url) references.push({ type: 'post_cover', id: post.id, title: post.title, field: '封面图' });
    if (post.contentMd.includes(asset.url)) references.push({ type: 'post_content', id: post.id, title: post.title, field: '正文' });
  }

  const setting = sqlite
    .prepare(
      `SELECT id, site_title AS title, logo_url AS logoUrl, favicon_url AS faviconUrl,
              default_og_image AS defaultOgImage
       FROM site_settings
       WHERE logo_url = ? OR favicon_url = ? OR default_og_image = ?`,
    )
    .get(asset.url, asset.url, asset.url) as {
      id: string;
      title: string;
      logoUrl: string | null;
      faviconUrl: string | null;
      defaultOgImage: string | null;
    } | undefined;
  if (setting) {
    if (setting.logoUrl === asset.url) references.push({ type: 'site_setting', id: setting.id, title: setting.title, field: '站点 Logo' });
    if (setting.faviconUrl === asset.url) references.push({ type: 'site_setting', id: setting.id, title: setting.title, field: 'Favicon' });
    if (setting.defaultOgImage === asset.url) references.push({ type: 'site_setting', id: setting.id, title: setting.title, field: '默认 OG 图片' });
  }

  const versions = sqlite
    .prepare(
      `SELECT pv.id, pv.version, p.title
       FROM post_versions pv
       JOIN posts p ON p.id = pv.post_id
       WHERE pv.snapshot_json LIKE ? ESCAPE '\\'
       ORDER BY pv.version DESC`,
    )
    .all(pattern) as Array<{ id: string; version: number; title: string }>;
  for (const version of versions) {
    references.push({ type: 'version', id: version.id, title: version.title, field: `历史版本 V${version.version}` });
  }

  const autosaves = sqlite
    .prepare(
      `SELECT pa.post_id AS id, p.title
       FROM post_autosaves pa
       JOIN posts p ON p.id = pa.post_id
       WHERE pa.payload_json LIKE ? ESCAPE '\\'`,
    )
    .all(pattern) as Array<{ id: string; title: string }>;
  for (const autosave of autosaves) {
    references.push({ type: 'autosave', id: autosave.id, title: autosave.title, field: '自动草稿' });
  }

  return { asset, references };
}

export async function deleteAsset(id: string, force = false): Promise<boolean> {
  const result = await findAssetReferences(id);
  if (!result) return false;
  if (!force && result.references.length > 0) throw new AssetInUseError(result.references);

  const asset = result.asset;
  if (!asset) return false;
  await db.delete(assets).where(eq(assets.id, id)).run();
  const full = safeStoragePath(asset.storageKey);
  if (existsSync(full)) {
    try {
      unlinkSync(full);
    } catch (error) {
      console.error(`[assets] 文件删除失败: ${full}`, error);
    }
  }
  return true;
}
