# BLOG-12.0：评论系统与评论后台方案规划

> 基线：`origin/main` 最新提交 `5cd1756`（docs: add media deployment and backup guide）
> 本阶段范围：**仅产出规划文档，不写实现代码、不改业务代码、不引入新依赖、不进入 BLOG-12.1**
> 目标：为 nowen-blog 设计「评论系统与评论后台」方案，明确产品范围、安全边界、数据库模型、接口、前端展示、后台审核和预渲染关系，作为后续 BLOG-12.1 实现的工程依据。
> 优先级理由：文章 CRUD 和媒体库已完成，博客已具备内容生产能力；但缺乏读者互动能力，评论系统是提升博客活跃度和读者参与度的基础设施。评论比媒体库更敏感，涉及游客提交内容、XSS 安全、垃圾评论等问题，必须先规划清楚。

---

## 1. 当前博客能力基线

本规划基于 `5cd1756` 的真实代码，相关事实点：

| 关注点 | 现状（引用真实文件） |
|--------|----------------------|
| 文章管理 | `apps/server/src/modules/posts/` 和 `admin-posts/` 已完成，支持 CRUD、发布/草稿、SEO 字段 |
| 媒体库 | `apps/server/src/modules/assets/` 已完成，支持上传、列表、删除、选择封面、插入正文 |
| 预渲染 | `apps/server/src/scripts/prerender.ts` 已完成，构建期生成静态 HTML，支持 `og:*`、`jsonLd`、正文 |
| 后台登录 | `apps/server/src/modules/auth/` 已完成，session cookie 鉴权，`authMiddleware` 保护 admin 路由 |
| 前台路由 | `apps/web/src/App.tsx` 已实现文章列表、分类、标签、搜索、文章详情页 |
| 后台路由 | `apps/web/src/App.tsx` 已实现 `/admin/*` 下的文章、分类、标签、媒体库管理 |
| 评论系统 | **不存在** `comments` 表；无评论接口、无评论前端、无评论后台 |
| 数据库表 | `schema.ts` 仅有 users/posts/categories/tags/assets 及关联表，无 comments 相关表 |
| 游客交互 | 当前无任何游客提交能力（无评论、无留言、无表单） |
| 预渲染产物 | 仅包含文章内容，不包含评论（评论需动态加载） |

**结论**：评论系统是从无到有的能力，需在 DB、后端、前端三处都新建，并重点解决安全问题（游客内容、XSS、垃圾评论）和预渲染边界（评论不进入静态 HTML）。

---

## 2. 评论系统范围

### 2.1 核心功能

对博客读者（游客）和管理员提供：

| 功能 | 说明 | 用户角色 |
|------|------|----------|
| 查看评论 | 在文章详情页查看已审核评论 | 游客 |
| 发表评论 | 填写昵称、邮箱、评论内容并提交 | 游客 |
| 评论审核 | 管理员审核待审核评论 | 管理员 |
| 评论管理 | 批准/拒绝/删除评论 | 管理员 |
| 评论筛选 | 按状态（pending/approved/rejected）筛选 | 管理员 |
| 评论回复 | 管理员回复评论（可选，第一版是否纳入待定） | 管理员 |

### 2.2 功能边界

**第一版 MVP 必须包含**：
- ✅ 游客发表评论（昵称、邮箱、内容）
- ✅ 评论审核流程（pending → approved/rejected）
- ✅ 前台只展示 approved 评论
- ✅ 后台评论管理（列表、筛选、审核、删除）

**第一版 MVP 不包含**（见 §4 非目标）：
- ❌ 嵌套多级评论（回复功能）
- ❌ 富文本编辑器（仅纯文本或受限 Markdown）
- ❌ 第三方登录（GitHub、Google 等）
- ❌ 邮件通知（新评论通知管理员）
- ❌ 点赞/踩功能
- ❌ AI 审核
- ❌ 评论导入导出

---

## 3. 第一版 MVP 推荐范围

### 3.1 游客提交字段

