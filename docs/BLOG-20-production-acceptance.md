# BLOG-20 生产收口、验收与恢复手册

本文覆盖锁文件、CI、Docker 部署、数据备份恢复、邮件域名和 GitHub 项目初始化。

## 1. 锁文件

所有常规安装、CI 和 Docker 构建必须使用：

```bash
pnpm install --frozen-lockfile
```

`.github/workflows/lockfile-sync.yml` 仅在 `main` 的依赖清单发生变化时重新生成 `pnpm-lock.yaml`。如果锁文件发生变化，由 GitHub Actions Bot 单独提交；锁文件提交不会再次触发该工作流。

本地修改依赖后仍建议主动执行：

```bash
pnpm install
pnpm install --frozen-lockfile
```

## 2. CI 全量验证

`.github/workflows/ci.yml` 包含三组验收：

1. 冻结依赖、全工作区类型检查、单元测试、集成测试；
2. 隔离 SQLite 引导、Server 编译、Web 完整构建和预渲染、备份恢复演练；
3. Playwright Chromium E2E；
4. Docker Compose 构建、健康检查、API 重启持久化、Web 重启、容器内备份和恢复演练。

本地等价命令：

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test

rm -rf .tmp/ci
mkdir -p .tmp/ci/uploads
DATABASE_PATH="$PWD/.tmp/ci/blog.sqlite" \
UPLOAD_DIR="$PWD/.tmp/ci/uploads" \
NODE_ENV=test \
SESSION_SECRET=local-ci-session-secret-at-least-32-characters \
ADMIN_PASSWORD=local-ci-admin-password \
pnpm db:bootstrap

DATABASE_PATH="$PWD/.tmp/ci/blog.sqlite" \
UPLOAD_DIR="$PWD/.tmp/ci/uploads" \
NODE_ENV=test \
SESSION_SECRET=local-ci-session-secret-at-least-32-characters \
ADMIN_PASSWORD=local-ci-admin-password \
pnpm --filter @blog/web build

pnpm exec playwright install chromium
pnpm test:e2e
```

## 3. Docker 生产部署验收

准备 `.env`：

```env
BASE_URL=https://blog.example.com
HTTP_PORT=8080
SESSION_SECRET=<固定强随机密钥>
ADMIN_USERNAME=NOWEN
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<强密码>
BACKUP_HOST_DIR=./backups
```

启动：

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

执行公开验收：

```bash
pnpm ops:verify-production -- --base-url https://blog.example.com
```

脚本检查：

- Nginx `/healthz`；
- 站点设置和项目 API；
- 首页及安全响应头；
- SPA 路由回退；
- RSS、Sitemap、robots；
- Sitemap 是否包含项目页。

测试环境或本机 HTTP：

```bash
pnpm ops:verify-production -- --base-url http://127.0.0.1:8080 --allow-http
```

验证容器重启和 SQLite 持久化：

```bash
ADMIN_PASSWORD='<管理员密码>' \
BASE_URL=http://127.0.0.1:8080 \
pnpm ops:verify-docker-persistence -- --allow-http
```

该命令会创建一个临时公开项目、重启 API、确认记录仍存在、删除临时记录，再重启 Web 并复查健康状态。

## 4. 备份

Compose 将宿主机 `BACKUP_HOST_DIR` 挂载到 API 容器的 `/app/backups`。

在线创建一致性 SQLite 备份：

```bash
docker compose exec -T api pnpm --filter @blog/server ops:backup
```

也可本地执行：

```bash
pnpm ops:backup -- \
  --database data/blog.sqlite \
  --uploads data/uploads \
  --output backups
