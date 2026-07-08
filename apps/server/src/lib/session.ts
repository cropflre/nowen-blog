import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

const COOKIE_NAME = 'session';
// 7 天
const EXP_SECONDS = 60 * 60 * 24 * 7;
const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-change-me';

let warned = false;

function getSecret(): string {
  if (env.sessionSecret) return env.sessionSecret;
  // 生产环境必须显式配置 SESSION_SECRET，否则拒绝启动相关逻辑
  if (env.nodeEnv === 'production') {
    throw new Error('生产环境必须配置 SESSION_SECRET');
  }
  if (!warned) {
    console.warn(
      '[auth] 未配置 SESSION_SECRET，开发环境使用不安全的兜底密钥。' +
        '注意：固定 secret 下服务端重启不会使旧 session 失效，只有修改 SESSION_SECRET 才会失效。',
    );
    warned = true;
  }
  return DEV_FALLBACK_SECRET;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/** 生成无状态签名 session token：<payload>.<hmac> */
export function createSession(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + EXP_SECONDS;
  const payload = b64url(Buffer.from(JSON.stringify({ uid: userId, exp })));
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** 校验 token，返回 userId 或 null（过期/签名错误/格式错误均返回 null） */
export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;

  const expected = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data?.uid !== 'string' || typeof data?.exp !== 'number') return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.uid as string;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = EXP_SECONDS;
