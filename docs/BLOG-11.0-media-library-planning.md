# BLOG-11.0：媒体库与图片上传方案规划

> 基线：`origin/main` 最新提交 `fd4683a`（BLOG-10.4：预渲染部署文档与生产验证清单）。
> 本阶段范围：**仅产出规划文档，不写实现代码、不改业务代码、不引入新依赖、不进入 BLOG-11.1。**
> 目标：为 nowen-blog 设计「媒体库 / 图片上传 / 封面图管理」方案，作为后续 BLOG-11.1 实现的工程依据。
> 优先级理由：文章 CRUD 已可用，但 `coverUrl` 只能手填、正文无法插图；预渲染、OG 图、封面、内容图都依赖稳定的媒体资源管理。媒体库先于评论后台。

---

## 1. 背景与现状（引用真实代码）

本规划基于 `fd4683a` 的真实代码，相关事实点：

| 关注点 | 现状（引用真实文件） |
|--------|----------------------|
| 封面图字段 | `apps/server/src/db/schema.ts:28` `posts.coverUrl`（`cover_url` 文本列）已存在，但**仅文本列**，无关联媒体资源 |
| 封面图输入 | `apps/web/src/components/admin/AdminPostEditor.tsx:182-190` 仅为「封面图 URL」**文本输入框**（`placeholder="https://…"`），手动粘贴 |
| 正文编辑 | `AdminPostEditor.tsx:207-214` 为 **Markdown 源码 `<textarea>`**（带「预览」切换用 `Markdown` 组件渲染），无插入图片能力 |
| 媒体资源表 | **不存在** `assets` / `media` 表；`schema.ts` 仅有 users/posts/categories/tags 及关联表 |
| 上传接口 | **不存在**；当前无任何 `/api/admin/assets*` 路由 |
| 上传目录 | `.gitignore` 已忽略 `data/uploads/*`（原则：上传文件不进版本库），但**无代码读写该目录** |
| 鉴权模式 | `apps/server/src/middleware/auth.ts:8` `authMiddleware`（基于 session cookie，`verifySession`，失败 401，通过则 `c.set('userId', uid)`） |
| 模块分层 | 现有 `modules/{x}/` 均为 `routes` + `service` + `schema`（zod）三层；admin 路由统一 `adminPostsRoutes.use('*', authMiddleware)`（`admin-posts.routes.ts:15`） |
| 模块挂载 | `apps/server/src/app.ts:35` `app.route('/api/admin/posts', adminPostsRoutes)`；新增模块仅需加一行 `app.route('/api/admin/assets', adminAssetsRoutes)` |
| 前端 admin 路由 | `apps/web/src/App.tsx:45-54` 后台路由在 `/admin/*` 下、经 `AdminRoute` + `AdminLayout` |
| 预渲染引用封面 | `apps/server/src/scripts/prerender.ts` 用 `row.coverUrl` 经 `absoluteUrl()` 生成 `og:image`；封面 URL 必须是可绝对化的稳定地址 |
| SEO 端点 | 当前 Hono 提供 `/rss.xml`、`/sitemap.xml`、`/robots.txt`（根路径挂载，`app.ts:25-27`） |

**结论**：媒体库是「从无到有」的能力，需在 DB、后端、前端三处都新建，并补上「静态层如何服务上传文件」这一部署环节（现有设计 §2 明确 Hono 不托管前端静态，上传目录 `data/uploads` 也不在 `dist/` 内）。

---

## 2. 媒体库功能范围

对登录用户（当前仅 admin 角色）提供：

| 功能 | 说明 |
|------|------|
| 上传图片 | 单张/多选上传，限制类型与大小 |
| 图片列表 | 分页网格，按时间倒序 |
| 删除图片 | 软/硬删除 + 二次确认；删除同步移除磁盘文件 |
| 复制 URL | 复制图片可访问地址（`/uploads/<storageKey>` 或绝对地址） |
| 复制 Markdown | 复制 `![alt](url)` 片段，便于粘入正文 |
| 设置文章封面 | 在文章编辑页从媒体库选择图片，回填 `posts.coverUrl` |
| 插入文章正文 | 在 Markdown 编辑器插入 `![alt](url)` 到光标/末尾 |
| 图片 alt 文本 | 每张图可编辑 `alt`（无障碍 + SEO） |
| 文件大小 / 类型限制 | 服务端硬限制（见 §5），前端做友好提示 |

