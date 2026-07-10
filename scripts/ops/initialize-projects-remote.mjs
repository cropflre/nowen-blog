import {
  assertTransportSafety,
  booleanArg,
  loginAdmin,
  normalizeBaseUrl,
  parseArgs,
  requestJson,
} from './lib.mjs';

const args = parseArgs();
const baseUrl = normalizeBaseUrl(args['base-url'] || process.env.BASE_URL);
assertTransportSafety(baseUrl, booleanArg(args['allow-http'], false));

const target = args.target || process.env.GITHUB_SYNC_TARGET;
const maxRepos = Math.max(
  1,
  Math.min(30, Number(args.max || process.env.GITHUB_SYNC_MAX_REPOS || 12) || 12),
);
const featured = String(args.feature || process.env.GITHUB_FEATURED_REPOS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const username = args.username || process.env.ADMIN_USERNAME || 'NOWEN';
const password = args.password || process.env.ADMIN_PASSWORD;

if (!target) throw new Error('缺少 GitHub 同步目标，请设置 --target 或 GITHUB_SYNC_TARGET。');

const { cookie } = await loginAdmin(baseUrl, username, password);
const synced = await requestJson(
  `${baseUrl}/api/admin/projects/sync`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ target, maxRepos }),
  },
  200,
);

const all = await requestJson(`${baseUrl}/api/admin/projects`, { headers: { cookie } }, 200);
const projects = Array.isArray(all.body?.items) ? all.body.items : [];
const featuredUpdates = [];

for (const [index, key] of featured.entries()) {
  const project = projects.find((item) =>
    [item.githubFullName, item.name, item.slug]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === key),
  );
  if (!project) {
    featuredUpdates.push({ key, ok: false, reason: '未找到匹配项目' });
    continue;
  }
  await requestJson(
    `${baseUrl}/api/admin/projects/${encodeURIComponent(project.id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ isFeatured: true, isPublished: true, sortOrder: index }),
    },
    200,
  );
  featuredUpdates.push({ key, ok: true, id: project.id, name: project.name });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      baseUrl,
      target,
      synchronized: synced.body?.synced ?? 0,
      targetType: synced.body?.targetType,
      totalProjects: projects.length,
      featuredUpdates,
    },
    null,
    2,
  ),
);
