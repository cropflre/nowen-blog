# BLOG-11.4：媒体库部署文档与备份策略

> 基线：`origin/main` 最新提交 `ee02341`（feat: integrate media picker into post editor）
> 本阶段范围：**仅产出部署文档与备份策略，不写实现代码、不改业务代码**
> 目标：补齐媒体库上线后的生产部署、静态文件服务、持久化、备份、回滚和运维检查说明

---

## 1. 当前媒体库能力概览

### 1.1 已实现功能

| 功能 | 说明 | 状态 |
|------|------|------|
| 图片上传 | 支持单文件上传，MIME 白名单（PNG/JPEG/WebP/GIF） | ✅ |
| 文件去重 | 基于 SHA-256 内容哈希，重复上传复用已有文件 | ✅ |
| 安全校验 | magic number 检测、路径穿越防护、危险文件类型拒绝 | ✅ |
| 图片列表 | 分页网格展示，按时间倒序 | ✅ |
| 元数据编辑 | 支持编辑 alt 文本和文件名 | ✅ |
| 删除图片 | 删除数据库记录 + 尝试删除磁盘文件 | ✅ |
| 复制 URL | 复制图片访问地址（`/uploads/<storageKey>`） | ✅ |
| 复制 Markdown | 复制 `![alt](url)` 片段 | ✅ |
| 文章封面选择 | 从媒体库选择图片回填 `coverUrl` | ✅ |
| 正文插入图片 | 在 Markdown 编辑器插入 `![alt](url)` | ✅ |

### 1.2 技术实现要点

- **存储后端**：本地文件系统（默认 `data/uploads`）
- **数据库表**：`assets` 表存储文件元数据
- **文件命名**：随机化 `storageKey = randomId('u_') + ext`，不使用原始文件名
- **URL 格式**：`/uploads/<storageKey>`（相对路径）
- **静态服务**：开发环境由 Hono `uploadsRoutes` 兜底服务，生产环境应由 nginx/静态层直接服务
- **环境变量**：
  - `UPLOAD_DIR`：上传目录（默认 `data/uploads`）
  - `MAX_UPLOAD_SIZE`：单文件大小上限（默认 5MB）

---

## 2. uploads 存储目录说明

### 2.1 默认存储位置

```
apps/server/
├── data/
│   ├── blog.sqlite          # SQLite 数据库
│   └── uploads/             # 上传文件存储目录
│       ├── u_Ab3x9G2q.png
│       ├── u_Kp8mQw1r.jpg
│       └── u_Zt5nYv7w.webp
├── .env                     # 环境变量配置
└── src/
```

### 2.2 目录配置

- **默认路径**：`data/uploads`（相对 server 工作目录）
- **可配置**：通过环境变量 `UPLOAD_DIR` 修改
- **绝对路径**：建议使用绝对路径，避免工作目录变化导致路径错误
- **不在 git**：`.gitignore` 已忽略 `data/uploads/*`

### 2.3 文件命名规则

- **格式**：`u_<randomId>.<ext>`
- **randomId**：字母数字随机串（如 `Ab3x9G2q`）
- **扩展名**：由 MIME 类型映射（`.png`/`.jpg`/`.webp`/`.gif`）
- **唯一性**：`storage_key` 列有 `unique()` 约束
- **安全性**：不使用客户端文件名，杜绝路径穿越和编码问题

### 2.4 数据库记录

`assets` 表关键字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| `id` | 主键（`a_<randomId>`） | `a_Xy8kLm3n` |
| `storageKey` | 磁盘文件名 | `u_Ab3x9G2q.png` |
| `filename` | 原始文件名（仅展示） | `my-photo.png` |
| `url` | 访问地址 | `/uploads/u_Ab3x9G2q.png` |
| `mimeType` | MIME 类型 | `image/png` |
| `size` | 文件大小（字节） | `245678` |
| `contentHash` | SHA-256 哈希（去重用） | `e3b0c44...` |
| `alt` | 替代文本 | `博客封面图` |

