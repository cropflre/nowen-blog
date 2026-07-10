import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

type ClientModule = typeof import('../../db/client');

let testDir = '';
let sqlite: ClientModule['sqlite'];
let app: typeof import('../../app')['app'];
let cookie = '';

describe('admin post mutation resilience', () => {
  before(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'nowen-admin-posts-'));
    process.env.DATABASE_PATH = join(testDir, 'blog.sqlite');
    process.env.UPLOAD_DIR = join(testDir, 'uploads');
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_USERNAME = 'NOWEN';
    process.env.ADMIN_EMAIL = 'admin-posts@example.com';
    process.env.ADMIN_PASSWORD = 'admin-posts-test-password';
    process.env.SESSION_SECRET = 'admin-posts-test-session-secret-at-least-32-characters';

    const initModule = await import('../../db/init');
    const appModule = await import('../../app');
    const clientModule = await import('../../db/client');
    initModule.initDb();
    app = appModule.app;
    sqlite = clientModule.sqlite;

    const login = await app.request('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'NOWEN', password: 'admin-posts-test-password' }),
    });
    assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie') ?? '';
    assert.ok(cookie);
  });

  after(() => {
    try {
      sqlite?.close();
    } finally {
      if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('returns 201 after the core post insert even when search and history maintenance fail', async () => {
    // Reproduce the production symptom: the core posts table is writable, while optional
    // derived/audit tables are temporarily unavailable after the insert succeeds.
    sqlite.exec('DROP TABLE posts_fts; DROP TABLE post_versions;');

    const response = await app.request('/api/admin/posts', {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '辅助任务失败时仍成功创建',
        contentMd: '# 正文\n\n文章主记录应正常返回。',
        status: 'draft',
        visibility: 'public',
        categoryIds: [],
        tagIds: [],
      }),
    });

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.ok(body.id);
    assert.equal(body.title, '辅助任务失败时仍成功创建');
    assert.equal(body.status, 'draft');

    const row = sqlite
      .prepare('SELECT id, title, status FROM posts WHERE id = ? LIMIT 1')
      .get(body.id) as { id: string; title: string; status: string } | undefined;
    assert.ok(row);
    assert.equal(row.title, '辅助任务失败时仍成功创建');
    assert.equal(row.status, 'draft');
  });
});