**不在本期交互范围**（但数据模型预留）：图片裁剪、多尺寸、相册分组。

---

## 3. 存储方案

### 3.1 本地存储（MVP）

- 上传根目录由环境变量 `UPLOAD_DIR` 指定，默认 `data/uploads`（与现有 `.gitignore` 一致）。
- 磁盘文件名**随机化**：`storageKey = randomId('u_') + ext`，`ext` 由 MIME 白名单映射（**不用原文件名**，杜绝路径穿越与编码问题）。
- 物理路径严格限制：`resolve(UPLOAD_DIR, storageKey)`，写前断言 `storageKey` 不含 `/`、`\`、`..` 等分隔符（防穿越）。

### 3.2 去重策略

- 上传内容计算 `contentHash`（如 sha256）；若已存在相同 `contentHash` 的资源，**复用已有记录与磁盘文件**，不重复落盘，直接返回既有 `url`（节省空间、天然防重复上传）。
- 仅当 `contentHash` 不存在时才写盘。

### 3.3 数据库 `assets` 表设计（草案，供 BLOG-11.1 落地）

```ts
export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),            // randomId('a_')
  storageKey: text('storage_key').notNull().unique(), // 磁盘文件名（随机化）
  originalName: text('original_name'),    // 展示用，仅存、不用于路径
  mimeType: text('mime_type').notNull(),  // 校验后白名单值
  size: integer('size').notNull(),
  contentHash: text('content_hash'),      // 去重
  width: integer('width'),                // 可选，解析后记录
  height: integer('height'),
  alt: text('alt'),                       // 无障碍 / SEO
  url: text('url').notNull(),             // 访问地址 /uploads/<storageKey>
  userId: text('user_id').references(() => users.id),
  createdAt: text('created_at').notNull(),
});
```

### 3.4 后续兼容 S3 / R2 / COS（仅预留抽象，不实现）

- 定义 `StorageProvider` 接口：`put(key, data, mime)` / `delete(key)`；本地实现写 `UPLOAD_DIR`，远程实现（S3/R2/COS）后续实现。
- URL 生成与存储后端解耦：`url` 列存逻辑路径 `/uploads/<key>`，由静态层（见 §7.3）解析到具体后端；远程后端时改为返回对象存储公网 URL。
- **本阶段（BLOG-11.0/11.1）只实现本地 provider**，但接口预留，避免后期迁移改调用方。

---

## 4. 后端接口

新增模块 `apps/server/src/modules/assets/`，含 `assets.routes.ts` / `assets.service.ts` / `assets.schema.ts`，并在 `app.ts` 挂载：

```ts
app.route('/api/admin/assets', adminAssetsRoutes);
```

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/admin/assets/upload` | `multipart/form-data`，单/多文件 | `authMiddleware` |
| GET | `/api/admin/assets` | 分页列表（`?page=&pageSize=`） | `authMiddleware` |
| GET | `/api/admin/assets/:id` | 单条详情 | `authMiddleware` |
| PATCH | `/api/admin/assets/:id` | 更新 `alt` 等元数据 | `authMiddleware` |
| DELETE | `/api/admin/assets/:id` | 删除资源 + 磁盘文件 | `authMiddleware` |

实现要点（对齐现有 `admin-posts` 模式）：

- 路由层 `adminAssetsRoutes.use('*', authMiddleware)`（同 `admin-posts.routes.ts:15`）。
- 复用现有分层：`service` 处理存储/去重/DB，`schema` 用 zod 校验（`uploadSchema`、`assetUpdateSchema`、`assetListQuery`）。
- 自定义错误类（如 `NotFoundError`、`UploadError`）返回 4xx，对齐 `admin-posts.service.ts` 的 `ConflictError` 风格。
- 上传大小上限在服务端用 `c.req.parseBody({ maxFileSize })` 或中间件硬限，超限返回 413。
- `upload` 接受 `multipart`，逐文件经 §5 安全校验后落盘 + 写 `assets` 行，返回资源视图。

---

