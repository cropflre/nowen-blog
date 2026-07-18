export type HelpDocumentUpdate = {
  id: string;
  parentId?: string;
  title: string;
  slug: string;
  description: string;
  contentMd: string;
  sortOrder: number;
};

export const helpDocumentUpdates: HelpDocumentUpdate[] = [
  {
    id: 'doc_nn_help_choose_install',
    parentId: 'doc_nn_help_quick',
    title: '选择安装方式',
    slug: 'choose-installation',
    description: '根据设备、维护能力和客户端平台选择 Docker、NAS 或桌面端。',
    sortOrder: 11,
    contentMd: `# 选择安装方式

## 官方入口

- 官方网站：[http://nowen.cn/](http://nowen.cn/)
- 在线体验：[http://note.nowen.cn/](http://note.nowen.cn/)
- 客户端下载：[GitHub Releases](https://github.com/cropflre/nowen-note/releases)

## 推荐方式

| 使用场景 | 推荐方式 |
|---|---|
| Linux 服务器、软路由、普通 NAS | 官方 Docker Compose |
| 群晖、威联通、极空间等 | NAS 的 Docker 管理界面 |
| 飞牛 fnOS x86_64 | Releases 中的 .fpk |
| 绿联 UGOS | Docker 或 .upk |
| Windows / macOS / Linux | Electron 桌面客户端 |
| Android | 安装 APK，并连接已经部署的服务器 |
| iOS | Capacitor、签名与 TestFlight 流程 |
| HarmonyOS | DevEco Studio 构建 ArkTS + ArkWeb 客户端 |
| 开发和二次修改 | Node.js 20+ 本地开发 |

安装前应确认端口、持久化目录、备份位置和网络访问方式。手机连接 NAS 时不能填写 localhost 或 127.0.0.1。`,
  },
  {
    id: 'doc_nn_help_docker_install',
    parentId: 'doc_nn_help_quick',
    title: 'Docker Compose 一键安装',
    slug: 'docker-install',
    description: '使用官方镜像、Compose v2 和持久化数据卷部署 Nowen Note。',
    sortOrder: 12,
    contentMd: `# Docker Compose 一键安装

## 环境要求

- Docker Engine
- Docker Compose v2
- 可以长期保留的数据存储

## 推荐安装

\`\`\`bash
git clone https://github.com/cropflre/nowen-note.git
cd nowen-note
docker compose up -d
\`\`\`

浏览器打开 \`http://服务器IP:3001\`。默认管理员为 \`admin / admin123\`，首次登录后立即修改密码。

## 检查状态

\`\`\`bash
docker compose ps
docker compose logs -f --tail=200 nowen-note
\`\`\`

确认容器健康、可以创建笔记和上传图片，并验证重启后数据仍在。容器内持久化目录必须是 \`/app/data\`。

不要执行 \`docker compose down -v\`，否则可能删除数据库和附件所在的数据卷。`,
  },
  {
    id: 'doc_nn_help_upgrade',
    parentId: 'doc_nn_help_data',
    title: 'Docker 手动与在线升级',
    slug: 'docker-upgrade',
    description: '使用官方镜像手动更新，或启用隔离的 Docker 在线升级代理。',
    sortOrder: 31,
    contentMd: `# Docker 手动与在线升级

## 手动升级

升级前创建完整备份，然后执行：

\`\`\`bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=200 nowen-note
\`\`\`

源码本地构建使用：

\`\`\`bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
\`\`\`

## 在线升级

在线升级只支持官方 Compose 受管部署，默认关闭。主应用不会挂载 Docker Socket，只有内部网络中的 updater 容器拥有受限权限。

管理员在「设置 → 关于 → 版本信息」中可以执行版本和架构预检、完整备份、镜像拉取、容器替换和健康验证。

自动回滚只保证恢复旧镜像容器，不代表数据库自动降级。发生不可逆迁移时，需要使用升级前完整备份人工恢复。

不要删除数据卷。`,
  },
  {
    id: 'doc_nn_help_proxy',
    parentId: 'doc_nn_help_network',
    title: '反向代理、公开地址与 WebSocket',
    slug: 'reverse-proxy',
    description: '配置代理头、PUBLIC_WEB_ORIGIN、查询参数和实时同步连接。',
    sortOrder: 42,
    contentMd: `# 反向代理、公开地址与 WebSocket

反向代理必须保留 Host、X-Forwarded-Host、X-Forwarded-Proto、原始查询参数和 WebSocket Upgrade 头。

使用域名或非默认端口时，应设置真实可访问的公开 Origin：

\`\`\`env
PUBLIC_WEB_ORIGIN=https://note.example.com
\`\`\`

该配置用于生成分享链接和公开知识空间地址，不要附加 /api 或页面路径。

代理配置错误时可能出现登录循环、分享链接使用内网地址、图片变成 127.0.0.1、附件 401 或实时同步断开。

官方站点当前为 [http://nowen.cn/](http://nowen.cn/)，在线体验为 [http://note.nowen.cn/](http://note.nowen.cn/)。公网自部署仍建议使用 HTTPS。`,
  },
];
