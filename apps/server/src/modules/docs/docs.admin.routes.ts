import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import { sqlite } from '../../db/client';
import { nowIso, randomId } from '../../lib/format';
import {
  documentCreateSchema,
  documentUpdateSchema,
  githubSyncSchema,
  parseJson,
  spaceCreateSchema,
  spaceUpdateSchema,
  versionCreateSchema,
  versionUpdateSchema,
} from './docs.schemas';
import {
  createRedirect,
  DOCUMENT_SELECT,
  getDocumentById,
  getSpaceById,
  getVersionById,
  listDocuments,
  listVersions,
  moveDescendants,
  normalizeSlug,
  saveRevision,
  SPACE_SELECT,
  toSpace,
  toVersion,
  uniqueDocumentPath,
  uniqueSpaceSlug,
  wouldCreateDocumentCycle,
} from './docs.service';
import { syncGitHubSpaceById } from './docs-sync.service';
import type { DocSpaceRow, DocumentRow } from './docs.types';

export const adminDocsRoutes = new Hono<{ Variables: { userId: string } }>();
adminDocsRoutes.use('*', authMiddleware);

adminDocsRoutes.get('/spaces', (c) => {
  const rows = sqlite.prepare(`${SPACE_SELECT} ORDER BY s.sort_order ASC, s.updated_at DESC`).all() as DocSpaceRow[];
  return c.json({
    items: rows.map((row) => ({ ...toSpace(row), versions: listVersions(row.id).map(toVersion) })),
  });
});

adminDocsRoutes.post('/spaces/:id/sync', async (c) => {
  const parsed = githubSyncSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  try {
    return c.json(await syncGitHubSpaceById(c.req.param('id'), parsed.data));
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'GitHub 文档同步失败' }, 400);
  }
});

adminDocsRoutes.post('/spaces', async (c) => {
  const parsed = spaceCreateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  const id = randomId('dsp_');
  const versionId = randomId('dver_');
  const now = nowIso();
  const slug = uniqueSpaceSlug(parsed.data.slug || parsed.data.name);
  const transaction = sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT INTO doc_spaces (
          id, project_id, name, slug, description, icon_url, default_version_id,
          repository_full_name, source_mode, docs_root, is_published, sort_order,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        parsed.data.projectId ?? null,
        parsed.data.name,
        slug,
        parsed.data.description ?? null,
        parsed.data.iconUrl ?? null,
        versionId,
        parsed.data.repositoryFullName ?? null,
        parsed.data.sourceMode,
        parsed.data.docsRoot,
        parsed.data.isPublished ? 1 : 0,
        parsed.data.sortOrder,
        now,
        now,
      );
    sqlite
      .prepare(
        `INSERT INTO doc_versions (
          id, space_id, version, label, source_ref, status, is_default,
          is_deprecated, sort_order, created_at, updated_at
        ) VALUES (?, ?, 'latest', 'Latest', NULL, 'published', 1, 0, 0, ?, ?)`,
      )
      .run(versionId, id, now, now);
  });
  transaction();
  const space = getSpaceById(id)!;
  return c.json({ ...toSpace(space), versions: listVersions(id).map(toVersion) }, 201);
});

