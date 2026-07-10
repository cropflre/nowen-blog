import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import { db, sqlite } from './client';

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

function tableExists(table: string): boolean {
  const row = sqlite
    .prepare("SELECT 1 AS found FROM sqlite_master WHERE type IN ('table', 'view') AND name = ? LIMIT 1")
    .get(table) as { found: number } | undefined;
  return Boolean(row);
}

function columnExists(table: string, column: string): boolean {
  if (!tableExists(table)) return false;
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((item) => item.name === column);
}

function ensureLegacyColumn(table: string, column: string, definition: string): void {
  if (tableExists(table) && !columnExists(table, column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/**
 * BLOG-18.1 前的版本通过 init.ts 手写建表。
 * 这里只保留一次性的旧库兼容桥；所有新结构必须写入 drizzle/*.sql。
 */
export function prepareLegacyDatabase(): void {
  ensureLegacyColumn('posts', 'visibility', "TEXT NOT NULL DEFAULT 'public'");
  ensureLegacyColumn('posts', 'scheduled_at', 'TEXT');

  // 极早期 FTS 表若缺少正文列，先重建，再由基线迁移创建正确结构。
  if (tableExists('posts_fts') && !columnExists('posts_fts', 'content_md')) {
    sqlite.exec('DROP TABLE posts_fts');
  }
}

export function runMigrations(): void {
  prepareLegacyDatabase();
  migrate(db, { migrationsFolder });
}

export function getMigrationsFolder(): string {
  return migrationsFolder;
}
