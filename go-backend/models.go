package main

import (
	"os"
	"path/filepath"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	Username           string         `gorm:"uniqueIndex;size:50;not null" json:"username"`
	Email              string         `gorm:"uniqueIndex;size:100" json:"email,omitempty"`
	Password           string         `gorm:"not null" json:"-"`
	Role               string         `gorm:"size:20;default:admin" json:"role"`
	MustChangePassword bool           `gorm:"default:false" json:"must_change_password"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
}

// Post 文章模型
type Post struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Title         string         `gorm:"size:200;not null" json:"title"`
	Slug          string         `gorm:"uniqueIndex;size:200;not null" json:"slug"`
	Summary       string         `gorm:"size:500" json:"summary"`
	Content       string         `gorm:"type:text;not null" json:"content"`
	HtmlContent   string         `gorm:"type:text" json:"html_content"`
	Cover         string         `gorm:"size:500" json:"cover,omitempty"`
	Tags          string         `gorm:"size:500" json:"tags"`
	Status        string         `gorm:"size:20;default:draft" json:"status"`
	ReadTime      int            `gorm:"default:0" json:"read_time"`
	ViewCount     int            `gorm:"default:0" json:"view_count"`
	CarouselOrder int            `gorm:"default:0" json:"carousel_order"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// SiteInfo 站点配置
type SiteInfo struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	Name         string `gorm:"size:100;not null" json:"name"`
	Title        string `gorm:"size:200" json:"title"`
	Bio          string `gorm:"size:1000" json:"bio"`
	Avatar       string `gorm:"size:500" json:"avatar"`
	Email        string `gorm:"size:100" json:"email"`
	Github       string `gorm:"size:200" json:"github"`
	Twitter      string `gorm:"size:200" json:"twitter"`
	Skills       string `gorm:"size:500" json:"skills"`
	BeianEnabled bool   `gorm:"default:false" json:"beian_enabled"` // 备案信息开关
	BeianNumber  string `gorm:"size:100" json:"beian_number"`       // 备案号
}

// Content 统一内容模型
type Content struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Type        string         `gorm:"index;size:20;default:blog" json:"type"`
	ProjectName string         `gorm:"index;size:100" json:"project_name"`
	GithubURL   string         `gorm:"size:500" json:"github_url,omitempty"`
	Title       string         `gorm:"size:200;not null" json:"title"`
	Slug        string         `gorm:"uniqueIndex;size:200;not null" json:"slug"`
	Summary     string         `gorm:"size:500" json:"summary,omitempty"`
	Content     string         `gorm:"type:text;not null" json:"content"`
	HtmlContent string         `gorm:"type:text" json:"html_content,omitempty"`
	Tags        string         `gorm:"size:500" json:"tags,omitempty"`
	Status      string         `gorm:"size:20;default:draft" json:"status"`
	ReadTime    int            `gorm:"default:0" json:"read_time"`
	ViewCount   int            `gorm:"default:0" json:"view_count"`
	Order       int            `gorm:"default:0" json:"order"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// Comment 评论模型
type Comment struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	PostID    uint           `gorm:"index;not null" json:"post_id"`
	ParentID  *uint          `gorm:"index" json:"parent_id"`
	Nickname  string         `gorm:"size:50;not null" json:"nickname"`
	Email     string         `gorm:"size:100" json:"email,omitempty"`
	Website   string         `gorm:"size:200" json:"website,omitempty"`
	Content   string         `gorm:"type:text;not null" json:"content"`
	Status    string         `gorm:"size:20;default:pending;index" json:"status"`
	IPAddress string         `gorm:"size:45" json:"-"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// 数据库实例
var DB *gorm.DB

// InitDB 初始化数据库
func InitDB() {
	var err error
	// 确保数据目录存在
	dataDir := "/app/data"
	if os.Getenv("DATA_DIR") != "" {
		dataDir = os.Getenv("DATA_DIR")
	}
	if err := os.MkdirAll(dataDir, os.ModePerm); err != nil {
		panic("Failed to create data directory: " + err.Error())
	}
	dbPath := filepath.Join(dataDir, "nowen_blog.db")
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}

	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxOpenConns(1)
		sqlDB.SetMaxIdleConns(1)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	// 自动迁移
	if err := DB.AutoMigrate(&User{}, &Post{}, &SiteInfo{}, &Content{}, &Image{}, &Comment{}); err != nil {
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
			Username:           "admin",
			Email:              "admin@nowen.dev",
			Password:           hashedPassword,
			Role:               "admin",
			MustChangePassword: true,
		})
	}
}
