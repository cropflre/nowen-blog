import type { SeedDocument } from './seed-nowen-note-features.types';

export const featureDocumentsPart2: SeedDocument[] = [
  {
    "id": "doc_nn_feat_batch_import",
    "title": "批量管理与导入导出",
    "slug": "batch-import-export",
    "description": "多选处理笔记，并在不同格式和其他笔记产品之间迁移。",
    "contentMd": "# 批量管理与导入导出\n\n## 批量管理\n\n在笔记列表中使用 `Ctrl/Cmd` 多选，或用 `Shift` 范围选择后，可执行：\n\n- 批量移动\n- 批量移入回收站\n- AI 批量推荐标签\n- AI 批量归类\n- 其他列表级操作\n\n批量操作适合整理旧资料，但删除和覆盖类操作前应先备份。\n\n## 导出\n\n根据内容和使用场景，可导出为：\n\n- Markdown\n- PDF\n- Word\n- PNG\n- JPG\n\n笔记本也可以整体导出为 Markdown，便于离线归档和迁移。\n\n## 导入\n\n导入功能用于把外部文档迁入 Nowen Note。不同产品的富文本结构、附件路径和扩展语法不完全一致，导入后建议检查：\n\n- 标题层级\n- 表格和列表\n- 图片是否完整\n- 内部链接\n- 代码块和特殊组件\n\n对大量数据执行导入前，先用少量样例验证效果。",
    "sortOrder": 25,
    "parentId": "doc_nn_feat_knowledge"
  },
  {
    "id": "doc_nn_feat_editing",
    "title": "编辑器与内容创作",
    "slug": "editing",
    "description": "掌握富文本、Markdown、高级块、图片附件和内容导出。",
    "contentMd": "# 编辑器与内容创作\n\nNowen Note 提供两套编辑体验：\n\n- 富文本编辑器：所见即所得，适合普通用户。\n- Markdown 编辑器：基于源码写作，适合开发者和 Markdown 用户。\n\n两种模式都支持自动保存、AI 能力和常用内容块。选择哪种模式主要取决于写作习惯，而不是功能强弱。",
    "sortOrder": 30
  },
  {
    "id": "doc_nn_feat_richtext",
    "title": "富文本编辑器",
    "slug": "rich-text-editor",
    "description": "使用工具栏、快捷键和所见即所得方式编辑内容。",
    "contentMd": "# 富文本编辑器\n\n富文本编辑器基于所见即所得方式工作，输入后的排版效果就是最终阅读效果。\n\n## 常用格式\n\n- 标题、正文、加粗、斜体、删除线和高亮\n- 有序列表、无序列表和待办列表\n- 引用、链接、行内代码和代码块\n- 表格、图片、视频、数学公式和 Mermaid\n- 分割线和脚注\n\n## 常用快捷键\n\n| 快捷键 | 功能 |\n|---|---|\n| `Ctrl/Cmd + B` | 加粗 |\n| `Ctrl/Cmd + I` | 斜体 |\n| `Ctrl/Cmd + K` | 插入链接 |\n| `Ctrl/Cmd + E` | 行内代码 |\n| `Ctrl/Cmd + H` | 当前笔记搜索替换 |\n\n## 图片体验\n\n图片可以拖拽、粘贴或通过命令插入。选中图片后可缩放，桌面端支持全屏预览，移动端支持双指缩放、保存到相册和系统分享。\n\n## 适合场景\n\n- 日常笔记\n- 图文教程\n- 会议纪要\n- 产品文档\n- 不想记 Markdown 语法的用户",
    "sortOrder": 31,
    "parentId": "doc_nn_feat_editing"
  },
  {
    "id": "doc_nn_feat_markdown",
    "title": "Markdown 编辑器",
    "slug": "markdown-editor",
    "description": "使用 CodeMirror 和 Markdown 语法高效写作。",
    "contentMd": "# Markdown 编辑器\n\nMarkdown 模式适合习惯纯文本语法、代码和技术文档的用户。\n\n## 切换方式\n\n在编辑器底部状态栏切换编辑器模式。富文本和 Markdown 内容可以互通，切换前建议留意复杂表格或特殊组件的显示效果。\n\n## 支持内容\n\n- 标题、粗体、斜体和删除线\n- 列表、待办、引用和分割线\n- 行内代码和多语言代码块\n- 链接、图片和表格\n- LaTeX 数学公式\n- Mermaid 图表\n\n## Markdown 模式中的斜杠命令\n\n输入 `/` 可快速插入标题、列表、引用、代码、图片、表格和 AI 指令，减少手工输入模板。\n\n## 适合场景\n\n- 技术笔记和代码文档\n- 需要导出为 Markdown 的长期资料\n- 喜欢键盘操作的用户\n- 需要保持纯文本可迁移性的内容",
    "sortOrder": 32,
    "parentId": "doc_nn_feat_editing"
  },
  {
    "id": "doc_nn_feat_blocks",
    "title": "斜杠命令与高级内容块",
    "slug": "slash-advanced-blocks",
    "description": "快速插入表格、代码、公式、Mermaid、脚注等内容。",
    "contentMd": "# 斜杠命令与高级内容块\n\n在编辑器中输入 `/` 会打开命令菜单，用于快速插入内容块。\n\n## 常用命令\n\n| 分类 | 常见内容 |\n|---|---|\n| 结构 | 标题、列表、待办、引用、分割线 |\n| 格式 | 加粗、斜体、高亮、删除线、链接 |\n| 技术 | 代码块、行内代码、数学公式 |\n| 可视化 | Mermaid、表格、图片、视频 |\n| 辅助 | 脚注、AI 写作 |\n\n## 代码块\n\n支持 JavaScript、TypeScript、Python、Java、Go、Rust、HTML、CSS、SQL、Bash 等常见语言，并提供语法高亮、行号和复制按钮。\n\n## 表格\n\n可调整列宽、插入或删除行列、合并单元格，并设置单元格对齐方式。\n\n## 数学公式\n\n支持行内和块级 LaTeX，适合学习笔记、论文摘录和公式推导。\n\n## Mermaid\n\n可绘制流程图、时序图、类图、甘特图和状态图。语法有误时会显示错误提示，便于修改。",
    "sortOrder": 33,
    "parentId": "doc_nn_feat_editing"
  },
  {
    "id": "doc_nn_feat_attachments",
    "title": "图片、附件与文件管理",
    "slug": "attachments-files",
    "description": "上传、预览、分类、清理和存储图片与文件。",
    "contentMd": "# 图片、附件与文件管理\n\n## 上传方式\n\n在笔记中可以：\n\n- 拖入图片或文件\n- 粘贴剪贴板中的图片\n- 使用 `/图片` 命令选择文件\n- 通过附件按钮查看当前笔记的文件\n\n## 图片处理\n\n图片上传后会进入附件系统，并生成多档 WebP 缩略图，减少列表和密集图片场景的流量与加载压力。\n\n## 文件管理器\n\n左侧“文件管理”集中展示所有上传内容，并区分：\n\n- 已被笔记引用的附件\n- 尚未被引用的上传文件\n- 文件大小和上传时间\n- 图片和普通文件\n\n## 清理与健康检查\n\n未引用附件可以清理以释放空间。系统会检查引用关系，避免误删仍在使用的文件。数据管理中的附件健康检查可发现：\n\n- 数据库有记录但物理文件缺失\n- 正文引用了不存在的附件\n- 可安全清理的孤儿文件\n\n## 大容量存储\n\n附件较多时，可以配置 S3、Cloudflare R2 或 MinIO，将大文件从本地磁盘分流到对象存储。",
    "sortOrder": 34,
    "parentId": "doc_nn_feat_editing"
  },
  {
    "id": "doc_nn_feat_export",
    "title": "内容导出与阅读展示",
    "slug": "export-reading",
    "description": "将笔记导出为多种格式，并用于分享、归档和阅读。",
    "contentMd": "# 内容导出与阅读展示\n\n## 支持格式\n\nNowen Note 支持将内容导出为 Markdown、PDF、Word、PNG 和 JPG，适合不同用途：\n\n| 格式 | 适合场景 |\n|---|---|\n| Markdown | 长期归档、迁移、代码仓库和二次编辑 |\n| PDF | 正式文档、打印和固定版式分享 |\n| Word | 交给 Office 用户继续编辑 |\n| PNG/JPG | 快速分享长图或保存到相册 |\n\nAndroid 导出图片后可保存到系统相册。\n\n## 导出前检查\n\n- 图片是否全部加载完成\n- 表格是否超出页面宽度\n- Mermaid 和数学公式是否正确渲染\n- 字体是否支持当前语言\n- 分享内容是否包含隐私信息\n\n## 阅读展示\n\n笔记可以通过内部阅读、分享链接或导出文件传播。需要他人持续查看最新版时，更适合使用分享链接；需要固定版本时，更适合导出 PDF 或图片。",
    "sortOrder": 35,
    "parentId": "doc_nn_feat_editing"
  },
  {
    "id": "doc_nn_feat_tasks_life",
    "title": "任务与灵感记录",
    "slug": "tasks-life",
    "description": "使用待办、提醒、项目视图和说说管理工作与生活。",
    "contentMd": "# 任务与灵感记录\n\nNowen Note 将长内容、行动事项和碎片记录分开处理：\n\n- 笔记：适合长期内容和结构化知识。\n- 待办：适合需要完成、安排日期和提醒的事项。\n- 说说：适合短想法、日记片段和临时记录。\n\n选择正确的内容类型，可以避免所有信息都堆进笔记本。",
    "sortOrder": 40
  },
  {
    "id": "doc_nn_feat_tasks",
    "title": "待办任务中心",
    "slug": "task-center",
    "description": "创建任务、设置优先级、截止日期、描述和附件。",
    "contentMd": "# 待办任务中心\n\n点击左侧“待办”进入任务中心。\n\n## 任务信息\n\n每个任务可以包含：\n\n- 标题\n- 富文本描述\n- 图片附件\n- 高、中、低优先级\n- 截止日期和时间\n- 提醒\n- 重复规则\n- 子任务和依赖关系\n- 项目或模板信息\n\n## 常用筛选\n\n- 全部\n- 今天\n- 本周\n- 已逾期\n- 已完成\n\n## 典型场景\n\n- 每日行动清单\n- 项目任务拆解\n- 学习计划\n- 生活事务\n- 会议后续事项\n- 周期性工作\n\n任务完成后点击左侧圆圈即可标记完成，也可以恢复为未完成状态。",
    "sortOrder": 41,
    "parentId": "doc_nn_feat_tasks_life"
  }
];
