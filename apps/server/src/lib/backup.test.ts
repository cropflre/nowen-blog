import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createBackup, restoreBackup, verifyBackup } from './backup';

let root = '';
let databasePath = '';
let uploadDir = '';

before(() => {
  root = mkdtempSync(join(tmpdir(), 'nowen-blog-backup-test-'));
  databasePath = join(root, 'source', 'blog.sqlite');
  uploadDir = join(root, 'source', 'uploads');
  mkdirSync(uploadDir, { recursive: true });
  const database = new Database(databasePath);
  database.exec(`
    CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT NOT NULL, created_at NUMERIC);
    CREATE TABLE posts (id TEXT PRIMARY KEY, title TEXT NOT NULL);
    INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('one', 1), ('two', 2), ('three', 3);
    INSERT INTO posts (id, title) VALUES ('p1', 'Backup test');
  `);
  database.pragma('journal_mode = WAL');
  database.close();
  mkdirSync(join(uploadDir, 'nested'), { recursive: true });
  writeFileSync(join(uploadDir, 'cover.txt'), 'cover-data');
  writeFileSync(join(uploadDir, 'nested', 'image.txt'), 'image-data');
});

after(() => {
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
});

describe('backup and restore', () => {
  test('creates a checksummed backup and restores it to an isolated target', async () => {
    const backup = await createBackup({
      databasePath,
      uploadDir,
      outputRoot: join(root, 'backups'),
    });
    const verified = verifyBackup(backup.backupDir);
    assert.equal(verified.database.integrity, 'ok');
    assert.equal(verified.database.migrationCount, 3);
    assert.equal(verified.uploads.files.length, 2);

    const restoredDatabase = join(root, 'restored', 'blog.sqlite');
    const restoredUploads = join(root, 'restored', 'uploads');
    const result = restoreBackup({
      backupDir: backup.backupDir,
      targetDatabasePath: restoredDatabase,
      targetUploadDir: restoredUploads,
      force: true,
    });
    assert.equal(result.manifest.database.sha256, verified.database.sha256);

    const database = new Database(restoredDatabase, { readonly: true });
    const post = database.prepare('SELECT title FROM posts WHERE id = ?').get('p1') as { title: string };
    database.close();
    assert.equal(post.title, 'Backup test');
    assert.equal(readFileSync(join(restoredUploads, 'cover.txt'), 'utf8'), 'cover-data');
    assert.equal(readFileSync(join(restoredUploads, 'nested', 'image.txt'), 'utf8'), 'image-data');
  });

  test('refuses to overwrite an existing target without force', async () => {
    const backup = await createBackup({ databasePath, uploadDir, outputRoot: join(root, 'backups-2') });
    const targetDatabasePath = join(root, 'existing', 'blog.sqlite');
    mkdirSync(join(root, 'existing'), { recursive: true });
    writeFileSync(targetDatabasePath, 'occupied');
    assert.throws(
      () =>
        restoreBackup({
          backupDir: backup.backupDir,
          targetDatabasePath,
          targetUploadDir: join(root, 'existing', 'uploads'),
        }),
      /--force/,
    );
  });
});
