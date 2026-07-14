import { Hono } from 'hono';
import { sqlite } from '../../db/client';
import {
  getPublicHelpCenter,
  getPublicHelpCenterPage,
  listHelpCenterDocuments,
  listHelpCenters,
  orderedHelpCenterDocuments,
} from './help-centers.service';
import { toSpace, toVersion } from './docs.service';

export const helpCentersRoutes = new Hono();

helpCentersRoutes.get('/', (c) => c.json({ items: listHelpCenters(true) }));

helpCentersRoutes.get('/search', (c) => {
  const q = (c.req.query('q') ?? '').trim();
  if (q.length < 2) return c.json({ items: [] });
  const spaceSlug = (c.req.query('space') ?? '').trim();
  const limitRaw = Number(c.req.query('limit') ?? 20);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.trunc(limitRaw))) : 20;
  const spaceFilter = spaceSlug ? ' AND s.slug = ?' : '';
  const spaceParams = spaceSlug ? [spaceSlug] : [];
  const mapRows = (rows: Array<Record<string, unknown>>) =>
    rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      path: String(row.path),
      description: row.description ? String(row.description) : null,
      spaceName: String(row.spaceName),
      spaceSlug: String(row.spaceSlug),
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
                  d.updated_at AS updatedAt,
                  bm25(documents_fts, 8.0, 4.0, 1.0) AS rank
             FROM documents_fts
             JOIN documents d ON d.rowid = documents_fts.rowid
             JOIN doc_spaces s ON s.id = d.space_id
             JOIN doc_versions v ON v.id = d.version_id
            WHERE documents_fts MATCH ?
              AND d.status = 'published' AND d.visibility = 'public'
              AND s.is_published = 1 AND v.status = 'published'
              AND v.id = COALESCE(s.default_version_id, v.id)${spaceFilter}
            ORDER BY rank ASC, d.updated_at DESC
            LIMIT ?`,
        )
        .all(ftsQuery, ...spaceParams, limit) as Array<Record<string, unknown>>;
      if (rows.length) return c.json({ items: mapRows(rows) });
    }
  } catch {
    // FTS 不可用或关键词格式异常时降级为 LIKE。
  }

  const like = `%${q}%`;
  const rows = sqlite
    .prepare(
      `SELECT d.id, d.title, d.path, d.description,
              s.name AS spaceName, s.slug AS spaceSlug,
              d.updated_at AS updatedAt
         FROM documents d
         JOIN doc_spaces s ON s.id = d.space_id
         JOIN doc_versions v ON v.id = d.version_id
        WHERE d.status = 'published' AND d.visibility = 'public'
          AND s.is_published = 1 AND v.status = 'published'
          AND v.id = COALESCE(s.default_version_id, v.id)
          AND (d.title LIKE ? OR d.description LIKE ? OR d.content_md LIKE ?)${spaceFilter}
        ORDER BY CASE WHEN d.title LIKE ? THEN 0 ELSE 1 END, d.updated_at DESC
        LIMIT ?`,
    )
    .all(like, like, like, ...spaceParams, like, limit) as Array<Record<string, unknown>>;
  return c.json({ items: mapRows(rows) });
});

helpCentersRoutes.get('/:spaceSlug', (c) => {
  const resolved = getPublicHelpCenter(c.req.param('spaceSlug'));
  if (!resolved) return c.json({ error: '帮助中心不存在' }, 404);
  return c.json({
    helpCenter: toSpace(resolved.space),
    internalVersion: toVersion(resolved.version),
  });
});

helpCentersRoutes.get('/:spaceSlug/tree', (c) => {
  const resolved = getPublicHelpCenter(c.req.param('spaceSlug'));
  if (!resolved) return c.json({ error: '帮助中心不存在' }, 404);
  return c.json({
    helpCenter: toSpace(resolved.space),
    items: listHelpCenterDocuments(resolved.space.id, resolved.version.id, true),
  });
});

helpCentersRoutes.get('/:spaceSlug/page', (c) => {
  const resolved = getPublicHelpCenter(c.req.param('spaceSlug'));
  if (!resolved) return c.json({ error: '帮助中心不存在' }, 404);
  const page = getPublicHelpCenterPage(
    resolved.space.id,
    resolved.version.id,
    c.req.query('path') ?? '',
  );
  if (!page) return c.json({ error: '帮助文档不存在' }, 404);
  const ordered = orderedHelpCenterDocuments(resolved.space.id, resolved.version.id, true);
  const index = ordered.findIndex((item) => item.id === page.id);
  const previous = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  return c.json({
    helpCenter: toSpace(resolved.space),
    page,
    previous: previous ? { id: previous.id, title: previous.title, path: previous.path } : null,
    next: next ? { id: next.id, title: next.title, path: next.path } : null,
  });
});