| 字段 | 必填 | 说明 | 限制 |
|------|------|------|------|
| `authorName` | ✅ | 游客昵称 | 2-50 字符，禁止特殊字符 |
| `authorEmail` | ✅ | 游客邮箱 | 格式校验，不公开显示 |
| `authorWebsite` | ❌ | 个人网站（可选） | URL 格式校验，可选不显示 |
| `content` | ✅ | 评论正文 | 10-2000 字符，纯文本或受限 Markdown |
| `postId` | ✅ | 关联文章 | 由前端根据 URL slug 查询得到 |

### 3.2 审核流程

**推荐默认：所有游客评论进入 `pending` 状态**

```
游客提交
    ↓
status = 'pending'（待审核）
    ↓
管理员审核
    ├─→ approve → status = 'approved'（展示在前台）
    ├─→ reject → status = 'rejected'（不展示）
    └─→ spam → status = 'spam'（不展示，用于垃圾评论分析）
```

**审核策略**（详见 §10）：
- 第一版：所有评论默认 pending，管理员手动审核
- 后续可扩展：关键词过滤、频率限制、IP 黑名单

### 3.3 前台展示规则

- **只展示 `status = 'approved'` 的评论**
- 评论按创建时间正序排列（最早的在前）
- 不展示游客邮箱（即使提交了）
- 可选展示游客网站（如果填写且管理员允许）

### 3.4 后台管理能力

| 操作 | 说明 |
|------|------|
| 列表查看 | 分页列表，显示评论内容、作者、文章、状态、时间 |
| 状态筛选 | 按 pending/approved/rejected/spam 筛选 |
| 文章筛选 | 按文章筛选评论 |
| 批准 | 将 pending 改为 approved |
| 拒绝 | 将 pending 改为 rejected |
| 标记为垃圾 | 将 pending 改为 spam |
| 删除 | 软删除（设置 `deletedAt`）或硬删除 |
| 查看详情 | 查看完整评论内容、IP、User-Agent（安全审计） |

---

## 4. 非目标（本阶段明确不做）

- ❌ **第三方登录**：不涉及 GitHub OAuth、Google Sign-In 等，第一版仅游客提交
- ❌ **邮件通知**：新评论不发送邮件通知管理员，第一版靠管理员主动查看后台
- ❌ **点赞/踩**：不对评论进行点赞或踩功能
- ❌ **嵌套多级评论**：不支持回复功能，所有评论都是一级平铺
- ❌ **富文本编辑器**：评论正文仅支持纯文本或受限 Markdown（无 HTML）
- ❌ **AI 审核**：不使用 AI 进行自动审核，第一版靠人工审核
- ❌ **评论导入导出**：不提供评论数据的导入导出功能
- ❌ **评论订阅**：不支持 RSS 订阅评论
- ❌ **@提及**：不支持 @username 提及功能
- ❌ **表情反应**：不支持表情符号或 emoji 选择器（但允许输入 emoji 字符）

**后续版本可考虑**：
- 回复功能（嵌套评论）
- Markdown 增强支持
- 邮件通知
- 垃圾评论自动检测
- 评论点赞

---

## 5. 数据库设计

### 5.1 `comments` 表设计

```ts
// apps/server/src/db/schema.ts

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),              // randomId('c_')
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'),              // 可选，用于回复功能（第一版可为 null）
  
  // 游客信息
  authorName: text('author_name').notNull(),       // 昵称
  authorEmail: text('author_email').notNull(),     // 邮箱（不公开）
  authorWebsite: text('author_website'),           // 个人网站（可选）
  
  // 评论内容
  content: text('content').notNull(),              // 评论正文（纯文本或受限 Markdown）
  contentHtml: text('content_html'),               // 渲染后的 HTML（服务端渲染，sanitize 后）
  
  // 审核状态
  status: text('status').notNull().default('pending'),  // pending/approved/rejected/spam
  
  // 安全审计（可选，用于反垃圾）
  ipHash: text('ip_hash'),                    // IP 的哈希值（不明文存储）
  userAgent: text('user_agent'),              // User-Agent（用于分析）
  
  // 时间戳
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  approvedAt: text('approved_at'),            // 审核通过时间
  deletedAt: text('deleted_at'),              // 软删除时间（可选）
}, (table) => ({
  // 索引：按文章 ID 和状态查询优化
  postIdIdx: index('comments_post_id_idx').on(table.postId),
  statusIdx: index('comments_status_idx').on(table.status),
  createdAtIdx: index('comments_created_at_idx').on(table.createdAt),
}));

// 可选：如果需要回复功能，添加自引用关系
export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  parent: one(comments, { fields: [comments.parentId], references: [comments.id] }),
  replies: many(comments, { relationName: 'replies' }),
}));
```

