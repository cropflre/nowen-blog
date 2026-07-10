import { spawnSync } from 'node:child_process';
import {
  assertTransportSafety,
  booleanArg,
  loginAdmin,
  normalizeBaseUrl,
  parseArgs,
  requestJson,
  waitFor,
} from './lib.mjs';

const args = parseArgs();
const baseUrl = normalizeBaseUrl(args['base-url'] || process.env.BASE_URL || 'http://127.0.0.1:8080');
assertTransportSafety(baseUrl, booleanArg(args['allow-http'], true));

const username = args.username || process.env.ADMIN_USERNAME || 'NOWEN';
const password = args.password || process.env.ADMIN_PASSWORD;
const composeProject = args['project-name'] || process.env.COMPOSE_PROJECT_NAME;
const composeArgs = ['compose'];
if (composeProject) composeArgs.push('--project-name', composeProject);

const marker = `BLOG-20 persistence ${Date.now()}`;
const slug = `blog-20-persistence-${Date.now().toString(36)}`;
let projectId;
let cookie;

function dockerCompose(...command) {
  const result = spawnSync('docker', [...composeArgs, ...command], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`docker compose ${command.join(' ')} 执行失败`);
}

async function waitForApi() {
  await waitFor(async () => {
    const response = await fetch(`${baseUrl}/api/site-settings`, { signal: AbortSignal.timeout(5_000) });
    return response.ok;
  });
}

try {
  ({ cookie } = await loginAdmin(baseUrl, username, password));
  const created = await requestJson(
    `${baseUrl}/api/admin/projects`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({
        name: marker,
        slug,
        description: 'Temporary Docker persistence acceptance record.',
        language: 'Node.js',
        topics: ['acceptance', 'docker'],
        isFeatured: false,
        isPublished: true,
        sortOrder: 9999,
      }),
    },
    201,
  );
  projectId = created.body?.id;
  if (!projectId) throw new Error('临时项目创建成功但缺少 id');

  dockerCompose('restart', 'api');
  await waitForApi();

  const publicProjects = await requestJson(`${baseUrl}/api/projects?limit=100`);
  const persisted = publicProjects.body?.items?.some((item) => item.id === projectId && item.slug === slug);
  if (!persisted) throw new Error('API 容器重启后临时项目不存在，持久化卷验收失败');

  await requestJson(
    `${baseUrl}/api/admin/projects/${encodeURIComponent(projectId)}`,
    { method: 'DELETE', headers: { cookie } },
    200,
  );
  projectId = undefined;

  dockerCompose('restart', 'web');
  await waitFor(async () => {
    const response = await fetch(`${baseUrl}/healthz`, { signal: AbortSignal.timeout(5_000) });
    return response.ok;
  });

  console.log(JSON.stringify({ ok: true, baseUrl, verified: ['api restart persistence', 'web restart health'] }, null, 2));
} finally {
  if (projectId && cookie) {
    try {
      await requestJson(
        `${baseUrl}/api/admin/projects/${encodeURIComponent(projectId)}`,
        { method: 'DELETE', headers: { cookie } },
      );
    } catch (error) {
      console.error(`清理临时项目失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