```

每份备份包含：

```text
nowen-blog-backup-<时间>/
├── blog.sqlite
├── uploads/
└── manifest.json
```

`manifest.json` 记录数据库和每个上传文件的大小、SHA-256、SQLite `integrity_check` 结果和 migration 数量。备份完成后会立即进行二次校验。

建议把 `backups/` 再同步到另一台机器或对象存储。不要只把备份留在同一块磁盘。

## 5. 恢复

恢复必须停止 API 和 Web，避免写入竞争和旧图片继续被读取：

```bash
docker compose stop web api
```

找到备份目录：

```bash
find backups -maxdepth 2 -name manifest.json -print
```

执行恢复：

```bash
docker compose run --rm api \
  pnpm --filter @blog/server ops:restore -- \
  --backup /app/backups/nowen-blog-backup-YYYY-MM-DDTHH-MM-SS-Z \
  --force
```

`--force` 不会直接丢弃旧数据。恢复前，当前数据库、WAL/SHM 和上传目录会复制到：

```text
/app/data/restore-rollbacks/rollback-<时间>/
```

恢复后启动：

```bash
docker compose up -d
pnpm ops:verify-production -- --base-url https://blog.example.com
```

自动恢复演练：

```bash
docker compose exec -T api pnpm --filter @blog/server ops:rehearse-backup
```

演练会在临时目录创建备份、恢复副本、执行完整性检查并核对核心表，不会覆盖生产数据。

## 6. Resend 域名与真实发送验收

配置：

```env
RESEND_API_KEY=re_xxx
NEWSLETTER_FROM_EMAIL="NOWEN Blog <newsletter@updates.example.com>"
NEWSLETTER_REPLY_TO=you@example.com
EMAIL_SMOKE_TO=you@example.com
```

执行：

```bash
pnpm ops:email-acceptance
```

脚本会：

- 从发件地址提取域名；
- 调用 Resend Domains API；
- 要求域名状态为 `verified`；
- 查询 `_dmarc.<发件域名>`；
- 向 `EMAIL_SMOKE_TO` 发送一封带唯一验收编号的真实邮件；
- 输出 Resend 邮件 ID，不输出 API Key。

代码侧验收不能代替人工收件箱检查。还需确认：

- 邮件进入收件箱而不是垃圾箱；
- 发件人、回复地址和链接正确；
- 正文退订和邮件客户端一键退订可用；
- Gmail、QQ 邮箱、163 邮箱等主要目标邮箱至少各测试一次。

## 7. GitHub 项目内容初始化

通过后台接口初始化生产项目，不需要服务器 SSH：

```bash
BASE_URL=https://blog.example.com \
ADMIN_USERNAME=NOWEN \
ADMIN_PASSWORD='<管理员密码>' \
GITHUB_SYNC_TARGET=cropflre \
GITHUB_SYNC_MAX_REPOS=12 \
GITHUB_FEATURED_REPOS='cropflre/nowen-note,cropflre/nowen-reader' \
pnpm ops:initialize-projects
```

命令会：

- 管理员登录；
- 调用后台 GitHub 同步接口；
- 导入或更新项目；
- 把指定仓库设为精选和公开；
- 按精选列表顺序写入排序值。

随后进入 `/admin/projects` 补充封面、产品地址和人工描述。

## 8. GitHub 生产环境验收工作流

`.github/workflows/production-acceptance.yml` 通过 `workflow_dispatch` 手动执行，并绑定 GitHub `production` Environment。

建议在 `production` Environment 中配置审批人和 Secrets：

```text
ADMIN_USERNAME
ADMIN_PASSWORD
RESEND_API_KEY
NEWSLETTER_FROM_EMAIL
NEWSLETTER_REPLY_TO
```

工作流可以：

- 验证真实生产 URL；
- 可选初始化 GitHub 项目；
- 可选发送一封真实 Resend 验收邮件。

生产工作流不会自动定时运行，避免意外导入项目或发送邮件。

## 9. 上线判定

满足以下条件后才标记 BLOG-20 完成：

- `pnpm-lock.yaml` 与依赖清单一致；
- CI 的 quality、E2E、Docker 三个 Job 全绿；
- 真实生产 URL 验收通过；
- 至少一份备份已经复制到异机位置；
- 恢复演练通过；
- Resend 域名为 verified 且真实邮件收到；
- 正式项目已经初始化并人工检查展示内容。
