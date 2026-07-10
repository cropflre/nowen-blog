import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

export interface BackupFileEntry {
  path: string;
  size: number;
  sha256: string;
}

export interface BackupManifest {
  version: 1;
  application: 'nowen-blog';
  createdAt: string;
  source: {
    databasePath: string;
    uploadDir: string;
  };
  database: BackupFileEntry & {
    integrity: string;
    migrationCount: number;
  };
  uploads: {
    directory: 'uploads';
    files: BackupFileEntry[];
  };
}

export interface CreateBackupOptions {
  databasePath: string;
  uploadDir: string;
  outputRoot: string;
}

export interface RestoreBackupOptions {
  backupDir: string;
  targetDatabasePath: string;
  targetUploadDir: string;
  force?: boolean;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function normalizeRelativePath(value: string): string {
  return value.split(sep).join('/');
}

function listFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`备份不接受符号链接：${full}`);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) files.push(full);
    }
  };
  visit(root);
  return files.sort();
}

function fileEntry(path: string, root: string): BackupFileEntry {
  return {
    path: normalizeRelativePath(relative(root, path)),
    size: statSync(path).size,
    sha256: sha256(path),
  };
}

function safeChild(root: string, relativePath: string): string {
  const resolvedRoot = resolve(root);
  const child = resolve(resolvedRoot, relativePath);
  if (child !== resolvedRoot && !child.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`备份清单包含越界路径：${relativePath}`);
  }
  return child;
}

function readIntegrity(databasePath: string): string {
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const rows = database.pragma('integrity_check') as Array<{ integrity_check: string }>;
    return rows.map((row) => row.integrity_check).join('; ');
  } finally {
    database.close();
  }
}

function readMigrationCount(databasePath: string): number {
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const exists = database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations' LIMIT 1")
      .get();
    if (!exists) return 0;
    return (database.prepare('SELECT COUNT(*) AS total FROM __drizzle_migrations').get() as { total: number }).total;
  } finally {
    database.close();
  }
}

export function readBackupManifest(backupDir: string): BackupManifest {
  const path = join(resolve(backupDir), 'manifest.json');
  if (!existsSync(path)) throw new Error(`备份清单不存在：${path}`);
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as BackupManifest;
  if (manifest.version !== 1 || manifest.application !== 'nowen-blog') {
    throw new Error('备份清单版本或应用标识不受支持');
  }
  return manifest;
}

export function verifyBackup(backupDir: string): BackupManifest {
  const root = resolve(backupDir);
  const manifest = readBackupManifest(root);
  const databasePath = safeChild(root, manifest.database.path);
  if (!existsSync(databasePath)) throw new Error('备份数据库文件不存在');
  if (statSync(databasePath).size !== manifest.database.size) throw new Error('备份数据库大小与清单不一致');
  if (sha256(databasePath) !== manifest.database.sha256) throw new Error('备份数据库 SHA-256 校验失败');
  const integrity = readIntegrity(databasePath);
  if (integrity !== 'ok') throw new Error(`备份数据库完整性检查失败：${integrity}`);

  for (const entry of manifest.uploads.files) {
    const path = safeChild(join(root, manifest.uploads.directory), entry.path);
    if (!existsSync(path)) throw new Error(`上传文件缺失：${entry.path}`);
    if (statSync(path).size !== entry.size) throw new Error(`上传文件大小不一致：${entry.path}`);
    if (sha256(path) !== entry.sha256) throw new Error(`上传文件校验失败：${entry.path}`);
  }
  return manifest;
}

