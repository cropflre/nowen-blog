import { and, count, desc, eq, like, or, sql } from 'drizzle-orm';
import type { PostSummary } from '@blog/shared';
import { db } from '../../db/client';
import { posts } from '../../db/schema';
import { toSummary, type PostRow } from '../../lib/mapping';

export interface SearchHit extends PostSummary {
  snippet: string | null;
}

export interface SearchResult {
  query: string;
  items: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
  /** 实际命中的搜索引擎：fts = SQLite FTS5，like = SQL LIKE 兼容回退 */
  source: 'fts' | 'like';
}

const POST_WITH = {
  author: true,
  categoryLinks: { with: { category: true } },
  tagLinks: { with: { tag: true } },
} as const;

/**
 * 把用户输入安全地转成 FTS5 MATCH 表达式：
 * 按空白分词，逐词加双引号并转义内部引号，避免 FTS query syntax 报错。
 */
function buildFtsMatch(q: string): string {
  const tokens = q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '""')}"`);
  return tokens.join(' ');
}

async function fetchPostRow(id: string): Promise<PostRow | null> {
  const row = await db.query.posts.findFirst({ where: eq(posts.id, id), with: POST_WITH });
  return (row as unknown as PostRow) ?? null;
}

interface FtsRow {
  post_id: string;
  snippet: string | null;
}

async function ftsSearch(
  term: string,
  offset: number,
  limit: number,
): Promise<{ rows: FtsRow[]; total: number } | null> {
  const match = buildFtsMatch(term);
  if (!match) return null;
  const rows = (await db.all(sql`
    SELECT posts_fts.post_id AS post_id,
           snippet(posts_fts, 2, '<mark>', '</mark>', '…', 12) AS snippet
    FROM posts_fts
    JOIN posts ON posts.id = posts_fts.post_id
    WHERE posts_fts MATCH ${match}
      AND posts.status = 'published'
      AND posts.visibility = 'public'
    ORDER BY rank
    LIMIT ${limit} OFFSET ${offset}
  `)) as FtsRow[];
  const totalRow = (await db.all(sql`
    SELECT count(*) AS c
    FROM posts_fts
    JOIN posts ON posts.id = posts_fts.post_id
    WHERE posts_fts MATCH ${match}
      AND posts.status = 'published'
      AND posts.visibility = 'public'
  `)) as { c: number }[];
  return { rows, total: Number(totalRow[0]?.c ?? 0) };
}

async function likeSearch(term: string, offset: number, limit: number) {
  const likeTerm = `%${term}%`;
  const where = and(
    eq(posts.status, 'published'),
    eq(posts.visibility, 'public'),
    or(like(posts.title, likeTerm), like(posts.summary, likeTerm), like(posts.contentMd, likeTerm)),
  );
  const ids = (
    await db
      .select({ id: posts.id })
      .from(posts)
      .where(where)
      .orderBy(desc(posts.publishedAt))
      .limit(limit)
      .offset(offset)
  ).map((r) => r.id);
  const totalRow = await db.select({ c: count() }).from(posts).where(where);
  return { ids, total: Number(totalRow[0]?.c ?? 0) };
}

export async function searchPosts(
  q: string,
  page = 1,
  pageSize = 10,
): Promise<SearchResult> {
  const term = q.trim();
  const safePage = Math.max(1, page);
  const safeSize = Math.min(50, Math.max(1, pageSize));
  const offset = (safePage - 1) * safeSize;
  const base = { query: term, page: safePage, pageSize: safeSize };

  // q 为空：不扫描，直接返回空结果（验收标准 9）
  if (!term) {
    return { ...base, items: [], total: 0, source: 'fts' };
  }

  // 1) 优先使用 SQLite FTS5
  try {
    const fts = await ftsSearch(term, offset, safeSize);
    if (fts && fts.rows.length > 0) {
      const items = (
        await Promise.all(
          fts.rows.map(async (r) => {
            const row = await fetchPostRow(r.post_id);
            return row ? ({ ...toSummary(row), snippet: r.snippet } as SearchHit) : null;
          }),
        )
      ).filter(Boolean) as SearchHit[];
      return { ...base, items, total: fts.total, source: 'fts' };
    }
    console.warn(`[search] FTS 无命中，回退到 LIKE："${term}"`);
  } catch (e) {
    // FTS 查询语法异常时记录原因并回退
    console.warn(`[search] FTS 查询失败，回退到 LIKE："${term}"`, e);
  }

  // 2) LIKE 兼容回退（覆盖中文 / FTS 语法异常场景，验收标准 10）
  try {
    const like = await likeSearch(term, offset, safeSize);
    const items = (
      await Promise.all(
        like.ids.map(async (id) => {
          const row = await fetchPostRow(id);
          return row ? ({ ...toSummary(row), snippet: null } as SearchHit) : null;
        }),
      )
    ).filter(Boolean) as SearchHit[];
    return { ...base, items, total: like.total, source: 'like' };
  } catch (e) {
    console.error('[search] LIKE 回退也失败：', e);
    return { ...base, items: [], total: 0, source: 'like' };
  }
}

/* ----------------------------- 搜索索引联动 ----------------------------- */

interface PostFtsData {
  id: string;
  title: string;
  summary: string | null;
  contentMd: string;
  status: string;
}

function getPostFtsData(id: string): PostFtsData | null {
  const row = db
    .select({ id: posts.id, title: posts.title, summary: posts.summary, contentMd: posts.contentMd, status: posts.status })
    .from(posts)
    .where(eq(posts.id, id))
    .get() as PostFtsData | undefined;
  return row ?? null;
}

/** 将已发布文章写入 FTS 索引（仅 published 才入索引）。 */
export function indexPost(id: string): void {
  const row = getPostFtsData(id);
  if (!row || row.status !== 'published') return;
  db.run(
    sql`INSERT INTO posts_fts(title, summary, content_md, post_id) VALUES (${row.title}, ${row.summary}, ${row.contentMd}, ${row.id})`,
  );
}

/** 按文章 id 从 FTS 索引移除。 */
export function removePostFromIndex(id: string): void {
  try {
    db.run(sql`DELETE FROM posts_fts WHERE post_id = ${id}`);
  } catch (e) {
    console.warn(`[search] removePostFromIndex 失败 id=${id}：`, e);
  }
}

/** 同步单篇文章的索引：删除旧条目后，若已发布则重新写入。 */
export function syncPostIndex(id: string): void {
  removePostFromIndex(id);
  const row = getPostFtsData(id);
  if (row && row.status === 'published') indexPost(id);
}

/** 全量重建索引：清空后从已发布且公开的 posts 重新写入。 */
export function rebuildSearchIndex(): void {
  db.run(sql`DELETE FROM posts_fts`);
  db.run(sql`
    INSERT INTO posts_fts(title, summary, content_md, post_id)
    SELECT title, summary, content_md, id
    FROM posts
    WHERE status = 'published' AND visibility = 'public'
  `);
}

/** 启动兜底：若索引为空则自动重建（首次启动 / 升级场景）。 */
export function ensureSearchIndex(): void {
  const rows = db.all(sql`SELECT count(*) AS c FROM posts_fts`) as { c: number }[];
  if (Number(rows[0]?.c ?? 0) === 0) {
    console.log('🔎 搜索索引为空，正在从已发布文章重建 FTS 索引…');
    rebuildSearchIndex();
  }
}
