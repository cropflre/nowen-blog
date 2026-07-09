# BLOG-10.2：Vite SPA 构建期预渲染落地设计

> 基线：`origin/main` 最新提交 `211e46b`（Merge origin/main：整合 RSS/SEO 端口配置，FTS 搜索冲突以远端实现为准）
> 本阶段范围：**仅产出设计文档，不写实现代码、不改业务代码、不引入新依赖、不进入 BLOG-11。**
> 承接：BLOG-10.1 评估结论——推荐 **方案 B（Vite SPA + 构建期预渲染公开页面）**。
> 落地实现留待 **BLOG-10.3：预渲染 MVP 实现**。

---

## 1. 背景与目标

BLOG-10 已收口内容发布基础链路（前台展示、后台、分类/标签、FTS 搜索、RSS/Sitemap/robots、客户端 SEO metadata/JSON-LD）。BLOG-10.1 评估指出：当前 `<head>` 的 title/meta/og/jsonLd 由 `Seo.tsx` 在浏览器端 `useEffect` 写入，不执行 JS 的抓取器/社交预览机器人首屏拿不到真实 meta 与正文。

本阶段把"BLOG-10.1 推荐的方案 B"落为**可实施的工程设计方案**：明确预渲染哪些路由、数据从哪来、HTML 怎么生成、如何复用现有 SEO 资产、如何规避 `window` 依赖、构建与部署拓扑如何调整、如何防止私密内容泄漏与 XSS，以及如何回滚。

**目标**

- 让搜索引擎/社交机器人首屏即拿到真实 `title` / `meta` / `og` / `twitter` / `jsonLd` / 正文。
- 尽量复用现有 Vite SPA、Hono API、`siteSettings`、`listPublishedForFeed` / `listPublishedForSitemap`、RSS/Sitemap。
- 构建期生成、静态托管、无运行时渲染负担。
- 不破坏现有稳定发布链路；可后续平滑演进到同构 hydrate / SSG。

**非目标（本阶段明确不做）**

- 不写预渲染实现代码（仅设计）。
- 不做 SSR 服务器、不迁移 Next/Remix/TanStack Start。
- 不做媒体库、评论后台、高级编辑器。
- 不进入 BLOG-11。

---

## 2. 当前基线说明

本设计基于 `211e46b` 的真实代码，不涉及历史里的本地旧 FTS 提交 `8c9e912`（已随合并在远端历史中，按既定结论不再回退）。相关事实点：

| 关注点 | 现状（引用真实文件） |
|--------|----------------------|
| 前台公开路由 | `apps/web/src/App.tsx:28-38`（`/`、`/posts`、`/posts/:slug`、`/categories`、`/categories/:slug`、`/tags`、`/tags/:slug`、`/archive`、`/search`、`/about`） |
| 后台路由（不预渲染） | `apps/web/src/App.tsx:42-54`（`/admin`、`/admin/login`、`/admin/posts...`） |
| Sitemap 静态页清单 | `apps/server/src/modules/seo/seo.routes.ts:17` 的 `STATIC_PAGES = ['/', '/posts', '/categories', '/tags', '/archive', '/search', '/about']` —— 即预渲染公开页的权威范围 |
| 公开内容过滤 | `apps/server/src/modules/posts/posts.repository.ts:62-85`，统一用 `and(eq(posts.status,'published'), eq(posts.visibility,'public'))` |
| 站点配置 | `apps/server/src/config/site.ts`（`siteSettings`，env 驱动，非 DB） |
| 服务端绝对地址 | `apps/server/src/lib/seo.ts:24` `absoluteUrl(baseUrl, path)`（无 `window` 依赖） |
| 客户端绝对地址 | `apps/web/src/lib/seo.ts:10` `absUrl(path)` 依赖 `window.location.origin` |
| 客户端 meta 注入 | `apps/web/src/components/seo/Seo.tsx`（`useEffect` 写 `<head>`，含 JSON-LD `BlogPosting` 组装逻辑可复用） |
| Markdown 渲染 | `apps/web/src/components/markdown/Markdown.tsx` 用 `react-markdown`（**React 组件**，非纯函数） |
| `content_html` 列 | `apps/server/src/db/schema.ts:27` 已定义但**全仓无任何写入/读取**（`grep` 仅命中 schema/init），属死列；预渲染须从 `content_md` 现渲染 |
| 前端构建 | `apps/web/src/vite.config.ts` 仅含 dev proxy，无 `base` 特殊配置；`build` 脚本 `tsc --noEmit && vite build` |
| 生产静态托管 | `apps/server/src/main.ts` **不托管前端静态文件**（无 `serveStatic`）；`dist/` 由外部静态层返回；dev 态由 vite proxy 把 `/api`、`/rss.xml`、`/sitemap.xml`、`/robots.txt` 转发到 `:8787` |

