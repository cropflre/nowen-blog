import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { eq, desc, count } from 'drizzle-orm';
import { db } from '../../db/client';
import { assets } from '../../db/schema';
import { randomId, nowIso } from '../../lib/format';
import { env } from '../../config/env';

/** 上传相关业务错误，路由层捕获后返回 4xx。 */
export class UploadError extends Error {}

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

/**
 * 通过文件头 magic number 判定真实图片类型，防止 MIME / 扩展名伪装。
 * 仅放行 PNG / JPEG / WebP / GIF；SVG / HTML / JS 等会因 magic 不匹配而被拒。
 */
function detectMagic(buf: Buffer): AllowedMime | null {
  if (buf.length >= 8 && buf.toString('hex', 0, 8) === '89504e470d0a1a0a') return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 6 &&
    (buf.toString('ascii', 0, 6) === 'GIF89a' || buf.toString('ascii', 0, 6) === 'GIF87a')
  )
    return 'image/gif';
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'image/webp';
  return null;
}

function uploadsRoot(): string {
  return resolve(process.cwd(), env.uploadDir);
}

/** 安全拼接存储路径：禁止分隔符与 `..`，且结果必须仍在上传根目录内（防路径穿越）。 */
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
  // 显式拒绝 SVG / HTML / JS 等危险类型（magic 已排除，这里双重保险）
  if (/svg|html|xml|javascript|script/i.test(file.type)) throw new UploadError('拒绝危险文件类型');

  // 扩展名与内容一致性校验（若客户端提供了扩展名）
  const declaredExt = extname(file.name ?? '').toLowerCase();
  if (declaredExt && MIME_BY_EXT[declaredExt] && MIME_BY_EXT[declaredExt] !== magic) {
    throw new UploadError('扩展名与文件内容不符');
  }

  const ext = EXT_BY_MIME[magic];
  const contentHash = createHash('sha256').update(buf).digest('hex');

  // contentHash 去重：若已存在相同 contentHash 的资源，复用已有记录
  const existing = await db.query.assets.findFirst({ where: eq(assets.contentHash, contentHash) });
  if (existing) {
    // 验证已有文件的磁盘文件仍存在，若不存在则重新走上传逻辑（理论上不应发生）
    const existingPath = safeStoragePath(existing.storageKey);
    if (existsSync(existingPath)) {
      return existing as AssetRow;
    }
    // 文件丢失，继续上传流程（会覆盖此记录或创建新记录）
  }

  const storageKey = randomId('u_') + ext;
  const url = `/uploads/${storageKey}`;
  const full = safeStoragePath(storageKey);
  mkdirSync(uploadsRoot(), { recursive: true });
  writeFileSync(full, buf);

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
      width: null,
      height: null,
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
  // 不允许改 storageKey / url / mimeType / size
  await db.update(assets).set(patch).where(eq(assets.id, id)).run();
  return getAssetById(id);
}

export async function deleteAsset(id: string): Promise<boolean> {
  const existing = await getAssetById(id);
  if (!existing) return false;

  // 先删除数据库记录（权威数据源）
  await db.delete(assets).where(eq(assets.id, id)).run();

  // 再删除本地文件（失败仅记录日志，不回滚数据库）
  const full = safeStoragePath(existing.storageKey);
  if (existsSync(full)) {
    try {
      unlinkSync(full);
    } catch (err) {
      // 文件删除失败：数据库记录已删除，文件可后续手动清理
      console.error(`[assets] 文件删除失败: ${full}`, err);
    }
  }

  return true;
}
