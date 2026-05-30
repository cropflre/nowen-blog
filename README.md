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
- **Dark theme** — glass morphism, particle effects, and geek aesthetic
- **Markdown rendering** — server-side rendering with syntax highlighting
- **Image upload** — drag & drop, paste support with auto Markdown insertion
- **Command palette** — global Cmd+K search across blog and docs
- **3D card effects** — Vercel-style rotation and glare effects
- **Ambient glow** — mouse-tracking ambient light effect

### 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion |
| **Backend** | Go (Fiber), GORM, SQLite |
| **Authentication** | JWT with bcrypt password hashing |
| **Markdown** | Goldmark with GFM, syntax highlighting (Monokai theme) |
| **Design** | Dark theme, glass morphism, spring physics animations |

### 🚀 Quick Start

#### Prerequisites

- Go 1.21+
- Node.js 18+
- npm or yarn

#### One-command start (recommended)

```bash
./start.sh frontend   # Start React dev server
./start.sh backend    # Start Go API server
./start.sh all        # Start both
```

#### Manual start

##### Backend (Go)

```bash
cd go-backend
go run .
# Server starts on http://localhost:8080
```

##### Frontend (React)

```bash
cd react-frontend
npm install
npm run dev
# Opens http://localhost:5173 (proxies /api to Go backend)
```

### 📁 Project Structure

```
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
│   │   │   ├── Hero.tsx             # Hero with typewriter & glow orbs
│   │   │   ├── FeaturedPosts.tsx    # Blog card grid with 3D effects
│   │   │   ├── FeaturedProjects.tsx # Project card grid
│   │   │   ├── CommandPalette.tsx   # Global Cmd+K search
│   │   │   ├── AmbientGlow.tsx      # Mouse-tracking ambient light
│   │   │   ├── MagneticElement.tsx  # Magnetic attraction HOC
│   │   │   ├── CyberToast.tsx       # Cyberpunk toast notifications
│   │   │   ├── Card3D.tsx           # 3D rotation card effects
│   │   │   ├── ImageUploader.tsx    # Drag & drop image upload
│   │   │   └── TerminalBlock.tsx    # Geek-style code blocks
│   │   ├── pages/
│   │   │   ├── HomePage.tsx         # Landing page
│   │   │   ├── BlogPage.tsx         # Blog listing with filters
│   │   │   ├── ArticleDetail.tsx    # Immersive article reading
│   │   │   ├── ProjectDocs.tsx      # Documentation with sidebar
│   │   │   └── ProjectsPage.tsx     # Bento grid project dashboard
│   │   ├── api.ts                   # API client
│   │   ├── types.ts                 # TypeScript interfaces
│   │   └── index.css                # Global styles & design system
│   └── index.html
├── start.sh                 # Quick start script
└── README.md
```

### 📡 API Endpoints

#### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/site` | Site info & bio |
| GET | `/api/posts` | Blog posts (optional: `?tag=`, `?limit=`) |
| GET | `/api/posts/:slug` | Single post by slug |
| GET | `/api/search?q=` | Global search across blog and docs |
| GET | `/api/contents?type=blog\|doc` | Unified content system |
| GET | `/api/contents/:slug` | Content by slug |
| GET | `/api/docs/:project/tree` | Document tree structure |
| GET | `/api/projects/list` | Projects list |

#### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT token |

#### Admin Endpoints (requires authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/posts` | List all posts |
| POST | `/api/admin/posts` | Create new post |
| PUT | `/api/admin/posts/:id` | Update post |
| DELETE | `/api/admin/posts/:id` | Delete post |
| POST | `/api/admin/upload` | Upload image |
| GET | `/api/admin/images` | List uploaded images |
| DELETE | `/api/admin/images/:id` | Delete image |
| PUT | `/api/admin/site` | Update site info |
| PUT | `/api/admin/password` | Update password |

### 🎨 Design System

- **Background**: `#050508` (near-black)
- **Accent**: Indigo `#6366f1` → Cyan `#22d3ee` gradient
- **Cards**: Glass morphism with `backdrop-blur-xl`
- **Animations**: Spring physics (`stiffness: 300, damping: 20`)
- **Font**: Inter (body) + JetBrains Mono (code/labels)

### 🔧 Environment Variables

Create a `.env` file in the `go-backend` directory:

```env
PORT=8080
JWT_SECRET=your-secret-key-here
```

### 📦 Deployment

#### Using CloudStudio

This project supports deployment via CloudStudio. See [CloudStudioRules](CloudStudioRules) for detailed instructions.

#### Manual Deployment

1. Build the frontend:
   ```bash
   cd react-frontend
   npm run build
   ```

2. Build the backend:
   ```bash
   cd go-backend
   go build -o server .
   ```

3. Run the server:
   ```bash
   ./server
   ```

### 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🙏 Acknowledgments

