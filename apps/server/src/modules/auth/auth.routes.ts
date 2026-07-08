import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { z } from 'zod';
import * as authService from './auth.service';
import { authMiddleware } from '../../middleware/auth';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '../../lib/session';
import { env } from '../../config/env';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// 设置与清除 Cookie 必须使用完全一致的 path / sameSite / secure，
// 否则浏览器可能清不掉 Cookie。
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: env.nodeEnv === 'production',
    maxAge: SESSION_MAX_AGE,
  };
}

export const adminRoutes = new Hono<{ Variables: { userId: string } }>();

// 公开：登录。校验失败统一返回相同错误，不区分“用户不存在 / 密码错误”。
adminRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '用户名或密码错误' }, 401);
  }
  const user = await authService.verifyCredentials(
    parsed.data.username,
    parsed.data.password,
  );
  if (!user) {
    return c.json({ error: '用户名或密码错误' }, 401);
  }
  const token = createSession(user.id);
  setCookie(c, SESSION_COOKIE, token, cookieOptions());
  return c.json({ user });
});

// 登出：始终成功并清除 Cookie，不依赖 authMiddleware。
// 原因：即使 session 已过期/损坏，用户点退出也应能清理本地 Cookie，而不是返回 401。
adminRoutes.post('/logout', async (c) => {
  setCookie(c, SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
  return c.json({ ok: true });
});

// 受保护：当前登录用户
adminRoutes.get('/me', authMiddleware, async (c) => {
  const uid = c.get('userId');
  const user = await authService.getUserById(uid);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return c.json({ user });
});
