# NOWEN Blog

NOWEN 官方项目帮助中心与技术博客。系统采用 **React + TypeScript + Vite** 前台/后台、**Hono + SQLite** 后端和 **Tailwind CSS v4** 视觉系统。

产品原则：

- 一个项目只对应一个帮助中心；
- 项目和文档全部在后台手动创建；
- 目录最多两级：一级栏目 + 二级文章；
- 网址、排序、历史记录和 SEO 由系统自动处理；
- AI Agent 可以规划目录并批量生成文档；
- AI 结果必须先审核，应用后仍然是草稿，不会自动公开。

## 项目结构

```text
apps/web                    前台 + 管理后台
apps/server                 Hono API + SQLite
packages/shared             通用类型
packages/config             共享 TypeScript 配置
apps/server/drizzle         数据库迁移
scripts/ops                 生产验收和备份工具
scripts/release-docker.sh   Docker 一键发版
Dockerfile                  前端 + API + Nginx 单镜像
```

## 本地启动

项目要求 Node.js 20 或以上。

```bash
corepack enable
corepack prepare pnpm@10.34.4 --activate
pnpm install --frozen-lockfile
pnpm dev
```

启动地址：

```text
前台：http://localhost:6688
接口：http://localhost:8787
帮助中心：http://localhost:6688/docs
后台：http://localhost:6688/admin/login
```

开发环境未设置管理员密码时，默认密码为：

```text
dev-admin-please-change
```

生产环境必须显式配置强密码。

## 傻瓜式帮助中心

后台入口：`/admin/docs`

使用流程：

1. 点击“新建项目”；
2. 填写项目名称和一句话说明；
3. 选择“创建空白”或“创建并让 AI 写”；
4. 手动维护一级栏目和二级文章；
5. 检查内容后勾选“保存后立即公开”。

管理员不需要设置：

```text
文档版本
网址或 Slug
文档路径
SEO 字段
数据来源
外部账号
```

系统会自动生成网址，并在标题或目录变化时维护重定向和修订历史。

## AI 文档 Agent

先在 `/admin/ai` 配置模型服务，再进入 `/admin/docs` 使用右侧 Agent。

支持的模型服务：

- OpenAI；
- DeepSeek；
- 通义千问；
- 豆包；
- Ollama；
- 其他 OpenAI-compatible 接口。

Agent 提供四类任务：

```text
生成完整帮助中心
写当前文档
检查并补齐文档
根据更新说明改文档
```

标准流程：

```text
描述需求
→ AI 分析项目和现有文档
→ 生成待审核变更
→ 管理员勾选需要的内容
→ 应用为草稿
→ 人工确认后发布
```

安全限制：

- AI 只能生成一级栏目和二级文章；
- AI 不会直接删除正式文档；
- AI 不会自动发布；
- 每次任务、步骤和变更都会保存到 SQLite；
- 更新现有文档前会生成修订快照；
- 刷新页面后仍可查看最近任务。

## 手动项目展示

前台项目页：`/projects`

项目页直接展示后台创建的帮助中心，不需要额外维护另一份项目数据。创建帮助中心后，项目会自动显示在首页和项目页。

## 博客与邮件订阅

博客保留文章编辑、预览、定时发布、版本历史、评论和 AI 写作能力。

邮件订阅收集不依赖外部邮件服务。发送文章通知时可配置 Resend：

```env
RESEND_API_KEY=re_xxx
NEWSLETTER_FROM_EMAIL="NOWEN Blog <newsletter@example.com>"
NEWSLETTER_REPLY_TO=hi@example.com
```

## 数据库迁移

服务启动时会自动执行尚未应用的迁移：

```bash
pnpm db:migrate
```

迁移会保留已有文档正文，并把旧的外部同步内容转换为普通手工文档。

新增数据库变更时：

1. 新增下一个编号的 SQL migration；
2. 在 `apps/server/drizzle/meta/_journal.json` 登记；
3. 更新迁移测试；
4. 运行类型检查、测试和构建。

不要修改已经在生产环境执行过的 migration。

## 测试与构建

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Playwright 首次运行需要安装 Chromium：

```bash
pnpm exec playwright install chromium
```

测试覆盖：

- SQLite 全量迁移和旧数据库升级；
- 两级目录强校验；
- AI Agent 生成、审核和草稿应用；
- 前台帮助中心和项目展示；
- 后台手动创建完整流程；
- 单容器生产构建、静态预渲染、备份和恢复。

