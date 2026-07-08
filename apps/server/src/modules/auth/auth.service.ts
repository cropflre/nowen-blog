import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../../db/client';
import { users } from '../../db/schema';

export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
}

function toAdminUser(row: typeof users.$inferSelect): AdminUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? null,
    role: row.role,
  };
}

/** 校验用户名 + 密码。失败（用户不存在或密码错误）统一返回 null，不暴露差异。 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<AdminUser | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return toAdminUser(user);
}

export async function getUserById(id: string): Promise<AdminUser | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return null;
  return toAdminUser(user);
}
