# nowen-blog — Personal Blog & Project Portfolio

[English](#english) | [中文](#chinese)

---

<a name="english"></a>

## English

A modern, sci-fi aesthetic personal website built with **Go** backend and **React** frontend.

### ✨ Features

- **Particle field background** — interactive canvas particles with mouse repulsion
- **Mouse-tracking glow cards** — spotlight effect follows cursor on project cards
- **Spring physics animations** — Framer Motion spring-based hover and page transitions
- **Typewriter effect** — hero section with rotating role titles
- **Bento Grid layout** — project dashboard with featured card spanning
- **Tag filtering** — blog posts filterable by technology tags
- **Responsive design** — mobile-first with animated hamburger menu
- **Dark/Light theme** — glass morphism, particle effects, and theme switching
- **Markdown rendering** — server-side rendering with syntax highlighting
- **Image upload** — drag & drop, paste support with auto Markdown insertion
- **Command palette** — global Cmd+K search across blog and docs
- **3D card effects** — Vercel-style rotation and glare effects
- **Ambient glow** — mouse-tracking ambient light effect
- **Internationalization (i18n)** — English and Chinese language support
- **Admin dashboard** — content management with article editor
- **User authentication** — JWT-based login with protected routes

### 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion |
| **Backend** | Go (Fiber), GORM, SQLite |
| **Authentication** | JWT with bcrypt password hashing |
| **Markdown** | Goldmark with GFM, syntax highlighting (Monokai theme) |
| **i18n** | react-i18next with browser language detection |
| **Design** | Dark/Light theme, glass morphism, spring physics animations |

### 🚀 Quick Start

#### Prerequisites

- Go 1.21+
- Node.js 18+
- npm or yarn

#### One-command start (recommended)

`ash
./start.sh frontend   # Start React dev server
./start.sh backend    # Start Go API server
./start.sh all        # Start both
`

#### Manual start

##### Backend (Go)

`ash
cd go-backend
go run .
# Server starts on http://localhost:8080
`

##### Frontend (React)

`ash
cd react-frontend
npm install
npm run dev
# Opens http://localhost:5173 (proxies /api to Go backend)
`

### 📁 Project Structure

`
nowen-blog/
├── go-backend/
│   ├── main.go              # API server entry point
│   ├── models.go            # Database models (User, Post, Content, Image)
│   ├── handlers.go          # API handlers
│   ├── markdown.go          # Markdown renderer with syntax highlighting
│   ├── upload.go            # Image upload handler
│   ├── jwt.go               # JWT authentication
│   └── middleware.go        # CORS and auth middleware
├── react-frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ParticleField.tsx    # Canvas particle background
│   │   │   ├── Navbar.tsx           # Navigation with spring indicator
│   │   │   ├── HeroRefactor.tsx     # Hero with typewriter & glow orbs
│   │   │   ├── FeaturedPosts.tsx    # Blog card grid with 3D effects
│   │   │   ├── FeaturedProjects.tsx # Project card grid
│   │   │   ├── CommandPalette.tsx   # Global Cmd+K search
│   │   │   ├── AmbientGlow.tsx      # Mouse-tracking ambient light
│   │   │   ├── MagneticElement.tsx  # Magnetic attraction HOC
│   │   │   ├── CyberToast.tsx       # Cyberpunk toast notifications
│   │   │   ├── Card3D.tsx           # 3D rotation card effects
│   │   │   ├── ImageUploader.tsx    # Drag & drop image upload
│   │   │   ├── TerminalBlock.tsx    # Geek-style code blocks
│   │   │   ├── Footer.tsx           # Site footer
│   │   │   ├── SectionDivider.tsx   # Animated section dividers
│   │   │   └── ProtectedRoute.tsx   # Auth route protection
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx       # Authentication state management
│   │   │   └── ThemeContext.tsx      # Theme switching context
│   │   ├── i18n/
│   │   │   ├── i18n.ts              # i18next configuration
│   │   │   └── locales/
│   │   │       ├── en.json          # English translations
│   │   │       └── zh.json          # Chinese translations
│   │   ├── pages/
│   │   │   ├── HomePage.tsx         # Landing page
│   │   │   ├── BlogPage.tsx         # Blog listing with filters
│   │   │   ├── ArticleDetail.tsx    # Immersive article reading
│   │   │   ├── ProjectDocs.tsx      # Documentation with sidebar
│   │   │   ├── ProjectsPage.tsx     # Bento grid project dashboard
│   │   │   ├── LoginPage.tsx        # User login page
│   │   │   ├── AdminPage.tsx        # Admin dashboard
│   │   │   └── Dashboard.tsx        # Content management dashboard
│   │   ├── utils/
│   │   │   └── cn.ts                # Class name utility (clsx + tailwind-merge)
│   │   ├── api.ts                   # API client
│   │   ├── types.ts                 # TypeScript interfaces
│   │   └── index.css                # Global styles & design system
│   └── index.html
├── start.sh                 # Quick start script
└── README.md
`

### 📡 API Endpoints

#### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/site | Site info & bio |
| GET | /api/posts | Blog posts (optional: ?tag=, ?limit=) |
| GET | /api/posts/:slug | Single post by slug |
| GET | /api/search?q= | Global search across blog and docs |
| GET | /api/contents?type=blog\|doc | Unified content system |
| GET | /api/contents/:slug | Content by slug |
| GET | /api/docs/:project/tree | Documentation tree structure |
| GET | /api/projects/list | Project listing |

#### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login and get JWT token |

#### Admin Endpoints (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/posts | List all posts |
| POST | /api/admin/posts | Create new post |
| PUT | /api/admin/posts/:id | Update post |
| DELETE | /api/admin/posts/:id | Delete post |
| POST | /api/admin/upload | Upload image |
| GET | /api/admin/images | List uploaded images |
| DELETE | /api/admin/images/:id | Delete image |
| PUT | /api/admin/site | Update site info |
| PUT | /api/admin/password | Update password |

### 🎨 Design System

- **Background**: #050508 (near black) for dark, #f8fafc for light
- **Accent**: Indigo #6366f1 → Cyan #22d3ee gradient
- **Cards**: Glass morphism with ackdrop-blur-xl
- **Animations**: Spring physics (stiffness: 300, damping: 20)
- **Fonts**: Inter (body) + JetBrains Mono (code/tags)

### 🌍 Internationalization

The app supports multiple languages via eact-i18next:
- English (en)
- 中文 (zh)

Language is auto-detected from browser settings and can be switched manually.

### 🔧 Environment Variables

Create a .env file in the go-backend directory:

`nv
PORT=8080
JWT_SECRET=your-secret-key
`

### 📦 Deployment

#### Using CloudStudio

This project supports deployment via CloudStudio. See [CloudStudioRules](CloudStudioRules) for detailed instructions.

#### Manual Deployment

1. Build the frontend:
   `ash
   cd react-frontend
   npm run build
   `

2. Build the backend:
   `ash
   cd go-backend
   go build -o server .
   `

3. Run the server:
   `ash
   ./server
   `

### 🤝 Contributing

1. Fork the repository
2. Create your feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add some amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🙏 Acknowledgments

- [Fiber](https://gofiber.io/) - Go Web Framework
- [GORM](https://gorm.io/) - Go ORM Library
- [React](https://react.dev/) - Frontend Library
- [Framer Motion](https://www.framer.com/motion/) - Animation Library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS Framework
- [Vite](https://vitejs.dev/) - Build Tool
- [react-i18next](https://react.i18next.com/) - Internationalization Framework

---

<a name="chinese"></a>

## 中文

一个具有现代科幻美学的个人网站，使用 **Go** 后端和 **React** 前端构建。

### ✨ 功能特性

- **粒子背景** — 交互式 Canvas 粒子，支持鼠标排斥效果
- **鼠标追踪光晕卡片** — 聚光灯效果跟随光标
- **弹簧物理动画** — 基于 Framer Motion 弹簧的悬停和页面过渡动画
- **打字机效果** — 英雄区域带有轮播角色标题
- **Bento Grid 布局** — 项目仪表板，特色卡片跨列显示
- **标签过滤** — 博客文章可按技术标签筛选
- **响应式设计** — 移动端优先，带动画汉堡菜单
- **深色/浅色主题** — 毛玻璃效果、粒子效果和主题切换
- **Markdown 渲染** — 服务端渲染，支持语法高亮
- **图片上传** — 拖放、粘贴支持，自动插入 Markdown
- **命令面板** — 全局 Cmd+K 搜索博客和文档
- **3D 卡片效果** — Vercel 风格的旋转和眩光效果
- **环境光效** — 鼠标追踪环境光效果
- **国际化 (i18n)** — 支持英文和中文
- **管理后台** — 内容管理与文章编辑器
- **用户认证** — JWT 登录与路由保护

### 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion |
| **后端** | Go (Fiber), GORM, SQLite |
| **认证** | JWT + bcrypt 密码哈希 |
| **Markdown** | Goldmark + GFM，语法高亮（Monokai 主题） |
| **国际化** | react-i18next + 浏览器语言检测 |
| **设计** | 深色/浅色主题、毛玻璃效果、弹簧物理动画 |

### 🚀 快速开始

#### 环境要求

- Go 1.21+
- Node.js 18+
- npm 或 yarn

#### 一键启动（推荐）

`ash
./start.sh frontend   # 启动 React 开发服务器
./start.sh backend    # 启动 Go API 服务器
./start.sh all        # 同时启动两者
`

#### 手动启动

##### 后端 (Go)

`ash
cd go-backend
go run .
# 服务器启动在 http://localhost:8080
`

##### 前端 (React)

`ash
cd react-frontend
npm install
npm run dev
# 打开 http://localhost:5173（/api 代理到 Go 后端）
`

### 📁 项目结构

`
nowen-blog/
├── go-backend/
│   ├── main.go              # API 服务器入口
│   ├── models.go            # 数据库模型（User, Post, Content, Image）
│   ├── handlers.go          # API 处理器
│   ├── markdown.go          # Markdown 渲染器，支持语法高亮
│   ├── upload.go            # 图片上传处理器
│   ├── jwt.go               # JWT 认证
│   └── middleware.go        # CORS 和认证中间件
├── react-frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ParticleField.tsx    # Canvas 粒子背景
│   │   │   ├── Navbar.tsx           # 导航栏，带弹簧指示器
│   │   │   ├── HeroRefactor.tsx     # 英雄区域，打字机和光晕球
│   │   │   ├── FeaturedPosts.tsx    # 博客卡片网格，带 3D 效果
│   │   │   ├── FeaturedProjects.tsx # 项目卡片网格
│   │   │   ├── CommandPalette.tsx   # 全局 Cmd+K 搜索
│   │   │   ├── AmbientGlow.tsx      # 鼠标追踪环境光
│   │   │   ├── MagneticElement.tsx  # 磁性吸引高阶组件
│   │   │   ├── CyberToast.tsx       # 赛博朋克风格通知
│   │   │   ├── Card3D.tsx           # 3D 旋转卡片效果
│   │   │   ├── ImageUploader.tsx    # 拖放图片上传
│   │   │   ├── TerminalBlock.tsx    # 极客风格代码块
│   │   │   ├── Footer.tsx           # 页脚组件
│   │   │   ├── SectionDivider.tsx   # 动画分隔线
│   │   │   └── ProtectedRoute.tsx   # 认证路由保护
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx       # 认证状态管理
│   │   │   └── ThemeContext.tsx      # 主题切换上下文
│   │   ├── i18n/
│   │   │   ├── i18n.ts              # i18next 配置
│   │   │   └── locales/
│   │   │       ├── en.json          # 英文翻译
│   │   │       └── zh.json          # 中文翻译
│   │   ├── pages/
│   │   │   ├── HomePage.tsx         # 首页
│   │   │   ├── BlogPage.tsx         # 博客列表，带过滤功能
│   │   │   ├── ArticleDetail.tsx    # 沉浸式文章阅读
│   │   │   ├── ProjectDocs.tsx      # 文档页面，带侧边栏
│   │   │   ├── ProjectsPage.tsx     # Bento Grid 项目仪表板
│   │   │   ├── LoginPage.tsx        # 用户登录页面
│   │   │   ├── AdminPage.tsx        # 管理后台
│   │   │   └── Dashboard.tsx        # 内容管理仪表板
│   │   ├── utils/
│   │   │   └── cn.ts                # 类名工具（clsx + tailwind-merge）
│   │   ├── api.ts                   # API 客户端
│   │   ├── types.ts                 # TypeScript 接口定义
│   │   └── index.css                # 全局样式和设计系统
│   └── index.html
├── start.sh                 # 快速启动脚本
└── README.md
`

### 📡 API 端点

#### 公开端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/site | 站点信息和简介 |
| GET | /api/posts | 博客文章（可选：?tag=、?limit=） |
| GET | /api/posts/:slug | 按 slug 获取单篇文章 |
| GET | /api/search?q= | 全局搜索博客和文档 |
| GET | /api/contents?type=blog\|doc | 统一内容系统 |
| GET | /api/contents/:slug | 按 slug 获取内容 |
| GET | /api/docs/:project/tree | 文档目录树结构 |
| GET | /api/projects/list | 项目列表 |

#### 认证端点

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | /api/auth/register | 注册新用户 |
| POST | /api/auth/login | 登录获取 JWT 令牌 |

#### 管理端点（需要认证）

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /api/admin/posts | 获取所有文章 |
| POST | /api/admin/posts | 创建新文章 |
| PUT | /api/admin/posts/:id | 更新文章 |
| DELETE | /api/admin/posts/:id | 删除文章 |
| POST | /api/admin/upload | 上传图片 |
| GET | /api/admin/images | 获取已上传图片列表 |
| DELETE | /api/admin/images/:id | 删除图片 |
| PUT | /api/admin/site | 更新站点信息 |
| PUT | /api/admin/password | 更新密码 |

### 🎨 设计系统

- **背景色**：深色 #050508（近黑色），浅色 #f8fafc
- **强调色**：靛蓝 #6366f1 → 青色 #22d3ee 渐变
- **卡片**：毛玻璃效果，ackdrop-blur-xl
- **动画**：弹簧物理（stiffness: 300, damping: 20）
- **字体**：Inter（正文）+ JetBrains Mono（代码/标签）

### 🌍 国际化

应用通过 eact-i18next 支持多语言：
- English (en)
- 中文 (zh)

语言会根据浏览器设置自动检测，也可手动切换。

### 🔧 环境变量

在 go-backend 目录下创建 .env 文件：

`nv
PORT=8080
JWT_SECRET=你的密钥
`

### 📦 部署

#### 使用 CloudStudio

本项目支持通过 CloudStudio 部署。详见 [CloudStudioRules](CloudStudioRules) 了解详细说明。

#### 手动部署

1. 构建前端：
   `ash
   cd react-frontend
   npm run build
   `

2. 构建后端：
   `ash
   cd go-backend
   go build -o server .
   `

3. 运行服务器：
   `ash
   ./server
   `

### 🤝 贡献指南

1. Fork 本仓库
2. 创建你的功能分支（git checkout -b feature/amazing-feature）
3. 提交你的更改（git commit -m '添加一些很棒的功能'）
4. 推送到分支（git push origin feature/amazing-feature）
5. 打开一个 Pull Request

### 📄 许可证

本项目基于 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

### 🙏 致谢

- [Fiber](https://gofiber.io/) - Go Web 框架
- [GORM](https://gorm.io/) - Go ORM 库
- [React](https://react.dev/) - 前端库
- [Framer Motion](https://www.framer.com/motion/) - 动画库
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Vite](https://vitejs.dev/) - 构建工具
- [react-i18next](https://react.i18next.com/) - 国际化框架