adminDocsRoutes.patch('/spaces/:id', async (c) => {
  const current = getSpaceById(c.req.param('id'));
  if (!current) return c.json({ error: '文档空间不存在' }, 404);
  const parsed = spaceUpdateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  const next = {
    projectId: parsed.data.projectId === undefined ? current.projectId : parsed.data.projectId,
    name: parsed.data.name ?? current.name,
    slug:
      parsed.data.slug === undefined
        ? current.slug
        : uniqueSpaceSlug(parsed.data.slug || parsed.data.name || current.name, current.id),
    description: parsed.data.description === undefined ? current.description : parsed.data.description,
    iconUrl: parsed.data.iconUrl === undefined ? current.iconUrl : parsed.data.iconUrl,
    repositoryFullName:
      parsed.data.repositoryFullName === undefined ? current.repositoryFullName : parsed.data.repositoryFullName,
    sourceMode: parsed.data.sourceMode ?? current.sourceMode,
    docsRoot: parsed.data.docsRoot ?? current.docsRoot,
    isPublished: parsed.data.isPublished ?? Boolean(current.isPublished),
    sortOrder: parsed.data.sortOrder ?? current.sortOrder,
  };
  sqlite
    .prepare(
      `UPDATE doc_spaces SET
        project_id = ?, name = ?, slug = ?, description = ?, icon_url = ?,
        repository_full_name = ?, source_mode = ?, docs_root = ?,
        is_published = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      next.projectId,
      next.name,
      next.slug,
      next.description,
      next.iconUrl,
      next.repositoryFullName,
      next.sourceMode,
      next.docsRoot,
      next.isPublished ? 1 : 0,
      next.sortOrder,
      nowIso(),
      current.id,
    );
  const space = getSpaceById(current.id)!;
  return c.json({ ...toSpace(space), versions: listVersions(current.id).map(toVersion) });
});

adminDocsRoutes.delete('/spaces/:id', (c) => {
  const result = sqlite.prepare('DELETE FROM doc_spaces WHERE id = ?').run(c.req.param('id'));
  if (result.changes === 0) return c.json({ error: '文档空间不存在' }, 404);
  return c.json({ ok: true });
});

adminDocsRoutes.get('/spaces/:spaceId/versions', (c) => {
  const space = getSpaceById(c.req.param('spaceId'));
  if (!space) return c.json({ error: '文档空间不存在' }, 404);
  return c.json({ items: listVersions(space.id).map(toVersion) });
});

adminDocsRoutes.post('/spaces/:spaceId/versions', async (c) => {
  const space = getSpaceById(c.req.param('spaceId'));
  if (!space) return c.json({ error: '文档空间不存在' }, 404);
  const parsed = versionCreateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  const duplicate = sqlite
    .prepare('SELECT 1 FROM doc_versions WHERE space_id = ? AND version = ? LIMIT 1')
    .get(space.id, parsed.data.version);
  if (duplicate) return c.json({ error: '该版本标识已存在' }, 409);
  const id = randomId('dver_');
  const now = nowIso();
  const transaction = sqlite.transaction(() => {
    if (parsed.data.isDefault) {
      sqlite.prepare('UPDATE doc_versions SET is_default = 0, updated_at = ? WHERE space_id = ?').run(now, space.id);
    }
    sqlite
      .prepare(
        `INSERT INTO doc_versions (
          id, space_id, version, label, source_ref, status, is_default,
          is_deprecated, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        space.id,
        parsed.data.version,
        parsed.data.label,
        parsed.data.sourceRef ?? null,
        parsed.data.status,
        parsed.data.isDefault ? 1 : 0,
        parsed.data.isDeprecated ? 1 : 0,
        parsed.data.sortOrder,
        now,
        now,
      );
    if (parsed.data.isDefault) {
      sqlite.prepare('UPDATE doc_spaces SET default_version_id = ?, updated_at = ? WHERE id = ?').run(id, now, space.id);
    }
  });
  transaction();
  return c.json(toVersion(getVersionById(id)!), 201);
});

