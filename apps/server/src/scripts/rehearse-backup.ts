import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { env } from '../config/env';
import { createBackup, restoreBackup } from '../lib/backup';

function args(): Record<string, string> {
  const values: Record<string, string> = {};
  for (let index = 2; index < process.argv.length; index += 1) {
    const token = process.argv[index];
    const next = process.argv[index + 1];
    if (token.startsWith('--') && next && !next.startsWith('--')) {
      values[token.slice(2)] = next;
      index += 1;
    }
  }
  return values;
}

const options = args();
const workDir = mkdtempSync(join(tmpdir(), 'nowen-blog-restore-rehearsal-'));
try {
  const backup = await createBackup({
    databasePath: resolve(options.database || env.databasePath),
    uploadDir: resolve(options.uploads || env.uploadDir),
    outputRoot: join(workDir, 'backups'),
  });
  const restoredDatabase = join(workDir, 'restored', 'blog.sqlite');
  const restoredUploads = join(workDir, 'restored', 'uploads');
  const restored = restoreBackup({
    backupDir: backup.backupDir,
    targetDatabasePath: restoredDatabase,
    targetUploadDir: restoredUploads,
    force: true,
  });

  const database = new Database(restoredDatabase, { readonly: true, fileMustExist: true });
  try {
    const integrity = (database.pragma('integrity_check') as Array<{ integrity_check: string }>).map((row) => row.integrity_check).join('; ');
    if (integrity !== 'ok') throw new Error(`恢复演练完整性检查失败：${integrity}`);
    const requiredTables = [
      'users',
      'posts',
      'site_settings',
      'comments',
      'projects',
      'newsletter_subscribers',
      'newsletter_campaigns',
      '__drizzle_migrations',
    ];
    for (const table of requiredTables) {
      const row = database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
        .get(table) as { name: string } | undefined;
      if (!row) throw new Error(`恢复数据库缺少表：${table}`);
    }
    const counts = {
      posts: (database.prepare('SELECT COUNT(*) AS total FROM posts').get() as { total: number }).total,
      projects: (database.prepare('SELECT COUNT(*) AS total FROM projects').get() as { total: number }).total,
      subscribers: (database.prepare('SELECT COUNT(*) AS total FROM newsletter_subscribers').get() as { total: number }).total,
      migrations: (database.prepare('SELECT COUNT(*) AS total FROM __drizzle_migrations').get() as { total: number }).total,
    };
    console.log(
      JSON.stringify(
        {
          ok: true,
          backupCreatedAt: backup.manifest.createdAt,
          restoredAt: restored.restoredAt,
          integrity,
          uploadFiles: restored.manifest.uploads.files.length,
          counts,
        },
        null,
        2,
      ),
    );
  } finally {
    database.close();
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
