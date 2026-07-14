import { sqlite } from './client';
import { nowIso } from '../lib/format';

type SeedDocument = {
  id: string;
  title: string;
  slug: string;
  description: string;
  contentMd: string;
  parentId?: string;
  sortOrder: number;
};

const SPACE_ID = 'docspace_nowen_note_api';
const VERSION_ID = 'docver_nowen_note_api_latest';
const SPACE_SLUG = 'nowen-note-api';

const documents: SeedDocument[] = [
  {
    id: 'doc_nn_api_start',
    title: '开始使用',
    slug: 'start',
    description: '了解 Nowen Note API、认证方式和第一个请求。',
    sortOrder: 10,
    contentMd: `# 开始使用

Nowen Note 提供 REST API，可用于浏览器剪藏、命令行工具、自动化脚本和第三方应用集成。

建议按以下顺序阅读：

1. API 概览
2. 认证与 API Token
3. 第一个 API 请求

> 本文档基于 Nowen Note 当前后端路由、OpenAPI 规范和官方 TypeScript SDK 整理。不同版本可能存在少量差异，部署实例可通过 \`GET /api/openapi.json\` 查看机器可读规范。`,
  },
  {
    id: 'doc_nn_api_overview',
    parentId: 'doc_nn_api_start',
    title: 'API 概览',
    slug: 'overview',
    description: '基础地址、数据格式、认证方式和通用约定。',
    sortOrder: 11,
    contentMd: `# API 概览

## 基础地址

所有接口都以你的 Nowen Note 部署地址为基础：

\`\`\`text
https://note.example.com/api
\`\`\`

例如获取笔记列表：

\`\`\`text
GET https://note.example.com/api/notes
\`\`\`

## 数据格式

除文件下载、SSE 流式响应和日历订阅外，大多数接口使用 JSON：

\`\`\`http
Content-Type: application/json
Authorization: Bearer <TOKEN>
\`\`\`

## 认证方式

Nowen Note 支持两种 Bearer 凭证：

- 登录接口返回的 JWT，适合网页和临时会话。
- 以 \`nkn_\` 开头的 Personal API Token，适合 CLI、浏览器插件和自动化脚本。

推荐第三方集成使用 Personal API Token。

## 常见状态码

| 状态码 | 含义 |
|---|---|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未认证、Token 无效或已过期 |
| 403 | 没有访问权限 |
| 404 | 资源不存在或不可访问 |
| 409 | 版本冲突或资源冲突 |
| 429 | 请求过于频繁 |

## OpenAPI 规范

\`\`\`http
GET /api/openapi.json
\`\`\`

该接口无需登录，可用于 Swagger UI、Postman 或代码生成工具。`,
  },
  {
    id: 'doc_nn_api_auth',
    parentId: 'doc_nn_api_start',
    title: '认证与 API Token',
    slug: 'authentication',
    description: '登录 JWT、Personal API Token、权限范围和错误码。',
    sortOrder: 12,
    contentMd: `# 认证与 API Token

## 登录获取 JWT

\`\`\`http
POST /api/auth/login
Content-Type: application/json
\`\`\`

\`\`\`json
{
  "username": "你的用户名",
  "password": "你的密码"
}
\`\`\`

成功后会返回 JWT。后续请求放入请求头：

\`\`\`http
Authorization: Bearer <JWT>
\`\`\`

## Personal API Token

Personal API Token 以 \`nkn_\` 开头，明文只在创建时返回一次，适合长期自动化。

可用权限范围：

- \`notes:read\`
- \`notes:write\`
- \`notebooks:read\`
- \`notebooks:write\`
- \`attachments:write\`
- \`tags:read\`
- \`tags:write\`
- \`export:import\`

创建 Token 必须使用登录 JWT，不能使用另一个 API Token 自我增殖。

\`\`\`http
POST /api/tokens
Authorization: Bearer <JWT>
Content-Type: application/json
\`\`\`

\`\`\`json
{
  "name": "automation",
  "scopes": ["notes:read", "notes:write", "notebooks:read"],
  "expiresInDays": 90
}
\`\`\`

## 常见认证错误

| code | 说明 |
|---|---|
| UNAUTHENTICATED | 没有提供 Bearer Token |
| API_TOKEN_INVALID | API Token 无效、已过期或已吊销 |
| TOKEN_INVALID | JWT 无效或已过期 |
| TOKEN_REVOKED | 密码修改或安全操作后会话失效 |
| SESSION_REVOKED | 当前登录会话已被下线 |
| ACCOUNT_DISABLED | 账号已被禁用 |`,
  },
  {
    id: 'doc_nn_api_first_request',
    parentId: 'doc_nn_api_start',
    title: '第一个 API 请求',
    slug: 'first-request',
    description: '使用 curl 和 JavaScript 调用 Nowen Note API。',
    sortOrder: 13,
    contentMd: `# 第一个 API 请求

下面以获取个人空间笔记本为例。

## curl

\`\`\`bash
curl "https://note.example.com/api/notebooks?workspaceId=personal" \\
  -H "Authorization: Bearer nkn_your_token"
\`\`\`

## JavaScript

\`\`\`js
const baseUrl = 'https://note.example.com';
const token = 'nkn_your_token';

const response = await fetch(
  \`${'${baseUrl}'}/api/notebooks?workspaceId=personal\`,
  { headers: { Authorization: \`Bearer ${'${token}'}\` } },
);

if (!response.ok) {
  throw new Error(\`请求失败：${'${response.status}'}\`);
}

const notebooks = await response.json();
console.log(notebooks);
\`\`\`

## 建议

- 不要把 Token 提交到代码仓库。
- 服务端程序优先从环境变量读取 Token。
- 生产环境必须使用 HTTPS。
- 遇到 401 时先确认 Token 是否过期或已吊销。`,
  },
  {
    id: 'doc_nn_api_core',
    title: '核心数据接口',
    slug: 'core',
    description: '笔记本、笔记、标签与搜索接口。',
    sortOrder: 20,
    contentMd: `# 核心数据接口

这一部分覆盖 Nowen Note 最常用的数据能力：

- 笔记本
- 笔记
- 标签
- 全文搜索

所有接口默认需要 Bearer Token，并按当前用户或工作区权限返回数据。`,
  },
  {
    id: 'doc_nn_api_notebooks',
    parentId: 'doc_nn_api_core',
    title: '笔记本 API',
    slug: 'notebooks',
    description: '查询、创建、更新和删除笔记本。',
    sortOrder: 21,
    contentMd: `# 笔记本 API

## 获取笔记本列表

\`\`\`http
GET /api/notebooks
\`\`\`

查询参数：

| 参数 | 必填 | 说明 |
|---|---|---|
| workspaceId | 否 | 不传为兼容模式；\`personal\` 表示个人空间；也可传工作区 ID |

返回树形笔记本数据，并包含递归统计的 \`noteCount\`。

## 创建笔记本

\`\`\`http
POST /api/notebooks
Content-Type: application/json
\`\`\`

\`\`\`json
{
  "name": "开发笔记",
  "parentId": null,
  "icon": "🧰",
  "color": "#3b82f6"
}
\`\`\`

## 更新笔记本

\`\`\`http
PUT /api/notebooks/{id}
\`\`\`

## 删除笔记本

\`\`\`http
DELETE /api/notebooks/{id}
\`\`\`

## 获取别人共享给我的笔记本

\`\`\`http
GET /api/notebooks/shared-with-me
\`\`\`

工作区和共享笔记本会执行成员身份与读写权限校验。`,
  },
  {
    id: 'doc_nn_api_notes',
    parentId: 'doc_nn_api_core',
    title: '笔记 API',
    slug: 'notes',
    description: '笔记列表、详情、创建、更新、删除和回收站。',
    sortOrder: 22,
    contentMd: `# 笔记 API

## 获取笔记列表

\`\`\`http
GET /api/notes
\`\`\`

常用查询参数：

| 参数 | 说明 |
|---|---|
| workspaceId | \`personal\` 或工作区 ID |
| notebookId | 笔记本 ID，同时包含后代笔记本中的笔记 |
| isFavorite | 传 \`1\` 仅返回收藏 |
| isTrashed | 传 \`1\` 仅返回回收站 |
| search | 全文搜索词 |
| tagId | 单个标签 ID |
| tagIds | 多个标签 ID，逗号分隔 |
| tagMode | \`and\` 或 \`or\` |
| dateFrom / dateTo | 更新时间范围，格式 \`YYYY-MM-DD\` |
| sortBy | \`manual\`、\`updatedAt\`、\`createdAt\`、\`title\` |
| sortOrder | \`asc\` 或 \`desc\` |

## 创建笔记

\`\`\`http
POST /api/notes
Content-Type: application/json
\`\`\`

\`\`\`json
{
  "notebookId": "notebook-id",
  "title": "API 创建的笔记",
  "content": "# Hello",
  "contentText": "Hello",
  "contentFormat": "markdown"
}
\`\`\`

\`contentFormat\` 支持 \`markdown\`、\`tiptap-json\` 和 \`html\`。

## 获取笔记详情

\`\`\`http
GET /api/notes/{id}
\`\`\`

## 更新笔记

\`\`\`http
PUT /api/notes/{id}
\`\`\`

内容类更新必须携带当前 \`version\`，用于乐观锁冲突检测：

\`\`\`json
{
  "title": "新标题",
  "content": "# 更新后的内容",
  "contentText": "更新后的内容",
  "contentFormat": "markdown",
  "version": 3
}
\`\`\`

## 永久删除

\`\`\`http
DELETE /api/notes/{id}
\`\`\`

## 清空个人空间回收站

\`\`\`http
DELETE /api/notes/trash/empty
\`\`\`

锁定的笔记不会被批量清空。永久删除不可撤销。`,
  },
  {
    id: 'doc_nn_api_tags_search',
    parentId: 'doc_nn_api_core',
    title: '标签与搜索 API',
    slug: 'tags-search',
    description: '标签管理、笔记标签关系和全文搜索。',
    sortOrder: 23,
    contentMd: `# 标签与搜索 API

## 获取标签

\`\`\`http
GET /api/tags
\`\`\`

## 创建标签

\`\`\`http
POST /api/tags
Content-Type: application/json
\`\`\`

\`\`\`json
{
  "name": "重要",
  "color": "#ef4444"
}
\`\`\`

## 给笔记添加标签

\`\`\`http
POST /api/tags/note/{noteId}/tag/{tagId}
\`\`\`

## 移除笔记标签

\`\`\`http
DELETE /api/tags/note/{noteId}/tag/{tagId}
\`\`\`

## 全文搜索

\`\`\`http
GET /api/search?q=关键词
\`\`\`

搜索基于 Nowen Note 的全文索引。关键词为空时不应发送请求。`,
  },
  {
    id: 'doc_nn_api_content',
    title: '任务与内容',
    slug: 'content',
    description: '任务、附件、文件库、思维导图与导出接口。',
    sortOrder: 30,
    contentMd: `# 任务与内容

本栏目覆盖任务管理和二进制内容处理。文件上传、下载和流式响应与普通 JSON 请求不同，请留意各文章中的 Content-Type 和权限说明。`,
  },
  {
    id: 'doc_nn_api_tasks',
    parentId: 'doc_nn_api_content',
    title: '任务 API',
    slug: 'tasks',
    description: '任务列表、创建、更新、完成状态和统计。',
    sortOrder: 31,
    contentMd: `# 任务 API

## 获取任务列表

\`\`\`http
GET /api/tasks
\`\`\`

常用筛选参数包括 \`status\`、\`priority\` 和 \`noteId\`。

## 创建任务

\`\`\`http
POST /api/tasks
Content-Type: application/json
\`\`\`

\`\`\`json
{
  "title": "整理 API 文档",
  "priority": 2,
  "dueDate": "2026-07-31",
  "noteId": null
}
\`\`\`

## 获取、更新和删除单个任务

\`\`\`http
GET    /api/tasks/{id}
PUT    /api/tasks/{id}
DELETE /api/tasks/{id}
\`\`\`

## 切换完成状态

\`\`\`http
PATCH /api/tasks/{id}/toggle
\`\`\`

## 任务统计

\`\`\`http
GET /api/tasks/stats/summary
\`\`\`

任务项目、模板、依赖、提醒和日历由独立的 \`/api/task-*\` 路由提供，具体字段以部署版本为准。`,
  },
  {
    id: 'doc_nn_api_attachments',
    parentId: 'doc_nn_api_content',
    title: '附件与文件 API',
    slug: 'attachments-files',
    description: '附件上传、访问 URL、下载和文件库查询。',
    sortOrder: 32,
    contentMd: `# 附件与文件 API

## 上传附件

附件上传使用 \`multipart/form-data\`，受认证和写权限保护：

\`\`\`http
POST /api/attachments
Authorization: Bearer <TOKEN>
Content-Type: multipart/form-data
\`\`\`

上传成功返回附件 ID、URL、MIME、大小和文件名。笔记正文中通常只保存 \`/api/attachments/{id}\`。

## 获取可访问 URL

\`\`\`http
GET /api/attachments/access/urls?noteId={noteId}
\`\`\`

该接口会根据当前用户对笔记的读取权限签发短期、可复核的附件 URL。

## 下载附件

\`\`\`http
GET /api/attachments/{id}
\`\`\`

图片、音视频和普通文件可能使用不同的响应头；视频播放支持 Range 请求。

## 删除附件

\`\`\`http
DELETE /api/attachments/{id}
\`\`\`

删除前应确认正文不再引用该附件。Nowen Note 会维护引用关系，并避免误删仍被其他内容使用的物理文件。

## 文件库

\`/api/files\` 提供文件列表、分页、分类和统计能力。查询字段会随部署版本演进，建议先读取 \`/api/openapi.json\`。`,
  },
  {
    id: 'doc_nn_api_mindmaps_export',
    parentId: 'doc_nn_api_content',
    title: '思维导图与导出 API',
    slug: 'mindmaps-export',
    description: '思维导图 CRUD 和笔记导出。',
    sortOrder: 33,
    contentMd: `# 思维导图与导出 API

## 思维导图

\`\`\`http
GET  /api/mindmaps
POST /api/mindmaps
\`\`\`

单个导图通常使用：

\`\`\`http
GET    /api/mindmaps/{id}
PUT    /api/mindmaps/{id}
DELETE /api/mindmaps/{id}
\`\`\`

导图的 \`data\` 字段保存 JSON 格式结构。

## 导出笔记

\`\`\`http
GET /api/export/{noteId}?format=markdown
\`\`\`

\`format\` 常用值：

- \`markdown\`
- \`html\`
- \`json\`
- \`txt\`

大型 Markdown 批量导出可能先创建后台任务，再通过带随机 capability token 的下载地址获取 ZIP。下载 token 有有效期且响应禁止缓存。`,
  },
  {
    id: 'doc_nn_api_automation',
    title: 'AI 与自动化',
    slug: 'automation',
    description: 'AI 流式接口、Webhook 和插件扩展。',
    sortOrder: 40,
    contentMd: `# AI 与自动化

Nowen Note 提供 AI 写作、知识库问答、Webhook 和插件接口，可用于搭建自动化工作流。

AI 接口通常返回 SSE 流，不应按普通 JSON 一次性解析。`,
  },
  {
    id: 'doc_nn_api_ai',
    parentId: 'doc_nn_api_automation',
    title: 'AI API',
    slug: 'ai',
    description: 'AI 写作助手、知识库问答、模型与配置。',
    sortOrder: 41,
    contentMd: `# AI API

## AI 写作助手

\`\`\`http
POST /api/ai/chat
Content-Type: application/json
Accept: text/event-stream
\`\`\`

\`\`\`json
{
  "action": "polish",
  "text": "需要处理的正文",
  "customPrompt": "改成简洁的技术文档"
}
\`\`\`

## 知识库问答

\`\`\`http
POST /api/ai/ask
Accept: text/event-stream
\`\`\`

\`\`\`json
{
  "question": "我有哪些关于 Docker 的笔记？"
}
\`\`\`

## 读取和更新 AI 设置

\`\`\`http
GET /api/ai/settings
PUT /api/ai/settings
\`\`\`

## 可用模型与知识库统计

\`\`\`http
GET /api/ai/models
GET /api/ai/knowledge-stats
\`\`\`

## SSE 处理提示

逐行读取响应，处理以 \`data: \` 开头的事件；收到 \`[DONE]\` 后结束。部分事件可能携带引用资料或元数据。`,
  },
  {
    id: 'doc_nn_api_webhooks_plugins',
    parentId: 'doc_nn_api_automation',
    title: 'Webhook 与插件 API',
    slug: 'webhooks-plugins',
    description: '创建 Webhook、查看投递和执行插件。',
    sortOrder: 42,
    contentMd: `# Webhook 与插件 API

## Webhook

\`\`\`http
GET  /api/webhooks
POST /api/webhooks
\`\`\`

创建示例：

\`\`\`json
{
  "url": "https://automation.example.com/nowen",
  "events": ["note.created", "note.updated"],
  "description": "同步到自动化平台"
}
\`\`\`

更新和删除：

\`\`\`http
PUT    /api/webhooks/{id}
DELETE /api/webhooks/{id}
\`\`\`

测试与投递日志：

\`\`\`http
POST /api/webhooks/{id}/test
GET  /api/webhooks/{id}/deliveries
\`\`\`

## 插件

\`\`\`http
GET  /api/plugins
POST /api/plugins/reload
POST /api/plugins/{name}/execute
\`\`\`

插件执行能力取决于该插件声明的 capabilities。调用前应先读取插件列表和状态。`,
  },
  {
    id: 'doc_nn_api_system',
    title: '系统管理',
    slug: 'system',
    description: 'Token、备份、审计、健康检查和版本信息。',
    sortOrder: 50,
    contentMd: `# 系统管理

系统管理接口具有较高权限，尤其是用户、Token、备份恢复和设置修改。建议使用最小权限凭证，并只在可信网络中调用危险操作。`,
  },
  {
    id: 'doc_nn_api_tokens',
    parentId: 'doc_nn_api_system',
    title: 'API Token 管理',
    slug: 'tokens',
    description: '创建、查询、统计和吊销 Personal API Token。',
    sortOrder: 51,
    contentMd: `# API Token 管理

这些接口受登录 JWT 保护。API Token 不能创建新的 API Token。

## 列出 Token

\`\`\`http
GET /api/tokens
\`\`\`

返回 Token 名称、权限、过期时间、最后使用时间和吊销状态，不返回明文。

## 创建 Token

\`\`\`http
POST /api/tokens
\`\`\`

\`\`\`json
{
  "name": "CLI",
  "scopes": ["notes:read", "notes:write"],
  "expiresInDays": 365
}
\`\`\`

响应中的 \`token\` 只显示一次，请立即安全保存。

## 使用统计

\`\`\`http
GET /api/tokens/usage?days=7
\`\`\`

\`days\` 支持 1 到 90，返回逐日调用量、上期调用量和按 Token 聚合数据。

## 吊销 Token

\`\`\`http
DELETE /api/tokens/{id}
\`\`\`

吊销采用软删除并保留审计记录。`,
  },
  {
    id: 'doc_nn_api_backups_audit',
    parentId: 'doc_nn_api_system',
    title: '备份与审计 API',
    slug: 'backups-audit',
    description: '创建、下载、恢复备份及查询审计日志。',
    sortOrder: 52,
    contentMd: `# 备份与审计 API

## 备份列表与创建

\`\`\`http
GET  /api/backups
POST /api/backups
\`\`\`

创建示例：

\`\`\`json
{
  "type": "full",
  "description": "升级前备份"
}
\`\`\`

\`type\` 支持 \`full\` 和 \`db-only\`。

## 下载和恢复

\`\`\`http
GET  /api/backups/{filename}/download
POST /api/backups/{filename}/restore
\`\`\`

> 恢复操作会替换现有数据。执行前应再创建一份新备份，并确认没有其他客户端正在写入。

## 查询审计日志

\`\`\`http
GET /api/audit
\`\`\`

常用参数：\`category\`、\`level\`、\`dateFrom\`、\`dateTo\`、\`limit\`。

## 审计统计

\`\`\`http
GET /api/audit/stats
\`\`\``,
  },
  {
    id: 'doc_nn_api_health',
    parentId: 'doc_nn_api_system',
    title: '健康检查与版本信息',
    slug: 'health-version',
    description: '无需登录的健康检查、版本和 OpenAPI 端点。',
    sortOrder: 53,
    contentMd: `# 健康检查与版本信息

以下接口注册在全局认证中间件之前，可用于部署探针和客户端启动检查。

## 健康检查

\`\`\`http
GET /api/health
\`\`\`

示例响应：

\`\`\`json
{
  "status": "ok",
  "version": "当前应用版本"
}
\`\`\`

## 版本与发布信息

\`\`\`http
GET /api/version
GET /api/releases
\`\`\`

## OpenAPI

\`\`\`http
GET /api/openapi.json
\`\`\`

## Docker 健康检查示例

\`\`\`bash
curl --fail http://127.0.0.1:3001/api/health
\`\`\`

实际端口以你的部署配置为准。`,
  },
];

