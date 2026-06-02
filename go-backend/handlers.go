package main

import (
	"net/url"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ==================== 公开文章查询 ====================

// GetPublicPostBySlug 前台公开文章查询引擎
func GetPublicPostBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	// Handle URL-encoded slugs (e.g. Chinese characters)
	if decoded, err := url.PathUnescape(slug); err == nil {
		slug = decoded
	}
	var post Post

	// 核心安全逻辑：必须同时满足 slug 匹配，且状态为 'published'
	if err := DB.Where("slug = ? AND status = ?", slug, "published").First(&post).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "DATA_NOT_FOUND_OR_RESTRICTED",
		})
	}

	// 静默增加浏览量（异步执行，不阻塞当前请求返回）
	go func(id uint) {
		DB.Model(&Post{}).Where("id = ?", id).UpdateColumn("view_count", gorm.Expr("view_count + ?", 1))
	}(post.ID)

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   post,
	})
}

// ==================== 认证处理器 ====================

// Register 用户注册
func Register(c *fiber.Ctx) error {
	var input struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// 验证
	if len(input.Username) < 3 || len(input.Username) > 50 {
		return c.Status(400).JSON(fiber.Map{"error": "Username must be 3-50 characters"})
	}
	if len(input.Password) < 6 {
		return c.Status(400).JSON(fiber.Map{"error": "Password must be at least 6 characters"})
	}

	// 检查重复
	var existing User
	if err := DB.Where("username = ? OR email = ?", input.Username, input.Email).First(&existing).Error; err == nil {
		return c.Status(409).JSON(fiber.Map{"error": "Username or email already exists"})
	}

	// 创建用户
	hashedPassword, err := HashPassword(input.Password)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	user := User{
		Username:           input.Username,
		Email:              input.Email,
		Password:           hashedPassword,
		Role:               "admin",
		MustChangePassword: false,
	}

	if err := DB.Create(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create user"})
	}

	// 生成令牌
	token, err := GenerateToken(&user)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.Status(201).JSON(fiber.Map{
		"message":  "Registration successful",
		"token":    token,
		"username": user.Username,
	})
}

// Login 用户登录
func Login(c *fiber.Ctx) error {
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// 查找用户
	var user User
	if err := DB.Where("username = ?", input.Username).First(&user).Error; err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	// 验证密码
	if !CheckPassword(input.Password, user.Password) {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	// 生成令牌
	token, err := GenerateToken(&user)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.JSON(fiber.Map{
		"token":                token,
		"username":             user.Username,
		"role":                 user.Role,
		"must_change_password": user.MustChangePassword,
	})
}

// UpdatePassword 修改密码
func UpdatePassword(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var input struct {
		OldPassword string `json:"oldPassword"`
		NewPassword string `json:"newPassword"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if len(input.NewPassword) < 6 {
		return c.Status(400).JSON(fiber.Map{"error": "New password must be at least 6 characters"})
	}

	var user User
	if err := DB.First(&user, userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	if !CheckPassword(input.OldPassword, user.Password) {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid old password"})
	}

	hashedPassword, err := HashPassword(input.NewPassword)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	DB.Model(&user).Updates(map[string]interface{}{
		"password":             hashedPassword,
		"must_change_password": false,
	})
	return c.JSON(fiber.Map{"message": "Password updated successfully"})
}

// ==================== 文章处理器 ====================

// GetPosts 获取文章列表（公开）
func GetPosts(c *fiber.Ctx) error {
	status := c.Query("status", "published")
	tag := c.Query("tag")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "10"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	query := DB.Model(&Post{})

	// 状态过滤
	query = query.Where("status = ?", status)

	// 标签过滤
	if tag != "" {
		query = query.Where("tags LIKE ?", "%"+tag+"%")
	}

	// 计算总数
	var total int64
	query.Count(&total)

	// 分页查询
	var posts []Post
	offset := (page - 1) * pageSize
	query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&posts)

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	return c.JSON(fiber.Map{
		"data":       posts,
		"total":      total,
		"page":       page,
		"pageSize":   pageSize,
		"totalPages": totalPages,
	})
}

// GetPost 获取单篇文章
func GetPost(c *fiber.Ctx) error {
	slug := c.Query("slug")
	if slug == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Slug parameter required"})
	}

	var post Post
	if err := DB.Where("slug = ? AND status = ?", slug, "published").First(&post).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Post not found"})
	}

	return c.JSON(post)
}

// AdminGetPosts 管理员获取所有文章
func AdminGetPosts(c *fiber.Ctx) error {
	status := c.Query("status")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := DB.Model(&Post{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var posts []Post
	offset := (page - 1) * pageSize
	query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&posts)

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	return c.JSON(fiber.Map{
		"data":       posts,
		"total":      total,
		"page":       page,
		"pageSize":   pageSize,
		"totalPages": totalPages,
	})
}

// AdminGetPost 管理员获取单篇文章
func AdminGetPost(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Query("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var post Post
	if err := DB.First(&post, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Post not found"})
	}

	return c.JSON(post)
}

// CreatePost 创建文章
func CreatePost(c *fiber.Ctx) error {
	var input struct {
		Title   string   `json:"title"`
		Slug    string   `json:"slug"`
		Summary string   `json:"summary"`
		Content string   `json:"content"`
		Cover   string   `json:"cover"`
		Tags    []string `json:"tags"`
		Status  string   `json:"status"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Title == "" || input.Slug == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Title and slug are required"})
	}

	// 检查 slug 唯一性
	var existing Post
	if err := DB.Where("slug = ?", input.Slug).First(&existing).Error; err == nil {
		return c.Status(409).JSON(fiber.Map{"error": "Slug already exists"})
	}

	tags := strings.Join(input.Tags, ",")
	readTime := len(input.Content) / 200
	if readTime < 1 {
		readTime = 1
	}

	// 服务端预渲染 Markdown → HTML
	htmlContent, err := RenderMarkdown(input.Content)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to render markdown"})
	}

	post := Post{
		Title:       input.Title,
		Slug:        input.Slug,
		Summary:     input.Summary,
		Content:     input.Content,
		HtmlContent: htmlContent,
		Cover:       input.Cover,
		Tags:        tags,
		Status:      input.Status,
		ReadTime:    readTime,
	}

	if err := DB.Create(&post).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create post"})
	}

	return c.Status(201).JSON(post)
}

