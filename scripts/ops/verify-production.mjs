import { assertTransportSafety, booleanArg, normalizeBaseUrl, parseArgs, request } from './lib.mjs';

const args = parseArgs();
const baseUrl = normalizeBaseUrl(args['base-url'] || process.env.BASE_URL || 'http://127.0.0.1:8080');
const allowHttp = booleanArg(args['allow-http'], false);
assertTransportSafety(baseUrl, allowHttp);

const checks = [];

async function check(name, action) {
  const startedAt = Date.now();
  try {
    const detail = await action();
    checks.push({ name, ok: true, durationMs: Date.now() - startedAt, detail });
  } catch (error) {
    checks.push({
      name,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function fetchText(path, expectedContentType) {
  const response = await request(`${baseUrl}${path}`);
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} 返回 ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (expectedContentType && !contentType.includes(expectedContentType)) {
    throw new Error(`${path} Content-Type 异常：${contentType || '未设置'}`);
  }
  return { response, text, contentType };
}

await check('Nginx healthz', async () => {
  const { text } = await fetchText('/healthz', 'text/plain');
  if (text.trim() !== 'ok') throw new Error(`healthz 响应异常：${text.slice(0, 80)}`);
  return 'ok';
});

await check('站点设置 API', async () => {
  const { text } = await fetchText('/api/site-settings', 'application/json');
  const body = JSON.parse(text);
  if (!body?.siteTitle || !body?.authorName) throw new Error('站点设置缺少 siteTitle 或 authorName');
  return { siteTitle: body.siteTitle, authorName: body.authorName };
});

await check('项目公开 API', async () => {
  const { text } = await fetchText('/api/projects', 'application/json');
  const body = JSON.parse(text);
  if (!Array.isArray(body?.items)) throw new Error('项目接口未返回 items 数组');
  return { projects: body.items.length };
});

await check('首页与安全响应头', async () => {
  const { response, text } = await fetchText('/', 'text/html');
  if (!text.includes('id="root"')) throw new Error('首页缺少 React root 容器');
  const requiredHeaders = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'SAMEORIGIN',
    'referrer-policy': 'strict-origin-when-cross-origin',
  };
  for (const [name, expected] of Object.entries(requiredHeaders)) {
    const actual = response.headers.get(name);
    if (actual !== expected) throw new Error(`${name} 期望 ${expected}，实际 ${actual || '未设置'}`);
  }
  return 'HTML 与基础安全头正常';
});

await check('SPA 路由回退', async () => {
  const { text } = await fetchText('/projects', 'text/html');
  if (!text.includes('id="root"')) throw new Error('/projects 未返回可启动的页面');
  return 'projects route ok';
});

await check('RSS', async () => {
  const { text } = await fetchText('/rss.xml', 'xml');
  if (!/<rss[\s>]/i.test(text)) throw new Error('RSS XML 缺少 rss 根节点');
  return 'rss.xml ok';
});

await check('Sitemap', async () => {
  const { text } = await fetchText('/sitemap.xml', 'xml');
  if (!/<urlset[\s>]/i.test(text)) throw new Error('Sitemap 缺少 urlset 根节点');
  if (!text.includes('/projects')) throw new Error('Sitemap 尚未收录 /projects');
  return 'sitemap.xml ok';
});

await check('robots.txt', async () => {
  const { text } = await fetchText('/robots.txt', 'text/plain');
  if (!/^User-agent:/im.test(text) || !/^Sitemap:/im.test(text)) {
    throw new Error('robots.txt 缺少 User-agent 或 Sitemap');
  }
  return 'robots.txt ok';
});

const failed = checks.filter((item) => !item.ok);
const report = {
  checkedAt: new Date().toISOString(),
  baseUrl,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length > 0) process.exitCode = 1;