adminDocsRoutes.patch('/versions/:id', async (c) => {
  const current = getVersionById(c.req.param('id'));
  if (!current) return c.json({ error: '文档版本不存在' }, 404);
  const parsed = versionUpdateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  const next = {
    version: parsed.data.version ?? current.version,
    label: parsed.data.label ?? current.label,
    sourceRef: parsed.data.sourceRef === undefined ? current.sourceRef : parsed.data.sourceRef,
    status: parsed.data.status ?? current.status,
    isDefault: parsed.data.isDefault ?? Boolean(current.isDefault),
    isDeprecated: parsed.data.isDeprecated ?? Boolean(current.isDeprecated),
    sortOrder: parsed.data.sortOrder ?? current.sortOrder,
  };
  const transaction = sqlite.transaction(() => {
    if (next.isDefault) {
      sqlite
        .prepare('UPDATE doc_versions SET is_default = 0, updated_at = ? WHERE space_id = ? AND id != ?')
        .run(nowIso(), current.spaceId, current.id);
    }
    sqlite
      .prepare(
        `UPDATE doc_versions SET
          version = ?, label = ?, source_ref = ?, status = ?, is_default = ?,
          is_deprecated = ?, sort_order = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        next.version,
        next.label,
        next.sourceRef,
        next.status,
        next.isDefault ? 1 : 0,
        next.isDeprecated ? 1 : 0,
        next.sortOrder,
        nowIso(),
        current.id,
      );
    if (next.isDefault) {
      sqlite
        .prepare('UPDATE doc_spaces SET default_version_id = ?, updated_at = ? WHERE id = ?')
        .run(current.id, nowIso(), current.spaceId);
    }
  });
  try {
    transaction();
  } catch {
    return c.json({ error: '该版本标识已存在' }, 409);
  }
  return c.json(toVersion(getVersionById(current.id)!));
});

adminDocsRoutes.get('/documents', (c) => {
  const spaceId = (c.req.query('spaceId') ?? '').trim();
  const versionId = (c.req.query('versionId') ?? '').trim();
  if (!spaceId || !versionId) return c.json({ error: '缺少 spaceId 或 versionId' }, 400);
  return c.json({ items: listDocuments(spaceId, versionId) });
});

adminDocsRoutes.post('/documents', async (c) => {
  const parsed = documentCreateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  const space = getSpaceById(parsed.data.spaceId);
  const version = getVersionById(parsed.data.versionId);
  if (!space || !version || version.spaceId !== space.id) return c.json({ error: '文档空间或版本不存在' }, 404);
  const parent = parsed.data.parentId ? getDocumentById(parsed.data.parentId) : null;
  if (parsed.data.parentId && (!parent || parent.versionId !== version.id)) {
    return c.json({ error: '父级文档不存在或不属于当前版本' }, 400);
  }
  const slug = normalizeSlug(parsed.data.slug || parsed.data.title, parsed.data.title);
  const candidatePath = parsed.data.path || (parent ? `${parent.path}/${slug}` : slug);
  const path = uniqueDocumentPath(version.id, candidatePath);
  const id = randomId('doc_');
  const now = nowIso();
  sqlite
    .prepare(
      `INSERT INTO documents (
        id, space_id, version_id, parent_id, title, slug, path, description,
        content_md, status, visibility, sort_order, depth, source_type,
        source_path, source_sha, edit_url, seo_title, seo_description,
        published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cms', NULL, NULL, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      space.id,
      version.id,
      parent?.id ?? null,
      parsed.data.title,
      slug,
      path,
      parsed.data.description ?? null,
      parsed.data.contentMd,
      parsed.data.status,
      parsed.data.visibility,
      parsed.data.sortOrder,
      parent ? parent.depth + 1 : 0,
      parsed.data.editUrl ?? null,
      parsed.data.seoTitle ?? null,
      parsed.data.seoDescription ?? null,
      parsed.data.status === 'published' ? now : null,
      now,
      now,
    );
  return c.json(getDocumentById(id)!, 201);
});

adminDocsRoutes.patch('/documents/:id', async (c) => {
  const current = getDocumentById(c.req.param('id'));
  if (!current) return c.json({ error: '文档不存在' }, 404);
  const parsed = documentUpdateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  const parentId = parsed.data.parentId === undefined ? current.parentId : parsed.data.parentId;
  if (wouldCreateDocumentCycle(current.id, parentId)) {
    return c.json({ error: '不能把文档移动到自己的子级目录中' }, 400);
  }
  const parent = parentId ? getDocumentById(parentId) : null;
  if (parentId && (!parent || parent.versionId !== current.versionId)) {
    return c.json({ error: '父级文档不存在或不属于当前版本' }, 400);
  }
  const title = parsed.data.title ?? current.title;
  const slug = normalizeSlug(parsed.data.slug || current.slug || title, title);
  const candidatePath =
    parsed.data.path !== undefined
      ? parsed.data.path
      : parentId !== current.parentId
        ? parent
          ? `${parent.path}/${slug}`
          : slug
        : current.path;
  const path = uniqueDocumentPath(current.versionId, candidatePath, current.id);
  const depth = parent ? parent.depth + 1 : 0;
  const next = {
    parentId,
    title,
    slug,
    path,
    description: parsed.data.description === undefined ? current.description : parsed.data.description,
    contentMd: parsed.data.contentMd ?? current.contentMd,
    status: parsed.data.status ?? current.status,
    visibility: parsed.data.visibility ?? current.visibility,
    sortOrder: parsed.data.sortOrder ?? current.sortOrder,
    depth,
    editUrl: parsed.data.editUrl === undefined ? current.editUrl : parsed.data.editUrl,
    seoTitle: parsed.data.seoTitle === undefined ? current.seoTitle : parsed.data.seoTitle,
    seoDescription: parsed.data.seoDescription === undefined ? current.seoDescription : parsed.data.seoDescription,
  };
  const transaction = sqlite.transaction(() => {
    saveRevision(current, c.get('userId'));
    sqlite
      .prepare(
        `UPDATE documents SET
          parent_id = ?, title = ?, slug = ?, path = ?, description = ?, content_md = ?,
          status = ?, visibility = ?, sort_order = ?, depth = ?, edit_url = ?,
          seo_title = ?, seo_description = ?, published_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        next.parentId,
        next.title,
        next.slug,
        next.path,
        next.description,
        next.contentMd,
        next.status,
        next.visibility,
        next.sortOrder,
        next.depth,
        next.editUrl,
        next.seoTitle,
        next.seoDescription,
        next.status === 'published' ? current.publishedAt ?? nowIso() : null,
        nowIso(),
        current.id,
      );
    if (path !== current.path) createRedirect(current, path);
    if (path !== current.path || depth !== current.depth) moveDescendants(current, path, depth);
  });
  try {
    transaction();
  } catch {
    return c.json({ error: '文档路径与现有页面冲突' }, 409);
  }
  return c.json(getDocumentById(current.id)!);
});

adminDocsRoutes.delete('/documents/:id', (c) => {
  const current = getDocumentById(c.req.param('id'));
  if (!current) return c.json({ error: '文档不存在' }, 404);
  const transaction = sqlite.transaction(() => {
    const children = sqlite
      .prepare(`${DOCUMENT_SELECT} WHERE parent_id = ? ORDER BY sort_order ASC`)
      .all(current.id) as DocumentRow[];
    const nextParent = current.parentId ? getDocumentById(current.parentId) : null;
    for (const child of children) {
      const nextDepth = nextParent ? nextParent.depth + 1 : 0;
      sqlite
        .prepare('UPDATE documents SET parent_id = ?, depth = ?, updated_at = ? WHERE id = ?')
        .run(nextParent?.id ?? null, nextDepth, nowIso(), child.id);
      if (nextDepth !== child.depth) moveDescendants(child, child.path, nextDepth);
    }
    sqlite.prepare('DELETE FROM documents WHERE id = ?').run(current.id);
  });
  transaction();
  return c.json({ ok: true });
});

adminDocsRoutes.get('/documents/:id/revisions', (c) => {
  const document = getDocumentById(c.req.param('id'));
  if (!document) return c.json({ error: '文档不存在' }, 404);
  const items = sqlite
    .prepare(
      `SELECT id, version, reason, created_by AS createdBy, created_at AS createdAt
       FROM document_revisions WHERE document_id = ? ORDER BY version DESC`,
    )
    .all(document.id);
  return c.json({ items });
});

adminDocsRoutes.post('/documents/:id/revisions/:revisionId/restore', (c) => {
  const current = getDocumentById(c.req.param('id'));
  if (!current) return c.json({ error: '文档不存在' }, 404);
  const revision = sqlite
    .prepare('SELECT snapshot_json AS snapshotJson FROM document_revisions WHERE id = ? AND document_id = ? LIMIT 1')
    .get(c.req.param('revisionId'), current.id) as { snapshotJson: string } | undefined;
  if (!revision) return c.json({ error: '历史版本不存在' }, 404);
  let snapshot: Partial<DocumentRow>;
  try {
    snapshot = JSON.parse(revision.snapshotJson) as Partial<DocumentRow>;
  } catch {
    return c.json({ error: '历史版本数据损坏' }, 409);
  }
  const transaction = sqlite.transaction(() => {
    saveRevision(current, c.get('userId'), 'restore');
    sqlite
      .prepare(
        `UPDATE documents SET
          parent_id = ?, title = ?, slug = ?, path = ?, description = ?, content_md = ?,
          status = ?, visibility = ?, sort_order = ?, depth = ?, edit_url = ?,
          seo_title = ?, seo_description = ?, published_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        snapshot.parentId ?? null,
        snapshot.title ?? current.title,
        snapshot.slug ?? current.slug,
        snapshot.path ?? current.path,
        snapshot.description ?? null,
        snapshot.contentMd ?? current.contentMd,
        snapshot.status ?? current.status,
        snapshot.visibility ?? current.visibility,
        snapshot.sortOrder ?? current.sortOrder,
        snapshot.depth ?? current.depth,
        snapshot.editUrl ?? null,
        snapshot.seoTitle ?? null,
        snapshot.seoDescription ?? null,
        snapshot.status === 'published' ? current.publishedAt ?? nowIso() : null,
        nowIso(),
        current.id,
      );
  });
  try {
    transaction();
  } catch {
    return c.json({ error: '恢复失败，历史路径与现有文档冲突' }, 409);
  }
  return c.json(getDocumentById(current.id)!);
});