// UpdatePost 更新文章
func UpdatePost(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var post Post
	if err := DB.First(&post, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Post not found"})
	}

	var input struct {
		Title   string   `json:"title"`
		Slug    string   `json:"slug"`
		Summary string   `json:"summary"`
		Content string   `json:"content"`
		Cover   string   `json:"cover"`
		Tags    []string `json:"tags"`
		Status  string   `json:"status"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// 检查 slug 唯一性（排除自身）
	if input.Slug != post.Slug {
		var existing Post
		if err := DB.Where("slug = ? AND id != ?", input.Slug, id).First(&existing).Error; err == nil {
			return c.Status(409).JSON(fiber.Map{"error": "Slug already exists"})
		}
	}

	tags := strings.Join(input.Tags, ",")
	readTime := len(input.Content) / 200
	if readTime < 1 {
		readTime = 1
	}

	// 服务端预渲染 Markdown → HTML
	htmlContent, err := RenderMarkdown(input.Content)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to render markdown"})
	}

	post.Title = input.Title
	post.Slug = input.Slug
	post.Summary = input.Summary
	post.Content = input.Content
	post.HtmlContent = htmlContent
	post.Cover = input.Cover
	post.Tags = tags
	post.Status = input.Status
	post.ReadTime = readTime

	DB.Save(&post)
	return c.JSON(post)
}

// DeletePost 删除文章
func DeletePost(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var post Post
	if err := DB.First(&post, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Post not found"})
	}

	DB.Delete(&post)
	return c.JSON(fiber.Map{"message": "Post deleted successfully"})
}

// ==================== 站点信息处理器 ====================

// GetSiteInfo 获取站点信息（公开）
func GetSiteInfo(c *fiber.Ctx) error {
	var siteInfo SiteInfo
	if err := DB.First(&siteInfo).Error; err != nil {
		// 返回默认值
		return c.JSON(SiteInfo{
			Name:         "NOWEN",
			Title:        "Full-Stack Engineer & System Architect",
			Bio:          "Building high-performance systems with Go and elegant interfaces with React.",
			Avatar:       "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=nowen&backgroundColor=0a0a0a",
			Email:        "hello@nowen.dev",
			Github:       "https://github.com/nowen",
			Twitter:      "https://twitter.com/nowen",
			Skills:       "Go,React,TypeScript,Rust,PostgreSQL,Redis,Docker,Kubernetes",
			BeianEnabled: false,
			BeianNumber:  "",
		})
	}
	return c.JSON(siteInfo)
}

// UpdateSiteInfo 更新站点信息
func UpdateSiteInfo(c *fiber.Ctx) error {
	var input SiteInfo
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var siteInfo SiteInfo
	result := DB.First(&siteInfo)
	if result.Error != nil {
		// 不存在则创建
		DB.Create(&input)
		return c.JSON(input)
	}

	// 更新字段
	siteInfo.Name = input.Name
	siteInfo.Title = input.Title
	siteInfo.Bio = input.Bio
	siteInfo.Avatar = input.Avatar
	siteInfo.Email = input.Email
	siteInfo.Github = input.Github
	siteInfo.Twitter = input.Twitter
	siteInfo.Skills = input.Skills
	siteInfo.BeianEnabled = input.BeianEnabled
	siteInfo.BeianNumber = input.BeianNumber

	DB.Save(&siteInfo)
	return c.JSON(siteInfo)
}

// ==================== 健康检查 ====================

// HealthCheck 健康检查
func HealthCheck(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "ok",
		"time":   c.Context().Time().Format("2006-01-02T15:04:05Z"),
	})
}

// ==================== 全局搜索 ====================

// SearchContents 全局搜索（同时查询 Post 和 Content 表）
func SearchContents(c *fiber.Ctx) error {
	query := c.Query("q", "")
	if query == "" {
		return c.JSON(fiber.Map{
			"status": "success",
			"data":   []interface{}{},
		})
	}

	likeQuery := "%" + query + "%"
	limit := 20

	// 搜索 Post 表（仅已发布）
	var posts []Post
	DB.Where("status = ? AND (title LIKE ? OR summary LIKE ? OR tags LIKE ?)",
		"published", likeQuery, likeQuery, likeQuery).
		Select("id", "title", "slug", "summary", "tags", "type", "created_at").
		Limit(limit).Find(&posts)

	// 搜索 Content 表（仅已发布）
	var contents []Content
	DB.Where("status = ? AND (title LIKE ? OR summary LIKE ? OR tags LIKE ?)",
		"published", likeQuery, likeQuery, likeQuery).
		Select("id", "title", "slug", "summary", "tags", "type", "project_name", "created_at").
		Limit(limit).Find(&contents)

	// 构建统一搜索结果
	type SearchResult struct {
		ID          uint   `json:"id"`
		Title       string `json:"title"`
		Slug        string `json:"slug"`
		Summary     string `json:"summary"`
		Tags        string `json:"tags"`
		Type        string `json:"type"`
		ProjectName string `json:"project_name,omitempty"`
		CreatedAt   string `json:"created_at"`
	}

	var results []SearchResult

	// 添加 Post 结果（类型标记为 "blog"）
	for _, p := range posts {
		results = append(results, SearchResult{
			ID:        p.ID,
			Title:     p.Title,
			Slug:      p.Slug,
			Summary:   p.Summary,
			Tags:      p.Tags,
			Type:      "blog",
			CreatedAt: p.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}

	// 添加 Content 结果
	for _, item := range contents {
		results = append(results, SearchResult{
			ID:          item.ID,
			Title:       item.Title,
			Slug:        item.Slug,
			Summary:     item.Summary,
			Tags:        item.Tags,
			Type:        item.Type,
			ProjectName: item.ProjectName,
			CreatedAt:   item.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   results,
	})
}

// ==================== 统一内容系统 (Content) ====================

// GetContents 获取内容列表（支持 type 和 project 过滤）
func GetContents(c *fiber.Ctx) error {
	contentType := c.Query("type", "blog")
	project := c.Query("project")
	status := c.Query("status", "published")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := DB.Model(&Content{}).Where("type = ? AND status = ?", contentType, status)

	if project != "" {
		query = query.Where("project_name = ?", project)
	}

	var total int64
	query.Count(&total)

	var items []Content
	offset := (page - 1) * pageSize
	query.Order("`order` ASC, created_at DESC").Offset(offset).Limit(pageSize).Find(&items)

	return c.JSON(fiber.Map{
		"data":       items,
		"total":      total,
		"page":       page,
		"pageSize":   pageSize,
		"totalPages": (total + int64(pageSize) - 1) / int64(pageSize),
	})
}

// GetContentBySlug 按 slug 获取单篇内容（公开）
func GetContentBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	var content Content

	if err := DB.Where("slug = ? AND status = ?", slug, "published").First(&content).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "CONTENT_NOT_FOUND",
		})
	}

	// 异步递增浏览量
	go func(id uint) {
		DB.Model(&Content{}).Where("id = ?", id).UpdateColumn("view_count", gorm.Expr("view_count + ?", 1))
	}(content.ID)

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   content,
	})
}

// GetDocTree 获取指定项目的文档目录树
func GetDocTree(c *fiber.Ctx) error {
	project := c.Params("project")
	if project == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Project parameter required"})
	}

	var docs []Content
	if err := DB.Where("type = ? AND project_name = ? AND status = ?", "doc", project, "published").
		Select("id", "title", "slug", "`order`").
		Order("`order` ASC, created_at ASC").
		Find(&docs).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch doc tree"})
	}

	// 获取项目 GitHub URL
	var firstDoc Content
	DB.Where("type = ? AND project_name = ? AND status = ? AND github_url != ?", "doc", project, "published", "").
		First(&firstDoc)

	return c.JSON(fiber.Map{
		"status":     "success",
		"project":    project,
		"github_url": firstDoc.GithubURL,
		"data":       docs,
	})
}

// GetProjects 获取所有项目列表（去重）
func GetProjectsList(c *fiber.Ctx) error {
	var projects []struct {
		ProjectName string `json:"project_name"`
		GithubURL   string `json:"github_url"`
		Count       int    `json:"doc_count"`
	}

	DB.Model(&Content{}).
		Where("type = ? AND status = ? AND project_name != ?", "doc", "published", "").
		Select("project_name, github_url, COUNT(*) as count").
		Group("project_name").
		Order("count DESC").
		Find(&projects)

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   projects,
	})
}

// AdminCreateContent 管理员创建内容
func AdminCreateContent(c *fiber.Ctx) error {
	var input Content
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// 自动生成 slug
	if input.Slug == "" {
		input.Slug = strings.ToLower(strings.ReplaceAll(input.Title, " ", "-"))
	}

	// 渲染 Markdown
	html, err := RenderMarkdown(input.Content)
	if err == nil {
		input.HtmlContent = html
	}

	if err := DB.Create(&input).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create content"})
	}

	return c.Status(201).JSON(input)
}

// AdminUpdateContent 管理员更新内容
func AdminUpdateContent(c *fiber.Ctx) error {
	id := c.Params("id")
	var content Content
	if err := DB.First(&content, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Content not found"})
	}

	var input Content
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// 重新渲染 Markdown
	if input.Content != "" {
		html, err := RenderMarkdown(input.Content)
		if err == nil {
			input.HtmlContent = html
		}
	}

	DB.Model(&content).Updates(input)
	return c.JSON(content)
}

// AdminDeleteContent 管理员删除内容
func AdminDeleteContent(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := DB.Delete(&Content{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete content"})
	}
	return c.JSON(fiber.Map{"message": "Content deleted"})
}

// ==================== 幻灯片 (Carousel) ====================

// GetCarousel 获取幻灯片列表（公开接口）
func GetCarousel(c *fiber.Ctx) error {
	var posts []Post
	if err := DB.Where("status = ? AND carousel_order > ?", "published", 0).
		Select("id", "title", "slug", "summary", "cover", "tags", "carousel_order").
		Order("carousel_order ASC").
		Limit(5).
		Find(&posts).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch carousel"})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   posts,
	})
}

// UpdateCarouselOrder 管理员更新文章幻灯片排序
func UpdateCarouselOrder(c *fiber.Ctx) error {
	id := c.Params("id")

	var input struct {
		CarouselOrder int `json:"carousel_order"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// 限制范围 0-5
	if input.CarouselOrder < 0 || input.CarouselOrder > 5 {
		return c.Status(400).JSON(fiber.Map{"error": "carousel_order must be 0-5"})
	}

	if err := DB.Model(&Post{}).Where("id = ?", id).Update("carousel_order", input.CarouselOrder).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update carousel order"})
	}

	return c.JSON(fiber.Map{"message": "Carousel order updated"})
}

