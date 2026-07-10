import { runMigrations } from '../db/migrate';
import { sqlite } from '../db/client';

try {
  runMigrations();
  const row = sqlite
    .prepare('SELECT COUNT(*) AS total FROM __drizzle_migrations')
    .get() as { total: number };
  console.log(`✅ Drizzle migrations applied (${row.total} recorded).`);
} finally {
  sqlite.close();
}
