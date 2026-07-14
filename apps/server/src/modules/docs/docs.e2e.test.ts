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
let helpCenterId = '';
let helpCenterSlug = '';
let sectionId = '';
let documentId = '';
let documentPath = '';

describe('foolproof project help center', () => {
  before(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'nowen-help-center-'));
    process.env.DATABASE_PATH = join(testDir, 'blog.sqlite');
    process.env.UPLOAD_DIR = join(testDir, 'uploads');
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_USERNAME = 'NOWEN';
    process.env.ADMIN_EMAIL = 'help@example.com';
    process.env.ADMIN_PASSWORD = 'help-center-test-password';
    process.env.SESSION_SECRET = 'help-center-session-secret-at-least-32-characters';

    const initModule = await import('../../db/init');
    const appModule = await import('../../app');
    const clientModule = await import('../../db/client');
    initModule.initDb();
    app = appModule.app;
    sqlite = clientModule.sqlite;

    const login = await app.request('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'NOWEN', password: 'help-center-test-password' }),
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

  test('admin creates one project help center without managing versions', async () => {
    const response = await app.request('/api/admin/help-centers', {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Nowen Note',
        description: 'Nowen Note 用户帮助中心',
        isPublished: true,
      }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    helpCenterId = body.id;
    helpCenterSlug = body.slug;
    assert.ok(body.helpCenterVersionId);
    assert.equal(body.defaultVersion.label, '帮助中心');

    const starter = sqlite
      .prepare("SELECT title, status FROM documents WHERE space_id = ? AND title = '开始使用' LIMIT 1")
      .get(helpCenterId) as { title: string; status: string };
    assert.equal(starter.status, 'draft');
  });

  test('admin creates a two-level section and article', async () => {
    const section = await app.request(`/api/admin/help-centers/${helpCenterId}/documents`, {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '基础功能',
        contentMd: '# 基础功能\n\n这里汇总基础功能说明。',
        status: 'published',
      }),
    });
    assert.equal(section.status, 201);
    const sectionBody = await section.json();
    sectionId = sectionBody.id;
    assert.equal(sectionBody.depth, 0);

    const document = await app.request(`/api/admin/help-centers/${helpCenterId}/documents`, {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: sectionId,
        title: 'Docker 部署',
        description: '使用 Docker Compose 部署 Nowen Note',
        contentMd: '# Docker 部署\n\n```yaml\nservices:\n  nowen-note:\n    image: cropflre/nowen-note\n```',
        status: 'published',
      }),
    });
    assert.equal(document.status, 201);
    const documentBody = await document.json();
    documentId = documentBody.id;
    documentPath = documentBody.path;
    assert.equal(documentBody.parentId, sectionId);
    assert.equal(documentBody.depth, 1);
  });

  test('the API rejects a third-level page', async () => {
    const response = await app.request(`/api/admin/help-centers/${helpCenterId}/documents`, {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: documentId,
        title: '不允许的第三级',
        contentMd: '# 第三级',
        status: 'published',
      }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /最多二级/);
  });

  test('public help center exposes a two-level tree, direct page and search', async () => {
    const centers = await app.request('/api/help-centers');
    assert.equal(centers.status, 200);
    const centersBody = await centers.json();
    assert.equal(centersBody.items[0].slug, helpCenterSlug);

    const tree = await app.request(`/api/help-centers/${helpCenterSlug}/tree`);
    assert.equal(tree.status, 200);
    const treeBody = await tree.json();
    assert.equal(treeBody.items.find((item: { id: string }) => item.id === sectionId).depth, 0);
    assert.equal(treeBody.items.find((item: { id: string }) => item.id === documentId).depth, 1);

    const page = await app.request(
      `/api/help-centers/${helpCenterSlug}/page?path=${encodeURIComponent(documentPath)}`,
    );
    assert.equal(page.status, 200);
    const pageBody = await page.json();
    assert.equal(pageBody.page.id, documentId);

    const search = await app.request(`/api/help-centers/search?q=${encodeURIComponent('Docker')}`);
    assert.equal(search.status, 200);
    const searchBody = await search.json();
    assert.equal(searchBody.items[0].id, documentId);
  });

  test('document updates create revision snapshots', async () => {
    const update = await app.request(`/api/admin/help-centers/documents/${documentId}`, {
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
      headers: { 'Content-Type': 'application/json', 'x-visitor-id': 'help-center-reader' },
      body: JSON.stringify({ helpful: true }),
    });
    assert.equal(response.status, 200);
    const row = sqlite
      .prepare('SELECT helpful FROM document_feedback WHERE document_id = ? LIMIT 1')
      .get(documentId) as { helpful: number };
    assert.equal(row.helpful, 1);
  });
});