## 5. 安全设计（强制）

上传是高风险入口，必须满足：

- **MIME 白名单**：仅允许 `image/png`、`image/jpeg`、`image/webp`、`image/gif`（必要时 `image/avif`）。拒绝一切其他类型。
- **扩展名校验**：扩展名由 MIME 映射得到（不用客户端提供的扩展名），且需与 MIME 一致。
- **真实类型校验**：不只信 `Content-Type`，用文件头 magic number（如 `file-type` 库或自判前若干字节）二次确认，防止 MIME 伪装。
- **禁止危险文件**：**拒绝 `image/svg+xml` 与任何 HTML**（SVG 可嵌 `<script>`，XSS 风险极高）；即使扩展名是 `.png` 但真实类型是 html 也拒绝。
- **大小限制**：服务端硬上限（建议单文件 ≤ 5MB，可在 `env` 配置），超限 413。
- **文件名随机化**：磁盘名用 `randomId + 白名单ext`，**绝不使用客户端文件名**作为磁盘路径。
- **路径穿越防护**：`storageKey` 生成后断言不含 `/ \ ..`；写盘路径 `resolve(UPLOAD_DIR, storageKey)` 必须仍在 `UPLOAD_DIR` 内（同 `prerender.ts` 的 `safeWrite` 思路）。
- **删除权限**：`DELETE` 仅允许删除「登录用户拥有」或「admin 角色」的资源（当前单 admin，等价于已登录即有权；多用户时需按 `userId` 归属校验），删除同时 `unlink` 磁盘文件。
- **不执行**：上传文件永远不被服务器当作代码执行；仅作静态资源由静态层返回。

---

## 6. 前端设计

### 6.1 媒体库页面 `/admin/assets`

- 在 `App.tsx:45-54` 的 `AdminLayout` 下新增 `<Route path="/admin/assets" element={<AdminAssets />} />`。
- 页面布局：上传区（拖拽 + 点击选择，`accept="image/*"`）+ 图片网格。
- 每项卡片：`缩略图` + `alt` 文本 + 操作：`复制 URL` / `复制 Markdown`（`![alt](url)`）/ `删除`（二次确认弹窗）。
- 列表走 React Query（`useQuery(['assets', page])`），分页。

### 6.2 文章编辑页接入（核心体验）

接入点均在 `apps/web/src/components/admin/AdminPostEditor.tsx`：

1. **封面图选择**（改造 `:182-190` 的文本框）：
   - 在文本框旁加「从媒体库选择」按钮 → 打开媒体库选择器（复用 `/admin/assets` 的网格组件，或弹窗版）→ 选中后 `set('coverUrl', url)` 回填。
   - 保留手动输入能力（高级用户可贴外链），但主路径改为「选图」。
2. **正文插入图片**（改造 `:207-214` 的 Markdown textarea）：
   - 在「预览/编辑」按钮旁加「插入图片」按钮 → 打开媒体库选择器 → 选中后把 `![alt](url)` 插入到 textarea 当前光标位置（或末尾）。
   - 插入的是标准 Markdown 图片语法，与现有 `Markdown` 渲染管线（`react-markdown` + `rehype-sanitize`）天然兼容。

### 6.3 共享组件

- 抽取「媒体库选择器」组件（`MediaPicker`），供封面选择、正文插图、未来头像等复用。
- 复制功能用 `navigator.clipboard.writeText`。

---

## 7. 与预渲染的关系

### 7.1 预渲染文章详情页的图片 URL

- 文章详情 `prerender.ts` 渲染 `contentMd` → HTML，图片 `![](url)` 原样保留；`url` 为 `/uploads/<key>` 或绝对地址均可（渲染管线不改写 URL）。
- 需确保 `Markdown` 渲染链路对 `<img>` 不误删（现有 `rehype-sanitize` 默认允许 `img` + `src`）。

### 7.2 OG 图片 / 封面

- `prerender.ts` 已用 `row.coverUrl` 经 `absoluteUrl()` 生成 `og:image`。媒体库产出的 `url` 形如 `/uploads/<key>`，预渲染时同样经 `absoluteUrl()` 绝对化，**无需改 prerender 逻辑**，只要 `BASE_URL` 在生产构建期正确传入（BLOG-10.4 已明确）。
- `alt` 文本目前未进 `og:image:alt`；BLOG-11.1 可顺带在 `prerender.ts` 注入 `og:image:alt`（可选增强）。