---

## 3. 当前部署拓扑

```
┌──────────────┐         ┌──────────────────────┐
│  浏览器/爬虫  │ ──────▶ │  静态托管层 (dist/)   │
└──────────────┘         │  index.html / 预渲染  │
                         │  assets / 200.html   │
                         └──────────┬───────────┘
                                    │ 未命中静态文件
                                    ▼
                         ┌──────────────────────┐
                         │  Hono API (:8787)     │
                         │  /api/*  /rss.xml     │
                         │  /sitemap.xml         │
                         │  /robots.txt          │
                         └──────────────────────┘
```

- **静态托管层**返回 `dist/` 的 `.html`/`assets`；对客户端路由（含 `/admin/*`）回退到 **`200.html`**（SPA 壳）。
- **Hono** 继续实时提供 `/api/*`（含 `/posts`、`/posts/:slug`、`/search`、`/site-settings` 等）、`/rss.xml`、`/sitemap.xml`、`/robots.txt`。
- 预渲染只是往 `dist/` 里**多生成一批静态 HTML 文件**，不改变上述职责划分。

---

## 4. 预渲染范围（Q1）

对以下**公开前台路由**生成静态 HTML（每路由一个 `index.html`，文章详情按 slug 各一个文件）：

| 路由 | 产物路径 | 数据来源 |
|------|----------|----------|
| `/` | `dist/index.html` | 精选/最新 published+public 文章列表 |
| `/posts` | `dist/posts/index.html` | 文章列表第 1 页 |
| `/posts/:slug` | `dist/posts/<slug>/index.html` | 单篇 published+public 文章（含正文） |
| `/categories` | `dist/categories/index.html` | 分类列表 |
| `/categories/:slug` | `dist/categories/<slug>/index.html` | 该分类下 published+public 文章列表 |
| `/tags` | `dist/tags/index.html` | 标签列表 |
| `/tags/:slug` | `dist/tags/<slug>/index.html` | 该标签下 published+public 文章列表 |
| `/archive` | `dist/archive/index.html` | 按年/月的 published+public 归档 |
| `/search` | `dist/search/index.html` | **仅空页面壳**（搜索结果由客户端实时查询，见 §5） |
| `/about` | `dist/about/index.html` | 关于页静态内容 |

> 列表页分页：MVP 仅预渲染第 1 页（`?page=1`），更深页由 SPA 客户端加载；若需，可在 BLOG-10.3 后续扩展为预渲染前 N 页。文章详情**逐篇全量**预渲染（数量可控、SEO 价值最高）。

---

## 5. 非预渲染范围（Q2）

明确**不生成**静态 HTML：

