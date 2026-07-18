import type { SeedDocument } from './seed-nowen-note-features.types';

/**
 * Current documentation replacements for deterministic seed documents.
 *
 * The base files keep the original two-level catalog stable. This layer updates
 * selected articles when Nowen Note gains major capabilities, without changing
 * document IDs or public paths.
 */
export const featureDocumentUpdates: SeedDocument[] = [
  {
    id: 'doc_nn_feat_clients',
    title: 'Web、桌面端与移动客户端',
    slug: 'clients',
    description: '了解 Web、Electron、Android、iOS 和 HarmonyOS 的状态与适用场景。',
    sortOrder: 14,
    parentId: 'doc_nn_feat_overview',
    contentMd: `# Web、桌面端与移动客户端

Nowen Note 的服务端可以被不同客户端访问。安装包和平台支持范围以 GitHub Releases 为准。

## 官方入口

- 官方网站：[http://nowen.cn/](http://nowen.cn/)
- 在线体验：[http://note.nowen.cn/](http://note.nowen.cn/)
- 客户端下载：[GitHub Releases](https://github.com/cropflre/nowen-note/releases)

## Web

浏览器直接打开服务器地址，适合快速访问、管理设置和排查网络问题。管理员也可以关闭 Web UI，只保留 API 服务。

## Windows、macOS 与 Linux

Electron 桌面端适合长时间写作、键盘操作和本地文件处理。它可以连接远程服务器，也可以使用桌面端自带的本地后端。

未经过 Apple 公证的 macOS 安装包首次打开时，可能需要移除 quarantine 隔离属性。

## Android

Android 是当前维护最完整的移动端，支持连接局域网或公网服务器、上传手机图片、保存导出图片到相册，以及移动端图片预览和分享。

手机连接 NAS 时不能填写 \`localhost\` 或 \`127.0.0.1\`，应使用 NAS 的局域网 IP 或可访问域名。

## iOS

iOS 使用 Capacitor 工程，通过 GitHub Actions、签名和 TestFlight 构建分发。需要 Apple Developer 账号，实际可下载版本以 Releases 或 TestFlight 发布状态为准。

## HarmonyOS

HarmonyOS 客户端采用 ArkTS + ArkWeb，已经具备服务器配置、页面加载、返回键和基础桥接能力。文件选择、系统主题、分享和推送等原生能力仍在逐步完善。

## 排查建议

客户端连接失败时，先在同一设备的浏览器中打开相同服务器地址。如果浏览器也无法访问，优先检查网络、反向代理和服务端；如果浏览器正常，再检查客户端地址、缓存和版本。`,
  },
  {
    id: 'doc_nn_feat_knowledge',
    title: '笔记与知识管理',
    slug: 'knowledge',
    description: '使用笔记本、标签、搜索、双向链接、块引用和知识图谱组织长期知识。',
    sortOrder: 20,
    contentMd: `# 笔记与知识管理

Nowen Note 以“笔记本树 + 笔记 + 标签”为基础，并通过链接关系补充知识网络。

## 层级组织

- 笔记本负责主要分类。
- 子笔记本负责继续细分。
- 标签负责跨笔记本的主题分类。
- 收藏和置顶负责快速访问。
- 全文搜索负责跨目录查找。
- 回收站和版本历史降低误操作风险。

## 链接型知识组织

近期版本支持：

- 笔记双向链接
- 反向链接面板
- 通用块链接和块引用
- 在其他笔记中嵌入指定内容块
- 知识图谱浏览关联关系
- MCP 按笔记本范围检索知识

层级目录适合稳定分类，双向链接适合表达“这篇内容与哪些内容有关”。两种方式可以同时使用，不需要为了建立关联而复制笔记。

## 建议

1. 一级笔记本保持稳定，不要过度细分。
2. 用标签表达跨项目主题。
3. 用双向链接连接概念、人物、项目和结论。
4. 长笔记中的重要段落可以用块链接引用。
5. 定期处理失效链接、重复内容和过期方案。`,
  },
  {
    id: 'doc_nn_feat_batch_import',
    title: '批量管理与导入导出',
    slug: 'batch-import-export',
    description: '批量整理笔记，并从 DOCX、Obsidian、微信收藏等来源迁移数据。',
    sortOrder: 25,
    parentId: 'doc_nn_feat_knowledge',
    contentMd: `# 批量管理与导入导出

## 批量管理

在笔记列表中使用 \`Ctrl/Cmd\` 多选，或使用 \`Shift\` 范围选择后，可以批量移动、删除、推荐标签和归类。

覆盖、删除或大批量迁移前，应先创建完整备份。

## 当前导入入口

| 来源 | 处理重点 |
|---|---|
| Markdown 文件或目录 | 标题、正文、相对路径和附件 |
| Word / DOCX | 在 Worker 中解析，显示进度，可取消、重试并校验持久化结果 |
| Obsidian Vault | 扫描目录或 ZIP，导入 Markdown 和附件，并重写内部附件链接 |
| 微信收藏导出包 | 流式读取导出包，保留来源映射并导入可识别内容 |
| 其他笔记产品 | 根据导出格式进入迁移中心，导入后人工复查 |

导入任务可能涉及大量文件。建议先使用少量样例验证，再处理完整数据集。

## 导入后检查

- 标题和目录层级
- 表格、列表和代码块
- 图片与附件是否完整
- Obsidian 或 Markdown 内部链接
- 自定义图标和来源信息
- 重复笔记和失败任务

## 导出

支持 Markdown、PDF、Word、PNG 和 JPG。单篇 Markdown 导出会尽量保留原生 Markdown；笔记本导出会携带可访问的附件资源。

需要持续查看最新内容时使用分享或公开知识空间；需要固定快照时使用 PDF、图片或完整备份。`,
  },
  {
    id: 'doc_nn_feat_markdown',
    title: 'Markdown 编辑器',
    slug: 'markdown-editor',
    description: '使用 CodeMirror、实时预览、分屏同步和增强代码块高效写作。',
    sortOrder: 32,
    parentId: 'doc_nn_feat_editing',
    contentMd: `# Markdown 编辑器

Markdown 模式基于 CodeMirror，适合技术文档、代码笔记和希望保留纯文本可迁移性的用户。

## 三种阅读与编辑方式

- 纯编辑：集中编写 Markdown 源码。
- 实时预览：当前块在编辑时保持源码状态，其他内容以阅读效果展示。
- 分屏：左侧编辑、右侧预览，并根据内容映射同步滚动。

## 支持内容

- 标题、粗体、斜体、删除线和高亮
- 列表、待办、引用和分割线
- 链接、图片、附件和表格
- 行内代码和多语言代码块
- KaTeX 数学公式
- Mermaid 图表
- 脚注和常用 GFM 语法

## 增强代码块

代码块支持语言选择、语法高亮、复制、行号和自动换行。只读笔记和分享页面会禁止修改代码块结构。

## 图片与附件

Markdown 中的本地附件会通过鉴权地址加载。协议相对图片、远程图片和附件图片会经过不同的 URL 处理规则，避免预览时错误改写。

## 导出

单篇 Markdown 导出会优先保留原生 Markdown，而不是把内容先转成富文本再反向转换。导出后仍建议检查自定义块、附件路径和扩展语法。`,
  },
  {
    id: 'doc_nn_feat_attachments',
    title: '图片、附件与文件管理',
    slug: 'attachments-files',
    description: '管理本地附件、对象存储、第三方图床、签名访问和孤儿清理。',
    sortOrder: 34,
    parentId: 'doc_nn_feat_editing',
    contentMd: `# 图片、附件与文件管理

## 上传和引用

图片或文件可以通过拖拽、粘贴、斜杠命令和文件选择器添加。编辑器、待办和其他模块共用附件目录，但通过数据库关系区分归属。

新附件默认按 \`YYYY/MM\` 存储，历史平铺路径仍可读取。

## 缩略图和文件管理

系统会为图片生成多档 WebP 缩略图，并在“文件管理”中区分已引用、未引用、图片和普通文件。

附件健康检查可以发现：

- 数据库记录存在但物理文件缺失
- 正文引用了不存在的文件
- 可以安全清理的孤儿附件
- 任务附件等特殊引用是否被正确识别

## 对象存储

可接入 S3、Cloudflare R2、MinIO 和其他兼容 S3 的服务。迁移前先执行 dry-run，再执行正式迁移并抽查文件。

## 第三方图床

图床配置可以用于编辑器粘贴、拖拽和插入图片。生产环境应配置独立的 \`IMAGE_HOSTING_ENCRYPTION_KEY\` 加密图床凭证，不建议长期复用认证签名密钥。

## 附件访问安全

公网部署可以使用附件签名 URL，并关闭旧版无签名公开附件地址。分享、公开知识空间、Markdown 预览和导出流程会按访问上下文校验附件权限。

对象存储和图床都不等于备份。仍需保留独立的数据与附件备份。`,
  },
  {
    id: 'doc_nn_feat_rag',
    title: 'AI 知识库问答',
    slug: 'ai-knowledge-qa',
    description: '配置 Embedding，按笔记本范围检索内容并进行 RAG 知识问答。',
    sortOrder: 53,
    parentId: 'doc_nn_feat_ai_visual',
    contentMd: `# AI 知识库问答

AI 问答会先检索相关笔记或内容块，再把检索结果交给模型生成回答。

## 配置

AI 和 Embedding 设置按用户保存。每个用户可以使用自己的服务商、API Key、模型和向量配置，避免多人共用敏感凭证。

管理员可以配置 OpenAI-compatible、通义千问、DeepSeek、豆包、Gemini 或 Ollama 等模型来源。

## 检索范围

- 全部可访问笔记
- 指定工作区
- 指定笔记本
- API Token 或 MCP 被授权的笔记本资源
- 通用块链接对应的内容块

Personal API Token 可以限制到指定笔记本，MCP 和知识问答会继承资源范围，不能越权读取其他内容。

## 适合的问题

- “我记录的部署步骤是什么？”
- “总结项目最近几次会议结论。”
- “哪些笔记提到了附件存储？”
- “根据学习笔记生成复习提纲。”

## 提高结果质量

1. 使用清晰标题、标签和笔记本结构。
2. 标记过期方案，避免新旧内容混合。
3. 检查 Embedding 配置和索引状态。
4. 让问题包含明确项目、时间或范围。
5. 打开原始笔记核对关键结论。

RAG 是检索和整理工具，不应被当作唯一事实来源。`,
  },
  {
    id: 'doc_nn_feat_sharing',
    title: '分享、公开知识空间与目录权限',
    slug: 'sharing-comments',
    description: '分享笔记或发布整个笔记本，并控制目录继承、评论和管理权限。',
    sortOrder: 62,
    parentId: 'doc_nn_feat_collab',
    contentMd: `# 分享、公开知识空间与目录权限

## 单篇笔记分享

分享链接可以设置：

- 仅查看
- 可评论
- 可编辑
- 可编辑但需要登录
- 密码
- 有效期
- 随时撤销

访客评论和留言会保留来源信息，管理员可以在分享管理中统一查看和处理。

## 笔记本公开发布

笔记本可以发布为公开知识空间，向访问者展示目录树和文章页面。登录用户也可以从工作区入口查看已发布空间。

公开链接依赖正确的 \`PUBLIC_WEB_ORIGIN\`。反向代理或公网部署时，应配置实际可访问的 HTTP/HTTPS Origin，避免生成内网地址或错误端口。

## 目录权限

公开知识空间支持目录级权限，并沿目录树继承：

- 查看
- 评论
- 管理

子目录可以覆盖父级权限。附件访问也会继承发布空间和目录授权，未授权用户不能通过附件地址绕过页面权限。

## 安全建议

- 敏感内容使用密码、登录限制和较短有效期。
- 不再使用的分享链接及时撤销。
- 发布笔记本前检查目录和附件。
- 权限变更后使用访客窗口重新验证。
- 保留版本历史和完整备份。`,
  },
  {
    id: 'doc_nn_feat_backup',
    title: '备份、在线升级、恢复与迁移',
    slug: 'backup-restore',
    description: '保护数据库和附件，并安全执行 Docker 在线升级、回滚与设备迁移。',
    sortOrder: 71,
    parentId: 'doc_nn_feat_data_ext',
    contentMd: `# 备份、在线升级、恢复与迁移

## 完整备份

只备份数据库会丢失图片和附件。完整备份应覆盖数据库、附件、配置和必要密钥。

自动备份默认位于数据卷内。生产环境建议把 \`BACKUP_DIR\` 映射到独立物理磁盘，并执行恢复演练。

## Docker 在线升级

在线升级只支持官方 \`docker-compose.yml\` 受管部署，并且默认关闭。

安全架构：

- 主应用容器永远不挂载 Docker Socket。
- 只有内部网络中的独立 updater 容器拥有受限 Docker Engine 权限。
- updater 只允许管理带指定标签的 Nowen Note 容器。
- 目标镜像仓库固定为 \`cropflre/nowen-note\`。

升级流程会执行版本和架构检查、磁盘检查、镜像拉取、完整备份、容器替换、健康检查和稳定观察。

## 回滚边界

自动回滚可以恢复旧镜像容器，但镜像回滚不等于数据库回滚。若新版本执行了不可逆数据库迁移，需要管理员使用升级前完整备份进行人工数据恢复。

## 迁移设备

1. 停止写入或进入维护窗口。
2. 创建完整备份并验证校验值。
3. 复制数据目录和独立备份目录。
4. 在新设备使用相同或更高版本启动。
5. 验证登录、笔记、附件、任务、工作区和分享。
6. 保留旧设备，直到新环境稳定运行。

遵循 3-2-1 原则：至少 3 份副本、2 种介质、1 份异地。`,
  },
  {
    id: 'doc_nn_feat_automation',
    title: 'Webhook、插件、API、MCP、SDK 与 CLI',
    slug: 'automation-ecosystem',
    description: '使用最小权限 Token、笔记本资源范围和块工具连接外部系统。',
    sortOrder: 73,
    parentId: 'doc_nn_feat_data_ext',
    contentMd: `# Webhook、插件、API、MCP、SDK 与 CLI

Nowen Note 提供多种扩展入口，用于自动化、AI 客户端和第三方应用。

## Personal API Token

Token 可以限制接口 scope，并进一步限制到指定笔记本资源。空 scope 默认不代表完整权限，旧数据兼容行为需要显式开启。

长期自动化应创建专用 Token，不要复用管理员登录凭证。

## REST API、SDK 与 CLI

- OpenAPI：服务启动后访问 \`/api/openapi.json\`。
- TypeScript SDK：适合 Node.js 和 TypeScript 应用。
- CLI：适合命令行管理笔记、笔记本、搜索和附件。
- 附件 API：支持二进制上传、下载和查询。

## MCP Server

支持 MCP 的 AI 客户端可以搜索、创建和整理内容。MCP 会继承 Token scope 和笔记本资源授权，并支持知识问答、附件和通用块工具。

## Webhook 与插件

Webhook 用于把事件通知外部系统。沙箱插件在受控环境中扩展能力，不能直接获得整个服务器权限。

## 浏览器剪藏

Chrome / Edge 扩展可以把网页、选中文本和链接保存到指定笔记本。

## 安全原则

- 使用最小权限和独立 Token。
- 为 Token 设置明确的笔记本资源范围。
- 不在代码仓库、截图和日志中泄露密钥。
- 定期撤销不再使用的 Token、Webhook 和插件授权。
- 对自动创建、移动和删除操作保留审计记录与备份。`,
  },
];
