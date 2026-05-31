# nowen-blog

个人博客 & 项目展示，Go 后端 + React 前端。

## 功能

- 博客文章（Markdown 渲染、标签筛选）
- 项目展示（Bento Grid 布局）
- 文档系统（目录树、侧边栏导航）
- 全局搜索（Cmd+K）
- 国际化（中文/英文）
- 深色/浅色主题
- 管理后台（文章编辑、图片上传）

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| 后端 | Go (Fiber), GORM, SQLite |
| 认证 | JWT |

## 快速启动

`ash
# 启动后端
cd go-backend && go run .

# 启动前端
cd react-frontend && npm install && npm run dev
`

或使用一键脚本：

`ash
./start.sh all
`

## 环境变量

在 go-backend/.env 中配置：

`nv
PORT=8080
JWT_SECRET=your-secret
`

## 项目结构

`
├── go-backend/          # Go API 服务
└── react-frontend/      # React 前端
    └── src/
        ├── components/  # UI 组件
        ├── contexts/    # 状态管理
        ├── i18n/        # 国际化
        ├── pages/       # 页面
        └── utils/       # 工具函数
`

## License

MIT
