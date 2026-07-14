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
    assert.equal('repositoryFullName' in body, false);
    assert.equal('sourceMode' in body, false);

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

  test('AI agent creates reviewable changes and only applies drafts', async () => {
    sqlite
      .prepare(
        `UPDATE ai_settings SET enabled = 1, provider = 'ollama',
         api_url = 'https://ai.test/v1', api_key = NULL, model = 'test-model'
         WHERE id = 'default'`,
      )
      .run();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === 'https://ai.test/v1/chat/completions') {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: '补充安装栏目和新手安装文章。',
                    documents: [
                      {
                        title: '安装与部署',
                        parentTitle: null,
                        description: '选择适合自己的安装方式。',
                        contentMd: '# 安装与部署\n\n请选择适合自己的安装方式。',
                      },
                      {
                        title: '新手安装',
                        parentTitle: '安装与部署',
                        description: '第一次安装时按顺序完成这些步骤。',
                        contentMd: '# 新手安装\n\n1. 准备设备。\n2. 按页面提示完成安装。\n\n> 具体按钮名称需要管理员确认。',
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return originalFetch(input);
    }) as typeof fetch;

    try {
      const create = await app.request(`/api/admin/help-centers/${helpCenterId}/agent-runs`, {
        method: 'POST',
        headers: { cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'audit_help_center',
          prompt: '检查并补齐面向新手的安装文档。',
        }),
      });
      assert.equal(create.status, 201);
      const run = await create.json();
      assert.equal(run.status, 'reviewing');
      assert.equal(run.changes.length, 2);
      assert.ok(run.changes.every((change: { status: string }) => change.status === 'pending'));

      const beforeApply = sqlite
        .prepare("SELECT COUNT(*) AS total FROM documents WHERE space_id = ? AND source_type = 'ai'")
        .get(helpCenterId) as { total: number };
      assert.equal(beforeApply.total, 0);

      const apply = await app.request(`/api/admin/help-centers/${helpCenterId}/agent-runs/${run.id}/apply`, {
        method: 'POST',
        headers: { cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeIds: run.changes.map((change: { id: string }) => change.id) }),
      });
      assert.equal(apply.status, 200);
      const appliedRun = await apply.json();
      assert.equal(appliedRun.status, 'completed');

      const generated = sqlite
        .prepare(
          `SELECT title, status, depth, source_type AS sourceType
           FROM documents WHERE space_id = ? AND source_type = 'ai' ORDER BY depth ASC`,
        )
        .all(helpCenterId) as Array<{ title: string; status: string; depth: number; sourceType: string }>;
      assert.deepEqual(generated.map((item) => item.title), ['安装与部署', '新手安装']);
      assert.ok(generated.every((item) => item.status === 'draft'));
      assert.deepEqual(generated.map((item) => item.depth), [0, 1]);

      const publicTree = await app.request(`/api/help-centers/${helpCenterSlug}/tree`);
      const publicTreeBody = await publicTree.json();
      assert.equal(publicTreeBody.items.some((item: { title: string }) => item.title === '新手安装'), false);
    } finally {
      globalThis.fetch = originalFetch;
    }
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