## Docker 架构

NOWEN Blog 只发布和运行一个容器：

```text
cropflre/nowen-blog:vX.Y.Z
```

单个镜像内部由 Supervisor 同时管理：

```text
Nginx :80
├── React 前台与管理后台
├── /uploads 静态文件
└── /api → 127.0.0.1:8787

Hono API :8787
└── SQLite、文档、AI Agent、备份工具
```

对外只需要映射一个端口，不再使用 `nowen-blog-api` 和 `nowen-blog-web` 两张镜像。

## Docker Compose 本地构建部署

适合开发者或需要修改源码的部署：

```bash
cp .env.example .env
# 修改 SESSION_SECRET、ADMIN_PASSWORD 和 BASE_URL

docker compose up -d --build
docker compose ps
pnpm ops:verify-production -- --base-url http://127.0.0.1:8080 --allow-http
```

Compose 中只有一个服务：

```text
blog
```

默认包含：

- Nginx 静态前端和反向代理；
- Hono API；
- SQLite 与上传文件持久化；
- 前台和 API 联合健康检查；
- SPA 路由回退；
- 宿主机备份目录。

## Docker 已发布镜像部署

适合 NAS、服务器和不希望本机编译源码的用户。

首次部署：

```bash
cp .env.example .env
# 必须修改 SESSION_SECRET、ADMIN_PASSWORD 和 BASE_URL

docker compose -f docker-compose.release.yml pull
docker compose -f docker-compose.release.yml up -d
docker compose -f docker-compose.release.yml ps
```

默认镜像：

```env
DOCKER_IMAGE=cropflre/nowen-blog
NOWEN_BLOG_VERSION=latest
```

生产环境建议固定版本：

```env
NOWEN_BLOG_VERSION=v1.0.5
```

升级固定版本：

```bash
# 修改 .env 中的 NOWEN_BLOG_VERSION
docker compose -f docker-compose.release.yml pull
docker compose -f docker-compose.release.yml up -d
```

数据保存在具名卷 `nowen-blog-data` 中，更新镜像不会删除数据库、上传文件和帮助文档。不要执行带 `--volumes` 的 `docker compose down`，除非明确需要删除全部数据。

## Docker 一键发版

发版机需要：

- Git、Node.js 20+、pnpm；
- Docker 与 Buildx；
- 已执行 `docker login`；
- 能向 `cropflre/nowen-blog` 推送代码和 Tag；
- 可选：已登录的 `gh` CLI，用于自动创建 GitHub Release。

最简单的发布方式：

```bash
git checkout main
git pull
pnpm release:docker
```

脚本会自动：

1. 检查 main 分支和干净工作区；
2. 在修改版本前执行 GitHub 推送权限预检；
3. 参考 package.json、本地/远端 Git Tag 和 `cropflre/nowen-blog` Docker Hub Tag 建议下一版本；
4. 更新 package.json；
5. 执行冻结依赖安装、类型检查、测试和 Compose 校验；
6. 预构建包含前端、API、Nginx 的单体镜像；
7. 构建成功后推送 `vX.Y.Z` 和 `latest`；
8. 推送 release commit 和 Git Tag；
9. 在 gh 可用时创建 GitHub Release。

常用命令：

```bash
# 交互式发布 amd64
pnpm release:docker

# 指定版本并跳过确认
pnpm release:docker -- -v 1.0.5 -y

# 同时发布 amd64 + arm64
pnpm release:docker -- -v 1.0.5 --arch multi -y

# 预发布版本默认不会覆盖 latest
pnpm release:docker -- -v 1.0.5-rc.1

# 只查看执行计划
pnpm release:docker -- -v 1.0.5 --dry-run
```

完整参数：

```bash
pnpm release:docker -- --help
```

### 备份和恢复演练

本地构建部署：

```bash
docker compose exec -T blog pnpm --filter @blog/server ops:backup
docker compose exec -T blog pnpm --filter @blog/server ops:rehearse-backup
```

已发布镜像部署：

```bash
docker compose -f docker-compose.release.yml exec -T blog pnpm --filter @blog/server ops:backup
docker compose -f docker-compose.release.yml exec -T blog pnpm --filter @blog/server ops:rehearse-backup
```

## 主要入口

```text
/                 官方首页
/projects         项目与帮助中心
/docs             帮助中心总入口
/blog             技术博客
/admin/docs       项目和帮助文档后台
/admin/ai         AI 模型设置
/admin/settings   系统设置
```
