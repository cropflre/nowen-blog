# BLOG-20 生产收口、验收与恢复手册

本文覆盖锁文件、CI、Docker、备份恢复、邮件域名和 GitHub 项目初始化。

## 1. 锁文件

常规安装、CI 和 Docker 构建统一使用：

```bash
pnpm install --frozen-lockfile
```

`.github/workflows/lockfile-sync.yml` 只在 `main` 的依赖清单变化时执行 `pnpm 10.34.4 install --lockfile-only --ignore-scripts`。有差异才由 GitHub Actions Bot 提交，锁文件提交不会再次触发同步。

本地修改依赖后仍应执行：

```bash
pnpm install
pnpm install --frozen-lockfile
```

## 2. CI 全量验证

`.github/workflows/ci.yml` 包含：

1. 冻结依赖、全工作区类型检查、单元和集成测试；
2. 隔离 SQLite 引导、Server 编译、Web 完整构建与预渲染；
3. 备份恢复测试与恢复演练；
4. Playwright Chromium E2E；
5. Docker 构建、健康检查、API 重启持久化、Web 重启和容器内备份。

本地核心命令：

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

## 3. Docker 生产部署验收

`.env` 至少配置：

```env
BASE_URL=https://blog.example.com
HTTP_PORT=8080
SESSION_SECRET=<固定强随机密钥>
ADMIN_USERNAME=NOWEN
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<强密码>
DATA_VOLUME_NAME=nowen-blog-data
BACKUP_HOST_DIR=./backups
```

API 以 UID 1000 的非 root 用户运行。Linux 首次部署先准备备份目录：

```bash
mkdir -p backups
sudo chown -R 1000:1000 backups
chmod 750 backups
```

启动和验收：

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
pnpm ops:verify-production -- --base-url https://blog.example.com
```

本机 HTTP 使用：

```bash
pnpm ops:verify-production -- --base-url http://127.0.0.1:8080 --allow-http
```

验收脚本检查 Nginx、站点设置、项目 API、首页、安全响应头、SPA 回退、RSS、Sitemap 和 robots。

验证容器重启与 SQLite 持久化：

```bash
ADMIN_PASSWORD='<管理员密码>' \
BASE_URL=http://127.0.0.1:8080 \
pnpm ops:verify-docker-persistence -- --allow-http
```

命令会创建临时项目、重启 API、确认数据仍在、清理临时项目，再重启 Web 并复查健康状态。

## 4. 在线备份

Compose 将 `BACKUP_HOST_DIR` 挂载到 `/app/backups`：

```bash
docker compose exec -T api pnpm --filter @blog/server ops:backup
```

本地等价命令：

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

清单记录数据库和每个上传文件的大小、SHA-256、SQLite `integrity_check` 和 migration 数量。创建后会立即二次校验。备份还应同步到异机或对象存储。

## 5. 恢复与演练

真实恢复前停止写入：

```bash
docker compose stop web api
```

执行恢复：

```bash
docker compose run --rm api \
  pnpm --filter @blog/server ops:restore -- \
  --backup /app/backups/nowen-blog-backup-YYYY-MM-DDTHH-MM-SS-Z \
  --force
```

`--force` 会先把当前数据库、WAL/SHM 和上传目录复制到：

```text
/app/data/restore-rollbacks/rollback-<时间>/
```

恢复后：

```bash
docker compose up -d
pnpm ops:verify-production -- --base-url https://blog.example.com
```

不覆盖生产数据的自动演练：

```bash
docker compose exec -T api pnpm --filter @blog/server ops:rehearse-backup
```

演练会在临时目录备份和恢复副本，检查完整性、migration 与核心表后自动清理。

## 6. Resend 域名与真实发送

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

脚本会要求 Resend 发件域名状态为 `verified`，检查 DMARC，并向 `EMAIL_SMOKE_TO` 发送带唯一编号的真实邮件。代码验收后仍要人工确认收件箱、垃圾箱、回复地址、正文退订和邮件客户端一键退订。

## 7. GitHub 项目初始化

通过生产后台 API 同步，不需要服务器 SSH：

```bash
BASE_URL=https://blog.example.com \
ADMIN_USERNAME=NOWEN \
ADMIN_PASSWORD='<管理员密码>' \
GITHUB_SYNC_TARGET=cropflre \
GITHUB_SYNC_MAX_REPOS=12 \
GITHUB_FEATURED_REPOS='cropflre/nowen-note,cropflre/nowen-reader' \
pnpm ops:initialize-projects
```

命令会登录后台、同步项目，并把指定仓库设为精选、公开和有序展示。完成后进入 `/admin/projects` 补充封面、产品地址和人工描述。

## 8. 受保护的生产工作流

`.github/workflows/production-acceptance.yml` 通过 `workflow_dispatch` 手动执行，并绑定 GitHub `production` Environment。生产目标不接受临时输入，固定读取受保护 Environment Variable：

```text
PRODUCTION_BASE_URL=https://blog.example.com
```

这样后台密码不会因为手动输入错误 URL 而发送到其他站点。建议给 `production` Environment 配置审批人，并添加 Secrets：

```text
ADMIN_USERNAME
ADMIN_PASSWORD
RESEND_API_KEY
NEWSLETTER_FROM_EMAIL
NEWSLETTER_REPLY_TO
```

工作流可验证固定的真实 URL，并按输入选择初始化 GitHub 项目或发送一封真实验收邮件，不会自动定时发送。

## 9. 完成判定

- 锁文件与依赖清单一致；
- CI 的 quality、E2E、Docker Job 全绿；
- 真实生产 URL 验收通过；
- 至少一份备份已复制到异机；
- 恢复演练通过；
- Resend 域名 verified 且真实邮件收到；
- 正式项目已初始化并人工检查。
