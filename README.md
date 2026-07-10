# NOWEN Blog

内容型博客 + 轻量 CMS。技术栈：**React + TypeScript + Vite** 前台/后台，**Hono + Drizzle + better-sqlite3** 后端，**Tailwind CSS v4** 视觉系统。

## 项目结构

```text
apps/web          前台 + 管理后台（React）
apps/server       Node API（Hono）
packages/shared   通用类型 + Zod schema
packages/config   共享 TypeScript / Prettier 配置
apps/server/drizzle 版本化数据库迁移
deploy/nginx      生产 Nginx 配置
tests/e2e         Playwright 浏览器 E2E
data/             本地 SQLite 数据库 + 上传文件
```

## 本地开发

```bash
pnpm install
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

## 数据库迁移

数据库结构不再由 `init.ts` 手写创建，服务启动时会自动执行 `apps/server/drizzle/` 中尚未应用的版本化 SQL migration。

```bash
pnpm db:migrate
```

新增结构变更时：

1. 更新 `apps/server/src/db/schema.ts`；
2. 在 `apps/server/drizzle/` 新增下一个编号的 SQL 文件；
3. 在 `apps/server/drizzle/meta/_journal.json` 登记 migration；
4. 运行迁移测试、类型检查和构建。

旧版 SQLite 会通过一次性兼容桥补齐历史字段，然后登记 Drizzle migration 状态。不要修改已在生产执行过的 migration。

## 测试与构建

```bash
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

docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:8080/healthz
```

默认包含：

- `api`：Hono + Drizzle + SQLite；
- `web`：Nginx 静态前端与反向代理；
- `nowen-blog-data`：SQLite 与上传文件持久化卷；
- API、Nginx 双健康检查；
- `/uploads` 由 Nginx 从持久化卷只读直出；
- `/api`、RSS、Sitemap、robots 反代到 Hono；
- SPA 路由回退和静态资源长期缓存。

默认访问地址：http://localhost:8080

## CI

GitHub Actions 会执行：

1. 工作区 TypeScript 类型检查；
2. 单元测试与 Hono/SQLite 集成测试；
3. Server 编译和 Web 构建；
4. Playwright Chromium E2E；
5. Docker Compose 构建、启动和健康探测。

## 文档

- [BLOG-18 生产化指南](docs/BLOG-18-production-readiness.md)
- [媒体部署与备份指南](docs/BLOG-11.4-media-deployment-and-backup.md)
- [预渲染部署文档](docs/BLOG-10.4-prerender-deployment.md)
