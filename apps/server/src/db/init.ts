import { sql } from 'drizzle-orm';
import { db } from './client';
import { runMigrations } from './migrate';
import { seedIfEmpty } from './seed';
import { ensureNowenNoteApiDocs } from './seed-nowen-note-api';
import { ensureNowenNoteHelpDocs } from './seed-nowen-note-help';
import { synchronizeNowenNoteHelpDocs } from './sync-nowen-note-help';
import { ensureNowenNoteFeatureDocs } from './seed-nowen-note-features';
import { ensureSearchIndex } from '../modules/search/search.service';
import { ensureSiteSettings } from '../modules/settings/settings.service';

let initialized = false;

export function initDb(): void {
  if (initialized) return;

  runMigrations();
  db.run(sql`SELECT 1`);
  seedIfEmpty();
  ensureNowenNoteApiDocs();
  ensureNowenNoteHelpDocs();
  synchronizeNowenNoteHelpDocs();
  ensureNowenNoteFeatureDocs();
  ensureSiteSettings();
  ensureSearchIndex();
  initialized = true;
}
