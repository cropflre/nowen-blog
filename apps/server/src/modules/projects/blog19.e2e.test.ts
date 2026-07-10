import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

type ClientModule = typeof import('../../db/client');

let testDir = '';
let sqlite: ClientModule['sqlite'];
let app: typeof import('../../app')['app'];
let createUnsubscribeToken: typeof import('../newsletter/newsletter.service')['createUnsubscribeToken'];
let cookie = '';
let projectId = '';

describe('BLOG-19 projects and newsletter', () => {
  before(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'nowen-blog19-'));
    process.env.DATABASE_PATH = join(testDir, 'blog.sqlite');
    process.env.UPLOAD_DIR = join(testDir, 'uploads');
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_USERNAME = 'NOWEN';
    process.env.ADMIN_EMAIL = 'blog19@example.com';
    process.env.ADMIN_PASSWORD = 'blog19-test-password';
    process.env.SESSION_SECRET = 'blog19-test-session-secret-at-least-32-characters';
    delete process.env.RESEND_API_KEY;
    delete process.env.NEWSLETTER_FROM_EMAIL;

    const initModule = await import('../../db/init');
    const appModule = await import('../../app');
    const clientModule = await import('../../db/client');
    const newsletterService = await import('../newsletter/newsletter.service');
    initModule.initDb();
    app = appModule.app;
    sqlite = clientModule.sqlite;
    createUnsubscribeToken = newsletterService.createUnsubscribeToken;

    const login = await app.request('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'NOWEN', password: 'blog19-test-password' }),
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

  test('public project list starts empty', async () => {
    const response = await app.request('/api/projects');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.items, []);
  });

  test('admin can create and publish a manual project', async () => {
    const response = await app.request('/api/admin/projects', {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'NOWEN Test Project',
        description: 'Project integration test',
        repositoryUrl: 'https://github.com/cropflre/nowen-blog',
        language: 'TypeScript',
        topics: ['react', 'typescript'],
        isFeatured: true,
        isPublished: true,
      }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    projectId = body.id;
    assert.ok(projectId);
    assert.equal(body.isFeatured, true);

    const publicResponse = await app.request('/api/projects');
    const publicBody = await publicResponse.json();
    assert.equal(publicBody.items.length, 1);
    assert.equal(publicBody.items[0].name, 'NOWEN Test Project');
  });

  test('hidden projects are excluded from the public endpoint', async () => {
    const response = await app.request(`/api/admin/projects/${projectId}`, {
      method: 'PATCH',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: false }),
    });
    assert.equal(response.status, 200);

    const publicResponse = await app.request('/api/projects');
    const publicBody = await publicResponse.json();
    assert.equal(publicBody.items.length, 0);
  });

  test('newsletter subscribe is idempotent and visible to admin', async () => {
    for (let index = 0; index < 2; index += 1) {
      const response = await app.request('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.20.30.40' },
        body: JSON.stringify({ email: 'reader@example.com', source: 'test', website: '' }),
      });
      assert.equal(response.status, 201);
    }

    const count = sqlite
      .prepare("SELECT COUNT(*) AS total FROM newsletter_subscribers WHERE email = 'reader@example.com'")
      .get() as { total: number };
    assert.equal(count.total, 1);

    const adminResponse = await app.request('/api/admin/newsletter', { headers: { cookie } });
    assert.equal(adminResponse.status, 200);
    const adminBody = await adminResponse.json();
    assert.equal(adminBody.stats.active, 1);
    assert.equal(adminBody.items[0].email, 'reader@example.com');
    assert.equal(adminBody.providerConfigured, false);
  });

  test('signed unsubscribe token disables the subscription', async () => {
    const token = createUnsubscribeToken('reader@example.com');
    const response = await app.request('/api/newsletter/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    assert.equal(response.status, 200);

    const row = sqlite
      .prepare("SELECT status, unsubscribed_at AS unsubscribedAt FROM newsletter_subscribers WHERE email = 'reader@example.com'")
      .get() as { status: string; unsubscribedAt: string | null };
    assert.equal(row.status, 'unsubscribed');
    assert.ok(row.unsubscribedAt);
  });

  test('newsletter delivery reports missing provider configuration', async () => {
    const post = sqlite
      .prepare("SELECT id FROM posts WHERE status = 'published' AND visibility = 'public' LIMIT 1")
      .get() as { id: string };
    const response = await app.request('/api/admin/newsletter/send-post', {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /邮件服务未配置/);
  });
});
