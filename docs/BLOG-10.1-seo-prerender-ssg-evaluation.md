# BLOG-10.1：SEO 预渲染 / SSG 方案评估

> 基线：`origin/main` 最新提交 `a6f6c05 feat: add RSS sitemap and SEO metadata`
> 本阶段范围：**仅产出评估文档，不写业务代码、不改架构、不提交实现。**
> 评估侧重：① 低改造成本 ② 真实首屏 SEO 收益 ③ 复用现有 Vite SPA / Hono API / Seo.tsx ④ 可渐进演进到 SSR/SSG

---

## 1. 背景

`nowen-blog` 已完成一条稳定的内容发布基础链路：前台展示、后台登录、文章 CRUD、分类/标签管理、SQLite FTS 搜索、RSS/Sitemap/robots、以及客户端 SEO metadata / JSON-LD（BLOG-10 已收口并推送）。

但当前前台的 SEO metadata 是 **React SPA 在客户端运行时注入**的（`apps/web/src/components/seo/Seo.tsx` 通过 `useEffect` 写 `<head>`）。对用户体验和社交分享预览有帮助，但搜索引擎首屏抓取到的 HTML `<head>` 是空的（只有 `index.html` 模板里的占位 meta）。这与"SSR/SSG 首屏即含真实 meta + 正文"存在差距。

BLOG-10.1 的目标不是立刻落地，而是**先做架构决策**：在不动现有稳定链路的前提下，评估几种可行方案，给出推荐路线，供后续阶段按"单阶段、单 commit、严格不越界"的方式逐步实施。

---

## 2. 当前 SEO 能力

| 能力 | 现状 | 位置 |
|------|------|------|
| 标题 / 描述 / canonical | 客户端注入 | `apps/web/src/components/seo/Seo.tsx` |
| Open Graph / Twitter Card | 客户端注入 | 同上，复用 `apps/web/src/lib/seo.ts` 的 `setOg` / `setTwitter` |
| JSON-LD（文章详情 BlogPosting） | 客户端注入 | `apps/web/src/pages/PostDetail.tsx` 组装，`setJsonLd` 写入 |
| RSS 2.0 | 服务端实时生成，仅 published+public | `apps/server/src/modules/seo/seo.routes.ts` → `rssRoutes` |
| Sitemap | 服务端实时生成，仅 published+public | 同上 → `sitemapRoutes` |
| robots.txt | 服务端生成，指向 Sitemap | 同上 → `robotsRoutes` |
| 绝对地址生成 | 服务端 `absoluteUrl(env.baseUrl)` / 客户端 `absUrl(window.location.origin)` | `apps/server/src/lib/seo.ts` / `apps/web/src/lib/seo.ts` |
| 站点配置 | `siteSettings`（标题/描述/作者/社交） | `apps/server/src/config/site.ts` |
| 发布文章实时可见（RSS/Sitemap） | 实时查库，无缓存 | `apps/server/src/modules/posts/posts.repository.ts` 的 `listPublishedForFeed` / `listPublishedForSitemap` |

结论：SEO 所需的**数据层与 meta 生成逻辑已经齐备**，缺的只是"在首屏 HTML 里把这些 meta / 正文渲染出来"。

---

## 3. 当前 SEO 短板

1. **首屏 HTML 无 meta**：`index.html` 经 Vite 构建后，`<head>` 里没有 title/description/og/jsonLd；这些由 JS 在浏览器端补。不执行 JS 的抓取器首屏看不到。
2. **社交分享预览机器人大多不执行 JS**：Twitter / Facebook / 微信 / Telegram / Slack / Discord 的预览抓取通常只取首屏 HTML 的 og 标签。当前这些标签是空的，分享卡片拿不到标题/封面。
3. **正文不在首屏 HTML**：搜索引擎要索引正文，需执行 JS 后二次抓取（Google 支持但有延迟且不完全可靠；百度/必应/Bing 等支持度更低）。
4. **`Seo.tsx` 的 `absUrl` 依赖 `window.location.origin`**：服务端/构建期执行会崩，这是后续任何预渲染/SSR 方案必须解决的兼容性点（本次不实现，仅指出）。