### 7.3 本地 `uploads` 在生产如何暴露（关键部署环节）

当前设计 §2 明确 **Hono 不托管前端静态**，`data/uploads` 也不在 `dist/` 内。生产必须有独立方式服务上传文件：

- **推荐方案 B（静态层服务）**：nginx / 静态层把 `/uploads` 指到物理目录 `data/uploads`（与 `dist/` 并列，由部署配置映射）。nginx 示例：
  ```nginx
  location /uploads {
    alias /path/to/apps/server/data/uploads;
    expires 30d;
    add_header Cache-Control "public";
  }
  ```
  保持 Hono 只做 API，零运行时耦合（与 §3 拓扑一致）。
- **备选方案 A（Hono 托管 /uploads）**：在 `app.ts` 加 `serveStatic({ root: UPLOAD_DIR })` 挂 `/uploads`。简单，但偏离「Hono 不托管静态」原则，仅限 `/uploads` 子路径可接受；多实例部署时不共享磁盘则需对象存储。
- **BLOG-10.4 文档需补充**：`docs/BLOG-10.4-prerender-deployment.md` 的静态层配置段应追加「`/uploads` 静态服务」说明（BLOG-11.1 实现时同步补文档）。

### 7.4 私密边界

- 媒体库资源本身不区分公开/私有（图片 URL 一旦生成即可访问）。若某图片仅用于草稿/私有文章，其 URL 仍可被直接访问——这是可接受的（URL 不可枚举 + 随机 `storageKey`）；但**不应在预渲染/公开页引用私有内容图片**。封面/正文图片的私密过滤已由文章 `published+public` 过滤保证（预渲染只渲染公开文），图片 URL 泄露风险低。
- 后续如需要，可加 `assets.visibility` 字段，但本期不做。

---

## 8. 非目标（本阶段明确不做）

- ❌ 图片裁剪 / 缩略图多尺寸生成
- ❌ AI 图片生成 / 处理
- ❌ 图床多供应商实现（S3/R2/COS 仅预留抽象接口，不实现）
- ❌ CDN 自动刷新
- ❌ 权限分组 / 多用户资源隔离（本期单 admin；删除仅按登录态）
- ❌ 进入评论后台（评论后台放到媒体库之后）

---

## 9. 分阶段实施计划（供 BLOG-11.1 落地，本阶段不实现）

- **阶段 1 — 存储与接口**：`assets` 表 + `assets` 模块（routes/service/schema），本地 `StorageProvider` + 去重 + §5 全部安全校验；挂载 `app.route('/api/admin/assets', ...)`；用 `curl`/`Postman` 验证上传/列表/删除。
- **阶段 2 — 媒体库前端**：`/admin/assets` 页面 + 上传/复制/删除交互（React Query）。
- **阶段 3 — 编辑页接入**：`AdminPostEditor` 封面「从媒体库选择」+ Markdown「插入图片」，抽取 `MediaPicker` 组件。
- **阶段 4 — 预渲染 / 部署联动**：确认预渲染图片 URL 绝对化正确；BLOG-10.4 文档补充 `/uploads` 静态服务段；`og:image:alt` 可选增强。

---

## 10. 验收标准（供 BLOG-11.1，本阶段不实现）

- 登录 admin 可上传图片，列表可见，复制 URL / Markdown 可用，删除可移除磁盘文件。
- 上传被 §5 安全规则拦截：非图片类型、超大小、SVG/HTML、伪装 MIME 均拒绝；磁盘文件名随机、无路径穿越。
- 文章编辑页可从媒体库选封面（回填 `coverUrl`）、可在正文插入 `![alt](url)`。
- 预渲染文章详情页图片与 `og:image` 均为正确绝对地址；私有文章封面/图片不出现在公开预渲染产物。
- 生产部署 `nginx` 能正确服务 `/uploads`，图片在公开页与 OG 卡片正常显示。
- 不引入评论后台、不做裁剪/AI/多供应商/CDN 刷新/权限分组。