### 5.2 字段说明

| 字段 | 类型 | 说明 | 安全考虑 |
|------|------|------|----------|
| `id` | `text` | 主键，`c_<randomId>` | 不可枚举 |
| `postId` | `text` | 关联文章 ID | 外键约束，级联删除 |
| `parentId` | `text` | 父评论 ID（回复） | 第一版可为 null |
| `authorName` | `text` | 游客昵称 | 长度限制、特殊字符过滤 |
| `authorEmail` | `text` | 游客邮箱 | 不公开、格式校验、加密存储（可选） |
| `authorWebsite` | `text` | 个人网站 | URL 校验、可选不存储 |
| `content` | `text` | 原始评论内容 | 长度限制、HTML 转义 |
| `contentHtml` | `text` | 渲染后 HTML | **必须 sanitize**，禁止危险标签 |
| `status` | `text` | 审核状态 | 枚举约束：pending/approved/rejected/spam |
| `ipHash` | `text` | IP 哈希 | 不明文存储 IP，用于反垃圾 |
| `userAgent` | `text` | User-Agent | 用于分析，可选 |
| `createdAt` | `text` | 创建时间 | ISO 8601 |
| `updatedAt` | `text` | 更新时间 | ISO 8601 |
| `approvedAt` | `text` | 审核时间 | 仅 approved 状态有值 |
| `deletedAt` | `text` | 软删除时间 | 软删除标记 |

### 5.3 状态枚举

```ts
// 评论状态枚举
export const COMMENT_STATUS = {
  PENDING: 'pending',      // 待审核
  APPROVED: 'approved',    // 已批准（展示）
  REJECTED: 'rejected',    // 已拒绝（不展示）
  SPAM: 'spam',            // 垃圾评论（不展示）
} as const;

export type CommentStatus = typeof COMMENT_STATUS[keyof typeof COMMENT_STATUS];
```

### 5.4 数据库迁移

由于是新增表，需要执行数据库迁移：

```bash
# 使用 Drizzle Kit 生成迁移
cd apps/server
pnpm drizzle-kit generate:sqlite

# 或手动执行 SQL
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id TEXT,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_website TEXT,
  content TEXT NOT NULL,
  content_html TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX comments_post_id_idx ON comments(post_id);
CREATE INDEX comments_status_idx ON comments(status);
CREATE INDEX comments_created_at_idx ON comments(created_at);
```

---

## 6. 后端接口设计

### 6.1 模块结构

新增模块 `apps/server/src/modules/comments/`，含：
- `comments.routes.ts` — 公开路由 + 后台路由
- `comments.service.ts` — 业务逻辑
- `comments.schema.ts` — Zod 校验 schema

在 `app.ts` 挂载：
```ts
import { commentsRoutes, adminCommentsRoutes } from './modules/comments/comments.routes';

// 公开接口（无需登录）
app.route('/api/posts', commentsRoutes);  // 嵌套在 /api/posts/:slug/comments

// 后台接口（需要登录）
app.route('/api/admin/comments', adminCommentsRoutes);
```

### 6.2 公开接口（游客可用）

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| `GET` | `/api/posts/:slug/comments` | 获取文章的 approved 评论列表 | 无 |
| `POST` | `/api/posts/:slug/comments` | 发表评论（进入 pending） | 无（有频率限制） |

#### 6.2.1 GET /api/posts/:slug/comments

**请求参数**：
```
GET /api/posts/:slug/comments?page=1&pageSize=20
```