// ==================== 评论系统 ====================

// GetComments 获取文章的已审核评论（公开）
func GetComments(c *fiber.Ctx) error {
	postID := c.Params("postId")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "20"))
	if pageSize > 50 {
		pageSize = 50
	}

	var comments []Comment
	var total int64

	query := DB.Model(&Comment{}).Where("post_id = ? AND status = ?", postID, "approved")
	query.Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&comments).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch comments"})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"comments": comments,
			"total":    total,
		},
	})
}

// CreateComment 提交评论（公开，无需登录）
func CreateComment(c *fiber.Ctx) error {
	postID := c.Params("postId")

	// 验证文章存在
	var post Post
	if err := DB.First(&post, postID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Post not found"})
	}

	var input struct {
		ParentID *uint  `json:"parent_id`
		Nickname string `json:"nickname`
		Email    string `json:"email`
		Website  string `json:"website`
		Content  string `json:"content`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// 验证
	input.Nickname = strings.TrimSpace(input.Nickname)
	input.Content = strings.TrimSpace(input.Content)
	if input.Nickname == "" || len(input.Nickname) > 50 {
		return c.Status(400).JSON(fiber.Map{"error": "Nickname is required (max 50 chars)"})
	}
	if input.Content == "" || len(input.Content) > 2000 {
		return c.Status(400).JSON(fiber.Map{"error": "Content is required (max 2000 chars)"})
	}

	// 验证父评论存在（如有）
	if input.ParentID != nil {
		var parent Comment
		if err := DB.First(&parent, *input.ParentID).Error; err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Parent comment not found"})
		}
	}

	// 简单频率限制：同一IP 30秒内不能重复评论
	ip := c.IP()
	var recentCount int64
	DB.Model(&Comment{}).Where("ip_address = ? AND created_at > datetime('now', '-30 seconds')", ip).Count(&recentCount)
	if recentCount > 0 {
		return c.Status(429).JSON(fiber.Map{"error": "Please wait before posting another comment"})
	}

	postIDUint, _ := strconv.ParseUint(postID, 10, 64)
	comment := Comment{
		PostID:    uint(postIDUint),
		ParentID:  input.ParentID,
		Nickname:  input.Nickname,
		Email:     input.Email,
		Website:   input.Website,
		Content:   input.Content,
		Status:    "pending",
		IPAddress: ip,
	}

	if err := DB.Create(&comment).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create comment"})
	}

	return c.Status(201).JSON(fiber.Map{
		"status":  "success",
		"message": "Comment submitted, awaiting moderation",
		"data":    comment,
	})
}

