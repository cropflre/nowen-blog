import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth';
import { sqlite } from '../../db/client';
import { nowIso, randomId } from '../../lib/format';
import { githubSyncSchema, parseJson, spaceCreateSchema, spaceUpdateSchema } from './docs.schemas';
import {
  createRedirect,
  getDocumentById,
  getSpaceById,
  moveDescendants,
  saveRevision,
  uniqueSpaceSlug,
} from './docs.service';
import { syncGitHubSpaceById } from './docs-sync.service';
import {
  buildHelpCenterDocumentPath,
  documentHasChildren,
  getHelpCenterById,
  getHelpCenterVersion,
  listHelpCenterDocuments,
  listHelpCenters,
  nextHelpCenterSortOrder,
  validateHelpCenterParent,
} from './help-centers.service';
import type { DocumentRow } from './docs.types';

const helpDocumentCreateSchema = z.object({
  parentId: z.string().trim().nullable().optional(),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(1000).nullable().optional(),
  contentMd: z.string().default(''),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  sortOrder: z.number().int().min(0).max(99999).optional(),
});

const helpDocumentUpdateSchema = helpDocumentCreateSchema.partial();

function normalizeRepository(value: string | null | undefined): string | null {
  const normalized = value
    ?.trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
  return normalized || null;
}

function duplicateHelpCenter(projectId: string | null, repositoryFullName: string | null, ignoreId?: string) {
  if (projectId) {
    const row = ignoreId
      ? sqlite.prepare('SELECT id FROM doc_spaces WHERE project_id = ? AND id != ? LIMIT 1').get(projectId, ignoreId)
      : sqlite.prepare('SELECT id FROM doc_spaces WHERE project_id = ? LIMIT 1').get(projectId);
    if (row) return '这个项目已经有帮助中心了';
  }
  if (repositoryFullName) {
    const row = ignoreId
      ? sqlite
          .prepare('SELECT id FROM doc_spaces WHERE repository_full_name = ? AND id != ? LIMIT 1')
          .get(repositoryFullName, ignoreId)
      : sqlite.prepare('SELECT id FROM doc_spaces WHERE repository_full_name = ? LIMIT 1').get(repositoryFullName);
    if (row) return '这个 GitHub 仓库已经绑定了帮助中心';
  }
  return null;
}

export const adminHelpCentersRoutes = new Hono<{ Variables: { userId: string } }>();
adminHelpCentersRoutes.use('*', authMiddleware);

adminHelpCentersRoutes.get('/', (c) => c.json({ items: listHelpCenters(false) }));

adminHelpCentersRoutes.post('/', async (c) => {
  const parsed = spaceCreateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '请检查帮助中心信息', issues: parsed.error.flatten() }, 400);

  const repositoryFullName = normalizeRepository(parsed.data.repositoryFullName);
  const duplicate = duplicateHelpCenter(parsed.data.projectId ?? null, repositoryFullName);
  if (duplicate) return c.json({ error: duplicate }, 409);

  const id = randomId('dsp_');
  const versionId = randomId('dver_');
  const now = nowIso();
  const slug = uniqueSpaceSlug(parsed.data.slug || parsed.data.name);
  const sourceMode = repositoryFullName ? 'github' : parsed.data.sourceMode;

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
        repositoryFullName,
        sourceMode,
        parsed.data.docsRoot || 'docs',
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
        ) VALUES (?, ?, 'latest', '帮助中心', NULL, 'published', 1, 0, 0, ?, ?)`,
      )
      .run(versionId, id, now, now);

    if (sourceMode === 'cms') {
      sqlite
        .prepare(
          `INSERT INTO documents (
            id, space_id, version_id, parent_id, title, slug, path, description,
            content_md, status, visibility, sort_order, depth, source_type,
            source_path, source_sha, edit_url, seo_title, seo_description,
            published_at, created_at, updated_at
          ) VALUES (?, ?, ?, NULL, '开始使用', 'getting-started', 'getting-started',
            '编辑这篇文档，向用户介绍项目的安装和基本使用方法。', ?, 'draft', 'public',
            0, 0, 'cms', NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
        )
        .run(
          randomId('doc_'),
          id,
          versionId,
          '# 开始使用\n\n欢迎使用本项目。请在这里填写安装、登录和第一次使用的步骤。',
          now,
          now,
        );
    }
  });

  try {
    transaction();
  } catch {
    return c.json({ error: '帮助中心创建失败，项目或仓库可能已经被使用' }, 409);
  }
  return c.json(getHelpCenterById(id), 201);
});