说明：`Seo.tsx` 已自带注释明确指出"若需搜索引擎首屏可见这些 meta，应在后续 BLOG-10.1 通过 SSR/SSG/预渲染生成"——本评估即承接该注释。

---

## 4. 目标与非目标

**目标**

- 评估 Vite SPA 在 SEO 上的短板与可行改进路径。
- 在满足"低改造成本优先"的前提下，给出能带来"真实首屏 SEO 收益"的推荐路线。
- 方案应**尽量复用**现有 Vite SPA、Hono API、`Seo.tsx`、`siteSettings`、RSS/Sitemap。
- 优先**渐进式**方案，允许后续平滑演进到 SSR/SSG。

**非目标（本阶段明确不做）**

- 不写预渲染 / SSR / SSG 实现代码。
- 不改现有业务代码与架构。
- 不做 SSR/SSG 落地。
- 不做媒体库、评论后台、高级编辑器、BLOG-11。

---

## 5. 方案对比表

| 方案 | 改造成本 | 首屏 SEO 收益 | 架构侵入 | 渐进性 | 推荐度 |
|------|----------|---------------|----------|--------|--------|
| A. 维持 SPA 仅客户端 SEO | 无 | 低（仅 JS 抓取器/分享预览差） | 无 | — | 基线，非终点 |
| B. SPA + 构建期预渲染公开页 | 中 | 高（首屏含 meta+正文） | 低（附加产物） | 强 | **短期推荐** |
| C. SPA + 静态 HTML 仅注入 meta | 低-中 | 中（有 meta，无正文） | 低 | 强 | 可作 B 的轻量过渡 |
| D. 迁移 Next/Remix/TanStack Start | 高 | 最高 | 高（重写前端） | 弱 | 暂不推荐 |
| E. Hono 服务端动态渲染公开页 | 中-高 | 高（实时渲染） | 中（双路由） | 中 | 不如 B |

---

## 6. 方案 A 详解：保持 Vite SPA，仅保留当前客户端 SEO

- **工作量**：0（已具备）。
- **SEO 收益**：仅对"会执行 JS 的抓取器"有效（Google 近年能执行但有延迟；其他引擎支持有限）；社交分享预览机器人基本失效。
- **风险**：低。
- **适用场景**：个人站、流量主要来自 Google、分享预览要求不高。
- **是否推荐**：作为**现状基线**保留，但不符合"真实首屏 SEO"目标，不是终点。

---

## 7. 方案 B 详解：Vite SPA + 构建期预渲染公开页面

**预渲染范围**：首页、文章列表、文章详情、分类页、标签页、归档页、关于页。搜索页（客户端查询）与 404（兜底）不适合静态预渲染。

**生成内容**：带真实 `title` / meta / JSON-LD / 正文 的 HTML 文件，落到 `dist/` 对应路由目录（如 `dist/posts/<slug>/index.html`）。

**客户端导航**：预渲染产出的是"独立静态 HTML 文件"，由静态层直接返回；用户首屏拿到完整 HTML，之后 SPA 接管站内导航。存在两种落地形态：
- (a) **静态 HTML 文件**（每路由一个 `.html`）：最简单，SEO 只看首屏，足够。导航后 SPA 重新渲染，可接受。
- (b) **同构 hydrate（SSG）**：把路由数据预取到 HTML，用 `hydrateRoot` 复用同一份 React 组件。更接近 SSG，改动更大，属中期演进（见第 12 节）。

**构建期如何读取数据**（三种，推荐第一种）：
1. **直接读 SQLite**（`better-sqlite3` + drizzle schema）：构建脚本直接查库，复用 `listPublishedForSitemap` / `listPublishedForFeed` 的取数逻辑，最简洁。代价是构建步骤需能访问 DB 文件（`DATABASE_PATH`），可把取数抽成 `apps/web` 可调用的小模块。
2. **调用本地 API**：构建前先 `pnpm --filter @blog/server start`，再爬取。耦合构建流程，较重。
3. **构建前启动 server**：同 2，更重。

