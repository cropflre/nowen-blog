import { initDb } from '../db/init';
import { sqlite } from '../db/client';

try {
  initDb();
  const migrations = sqlite
    .prepare('SELECT COUNT(*) AS total FROM __drizzle_migrations')
    .get() as { total: number };
  const posts = sqlite.prepare('SELECT COUNT(*) AS total FROM posts').get() as { total: number };
  console.log(
    JSON.stringify(
      {
        ok: true,
        database: process.env.DATABASE_PATH || 'data/blog.sqlite',
        migrations: migrations.total,
        posts: posts.total,
      },
      null,
      2,
    ),
  );
} finally {
  sqlite.close();
}