- `/admin/*`、`/admin/login`：**后台 SPA**，仅经 `200.html` 壳由前端接管，绝不落静态文件、绝不注入 SEO meta。
- `/search?q=...` 的**具体搜索结果**：搜索是客户端实时行为，且依赖已发布索引；只预渲染**空的 `/search` 壳**（供爬虫拿到标题/描述即可，结果由 JS 填充）。
- 草稿（`status='draft'`）、归档（`status='archived'`）、私有（`visibility='private'`）文章的详情页：**不生成**（见 §7 过滤）。
- 404 / 未知路由：不逐 URL 预渲染，交由静态层回退到 `200.html` 壳（SPA 渲染 `NotFound`）。可额外生成一份 `dist/404.html` 作为静态 404 页（可选）。
- 所有 `/api/*` 端点：不预渲染，继续由 Hono 实时提供。

---

## 6. 数据来源设计（Q3 / Q4）

**原则：构建期直接读 SQLite，复用现有取数函数，不启动/不爬取运行中的服务。**

生成脚本（建议 `apps/server/scripts/prerender.ts`，因 DB 访问最自然）在 `tsx` 下运行，导入：

- `db`（`apps/server/src/db/client.ts`）—— `better-sqlite3` + drizzle。
- `listPublishedForFeed()`（`posts.repository.ts:62`）—— 已发布且公开的全量文章（含 relations：author / categories / tags），用于正文与列表。
- `listPublishedForSitemap()`（`posts.repository.ts:73`）—— 轻量 slug/时间清单，用于遍历文章详情与 Sitemap 一致性。
- `listCategories()` / `listTags()`（`taxonomies.service.ts`）—— 分类/标签清单。
- 归档数据（`archive` 模块，返回 `ArchiveYear[]`）。
- `siteSettings`（`config/site.ts`）+ `absoluteUrl()`（`lib/seo.ts:24`）—— 站点元信息与绝对地址（**无 `window` 依赖**）。

**唯一过滤条件**（与 RSS/Sitemap 完全一致，保证"所见即所爬"）：

```ts
and(eq(posts.status, 'published'), eq(posts.visibility, 'public'))
```

该条件确保：草稿、归档、私有内容**永不被读取**，从源头杜绝泄漏（见 §15）。脚本通过 `DATABASE_PATH` 环境变量指向**生产数据库文件**（与 server 启动同参）。

> 备选方案"先 `start` server 再爬 API"被否决：耦合构建流程、需起服务、慢，且仍要同样过滤；直接读库更简洁、确定。

---

## 7. HTML 生成方案（Q5）

**模板来源**：`vite build` 产出的 `dist/index.html`（含 `<!doctype>`、`<meta charset>`、`<meta viewport>`、`#root`、模块脚本、favicon）作为基础模板。

**每页生成步骤**（路径 A：轻量模板，不跑 React）：

1. 读取 `dist/index.html` 作为骨架。
2. 注入/覆盖 `<head>`：
   - `<title>` = 页面标题（文章用 `seoTitle || title`）。
   - `<meta name="description">` = `seoDescription || summary`（无则用 `truncateText(stripMarkdown(contentMd), 160)` 兜底，复用 `lib/seo.ts` 的 `stripMarkdown`/`truncateText`）。
   - `<link rel="canonical" href={absoluteUrl('/posts/<slug>')}>`。
   - Open Graph：`og:title` / `og:description` / `og:type`(`website`|`article`) / `og:url` / `og:image` / `og:locale=zh_CN`。
   - Twitter Card：`twitter:card=summary_large_image` / `twitter:title` / `twitter:description` / `twitter:image`。
   - `<meta name="theme-color" content={siteSettings.themeColor}>`、favicon、JSON-LD。
3. 注入 `<body>` 内容（供爬虫索引，置 `<div id="root">` 内或专用容器）：
   - 文章详情：标题、作者、日期、阅读时长、分类/标签链接、以及**由 `content_md` 渲染的正文 HTML**。
   - 列表/分类/标签/归档：文章卡片（标题链接 + 摘要）。
   - 同时保留原模块脚本，使 JS 加载后 SPA 接管站内导航（见 §8 兼容说明）。
4. 所有注入文本必须 HTML 转义；JSON-LD 作为 `<script type="application/ld+json">` 须转义 `</script>` 与 `<`（防注入）。