**构建流程变化**：原 `pnpm -r build`（`web: tsc --noEmit && vite build`）之后，新增一步"预渲染"任务：遍历公开路由 → 读取数据 → 生成静态 HTML 到 `dist/`。实现路径有二：① 同构 `renderToString`（需路由+数据可在服务端执行，会触发 `Seo.tsx` 的 `window` 依赖问题）；② 无头浏览器爬取运行中的 preview server（简单但慢、需起服务）。**无论哪条路径，`Seo.tsx` 的 `absUrl` 都必须先消除 `window` 依赖**（注入 `BASE_URL` 或在服务端改用 `env.baseUrl`）——这是方案 B 唯一必要的小幅兼容改动，但本阶段不实现。

**发布文章后如何重新生成**：因是构建期产物，需重跑构建（或增量预渲染脚本）。个人博客发布频率低，可接受；后续可演进到 Webhook / 按需触发。

- **工作量**：中（新增预渲染任务 + 少量兼容改造 + 静态托管适配）。
- **风险**：中（构建复杂度、同构陷阱、部署拓扑变化）。
- **是否推荐**：**是（短期推荐）**。

---

## 8. 方案 C 详解：Vite SPA + 静态 HTML 模板注入 SEO meta

**做法**：不渲染正文，只在每路由的 HTML `<head>` 注入 `title` / `description` / `canonical` / `og` / `twitter` / `jsonLd`（正文仍由 SPA 客户端渲染）。

**是否足够**：对"社交分享预览"和"搜索引擎标题/描述"基本足够（抓取器能读到 meta，即使正文是 JS 渲染）；但正文不在 HTML 里，Google 仍需执行 JS 才能索引正文，存在延迟/不全。

**与方案 B 的差异**：C 不渲染正文，实现更轻；B 渲染完整正文，首屏即可被完整索引。

- **工作量**：低-中（生成 per-route HTML 壳 + 注入 meta；同样需解决 `absUrl` 的 `window` 兼容问题）。
- **风险**：低-中。
- **是否推荐**：可作**方案 B 的轻量前奏/过渡**；但若以"真实首屏 SEO 收益"为第二优先级，仅 C 不够，需演进到 B。

---

## 9. 方案 D 详解：迁移到 Next.js / Remix / TanStack Start 等 SSR 框架

- **工作量**：高（重写前端，迁移路由/数据获取/状态管理；Tailwind 与组件需适配）。
- **迁移风险**：高（破坏现有稳定链路；SPA 交互体验需重建）。
- **对现有后台和 API 的影响**：Hono API 可保留为后端，但前端框架整体替换成本高；后台可独立保留或嵌套。属于大型重构。
- **是否值得现在做**：否。当前 SPA 稳定，收益/成本不划算；除非未来需要高度动态 SSR（个性化、实时），否则不推荐。
- **是否推荐**：**暂不推荐**（除非方案 B 演进后仍不满足）。

---

## 10. 方案 E 详解：Hono 服务端动态渲染公开文章页

**做法**：Hono 对 `/posts/:slug` 等公开页用模板（JSX/字符串）在服务端拼装完整 HTML，直接读 DB。React SPA 保留后台和部分前台交互。

**复杂度与边界**：需在 Hono 侧复用 `siteSettings` 与文章数据拼装 `<head>` 与正文；会造成**双路由**——Hono 渲染公开页、React SPA 也渲染同一页，维护两套渲染逻辑（模板 vs React 组件），样式（Tailwind）需同步，易漂移。

- **工作量**：中-高（每个公开页在 Hono 侧用模板重实现一遍）。
- **风险**：中（双轨维护、样式同步）。
- **是否推荐**：不如方案 B。B 是"构建期生成一次、静态托管、无运行时渲染负担"；E 适合"需要实时服务端渲染且不想预渲染"的场景，但内容静态博客用 B 更优。

---

## 11. 推荐路线

- **短期推荐：方案 B（Vite SPA + 构建期预渲染公开页面）**
  1. 对现有架构侵入最小（预渲染是 `dist/` 的附加产物，不改 `/api` 与 SEO 端点）。
  2. 能让搜索引擎首屏看到真实 HTML、meta、JSON-LD、正文。
  3. 可复用已有 `Seo.tsx` / `siteSettings` / RSS / Sitemap 数据层与取数函数。
  4. 不需要现在迁移 Next / Remix。
  5. 适合个人博客与内容型站点。

