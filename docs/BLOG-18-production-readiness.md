# BLOG-18 生产化指南

本文覆盖 Drizzle 迁移、Docker Compose 部署、Nginx、测试和 CI。

## 1. 数据库迁移

数据库结构由 `apps/server/drizzle/` 下的版本化 SQL 管理，服务启动顺序为：

1. 执行旧库兼容桥；
2. 执行尚未应用的 Drizzle migrations；
3. 初始化空库种子数据；
4. 初始化站点设置；
5. 校验并重建全文搜索索引。

常用命令：

```bash
pnpm db:migrate
pnpm db:check
pnpm db:generate
```

规则：

- 不再在 `init.ts` 中新增 `CREATE TABLE` 或 `ALTER TABLE`；
- 所有结构变更必须新增 migration；
- 已提交并在生产执行过的 migration 不允许修改；
- 部署前必须备份 SQLite 数据库和上传目录；
- SQLite 数据库使用 WAL 模式，备份时优先停止写入或使用 SQLite backup API。

## 2. Docker Compose 部署

复制环境变量模板：

```bash
cp .env.example .env
```

必须修改：

```env
BASE_URL=https://blog.example.com
SESSION_SECRET=<至少 32 字节随机值>
ADMIN_PASSWORD=<强密码>
```

启动：

```bash
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:8080/healthz
curl --fail http://127.0.0.1:8080/api/site-settings
```

默认拓扑：

```text
Internet
   │
   ▼
Nginx :8080
   ├── /assets/*     静态前端资源
   ├── /uploads/*    持久化卷中的上传图片
   ├── /api/*        反向代理到 Hono API
   ├── SEO endpoints 反向代理到 Hono API
   └── /*            React SPA fallback

Hono API :8787
   └── /app/data
       ├── blog.sqlite
       └── uploads/
```

数据保存在 Docker volume `nowen-blog-data`。删除容器不会删除数据，执行 `docker compose down -v` 会删除卷，请谨慎使用。

## 3. 备份与恢复

查看数据卷：

```bash
docker volume inspect nowen-blog-data
```

创建压缩备份：

```bash
docker run --rm \
  -v nowen-blog-data:/data:ro \
  -v "$PWD/backups:/backup" \
  alpine sh -c 'tar -czf /backup/nowen-blog-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .'
```

恢复前先停止服务：

```bash
docker compose down
```

将备份内容恢复到 `nowen-blog-data` 后重新执行：

```bash
docker compose up -d
```

服务启动时会自动执行尚未应用的 migrations。

## 4. 测试

```bash
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

测试分层：

- Unit：格式化函数与迁移兼容逻辑；
- Integration：Hono API、认证、评论和 SQLite；
- E2E：Playwright 启动独立 API、独立临时数据库和 Vite，验证前台搜索与后台登录；
- Docker smoke：CI 构建 Compose 镜像，启动生产栈并探测健康接口。

首次运行 Playwright：

```bash
pnpm exec playwright install chromium
```

## 5. GitHub Actions

`.github/workflows/ci.yml` 包含：

- TypeScript 类型检查；
- 单元测试和集成测试；
- Server 编译与 Web 构建；
- Playwright Chromium E2E；
- Docker Compose 构建、启动和健康检查；
- E2E 失败时上传 trace、截图、视频和 HTML 报告。
