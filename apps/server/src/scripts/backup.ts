import { resolve } from 'node:path';
import { env } from '../config/env';
import { createBackup } from '../lib/backup';

function args(): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (let index = 2; index < process.argv.length; index += 1) {
    const token = process.argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = process.argv[index + 1];
    if (next && !next.startsWith('--')) {
      values[key] = next;
      index += 1;
    } else values[key] = true;
  }
  return values;
}

const options = args();
const result = await createBackup({
  databasePath: resolve(String(options.database || env.databasePath)),
  uploadDir: resolve(String(options.uploads || env.uploadDir)),
  outputRoot: resolve(String(options.output || process.env.BACKUP_DIR || 'backups')),
});

console.log(
  JSON.stringify(
    {
      ok: true,
      backupDir: result.backupDir,
      createdAt: result.manifest.createdAt,
      migrationCount: result.manifest.database.migrationCount,
      uploadFiles: result.manifest.uploads.files.length,
      databaseSha256: result.manifest.database.sha256,
    },
    null,
    2,
  ),
);
