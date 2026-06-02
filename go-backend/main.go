package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// 初始化数据库
	InitDB()

	// 确保上传目录存在
	ensureUploadDir()

	// 创建 Fiber 应用
	app := fiber.New(fiber.Config{
		AppName:      "NOWEN Blog API",
		BodyLimit:    10 * 1024 * 1024, // 10MB
		ReadTimeout:  60 * 1e9,         // 60s (increased for AI streaming)
		WriteTimeout: 60 * 1e9,
	})

	// 全局中间件
	app.Use(logger.New())
	app.Use(recover.New())
	// CORS 配置 - 允许前端开发服务器访问
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Content-Type,Authorization,Accept",
		AllowCredentials: false,
		ExposeHeaders:    "Authorization",
		MaxAge:           86400,
	}))

	// API 路由组
	api := app.Group("/api")

	// --- 公开端点 ---
	api.Get("/health", HealthCheck)
	api.Get("/site", GetSiteInfo)
	api.Get("/posts", GetPosts)
	api.Get("/posts/detail", GetPost)
	api.Get("/posts/:slug", GetPublicPostBySlug) // RESTful 文章查询
	api.Get("/search", SearchContents)           // 全局搜索 (Cmd+K)

	// --- 统一内容系统 (Content) ---
	api.Get("/contents", GetContents)            // ?type=blog|doc&project=xxx
	api.Get("/contents/:slug", GetContentBySlug) // 按 slug 查询
	api.Get("/docs/:project/tree", GetDocTree)   // 文档目录树
	api.Get("/projects/list", GetProjectsList)   // 项目列表
	api.Get("/carousel", GetCarousel)

	// --- 评论系统 ---
	api.Get("/posts/:postId/comments", GetComments)
	api.Post("/posts/:postId/comments", CreateComment) // 幻灯片列表

	// --- GitHub 仓库信息 ---
	api.Post("/github/repo-info", FetchGitHubRepoInfo) // POST 方式，传入 GitHub URL
	api.Get("/github/repo-info", GetGitHubRepoInfo)    // GET 方式，传入 owner 和 repo 参数
	api.Post("/github/repo-info-full", FetchGitHubRepoInfoWithREADME) // 获取仓库信息和 README

	// --- 静态文件服务（上传的图片）---
	app.Static("/uploads", uploadDir)

	// --- 认证端点 ---
	api.Post("/auth/register", Register)
	api.Post("/auth/login", Login)

	// --- 管理员端点（需要认证）---
	admin := api.Group("/admin", JWTMiddleware)

	// 文章管理 (旧系统兼容)
	admin.Get("/posts", AdminGetPosts)
	admin.Get("/posts/detail", AdminGetPost)
	admin.Post("/posts", CreatePost)
	admin.Put("/posts/:id", UpdatePost)
	admin.Delete("/posts/:id", DeletePost)

	// 内容管理 (新统一系统)
	admin.Post("/contents", AdminCreateContent)
	admin.Put("/contents/:id", AdminUpdateContent)
	admin.Delete("/contents/:id", AdminDeleteContent)

	// 图片上传管理
	admin.Post("/upload", UploadImage)
	admin.Get("/images", GetImages)
	admin.Delete("/images/:id", DeleteImage)

	// 站点管理
	admin.Put("/site", UpdateSiteInfo)

	// 用户管理
	admin.Put("/password", UpdatePassword)
	admin.Put("/profile", UpdateProfile)
	admin.Get("/me", GetCurrentUser)
	admin.Put("/posts/:id/carousel", UpdateCarouselOrder)

	// 评论管理
	admin.Get("/comments", AdminGetComments)
	admin.Get("/comments/stats", AdminGetCommentStats)
	admin.Put("/comments/:id/status", AdminUpdateCommentStatus)
	admin.Delete("/comments/:id", AdminDeleteComment) // 更新幻灯片排序

	// AI 写作助手
	admin.Get("/ai/settings", GetAISettings)
	admin.Put("/ai/settings", UpdateAISettings)
	admin.Post("/ai/test", TestAIConnection)
	admin.Post("/ai/chat", AIChatSSE)

	// 获取端口
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 启动服务器
	log.Printf("🚀 Server running on http://localhost:%s", port)
	log.Printf("📂 API Endpoints:")
	log.Printf("   Public:")
	log.Printf("     GET  /api/health")
	log.Printf("     GET  /api/site")
	log.Printf("     GET  /api/posts")
	log.Printf("     GET  /api/posts/detail?slug=...")
	log.Printf("     GET  /api/posts/:slug")
	log.Printf("     GET  /api/search?q=...")
	log.Printf("     GET  /api/contents?type=blog|doc&project=xxx")
	log.Printf("     GET  /api/contents/:slug")
	log.Printf("     GET  /api/docs/:project/tree")
	log.Printf("     GET  /api/projects/list")
	log.Printf("   Auth:")
	log.Printf("     POST /api/auth/register")
	log.Printf("     POST /api/auth/login")
	log.Printf("   Admin (requires auth):")
	log.Printf("     GET    /api/admin/posts")
	log.Printf("     GET    /api/admin/posts/detail?id=...")
	log.Printf("     POST   /api/admin/posts")
	log.Printf("     PUT    /api/admin/posts/:id")
	log.Printf("     DELETE /api/admin/posts/:id")
	log.Printf("     PUT    /api/admin/site")
	log.Printf("     PUT    /api/admin/password")
	log.Printf("     GET    /api/admin/ai/settings")
	log.Printf("     PUT    /api/admin/ai/settings")
	log.Printf("     POST   /api/admin/ai/test")
	log.Printf("     POST   /api/admin/ai/chat")

	log.Fatal(app.Listen(":" + port))
}