adminHelpCentersRoutes.patch('/:id', async (c) => {
  const current = getSpaceById(c.req.param('id'));
  if (!current) return c.json({ error: '帮助中心不存在' }, 404);
  const parsed = spaceUpdateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '请检查帮助中心信息', issues: parsed.error.flatten() }, 400);

  const repositoryFullName =
    parsed.data.repositoryFullName === undefined
      ? current.repositoryFullName
      : normalizeRepository(parsed.data.repositoryFullName);
  const projectId = parsed.data.projectId === undefined ? current.projectId : parsed.data.projectId;
  const duplicate = duplicateHelpCenter(projectId, repositoryFullName, current.id);
  if (duplicate) return c.json({ error: duplicate }, 409);

  const next = {
    projectId,
    name: parsed.data.name ?? current.name,
    slug:
      parsed.data.slug === undefined
        ? current.slug
        : uniqueSpaceSlug(parsed.data.slug || parsed.data.name || current.name, current.id),
    description: parsed.data.description === undefined ? current.description : parsed.data.description,
    iconUrl: parsed.data.iconUrl === undefined ? current.iconUrl : parsed.data.iconUrl,
    repositoryFullName,
    sourceMode: repositoryFullName ? 'github' : parsed.data.sourceMode ?? current.sourceMode,
    docsRoot: parsed.data.docsRoot ?? current.docsRoot,
    isPublished: parsed.data.isPublished ?? Boolean(current.isPublished),
    sortOrder: parsed.data.sortOrder ?? current.sortOrder,
  };

  try {
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
  } catch {
    return c.json({ error: '项目或 GitHub 仓库已经绑定了其他帮助中心' }, 409);
  }
  return c.json(getHelpCenterById(current.id));
});

adminHelpCentersRoutes.delete('/:id', (c) => {
  const result = sqlite.prepare('DELETE FROM doc_spaces WHERE id = ?').run(c.req.param('id'));
  if (!result.changes) return c.json({ error: '帮助中心不存在' }, 404);
  return c.json({ ok: true });
});

adminHelpCentersRoutes.post('/:id/sync', async (c) => {
  const center = getHelpCenterById(c.req.param('id'));
  if (!center?.helpCenterVersionId) return c.json({ error: '帮助中心不存在' }, 404);
  const parsed = githubSyncSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '同步设置不正确', issues: parsed.error.flatten() }, 400);
  try {
    return c.json(
      await syncGitHubSpaceById(center.id, {
        versionId: center.helpCenterVersionId,
        ref: parsed.data.ref,
        docsRoot: parsed.data.docsRoot,
      }),
    );
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'GitHub 同步失败' }, 400);
  }
});

adminHelpCentersRoutes.get('/:id/documents', (c) => {
  const center = getHelpCenterById(c.req.param('id'));
  if (!center?.helpCenterVersionId) return c.json({ error: '帮助中心不存在' }, 404);
  return c.json({ items: listHelpCenterDocuments(center.id, center.helpCenterVersionId, false) });
});

adminHelpCentersRoutes.post('/:id/documents', async (c) => {
  const center = getHelpCenterById(c.req.param('id'));
  if (!center?.helpCenterVersionId) return c.json({ error: '帮助中心不存在' }, 404);
  const parsed = helpDocumentCreateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '请检查文档内容', issues: parsed.error.flatten() }, 400);
  const parentResult = validateHelpCenterParent(
    center.helpCenterVersionId,
    parsed.data.parentId ?? null,
  );
  if (parentResult.error) return c.json({ error: parentResult.error }, 400);
  const { slug, path } = buildHelpCenterDocumentPath(
    center.helpCenterVersionId,
    parsed.data.title,
    parentResult.parent,
  );
  const id = randomId('doc_');
  const now = nowIso();
  sqlite
    .prepare(
      `INSERT INTO documents (
        id, space_id, version_id, parent_id, title, slug, path, description,
        content_md, status, visibility, sort_order, depth, source_type,
        source_path, source_sha, edit_url, seo_title, seo_description,
        published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', ?, ?, 'cms',
        NULL, NULL, NULL, NULL, NULL, ?, ?, ?)`,
    )
    .run(
      id,
      center.id,
      center.helpCenterVersionId,
      parentResult.parent?.id ?? null,
      parsed.data.title,
      slug,
      path,
      parsed.data.description ?? null,
      parsed.data.contentMd,
      parsed.data.status,
      parsed.data.sortOrder ??
        nextHelpCenterSortOrder(center.helpCenterVersionId, parentResult.parent?.id ?? null),
      parentResult.parent ? 1 : 0,
      parsed.data.status === 'published' ? now : null,
      now,
      now,
    );
  return c.json(getDocumentById(id), 201);
});

