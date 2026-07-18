import { sqlite } from './client';
import { nowIso } from '../lib/format';
import { helpDocumentUpdates } from './sync-nowen-note-help.updates';

const SPACE_SLUG = 'nowen-note-help';
const SOURCE_PATH = 'seed:nowen-note-help';
const SOURCE_REVISION = '2026-07-18-v2';

type ExistingDocument = {
  sourceType: string;
  sourcePath: string | null;
  sourceSha: string | null;
  hasRevisions: number;
};

function resolvePath(document: (typeof helpDocumentUpdates)[number], spaceId: string): string {
  if (!document.parentId) return document.slug;
  const parent = sqlite
    .prepare('SELECT path FROM documents WHERE id = ? AND space_id = ? LIMIT 1')
    .get(document.parentId, spaceId) as { path: string } | undefined;
  return parent ? `${parent.path}/${document.slug}` : document.slug;
}

export function synchronizeNowenNoteHelpDocs(): void {
  const space = sqlite
    .prepare(
      `SELECT id, default_version_id AS defaultVersionId
       FROM doc_spaces WHERE slug = ? LIMIT 1`,
    )
    .get(SPACE_SLUG) as { id: string; defaultVersionId: string | null } | undefined;
  if (!space?.defaultVersionId) return;

  const spaceId = space.id;
  const versionId = space.defaultVersionId;
  const now = nowIso();
  const sync = sqlite.transaction(() => {
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
        parent_id = ?, title = ?, slug = ?, path = ?, description = ?, content_md = ?,
        status = 'published', visibility = 'public', sort_order = ?, depth = ?,
        source_type = 'seed', source_path = ?, source_sha = ?, edit_url = NULL,
        seo_title = ?, seo_description = ?, published_at = COALESCE(published_at, ?), updated_at = ?
       WHERE id = ? AND space_id = ?`,
    );

    for (const document of helpDocumentUpdates) {
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
        .get(document.id, spaceId) as ExistingDocument | undefined;

      const path = resolvePath(document, spaceId);
      const depth = document.parentId ? 1 : 0;

      if (!existing) {
        insertStatement.run(
          document.id,
          spaceId,
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
        spaceId,
      );
      updated += 1;
    }

    if (inserted > 0 || updated > 0) {
      sqlite.prepare('UPDATE doc_spaces SET updated_at = ? WHERE id = ?').run(now, spaceId);
    }

    return { inserted, updated, preserved };
  });

  const result = sync();
  console.log(
    `📘 Synchronized Nowen Note installation help ` +
      `(inserted=${result.inserted}, updated=${result.updated}, preserved=${result.preserved}).`,
  );
}
