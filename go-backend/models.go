package main

import (
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Username  string         `gorm:"uniqueIndex;size:50;not null" json:"username"`
	Email     string         `gorm:"uniqueIndex;size:100" json:"email,omitempty"`
	Password  string         `gorm:"not null" json:"-"`
	Role      string         `gorm:"size:20;default:admin" json:"role"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Post 文章模型
type Post struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Title       string         `gorm:"size:200;not null" json:"title"`
	Slug        string         `gorm:"uniqueIndex;size:200;not null" json:"slug"`
	Summary     string         `gorm:"size:500" json:"summary"`
	Content     string         `gorm:"type:text;not null" json:"content"`
	HtmlContent string         `gorm:"type:text" json:"html_content"` // 服务端预渲染的 HTML
	Cover       string         `gorm:"size:500" json:"cover,omitempty"`
	Tags        string         `gorm:"size:500" json:"tags"` // 逗号分隔
	Status      string         `gorm:"size:20;default:draft" json:"status"` // draft | published
	ReadTime    int            `gorm:"default:0" json:"read_time"`
	ViewCount   int            `gorm:"default:0" json:"view_count"` // 浏览量
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// SiteInfo 站点配置
type SiteInfo struct {
	ID      uint   `gorm:"primaryKey" json:"id"`
	Name    string `gorm:"size:100;not null" json:"name"`
	Title   string `gorm:"size:200" json:"title"`
	Bio     string `gorm:"size:1000" json:"bio"`
	Avatar  string `gorm:"size:500" json:"avatar"`
	Email   string `gorm:"size:100" json:"email"`
	Github  string `gorm:"size:200" json:"github"`
	Twitter string `gorm:"size:200" json:"twitter"`
	Skills  string `gorm:"size:500" json:"skills"`
}

// Content 统一内容模型：既可以是博客，也可以是项目文档节点
type Content struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Type        string         `gorm:"index;size:20;default:blog" json:"type"`           // 'blog' | 'doc'
	ProjectName string         `gorm:"index;size:100" json:"project_name"`               // doc 所属项目名 (如 'nowen-core')
	GithubURL   string         `gorm:"size:500" json:"github_url,omitempty"`             // 绑定的 GitHub 仓库
	Title       string         `gorm:"size:200;not null" json:"title"`
	Slug        string         `gorm:"uniqueIndex;size:200;not null" json:"slug"`
	Summary     string         `gorm:"size:500" json:"summary,omitempty"`
	Content     string         `gorm:"type:text;not null" json:"content"`
	HtmlContent string         `gorm:"type:text" json:"html_content,omitempty"`          // 服务端预渲染
	Tags        string         `gorm:"size:500" json:"tags,omitempty"`
	Status      string         `gorm:"size:20;default:draft" json:"status"`              // draft | published
	ReadTime    int            `gorm:"default:0" json:"read_time"`
	ViewCount   int            `gorm:"default:0" json:"view_count"`
	Order       int            `gorm:"default:0" json:"order"`                           // 文档目录排序
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// 数据库实例
var DB *gorm.DB

// InitDB 初始化数据库
func InitDB() {
	var err error
	DB, err = gorm.Open(sqlite.Open("nowen_blog.db"), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}

	// 配置连接池：SQLite 建议限制为 1 以避免写锁冲突
	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxOpenConns(1)
		sqlDB.SetMaxIdleConns(1)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	// 自动迁移
	if err := DB.AutoMigrate(&User{}, &Post{}, &SiteInfo{}, &Content{}, &Image{}); err != nil {
		panic("Failed to migrate database: " + err.Error())
	}

	// 初始化默认数据
	initDefaults()
}

// initDefaults 初始化默认站点信息和管理员
func initDefaults() {
	// 默认站点信息
	var siteCount int64
	DB.Model(&SiteInfo{}).Count(&siteCount)
	if siteCount == 0 {
		DB.Create(&SiteInfo{
			Name:    "NOWEN",
			Title:   "Full-Stack Engineer & System Architect",
			Bio:     "Building high-performance systems with Go and elegant interfaces with React.",
			Avatar:  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=nowen&backgroundColor=0a0a0a",
			Email:   "hello@nowen.dev",
			Github:  "https://github.com/nowen",
			Twitter: "https://twitter.com/nowen",
			Skills:  "Go,React,TypeScript,Rust,PostgreSQL,Redis,Docker,Kubernetes",
		})
	}

	// 默认管理员
	var userCount int64
	DB.Model(&User{}).Count(&userCount)
	if userCount == 0 {
		hashedPassword, _ := HashPassword("admin123")
		DB.Create(&User{
			Username: "admin",
			Email:    "admin@nowen.dev",
			Password: hashedPassword,
			Role:     "admin",
		})
	}
}