export async function createBackup(options: CreateBackupOptions): Promise<{ backupDir: string; manifest: BackupManifest }> {
  const databasePath = resolve(options.databasePath);
  const uploadDir = resolve(options.uploadDir);
  const outputRoot = resolve(options.outputRoot);
  if (!existsSync(databasePath)) throw new Error(`数据库不存在：${databasePath}`);

  mkdirSync(outputRoot, { recursive: true });
  const backupDir = join(outputRoot, `nowen-blog-backup-${timestamp()}`);
  const backupDatabasePath = join(backupDir, 'blog.sqlite');
  const backupUploadsDir = join(backupDir, 'uploads');
  mkdirSync(backupUploadsDir, { recursive: true });

  const source = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    source.pragma('busy_timeout = 10000');
    await source.backup(backupDatabasePath);
  } finally {
    source.close();
  }

  const integrity = readIntegrity(backupDatabasePath);
  if (integrity !== 'ok') {
    rmSync(backupDir, { recursive: true, force: true });
    throw new Error(`备份数据库完整性检查失败：${integrity}`);
  }

  if (existsSync(uploadDir)) cpSync(uploadDir, backupUploadsDir, { recursive: true, force: true });
  const uploadFiles = listFiles(backupUploadsDir).map((path) => fileEntry(path, backupUploadsDir));
  const databaseEntry = fileEntry(backupDatabasePath, backupDir);
  const manifest: BackupManifest = {
    version: 1,
    application: 'nowen-blog',
    createdAt: new Date().toISOString(),
    source: { databasePath, uploadDir },
    database: {
      ...databaseEntry,
      integrity,
      migrationCount: readMigrationCount(backupDatabasePath),
    },
    uploads: { directory: 'uploads', files: uploadFiles },
  };
  writeFileSync(join(backupDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  verifyBackup(backupDir);
  return { backupDir, manifest };
}

export function restoreBackup(options: RestoreBackupOptions): {
  restoredAt: string;
  rollbackDir: string | null;
  manifest: BackupManifest;
} {
  const backupDir = resolve(options.backupDir);
  const targetDatabasePath = resolve(options.targetDatabasePath);
  const targetUploadDir = resolve(options.targetUploadDir);
  const manifest = verifyBackup(backupDir);
  const sourceDatabasePath = safeChild(backupDir, manifest.database.path);
  const sourceUploadsDir = safeChild(backupDir, manifest.uploads.directory);

  if ((existsSync(targetDatabasePath) || existsSync(targetUploadDir)) && !options.force) {
    throw new Error('目标数据已存在；请先停止服务并显式传入 --force，现有数据会先进入回滚目录。');
  }

  const rollbackNeeded = existsSync(targetDatabasePath) || existsSync(targetUploadDir);
  const rollbackDir = rollbackNeeded
    ? join(dirname(targetDatabasePath), 'restore-rollbacks', `rollback-${timestamp()}`)
    : null;
  if (rollbackDir) {
    mkdirSync(rollbackDir, { recursive: true });
    if (existsSync(targetDatabasePath)) copyFileSync(targetDatabasePath, join(rollbackDir, basename(targetDatabasePath)));
    if (existsSync(`${targetDatabasePath}-wal`)) copyFileSync(`${targetDatabasePath}-wal`, join(rollbackDir, `${basename(targetDatabasePath)}-wal`));
    if (existsSync(`${targetDatabasePath}-shm`)) copyFileSync(`${targetDatabasePath}-shm`, join(rollbackDir, `${basename(targetDatabasePath)}-shm`));
    if (existsSync(targetUploadDir)) cpSync(targetUploadDir, join(rollbackDir, 'uploads'), { recursive: true, force: true });
  }

  mkdirSync(dirname(targetDatabasePath), { recursive: true });
  const temporaryDatabasePath = `${targetDatabasePath}.restore-${Date.now()}`;
  copyFileSync(sourceDatabasePath, temporaryDatabasePath);
  const temporaryIntegrity = readIntegrity(temporaryDatabasePath);
  if (temporaryIntegrity !== 'ok') {
    rmSync(temporaryDatabasePath, { force: true });
    throw new Error(`恢复前数据库完整性检查失败：${temporaryIntegrity}`);
  }

  rmSync(targetDatabasePath, { force: true });
  rmSync(`${targetDatabasePath}-wal`, { force: true });
  rmSync(`${targetDatabasePath}-shm`, { force: true });
  renameSync(temporaryDatabasePath, targetDatabasePath);

  const temporaryUploads = `${targetUploadDir}.restore-${Date.now()}`;
  rmSync(temporaryUploads, { recursive: true, force: true });
  mkdirSync(temporaryUploads, { recursive: true });
  if (existsSync(sourceUploadsDir)) cpSync(sourceUploadsDir, temporaryUploads, { recursive: true, force: true });
  rmSync(targetUploadDir, { recursive: true, force: true });
  mkdirSync(dirname(targetUploadDir), { recursive: true });
  renameSync(temporaryUploads, targetUploadDir);

  const finalIntegrity = readIntegrity(targetDatabasePath);
  if (finalIntegrity !== 'ok') throw new Error(`恢复后数据库完整性检查失败：${finalIntegrity}`);

  return { restoredAt: new Date().toISOString(), rollbackDir, manifest };
}
