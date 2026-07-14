import type { SeedDocument } from './seed-nowen-note-features.types';

export const featureDocumentsPart4: SeedDocument[] = [
  {
    "id": "doc_nn_feat_workspace",
    "title": "工作区与成员权限",
    "slug": "workspaces-permissions",
    "description": "创建团队空间，并为成员分配不同角色。",
    "contentMd": "# 工作区与成员权限\n\n工作区是独立于个人空间的共享区域。切换工作区后，左侧文档树会显示该空间中的笔记本和笔记。\n\n## 常用操作\n\n- 创建工作区\n- 通过邀请码加入\n- 邀请或移除成员\n- 调整成员角色\n- 在个人空间和工作区之间切换\n\n## 权限角色\n\n工作区可以按角色控制成员能力，例如：\n\n- 管理员\n- 编辑\n- 评论\n- 查看\n\n实际可执行操作以当前版本的权限配置为准。\n\n## 使用建议\n\n- 私人资料保留在个人空间。\n- 团队制度、项目文档和会议记录放入工作区。\n- 离职或成员变化时及时调整权限。\n- 不要把管理员权限分配给只需要阅读的成员。\n- 重要批量操作前完成备份。",
    "sortOrder": 61,
    "parentId": "doc_nn_feat_collab"
  },
  {
    "id": "doc_nn_feat_sharing",
    "title": "分享链接、评论与访问权限",
    "slug": "sharing-comments",
    "description": "向外部用户分享内容，并控制密码、有效期和编辑能力。",
    "contentMd": "# 分享链接、评论与访问权限\n\n笔记可以创建外部分享链接，让没有系统账号的人查看或参与内容。\n\n## 常见权限\n\n- 仅查看\n- 可评论\n- 可编辑\n- 可编辑但需要登录\n\n分享还可以设置密码、有效期，并在不需要时撤销。\n\n## 评论\n\n评论适合围绕文档提出问题、补充建议和进行审核，而不必直接修改正文。\n\n## 典型场景\n\n- 向客户发送只读方案\n- 收集团队成员意见\n- 临时开放可编辑协作\n- 分享教程或公开说明\n- 让访客留言\n\n## 安全建议\n\n- 敏感文档使用密码和较短有效期。\n- 不再使用的链接及时撤销。\n- 开放编辑前确认对方身份。\n- 分享前检查正文和附件是否包含隐私信息。\n- 重要内容通过版本历史保留修改记录。",
    "sortOrder": 62,
    "parentId": "doc_nn_feat_collab"
  },
  {
    "id": "doc_nn_feat_sync",
    "title": "实时同步、离线缓存与冲突处理",
    "slug": "sync-offline",
    "description": "理解多端实时协作、离线队列和版本冲突。",
    "contentMd": "# 实时同步、离线缓存与冲突处理\n\nNowen Note 使用实时通信和本地缓存，让不同设备看到最新内容。\n\n## 正常流程\n\n- 在线编辑时，修改会自动保存并同步。\n- 断网时，部分操作会保存在本地队列。\n- 网络恢复后，客户端重新提交并拉取服务端变化。\n- 跨端删除、恢复、移动和重命名会传播到其他设备。\n\n## 离线缓存\n\n本地缓存用于提升打开速度和弱网可用性，但服务端仍是长期数据中心。清除浏览器数据前，应先确认待同步操作已经完成。\n\n## 冲突\n\n两台设备同时修改同一篇笔记时，可能出现版本冲突。新版处理入口通常允许：\n\n- 保留此设备版本\n- 使用服务器版本，并保留本地冲突副本\n\n不要通过清空同步队列、删除浏览器数据或清空历史版本强行解决冲突，这可能造成未上传内容丢失。",
    "sortOrder": 63,
    "parentId": "doc_nn_feat_collab"
  },
  {
    "id": "doc_nn_feat_mobile",
    "title": "移动端与桌面端使用体验",
    "slug": "mobile-desktop",
    "description": "了解不同设备上的导航、图片、导出和连接差异。",
    "contentMd": "# 移动端与桌面端使用体验\n\n## 桌面端优势\n\n- 三栏同时显示，适合长时间写作\n- 键盘快捷键和拖拽效率更高\n- 文件上传和批量管理更方便\n- 适合复杂表格、代码和思维导图\n\n## 移动端优势\n\n- 随时记录和查看\n- 直接上传手机图片\n- 图片全屏预览、缩放、保存和系统分享\n- 查看任务、说说和提醒\n\n## 布局差异\n\n手机端使用抽屉式菜单，通常一次显示一个主要区域。桌面端可以同时查看笔记本、列表和编辑器。\n\n## 连接建议\n\n- 先在手机浏览器确认服务地址可访问。\n- 局域网使用 NAS IP 和端口。\n- 外网优先使用 HTTPS 域名。\n- 不要在手机端填写 `localhost`。\n- 出现白屏时对比网页端和 App，帮助判断是网络还是客户端性能问题。",
    "sortOrder": 64,
    "parentId": "doc_nn_feat_collab"
  },
  {
    "id": "doc_nn_feat_data_ext",
    "title": "数据安全与扩展能力",
    "slug": "data-extensions",
    "description": "了解备份、对象存储、自动化、审计和开发者生态。",
    "contentMd": "# 数据安全与扩展能力\n\nNowen Note 可以从个人笔记应用扩展为可自动化的知识系统：\n\n- 通过备份和恢复保护数据。\n- 通过对象存储承载大量附件。\n- 通过 Webhook、插件和 API 连接其他系统。\n- 通过审计日志追踪重要操作。\n- 通过 MCP、SDK、CLI 和浏览器剪藏扩展使用方式。\n\n扩展能力越多，越需要重视密钥、权限和备份。",
    "sortOrder": 70
  },
  {
    "id": "doc_nn_feat_backup",
    "title": "备份、恢复与迁移",
    "slug": "backup-restore",
    "description": "保护数据库、附件和运行配置，并迁移到新设备。",
    "contentMd": "# 备份、恢复与迁移\n\n## 为什么必须完整备份\n\n只备份数据库会保留文字记录，但图片和附件可能无法恢复。完整备份应覆盖整个数据目录，并根据部署方式包含独立备份目录。\n\n## 可用能力\n\n- 定时自动备份\n- 手动创建备份\n- 一键恢复\n- 备份状态检查\n- 邮件推送备份\n- Docker 和 NAS 数据目录迁移\n\n## 备份建议\n\n采用 3-2-1 原则：\n\n- 至少 3 份副本\n- 使用 2 种存储介质\n- 至少 1 份在异地\n\n## 恢复验证\n\n备份完成不代表可用。应定期在测试环境恢复，并确认：\n\n- 能登录\n- 笔记数量正确\n- 图片和附件可打开\n- 工作区、任务和思维导图存在\n- 自动备份和密钥配置正常",
    "sortOrder": 71,
    "parentId": "doc_nn_feat_data_ext"
  },
  {
    "id": "doc_nn_feat_object_storage",
    "title": "S3、R2 与 MinIO 对象存储",
    "slug": "object-storage",
    "description": "把大量附件存储到对象存储，降低本地磁盘压力。",
    "contentMd": "# S3、R2 与 MinIO 对象存储\n\n默认情况下，附件保存在本地数据目录。图片和文件较多时，可以切换到兼容 S3 的对象存储。\n\n## 支持场景\n\n- Amazon S3\n- Cloudflare R2\n- MinIO\n- 其他兼容 S3 的服务\n\n## 适合使用对象存储的情况\n\n- 附件数量很大\n- NAS 本地磁盘空间有限\n- 需要独立的文件生命周期管理\n- 希望应用与附件存储分离\n- 多实例需要共享附件\n\n## 配置重点\n\n- Endpoint\n- Region\n- Bucket\n- Access Key\n- Secret Key\n- Prefix\n- 外部访问和签名策略\n\n## 注意事项\n\n对象存储不等于备份。误删、权限错误或账号问题仍会影响文件，应继续执行独立备份和恢复验证。",
    "sortOrder": 72,
    "parentId": "doc_nn_feat_data_ext"
  },
  {
    "id": "doc_nn_feat_automation",
    "title": "Webhook、插件、API、MCP、SDK 与 CLI",
    "slug": "automation-ecosystem",
    "description": "连接自动化工具、AI 客户端和第三方应用。",
    "contentMd": "# Webhook、插件、API、MCP、SDK 与 CLI\n\nNowen Note 提供多种扩展方式。\n\n## Webhook\n\n在笔记、任务或其他事件发生时通知外部系统，适合自动备份、消息提醒和工作流联动。\n\n## 插件\n\n沙箱插件用于在受控环境中扩展功能，避免插件直接拥有整个服务器权限。\n\n## REST API 与 Personal API Token\n\n第三方脚本可以通过 API 创建、查询和更新笔记、笔记本、标签和附件。长期自动化建议使用权限受限的 Personal API Token。\n\n## MCP Server\n\n让支持 MCP 的 AI 客户端读取、创建和整理 Nowen Note 内容，例如上传附件、搜索笔记和生成文档。\n\n## TypeScript SDK 与 CLI\n\n适合开发者在 Node.js、命令行脚本和自动化任务中调用。\n\n## 浏览器剪藏\n\n浏览器扩展可以把网页内容、选中文本或链接保存到知识库。\n\n所有扩展都应遵循最小权限原则，并妥善保管 Token。",
    "sortOrder": 73,
    "parentId": "doc_nn_feat_data_ext"
  },
  {
    "id": "doc_nn_feat_security",
    "title": "安全设置、用户管理与审计日志",
    "slug": "security-audit",
    "description": "管理密码、账号、注册、权限和重要操作记录。",
    "contentMd": "# 安全设置、用户管理与审计日志\n\n## 账号安全\n\n首次安装后应立即修改默认管理员密码。根据版本和部署配置，还可以使用会话管理、双重验证等安全功能。\n\n## 用户管理\n\n管理员可以：\n\n- 创建或管理用户\n- 启用或关闭公开注册\n- 禁用异常账号\n- 调整用户权限\n- 处理会话和安全设置\n\n## 审计日志\n\n审计日志用于记录重要操作，适合排查：\n\n- 谁修改或删除了内容\n- 权限何时发生变化\n- 备份和恢复是否执行\n- Token、Webhook 或插件的管理操作\n- 异常登录和系统管理行为\n\n## 部署安全建议\n\n- 使用 HTTPS。\n- 管理后台不要直接暴露在不可信网络。\n- 使用强密码和最小权限。\n- 定期检查审计记录和异常账号。\n- 不在日志、截图或公开文档中泄露 Token、Cookie 和密钥。",
    "sortOrder": 74,
    "parentId": "doc_nn_feat_data_ext"
  }
];
