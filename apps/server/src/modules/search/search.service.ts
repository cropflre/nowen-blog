import { and, count, desc, eq, inArray, like, or } from 'drizzle-orm';
import { db, sqlite } from '../../db/client';
import { posts } from '../../db/schema';
import { toSummary, type PostRow } from '../../lib/mapping';

// FTS 片段高亮标记使用控制字符，避免与正文内容冲突，也避免 HTML 注入风险。
const SNIPPET_START = String.fromCharCode(1);
const SNIPPET_END = String.fromCharCode(2);

const POST_RELATIONS = {
  author: true,
  categoryLinks: { with: { category: true } },
  tagLinks: { with: { tag: true } },
} as const;

export interface FtsPostInput {
  id: string;
  title: string;
  summary: string | null;
  contentMd: string;
}

export interface SearchResultData {
  items: (ReturnType<typeof toSummary> & { snippet: string | null })[];
  total: number;
  page: number;
  pageSize: number;
}

/** 将文章写入 FTS 索引（覆盖式：先删后插，确保标题/正文变更同步）。 */
export function indexPost(post: FtsPostInput): void {
  removePostFromIndex(post.id);
  sqlite
    .prepare('INSERT INTO posts_fts (id, title, summary, content_md) VALUES (?, ?, ?, ?)')
    .run(post.id, post.title, post.summary ?? '', post.contentMd);
}

/** 从 FTS 索引移除文章（删除/取消发布时调用）。 */
export function removePostFromIndex(id: string): void {
  sqlite.prepare('DELETE FROM posts_fts WHERE id = ?').run(id);
}

/** 清空并从已发布、公开的存量文章重建索引。返回重建条数。 */
export function rebuildSearchIndex(): number {
  sqlite.exec('DELETE FROM posts_fts');
  const rows = sqlite
    .prepare(
      `SELECT id, title, summary, content_md FROM posts WHERE status = 'published' AND visibility = 'public'`,
    )
    .all() as FtsPostInput[];
  const stmt = sqlite.prepare(
    'INSERT INTO posts_fts (id, title, summary, content_md) VALUES (?, ?, ?, ?)',
  );
  const insertAll = sqlite.transaction((items: FtsPostInput[]) => {
    for (const r of items) stmt.run(r.id, r.title, r.summary ?? '', r.contentMd);
  });
  insertAll(rows);
  return rows.length;
}

/**
 * 启动兜底：确保 FTS 索引可用。
 * - 索引为空时自动重建（避免存量数据搜索不到）；
 * - 若索引中存在 content_md 为空的损坏行（如早期半写代码重启所致），也自动重建。
 */
export function ensureSearchIndex(): void {
  const { c } = sqlite.prepare('SELECT COUNT(*) AS c FROM posts_fts').get() as { c: number };
  const { bad } =
    c > 0
      ? (sqlite
          .prepare("SELECT COUNT(*) AS bad FROM posts_fts WHERE content_md IS NULL OR content_md = ''")
          .get() as { bad: number })
      : { bad: 0 };
  if (c === 0 || bad > 0) {
    const n = rebuildSearchIndex();
    console.log(`[search] 已从存量文章重建 FTS 索引（${n} 篇）`);
  }
}

/**
 * 转义用户输入，避免 FTS5 MATCH 语法报错。
 * - 按空白拆分为多个词，每个词作为短语（双引号包裹）处理；
 * - 多个词以 AND 连接；
 * - 无有效词（纯标点等）返回 null，调用方应返回空结果，避免全表扫描。
 * 注：unicode61 将连续汉字视为一个整词，中文子串难以命中，中文兼容由 searchPosts 另行处理。
 */
function escapeFtsQuery(raw: string): string | null {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => /[\p{L}\p{N}]/u.test(t))
    .map((t) => `"${t.replace(/"/g, '""')}"`);
  return tokens.length ? tokens.join(' ') : null;
}

