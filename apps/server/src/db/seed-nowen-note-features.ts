import { sqlite } from './client';
import { nowIso } from '../lib/format';
import { featureDocumentsPart1 } from './seed-nowen-note-features.part1';
import { featureDocumentsPart2 } from './seed-nowen-note-features.part2';
import { featureDocumentsPart3 } from './seed-nowen-note-features.part3';
import { featureDocumentsPart4 } from './seed-nowen-note-features.part4';
import type { SeedDocument } from './seed-nowen-note-features.types';

const SPACE_ID = 'docspace_nowen_note_features';
const VERSION_ID = 'docver_nowen_note_features_latest';
const SPACE_SLUG = 'nowen-note-features';

const documents: SeedDocument[] = [
  ...featureDocumentsPart1,
  ...featureDocumentsPart2,
  ...featureDocumentsPart3,
  ...featureDocumentsPart4,
];

export function ensureNowenNoteFeatureDocs(): void {
  const existing = sqlite
    .prepare('SELECT id FROM doc_spaces WHERE slug = ? LIMIT 1')
    .get(SPACE_SLUG) as { id: string } | undefined;
  if (existing) return;

  const now = nowIso();
  const insert = sqlite.transaction(() => {
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
        '详细介绍 Nowen Note 的笔记、编辑器、任务、AI、思维导图、协作、多端和数据扩展能力。',
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

    const statement = sqlite.prepare(
      `INSERT INTO documents (
        id, space_id, version_id, parent_id, title, slug, path, description,
        content_md, status, visibility, sort_order, depth, source_type,
        source_path, source_sha, edit_url, seo_title, seo_description,
        published_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 'public', ?, ?, 'cms',
        NULL, NULL, NULL, ?, ?, ?, ?, ?
      )`,
    );

    const byId = new Map(documents.map((document) => [document.id, document]));
    for (const document of documents) {
      const parent = document.parentId ? byId.get(document.parentId) : undefined;
      const path = parent ? `${parent.slug}/${document.slug}` : document.slug;
      statement.run(
        document.id,
        SPACE_ID,
        VERSION_ID,
        document.parentId ?? null,
        document.title,
        document.slug,
        path,
        document.description,
        document.contentMd,
        document.sortOrder,
        document.parentId ? 1 : 0,
        document.title,
        document.description,
        now,
        now,
        now,
      );
    }
  });

  insert();
  console.log(`✨ Seeded Nowen Note feature documentation (${documents.length} documents).`);
}
