import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db, sqlite } from './client';
import { posts, categories, tags, users, postCategories, postTags } from './schema';
import { slugify, estimateReadingTime, randomId, nowIso } from '../lib/format';
import { env } from '../config/env';

const SAMPLE_MD = (title: string, body: string) => `# ${title}\n\n${body}`;

function md(body: string) {
  return body;
}

export function seedIfEmpty(): void {
  const count = sqlite
    .prepare('SELECT COUNT(*) AS c FROM posts')
    .get() as { c: number };
  if (count.c > 0) return;

  const now = nowIso();

  // 默认管理员（仅用于开发环境）；生产环境缺失 ADMIN_PASSWORD 必须拒绝创建。
  const adminPassword = env.adminPassword;
  let adminPasswordHash: string;
  if (adminPassword) {
    adminPasswordHash = bcrypt.hashSync(adminPassword, 10);
  } else if (env.nodeEnv === 'production') {
    throw new Error('生产环境必须设置 ADMIN_PASSWORD 才能创建默认管理员');
  } else {
    const devPassword = 'dev-admin-please-change';
    console.warn(
      `[seed] 未设置 ADMIN_PASSWORD，开发环境使用默认管理员密码 "${devPassword}"` +
        `（用户名 ${env.adminUsername}）。生产环境请勿如此。`,
    );
    adminPasswordHash = bcrypt.hashSync(devPassword, 10);
  }

  const authorId = randomId('u_');
  db.insert(users)
    .values({
      id: authorId,
      username: env.adminUsername,
      email: env.adminEmail,
      passwordHash: adminPasswordHash,
      role: 'admin',
      bio: '全栈工程师，关注前端工程化、Node.js 与开源。',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const catDefs = [
    { name: '前端工程化', slug: 'frontend', color: '#6366f1' },
    { name: 'Node.js', slug: 'nodejs', color: '#10b981' },
    { name: 'SQLite', slug: 'sqlite', color: '#f59e0b' },
    { name: 'AI', slug: 'ai', color: '#ec4899' },
    { name: '开源', slug: 'opensource', color: '#06b6d4' },
  ];
  const catIds: Record<string, string> = {};
  for (const c of catDefs) {
    const id = randomId('c_');
    catIds[c.slug] = id;
    db.insert(categories)
      .values({
        id,
        name: c.name,
        slug: c.slug,
        description: `${c.name} 相关文章`,
        color: c.color,
        sortOrder: 0,
        createdAt: now,
      })
      .run();
  }

  const tagDefs = [
    { name: 'React', slug: 'react', color: '#61dafb' },
    { name: 'TypeScript', slug: 'typescript', color: '#3178c6' },
    { name: 'Vite', slug: 'vite', color: '#646cff' },
    { name: 'Hono', slug: 'hono', color: '#ff5e00' },
    { name: 'Drizzle', slug: 'drizzle', color: '#c5f74f' },
    { name: 'SQLite', slug: 'sqlite', color: '#003b57' },
    { name: 'Tailwind', slug: 'tailwind', color: '#38bdf8' },
  ];
  const tagIds: Record<string, string> = {};
  for (const t of tagDefs) {
    const id = randomId('t_');
    tagIds[t.slug] = id;
    db.insert(tags)
      .values({ id, name: t.name, slug: t.slug, color: t.color, createdAt: now })
      .run();
  }

  const samples: {
    title: string;
    summary: string;
    cats: string[];
    tags: string[];
    md: string;
    featured?: boolean;
    pinned?: boolean;
  }[] = [
    {
      title: 'React + Node + SQLite 博客系统完整架构设计',
      summary:
        '从技术选型到数据库 schema、API 设计，一套适合个人博客与技术品牌站的完整方案。',
      cats: ['frontend', 'nodejs'],
      tags: ['react', 'typescript', 'vite', 'hono'],
      featured: true,
      pinned: true,
      md: md(`# 为什么做这个博客系统

市面上的博客方案要么太重（WordPress），要么太轻（纯静态）。我们想要的是：

- **内容优先**的阅读体验
- **轻量 CMS** 的编辑体验
- **SQLite 单文件**部署

## 技术栈

\`\`\`ts
const stack = {
  frontend: 'React + Vite + Tailwind v4',
  backend: 'Hono + Drizzle',
  db: 'SQLite (better-sqlite3)',
};
\`\`\`

## 分层

后端采用 \`routes -> service -> repository\` 分层，后期迁移 PostgreSQL 只需改 repository / db 层。

> 博客系统的核心不是 CRUD，而是内容体验、SEO 和长期可维护性。
`),
    },
    {
      title: 'SQLite 在个人项目中的最佳实践',
      summary: 'WAL 模式、外键、busy_timeout，以及什么时候该上 PostgreSQL。',
      cats: ['sqlite'],
      tags: ['sqlite'],
      md: md(`# SQLite 最佳实践

SQLite 默认不是 WAL 模式，生产环境建议开启：

\`\`\`sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
\`\`\`

## 何时迁移 PostgreSQL

当你的写入并发明显上升，或需要多实例部署时，再考虑迁移。
`),
    },
    {
      title: 'Tailwind CSS v4 落地笔记',
      summary: '新版配置方式、@theme 与暗色模式，以及和 shadcn/ui 的协作。',
      cats: ['frontend'],
      tags: ['tailwind', 'react'],
      featured: true,
      md: md(`# Tailwind v4 笔记

Tailwind v4 用 CSS 优先的配置：

\`\`\`css
@import "tailwindcss";
@theme {
  --color-brand: #6366f1;
}
\`\`\`

暗色模式使用 class 策略：

\`\`\`css
@custom-variant dark (&:where(.dark, .dark *));
\`\`\`
`),
    },
    {
      title: '用 Hono 搭建类型安全的博客 API',
      summary: 'Hono 的中间件模型、OpenAPI 集成，以及和前端共享 Zod schema。',
      cats: ['nodejs'],
      tags: ['hono', 'typescript', 'drizzle'],
      md: md(`# Hono API

Hono 非常轻量，适合做博客后端 API。

\`\`\`ts
const app = new Hono();
app.get('/api/posts', (c) => c.json({ items: [] }));
\`\`\`

配合 \`@blog/shared\` 里的 Zod schema，前后端可以复用同一套校验。
`),
    },
    {
      title: 'Drizzle ORM 入门：从 schema 到查询',
      summary: '用 Drizzle 定义关系、做关联查询，以及参数化防止 SQL 注入。',
      cats: ['nodejs', 'sqlite'],
      tags: ['drizzle', 'sqlite', 'typescript'],
      md: md(`# Drizzle ORM

定义 schema 后，所有查询都自动类型安全：

\`\`\`ts
const rows = await db.query.posts.findMany({
  with: { author: true, categoryLinks: true },
});
\`\`\`

所有参数都走占位符，天然防注入。
`),
    },
    {
      title: '内容型博客的 SEO 清单',
      summary: '每篇文章需要的 meta、Open Graph、JSON-LD，以及 RSS / Sitemap。',
      cats: ['frontend', 'opensource'],
      tags: ['react', 'tailwind'],
      md: md(`# SEO 清单

每篇文章必须生成：

- \`<title>\` 与 \`<meta name="description">\`
- Open Graph：\`og:title / og:image / og:url\`
- JSON-LD：\`BlogPosting\`

并且提供 \`/rss.xml\` 与 \`/sitemap.xml\`。
`),
    },
  ];

  samples.forEach((s, i) => {
    const id = randomId('p_');
    const slug = slugify(s.title) + (i === 0 ? '' : `-${i}`);
    const content = SAMPLE_MD(s.title, s.md);
    const publishedAt = new Date(Date.now() - i * 86400000).toISOString();
    db.insert(posts)
      .values({
        id,
        title: s.title,
        slug,
        summary: s.summary,
        contentMd: content,
        status: 'published',
        visibility: 'public',
        isFeatured: s.featured ?? false,
        isPinned: s.pinned ?? false,
        readingTime: estimateReadingTime(content),
        wordCount: content.length,
        viewCount: Math.floor(Math.random() * 200),
        likeCount: Math.floor(Math.random() * 30),
        seoTitle: s.title,
        seoDescription: s.summary,
        publishedAt,
        createdAt: publishedAt,
        updatedAt: publishedAt,
        authorId,
      })
      .run();

    for (const cslug of s.cats) {
      db.insert(postCategories).values({ postId: id, categoryId: catIds[cslug] }).run();
    }
    for (const tslug of s.tags) {
      db.insert(postTags).values({ postId: id, tagId: tagIds[tslug] }).run();
    }
  });

  // 确保 seed 后统计立即生效
  db.run(sql`SELECT 1`);
  console.log('🌱 Seeded sample blog data.');
}