// AdminGetComments 管理员获取评论列表
func AdminGetComments(c *fiber.Ctx) error {
	status := c.Query("status")
	postID := c.Query("postId")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "20"))

	var comments []Comment
	var total int64

	query := DB.Model(&Comment{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if postID != "" {
		query = query.Where("post_id = ?", postID)
	}
	query.Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&comments).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch comments"})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"comments": comments,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		},
	})
}

// AdminUpdateCommentStatus 管理员更新评论状态
func AdminUpdateCommentStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var comment Comment
	if err := DB.First(&comment, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Comment not found"})
	}

	var input struct {
		Status string `json:"status`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Status != "approved" && input.Status != "rejected" && input.Status != "pending" {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid status"})
	}

	DB.Model(&comment).Update("status", input.Status)
	return c.JSON(fiber.Map{"status": "success", "data": comment})
}

// AdminDeleteComment 管理员删除评论
func AdminDeleteComment(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := DB.Delete(&Comment{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete comment"})
	}
	return c.JSON(fiber.Map{"message": "Comment deleted"})
}

// AdminGetCommentStats 管理员获取评论统计
func AdminGetCommentStats(c *fiber.Ctx) error {
	var pending, approved, rejected int64
	DB.Model(&Comment{}).Where("status = ?", "pending").Count(&pending)
	DB.Model(&Comment{}).Where("status = ?", "approved").Count(&approved)
	DB.Model(&Comment{}).Where("status = ?", "rejected").Count(&rejected)

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"pending":  pending,
			"approved": approved,
			"rejected": rejected,
			"total":    pending + approved + rejected,
		},
	})
}

