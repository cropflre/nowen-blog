import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const dataDir = resolve(process.cwd(), '.tmp/e2e');
rmSync(dataDir, { recursive: true, force: true });
mkdirSync(resolve(dataDir, 'uploads'), { recursive: true });

const executable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const child = spawn(executable, ['--filter', '@blog/server', 'start'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: '8787',
    BASE_URL: 'http://127.0.0.1:6688',
    DATABASE_PATH: resolve(dataDir, 'blog.sqlite'),
    UPLOAD_DIR: resolve(dataDir, 'uploads'),
    SESSION_SECRET: 'e2e-session-secret-at-least-32-characters',
    ADMIN_USERNAME: 'NOWEN',
    ADMIN_EMAIL: 'e2e@example.com',
    ADMIN_PASSWORD: 'e2e-admin-password',
  },
});

const stop = (signal) => {
  if (!child.killed) child.kill(signal);
};

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
