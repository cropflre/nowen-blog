# NOWEN Blog

内容型博客 + 轻量 CMS。技术栈：**React + TypeScript + Vite** 前台/后台，**Hono + Drizzle + better-sqlite3** 后端，**Tailwind CSS v4** 视觉系统。

## 结构

```
apps/web      前台 + 管理后台（React）
apps/server   Node API（Hono）
packages/shared  通用类型 + Zod schema
packages/config  共享 tsconfig / prettier
data/         SQLite 数据库 + 上传文件
```

## 开发

```bash
pnpm install
pnpm dev          # 同时启动 web(5173) 与 server(8787)
```

- 前台：http://localhost:5173
- API：http://localhost:8787/api
- Vite 已配置 `/api` 代理到 server，本地无需跨域。

## 构建

```bash
pnpm build
```

## 部署（构建期预渲染）

生产环境需为预渲染提供正确的**绝对地址**与**生产数据库路径**，二者通过环境变量在构建期传入：

```bash
BASE_URL=https://your-domain.com \
DATABASE_PATH=/path/to/prod/blog.sqlite \
pnpm --filter @blog/web build
```

- `web` 的 `build` 会依次执行 `vite build` 与 `prerender`，把公开页渲染成带真实 `<title>` / `og:*` / `twitter:*` / `jsonLd` / 正文的静态 HTML 落入 `apps/web/dist/`。
- 部署拓扑：静态层托管 `dist/`（精确命中预渲染 `.html`，其余走 `200.html` SPA 回退壳），并把 `/api`、`/rss.xml`、`/sitemap.xml`、`/robots.txt` 反代到 Hono（`:8787`）。RSS / Sitemap / robots 由 Hono 实时提供，不预渲染。

### 上传文件服务（/uploads）

媒体库上传的图片存储在 `data/uploads/` 目录，生产环境必须由静态层（如 nginx）直接服务 `/uploads` 路径：

```nginx
# nginx 配置示例：在 SPA fallback 之前配置
location /uploads {
    alias /path/to/apps/server/data/uploads;
    expires 30d;
    add_header Cache-Control "public, immutable";
    add_header X-Content-Type-Options "nosniff";
}
```

**路由优先级**（从高到低）：
1. `/uploads` — 上传文件（静态层）
2. `/rss.xml`、`/sitemap.xml`、`/robots.txt` — SEO 端点（Hono）
3. `/*.html` — 预渲染静态页面
4. `/api/*` — API 接口（Hono 反代）
5. 其他静态资源 — JS/CSS/字体等
6. SPA fallback — `/200.html`

- 发布新文章后重跑上述构建并重新部署 `dist/` 即可；`prerender` 幂等，可单独重跑。
- 上传目录 `data/uploads` **必须持久化**（容器部署需挂载卷），并与数据库一同定期备份。

详见：
- [部署与备份指南](docs/BLOG-11.4-media-deployment-and-backup.md)（含 nginx 完整配置、备份脚本、故障排查）
- [预渲染部署文档](docs/BLOG-10.4-prerender-deployment.md)（含生产验证清单）
