import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { eq, desc, count } from 'drizzle-orm';
import { db, sqlite } from '../../db/client';
import { assets } from '../../db/schema';
import { randomId, nowIso } from '../../lib/format';
import { env } from '../../config/env';

export class UploadError extends Error {}

export interface AssetReference {
  type: 'post_cover' | 'post_content' | 'site_setting' | 'version' | 'autosave';
  id: string;
  title: string;
  field: string;
}

export class AssetInUseError extends Error {
  constructor(public readonly references: AssetReference[]) {
    super(`图片仍被 ${references.length} 处内容引用，请先移除引用或确认强制删除`);
  }
}

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

const EXT_BY_MIME: Record<AllowedMime, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function detectMagic(buf: Buffer): AllowedMime | null {
  if (buf.length >= 8 && buf.toString('hex', 0, 8) === '89504e470d0a1a0a') return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 6 &&
    (buf.toString('ascii', 0, 6) === 'GIF89a' || buf.toString('ascii', 0, 6) === 'GIF87a')
  ) return 'image/gif';
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) return 'image/webp';
  return null;
}

function readUInt24LE(buf: Buffer, offset: number): number {
  return buf[offset]! | (buf[offset + 1]! << 8) | (buf[offset + 2]! << 16);
}

function detectDimensions(buf: Buffer, mime: AllowedMime): { width: number; height: number } | null {
  try {
    if (mime === 'image/png' && buf.length >= 24) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (mime === 'image/gif' && buf.length >= 10) {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }
    if (mime === 'image/jpeg') {
      const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
      let offset = 2;
      while (offset + 9 < buf.length) {
        if (buf[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = buf[offset + 1]!;
        if (sof.has(marker)) {
          return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
        }
        if (marker === 0xd8 || marker === 0xd9) {
          offset += 2;
          continue;
        }
        const length = buf.readUInt16BE(offset + 2);
        if (length < 2) break;
        offset += 2 + length;
      }
    }
    if (mime === 'image/webp' && buf.length >= 30) {
      const chunk = buf.toString('ascii', 12, 16);
      if (chunk === 'VP8X') {
        return { width: readUInt24LE(buf, 24) + 1, height: readUInt24LE(buf, 27) + 1 };
      }
      if (chunk === 'VP8L' && buf[20] === 0x2f) {
        const b1 = buf[21]!;
        const b2 = buf[22]!;
        const b3 = buf[23]!;
        const b4 = buf[24]!;
        return {
          width: 1 + (((b2 & 0x3f) << 8) | b1),
          height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
        };
      }
      if (chunk === 'VP8 ' && buf.toString('hex', 23, 26) === '9d012a') {
        return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function uploadsRoot(): string {
  return resolve(process.cwd(), env.uploadDir);
}

function safeStoragePath(storageKey: string): string {
  if (/[\/\\]|\.\./.test(storageKey)) throw new UploadError('非法文件名');
  const root = uploadsRoot();
  const full = resolve(root, storageKey);
  if (full !== root && !full.startsWith(root + sep)) throw new UploadError('路径越界');
  return full;
}

type AssetRow = Awaited<ReturnType<typeof db.query.assets.findFirst>>;

export async function uploadAsset(file: File): Promise<AssetRow> {
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) throw new UploadError('空文件');
  if (buf.length > env.maxUploadSize) throw new UploadError('文件过大');

  const magic = detectMagic(buf);
  if (!magic) throw new UploadError('不支持的文件类型（仅允许 PNG/JPEG/WebP/GIF）');
  if (/svg|html|xml|javascript|script/i.test(file.type)) throw new UploadError('拒绝危险文件类型');

  const declaredExt = extname(file.name ?? '').toLowerCase();
  if (declaredExt && MIME_BY_EXT[declaredExt] && MIME_BY_EXT[declaredExt] !== magic) {
    throw new UploadError('扩展名与文件内容不符');
  }

  const ext = EXT_BY_MIME[magic];
  const contentHash = createHash('sha256').update(buf).digest('hex');
  const existing = await db.query.assets.findFirst({ where: eq(assets.contentHash, contentHash) });
  if (existing && existsSync(safeStoragePath(existing.storageKey))) return existing as AssetRow;

  const storageKey = randomId('u_') + ext;
  const url = `/uploads/${storageKey}`;
  const full = safeStoragePath(storageKey);
  mkdirSync(uploadsRoot(), { recursive: true });
  writeFileSync(full, buf);

  const dimensions = detectDimensions(buf, magic);
  const now = nowIso();
  const id = randomId('a_');
  db.insert(assets)
    .values({
      id,
      filename: file.name || storageKey,
      storageKey,
      url,
      mimeType: magic,
      size: buf.length,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      alt: null,
      contentHash,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return (await db.query.assets.findFirst({ where: eq(assets.id, id) })) as AssetRow;
}

export async function listAssets(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  const rows = await db.query.assets.findMany({
    orderBy: [desc(assets.createdAt)],
    limit: pageSize,
    offset,
  });
  const [{ total }] = await db.select({ total: count() }).from(assets);
  return { items: rows, total, page, pageSize };
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

  await db.delete(assets).where(eq(assets.id, id)).run();
  const full = safeStoragePath(result.asset.storageKey);
  if (existsSync(full)) {
    try {
      unlinkSync(full);
    } catch (error) {
      console.error(`[assets] 文件删除失败: ${full}`, error);
    }
  }
  return true;
}
