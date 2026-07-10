import { resolve } from 'node:path';
import { env } from '../config/env';
import { restoreBackup } from '../lib/backup';

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
if (!options.backup) throw new Error('缺少 --backup <备份目录>。');
const force = options.force === true || ['1', 'true', 'yes'].includes(String(options.force).toLowerCase());

const result = restoreBackup({
  backupDir: resolve(String(options.backup)),
  targetDatabasePath: resolve(String(options.database || env.databasePath)),
  targetUploadDir: resolve(String(options.uploads || env.uploadDir)),
  force,
});

console.log(
  JSON.stringify(
    {
      ok: true,
      restoredAt: result.restoredAt,
      rollbackDir: result.rollbackDir,
      backupCreatedAt: result.manifest.createdAt,
      migrationCount: result.manifest.database.migrationCount,
      uploadFiles: result.manifest.uploads.files.length,
    },
    null,
    2,
  ),
);
