import { Hono } from 'hono';
import { sqlite } from '../../db/client';
import { nowIso, randomId } from '../../lib/format';
import { feedbackSchema, parseJson } from './docs.schemas';
import {
  getDocumentById,
  getPublicPage,
  getSpaceBySlug,
  listDocuments,
  listVersions,
  orderDocumentsDepthFirst,
  resolveVersion,
  SPACE_SELECT,
  toSpace,
  toVersion,
} from './docs.service';
import type { DocSpaceRow } from './docs.types';

export const docsRoutes = new Hono();

docsRoutes.get('/spaces', (c) => {
  const rows = sqlite
    .prepare(`${SPACE_SELECT} WHERE s.is_published = 1 ORDER BY s.sort_order ASC, s.updated_at DESC`)
    .all() as DocSpaceRow[];
  return c.json({
    items: rows.map((row) => {
      const version = resolveVersion(row.id, 'latest', true);
      return { ...toSpace(row), defaultVersion: version ? toVersion(version) : null };
    }),
  });
});

docsRoutes.get('/search', (c) => {
  const q = (c.req.query('q') ?? '').trim();
  if (q.length < 2) return c.json({ items: [] });
  const spaceSlug = (c.req.query('space') ?? '').trim();
  const limitRaw = Number(c.req.query('limit') ?? 20);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.trunc(limitRaw))) : 20;
  const spaceParams: string[] = spaceSlug ? [spaceSlug] : [];
  const spaceFilter = spaceSlug ? ' AND s.slug = ?' : '';
  const mapResult = (rows: Array<Record<string, unknown>>) =>
    rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      path: String(row.path),
      description: row.description ? String(row.description) : null,
      spaceName: String(row.spaceName),
      spaceSlug: String(row.spaceSlug),
      version: String(row.version),
      versionLabel: String(row.versionLabel),
      updatedAt: String(row.updatedAt),
    }));

  try {
    const ftsQuery = q
      .split(/\s+/)
      .map((token) => token.replace(/["'*:()]/g, '').trim())
      .filter(Boolean)
      .map((token) => `"${token}"*`)
      .join(' ');
    if (ftsQuery) {
      const rows = sqlite
        .prepare(
          `SELECT d.id, d.title, d.path, d.description,
                  s.name AS spaceName, s.slug AS spaceSlug,
                  v.version, v.label AS versionLabel, d.updated_at AS updatedAt,
                  bm25(documents_fts, 8.0, 4.0, 1.0) AS rank
             FROM documents_fts
             JOIN documents d ON d.rowid = documents_fts.rowid
             JOIN doc_spaces s ON s.id = d.space_id
             JOIN doc_versions v ON v.id = d.version_id
            WHERE documents_fts MATCH ?
              AND d.status = 'published' AND d.visibility = 'public'
              AND s.is_published = 1 AND v.status = 'published'${spaceFilter}
            ORDER BY rank ASC, d.updated_at DESC
            LIMIT ?`,
        )
        .all(ftsQuery, ...spaceParams, limit) as Array<Record<string, unknown>>;
      if (rows.length > 0) return c.json({ items: mapResult(rows) });
    }
  } catch {
    // Unsupported FTS builds and malformed user queries fall back to LIKE.
  }

  const like = `%${q}%`;
  const rows = sqlite
    .prepare(
      `SELECT d.id, d.title, d.path, d.description,
              s.name AS spaceName, s.slug AS spaceSlug,
              v.version, v.label AS versionLabel, d.updated_at AS updatedAt
         FROM documents d
         JOIN doc_spaces s ON s.id = d.space_id
         JOIN doc_versions v ON v.id = d.version_id
        WHERE d.status = 'published' AND d.visibility = 'public'
          AND s.is_published = 1 AND v.status = 'published'
          AND (d.title LIKE ? OR d.description LIKE ? OR d.content_md LIKE ?)${spaceFilter}
        ORDER BY CASE WHEN d.title LIKE ? THEN 0 ELSE 1 END, d.updated_at DESC
        LIMIT ?`,
    )
    .all(like, like, like, ...spaceParams, like, limit) as Array<Record<string, unknown>>;
  return c.json({ items: mapResult(rows) });
});

docsRoutes.get('/spaces/:spaceSlug', (c) => {
  const space = getSpaceBySlug(c.req.param('spaceSlug'), true);
  if (!space) return c.json({ error: '文档空间不存在' }, 404);
  return c.json({ space: toSpace(space), versions: listVersions(space.id, true).map(toVersion) });
});

docsRoutes.get('/:spaceSlug/:version/tree', (c) => {
  const space = getSpaceBySlug(c.req.param('spaceSlug'), true);
  if (!space) return c.json({ error: '文档空间不存在' }, 404);
  const version = resolveVersion(space.id, c.req.param('version'), true);
  if (!version) return c.json({ error: '文档版本不存在' }, 404);
  return c.json({
    space: toSpace(space),
    version: toVersion(version),
    items: listDocuments(space.id, version.id, true),
  });
});

docsRoutes.get('/:spaceSlug/:version/page', (c) => {
  const space = getSpaceBySlug(c.req.param('spaceSlug'), true);
  if (!space) return c.json({ error: '文档空间不存在' }, 404);
  const version = resolveVersion(space.id, c.req.param('version'), true);
  if (!version) return c.json({ error: '文档版本不存在' }, 404);
  const page = getPublicPage(space.id, version.id, c.req.query('path') ?? '');
  if (!page) return c.json({ error: '文档不存在' }, 404);
  const ordered = orderDocumentsDepthFirst(listDocuments(space.id, version.id, true));
  const index = ordered.findIndex((item) => item.id === page.id);
  const previous = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  return c.json({
    space: toSpace(space),
    version: toVersion(version),
    page,
    previous: previous ? { id: previous.id, title: previous.title, path: previous.path } : null,
    next: next ? { id: next.id, title: next.title, path: next.path } : null,
  });
});

docsRoutes.post('/documents/:id/feedback', async (c) => {
  const page = getDocumentById(c.req.param('id'));
  if (!page || page.status !== 'published' || page.visibility !== 'public') {
    return c.json({ error: '文档不存在' }, 404);
  }
  const parsed = feedbackSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  sqlite
    .prepare(
      `INSERT INTO document_feedback (id, document_id, helpful, reason, comment, visitor_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomId('dfb_'),
      page.id,
      parsed.data.helpful ? 1 : 0,
      parsed.data.reason ?? null,
      parsed.data.comment ?? null,
      c.req.header('x-visitor-id') ?? null,
      nowIso(),
    );
  return c.json({ ok: true });
});