// UpdateProfile ??????
func UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var input struct {
		Username string `json:"username"`
		Email    string `json:"email"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var user User
	if err := DB.First(&user, userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	// ?????
	if len(input.Username) < 3 || len(input.Username) > 50 {
		return c.Status(400).JSON(fiber.Map{"error": "Username must be 3-50 characters"})
	}

	// ???????????
	if input.Username != user.Username {
		var existing User
		if err := DB.Where("username = ? AND id != ?", input.Username, userID).First(&existing).Error; err == nil {
			return c.Status(409).JSON(fiber.Map{"error": "Username already taken"})
		}
	}

	// ??????????
	if input.Email != "" && input.Email != user.Email {
		var existing User
		if err := DB.Where("email = ? AND id != ?", input.Email, userID).First(&existing).Error; err == nil {
			return c.Status(409).JSON(fiber.Map{"error": "Email already taken"})
		}
	}

	DB.Model(&user).Updates(map[string]interface{}{
		"username": input.Username,
		"email":    input.Email,
	})

	// ??????????????
	token, _ := GenerateToken(&user)

	return c.JSON(fiber.Map{
		"message":  "Profile updated successfully",
		"token":    token,
		"username": input.Username,
	})
}

// GetCurrentUser 获取当前登录用户信息
func GetCurrentUser(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var user User
	if err := DB.First(&user, userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(fiber.Map{
		"id":                   user.ID,
		"username":             user.Username,
		"email":                user.Email,
		"role":                 user.Role,
		"must_change_password": user.MustChangePassword,
		"created_at":           user.CreatedAt,
	})
}
