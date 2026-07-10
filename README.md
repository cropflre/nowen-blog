# NOWEN Blog

内容型博客、个人品牌主页与轻量 CMS。技术栈：**React + TypeScript + Vite** 前台/后台，**Hono + Drizzle + better-sqlite3** 后端，**Tailwind CSS v4** 视觉系统。

当前包含：

- 文章创作、定时发布、版本历史与评论；
- 个人品牌首页、精选文章和项目作品集；
- GitHub 用户/仓库同步与项目后台管理；
- 邮件订阅、签名退订、订阅者管理和文章通知；
- SQLite 正式迁移、Docker Compose、Nginx、CI、备份恢复与 Playwright E2E。

## 项目结构

```text
apps/web            前台 + 管理后台（React）
apps/server         Node API（Hono）
packages/shared     通用类型 + Zod schema
packages/config     共享 TypeScript / Prettier 配置
apps/server/drizzle 版本化数据库迁移
deploy/nginx        生产 Nginx 配置
scripts/ops         生产验收、邮件与项目初始化命令
tests/e2e           Playwright 浏览器 E2E
data/               本地 SQLite 数据库 + 上传文件
```

## 本地开发

```bash
pnpm install --frozen-lockfile
pnpm dev
```

- Web：http://localhost:6688
- API：http://localhost:8787
- Vite 会代理 `/api`、RSS、Sitemap 和 robots 到 API。

开发环境未设置 `ADMIN_PASSWORD` 时，默认管理员密码为：

```text
dev-admin-please-change
```

生产环境必须显式设置强密码。

## 项目展示与 GitHub 同步

后台入口：`/admin/projects`

支持：

- 手动创建、编辑、排序、精选、隐藏项目；
- 输入 GitHub 用户名批量同步最近更新的非 Fork 公开仓库；
- 输入 `owner/repo` 或完整 GitHub URL 同步单个仓库；
- 更新 Stars、Forks、语言、Topics 和最近推送时间；
- 重复同步时保留后台设置的封面、精选状态和排序。

生产项目初始化：

```bash
BASE_URL=https://blog.example.com \
ADMIN_USERNAME=NOWEN \
ADMIN_PASSWORD='<管理员密码>' \
GITHUB_SYNC_TARGET=cropflre \
GITHUB_FEATURED_REPOS='cropflre/nowen-note,cropflre/nowen-reader' \
pnpm ops:initialize-projects
```

前台项目页：`/projects`

## 邮件订阅

首页订阅表单会把邮箱保存到 SQLite。订阅收集、退订和后台管理不依赖第三方邮件服务。

要发送文章通知，配置 Resend：

```env
RESEND_API_KEY=re_xxx
NEWSLETTER_FROM_EMAIL="NOWEN Blog <newsletter@example.com>"
NEWSLETTER_REPLY_TO=hi@example.com
```

真实域名和投递验收：

```bash
EMAIL_SMOKE_TO=you@example.com pnpm ops:email-acceptance
```

后台入口：`/admin/newsletter`

支持订阅统计、状态管理、文章通知、发送审计、正文退订和标准一键退订。

## 数据库迁移

服务启动时会自动执行 `apps/server/drizzle/` 中尚未应用的版本化 SQL migration。

```bash
pnpm db:migrate
```

新增结构变更时：

1. 更新 `apps/server/src/db/schema.ts`；
2. 在 `apps/server/drizzle/` 新增下一个编号的 SQL 文件；
3. 在 `apps/server/drizzle/meta/_journal.json` 登记 migration；
4. 运行迁移测试、类型检查和构建。

不要修改已经在生产执行过的 migration。

## 测试与构建

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm build
```

Playwright 首次运行需要安装浏览器：

```bash
pnpm exec playwright install chromium
```

## Docker Compose 生产部署

```bash
cp .env.example .env
# 修改 SESSION_SECRET、ADMIN_PASSWORD、BASE_URL
# 按需配置 GITHUB_TOKEN、Resend 和 BACKUP_HOST_DIR

docker compose up -d --build
docker compose ps
pnpm ops:verify-production -- --base-url http://127.0.0.1:8080 --allow-http
```

默认包含：

- `api`：Hono + Drizzle + SQLite；
- `web`：Nginx 静态前端与反向代理；
- SQLite 与上传文件持久化卷；
- API、Nginx 双健康检查；
- `/uploads` 由 Nginx 从持久化卷只读直出；
- `/api`、RSS、Sitemap、robots 反代到 Hono；
- SPA 路由回退和静态资源长期缓存；
- 宿主机备份目录挂载到 `/app/backups`。

### 备份与恢复演练

```bash
# 在线一致性备份
docker compose exec -T api pnpm --filter @blog/server ops:backup

# 不覆盖生产数据的恢复演练
docker compose exec -T api pnpm --filter @blog/server ops:rehearse-backup
```

真实恢复前必须停止 API 和 Web，详细步骤见 BLOG-20 手册。

## CI

GitHub Actions 会执行：

1. 冻结锁文件安装和全工作区 TypeScript 类型检查；
2. 单元测试、Hono/SQLite 集成测试和备份恢复测试；
3. 隔离数据库引导、Server 编译、Web 完整构建和预渲染；
4. Playwright Chromium E2E；
5. Docker Compose 构建、健康探测、重启持久化和容器内备份演练。

另有绑定 GitHub `production` Environment 的手动生产验收工作流，用于真实域名、Resend 投递和 GitHub 项目初始化。

## 文档

- [BLOG-20 生产收口、验收与恢复手册](docs/BLOG-20-production-acceptance.md)
- [BLOG-18 生产化指南](docs/BLOG-18-production-readiness.md)
- [媒体部署与备份指南](docs/BLOG-11.4-media-deployment-and-backup.md)
- [预渲染部署文档](docs/BLOG-10.4-prerender-deployment.md)
