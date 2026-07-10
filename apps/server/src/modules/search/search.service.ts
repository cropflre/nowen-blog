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
  items: (ReturnType<typeof toSummary> & {
    titleHighlight: string | null;
    snippet: string | null;
  })[];
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
    for (const row of items) stmt.run(row.id, row.title, row.summary ?? '', row.contentMd);
  });
  insertAll(rows);
  return rows.length;
}

export function ensureSearchIndex(): void {
  const { c } = sqlite.prepare('SELECT COUNT(*) AS c FROM posts_fts').get() as { c: number };
  const { bad } =
    c > 0
      ? (sqlite
          .prepare("SELECT COUNT(*) AS bad FROM posts_fts WHERE content_md IS NULL OR content_md = ''")
          .get() as { bad: number })
      : { bad: 0 };
  if (c === 0 || bad > 0) {
    const count = rebuildSearchIndex();
    console.log(`[search] 已从存量文章重建 FTS 索引（${count} 篇）`);
  }
}

function escapeFtsQuery(raw: string): string | null {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => /[\p{L}\p{N}]/u.test(token))
    .map((token) => `"${token.replace(/"/g, '""')}"`);
  return tokens.length ? tokens.join(' ') : null;
}

function queryTokens(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .trim()
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => /[\p{L}\p{N}]/u.test(token)),
    ),
  ).sort((a, b) => b.length - a.length);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 使用控制字符标记普通文本中的命中项，交给前端安全渲染。 */
function highlightPlainText(value: string, query: string): string {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return value;
  const expression = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'giu');
  return value.replace(expression, `${SNIPPET_START}$1${SNIPPET_END}`);
}

function plainSnippet(summary: string | null, markdown: string, query: string): string | null {
  const source = (summary || markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!source) return null;
  const lower = source.toLocaleLowerCase();
  const indexes = queryTokens(query)
    .map((token) => lower.indexOf(token.toLocaleLowerCase()))
    .filter((index) => index >= 0);
  const first = indexes.length ? Math.min(...indexes) : 0;
  const start = Math.max(0, first - 54);
  const end = Math.min(source.length, first + 126);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < source.length ? '…' : '';
  return `${prefix}${highlightPlainText(source.slice(start, end), query)}${suffix}`;
}

/** LIKE 兜底搜索，兼容中文子串，并生成与 FTS 相同格式的安全高亮。 */
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
    items: (rows as unknown as PostRow[]).map((row) => ({
      ...toSummary(row),
      titleHighlight: highlightPlainText(row.title, q),
      snippet: plainSnippet(row.summary ?? null, row.contentMd, q),
    })),
    total,
    page,
    pageSize,
  };
}

/** 全文搜索。只返回已发布且公开文章，支持相关度排序、高亮和分页。 */
export async function searchPosts(
  q: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<SearchResultData> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 12));
  const term = q.trim();
  if (!term) return { items: [], total: 0, page, pageSize };

  const ftsQuery = escapeFtsQuery(term);
  if (!ftsQuery) return { items: [], total: 0, page, pageSize };

  try {
    const offset = (page - 1) * pageSize;
    const selectStmt = sqlite.prepare(`
      SELECT p.id,
             highlight(posts_fts, 1, '${SNIPPET_START}', '${SNIPPET_END}') AS titleHighlight,
             snippet(posts_fts, 3, '${SNIPPET_START}', '${SNIPPET_END}', '…', 28) AS snippet,
             bm25(posts_fts, 0.0, 8.0, 3.0, 1.0) AS rank
      FROM posts_fts
      JOIN posts p ON p.id = posts_fts.id
      WHERE posts_fts MATCH ?
        AND p.status = 'published'
        AND p.visibility = 'public'
      ORDER BY rank, COALESCE(p.published_at, '') DESC
      LIMIT ? OFFSET ?
    `);
    const rows = selectStmt.all(ftsQuery, pageSize, offset) as Array<{
      id: string;
      titleHighlight: string;
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

    if (rows.length === 0 && /[㐀-鿿]/u.test(term)) {
      return searchPostsLike(term, page, pageSize);
    }
    if (rows.length === 0) return { items: [], total: c, page, pageSize };

    const ids = rows.map((row) => row.id);
    const fullRows = await db.query.posts.findMany({
      where: inArray(posts.id, ids),
      with: POST_RELATIONS,
    });
    const metaById = new Map(rows.map((row) => [row.id, row]));
    const orderById = new Map(rows.map((row, index) => [row.id, index]));
    const items = (fullRows as unknown as PostRow[])
      .map(toSummary)
      .sort((a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0))
      .map((summary) => ({
        ...summary,
        titleHighlight: metaById.get(summary.id)?.titleHighlight ?? summary.title,
        snippet: metaById.get(summary.id)?.snippet ?? null,
      }));

    return { items, total: c, page, pageSize };
  } catch (error) {
    console.warn('[search] FTS 查询失败，回退 LIKE。原因:', error);
    try {
      return await searchPostsLike(term, page, pageSize);
    } catch (fallbackError) {
      console.error('[search] LIKE 兜底也失败:', fallbackError);
      return { items: [], total: 0, page, pageSize };
    }
  }
}