---

## 3. 生产环境持久化要求

### 3.1 必须持久化的目录

**⚠️ 关键**：生产环境必须确保 `data/uploads` 目录持久化，否则：

- 容器重启后上传的图片丢失
- 文章封面图和正文图片 404
- OG 图片无法加载，社交媒体分享异常

### 3.2 Docker 部署示例

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制依赖声明
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 构建
RUN pnpm build

# 创建上传目录（若挂载卷则会被覆盖）
RUN mkdir -p /app/apps/server/data/uploads

EXPOSE 8787

CMD ["pnpm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  blog-server:
    build: .
    ports:
      - "8787:8787"
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/blog.sqlite
      - UPLOAD_DIR=/data/uploads
      - BASE_URL=https://your-domain.com
      - SESSION_SECRET=<your-secret>
      - ADMIN_PASSWORD=<your-password>
    volumes:
      # 持久化上传文件和数据库
      - ./data:/app/apps/server/data
      # 或使用命名卷
      # - blog-data:/app/apps/server/data
    restart: unless-stopped

# volumes:
#   blog-data:
```

### 3.3 非容器部署

```bash
# 目录结构示例
/var/www/nowen-blog/
├── apps/
│   └── server/
│       ├── data/
│       │   ├── blog.sqlite
│       │   └── uploads/        # 必须持久化
│       └── dist/               # 构建产物
└── nginx/
    └── sites-available/
        └── nowen-blog
```

**权限设置**：

```bash
# 确保 server 进程用户有读写权限
chown -R node:node /var/www/nowen-blog/apps/server/data
chmod 755 /var/www/nowen-blog/apps/server/data/uploads
```

---

## 4. nginx / 静态层暴露 /uploads

### 4.1 推荐方案：nginx 直接服务（方案 B）

**优势**：
- Hono 只做 API，零运行时耦合
- 静态文件由 nginx 高效服务（sendfile、缓存头）
- 多实例部署时共享磁盘或迁移到对象存储更灵活

**nginx 配置示例**：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 配置（省略）

    # === 静态资源服务优先级顺序 ===

    # 1. uploads 上传文件（必须在 dist 之前）
    location /uploads {
        alias /var/www/nowen-blog/apps/server/data/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";

        # 不执行任何脚本
        types {
            image/png png;
            image/jpeg jpg jpeg;
            image/webp webp;
            image/gif gif;
        }
        default_type application/octet-stream;
    }

    # 2. SEO 端点（由 Hono 处理，但 nginx 可缓存）
    location = /rss.xml {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        expires 1h;
    }

    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        expires 1h;
    }

    location = /robots.txt {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        expires 1d;
    }

    # 3. 预渲染静态 HTML（精确匹配 .html）
    location ~* \.html$ {
        root /var/www/nowen-blog/apps/web/dist;
        try_files $uri =404;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    # 4. 其他静态资源（JS/CSS/字体等）
    location / {
        root /var/www/nowen-blog/apps/web/dist;
        try_files $uri $uri/ /200.html =404;
        expires 7d;
        add_header Cache-Control "public";
    }

    # 5. API 反代到 Hono
    location /api {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.2 备选方案：Hono 服务 /uploads（方案 A）

**适用场景**：简单部署、单机、不想配置 nginx 静态服务

**实现**：已在 `app.ts:45` 挂载 `uploadsRoutes`

```ts
// apps/server/src/app.ts
app.route('/uploads', uploadsRoutes);
```

**限制**：
- 偏离「Hono 不托管前端静态」原则
- 多实例部署时不共享磁盘则需对象存储
- 性能不如 nginx 直接服务

**生产建议**：即使使用方案 A，仍建议 nginx 在 Hono 前做反向代理，并设置缓存头

### 4.3 路由优先级总结

| 优先级 | 路径 | 处理方式 | 说明 |
|--------|------|----------|------|
| 1 | `/uploads/*` | nginx 静态服务 | 上传文件，必须在 SPA fallback 前 |
| 2 | `/rss.xml` | Hono 实时生成 | SEO 端点 |
| 3 | `/sitemap.xml` | Hono 实时生成 | SEO 端点 |
| 4 | `/robots.txt` | Hono 实时生成 | SEO 端点 |
| 5 | `/*.html` | nginx 静态文件 | 预渲染页面 |
| 6 | `/api/*` | Hono 反向代理 | API 接口 |
| 7 | 其他静态资源 | nginx 静态文件 | JS/CSS/字体等 |
| 8 | SPA fallback | `/200.html` | 未预渲染的客户端路由 |

---

## 5. coverUrl / og:image / 预渲染与 /uploads 的关系

### 5.1 数据流

```
1. 用户上传图片
   → 存储到 data/uploads/u_xxx.png
   → 数据库 assets 表记录
   → 返回 url = "/uploads/u_xxx.png"

2. 用户设置文章封面
   → posts.coverUrl = "/uploads/u_xxx.png"

3. 构建期预渲染
   → prerender.ts 读取 row.coverUrl
   → absoluteUrl(row.coverUrl) 生成完整 URL
   → 注入 og:image meta 标签

4. 生产环境访问
   → nginx 收到 /uploads/u_xxx.png 请求
   → alias 到 data/uploads/u_xxx.png
   → 返回图片文件
```

### 5.2 BASE_URL 配置要求

**⚠️ 关键**：`BASE_URL` 必须配置为生产域名，否则：

- `og:image` 生成错误的绝对地址
- 预渲染页面中的图片地址错误
- RSS feed 中的图片链接错误

```bash
# 构建时必须传入正确的 BASE_URL
BASE_URL=https://your-domain.com \
DATABASE_PATH=/path/to/prod/blog.sqlite \
pnpm --filter @blog/web build
```

### 5.3 og:image 生成逻辑

`prerender.ts` 中的处理逻辑：

```ts
// 伪代码
const coverUrl = row.coverUrl;
const ogImage = coverUrl ? absoluteUrl(coverUrl) : null;
// absoluteUrl 逻辑：
// - 若 coverUrl 已是绝对地址（http(s)://），原样返回
// - 若 coverUrl 是相对地址（/uploads/...），拼接 BASE_URL
```

### 5.4 预渲染页面中的图片

- Markdown 正文中的 `![](url)` 原样保留
- 相对路径 `/uploads/xxx` 在浏览器中相对于当前域名解析
- 确保 nginx 正确服务 `/uploads` 路径即可

---

## 6. 备份策略

### 6.1 备份原则

**⚠️ 核心原则**：SQLite 数据库和 `data/uploads` 必须**同一时间点**备份，否则：

- 数据库引用了已删除的文件 → 孤儿记录
- 文件存在但数据库无记录 → 孤儿文件
- 恢复时数据不一致

### 6.2 备份脚本示例

```bash
#!/bin/bash
# backup.sh - 媒体库备份脚本

set -e

BACKUP_DIR="/var/backups/nowen-blog"
DATA_DIR="/var/www/nowen-blog/apps/server/data"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 1. 停止服务（可选，推荐）
# systemctl stop nowen-blog

# 2. 备份 SQLite 数据库（使用 SQLite 备份命令确保一致性）
sqlite3 "$DATA_DIR/blog.sqlite" ".backup $BACKUP_DIR/blog_$TIMESTAMP.sqlite"

# 3. 打包数据库和 uploads 目录
tar -czf "$BACKUP_FILE" \
  -C "$DATA_DIR" \
  "blog_$TIMESTAMP.sqlite" \
  "uploads/"

# 4. 清理临时数据库备份
rm "$BACKUP_DIR/blog_$TIMESTAMP.sqlite"

# 5. 重启服务（如果停止了）
# systemctl start nowen-blog

# 6. 清理旧备份（保留最近 7 天）
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_FILE"
```

### 6.3 自动化备份（cron）

```bash
# 每天凌晨 2 点备份
0 2 * * * /path/to/backup.sh >> /var/log/nowen-blog-backup.log 2>&1
```

### 6.4 备份验证

```bash
# 验证备份完整性
tar -tzf backup_20240709_020000.tar.gz | head -20

# 验证数据库文件
sqlite3 backup_20240709_020000/blog.sqlite "SELECT COUNT(*) FROM assets;"
```

---

## 7. 恢复策略

### 7.1 完整恢复流程

```bash
#!/bin/bash
# restore.sh - 媒体库恢复脚本

set -e

BACKUP_FILE="$1"
DATA_DIR="/var/www/nowen-blog/apps/server/data"

if [ -z "$BACKUP_FILE" ]; then
  echo "用法: $0 <backup_file.tar.gz>"
  exit 1
fi

# 1. 停止服务
systemctl stop nowen-blog

# 2. 解压备份
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# 3. 恢复数据库
cp "$TEMP_DIR/blog.sqlite" "$DATA_DIR/blog.sqlite"

# 4. 恢复 uploads 目录
rm -rf "$DATA_DIR/uploads"
cp -r "$TEMP_DIR/uploads" "$DATA_DIR/uploads"

# 5. 设置权限
chown -R node:node "$DATA_DIR"

# 6. 重启服务
systemctl start nowen-blog

# 7. 清理临时目录
rm -rf "$TEMP_DIR"

echo "恢复完成"
```

### 7.2 部分恢复（仅 uploads）

```bash
# 仅恢复上传文件（数据库未损坏时）
tar -xzf backup_20240709_020000.tar.gz -C /var/www/nowen-blog/apps/server/data uploads/
chown -R node:node /var/www/nowen-blog/apps/server/data/uploads
```

### 7.3 验证恢复

```bash
# 检查数据库 assets 表
sqlite3 data/blog.sqlite "SELECT COUNT(*) FROM assets;"

# 检查文件是否存在
sqlite3 data/blog.sqlite "SELECT storageKey FROM assets LIMIT 5;" | while read key; do
  if [ ! -f "data/uploads/$key" ]; then
    echo "缺失文件: $key"
  fi
done
```

---

## 8. 删除文件失败 / 孤儿文件处理

### 8.1 当前实现的行为

`assets.service.ts:154-173` 的 `deleteAsset` 逻辑：

1. **先删除数据库记录**（权威数据源）
2. **再删除本地文件**（失败仅记录日志，不回滚数据库）

**后果**：如果文件删除失败（权限问题、文件不存在等）：
- 数据库记录已删除
- 磁盘文件仍存在 → 孤儿文件
- 下次上传相同内容会创建新记录（contentHash 去重失效）

### 8.2 孤儿文件检测脚本

```bash
#!/bin/bash
# find-orphans.sh - 检测孤儿文件和孤儿记录

DATA_DIR="/var/www/nowen-blog/apps/server/data"
DB="$DATA_DIR/blog.sqlite"

echo "=== 检测磁盘上存在但数据库无记录的文件 ==="
for file in "$DATA_DIR/uploads"/*; do
  filename=$(basename "$file")
  count=$(sqlite3 "$DB" "SELECT COUNT(*) FROM assets WHERE storageKey='$filename';")
  if [ "$count" -eq 0 ]; then
    echo "孤儿文件: $filename"
  fi
done

echo ""
echo "=== 检测数据库有记录但磁盘文件不存在 ==="
sqlite3 "$DB" "SELECT storageKey FROM assets;" | while read key; do
  if [ ! -f "$DATA_DIR/uploads/$key" ]; then
    echo "孤儿记录: $key"
  fi
done
```

### 8.3 清理建议

**定期清理孤儿文件**：

```bash
# 每周运行一次
0 3 * * 0 /path/to/find-orphans.sh | mail -s "Blog Orphan Files" admin@your-domain.com
```

**手动清理孤儿文件**（确认后）：

```bash
# 删除孤儿文件（数据库无记录的文件）
for file in /var/www/nowen-blog/apps/server/data/uploads/*; do
  filename=$(basename "$file")
  count=$(sqlite3 data/blog.sqlite "SELECT COUNT(*) FROM assets WHERE storageKey='$filename';")
  if [ "$count" -eq 0 ]; then
    rm "$file"
    echo "已删除: $filename"
  fi
done
```

**修复孤儿记录**（文件丢失，删除数据库记录）：

```bash
sqlite3 data/blog.sqlite "DELETE FROM assets WHERE storageKey NOT IN ($(ls data/uploads | sed 's/.*/"&"/' | paste -sd,));"
```

### 8.4 未来改进建议

- [ ] 删除文件失败时标记数据库记录为「文件缺失」状态
- [ ] 定期自动检测并报告孤儿文件
- [ ] 删除前检查文件是否被其他记录引用（contentHash 去重时）
- [ ] 软删除：先标记 `deletedAt`，定期清理

---

## 9. 安全注意事项

### 9.1 已实施的安全措施

| 措施 | 实现位置 | 说明 |
|------|----------|------|
| MIME 白名单 | `assets.service.ts:13` | 仅允许 PNG/JPEG/WebP/GIF |
| Magic number 检测 | `assets.service.ts:35-50` | 防止 MIME 伪装 |
| 危险文件类型拒绝 | `assets.service.ts:75` | 拒绝 SVG/HTML/JS |
| 文件名随机化 | `assets.service.ts:97` | 不使用客户端文件名 |
| 路径穿越防护 | `assets.service.ts:57-63` | 禁止 `/`、`\`、`..` |
| 文件大小限制 | `assets.service.ts:70` | 默认 5MB |
| 扩展名一致性校验 | `assets.service.ts:78-81` | 扩展名与内容匹配 |

### 9.2 生产环境必须注意

#### ❌ 禁止执行 uploads 下的脚本

**nginx 配置加固**：

```nginx
location /uploads {
    alias /var/www/nowen-blog/apps/server/data/uploads;

    # 禁止执行任何脚本
    location ~* \.(php|php5|phtml|shtml|asp|aspx|jsp|pl|py|rb|cgi)$ {
        deny all;
    }

    # 强制下载危险扩展名（如果存在）
    location ~* \.(svg|html|htm|xml)$ {
        deny all;  # 或直接不服务这些文件
    }

    # 设置正确的 Content-Type
    types {
        image/png png;
        image/jpeg jpg jpeg;
        image/webp webp;
        image/gif gif;
    }
    default_type application/octet-stream;

    # 防止 MIME 类型嗅探
    add_header X-Content-Type-Options "nosniff";

    # 不允许在 frame 中加载（防点击劫持）
    add_header X-Frame-Options "SAMEORIGIN";

    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

#### ❌ 禁止把 uploads 当作动态代码目录

- **不要**将 `UPLOAD_DIR` 设置为 web 根目录或任何可执行代码的目录
- **不要**在 `uploads` 目录下放置任何 `.htaccess`、`.user.ini` 等配置文件
- **不要**允许上传目录的目录列表（nginx 默认禁止）

#### ❌ 禁止暴露 data 目录整体

**错误示例**：

```nginx
# ❌ 错误：暴露整个 data 目录
location /data {
    alias /var/www/nowen-blog/apps/server/data;  # 会暴露 blog.sqlite！
}
```

**正确做法**：

```nginx
# ✅ 正确：仅暴露 uploads 子目录
location /uploads {
    alias /var/www/nowen-blog/apps/server/data/uploads;
}
```

### 9.3 其他安全建议

- **定期更新依赖**：`pnpm audit` 检查漏洞
- **限制上传频率**：防止DoS（可考虑 rate limiting）
- **监控异常上传**：日志记录，异常告警
- **备份加密**：备份文件包含用户数据，建议加密存储
- **访问控制**：`/uploads` 目前无访问控制（URL 不可枚举 + 随机 storageKey），如需更严格的控制可考虑：
  - 私有资源使用签名 URL
  - 添加 `assets.visibility` 字段
  - 反向代理层做鉴权

---

## 10. 生产验证清单

### 10.1 部署前检查

- [ ] `UPLOAD_DIR` 环境变量已配置（建议使用绝对路径）
- [ ] `MAX_UPLOAD_SIZE` 环境变量已配置（默认 5MB）
- [ ] `data/uploads` 目录已创建且有读写权限
- [ ] nginx 已配置 `/uploads` 静态服务（在 SPA fallback 之前）
- [ ] nginx 已配置正确的 `Content-Type` 和缓存头
- [ ] nginx 已禁止执行 `uploads` 下的脚本
- [ ] `BASE_URL` 已设置为生产域名
- [ ] 备份脚本已配置并测试
- [ ] 备份自动化（cron）已设置

### 10.2 部署后验证

- [ ] 访问 `/uploads/<existing-file>` 能正确返回图片
- [ ] 响应头包含 `Content-Type: image/*`
- [ ] 响应头包含 `Cache-Control` 和 `Expires`
- [ ] 访问不存在的文件返回 404（不是 500）
- [ ] 上传图片功能正常（登录后台测试）
- [ ] 上传的图片能在文章中显示
- [ ] 文章封面图能正常显示
- [ ] OG 图片在社交媒体分享时正常（用 [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) 测试）
- [ ] 删除图片功能正常（数据库记录和文件都删除）

### 10.3 性能验证

- [ ] 图片加载速度合理（< 500ms）
- [ ] nginx 缓存头生效（重复请求返回 304 或缓存）
- [ ] 大文件上传有进度反馈（前端）
- [ ] 并发上传测试（无错误）

### 10.4 安全验证

- [ ] 尝试上传非图片文件被拒绝
- [ ] 尝试上传 SVG 文件被拒绝
- [ ] 尝试路径穿越（`../../etc/passwd`）被拒绝
- [ ] 尝试上传超大文件（> 5MB）被拒绝
- [ ] 直接访问 `/data/blog.sqlite` 返回 404 或 403
- [ ] `X-Content-Type-Options: nosniff` 头存在

---

## 11. 回滚方案

### 11.1 代码回滚

如果媒体库功能出现问题，需要回滚代码：

```bash
# 1. 回滚到上一个稳定版本
git log --oneline -10  # 找到上一个稳定提交
git revert ee02341  # 或 git reset --hard <previous-commit>

# 2. 重新构建部署
pnpm build
# 部署流程...

# 3. 重启服务
systemctl restart nowen-blog
```

### 11.2 数据库回滚

如果 `assets` 表数据损坏：

```bash
# 1. 从备份恢复数据库（会覆盖所有表）
tar -xzf backup_20240709_020000.tar.gz -C /tmp
cp /tmp/blog.sqlite /var/www/nowen-blog/apps/server/data/blog.sqlite

# 2. 或仅恢复 assets 表（需谨慎）
sqlite3 backup_20240709_020000/blog.sqlite ".dump assets" | sqlite3 data/blog.sqlite
```

### 11.3 uploads 目录回滚

```bash
# 从备份恢复 uploads 目录
tar -xzf backup_20240709_020000.tar.gz -C /tmp
rm -rf /var/www/nowen-blog/apps/server/data/uploads
cp -r /tmp/uploads /var/www/nowen-blog/apps/server/data/uploads
chown -R node:node /var/www/nowen-blog/apps/server/data/uploads
```

### 11.4 完整回滚（推荐）

```bash
# 使用恢复脚本（见 §7）
./restore.sh backup_20240709_020000.tar.gz
```

---

## 12. 故障排查

### 12.1 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 上传失败（413） | 文件超过 `MAX_UPLOAD_SIZE` | 检查文件大小，调整环境变量 |
| 上传失败（400） | 文件类型不支持 | 检查 MIME 类型，仅支持 PNG/JPEG/WebP/GIF |
| 图片 404 | nginx 未配置 `/uploads` | 检查 nginx 配置 |
| 图片 403 | 权限问题 | 检查 `data/uploads` 目录权限 |
| 图片不显示（开发正常，生产异常） | `BASE_URL` 配置错误 | 检查构建时的 `BASE_URL` |
| OG 图片不显示 | `coverUrl` 是相对路径且 `BASE_URL` 错误 | 检查预渲染日志 |
| 删除图片后文件仍在 | 删除失败（权限/文件不存在） | 查看 server 日志，手动清理 |
| 数据库记录存在但文件丢失 | 磁盘故障/误删 | 从备份恢复或删除孤儿记录 |

### 12.2 日志检查

```bash
# 查看 server 日志
journalctl -u nowen-blog -n 100

# 或查看应用日志
tail -f /var/log/nowen-blog/server.log | grep -i "assets\|upload"

# nginx 错误日志
tail -f /var/log/nginx/error.log | grep -i "uploads"
```

### 12.3 数据库查询

```bash
# 查看 assets 表记录数
sqlite3 data/blog.sqlite "SELECT COUNT(*) FROM assets;"

# 查看最近的上传
sqlite3 data/blog.sqlite "SELECT id, filename, storageKey, createdAt FROM assets ORDER BY createdAt DESC LIMIT 10;"

# 查看文件大小分布
sqlite3 data/blog.sqlite "SELECT mimeType, COUNT(*), AVG(size), MAX(size) FROM assets GROUP BY mimeType;"
```

---

## 13. 后续改进方向

以下功能不在当前范围，但可作为后续优化：

- [ ] **图片裁剪/缩略图**：生成多尺寸（thumbnail、medium、large）
- [ ] **对象存储支持**：S3/R2/COS 兼容的 `StorageProvider`
- [ ] **CDN 集成**：自动刷新 CDN 缓存
- [ ] **图片优化**：WebP 自动转换、质量压缩
- [ ] **批量操作**：批量删除、批量编辑 alt
- [ ] **搜索/过滤**：按文件名、类型、日期过滤
- [ ] **存储配额**：限制总存储空间
- [ ] **访问统计**：图片访问次数统计
- [ ] **私有资源**：签名 URL、访问控制
- [ ] **异步处理**：大文件异步上传、后台处理

---

## 14. 总结

### 14.1 关键配置清单

| 配置项 | 位置 | 说明 |
|--------|------|------|
| `UPLOAD_DIR` | 环境变量 | 上传目录路径 |
| `MAX_UPLOAD_SIZE` | 环境变量 | 单文件大小上限（字节） |
| `BASE_URL` | 环境变量（构建时） | 生产域名（用于绝对化 URL） |
| nginx `/uploads` | nginx 配置 | 静态文件服务 |
| 备份脚本 | 运维脚本 | 定期备份数据库 + uploads |

### 14.2 部署流程总结

1. **配置环境变量**：`UPLOAD_DIR`、`MAX_UPLOAD_SIZE`、`BASE_URL`
2. **创建上传目录**：`mkdir -p data/uploads && chown node:node data/uploads`
3. **配置 nginx**：添加 `/uploads` 静态服务（在 SPA fallback 之前）
4. **测试上传功能**：登录后台，上传测试图片
5. **验证静态服务**：访问 `/uploads/<file>` 能返回图片
6. **配置备份**：设置 cron 自动化备份
7. **生产验证**：完整验证清单（见 §10）

### 14.3 运维要点

- **监控**：磁盘空间、上传失败率、孤儿文件
- **备份**：每天备份，定期验证
- **更新**：定期更新依赖，关注安全漏洞
- **文档**：记录所有自定义配置和改动

---

> 本文档覆盖媒体库生产部署的全流程，包括存储、静态服务、备份、恢复、安全和故障排查。
> 部署前请完整阅读并按验证清单检查。
