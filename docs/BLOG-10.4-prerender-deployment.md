# BLOG-10.4：预渲染部署文档与生产验证清单

> 基线：`origin/main` 最新稳定点 `3230158`（BLOG-10.3 收尾：接入构建 + 修复私密泄漏与幂等性）。
> 本阶段范围：**仅补部署文档与生产验证清单，不改业务代码、不引入新依赖、不进入 BLOG-11。**
> 承接：BLOG-10.2（实现设计）、BLOG-10.3（MVP 实现 + 验证）。本阶段把"如何上线、如何验证上线正确"落到文档。

---

## 1. 目标

- 让运维 / 部署方清楚：生产环境如何构建出含预渲染 HTML 的 `dist/`。
- 明确静态层（nginx / Cloudflare Pages / 任意静态托管）如何配置，使预渲染页、SPA 回退壳、Hono API 三者职责不混。
- 给出一份**可执行的 curl 验证清单**，部署后逐条核对，确认首屏 SEO、私密边界、回退壳都正确。

**非目标**：媒体库、评论后台、高级编辑器、SSR / 同构 hydrate、Next/Remix 迁移（均不在范围）。

---

## 2. 生产构建

预渲染需要正确的**绝对地址**（`canonical` / `og:url` / `og:image` 由 `absoluteUrl(BASE_URL, path)` 拼装），以及指向**生产数据库**的 `DATABASE_PATH`。两者都通过环境变量在构建期传入：

```bash
# 在仓库根目录执行；BASE_URL 决定预渲染 HTML 里的绝对地址
BASE_URL=https://your-domain.com \
DATABASE_PATH=/path/to/prod/blog.sqlite \
pnpm --filter @blog/web build
```

- `pnpm --filter @blog/web build` = `tsc --noEmit && vite build && pnpm --filter @blog/server prerender`。
- 末尾的 `prerender` 子步骤在 `apps/server` 目录下运行，`BASE_URL` / `DATABASE_PATH` 由 shell 环境继承传入，被 `prerender.ts` 读取。
- `DATABASE_PATH` 必须指向**生产数据库文件**，与线上 Hono 启动时所用 `DATABASE_PATH` 一致（设计 §6：构建期只读库，与运行时同源）。
- 若改用根命令 `pnpm build`（`pnpm -r build`），同样需要前置 `BASE_URL` / `DATABASE_PATH` 环境变量，二者会沿子进程继承。

构建产物 `apps/web/dist/` 含：

```
dist/
├── index.html              # 预渲染首页
├── 200.html                # SPA 回退壳（纯壳，不含预渲染内容）
├── posts/index.html + posts/<slug>/index.html
├── categories/...  tags/...  archive/index.html  search/index.html  about/index.html
├── assets/*.js  assets/*.css  favicon.svg
```

---

## 3. 部署拓扑

```
┌──────────────┐         ┌────────────────────────┐
│  浏览器/爬虫  │ ──────▶ │  静态层 (serves dist/)  │
└──────────────┘         │  · 预渲染 .html 精确命中 │
                         │  · 未命中 → 200.html 壳  │
                         └───────────┬────────────┘
                                     │ /api /rss.xml /sitemap.xml /robots.txt
                                     ▼
                         ┌────────────────────────┐
                         │  Hono API (:8787)        │
                         │  /api/*  /rss.xml        │
                         │  /sitemap.xml /robots.txt│
                         └────────────────────────┘
```

- **静态层**只托管 `dist/`，不做任何后端渲染。
- **Hono** 继续实时提供 `/api/*`（含 `/posts`、`/search`、`/site-settings`）、`/rss.xml`、`/sitemap.xml`、`/robots.txt`——这些**不预渲染**，由 Hono 实时查库，保证新发布内容立即可被爬虫发现。
- 预渲染只是 `dist/` 里的"额外静态文件"，与 Hono 零运行时耦合。

---