/** LIKE 兜底搜索（FTS 查询异常或中文零命中时使用）。参数化，无 SQL 拼接。 */
async function searchPostsLike(
  q: string,
  page: number,
  pageSize: number,
): Promise<SearchResultData> {
  const term = `%${q}%`;
  const where = and(
    eq(posts.status, 'published'),
    eq(posts.visibility, 'public'),
    or(like(posts.title, term), like(posts.summary, term), like(posts.contentMd, term)),
  );
  const rows = await db.query.posts.findMany({
    where,
    orderBy: [desc(posts.publishedAt)],
    with: POST_RELATIONS,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const [{ total }] = await db.select({ total: count() }).from(posts).where(where);
  return {
    items: (rows as unknown as PostRow[])
      .map(toSummary)
      .map((s) => ({ ...s, snippet: null })),
    total,
    page,
    pageSize,
  };
}

/**
 * 全文搜索。只返回 status=published 且 visibility=public 的文章。
 * - q 为空直接返回空结果，避免全表扫描；
 * - FTS 查询异常时回退到 LIKE，并记录原因；
 * - FTS 零命中且含中文时，回退到 LIKE 兼容搜索（unicode61 中文分词有限的基础兼容方案）。
 */
export async function searchPosts(
  q: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<SearchResultData> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
  const term = q.trim();

  // q 为空直接返回空结果，避免全表扫描
  if (!term) return { items: [], total: 0, page, pageSize };

  const ftsQuery = escapeFtsQuery(term);
  if (!ftsQuery) return { items: [], total: 0, page, pageSize };

  try {
    const offset = (page - 1) * pageSize;
    // 注意：snippet 的 start/end/ellipsis 参数必须是字符串字面量，不能用绑定参数。
    const selectStmt = sqlite.prepare(`
      SELECT p.id, p.slug, p.title, p.summary, p.published_at,
             snippet(posts_fts, 3, '${SNIPPET_START}', '${SNIPPET_END}', '…', 24) AS snippet,
             bm25(posts_fts) AS rank
      FROM posts_fts
      JOIN posts p ON p.id = posts_fts.id
      WHERE posts_fts MATCH ?
        AND p.status = 'published'
        AND p.visibility = 'public'
      ORDER BY rank
      LIMIT ? OFFSET ?
    `);
    const rows = selectStmt.all(ftsQuery, pageSize, offset) as Array<{
      id: string;
      slug: string;
      title: string;
      summary: string | null;
      published_at: string | null;
      snippet: string;
      rank: number;
    }>;

    const countStmt = sqlite.prepare(`
      SELECT COUNT(*) AS c
      FROM posts_fts
      JOIN posts p ON p.id = posts_fts.id
      WHERE posts_fts MATCH ? AND p.status = 'published' AND p.visibility = 'public'
    `);
    const { c } = countStmt.get(ftsQuery) as { c: number };

    if (rows.length === 0) {
      // 中文兼容：unicode61 把连续中文视为整词，子串无法命中。
      // FTS 零命中且含中文时，回退到参数化 LIKE 搜索。
      if (/[㐀-鿿]/u.test(term)) {
        console.log('[search] FTS 对中文无命中，使用 LIKE 兼容搜索:', term);
        return await searchPostsLike(term, page, pageSize);
      }
      return { items: [], total: c, page, pageSize };
    }

    // 按 FTS 相关度排序，回查完整文章（含标签/分类/作者）
    const ids = rows.map((r) => r.id);
    const fullRows = await db.query.posts.findMany({
      where: inArray(posts.id, ids),
      with: POST_RELATIONS,
    });
    const snippetById = new Map(rows.map((r) => [r.id, r.snippet]));
    const orderById = new Map(rows.map((r, i) => [r.id, i]));
    const items = (fullRows as unknown as PostRow[])
      .map(toSummary)
      .sort((a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0))
      .map((s) => ({ ...s, snippet: snippetById.get(s.id) ?? null }));

    return { items, total: c, page, pageSize };
  } catch (err) {
    console.warn('[search] FTS 查询失败，回退 LIKE。原因:', err);
    try {
      return await searchPostsLike(term, page, pageSize);
    } catch (fallbackErr) {
      console.error('[search] LIKE 兜底也失败:', fallbackErr);
      return { items: [], total: 0, page, pageSize };
    }
  }
}
