import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

type ClientModule = typeof import('./client');

let testDir = '';
let sqlite: ClientModule['sqlite'];
let initDb: () => void;

describe('fresh database bootstrap', () => {
  before(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'nowen-fresh-migrations-'));
    process.env.DATABASE_PATH = join(testDir, 'blog.sqlite');
    process.env.UPLOAD_DIR = join(testDir, 'uploads');
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_USERNAME = 'fresh-admin';
    process.env.ADMIN_EMAIL = 'fresh@example.com';
    process.env.ADMIN_PASSWORD = 'fresh-migration-password';
    process.env.SESSION_SECRET = 'fresh-migration-session-secret-at-least-32-characters';

    const initModule = await import('./init');
    const clientModule = await import('./client');
    initDb = initModule.initDb;
    sqlite = clientModule.sqlite;
  });

  after(() => {
    try {
      sqlite?.close();
    } finally {
      if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('creates schema, seed content, settings and search index', () => {
    initDb();

    const migrationCount = sqlite
      .prepare('SELECT COUNT(*) AS total FROM __drizzle_migrations')
      .get() as { total: number };
    assert.equal(migrationCount.total, 7);

    const user = sqlite
      .prepare('SELECT username, email FROM users LIMIT 1')
      .get() as { username: string; email: string };
    assert.equal(user.username, 'fresh-admin');
    assert.equal(user.email, 'fresh@example.com');

    const postCount = sqlite.prepare('SELECT COUNT(*) AS total FROM posts').get() as { total: number };
    const indexedCount = sqlite.prepare('SELECT COUNT(*) AS total FROM posts_fts').get() as { total: number };
    assert.ok(postCount.total > 0);
    assert.equal(indexedCount.total, postCount.total);

    for (const table of [
      'projects',
      'newsletter_subscribers',
      'newsletter_campaigns',
      'ai_settings',
      'doc_spaces',
      'doc_versions',
      'documents',
      'document_revisions',
      'document_redirects',
      'document_feedback',
      'documents_fts',
      'ai_agent_runs',
      'ai_agent_steps',
      'ai_agent_changes',
    ]) {
      const row = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE name = ?")
        .get(table) as { name: string } | undefined;
      assert.equal(row?.name, table);
    }

    const projectIndex = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'uq_doc_spaces_project_id'")
      .get() as { name: string } | undefined;
    assert.equal(projectIndex?.name, 'uq_doc_spaces_project_id');

    const settings = sqlite
      .prepare("SELECT site_title AS siteTitle FROM site_settings WHERE id = 'site'")
      .get() as { siteTitle: string };
    assert.equal(settings.siteTitle, 'NOWEN Blog');

    const apiSpace = sqlite
      .prepare(
        `SELECT id, name, default_version_id AS defaultVersionId, is_published AS isPublished
         FROM doc_spaces WHERE slug = 'nowen-note-api'`,
      )
      .get() as { id: string; name: string; defaultVersionId: string; isPublished: number };
    assert.equal(apiSpace.name, 'Nowen Note API 文档');
    assert.equal(apiSpace.isPublished, 1);
    assert.ok(apiSpace.defaultVersionId);

    const apiDocumentStats = sqlite
      .prepare(
        `SELECT COUNT(*) AS total, MAX(depth) AS maxDepth,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published
         FROM documents WHERE space_id = ?`,
      )
      .get(apiSpace.id) as { total: number; maxDepth: number; published: number };
    assert.equal(apiDocumentStats.total, 19);
    assert.equal(apiDocumentStats.maxDepth, 1);
    assert.equal(apiDocumentStats.published, 19);

    const apiIndexedCount = sqlite
      .prepare(
        `SELECT COUNT(*) AS total
         FROM documents_fts f
         JOIN documents d ON d.rowid = f.rowid
         WHERE d.space_id = ?`,
      )
      .get(apiSpace.id) as { total: number };
    assert.equal(apiIndexedCount.total, 19);

    const notesDoc = sqlite
      .prepare("SELECT title, path FROM documents WHERE id = 'doc_nn_api_notes'")
      .get() as { title: string; path: string };
    assert.equal(notesDoc.title, '笔记 API');
    assert.equal(notesDoc.path, 'core/notes');

    const helpSpace = sqlite
      .prepare(
        `SELECT id, name, default_version_id AS defaultVersionId, is_published AS isPublished
         FROM doc_spaces WHERE slug = 'nowen-note-help'`,
      )
      .get() as { id: string; name: string; defaultVersionId: string; isPublished: number };
    assert.equal(helpSpace.name, 'Nowen Note 安装与问题解答');
    assert.equal(helpSpace.isPublished, 1);
    assert.ok(helpSpace.defaultVersionId);

    const helpDocumentStats = sqlite
      .prepare(
        `SELECT COUNT(*) AS total, MAX(depth) AS maxDepth,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published
         FROM documents WHERE space_id = ?`,
      )
      .get(helpSpace.id) as { total: number; maxDepth: number; published: number };
    assert.equal(helpDocumentStats.total, 28);
    assert.equal(helpDocumentStats.maxDepth, 1);
    assert.equal(helpDocumentStats.published, 28);

    const helpIndexedCount = sqlite
      .prepare(
        `SELECT COUNT(*) AS total
         FROM documents_fts f
         JOIN documents d ON d.rowid = f.rowid
         WHERE d.space_id = ?`,
      )
      .get(helpSpace.id) as { total: number };
    assert.equal(helpIndexedCount.total, 28);

    const brokenImagesDoc = sqlite
      .prepare("SELECT title, path FROM documents WHERE id = 'doc_nn_help_broken_images'")
      .get() as { title: string; path: string };
    assert.equal(brokenImagesDoc.title, '图片刷新后裂图或变成 127.0.0.1');
    assert.equal(brokenImagesDoc.path, 'troubleshooting/images-after-refresh');

    const featureSpace = sqlite
      .prepare(
        `SELECT id, name, default_version_id AS defaultVersionId, is_published AS isPublished
         FROM doc_spaces WHERE slug = 'nowen-note-features'`,
      )
      .get() as { id: string; name: string; defaultVersionId: string; isPublished: number };
    assert.equal(featureSpace.name, 'Nowen Note 功能介绍');
    assert.equal(featureSpace.isPublished, 1);
    assert.ok(featureSpace.defaultVersionId);

    const featureDocumentStats = sqlite
      .prepare(
        `SELECT COUNT(*) AS total, MAX(depth) AS maxDepth,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published
         FROM documents WHERE space_id = ?`,
      )
      .get(featureSpace.id) as { total: number; maxDepth: number; published: number };
    assert.equal(featureDocumentStats.total, 37);
    assert.equal(featureDocumentStats.maxDepth, 1);
    assert.equal(featureDocumentStats.published, 37);

    const featureIndexedCount = sqlite
      .prepare(
        `SELECT COUNT(*) AS total
         FROM documents_fts f
         JOIN documents d ON d.rowid = f.rowid
         WHERE d.space_id = ?`,
      )
      .get(featureSpace.id) as { total: number };
    assert.equal(featureIndexedCount.total, 37);

    const editorDoc = sqlite
      .prepare("SELECT title, path FROM documents WHERE id = 'doc_nn_feat_richtext'")
      .get() as { title: string; path: string };
    assert.equal(editorDoc.title, '富文本编辑器');
    assert.equal(editorDoc.path, 'editing/rich-text-editor');
  });
});
