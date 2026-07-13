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
let spaceId = '';
let spaceSlug = '';
let versionId = '';
let version = '';
let documentId = '';

describe('documentation center', () => {
  before(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'nowen-docs-'));
    process.env.DATABASE_PATH = join(testDir, 'blog.sqlite');
    process.env.UPLOAD_DIR = join(testDir, 'uploads');
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_USERNAME = 'NOWEN';
    process.env.ADMIN_EMAIL = 'docs@example.com';
    process.env.ADMIN_PASSWORD = 'docs-test-password';
    process.env.SESSION_SECRET = 'docs-test-session-secret-at-least-32-characters';

    const initModule = await import('../../db/init');
    const appModule = await import('../../app');
    const clientModule = await import('../../db/client');
    initModule.initDb();
    app = appModule.app;
    sqlite = clientModule.sqlite;

    const login = await app.request('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'NOWEN', password: 'docs-test-password' }),
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

  test('admin creates a documentation space with a default version', async () => {
    const response = await app.request('/api/admin/docs/spaces', {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Nowen Note',
        slug: 'nowen-note',
        description: 'Nowen Note official documentation',
        isPublished: true,
      }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    spaceId = body.id;
    spaceSlug = body.slug;
    versionId = body.versions[0].id;
    version = body.versions[0].version;
    assert.equal(version, 'latest');
    assert.equal(body.versions[0].isDefault, true);
  });

  test('admin publishes a nested-ready Markdown document', async () => {
    const response = await app.request('/api/admin/docs/documents', {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaceId,
        versionId,
        title: 'Docker 部署',
        path: 'deployment/docker',
        description: '使用 Docker Compose 部署 Nowen Note',
        contentMd: '# Docker 部署\n\n```yaml\nservices:\n  nowen-note:\n    image: cropflre/nowen-note\n```',
        status: 'published',
        visibility: 'public',
      }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    documentId = body.id;
    assert.equal(body.path, 'deployment/docker');
    assert.ok(body.publishedAt);
  });

  test('public docs endpoints expose spaces, tree, page and search', async () => {
    const spaces = await app.request('/api/docs/spaces');
    assert.equal(spaces.status, 200);
    const spacesBody = await spaces.json();
    assert.equal(spacesBody.items[0].slug, spaceSlug);
    assert.equal(spacesBody.items[0].documentCount, 1);

    const tree = await app.request(`/api/docs/${spaceSlug}/${version}/tree`);
    assert.equal(tree.status, 200);
    const treeBody = await tree.json();
    assert.equal(treeBody.items[0].title, 'Docker 部署');

    const page = await app.request(
      `/api/docs/${spaceSlug}/${version}/page?path=${encodeURIComponent('deployment/docker')}`,
    );
    assert.equal(page.status, 200);
    const pageBody = await page.json();
    assert.equal(pageBody.page.id, documentId);

    const search = await app.request(`/api/docs/search?q=${encodeURIComponent('Docker')}`);
    assert.equal(search.status, 200);
    const searchBody = await search.json();
    assert.equal(searchBody.items[0].id, documentId);
  });

  test('document updates create revision snapshots', async () => {
    const update = await app.request(`/api/admin/docs/documents/${documentId}`, {
      method: 'PATCH',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Docker Compose 部署', status: 'published' }),
    });
    assert.equal(update.status, 200);
    const revisions = sqlite
      .prepare('SELECT COUNT(*) AS total FROM document_revisions WHERE document_id = ?')
      .get(documentId) as { total: number };
    assert.equal(revisions.total, 1);
  });

  test('public readers can submit helpfulness feedback', async () => {
    const response = await app.request(`/api/docs/documents/${documentId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-visitor-id': 'docs-test-reader' },
      body: JSON.stringify({ helpful: true }),
    });
    assert.equal(response.status, 200);
    const row = sqlite
      .prepare('SELECT helpful FROM document_feedback WHERE document_id = ? LIMIT 1')
      .get(documentId) as { helpful: number };
    assert.equal(row.helpful, 1);
  });
});
