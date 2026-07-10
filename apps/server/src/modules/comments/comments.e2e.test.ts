import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { eq } from 'drizzle-orm';

let testDir: string;
let testDb: string;
let initDb: any;
let app: any;
let db: any;
let schema: any;
let testAuthorId: string;

describe('Comments E2E Tests', () => {
  before(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'nowen-comments-'));
    testDb = join(testDir, 'blog.sqlite');

    process.env.DATABASE_PATH = testDb;
    process.env.SESSION_SECRET = 'test-session-secret';
    process.env.ADMIN_USERNAME = 'NOWEN';
    process.env.ADMIN_PASSWORD = 'test-password';
    process.env.IP_SALT = 'test-ip-salt';
    process.env.NODE_ENV = 'test';

    const initDbModule = await import('../../db/init');
    const appModule = await import('../../app');
    const dbModule = await import('../../db/client');
    const schemaModule = await import('../../db/schema');

    initDb = initDbModule.initDb;
    app = appModule.app;
    db = dbModule.db;
    schema = schemaModule;

    initDb();

    // 创建测试用户
    const { randomId, nowIso } = await import('../../lib/format');
    testAuthorId = randomId('u_');
    db.insert(schema.users).values({
      id: testAuthorId,
      username: 'testauthor',
      email: 'test@example.com',
      passwordHash: 'hash',
      role: 'admin',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }).run();
  });

  after(async () => {
    try { db.close?.(); } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 100));
    if (existsSync(testDir)) {
      try { rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  async function createTestPost(status: string, visibility: string, slug: string) {
    const { randomId, nowIso } = await import('../../lib/format');
    const postId = randomId('p_');
    db.insert(schema.posts).values({
      id: postId,
      title: `Test ${slug}`,
      slug,
      contentMd: 'Test',
      status,
      visibility,
      authorId: testAuthorId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }).run();
    return postId;
  }

  async function submitComment(slug: string, ip: string) {
    return await app.request(`/api/posts/${slug}/comments`, {
      method: 'POST',
      headers: { 'x-forwarded-for': ip, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorName: 'Test',
        authorEmail: 'test@example.com',
        content: 'Test comment content here',
      }),
    });
  }

  async function login() {
    const res = await app.request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'NOWEN', password: 'test-password' }),
    });
    return res.headers.get('set-cookie');
  }

  // ==================== 简化测试 ====================

  test('1. comments 表通过 initDb 自动创建', () => {
    // 查询 sqlite_master 确认 comments 表真实存在
    const result = db.all(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'comments'`);
    assert.equal(result.length, 1, 'comments table should exist in sqlite_master');
    assert.equal(result[0].name, 'comments');
  });

  test('2. 不存在文章提交评论返回 404', async () => {
    const res = await submitComment('non-existent', '10.0.0.1');
    assert.equal(res.status, 404);
  });

  test('3. published + public 文章提交成功', async () => {
    const slug = 'test-' + Date.now();
    await createTestPost('published', 'public', slug);
    const res = await submitComment(slug, '10.0.0.2');
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.id, 'Should return comment id');
  });

  test('4. 未登录后台返回 401', async () => {
    const res = await app.request('/api/admin/comments');
    assert.equal(res.status, 401);
  });

  test('5. 后台登录成功', async () => {
    const res = await app.request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'NOWEN', password: 'test-password' }),
    });
    assert.equal(res.status, 200);
  });

  test('6. pending 评论不出现在公开列表', async () => {
    const slug = 'pending-' + Date.now();
    await createTestPost('published', 'public', slug);
    await submitComment(slug, '10.0.0.6');

    const res = await app.request(`/api/posts/${slug}/comments`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.items.length, 0);
  });

  test('7. draft 文章提交评论被拒绝', async () => {
    const slug = 'draft-' + Date.now();
    await createTestPost('draft', 'public', slug);
    const res = await submitComment(slug, '10.0.0.7');
    assert.equal(res.status, 404);
  });

  test('8. private 文章提交评论被拒绝', async () => {
    const slug = 'private-' + Date.now();
    await createTestPost('published', 'private', slug);
    const res = await submitComment(slug, '10.0.0.8');
    assert.equal(res.status, 404);
  });

  test('9. 登录后后台列表能看到 pending 评论', async () => {
    const slug = 'admin-list-' + Date.now();
    await createTestPost('published', 'public', slug);
    await submitComment(slug, '10.0.0.9');

    const cookie = await login();
    const res = await app.request('/api/admin/comments', { headers: { cookie } });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.items.length >= 1);
  });

  test('10. approve 后公开列表能看到评论', async () => {
    const slug = 'approve-' + Date.now();
    await createTestPost('published', 'public', slug);
    const submitRes = await submitComment(slug, '10.0.0.10');
    const commentId = (await submitRes.json()).id;

    const cookie = await login();
    await app.request(`/api/admin/comments/${commentId}/approve`, {
      method: 'POST',
      headers: { cookie },
    });

    const res = await app.request(`/api/posts/${slug}/comments`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.items.length, 1);
  });

  test('11. 公开结果不含敏感字段', async () => {
    const slug = 'fields-' + Date.now();
    await createTestPost('published', 'public', slug);
    const submitRes = await submitComment(slug, '10.0.0.11');
    const commentId = (await submitRes.json()).id;

    const cookie = await login();
    await app.request(`/api/admin/comments/${commentId}/approve`, {
      method: 'POST',
      headers: { cookie },
    });

    const res = await app.request(`/api/posts/${slug}/comments`);
    const body = await res.json();
    const comment = body.items[0];
    assert.ok(!('authorEmail' in comment));
    assert.ok(!('ipHash' in comment));
    assert.ok(!('userAgent' in comment));
  });

  test('12. reject 后公开列表不可见', async () => {
    const slug = 'reject-' + Date.now();
    await createTestPost('published', 'public', slug);
    const submitRes = await submitComment(slug, '10.0.0.12');
    const commentId = (await submitRes.json()).id;

    const cookie = await login();
    await app.request(`/api/admin/comments/${commentId}/reject`, {
      method: 'POST',
      headers: { cookie },
    });

    const res = await app.request(`/api/posts/${slug}/comments`);
    const body = await res.json();
    assert.equal(body.items.length, 0);
  });

  test('13. DELETE 软删后公开列表不可见', async () => {
    const slug = 'delete-' + Date.now();
    await createTestPost('published', 'public', slug);
    const submitRes = await submitComment(slug, '10.0.0.13');
    const commentId = (await submitRes.json()).id;

    const cookie = await login();
    await app.request(`/api/admin/comments/${commentId}/approve`, {
      method: 'POST',
      headers: { cookie },
    });
    await app.request(`/api/admin/comments/${commentId}`, {
      method: 'DELETE',
      headers: { cookie },
    });

    const res = await app.request(`/api/posts/${slug}/comments`);
    const body = await res.json();
    assert.equal(body.items.length, 0);

    const dbRow = db.select().from(schema.comments).where(eq(schema.comments.id, commentId)).get();
    assert.ok(dbRow);
    assert.ok(dbRow.deletedAt);
  });

  test('14. authorName 校验生效', async () => {
    const slug = 'validation-' + Date.now();
    await createTestPost('published', 'public', slug);

    const res1 = await app.request(`/api/posts/${slug}/comments`, {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.14', 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName: 'A', authorEmail: 'test@example.com', content: 'Test content here' }),
    });
    assert.equal(res1.status, 400);
  });

  test('15. authorEmail 校验生效', async () => {
    const slug = 'email-' + Date.now();
    await createTestPost('published', 'public', slug);

    const res = await app.request(`/api/posts/${slug}/comments`, {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.15', 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName: 'Test', authorEmail: 'invalid', content: 'Test content here' }),
    });
    assert.equal(res.status, 400);
  });

  test('16. content 长度校验生效', async () => {
    const slug = 'content-' + Date.now();
    await createTestPost('published', 'public', slug);

    const res1 = await app.request(`/api/posts/${slug}/comments`, {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.16', 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName: 'Test', authorEmail: 'test@example.com', content: 'short' }),
    });
    assert.equal(res1.status, 400);
  });

  test('17. HTML 内容被转义', async () => {
    const slug = 'xss-' + Date.now();
    await createTestPost('published', 'public', slug);
    const submitRes = await app.request(`/api/posts/${slug}/comments`, {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.17', 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName: 'Test', authorEmail: 'test@example.com', content: '<script>alert(1)</script>' }),
    });
    const commentId = (await submitRes.json()).id;

    const cookie = await login();
    await app.request(`/api/admin/comments/${commentId}/approve`, {
      method: 'POST',
      headers: { cookie },
    });

    const res = await app.request(`/api/posts/${slug}/comments`);
    const body = await res.json();
    assert.ok(!body.items[0].content.includes('<script>'));
  });

  test('18. 频率限制生效', async () => {
    const slug = 'ratelimit-' + Date.now();
    await createTestPost('published', 'public', slug);

    for (let i = 0; i < 5; i++) {
      await submitComment(slug, '10.99.99.99');
    }

    const res6 = await submitComment(slug, '10.99.99.99');
    assert.equal(res6.status, 429);
  });

  test('19. 不存在 postSlug 筛选返回空列表', async () => {
    const cookie = await login();
    const res = await app.request('/api/admin/comments?postSlug=non-existent', {
      headers: { cookie },
    });
    const body = await res.json();
    assert.equal(body.items.length, 0);
  });

  test('20. 非法参数返回 400', async () => {
    const cookie = await login();

    const res1 = await app.request('/api/admin/comments?page=0', {
      headers: { cookie },
    });
    assert.equal(res1.status, 400);
  });

  test('21. 网站地址协议校验', async () => {
    const slug = 'website-' + Date.now();
    await createTestPost('published', 'public', slug);

    const res1 = await app.request(`/api/posts/${slug}/comments`, {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.21', 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName: 'Test', authorEmail: 'test@example.com', content: 'Test content', authorWebsite: 'javascript:alert(1)' }),
    });
    assert.equal(res1.status, 400);
  });

  test('22. PATCH 状态变更时 approvedAt 一致', async () => {
    const slug = 'approvedat-' + Date.now();
    await createTestPost('published', 'public', slug);
    const submitRes = await submitComment(slug, '10.0.0.22');
    const commentId = (await submitRes.json()).id;

    const cookie = await login();

    await app.request(`/api/admin/comments/${commentId}`, {
      method: 'PATCH',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
    let comment = await app.request(`/api/admin/comments/${commentId}`, {
      headers: { cookie },
    });
    let body = await comment.json();
    assert.equal(body.status, 'approved');
    assert.ok(body.approvedAt);
  });
});
