# nowen-blog — Personal Blog & Project Portfolio

A modern, sci-fi aesthetic personal website built with **Go** backend and **React** frontend.

## ✨ Features

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

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion |
| **Backend** | Go (Fiber), GORM, SQLite |
| **Authentication** | JWT with bcrypt password hashing |
| **Markdown** | Goldmark with GFM, syntax highlighting (Monokai theme) |
| **Design** | Dark theme, glass morphism, spring physics animations |

## 🚀 Quick Start

### Prerequisites

- Go 1.21+
- Node.js 18+
- npm or yarn

### One-command start (recommended)

```bash
./start.sh frontend   # Start React dev server
./start.sh backend    # Start Go API server
./start.sh all        # Start both
```

### Manual start

#### Backend (Go)

```bash
cd go-backend
go run .
# Server starts on http://localhost:8080
```

#### Frontend (React)

```bash
cd react-frontend
npm install
npm run dev
# Opens http://localhost:5173 (proxies /api to Go backend)
```

## 📁 Project Structure

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

## 📡 API Endpoints

### Public Endpoints

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

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT token |

### Admin Endpoints (requires authentication)

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

## 🎨 Design System

- **Background**: `#050508` (near-black)
- **Accent**: Indigo `#6366f1` → Cyan `#22d3ee` gradient
- **Cards**: Glass morphism with `backdrop-blur-xl`
- **Animations**: Spring physics (`stiffness: 300, damping: 20`)
- **Font**: Inter (body) + JetBrains Mono (code/labels)

## 🔧 Environment Variables

Create a `.env` file in the `go-backend` directory:

```env
PORT=8080
JWT_SECRET=your-secret-key-here
```

## 📦 Deployment

### Using CloudStudio

This project supports deployment via CloudStudio. See [CloudStudioRules](CloudStudioRules) for detailed instructions.

### Manual Deployment

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

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Fiber](https://gofiber.io/) - Go web framework
- [GORM](https://gorm.io/) - ORM library for Go
- [React](https://react.dev/) - Frontend library
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Vite](https://vitejs.dev/) - Build tool