**正文 HTML 渲染**：`content_md` 经 Markdown→HTML 渲染。当前 `Markdown.tsx` 用 `react-markdown`（React 组件，无法在纯 node 脚本直接复用）。路径 A 建议引入**构建期专用的纯 JS Markdown 库**（如 `marked` 或 `markdown-it`，作为 `apps/server` 的 devDependency，仅生成脚本使用），并**对输出做 HTML 净化**（见 §15）。为与线上渲染视觉接近，可在 BLOG-10.3 评估是否改用 `react-dom/server` 的 `renderToStaticMarkup` 复用同一套 `react-markdown` pipeline（ fidelity 更高，但已接近路径 B，见 §19 对比）。

> 注意：`content_html` 列虽存在但从未写入，预渲染**不从该列读取**，避免脏数据；一律由 `content_md` 现渲染。

---

## 8. Seo.tsx 兼容性改造设计（Q7）

- **路径 A 完全不调用 `Seo.tsx`**：HTML 由 node 脚本直接拼装，绝对地址用服务端的 `absoluteUrl(env.baseUrl, path)`，**不涉及 `window`**。`apps/web/src/lib/seo.ts:10` 的 `absUrl` 依赖 `window.location.origin` 对路径 A 无影响。
- **路径 B（中期演进）才需改造**：若改用 `renderToString`/`hydrateRoot` 在构建期运行 React 组件，会触发 `Seo.tsx` → `absUrl` → `window`，在服务端崩溃。改造点（BLOG-10.1 §12 阶段 2 已指出，是路径 B 唯一必要的小幅兼容改动）：
  - 让 `absUrl` 环境感知：浏览器用 `window.location.origin`，非浏览器（`typeof window === 'undefined'`）用注入的 `BASE_URL`（来自 `env.baseUrl` 或构建期注入的环境变量）。
  - 此改动**仅影响路径 B**，本阶段（路径 A）不做。

---

## 9. 路由到文件映射规则（Q9 / §4 产物）

采用"目录化 `index.html`"映射，并用 **`200.html` 作为 SPA 回退壳**：

| 路由 | 静态文件 | 说明 |
|------|----------|------|
| `/` | `dist/index.html` | 预渲染首页（覆盖 Vite 产出的壳） |
| `/posts` | `dist/posts/index.html` | |
| `/posts/<slug>` | `dist/posts/<slug>/index.html` | 每篇一文件 |
| `/categories` | `dist/categories/index.html` | |
| `/categories/<slug>` | `dist/categories/<slug>/index.html` | |
| `/tags` | `dist/tags/index.html` | |
| `/tags/<slug>` | `dist/tags/<slug>/index.html` | |
| `/archive` | `dist/archive/index.html` | |
| `/search` | `dist/search/index.html` | 空壳 |
| `/about` | `dist/about/index.html` | |
| `/admin/*`、未知路由 | `dist/200.html`（SPA 壳） | 静态层回退，前端接管 |

**壳处理**：`vite build` 后，生成脚本把原始的 `dist/index.html`（纯 SPA 壳：`#root` + 模块脚本）**另存为 `dist/200.html`**，再把预渲染首页写入 `dist/index.html`。这样：

- `/` 命中预渲染首页；
- `/admin` 等无对应静态文件 → 静态层回退 `200.html` → SPA 启动渲染后台；
- 客户端导航仍由 React Router 接管，预渲染页与 SPA 体验一致。

> 若静态平台用 `404.html` 作 SPA 回退（如 GitHub Pages），则对应生成 `404.html` 壳；原则一致，依部署平台而定。

---

## 10. 构建流程设计（Q10）

原 `pnpm -r build` 不变（server `tsc`；web `tsc --noEmit && vite build`）。**新增一步预渲染**，挂到 web 构建之后：

