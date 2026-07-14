import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth';
import { sqlite } from '../../db/client';
import { nowIso, randomId } from '../../lib/format';
import { parseJson } from './docs.schemas';
import {
  createRedirect,
  getDocumentById,
  getSpaceById,
  moveDescendants,
  saveRevision,
  uniqueSpaceSlug,
} from './docs.service';
import {
  buildHelpCenterDocumentPath,
  documentHasChildren,
  getHelpCenterById,
  listHelpCenterDocuments,
  listHelpCenters,
  nextHelpCenterSortOrder,
  validateHelpCenterParent,
} from './help-centers.service';
import type { DocumentRow } from './docs.types';

const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.null(), z.literal('')]).transform((value) => value || null);

const helpCenterCreateSchema = z.object({
  name: z.string().trim().min(1, '请输入项目名称').max(120),
  description: nullableText(1000).optional().default(null),
  iconUrl: nullableText(1000).optional().default(null),
  isPublished: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(99999).optional().default(0),
});

const helpCenterUpdateSchema = helpCenterCreateSchema.partial();

const helpDocumentCreateSchema = z.object({
  parentId: z.string().trim().nullable().optional(),
  title: z.string().trim().min(1, '请输入标题').max(240),
  description: nullableText(1000).optional().default(null),
  contentMd: z.string().default(''),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  sortOrder: z.number().int().min(0).max(99999).optional(),
});

const helpDocumentUpdateSchema = helpDocumentCreateSchema.partial();

export const adminHelpCentersRoutes = new Hono<{ Variables: { userId: string } }>();
adminHelpCentersRoutes.use('*', authMiddleware);

adminHelpCentersRoutes.get('/', (c) => c.json({ items: listHelpCenters(false) }));

adminHelpCentersRoutes.post('/', async (c) => {
  const parsed = helpCenterCreateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '请检查项目信息', issues: parsed.error.flatten() }, 400);

  const id = randomId('dsp_');
  const versionId = randomId('dver_');
  const now = nowIso();
  const slug = uniqueSpaceSlug(parsed.data.name);

  const transaction = sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT INTO doc_spaces (
          id, project_id, name, slug, description, icon_url, default_version_id,
          repository_full_name, source_mode, docs_root, is_published, sort_order,
          created_at, updated_at
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, NULL, 'cms', '', ?, ?, ?, ?)`,
      )
      .run(
        id,
        parsed.data.name,
        slug,
        parsed.data.description,
        parsed.data.iconUrl,
        versionId,
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

    sqlite
      .prepare(
        `INSERT INTO documents (
          id, space_id, version_id, parent_id, title, slug, path, description,
          content_md, status, visibility, sort_order, depth, source_type,
          source_path, source_sha, edit_url, seo_title, seo_description,
          published_at, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, '开始使用', 'getting-started', 'getting-started',
          '向用户介绍安装、登录和第一次使用。', ?, 'draft', 'public',
          0, 0, 'cms', NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
      )
      .run(
        randomId('doc_'),
        id,
        versionId,
        '# 开始使用\n\n请在这里填写安装、登录和第一次使用的步骤。',
        now,
        now,
      );
  });

  transaction();
  return c.json(getHelpCenterById(id), 201);
});

adminHelpCentersRoutes.patch('/:id', async (c) => {
  const current = getSpaceById(c.req.param('id'));
  if (!current) return c.json({ error: '帮助中心不存在' }, 404);
  const parsed = helpCenterUpdateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '请检查项目信息', issues: parsed.error.flatten() }, 400);

  const nextName = parsed.data.name ?? current.name;
  const nextSlug = parsed.data.name === undefined ? current.slug : uniqueSpaceSlug(nextName, current.id);
  sqlite
    .prepare(
      `UPDATE doc_spaces SET
        name = ?, slug = ?, description = ?, icon_url = ?, repository_full_name = NULL,
        source_mode = 'cms', docs_root = '', is_published = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      nextName,
      nextSlug,
      parsed.data.description === undefined ? current.description : parsed.data.description,
      parsed.data.iconUrl === undefined ? current.iconUrl : parsed.data.iconUrl,
      (parsed.data.isPublished ?? Boolean(current.isPublished)) ? 1 : 0,
      parsed.data.sortOrder ?? current.sortOrder,
      nowIso(),
      current.id,
    );
  return c.json(getHelpCenterById(current.id));
});

adminHelpCentersRoutes.delete('/:id', (c) => {
  const result = sqlite.prepare('DELETE FROM doc_spaces WHERE id = ?').run(c.req.param('id'));
  if (!result.changes) return c.json({ error: '帮助中心不存在' }, 404);
  return c.json({ ok: true });
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
  const parentResult = validateHelpCenterParent(center.helpCenterVersionId, parsed.data.parentId ?? null);
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
      parsed.data.description,
      parsed.data.contentMd,
      parsed.data.status,
      parsed.data.sortOrder ?? nextHelpCenterSortOrder(center.helpCenterVersionId, parentResult.parent?.id ?? null),
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
  const titleChanged = title !== current.title;
  const nextPath = parentChanged || titleChanged
    ? buildHelpCenterDocumentPath(current.versionId, title, parentResult.parent, current.id)
    : { slug: current.slug, path: current.path };
  const status = parsed.data.status ?? current.status;
  const now = nowIso();

  const transaction = sqlite.transaction(() => {
    saveRevision(current, c.get('userId'));
    sqlite
      .prepare(
        `UPDATE documents SET
          parent_id = ?, title = ?, slug = ?, path = ?, description = ?, content_md = ?,
          status = ?, visibility = 'public', sort_order = ?, depth = ?, source_type = 'cms',
          source_path = NULL, source_sha = NULL, edit_url = NULL,
          published_at = ?, updated_at = ?
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
      const nextPath = buildHelpCenterDocumentPath(child.versionId, child.title, null, child.id);
      if (nextPath.path !== child.path) createRedirect(child, nextPath.path);
      sqlite
        .prepare('UPDATE documents SET parent_id = NULL, path = ?, slug = ?, depth = 0, updated_at = ? WHERE id = ?')
        .run(nextPath.path, nextPath.slug, nowIso(), child.id);
      moveDescendants(child, nextPath.path, 0);
    }
    sqlite.prepare('DELETE FROM documents WHERE id = ?').run(current.id);
  });
  transaction();
  return c.json({ ok: true });
});
