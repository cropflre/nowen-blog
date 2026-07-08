import { createFactory } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { verifySession, SESSION_COOKIE } from '../lib/session';

const factory = createFactory<{ Variables: { userId: string } }>();

/** 校验 session Cookie，通过则把 userId 放入 context；失败返回 401。 */
export const authMiddleware = factory.createMiddleware(async (c, next) => {
  const uid = verifySession(getCookie(c, SESSION_COOKIE));
  if (!uid) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('userId', uid);
  await next();
});
