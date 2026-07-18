import { sqlite } from './client';
import { nowIso } from '../lib/format';
import { featureDocumentsPart1 } from './seed-nowen-note-features.part1';
import { featureDocumentsPart2 } from './seed-nowen-note-features.part2';
import { featureDocumentsPart3 } from './seed-nowen-note-features.part3';
import { featureDocumentsPart4 } from './seed-nowen-note-features.part4';
import { featureDocumentUpdates } from './seed-nowen-note-features.updates';
import type { SeedDocument } from './seed-nowen-note-features.types';

const SPACE_ID = 'docspace_nowen_note_features';
const VERSION_ID = 'docver_nowen_note_features_latest';
const SPACE_SLUG = 'nowen-note-features';
const SOURCE_PATH = 'seed:nowen-note-features';
const SOURCE_REVISION = '2026-07-18-v2';

const baseDocuments: SeedDocument[] = [
  ...featureDocumentsPart1,
  ...featureDocumentsPart2,
  ...featureDocumentsPart3,
  ...featureDocumentsPart4,
];

const updateById = new Map(featureDocumentUpdates.map((document) => [document.id, document]));
const documents = baseDocuments.map((document) => updateById.get(document.id) ?? document);

type ExistingSpace = {
  id: string;
  defaultVersionId: string | null;
};

type ExistingDocument = {
  sourceType: string;
  sourcePath: string | null;
  sourceSha: string | null;
  hasRevisions: number;
};

function createSpace(now: string): ExistingSpace {
  sqlite
    .prepare(
      `INSERT INTO doc_spaces (
        id, project_id, name, slug, description, icon_url, default_version_id,
        repository_full_name, source_mode, docs_root, is_published, sort_order,
        created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, NULL, NULL, NULL, 'cms', '', 1, -20, ?, ?)`,
    )
    .run(
      SPACE_ID,
      'Nowen Note 功能介绍',
      SPACE_SLUG,
      '详细介绍 Nowen Note 的笔记、编辑器、任务、AI、知识图谱、协作、多端和数据扩展能力。',
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
    .run(VERSION_ID, SPACE_ID, now, now);

  sqlite.prepare('UPDATE doc_spaces SET default_version_id = ? WHERE id = ?').run(VERSION_ID, SPACE_ID);
  return { id: SPACE_ID, defaultVersionId: VERSION_ID };
}

function ensureDefaultVersion(space: ExistingSpace, now: string): string {
  if (space.defaultVersionId) return space.defaultVersionId;

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO doc_versions (
        id, space_id, version, label, source_ref, status, is_default,
        is_deprecated, sort_order, created_at, updated_at
      ) VALUES (?, ?, 'latest', '帮助中心', NULL, 'published', 1, 0, 0, ?, ?)`,
    )
    .run(VERSION_ID, space.id, now, now);
  sqlite.prepare('UPDATE doc_spaces SET default_version_id = ?, updated_at = ? WHERE id = ?').run(
    VERSION_ID,
    now,
    space.id,
  );
  return VERSION_ID;
}

function resolveDocumentPath(document: SeedDocument, spaceId: string): string {
  if (!document.parentId) return document.slug;
  const parent = sqlite
    .prepare('SELECT path FROM documents WHERE id = ? AND space_id = ? LIMIT 1')
    .get(document.parentId, spaceId) as { path: string } | undefined;
  return parent ? `${parent.path}/${document.slug}` : document.slug;
}

export function ensureNowenNoteFeatureDocs(): void {
  const now = nowIso();
  const sync = sqlite.transaction(() => {
    let space = sqlite
      .prepare(
        `SELECT id, default_version_id AS defaultVersionId
         FROM doc_spaces WHERE slug = ? LIMIT 1`,
      )
      .get(SPACE_SLUG) as ExistingSpace | undefined;

    let createdSpace = false;
    if (!space) {
      space = createSpace(now);
      createdSpace = true;
    }

    const versionId = ensureDefaultVersion(space, now);
    let inserted = 0;
    let updated = 0;
    let preserved = 0;

    const insertStatement = sqlite.prepare(
      `INSERT INTO documents (
        id, space_id, version_id, parent_id, title, slug, path, description,
        content_md, status, visibility, sort_order, depth, source_type,
        source_path, source_sha, edit_url, seo_title, seo_description,
        published_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 'public', ?, ?, 'seed',
        ?, ?, NULL, ?, ?, ?, ?, ?
      )`,
    );

    const updateStatement = sqlite.prepare(
      `UPDATE documents SET
        version_id = ?, parent_id = ?, title = ?, slug = ?, path = ?, description = ?,
        content_md = ?, status = 'published', visibility = 'public', sort_order = ?, depth = ?,
        source_type = 'seed', source_path = ?, source_sha = ?, edit_url = NULL,
        seo_title = ?, seo_description = ?, published_at = COALESCE(published_at, ?), updated_at = ?
       WHERE id = ? AND space_id = ?`,
    );

    for (const document of documents) {
      const existing = sqlite
        .prepare(
          `SELECT
             source_type AS sourceType,
             source_path AS sourcePath,
             source_sha AS sourceSha,
             EXISTS(
               SELECT 1 FROM document_revisions r WHERE r.document_id = documents.id LIMIT 1
             ) AS hasRevisions
           FROM documents
           WHERE id = ? AND space_id = ?
           LIMIT 1`,
        )
        .get(document.id, space.id) as ExistingDocument | undefined;

      const path = resolveDocumentPath(document, space.id);
      const depth = document.parentId ? 1 : 0;

      if (!existing) {
        insertStatement.run(
          document.id,
          space.id,
          versionId,
          document.parentId ?? null,
          document.title,
          document.slug,
          path,
          document.description,
          document.contentMd,
          document.sortOrder,
          depth,
          SOURCE_PATH,
          SOURCE_REVISION,
          document.title,
          document.description,
          now,
          now,
          now,
        );
        inserted += 1;
        continue;
      }

      if (
        existing.sourceType === 'seed' &&
        existing.sourcePath === SOURCE_PATH &&
        existing.sourceSha === SOURCE_REVISION
      ) {
        continue;
      }

      const isManagedSeed = existing.sourceType === 'seed';
      const isUneditedLegacySeed =
        existing.sourcePath === null &&
        existing.sourceSha === null &&
        existing.hasRevisions === 0;

      if (!isManagedSeed && !isUneditedLegacySeed) {
        preserved += 1;
        continue;
      }

      updateStatement.run(
        versionId,
        document.parentId ?? null,
        document.title,
        document.slug,
        path,
        document.description,
        document.contentMd,
        document.sortOrder,
        depth,
        SOURCE_PATH,
        SOURCE_REVISION,
        document.title,
        document.description,
        now,
        now,
        document.id,
        space.id,
      );
      updated += 1;
    }

    if (inserted > 0 || updated > 0) {
      sqlite.prepare('UPDATE doc_spaces SET updated_at = ? WHERE id = ?').run(now, space.id);
    }

    return { createdSpace, inserted, updated, preserved };
  });

  const result = sync();
  console.log(
    `✨ Synchronized Nowen Note feature documentation ` +
      `(created=${result.createdSpace}, inserted=${result.inserted}, updated=${result.updated}, preserved=${result.preserved}).`,
  );
}
