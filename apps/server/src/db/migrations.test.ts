import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

type ClientModule = typeof import('./client');

let testDir = '';
let testDb = '';
let sqlite: ClientModule['sqlite'];
let initDb: () => void;
let runMigrations: () => void;
let ensureNowenNoteApiDocs: () => void;
let ensureNowenNoteHelpDocs: () => void;

function createLegacyDatabase(path: string): void {
  const legacy = new Database(path);
  legacy.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      avatar_url TEXT,
      bio TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      summary TEXT,
      content_md TEXT NOT NULL,
      content_html TEXT,
      cover_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      reading_time INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT,
      seo_description TEXT,
      canonical_url TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      author_id TEXT NOT NULL REFERENCES users(id)
    );
    INSERT INTO users (
      id, username, password_hash, role, created_at, updated_at
    ) VALUES ('legacy-user', 'legacy', 'hash', 'admin', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
    INSERT INTO posts (
      id, title, slug, content_md, status, created_at, updated_at, author_id
    ) VALUES (
      'legacy-post', 'Legacy post', 'legacy-post', '# Legacy', 'draft',
      '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'legacy-user'
    );
  `);
  legacy.close();
}

describe('Drizzle migration system', () => {
  before(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'nowen-migrations-'));
    testDb = join(testDir, 'blog.sqlite');
    createLegacyDatabase(testDb);

    process.env.DATABASE_PATH = testDb;
    process.env.UPLOAD_DIR = join(testDir, 'uploads');
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_PASSWORD = 'migration-test-password';
    process.env.SESSION_SECRET = 'migration-test-session-secret';

    const initModule = await import('./init');
    const migrateModule = await import('./migrate');
    const clientModule = await import('./client');
    const nowenNoteApiSeedModule = await import('./seed-nowen-note-api');
    const nowenNoteHelpSeedModule = await import('./seed-nowen-note-help');
    initDb = initModule.initDb;
    runMigrations = migrateModule.runMigrations;
    sqlite = clientModule.sqlite;
    ensureNowenNoteApiDocs = nowenNoteApiSeedModule.ensureNowenNoteApiDocs;
    ensureNowenNoteHelpDocs = nowenNoteHelpSeedModule.ensureNowenNoteHelpDocs;
  });

  after(() => {
    try {
      sqlite?.close();
    } finally {
      if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('upgrades a legacy database and records all migrations', () => {
    initDb();

    const postColumns = sqlite.prepare('PRAGMA table_info(posts)').all() as Array<{ name: string }>;
    assert.ok(postColumns.some((column) => column.name === 'visibility'));
    assert.ok(postColumns.some((column) => column.name === 'scheduled_at'));

    const requiredTables = [
      'site_settings',
      'comments',
      'post_views',
      'post_versions',
      'post_autosaves',
      'posts_fts',
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
    ];
    for (const table of requiredTables) {
      const row = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE name = ? LIMIT 1")
        .get(table) as { name: string } | undefined;
      assert.equal(row?.name, table);
    }

    const migrationCount = sqlite
      .prepare('SELECT COUNT(*) AS total FROM __drizzle_migrations')
      .get() as { total: number };
    assert.equal(migrationCount.total, 7);

    const apiSpace = sqlite
      .prepare("SELECT id FROM doc_spaces WHERE slug = 'nowen-note-api'")
      .get() as { id: string } | undefined;
    assert.ok(apiSpace?.id);

    const helpSpace = sqlite
      .prepare("SELECT id FROM doc_spaces WHERE slug = 'nowen-note-help'")
      .get() as { id: string } | undefined;
    assert.ok(helpSpace?.id);
  });

  test('is idempotent when migrations and documentation bootstraps run again', () => {
    runMigrations();
    runMigrations();
    ensureNowenNoteApiDocs();
    ensureNowenNoteApiDocs();
    ensureNowenNoteHelpDocs();
    ensureNowenNoteHelpDocs();

    const migrationCount = sqlite
      .prepare('SELECT COUNT(*) AS total FROM __drizzle_migrations')
      .get() as { total: number };
    assert.equal(migrationCount.total, 7);

    const apiSpaceCount = sqlite
      .prepare("SELECT COUNT(*) AS total FROM doc_spaces WHERE slug = 'nowen-note-api'")
      .get() as { total: number };
    assert.equal(apiSpaceCount.total, 1);

    const apiDocumentCount = sqlite
      .prepare(
        `SELECT COUNT(*) AS total FROM documents
         WHERE space_id = (SELECT id FROM doc_spaces WHERE slug = 'nowen-note-api')`,
      )
      .get() as { total: number };
    assert.equal(apiDocumentCount.total, 19);

    const helpSpaceCount = sqlite
      .prepare("SELECT COUNT(*) AS total FROM doc_spaces WHERE slug = 'nowen-note-help'")
      .get() as { total: number };
    assert.equal(helpSpaceCount.total, 1);

    const helpDocumentCount = sqlite
      .prepare(
        `SELECT COUNT(*) AS total FROM documents
         WHERE space_id = (SELECT id FROM doc_spaces WHERE slug = 'nowen-note-help')`,
      )
      .get() as { total: number };
    assert.equal(helpDocumentCount.total, 28);

    const legacyPost = sqlite
      .prepare('SELECT title, visibility FROM posts WHERE id = ?')
      .get('legacy-post') as { title: string; visibility: string };
    assert.equal(legacyPost.title, 'Legacy post');
    assert.equal(legacyPost.visibility, 'public');
  });
});