```jsonc
// apps/web/package.json (建议)
{
  "scripts": {
    "build": "tsc --noEmit && vite build && pnpm prerender",
    "prerender": "tsx ../server/scripts/prerender.ts"   // 或由 apps/server 暴露脚本
  }
}
```

或更稳妥地用 `postbuild` 钩子。生成脚本执行顺序：

1. `vite build` → 产出 `dist/`（SPA 壳 + assets）。
2. `prerender.ts`（tsx）：连 `DATABASE_PATH` → 读 published+public 数据 → 渲染各路由 HTML → 写入 `dist/` → 另存 `200.html` 壳。
3. 构建产物即含预渲染 HTML，可直接交由静态层部署。

**脚本位置建议**：放在 `apps/server/scripts/prerender.ts`，因可直接 `import { db, listPublishedForFeed, listPublishedForSitemap, siteSettings, absoluteUrl }`，输出目录指向 `../web/dist`。BLOG-10.3 实现时再细化（也可抽到 `packages/` 共享取数，但 MVP 不必须）。

---

## 11. dist 产物设计（Q9 / §9 汇总）

`dist/` 最终包含：

- `index.html`（预渲染首页）
- `posts/index.html` + `posts/<slug>/index.html`（每篇一文件）
- `categories/index.html` + `categories/<slug>/index.html`
- `tags/index.html` + `tags/<slug>/index.html`
- `archive/index.html`、`search/index.html`（空壳）、`about/index.html`
- `200.html`（SPA 回退壳，含 `#root` + 模块脚本）
- `assets/*.js`、`assets/*.css`、`favicon.svg` 等（Vite 原样产出）
- **不含**任何 `/admin/*` 静态文件、**不含**搜索结果页、**不含**草稿/私有内容。

---

## 12. 部署方式设计（Q10）

保持当前"Hono 不托管静态"的拓扑，仅调整静态层配置：

- 静态层返回 `dist/`；精确匹配到预渲染 `.html` 则直接返回。
- 未命中时回退到 `200.html`（SPA 壳）—— `/admin/*`、客户端子路由、未知路径均走此路。
- 反向代理/`try_files` 将 `/api`、`/rss.xml`、`/sitemap.xml`、`/robots.txt` 转发到 Hono（`:8787`）。

nginx 风格示意：

```nginx
location ~ ^/(api|rss\.xml|sitemap\.xml|robots\.txt) {
  proxy_pass http://127.0.0.1:8787;
}
location / {
  try_files $uri $uri/ /200.html;
}
```

预渲染文件对 Hono 与静态层都是"额外的静态资源"，**零运行时耦合**；Hono 仍实时提供 API 与 SEO 端点。

---

## 13. 发布文章后的再生成策略（Q13）

预渲染是**构建期产物**，新文章发布后需重新生成 HTML：

- **个人博客低频发布**：手动重跑 `pnpm -r build`（或仅 `pnpm prerender` + 重新部署 `dist/`）即可。
- **RSS/Sitemap 实时**：因由 Hono 实时查库，新文章**立即可被爬虫通过 Sitemap 发现**，不依赖 HTML 重建；只是该文章的静态 HTML 在新构建前暂缺（爬虫仍能从 Sitemap 进入、由 SPA 渲染）。
- **后续演进（BLOG-10.3+ 可选）**：
  - 增量预渲染脚本：仅重建变更文章 + 首页 + 相关列表/分类/标签/归档页。
  - CI/Webhook 触发：发布事件 → 自动重建并部署 `dist/`。
- 不强制引入自动化的前提是：静态 HTML 缺失**不影响可达性**（Sitemap + SPA 兜底），仅影响该文首屏 SEO 的"即时性"。

---

## 14. 对后台管理的影响（Q14）

- 后台 `/admin/*` **完全不受影响**：不预渲染、不注入 meta、不进 `dist/` 静态文件；经 `200.html` 壳由 SPA 渲染，仍需登录鉴权。
- 后台文章 CRUD、分类/标签管理、FTS 索引联动（发布即入 FTS、取消发布即移除）均不变。
- 发布/取消发布会触发 Hono 实时数据变化；预渲染 HTML 的更新走 §13 的再生成策略，与后台逻辑解耦。