- **中期可演进：从 B 的"静态 HTML 文件"演进到"同构 hydrate（SSG）"**
  - 引入 Vite 的 SSG 能力（如 `vite-ssg` / `vite-plugin-ssr` / TanStack Start），用 `hydrateRoot` 复用现有 React 组件，提升首屏与交互一致性。
  - 将预渲染触发接入"发布文章"事件（手动重 build → 增量脚本 → Webhook 触发）。
  - 为方案 D 留好退路：若未来确需动态 SSR，届时再评估框架迁移。

- **暂不推荐**
  - **方案 D（框架迁移）**：成本高、破坏稳定链路，收益不划算。
  - **方案 E（Hono 动态渲染）**：双轨维护、样式漂移，不如 B 干净。
  - **方案 A**：仅作现状基线，不满足首屏 SEO 目标。
  - **方案 C**：可作 B 的轻量过渡，但正文不被索引是硬伤，不单独作为终点。

- **为什么**：完全契合评估侧重——低成本（B 是附加产物）、真实首屏 SEO 收益（B 渲染完整 HTML）、复用现有资产、可渐进演进到 SSR/SSG。

---

## 12. 分阶段实施计划（仅规划，不实现）

> 以下为后续阶段（如 BLOG-10.2 起）的实施路线草案，本阶段不落地。

- **阶段 1 — 预渲染任务骨架**：在 `apps/web` 构建后新增一步，遍历公开路由、直接读 SQLite（`DATABASE_PATH`），为每个路由生成 `dist/<route>/index.html`。
- **阶段 2 — 消除 `absUrl` 的 `window` 依赖**：`Seo.tsx` / `apps/web/src/lib/seo.ts` 改为在服务端用 `env.baseUrl` 或注入的 `BASE_URL`（这是方案 B 唯一必要的小幅兼容改动）。
- **阶段 3 — 静态托管适配**：当前 `apps/server/src/main.ts` 的 Hono **不托管前端静态文件**，生产 `dist/` 由外部静态层返回。需确保部署层优先返回预渲染 HTML（或给 Hono 增加 `serveStatic` 仅服务于公开页 HTML）。
- **阶段 4 — 发布后重新生成**：手动重 build 起步；后续演进为增量预渲染脚本或 Webhook 触发。
- **阶段 5（可选演进）— 同构 hydrate / SSG**：接入 SSG 插件，用 `hydrateRoot` 复用 React 组件，提升交互一致性。

---

## 13. 风险与回滚

- **风险**
  - 构建流程复杂度升高（新增预渲染任务、取数耦合 DB）。
  - 同构陷阱（`window` / `document` 引用、样式差异）。
  - 部署拓扑变化：需静态托管层返回预渲染 HTML。
  - 预渲染产物可能与最新数据存在时差（发布后未重 build）。
- **回滚**
  - 预渲染是 `dist/` 的**附加产物**，出问题可回退到纯 SPA（`index.html` 仍可用），不影响 `/api` 与 `/rss.xml`、`/sitemap.xml`、`/robots.txt`。
  - 回滚成本低、风险小。

---

## 14. 最终结论

**推荐方案 B（Vite SPA + 构建期预渲染公开页面）作为 BLOG-10.1 的落地路线**，按第 12 节分 5 个阶段逐步实施（阶段 1–4 为核心）。

- **短期**：方案 B，最低侵入换取真实首屏 SEO。
- **中期**：由 B 演进到同构 hydrate / SSG，并接入发布触发。
- **暂不采用**：方案 D（框架迁移，成本过高）、方案 E（Hono 动态渲染，双轨维护）。
- **过渡/基线**：方案 C 可作 B 的轻量前奏；方案 A 为现状基线。

理由总结：方案 B 在"低改造成本、真实首屏 SEO 收益、复用现有 Vite SPA / Hono API / Seo.tsx / siteSettings / RSS / Sitemap、可渐进演进到 SSR/SSG"四个评估侧重上综合最优，且不破坏现有稳定内容发布链路。
