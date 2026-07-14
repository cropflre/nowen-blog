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

const SPACE_ID = 'docspace_nowen_note_help';
const VERSION_ID = 'docver_nowen_note_help_latest';
const SPACE_SLUG = 'nowen-note-help';

const documents: SeedDocument[] = [
  {
    id: 'doc_nn_help_quick',
    title: '快速开始',
    slug: 'quick-start',
    description: '选择安装方式、完成 Docker 部署并通过首次检查。',
    sortOrder: 10,
    contentMd: `# 快速开始

Nowen Note 是一个自托管的私有知识库。普通用户优先使用 Docker 或 NAS 应用安装，不建议为了日常使用去搭建前后端开发环境。

建议按以下顺序操作：

1. 选择适合自己的安装方式。
2. 完成 Docker 或 NAS 安装。
3. 登录后立即修改默认密码。
4. 确认 \`/app/data\` 已正确持久化。
5. 创建第一份完整备份后再开始长期使用。

> 重要：默认管理员为 \`admin / admin123\`，只用于首次登录。`,
  },
  {
    id: 'doc_nn_help_choose_install',
    parentId: 'doc_nn_help_quick',
    title: '选择安装方式',
    slug: 'choose-installation',
    description: '根据设备和使用场景选择 Docker、NAS、桌面端或移动端。',
    sortOrder: 11,
    contentMd: `# 选择安装方式

## 推荐顺序

| 使用场景 | 推荐方式 |
|---|---|
| Linux 服务器、软路由、普通 NAS | Docker Compose |
| 群晖、绿联、威联通、极空间 | NAS 的 Docker 管理界面 |
| 飞牛 fnOS x86_64 | .fpk 一键安装 |
| Windows / macOS / Linux 单机使用 | Electron 桌面客户端 |
| Android 手机 | 安装 APK，并连接已经部署的服务器 |
| 开发和二次修改 | Node.js 20+ 本地开发 |

## 安装前确认

- 服务器或 NAS 有固定局域网 IP。
- 端口 \`3001\` 没有被其他应用占用。
- 数据目录可以长期保留，不会随容器删除。
- 外网访问时优先配置 HTTPS 和反向代理。
- 手机不能使用 \`localhost\` 或 \`127.0.0.1\` 连接 NAS。

第一次部署建议先在局域网完成安装和备份验证，再配置公网访问。`,
  },
  {
    id: 'doc_nn_help_docker_install',
    parentId: 'doc_nn_help_quick',
    title: 'Docker 一键安装',
    slug: 'docker-install',
    description: '使用 Docker Compose 构建、启动和检查 Nowen Note。',
    sortOrder: 12,
    contentMd: `# Docker 一键安装

## 环境要求

- Docker Engine
- Docker Compose
- 至少预留一个可持久化的数据目录

## 安装命令

\`\`\`bash
git clone https://github.com/cropflre/nowen-note.git
cd nowen-note
docker compose up -d --build
\`\`\`

旧版 Docker Compose 可将命令替换为 \`docker-compose\`。

## 检查状态

\`\`\`bash
docker compose ps
docker compose logs --tail=100 nowen-note
\`\`\`

浏览器打开：

\`\`\`text
http://服务器IP:3001
\`\`\`

默认账号：

\`\`\`text
用户名：admin
密码：admin123
\`\`\`

## 安装成功的判断标准

- 容器状态为 running 或 healthy。
- 浏览器可以看到登录页。
- 登录后能创建笔记。
- 重启容器后笔记仍然存在。
- 容器内 \`/app/data\` 可以看到数据库和附件目录。

> 不要执行 \`docker compose down -v\`。其中 \`-v\` 会删除命名卷，可能同时删除数据库和附件。`,
  },
  {
    id: 'doc_nn_help_first_login',
    parentId: 'doc_nn_help_quick',
    title: '首次登录与基础检查',
    slug: 'first-login',
    description: '首次登录后必须完成的安全、时区和持久化检查。',
    sortOrder: 13,
    contentMd: `# 首次登录与基础检查

## 立即修改默认密码

使用 \`admin / admin123\` 登录后，第一件事是进入账号或安全设置修改密码。

不要将默认账号直接暴露到公网。

## 检查本地时区

Docker 默认建议设置：

\`\`\`env
TZ=Asia/Shanghai
\`\`\`

海外用户替换为自己的 IANA 时区，例如：

\`\`\`env
TZ=Europe/London
TZ=America/Los_Angeles
\`\`\`

时区错误会影响待办中的“今天、本周、逾期”和定时备份时间。

## 检查数据持久化

容器目录必须是：

\`\`\`text
/app/data
\`\`\`

在容器中检查：

\`\`\`bash
docker exec nowen-note ls -la /app/data
\`\`\`

通常应看到 \`nowen-note.db\`、WAL 文件、附件目录和密钥文件。

## 做一次重启测试

1. 创建一篇测试笔记并上传一张图片。
2. 执行 \`docker restart nowen-note\`。
3. 重新登录并确认笔记、图片仍然存在。
4. 测试完成后再配置外网访问。`,
  },
  {
    id: 'doc_nn_help_nas',
    title: 'NAS 安装',
    slug: 'nas-installation',
    description: '群晖、绿联、飞牛和其他 NAS 的安装要点。',
    sortOrder: 20,
    contentMd: `# NAS 安装

不同 NAS 面板名称不同，但核心配置完全一致：

- 容器端口：\`3001\`
- 容器数据目录：\`/app/data\`
- 重启策略：始终或 unless-stopped
- 时区：\`Asia/Shanghai\` 或你的本地时区

最容易造成数据丢失的错误，是把宿主机目录错误映射到 \`/data\`，而不是 \`/app/data\`。`,
  },
  {
    id: 'doc_nn_help_synology',
    parentId: 'doc_nn_help_nas',
    title: '群晖 Synology 安装',
    slug: 'synology',
    description: '使用 Container Manager 在群晖 DSM 上部署。',
    sortOrder: 21,
    contentMd: `# 群晖 Synology 安装

## 前提

DSM 7.2+ 使用 Container Manager；DSM 7.0 / 7.1 使用 Docker 套件。

## 推荐配置

| 类型 | 配置 |
|---|---|
| 本地端口 | 3001 |
| 容器端口 | 3001 |
| 本地目录 | /docker/nowen-note/data |
| 容器目录 | /app/data |
| 时区 | Asia/Shanghai |
| 重启策略 | 自动重启 |

## 安装后访问

\`\`\`text
http://群晖IP:3001
\`\`\`

## 备份建议

将整个 \`/docker/nowen-note/data\` 纳入 Hyper Backup，而不是只复制数据库文件。图片、附件、字体和部分运行密钥也位于数据目录。

更新或重建容器时，保留原来的目录映射即可继续使用旧数据。`,
  },
  {
    id: 'doc_nn_help_ugreen',
    parentId: 'doc_nn_help_nas',
    title: '绿联 UGOS 安装',
    slug: 'ugreen',
    description: '绿联 Docker 面板的端口、存储映射和验证方法。',
    sortOrder: 22,
    contentMd: `# 绿联 UGOS 安装

## 容器配置

- 网络：bridge
- 主机端口：\`3001\`
- 容器端口：\`3001\`
- 主机目录：例如 \`/mnt/user/appdata/nowen-note/data\`
- 容器目录：必须为 \`/app/data\`
- 重启策略：开机自启

## 最常见错误

错误配置：

\`\`\`text
宿主机目录 → /data
\`\`\`

正确配置：

\`\`\`text
宿主机目录 → /app/data
\`\`\`

如果填成 \`/data\`，程序仍会把数据写入容器内部的 \`/app/data\`。NAS 文件管理器中的挂载目录会是空的，删除容器后数据也可能一起消失。

## 验证

进入容器终端执行：

\`\`\`bash
ls -la /app/data
\`\`\`

应能看到数据库、WAL 文件、附件目录和密钥文件。`,
  },
  {
    id: 'doc_nn_help_fnos',
    parentId: 'doc_nn_help_nas',
    title: '飞牛 fnOS 安装',
    slug: 'fnos',
    description: '使用 .fpk 一键安装或 Docker 部署。',
    sortOrder: 23,
    contentMd: `# 飞牛 fnOS 安装

## .fpk 一键安装

1. 下载最新的 \`nowen-note-x.y.z.fpk\`。
2. 打开飞牛“应用中心”。
3. 进入右上角“设置”。
4. 选择“手动安装应用”。
5. 上传并安装 fpk。
6. 从桌面打开“弄文笔记”。

当前 fpk 主要面向 x86_64 飞牛设备。ARM 设备请使用 ARM64 Docker 镜像或自行构建。

## Docker 安装

使用 Docker 时仍然要把持久化目录映射到 \`/app/data\`，并映射端口 \`3001:3001\`。

升级前先通过飞牛备份或复制应用数据目录完成完整备份。`,
  },
  {
    id: 'doc_nn_help_other_nas',
    parentId: 'doc_nn_help_nas',
    title: '威联通、极空间与 ARM64',
    slug: 'other-nas-arm64',
    description: '其他 NAS 平台和 ARM64 设备的通用部署方法。',
    sortOrder: 24,
    contentMd: `# 威联通、极空间与 ARM64

## 通用 NAS 配置

无论面板叫 Container Station、Docker 管理器还是容器中心，都使用以下核心参数：

\`\`\`text
主机端口 3001 → 容器端口 3001
宿主机长期目录 → /app/data
TZ=Asia/Shanghai
重启策略=自动
\`\`\`

## ARM64 设备

A311D、RK3566、RK3588 和其他 ARM64 设备需要使用 ARM64 镜像。自行构建时可使用：

\`\`\`bash
docker buildx build --platform linux/arm64 -t nowen-note:arm64 --load .
\`\`\`

如果出现 \`exec format error\`，通常是镜像架构与设备 CPU 不匹配。

## 安装后验证

- 打开 \`http://NAS_IP:3001\`。
- 创建笔记和图片后重启容器。
- 确认数据仍在。
- 再配置反向代理和 HTTPS。`,
  },
  {
    id: 'doc_nn_help_data',
    title: '升级、备份与迁移',
    slug: 'upgrade-backup',
    description: '安全升级、完整备份和恢复迁移。',
    sortOrder: 30,
    contentMd: `# 升级、备份与迁移

Nowen Note 的核心数据不只有 SQLite 数据库，还包括图片、附件、字体、备份文件和运行密钥。

安全原则：

1. 升级前先备份。
2. 不执行删除数据卷的命令。
3. 不只备份 \`nowen-note.db\`。
4. 恢复前保留当前故障现场副本。`,
  },
  {
    id: 'doc_nn_help_upgrade',
    parentId: 'doc_nn_help_data',
    title: 'Docker 安全升级',
    slug: 'docker-upgrade',
    description: '在保留数据卷的前提下更新代码和镜像。',
    sortOrder: 31,
    contentMd: `# Docker 安全升级

## 升级前

1. 确认数据确实位于持久化的 \`/app/data\`。
2. 创建完整备份。
3. 记录当前版本和容器配置。

## 源码构建方式

\`\`\`bash
git pull
docker compose up -d --build
\`\`\`

## 升级后检查

\`\`\`bash
docker compose ps
docker compose logs --tail=200 nowen-note
\`\`\`

随后检查：

- 登录是否正常。
- 笔记数量是否正确。
- 随机打开几篇带图片的旧笔记。
- 上传和下载附件。
- 手机或桌面客户端能否连接。
- 备份中心是否正常。

## 禁止操作

除非已经确认不需要旧数据，否则不要执行：

\`\`\`bash
docker compose down -v
docker volume rm ...
\`\`\`

这些命令可能永久删除命名卷。`,
  },
  {
    id: 'doc_nn_help_persistence',
    parentId: 'doc_nn_help_data',
    title: '数据目录与完整备份',
    slug: 'data-and-backup',
    description: '识别必须备份的数据库、附件、字体和密钥。',
    sortOrder: 32,
    contentMd: `# 数据目录与完整备份

## 典型数据结构

\`\`\`text
/app/data/
├── nowen-note.db
├── nowen-note.db-wal
├── nowen-note.db-shm
├── attachments/
├── backups/
├── fonts/
└── 运行密钥文件
\`\`\`

## 为什么不能只备份数据库

数据库保存笔记正文和附件记录，真正的图片与文件位于 \`attachments\`。只恢复数据库会出现“笔记还在，但图片和附件丢失”。

## 推荐备份范围

至少备份：

- 数据库及相关 WAL 文件
- 整个 \`attachments\` 目录
- 自定义字体
- 运行密钥
- 需要保留的备份包

正在运行的 SQLite 不建议直接随意复制单个数据库文件。优先使用应用内备份功能；做目录级冷备份时先停止容器，再完整复制数据目录。

## 3-2-1 原则

- 保留 3 份副本。
- 使用 2 种不同介质。
- 至少 1 份位于另一台设备或异地。

默认 \`/app/data/backups\` 与主数据在同一卷，只能防误操作，不能防磁盘损坏。`,
  },
  {
    id: 'doc_nn_help_restore',
    parentId: 'doc_nn_help_data',
    title: '恢复与迁移到新设备',
    slug: 'restore-migrate',
    description: '把数据库和附件完整迁移到新服务器或 NAS。',
    sortOrder: 33,
    contentMd: `# 恢复与迁移到新设备

## 迁移前准备

- 确认备份包含完整数据目录。
- 记录旧实例版本。
- 新实例尽量先使用相同或更高版本。

## 通用步骤

1. 停止旧实例并做最后一次完整备份。
2. 在新设备创建空的数据目录。
3. 将旧数据目录完整复制到新目录。
4. 把新目录映射到容器的 \`/app/data\`。
5. 启动容器并查看日志。
6. 检查笔记、图片、附件、用户和设置。
7. 验证完成前不要删除旧实例。

## 恢复失败时

- 立即停止反复启动和写入。
- 保留当前数据目录副本。
- 检查文件权限和属主。
- 检查数据库与应用版本。
- 查看容器日志中的迁移错误。

不要通过创建全新数据库来“修复”旧数据，否则会掩盖真正的挂载或权限问题。`,
  },
  {
    id: 'doc_nn_help_network',
    title: '网络与客户端连接',
    slug: 'network-clients',
    description: '局域网访问、反向代理和移动端服务器地址。',
    sortOrder: 40,
    contentMd: `# 网络与客户端连接

建议先确认局域网直连正常，再配置域名、HTTPS、隧道或公网反向代理。

排查顺序：

1. 容器是否运行。
2. NAS 本机是否能访问 3001。
3. 同一局域网电脑是否能访问。
4. 防火墙和端口映射是否正确。
5. 最后再检查域名和反向代理。`,
  },
  {
    id: 'doc_nn_help_lan',
    parentId: 'doc_nn_help_network',
    title: '局域网无法访问',
    slug: 'lan-access',
    description: '排查端口、IP、防火墙和容器监听状态。',
    sortOrder: 41,
    contentMd: `# 局域网无法访问

## 正确地址

\`\`\`text
http://服务器或NAS的局域网IP:3001
\`\`\`

不要在另一台电脑或手机上使用：

\`\`\`text
http://localhost:3001
http://127.0.0.1:3001
\`\`\`

这两个地址只代表当前设备自己。

## 排查命令

\`\`\`bash
docker compose ps
docker compose logs --tail=100 nowen-note
curl http://127.0.0.1:3001/api/health
\`\`\`

## 逐项检查

- 主机端口是否映射为 \`3001:3001\`。
- NAS 防火墙是否允许 3001。
- 访问设备和 NAS 是否处于同一网络。
- NAS IP 是否发生变化。
- 路由器是否启用了访客网络隔离。
- 端口是否被其他容器占用。

如果 NAS 本机健康检查成功，而其他设备无法访问，问题通常在防火墙、端口映射或网络隔离。`,
  },
  {
    id: 'doc_nn_help_proxy',
    parentId: 'doc_nn_help_network',
    title: '反向代理、HTTPS 与 WebSocket',
    slug: 'reverse-proxy',
    description: '配置代理头、查询参数和实时同步连接。',
    sortOrder: 42,
    contentMd: `# 反向代理、HTTPS 与 WebSocket

## 必须保留的信息

反向代理应保留：

- Host
- X-Forwarded-Host
- X-Forwarded-Proto
- 原始路径和查询参数
- WebSocket Upgrade 头

Nginx 常用配置片段：

\`\`\`nginx
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
\`\`\`

## 常见表现

代理配置不完整时可能出现：

- 登录后循环跳转。
- 图片地址变成 127.0.0.1。
- 附件下载 401。
- 实时同步断开。
- 上传成功但刷新后裂图。

## HTTPS 建议

公网部署必须使用 HTTPS。浏览器页面使用 HTTPS 时，不应再请求 HTTP API 或 WebSocket，否则会被浏览器作为混合内容拦截。`,
  },
  {
    id: 'doc_nn_help_client_address',
    parentId: 'doc_nn_help_network',
    title: 'Android 与桌面端连接服务器',
    slug: 'client-server-address',
    description: '正确填写移动端和桌面客户端的服务地址。',
    sortOrder: 43,
    contentMd: `# Android 与桌面端连接服务器

## 地址格式

局域网：

\`\`\`text
http://192.168.1.20:3001
\`\`\`

域名反代：

\`\`\`text
https://note.example.com
\`\`\`

一般填写站点根地址，不要额外添加 \`/api\`。

## 手机端注意

- \`localhost\` 指手机自己，不是 NAS。
- 手机与 NAS 需要处于可互通网络。
- 使用域名时确保证书有效。
- 内网域名需要手机 DNS 能解析。
- 代理需要支持 WebSocket。

首次连接失败时，先用手机浏览器打开同一个地址。浏览器也打不开时，应先解决网络或反代问题。`,
  },
  {
    id: 'doc_nn_help_troubleshooting',
    title: '常见问题',
    slug: 'troubleshooting',
    description: '白屏、裂图、401、同步、冲突、登录和导入搜索问题。',
    sortOrder: 50,
    contentMd: `# 常见问题

遇到问题时先执行三项安全动作：

1. 不删除数据库或数据卷。
2. 不清空浏览器本地数据和同步队列。
3. 先备份完整 \`/app/data\`。

然后记录版本、部署方式、发生时间和错误日志，再按对应文章排查。`,
  },
  {
    id: 'doc_nn_help_white_screen',
    parentId: 'doc_nn_help_troubleshooting',
    title: '页面白屏或加载很慢',
    slug: 'white-screen-slow',
    description: '排查 Android WebView、网络、大列表和重复请求问题。',
    sortOrder: 51,
    contentMd: `# 页面白屏或加载很慢

## 先判断服务器是否真的慢

打开容器日志，观察 \`/api/notes\`、\`/api/notebooks\` 和 \`/api/tags\` 的响应时间。

如果服务端只需要几毫秒，但 Android 仍等待很久，瓶颈通常在客户端网络、WebView 数据解析或旧版本重复请求，而不是 SQLite。

## 处理步骤

1. 将服务端和 Android 客户端都升级到最新版本。
2. 用手机浏览器访问同一服务器，比较网页和 App 速度。
3. 确认没有使用慢速公网回源或错误 DNS。
4. 关闭后重新打开 App，让客户端重新完成启动拉取。
5. 检查笔记数量和大体积正文是否异常。
6. 保存启动阶段日志和客户端版本。

## 不建议

不要一开始就清除 App 数据。清理前必须确认离线草稿和待同步内容已经上传或导出。`,
  },
  {
    id: 'doc_nn_help_broken_images',
    parentId: 'doc_nn_help_troubleshooting',
    title: '图片刷新后裂图或变成 127.0.0.1',
    slug: 'images-after-refresh',
    description: '处理反代环境下的错误附件地址和物理文件缺失。',
    sortOrder: 52,
    contentMd: `# 图片刷新后裂图或变成 127.0.0.1

## 典型现象

图片刚上传时正常，刷新后地址变成：

\`\`\`text
http://127.0.0.1:3001/api/attachments/...
\`\`\`

浏览器会把 127.0.0.1 解释为当前电脑或手机，因此图片加载失败。

## 处理步骤

1. 升级到包含附件地址自愈修复的最新版本。
2. 检查反向代理是否正确传递 Host 和 X-Forwarded-*。
3. 确认查询参数没有被代理删除。
4. 检查物理附件是否仍在 \`/app/data/attachments\`。
5. 刷新笔记，旧的回环地址应自动改用当前服务地址。

## 数据边界

如果附件文件仍在，升级后通常可以恢复显示。

如果旧容器没有持久化 \`/app/data\`，物理文件已经随容器删除，只能从完整备份恢复。仅恢复数据库无法找回图片文件。`,
  },
  {
    id: 'doc_nn_help_attachment_401',
    parentId: 'doc_nn_help_troubleshooting',
    title: '附件下载提示 HTTP 401',
    slug: 'attachment-401',
    description: '排查登录状态、签名参数、代理和系统时间。',
    sortOrder: 53,
    contentMd: `# 附件下载提示 HTTP 401

附件下载地址通常带有短期签名参数。出现 401 时按顺序检查：

1. 刷新笔记页面，重新获取签名地址。
2. 确认当前账号仍有该笔记的读取权限。
3. 升级到最新版本，旧版本可能生成缺少签名参数的下载链接。
4. 检查反向代理是否完整保留 \`exp\`、\`sig\`、\`scope\` 等查询参数。
5. 检查 NAS、容器和访问设备时间是否明显不一致。
6. 分享链接有密码时，先完成密码验证再下载。

## 收集诊断

记录完整 HTTP 状态和路径，但公开提交问题时请隐藏签名参数和任何 Token。

如果笔记内可以下载、文件管理页不能下载，通常是页面拿到的签名地址未刷新，先重新打开文件或升级版本。`,
  },
  {
    id: 'doc_nn_help_sync_queue',
    parentId: 'doc_nn_help_troubleshooting',
    title: '同步队列一直不归零',
    slug: 'sync-queue-stuck',
    description: '安全处理待同步数量、失败项和跨端状态不一致。',
    sortOrder: 54,
    contentMd: `# 同步队列一直不归零

## 典型现象

- 手动同步后仍显示待同步。
- 数量长期停在固定数字。
- 一台设备删除后另一台仍存在。
- 附件数量或统计状态不刷新。

## 安全处理

1. 先升级所有客户端和服务端。
2. 保持网络稳定，重新触发同步。
3. 在同步状态中查看具体失败项和 HTTP 状态。
4. 对失败项单独重试。
5. 无法处理时先导出同步诊断或保留本地副本。
6. 重新进入前台后等待补拉完成。

## 不能做什么

不要直接清空同步队列、IndexedDB 或整个浏览器数据。队列中可能保存尚未上传的本地内容。

新版只会在服务端确认成功后移除队列项；永久失败项会保留原因，版本冲突也不会继续盲目覆盖服务器内容。`,
  },
  {
    id: 'doc_nn_help_conflict',
    parentId: 'doc_nn_help_troubleshooting',
    title: '一直提示版本冲突',
    slug: 'version-conflict',
    description: '正确选择保留设备版本或服务器版本。',
    sortOrder: 55,
    contentMd: `# 一直提示版本冲突

版本冲突表示当前设备编辑的基础版本落后于服务器版本，常见于多设备同时编辑或离线后恢复网络。

## 正确处理

升级到最新版本后，打开右下角的“处理冲突”，对每篇笔记选择：

### 保留此设备版本

使用服务器最新版本号提交当前设备内容。适合确认本机内容才是最终版本的情况。

### 使用服务器版本

系统先把本机修改保存为独立的冲突副本，再采用服务器内容。适合服务器版本更新、更完整的情况。

## 不需要做的事情

- 不需要清空历史版本。
- 不需要使用无痕模式。
- 不需要清空整个浏览器数据。

处理失败时不要重复强制覆盖，先保留本地草稿和冲突副本，再检查网络与服务端日志。`,
  },
  {
    id: 'doc_nn_help_login',
    parentId: 'doc_nn_help_troubleshooting',
    title: '登录失败、密码错误或账号像被重置',
    slug: 'login-password',
    description: '区分默认账号、旧数据未挂载和真实密码问题。',
    sortOrder: 56,
    contentMd: `# 登录失败、密码错误或账号像被重置

## 新安装默认账号

\`\`\`text
admin / admin123
\`\`\`

默认账号只适用于全新数据库。首次登录后应立即修改密码。

## 升级后旧密码失效或又出现默认账号

这通常不是密码被系统重置，而是容器启动了一个新的空数据库。检查：

- 数据目录是否仍映射到 \`/app/data\`。
- 宿主机挂载路径是否改变。
- 是否误删了 Docker volume。
- \`DB_PATH\` 是否仍是 \`/app/data/nowen-note.db\`。
- 容器内数据库文件时间和大小是否符合预期。

## 忘记已修改的密码

先备份完整数据目录，不要删除数据库重新安装。记录版本和部署方式，再使用当前版本提供的管理员恢复方式或联系维护者协助处理。

公开日志和截图时不要暴露密码、Token、Cookie 或数据库文件。`,
  },
  {
    id: 'doc_nn_help_import_search',
    parentId: 'doc_nn_help_troubleshooting',
    title: '导入排版异常或搜索结果不准确',
    slug: 'import-search',
    description: '处理第三方格式差异、搜索遗漏和错误匹配。',
    sortOrder: 57,
    contentMd: `# 导入排版异常或搜索结果不准确

## 导入排版异常

第三方笔记工具的 HTML、Markdown、资源路径和自定义块并不完全一致。

建议：

1. 保留原始导出文件，不要只保留导入后的结果。
2. 先导入一个小样本验证标题、表格、图片和附件。
3. 使用最新版本重新测试。
4. 提交问题时同时提供最小示例文件和预期截图。

## 搜索不到或结果包含错误关键词

先确认：

- 搜索词是否存在于标题、正文或附件可索引文本。
- 笔记是富文本还是 Markdown。
- 内容是否刚导入、刚恢复或刚切换编辑器模式。
- 服务端和客户端是否已升级。

不要为了重建搜索而直接删除数据库索引表。提供一篇“应该命中但没有命中”和一篇“错误命中”的最小样例，更容易定位问题。`,
  },
  {
    id: 'doc_nn_help_support',
    title: '诊断与求助',
    slug: 'diagnostics-support',
    description: '查看健康状态、收集日志并安全提交问题。',
    sortOrder: 60,
    contentMd: `# 诊断与求助

高质量的问题信息应包含：

- Nowen Note 版本
- 使用平台和客户端
- Docker、NAS、桌面端或移动端
- 可重复的操作步骤
- 预期结果和实际结果
- 脱敏后的日志与截图

提交前先备份数据，避免在排查过程中扩大损失。`,
  },
  {
    id: 'doc_nn_help_logs',
    parentId: 'doc_nn_help_support',
    title: '查看健康状态与日志',
    slug: 'health-logs',
    description: '使用健康接口和 Docker 日志判断故障位置。',
    sortOrder: 61,
    contentMd: `# 查看健康状态与日志

## 健康检查

在服务器本机执行：

\`\`\`bash
curl http://127.0.0.1:3001/api/health
\`\`\`

如果本机健康检查失败，优先查看容器状态和启动日志。

## Docker 状态

\`\`\`bash
docker compose ps
docker compose logs --tail=200 nowen-note
\`\`\`

持续观察：

\`\`\`bash
docker compose logs -f nowen-note
\`\`\`

## 重点记录

- 第一个报错，而不是后面重复出现的连锁错误。
- HTTP 状态码和接口路径。
- 错误发生的准确时间。
- 容器是否重启。
- 数据库迁移、权限或磁盘空间错误。

公开日志前删除密码、Token、Cookie、签名参数和私人笔记内容。`,
  },
  {
    id: 'doc_nn_help_report',
    parentId: 'doc_nn_help_support',
    title: '提交问题前检查清单',
    slug: 'report-checklist',
    description: '帮助维护者快速复现，同时避免误删数据。',
    sortOrder: 62,
    contentMd: `# 提交问题前检查清单

## 基本信息

- [ ] Nowen Note 版本号
- [ ] 浏览器、桌面端或 Android 版本
- [ ] Docker / 群晖 / 绿联 / 飞牛 / 其他环境
- [ ] CPU 架构：amd64 或 arm64
- [ ] 是否经过反向代理

## 复现信息

- [ ] 从什么页面开始
- [ ] 点击了什么
- [ ] 实际看到什么
- [ ] 预期应该是什么
- [ ] 是否每次都能复现
- [ ] 网页端和客户端是否都存在

## 附件

- [ ] 脱敏截图或录屏
- [ ] 对应时间段的容器日志
- [ ] 浏览器控制台或网络状态码
- [ ] 最小导入样例或测试笔记

## 数据安全红线

不要公开数据库、备份包、API Token、Cookie、签名链接或包含私人内容的完整日志。

不要通过删除 \`/app/data\`、清空同步队列或执行 \`docker compose down -v\` 来尝试修复。`,
  },
];

export function ensureNowenNoteHelpDocs(): void {
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
        ) VALUES (?, NULL, ?, ?, ?, NULL, NULL, NULL, 'cms', '', 1, -10, ?, ?)`,
      )
      .run(
        SPACE_ID,
        'Nowen Note 安装与问题解答',
        SPACE_SLUG,
        'Nowen Note Docker、NAS 安装、升级备份、网络连接和常见问题处理指南。',
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
  console.log(`📘 Seeded Nowen Note installation help center (${documents.length} documents).`);
}