- [Fiber](https://gofiber.io/) - Go web framework
- [GORM](https://gorm.io/) - ORM library for Go
- [React](https://react.dev/) - Frontend library
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Vite](https://vitejs.dev/) - Build tool

---

<a name="chinese"></a>

## 中文

一个现代、科幻美学的个人网站，使用 **Go** 后端和 **React** 前端构建。

### ✨ 功能特性

- **粒子场背景** — 交互式 Canvas 粒子，支持鼠标排斥效果
- **鼠标追踪光晕卡片** — 项目卡片上的聚光灯效果跟随鼠标移动
- **弹簧物理动画** — Framer Motion 弹簧悬停和页面过渡动画
- **打字机效果** — 英雄区域旋转角色标题
- **Bento Grid 布局** — 项目仪表板，特色卡片跨行跨列
- **标签过滤** — 博客文章可按技术标签过滤
- **响应式设计** — 移动优先，带动画汉堡菜单
- **暗色主题** — 毛玻璃效果、粒子效果和极客美学
- **Markdown 渲染** — 服务端渲染，支持语法高亮
- **图片上传** — 拖放、粘贴支持，自动插入 Markdown 语法
- **命令面板** — 全局 Cmd+K 搜索博客和文档
- **3D 卡片效果** — Vercel 风格旋转和眩光效果
- **环境光效** — 鼠标追踪环境光效果

### 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion |
| **后端** | Go (Fiber), GORM, SQLite |
| **认证** | JWT + bcrypt 密码哈希 |
| **Markdown** | Goldmark，支持 GFM、语法高亮（Monokai 主题） |
| **设计** | 暗色主题、毛玻璃效果、弹簧物理动画 |

### 🚀 快速开始

#### 环境要求

- Go 1.21+
- Node.js 18+
- npm 或 yarn

#### 一键启动（推荐）

```bash
./start.sh frontend   # 启动 React 开发服务器
./start.sh backend    # 启动 Go API 服务器
./start.sh all        # 同时启动前后端
```

#### 手动启动

##### 后端（Go）

```bash
cd go-backend
go run .
# 服务器启动在 http://localhost:8080
```

##### 前端（React）

```bash
cd react-frontend
npm install
npm run dev
# 打开 http://localhost:5173（代理 /api 到 Go 后端）
```

### 📁 项目结构

```
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
│   │   │   ├── Hero.tsx             # 英雄区域，打字机和光晕球
│   │   │   ├── FeaturedPosts.tsx    # 博客卡片网格，带 3D 效果
│   │   │   ├── FeaturedProjects.tsx # 项目卡片网格
│   │   │   ├── CommandPalette.tsx   # 全局 Cmd+K 搜索
│   │   │   ├── AmbientGlow.tsx      # 鼠标追踪环境光
│   │   │   ├── MagneticElement.tsx  # 磁性吸引高阶组件
│   │   │   ├── CyberToast.tsx       # 赛博朋克风格通知
│   │   │   ├── Card3D.tsx           # 3D 旋转卡片效果
│   │   │   ├── ImageUploader.tsx    # 拖放图片上传
│   │   │   └── TerminalBlock.tsx    # 极客风格代码块
│   │   ├── pages/
│   │   │   ├── HomePage.tsx         # 首页
│   │   │   ├── BlogPage.tsx         # 博客列表，带过滤功能
│   │   │   ├── ArticleDetail.tsx    # 沉浸式文章阅读
│   │   │   ├── ProjectDocs.tsx      # 文档页面，带侧边栏
│   │   │   └── ProjectsPage.tsx     # Bento Grid 项目仪表板
│   │   ├── api.ts                   # API 客户端
│   │   ├── types.ts                 # TypeScript 接口定义
│   │   └── index.css                # 全局样式和设计系统
│   └── index.html
├── start.sh                 # 快速启动脚本
└── README.md
```

### 📡 API 端点

#### 公开端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/site` | 站点信息和简介 |
| GET | `/api/posts` | 博客文章（可选：`?tag=`、`?limit=`） |
| GET | `/api/posts/:slug` | 按 slug 获取单篇文章 |
| GET | `/api/search?q=` | 全局搜索博客和文档 |
| GET | `/api/contents?type=blog\|doc` | 统一内容系统 |
| GET | `/api/contents/:slug` | 按 slug 获取内容 |
| GET | `/api/docs/:project/tree` | 文档目录树结构 |
| GET | `/api/projects/list` | 项目列表 |

#### 认证端点

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 注册新用户 |
| POST | `/api/auth/login` | 登录获取 JWT 令牌 |

#### 管理端点（需要认证）

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/admin/posts` | 获取所有文章 |
| POST | `/api/admin/posts` | 创建新文章 |
| PUT | `/api/admin/posts/:id` | 更新文章 |
| DELETE | `/api/admin/posts/:id` | 删除文章 |
| POST | `/api/admin/upload` | 上传图片 |
| GET | `/api/admin/images` | 获取已上传图片列表 |
| DELETE | `/api/admin/images/:id` | 删除图片 |
| PUT | `/api/admin/site` | 更新站点信息 |
| PUT | `/api/admin/password` | 更新密码 |

### 🎨 设计系统

- **背景色**：`#050508`（近黑色）
- **强调色**：靛蓝 `#6366f1` → 青色 `#22d3ee` 渐变
- **卡片**：毛玻璃效果，`backdrop-blur-xl`
- **动画**：弹簧物理（`stiffness: 300, damping: 20`）
- **字体**：Inter（正文）+ JetBrains Mono（代码/标签）

### 🔧 环境变量

在 `go-backend` 目录下创建 `.env` 文件：

```env
PORT=8080
JWT_SECRET=你的密钥
```

### 📦 部署

#### 使用 CloudStudio

本项目支持通过 CloudStudio 部署。详见 [CloudStudioRules](CloudStudioRules) 了解详细说明。

#### 手动部署

1. 构建前端：
   ```bash
   cd react-frontend
   npm run build
   ```

2. 构建后端：
   ```bash
   cd go-backend
   go build -o server .
   ```

3. 运行服务器：
   ```bash
   ./server
   ```

### 🤝 贡献指南

1. Fork 本仓库
2. 创建你的功能分支（`git checkout -b feature/amazing-feature`）
3. 提交你的更改（`git commit -m '添加一些很棒的功能'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
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