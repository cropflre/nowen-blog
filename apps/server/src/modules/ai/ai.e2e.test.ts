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
const originalFetch = globalThis.fetch;

describe('AI writing assistant', () => {
  before(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'nowen-ai-'));
    process.env.DATABASE_PATH = join(testDir, 'blog.sqlite');
    process.env.UPLOAD_DIR = join(testDir, 'uploads');
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_USERNAME = 'NOWEN';
    process.env.ADMIN_EMAIL = 'ai@example.com';
    process.env.ADMIN_PASSWORD = 'ai-test-password';
    process.env.SESSION_SECRET = 'ai-test-session-secret-at-least-32-characters';

    const initModule = await import('../../db/init');
    const appModule = await import('../../app');
    const clientModule = await import('../../db/client');
    initModule.initDb();
    app = appModule.app;
    sqlite = clientModule.sqlite;

    const login = await app.request('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'NOWEN', password: 'ai-test-password' }),
    });
    assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie') ?? '';
    assert.ok(cookie);
  });

  after(() => {
    globalThis.fetch = originalFetch;
    try {
      sqlite?.close();
    } finally {
      if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('requires admin authentication', async () => {
    const response = await app.request('/api/admin/ai/settings');
    assert.equal(response.status, 401);
  });

  test('stores settings without returning the API key and generates a clean title', async () => {
    const saveResponse = await app.request('/api/admin/ai/settings', {
      method: 'PUT',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        provider: 'custom',
        apiUrl: 'https://ai.example.test/v1',
        apiKey: 'test-secret-key-1234',
        model: 'nowen-test-model',
        systemPrompt: '你是测试写作助手。',
      }),
    });
    assert.equal(saveResponse.status, 200);
    const saved = await saveResponse.json();
    assert.equal(saved.apiKeySet, true);
    assert.match(saved.apiKeyMasked, /1234$/);
    assert.equal('apiKey' in saved, false);

    const row = sqlite
      .prepare("SELECT api_key AS apiKey FROM ai_settings WHERE id = 'default'")
      .get() as { apiKey: string };
    assert.match(row.apiKey, /^enc:v1:/);
    assert.notEqual(row.apiKey, 'test-secret-key-1234');

    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith('/models')) {
        return new Response(JSON.stringify({ data: [{ id: 'nowen-test-model' }, { id: 'other-model' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const body = JSON.parse(String(init?.body ?? '{}')) as { messages?: Array<{ content?: string }> };
      const prompt = body.messages?.map((message) => message.content ?? '').join('\n') ?? '';
      const content = prompt.includes('连接测试')
        ? 'OK'
        : '<think>分析标题方向</think>\n最终标题：AI 驱动的博客写作流程';
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const testResponse = await app.request('/api/admin/ai/test', {
      method: 'POST',
      headers: { cookie },
    });
    assert.equal(testResponse.status, 200);

    const modelsResponse = await app.request('/api/admin/ai/models', { headers: { cookie } });
    assert.equal(modelsResponse.status, 200);
    const models = await modelsResponse.json();
    assert.deepEqual(models.items, ['nowen-test-model', 'other-model']);

    const generateResponse = await app.request('/api/admin/ai/generate', {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'title',
        text: '# AI 写作\n\n介绍如何在博客中使用 AI。',
        context: '当前标题：草稿',
      }),
    });
    assert.equal(generateResponse.status, 200);
    const result = await generateResponse.json();
    assert.equal(result.fields.title, 'AI 驱动的博客写作流程');
    assert.doesNotMatch(result.text, /think|分析标题方向/);
  });
});
