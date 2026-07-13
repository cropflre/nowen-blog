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
    assert.equal(migrationCount.total, 5);

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
    ]) {
      const row = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE name = ?")
        .get(table) as { name: string } | undefined;
      assert.equal(row?.name, table);
    }

    const settings = sqlite
      .prepare("SELECT site_title AS siteTitle FROM site_settings WHERE id = 'site'")
      .get() as { siteTitle: string };
    assert.equal(settings.siteTitle, 'NOWEN Blog');
  });
});
