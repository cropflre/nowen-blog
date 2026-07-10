import { setTimeout as sleep } from 'node:timers/promises';

export function parseArgs(argv = process.argv.slice(2)) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const raw = token.slice(2);
    const separator = raw.indexOf('=');
    if (separator >= 0) {
      result[raw.slice(0, separator)] = raw.slice(separator + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      result[raw] = next;
      index += 1;
    } else {
      result[raw] = true;
    }
  }
  return result;
}

export function booleanArg(value, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function normalizeBaseUrl(value) {
  const url = new URL(value || 'http://127.0.0.1:8080');
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function assertTransportSafety(baseUrl, allowHttp = false) {
  const url = new URL(baseUrl);
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  if (url.protocol !== 'https:' && !allowHttp && !localHosts.has(url.hostname)) {
    throw new Error('远程生产验收必须使用 HTTPS；仅本机地址可使用 HTTP，或显式传入 --allow-http。');
  }
}

export async function request(url, init = {}, timeoutMs = 15_000) {
  const response = await fetch(url, {
    redirect: 'manual',
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  return response;
}

export async function requestJson(url, init = {}, expectedStatus) {
  const response = await request(url, init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (expectedStatus !== undefined ? response.status !== expectedStatus : !response.ok) {
    const detail = body?.error || text.slice(0, 300) || response.statusText;
    throw new Error(`${init.method || 'GET'} ${url} 返回 ${response.status}：${detail}`);
  }
  return { response, body, text };
}

export async function loginAdmin(baseUrl, username, password) {
  if (!username || !password) throw new Error('缺少 ADMIN_USERNAME 或 ADMIN_PASSWORD。');
  const { response, body } = await requestJson(
    `${baseUrl}/api/admin/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    },
    200,
  );
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) throw new Error('管理员登录成功但服务端未返回会话 Cookie。');
  return { cookie: setCookie.split(';')[0], user: body?.user };
}

export async function waitFor(check, options = {}) {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const intervalMs = options.intervalMs ?? 2_000;
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }
  throw new Error(`等待服务就绪超时${lastError instanceof Error ? `：${lastError.message}` : ''}`);
}