adminHelpCentersRoutes.patch('/documents/:id', async (c) => {
  const current = getDocumentById(c.req.param('id'));
  if (!current) return c.json({ error: '文档不存在' }, 404);
  const parsed = helpDocumentUpdateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '请检查文档内容', issues: parsed.error.flatten() }, 400);

  const parentId = parsed.data.parentId === undefined ? current.parentId : parsed.data.parentId;
  const parentResult = validateHelpCenterParent(current.versionId, parentId, current.id);
  if (parentResult.error) return c.json({ error: parentResult.error }, 400);
  if (parentResult.parent && documentHasChildren(current.id)) {
    return c.json({ error: '这个一级栏目下面还有文章，不能再放到其他栏目下面' }, 400);
  }

  const parentChanged = (parentResult.parent?.id ?? null) !== current.parentId;
  const title = parsed.data.title ?? current.title;
  const nextPath = parentChanged
    ? buildHelpCenterDocumentPath(current.versionId, current.slug || title, parentResult.parent, current.id)
    : { slug: current.slug, path: current.path };
  const status = parsed.data.status ?? current.status;
  const now = nowIso();

  const transaction = sqlite.transaction(() => {
    saveRevision(current, c.get('userId'));
    sqlite
      .prepare(
        `UPDATE documents SET
          parent_id = ?, title = ?, slug = ?, path = ?, description = ?, content_md = ?,
          status = ?, visibility = 'public', sort_order = ?, depth = ?, published_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        parentResult.parent?.id ?? null,
        title,
        nextPath.slug,
        nextPath.path,
        parsed.data.description === undefined ? current.description : parsed.data.description,
        parsed.data.contentMd ?? current.contentMd,
        status,
        parsed.data.sortOrder ?? current.sortOrder,
        parentResult.parent ? 1 : 0,
        status === 'published' ? current.publishedAt ?? now : null,
        now,
        current.id,
      );
    if (nextPath.path !== current.path) createRedirect(current, nextPath.path);
    if (nextPath.path !== current.path || (parentResult.parent ? 1 : 0) !== current.depth) {
      moveDescendants(current, nextPath.path, parentResult.parent ? 1 : 0);
    }
  });

  try {
    transaction();
  } catch {
    return c.json({ error: '保存失败，请刷新后重试' }, 409);
  }
  return c.json(getDocumentById(current.id));
});

adminHelpCentersRoutes.delete('/documents/:id', (c) => {
  const current = getDocumentById(c.req.param('id'));
  if (!current) return c.json({ error: '文档不存在' }, 404);

  const transaction = sqlite.transaction(() => {
    const children = sqlite
      .prepare('SELECT id FROM documents WHERE parent_id = ? ORDER BY sort_order ASC')
      .all(current.id) as Array<{ id: string }>;
    for (const childRef of children) {
      const child = getDocumentById(childRef.id) as DocumentRow;
      const nextPath = buildHelpCenterDocumentPath(child.versionId, child.slug || child.title, null, child.id);
      if (nextPath.path !== child.path) createRedirect(child, nextPath.path);
      sqlite
        .prepare('UPDATE documents SET parent_id = NULL, path = ?, depth = 0, updated_at = ? WHERE id = ?')
        .run(nextPath.path, nowIso(), child.id);
      moveDescendants(child, nextPath.path, 0);
    }
    sqlite.prepare('DELETE FROM documents WHERE id = ?').run(current.id);
  });
  transaction();
  return c.json({ ok: true });
});