---

## 15. 安全与 XSS 边界（Q15）

- **私密内容不泄漏**：唯一数据过滤为 `published AND public`（`posts.repository.ts:62-85`），草稿/归档/私有**不读取、不渲染**；预渲染脚本无写入生产库权限，仅只读。
- **Markdown/正文 XSS**：从 `content_md` 渲染的 HTML **必须净化**。路径 A 若用 `marked`/`markdown-it`，须对输出做 HTML 净化（如 `DOMPurify` node 版或等价 sanitizer）；若路径 B 用 `react-markdown`，现有 `rehype-sanitize` 已覆盖（与线上 `Markdown.tsx` 一致）。原则：不信任作者输入，输出即净化。
- **注入转义**：所有拼入 `<head>`/属性/JSON-LD 的文本（标题、描述、URL、作者名）须 HTML 转义；JSON-LD 的 `<script>` 内容须转义 `</script>` 与 `<`（参考服务端 `escapeXml` 思路）。
- **URL 可信性**：`canonical`/`og:url`/`og:image` 由 `absoluteUrl(baseUrl, slug)` 拼装，`slug` 在写入时已校验；`baseUrl` 来自部署环境变量，非用户可控。
- **运行时不执行生成逻辑**：预渲染 HTML 是静态文件，由静态层直接返回，无服务端模板执行，无用户可控输入注入点。
- **死列规避**：不使用未维护的 `content_html` 列，避免陈旧/未净化 HTML 残留在静态产物中。

---

## 16. 性能影响

- **构建期**：O(文章数) 次 Markdown 渲染，个人博客量级（数百~数千篇）在秒级；增量脚本可进一步降低。
- **产物体积**：每篇 HTML 仅数 KB~数十 KB，相对 `assets` 增量极小。
- **运行时**：预渲染页由 CDN/静态层直接返回，首屏即含内容，无 SSR 计算开销；比纯 SPA 首屏 SEO 收益显著，比动态 SSR 更省资源。
- **抓取预算**：首屏可索引内容提升索引覆盖率与速度。

---

## 17. 回滚方案（Q15）

预渲染是 `dist/` 的**附加产物**，回滚成本低、风险小：

- 保留上一版 `dist/` 构件，出问题直接回滚部署该构件即可。
- 或：删除预渲染 HTML、把 `200.html` 复制回 `index.html`，站点即退回纯 SPA（首屏回到"仅壳"，但 `/api`、RSS、Sitemap、robots 完全不受影响）。
- 因 Hono 与静态层职责不变，回滚**不影响已发布内容、后台、搜索、订阅**。

---

## 18. 分阶段实施计划（供 BLOG-10.3 落地，本阶段不实现）

- **阶段 1 — 预渲染骨架**：新增 `apps/server/scripts/prerender.ts`，连库、读 published+public、遍历 `STATIC_PAGES` + 每篇 slug，写入 `dist/<route>/index.html`，并另存 `200.html` 壳。先输出"有 title/meta 但正文占位"的页面。
- **阶段 2 — 完整 meta + 正文**：补全 `og`/`twitter`/`canonical`/`jsonLd`；接入构建期 Markdown 渲染生成正文 HTML；描述用 `stripMarkdown`/`truncateText` 兜底。
- **阶段 3 — 部署适配与验证**：配置静态层 `try_files`/`200.html` 回退；本地起静态层 + Hono 联调；用 `curl` 无 JS 验证各公开页首屏含 meta+正文。
- **阶段 4 — 再生成策略**：手动重构建验证；评估增量脚本 / Webhook 触发（可选）。

> 路径 B（同构 `hydrateRoot` / SSG 插件）属中期演进，**不在 BLOG-10.3 范围**，本设计仅预留"路径 A 不引入 `window` 依赖、后续可平滑升级"的空间。