**响应**：
```json
{
  "items": [
    {
      "id": "c_Ab3x9G2q",
      "authorName": "张三",
      "authorWebsite": "https://example.com",  // 可选，如果没有则为 null
      "content": "这篇文章很有帮助！",
      "contentHtml": "<p>这篇文章很有帮助！</p>",
      "createdAt": "2026-07-09T10:30:00.000Z",
      "approvedAt": "2026-07-09T11:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

**注意**：
- 只返回 `status = 'approved'` 的评论
- 不返回 `authorEmail`、`ipHash`、`userAgent` 等敏感字段
- 按 `createdAt` 正序排列（最早的在前）

#### 6.2.2 POST /api/posts/:slug/comments

**请求体**：
```json
{
  "authorName": "张三",
  "authorEmail": "zhangsan@example.com",
  "authorWebsite": "https://example.com",  // 可选
  "content": "这篇文章很有帮助！"
}
```

**响应**（201 Created）：
```json
{
  "id": "c_Ab3x9G2q",
  "status": "pending",
  "message": "评论已提交，等待审核"
}
```

**错误响应**：
- 400：参数错误（缺少必填字段、格式错误）
- 404：文章不存在
- 429：提交频率过高（频率限制）
- 403：文章不允许评论（如果实现此功能）

### 6.3 后台接口（需登录）

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| `GET` | `/api/admin/comments` | 分页列表（可按状态/文章筛选） | `authMiddleware` |
| `GET` | `/api/admin/comments/:id` | 单条详情 | `authMiddleware` |
| `PATCH` | `/api/admin/comments/:id` | 更新状态（approve/reject/spam） | `authMiddleware` |
| `DELETE` | `/api/admin/comments/:id` | 删除评论（软删或硬删） | `authMiddleware` |
| `POST` | `/api/admin/comments/:id/approve` | 批准评论 | `authMiddleware` |
| `POST` | `/api/admin/comments/:id/reject` | 拒绝评论 | `authMiddleware` |

#### 6.3.1 GET /api/admin/comments

**请求参数**：
```
GET /api/admin/comments?page=1&pageSize=20&status=pending&postId=xxx
```

**响应**：
```json
{
  "items": [
    {
      "id": "c_Ab3x9G2q",
      "postId": "p_xxx",
      "postTitle": "文章标题",
      "authorName": "张三",
      "authorEmail": "zhangsan@example.com",  // 后台可见
      "authorWebsite": "https://example.com",
      "content": "这篇文章很有帮助！",
      "contentHtml": "<p>这篇文章很有帮助！</p>",
      "status": "pending",
      "ipHash": "a1b2c3d4...",  // 可选
      "userAgent": "Mozilla/5.0...",  // 可选
      "createdAt": "2026-07-09T10:30:00.000Z",
      "updatedAt": "2026-07-09T10:30:00.000Z",
      "approvedAt": null,
      "deletedAt": null
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

#### 6.3.2 PATCH /api/admin/comments/:id

**请求体**（更新状态）：
```json
{
  "status": "approved"  // 或 "rejected"、"spam"
}
```

**响应**：
```json
{
  "id": "c_Ab3x9G2q",
  "status": "approved",
  "approvedAt": "2026-07-09T11:00:00.000Z",
  "message": "评论已批准"
}
```

#### 6.3.3 DELETE /api/admin/comments/:id

**响应**（200 OK）：
```json
{
  "ok": true,
  "message": "评论已删除"
}
```

**删除策略**：
- 第一版：硬删除（从数据库移除）
- 后续可改为软删除（设置 `deletedAt`）

---

## 7. 安全设计（强制）

评论系统是**高风险入口**（游客可提交内容），必须满足：

### 7.1 输入校验

| 字段 | 校验规则 | 错误响应 |
|------|----------|----------|
| `authorName` | 2-50 字符，禁止 `<>'"&` 等特殊字符 | 400 |
| `authorEmail` | 邮箱格式校验（RFC 5322 简化版） | 400 |
| `authorWebsite` | URL 格式校验（可选，如果填写） | 400 |
| `content` | 10-2000 字符，禁止 raw HTML | 400 |
| `postId` | 必须存在且文章已发布 | 404 |

### 7.2 XSS 防护

**核心原则：评论内容不允许任意 HTML**

#### 7.2.1 存储前处理

```ts
import { sanitizeHtml } from '../../lib/sanitize';  // 假设有此工具函数

// 在 service 层处理评论内容
function processCommentContent(content: string): { raw: string; html: string } {
  // 1. 转义 HTML 特殊字符（防止 XSS）
  const escaped = escapeHtml(content);
  
  // 2. 如果支持受限 Markdown，先渲染 Markdown，再 sanitize
  // const html = sanitizeHtml(renderMarkdown(escaped));
  
  // 3. 如果不支持 Markdown，直接转义后包裹 <p> 标签
  const html = `<p>${escaped}</p>`;
  
  // 4. 最终 sanitize（双重保险）
  const safeHtml = sanitizeHtml(html);
  
  return { raw: content, html: safeHtml };
}
```

#### 7.2.2 sanitize 策略

使用 `sanitize-html` 库或类似工具，**白名单策略**：

```ts
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'blockquote'];
const ALLOWED_ATTRIBUTES = {
  'a': ['href', 'title', 'rel'],  // a 标签只允许这些属性
};
const ALLOWED_SCHEMES = ['http', 'https'];  // 不允许 javascript: 等危险协议

// 禁止的标签和属性（黑名单，双重保险）
const FORBIDDEN_TAGS = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'];
const FORBIDDEN_ATTRIBUTES = ['onclick', 'onerror', 'onload', 'style'];  // 禁止事件处理器和内联样式
```

#### 7.2.3 输出时处理

- 前台展示 `contentHtml`（已 sanitize）
- 不使用 `v-html` 指令（Vue）或 `dangerouslySetInnerHTML`（React）直接渲染未 sanitize 的内容
- React 侧使用 `react-markdown` + `rehype-sanitize` 再次过滤（纵深防御）

### 7.3 频率限制

**目标**：防止垃圾评论机器人短时间内大量提交

#### 7.3.1 简单方案（第一版）

基于 IP 的简易频率限制（内存存储）：

```ts
// 简单的内存频率限制（生产环境建议用 Redis）
const submitHistory = new Map<string, number[]>();  // IP -> 提交时间戳数组

function checkRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const history = submitHistory.get(ipHash) || [];
  
  // 清除 1 分钟前的记录
  const recent = history.filter(ts => now - ts < 60 * 1000);
  
  if (recent.length >= 5) {  // 1 分钟内最多 5 次提交
    return false;  // 触发频率限制
  }
  
  recent.push(now);
  submitHistory.set(ipHash, recent);
  return true;  // 通过频率限制
}
```

#### 7.3.2 推荐方案（生产环境）

使用 Redis 或类似存储：

```
# Redis key 设计
rate_limit:comments:ip_hash:{hash} -> 提交次数（TTL 60秒）

# 逻辑
INCR rate_limit:comments:ip_hash:{hash}
EXPIRE rate_limit:comments:ip_hash:{hash} 60
如果值 > 5，拒绝请求（429 Too Many Requests）
```

### 7.4 IP 处理

**原则：不明文存储游客 IP**

```ts
import { createHash } from 'node:crypto';

function hashIp(ip: string): string {
  // 使用 SHA-256 + salt 哈希 IP
  const salt = process.env.IP_SALT || 'default-salt-change-me';
  return createHash('sha256').update(ip + salt).digest('hex').substring(0, 16);  // 只存前 16 字符
}
```

**用途**：
- 频率限制（基于 `ipHash`）
- 垃圾评论分析（相同 `ipHash` 多次提交）
- 不用于追踪游客（不可逆）

### 7.5 其他安全措施

| 措施 | 说明 |
|------|------|
| **CSRF 防护** | 使用 session cookie，确保 `SameSite=Lax` 或 `Strict` |
| **Content Security Policy** | 响应头添加 `Content-Security-Policy`，限制 `script-src`（防止 XSS 执行） |
| **User-Agent 记录** | 可选记录 `userAgent`，用于分析垃圾评论特征 |
| **关键词过滤** | 简单的关键词黑名单（第一版可不做，后续扩展） |
| **链接限制** | 评论内容中的链接数量限制（防止 SEO 垃圾） |
| **长度限制** | 服务端硬限制请求体大小（`maxBodySize`） |

---

## 8. 前端设计

### 8.1 文章详情页评论区

#### 8.1.1 评论列表

**位置**：文章正文下方

**组件结构**：
```
<ArticleComments postSlug={slug} />
  ├─ <CommentList />        // 评论列表
  │    ├─ <CommentItem />  // 单条评论
  │    └─ <CommentPagination />  // 分页
  └─ <CommentForm />        // 评论表单
```

**展示规则**：
- 只展示 `status = 'approved'` 的评论
- 按 `createdAt` 正序排列（最早的在前）
- 显示：昵称、评论内容、发布时间
- 可选显示：个人网站链接（如果填写）
- 不显示：邮箱、IP、审核状态

#### 8.1.2 评论表单

**字段**：
- 昵称（必填）
- 邮箱（必填，提示"不会公开显示"）
- 个人网站（可选）
- 评论内容（必填，textarea，10-2000 字符）

**提交后行为**：
1. 显示成功提示："评论已提交，等待审核"
2. 清空表单
3. **不立即显示**评论（因为还在 pending）

**前端校验**：
- 必填字段检查
- 邮箱格式检查
- 长度限制提示
- 提交按钮禁用（防止重复提交）

### 8.2 后台评论管理页 `/admin/comments`

#### 8.2.1 页面布局

```
/admin/comments
  ├─ 筛选栏
  │    ├─ 状态筛选：全部 / pending / approved / rejected / spam
  │    ├─ 文章筛选：下拉选择或搜索
  │    └─ 时间范围：可选
  ├─ 评论列表（表格或卡片）
  │    ├─ 评论内容（截断显示）
  │    ├─ 作者信息
  │    ├─ 关联文章
  │    ├─ 状态标签
  │    ├─ 提交时间
  │    └─ 操作按钮：批准 / 拒绝 / 删除
  └─ 分页
```

#### 8.2.2 操作交互

| 操作 | 交互方式 | 确认 |
|------|----------|------|
| 批准 | 点击"批准"按钮 | 无需确认（直接执行） |
| 拒绝 | 点击"拒绝"按钮 | 无需确认（直接执行） |
| 删除 | 点击"删除"按钮 | **需要二次确认**（Modal 弹窗） |
| 批量操作 | 第一版不做 | - |

#### 8.2.3 状态标签样式

```ts
const STATUS_CONFIG = {
  pending:   { label: '待审核', color: 'yellow' },
  approved:  { label: '已批准', color: 'green' },
  rejected:  { label: '已拒绝', color: 'red' },
  spam:      { label: '垃圾', color: 'gray' },
};
```

### 8.3 前端路由

在 `apps/web/src/App.tsx` 添加：

```tsx
// 前台路由（文章详情页已有，只需在详情页组件中添加评论区）
<Route path="/posts/:slug" element={<PostDetail />} />

// 后台路由
<Route path="/admin/comments" element={<AdminComments />} />
```

---

## 9. 与预渲染的关系

### 9.1 核心原则

**评论不进入构建期静态 HTML**

原因：
1. 评论是动态的（审核、新增、删除）
2. 预渲染是构建期静态生成，无法反映实时评论
3. 评论需游客交互，适合客户端动态加载

### 9.2 实现方式

#### 9.2.1 文章详情页预渲染

`prerender.ts` **不做任何改动**：
- 继续渲染文章正文、SEO meta、og:image 等
- 不渲染评论区（评论区由客户端动态加载）

#### 9.2.2 评论客户端动态加载

```tsx
// apps/web/src/components/PostDetail.tsx

function PostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 1. 文章数据来自预渲染 HTML（或 API 回退）
  useEffect(() => {
    // 如果预渲染已包含文章数据，直接使用
    // 否则从 API 获取
  }, [slug]);
  
  // 2. 评论数据客户端动态加载
  useEffect(() => {
    fetch(`/api/posts/${slug}/comments`)
      .then(res => res.json())
      .then(data => {
        setComments(data.items);
        setLoading(false);
      });
  }, [slug]);
  
  return (
    <article>
      {/* 文章正文（来自预渲染或 API） */}
      <div dangerouslySetInnerHTML={{ __html: post?.contentHtml }} />
      
      {/* 评论区（客户端动态加载） */}
      <section id="comments">
        <h2>评论</h2>
        {loading ? (
          <p>加载中...</p>
        ) : (
          <CommentList comments={comments} />
        )}
        <CommentForm postSlug={slug} />
      </section>
    </article>
  );
}
```

### 9.3 对预渲染的影响

| 关注点 | 影响 | 说明 |
|--------|------|------|
| 预渲染构建时间 | **无影响** | 评论不进入预渲染 |
| 预渲染产物大小 | **无影响** | 静态 HTML 不包含评论 |
| 预渲染页面 SEO | **无影响** | 评论不影响文章 SEO |
| OG 图片 | **无影响** | `og:image` 来自 `coverUrl` |
| RSS/Sitemap | **无影响** | 不包含评论 |
| 构建触发 | **无影响** | 新增评论不触发重构建 |

### 9.4 客户端路由与评论

- 如果博客使用 SPA 客户端路由（React Router），评论在路由切换时重新加载
- 如果使用传统页面切换（MPA），评论在页面加载时加载

---

## 10. 审核策略

### 10.1 推荐默认策略

**所有游客评论默认 `status = 'pending'`**

原因：
1. 防止垃圾评论直接展示
2. 给管理员审核机会
3. 符合一般博客评论流程

### 10.2 审核操作流程

#### 10.2.1 管理员审核

1. 管理员登录后台
2. 访问 `/admin/comments`
3. 查看 `pending` 状态的评论
4. 逐条审核：
   - **批准**：`status` 改为 `approved`，设置 `approvedAt`
   - **拒绝**：`status` 改为 `rejected`（可附拒绝原因，第一版可不做）
   - **标记为垃圾**：`status` 改为 `spam`（用于分析垃圾评论特征）

#### 10.2.2 审核后行为

| 操作 | 前台行为 | 通知 |
|------|----------|------|
| 批准 | 评论立即在前台展示 | 第一版无邮件通知 |
| 拒绝 | 评论不展示 | 无通知 |
| 垃圾 | 评论不展示 | 无通知，但记录 `ipHash` 供分析 |

### 10.3 自动审核（后续扩展）

第一版不做自动审核，后续可考虑：

- **关键词过滤**：包含敏感词的评论自动 reject
- **链接数量限制**：包含过多链接的评论自动 spam
- **IP 黑名单**：频繁提交垃圾评论的 IP 自动拒绝
- **AI 审核**：使用 AI 判断评论是否为垃圾内容

### 10.4 删除策略

**第一版：硬删除**

- 管理员删除评论后，从数据库彻底移除
- 不提供恢复机制（第一版）

**后续可改为软删除**：

- 设置 `deletedAt` 字段
- 软删除的评论不展示
- 可在后台"回收站"恢复

---

## 11. 验收标准

### 11.1 功能验收

- [ ] 游客可在文章详情页提交评论（填写昵称、邮箱、内容）
- [ ] 提交后评论进入 `pending` 状态，前台不展示
- [ ] 管理员可在后台查看 pending 评论列表
- [ ] 管理员可批准评论（改为 `approved`），前台立即展示
- [ ] 管理员可拒绝评论（改为 `rejected`），前台不展示
- [ ] 管理员可删除评论（从数据库移除）
- [ ] 前台只展示 `approved` 状态的评论
- [ ] 评论按时间正序排列
- [ ] 评论表单有前端校验（必填、格式、长度）
- [ ] 提交频率限制生效（防止垃圾评论）

### 11.2 安全验收

- [ ] 评论内容 XSS 防护生效（禁止 `<script>` 等危险标签）
- [ ] 评论内容 HTML 转义或 sanitize
- [ ] 昵称特殊字符过滤
- [ ] 邮箱格式校验
- [ ] 游客 IP 不明文存储（哈希处理）
- [ ] 后台接口需要登录（`authMiddleware`）
- [ ] 频率限制生效（1 分钟内最多 5 次提交）
- [ ] 请求体大小限制（防止超大请求）

### 11.3 性能验收

- [ ] 评论列表分页加载（默认 20 条/页）
- [ ] 评论 API 响应时间 < 200ms（本地测试）
- [ ] 文章详情页加载不受评论影响（评论客户端动态加载）
- [ ] 预渲染构建时间不因评论增加（评论不进入预渲染）

### 11.4 文档验收

- [ ] 本规划文档完整、清晰
- [ ] 数据库表设计明确
- [ ] 接口设计明确
- [ ] 安全设计明确
- [ ] 与预渲染的关系明确
- [ ] 阶段拆分明确（BLOG-12.1/12.2/12.3/12.4）

---

## 12. 推荐实施路线

### 12.1 阶段拆分

| 阶段 | 名称 | 内容 | 依赖 |
|------|------|------|------|
| **BLOG-12.1** | 评论后端基础 | `comments` 表、公开提交接口、公开列表接口、后台审核接口 | 无 |
| **BLOG-12.2** | 前台评论展示与提交 | 文章详情页评论列表、评论表单、提交成功提示 | BLOG-12.1 |
| **BLOG-12.3** | 后台评论管理页面 | `/admin/comments`、筛选、审核、删除 | BLOG-12.1 |
| **BLOG-12.4** | 评论部署与安全加固文档 | 频率限制、spam 策略、备份、运维检查 | BLOG-12.1/12.2/12.3 |

### 12.2 实施顺序建议

**推荐顺序**：BLOG-12.1 → BLOG-12.2 → BLOG-12.3 → BLOG-12.4

原因：
1. BLOG-12.1 是基础设施（DB + API），必须先完成
2. BLOG-12.2 和 BLOG-12.3 可并行（前后端独立），但建议先完成 BLOG-12.2（快速验证端到端流程）
3. BLOG-12.4 在所有功能完成后编写

### 12.3 每阶段验收

- **BLOG-12.1 验收**：用 `curl` 测试评论提交和列表接口，用数据库工具查看 `comments` 表
- **BLOG-12.2 验收**：文章详情页能提交评论并看到"等待审核"提示，刷新页面后评论不显示（因为 pending）
- **BLOG-12.3 验收**：后台能查看 pending 评论并批准，批准后前台刷新能看到评论
- **BLOG-12.4 验收**：文档完整，覆盖部署、安全、备份、故障排查

---

## 13. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **垃圾评论** | 审核工作量大、影响用户体验 | 频率限制、关键词过滤、IP 哈希分析 |
| **XSS 攻击** | 窃取用户 cookie、执行恶意脚本 | HTML sanitize、CSP 响应头、纵深防御 |
| **CSRF 攻击** | 伪造游客提交评论 | SameSite cookie、CSRF token（可选） |
| **数据库性能** | 评论数量大时查询慢 | 索引优化、分页查询、考虑缓存 |
| **游客滥用** | 恶意提交、骚扰 | 频率限制、IP 哈希、审核机制 |
| **邮箱泄露** | 游客邮箱被公开 | 前台不返回 `authorEmail` 字段 |

---

## 14. 后续扩展方向

以下功能不在第一版范围，但可作为后续优化：

- [ ] **回复功能**：嵌套评论（parentId 字段已预留）
- [ ] **Markdown 支持**：评论内容支持受限 Markdown 语法
- [ ] **邮件通知**：新评论邮件通知管理员
- [ ] **评论点赞**：对评论进行点赞
- [ ] **垃圾评论自动检测**：AI 审核、贝叶斯过滤
- [ ] **评论订阅**：RSS 订阅评论
- [ ] **@提及**：@username 提及功能
- [ ] **表情反应**：emoji 选择器
- [ ] **评论编辑**：游客可编辑自己的评论（限时）
- [ ] **评论置顶**：管理员可置顶特定评论
- [ ] **评论搜索**：后台搜索评论内容

---

## 15. 总结

### 15.1 核心决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 审核机制 | 默认 pending，人工审核 | 防止垃圾评论，第一版简单可靠 |
| XSS 防护 | HTML 转义 + sanitize | 纵深防御，禁止危险内容 |
| 游客信息 | 昵称 + 邮箱（不公开） | 平衡匿名性和责任感 |
| 频率限制 | 基于 IP 哈希 | 防止垃圾评论机器人 |
| 预渲染关系 | 评论不进入静态 HTML | 评论是动态的，适合客户端加载 |
| 删除策略 | 第一版硬删除 | 简单，后续可改为软删除 |

### 15.2 下一步

1. **确认本规划文档**：检查范围、安全设计、接口设计是否合理
2. **启动 BLOG-12.1**：实现评论后端基础（DB + API）
3. **并行准备**：前端组件设计、后台页面设计

---

> 本文档为 BLOG-12 系列规划文档，覆盖评论系统产品范围、安全边界、数据库模型、接口设计、前端展示、后台审核和预渲染关系。
> 确认后，可进入 BLOG-12.1 实现阶段。
