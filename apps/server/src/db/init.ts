import { sql } from 'drizzle-orm';
import { db } from './client';
import { runMigrations } from './migrate';
import { seedIfEmpty } from './seed';
import { ensureSearchIndex } from '../modules/search/search.service';
import { ensureSiteSettings } from '../modules/settings/settings.service';

let initialized = false;

export function initDb(): void {
  if (initialized) return;

  runMigrations();
  db.run(sql`SELECT 1`);
  seedIfEmpty();
  ensureSiteSettings();
  ensureSearchIndex();
  initialized = true;
}