## 4. 静态层配置（nginx 示例）

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /path/to/apps/web/dist;

  # 1) API 与 SEO 端点反代到 Hono
  location ~ ^/(api|rss\.xml|sitemap\.xml|robots\.txt) {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # 2) 预渲染页精确命中；其余走 SPA 回退壳
  location / {
    try_files $uri $uri/ /200.html;
  }
}
```

要点：

- `try_files $uri $uri/ /200.html`：精确路径（如 `/posts/my-slug/`、`/about`）命中预渲染 `.html`；`/admin`、`/admin/login`、未知客户端路由无对应静态文件，回退 `200.html` 由前端 SPA 接管（后台仍需登录）。
- 反代顺序在 `try_files` 之前，确保 `/api*` 等不被静态层截走。
- 若静态平台用 `404.html` 作 SPA 回退（如某些 Pages 服务），把 `200.html` 复制为 `404.html` 即可，原则一致。

---

## 5. 再生成策略（发布新文章后）

预渲染是**构建期产物**。新文章发布后需重新生成静态 HTML：

- **个人博客低频发布**：手动重跑 `pnpm --filter @blog/web build`（或仅 `pnpm --filter @blog/server prerender` + 重新部署 `dist/`）。
- **RSS/Sitemap 实时**：由 Hono 实时查库，新文章立即可被爬虫通过 Sitemap 发现，不依赖 HTML 重建；仅该文章的静态 HTML 在新构建前暂缺（爬虫仍能从 Sitemap 进入、由 SPA 渲染）。
- **幂等性**：`prerender` 在注入前清除既有 SEO meta 并清空 `200.html` 壳，可**安全地单独重跑**，不会 meta 叠加或壳被污染（BLOG-10.3 已验证）。

---

## 6. 生产验证清单（部署后逐条 curl）

无 JS 环境下逐条核对。以下以 `https://your-domain.com` 与本地 Hono `:8787` 为例。

### 6.1 公开页首屏含真实 meta + 正文

```bash
# 首页
curl -s https://your-domain.com/ | grep -E '<title>|og:title|og:type|application/ld\+json|canonical'

# 文章详情（取一篇已知 slug）
curl -s https://your-domain.com/posts/<slug>/ | grep -E '<title>|og:type="article"|application/ld\+json'
# 正文应出现在 <article> 内（非首页 hero）
curl -s https://your-domain.com/posts/<slug>/ | grep -c '<article'

# 列表 / 分类 / 标签 / 归档 / 关于 / 搜索 壳
for p in posts categories tags archive about search; do
  echo "== /$p =="; curl -s "https://your-domain.com/$p" | grep -c '<title>'
done
```

预期：每页均有 `<title>`、`<meta property="og:*">`、`<link rel="canonical">`；文章页含 `og:type="article"` 与 `BlogPosting` JSON-LD，且 `<article>` 计数 ≥ 1。

### 6.2 私密内容零泄漏

```bash
# 全站不应出现任何 draft / archived / private 文章的 slug 或正文
# 在构建用的生产库里插入测试私密文（验证后删除）再跑 prerender，然后：
curl -s https://your-domain.com/archive/ | grep -c 'leak-'   # 应为 0
# 直接检索 dist/ 静态文件同理（CI 里可 grep dist/）
```

预期：静态产物中检索不到任何非 `published+public` 文章的 slug 或正文。

### 6.3 后台 / 客户端路由回退壳

```bash
# /admin 不应有静态文件，应回退 200.html 壳（不含预渲染正文）
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/admin      # 200（SPA 壳）
curl -s https://your-domain.com/admin | grep -c '<article'                  # 应为 0
```

预期：`/admin` 返回 `200.html` 纯壳，不含 `<article>` 等预渲染内容，前端接管后仍需登录。

### 6.4 SEO 端点仍由 Hono 实时提供

```bash
curl -s https://your-domain.com/sitemap.xml | head -3
curl -s https://your-domain.com/rss.xml     | head -3
curl -s https://your-domain.com/robots.txt
```

预期：三者均由 Hono 返回，且仅含 `published+public` 内容。

### 6.5 Hono API 正常

```bash
curl -s https://your-domain.com/api/posts | head -c 200
```

预期：返回 JSON 文章列表。

---

## 7. 回滚

预渲染是 `dist/` 的附加产物，回滚成本低：

- 保留上一版 `dist/` 构件，出问题直接回滚部署该构件。
- 或：删除预渲染 HTML、把 `200.html` 复制回 `index.html`，站点即退回纯 SPA（首屏回到"仅壳"，但 `/api`、RSS、Sitemap、robots 完全不受影响）。
- Hono 与静态层职责不变，回滚不影响已发布内容、后台、搜索、订阅。

---

## 8. 验收（本阶段）

- [ ] `README.md` 含部署 / 预渲染章节，给出 `BASE_URL` / `DATABASE_PATH` 生产构建命令。
- [ ] 本文档覆盖：静态层配置（nginx `try_files` + 反代）、再生成策略、回滚。
- [ ] §6 验证清单可在 CI / 部署后执行，覆盖 meta+正文、私密零泄漏、`/admin` 回退壳、SEO 端点实时、API 正常。
- [ ] 本阶段未改动任何业务代码、未引入依赖、未进入 BLOG-11。