export function ensureNowenNoteApiDocs(): void {
  const existing = sqlite
    .prepare('SELECT id FROM doc_spaces WHERE slug = ? LIMIT 1')
    .get(SPACE_SLUG) as { id: string } | undefined;
  if (existing) return;

  const now = nowIso();
  const insert = sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT INTO doc_spaces (
          id, project_id, name, slug, description, icon_url, default_version_id,
          repository_full_name, source_mode, docs_root, is_published, sort_order,
          created_at, updated_at
        ) VALUES (?, NULL, ?, ?, ?, NULL, NULL, NULL, 'cms', '', 1, 0, ?, ?)`,
      )
      .run(
        SPACE_ID,
        'Nowen Note API 文档',
        SPACE_SLUG,
        'Nowen Note REST API、认证、核心数据、AI、自动化与系统管理接口。',
        now,
        now,
      );

    sqlite
      .prepare(
        `INSERT INTO doc_versions (
          id, space_id, version, label, source_ref, status, is_default,
          is_deprecated, sort_order, created_at, updated_at
        ) VALUES (?, ?, 'latest', '帮助中心', NULL, 'published', 1, 0, 0, ?, ?)`,
      )
      .run(VERSION_ID, SPACE_ID, now, now);

    sqlite.prepare('UPDATE doc_spaces SET default_version_id = ? WHERE id = ?').run(VERSION_ID, SPACE_ID);

    const statement = sqlite.prepare(
      `INSERT INTO documents (
        id, space_id, version_id, parent_id, title, slug, path, description,
        content_md, status, visibility, sort_order, depth, source_type,
        source_path, source_sha, edit_url, seo_title, seo_description,
        published_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 'public', ?, ?, 'cms',
        NULL, NULL, NULL, ?, ?, ?, ?, ?
      )`,
    );

    const byId = new Map(documents.map((document) => [document.id, document]));
    for (const document of documents) {
      const parent = document.parentId ? byId.get(document.parentId) : undefined;
      const path = parent ? `${parent.slug}/${document.slug}` : document.slug;
      statement.run(
        document.id,
        SPACE_ID,
        VERSION_ID,
        document.parentId ?? null,
        document.title,
        document.slug,
        path,
        document.description,
        document.contentMd,
        document.sortOrder,
        document.parentId ? 1 : 0,
        document.title,
        document.description,
        now,
        now,
        now,
      );
    }
  });

  insert();
  console.log(`📚 Seeded Nowen Note API documentation (${documents.length} documents).`);
}