---

## 19. 验收标准（供 BLOG-10.3，本阶段不实现）

- 对每个公开路由 `curl` 首屏（无 JS）即含：正确 `<title>`、`description`、canonical、`og:*`、`twitter:*`、`jsonLd`（文章为 `BlogPosting`），以及正文/列表内容。
- `/admin/*` **不存在**对应静态文件，回退 `200.html` 壳，需登录。
- 全仓静态 HTML 中**检索不到**任何 `draft`/`archived`/`private` 文章的内容或 slug。
- `/rss.xml`、`/sitemap.xml`、`/robots.txt` 仍由 Hono 实时提供，且仅含 published+public。
- 生成脚本不依赖 `window`/`document`（路径 A 天然满足）。
- 构建可重复、可回滚（§17）。

---

## 20. 路径对比与最终推荐

### 路径 A：轻量模板生成（推荐，短期）

- **做法**：不跑 `renderToString`；用 `dist/index.html` 模板 + 构建期 Markdown 渲染 + 复用 `absoluteUrl`/`siteSettings`/`stripMarkdown` 等 SEO 工具函数，直接写出静态 HTML 到 `dist/<route>/index.html`。
- **优点**：实现简单、风险低；不需处理 `window`/`document`、React Query 数据注入、同构路由与 head 管理；与现有架构侵入最小；最契合"构建期一次性生成、静态托管"；天然规避 `Seo.tsx` 的 `window` 依赖。
- **缺点**：静态 HTML 与 React 页可能存在少量样式/结构差异（尤其 Markdown 渲染管线不同）；需维护一套（或复用）模板与构建期 Markdown 渲染；后续若改 UI 需同步模板。
- **结论**：**短期推荐作为 BLOG-10.3 的 MVP 落地路线**。

### 路径 B：React `renderToString` / `hydrateRoot`

- **做法**：构建期用 `renderToString` 复用现有 React 组件生成 HTML，后续可 `hydrateRoot` 同构接管。
- **优点**：UI 一致性最好；长期最接近真正 SSG；可平滑演进到同构 hydrate。
- **缺点**：需处理 `BrowserRouter`/`window`/`document`（`Seo.tsx` 的 `absUrl` 必须先行改造，§8）；需把 React Query 数据注入到服务端渲染；需管理 `<head>`（避免与客户端重复写入）；改造 `Seo.tsx` 与构建管线复杂度显著更高。
- **结论**：作为**中期演进**评估，不纳入 BLOG-10.3。

### 最终推荐

- **短期（BLOG-10.3）：路径 A**——以最低侵入换取真实首屏 SEO（meta + 正文），复用现有 Vite SPA / Hono API / `siteSettings` / RSS / Sitemap 数据层与取数函数。
- **中期**：从路径 A 演进到路径 B（同构 `hydrateRoot` / SSG 插件），提升首屏与交互一致性，并接入发布触发。
- **明确不采用**：
  - **方案 D（Next/Remix/TanStack Start 迁移）**：重写前端、成本高、破坏稳定链路。
  - **方案 E（Hono 动态 SSR 公开页）**：双轨维护、样式漂移，不如路径 A 干净。
  - **媒体库 / 评论后台 / 高级编辑器 / BLOG-11**：不在范围。

**一句话**：用路径 A 在构建期把公开页（首页、文章列表与详情、分类/标签、归档、关于、空搜索页）渲染成带真实 meta + 正文的静态 HTML，落入 `dist/` 并保留 `200.html` 壳供后台与客户端路由回退；数据只读 published+public，绝对地址用服务端 `absoluteUrl` 规避 `window`；RSS/Sitemap/robots 与 `/api` 继续由 Hono 实时提供；不预渲染 `/admin/*` 与具体搜索结果；私密内容从源头过滤、Markdown 输出净化、全量转义防 XSS；可整体回滚。
