package main

import (
	"encoding/base64"
	"time"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// GitHubRepoInfo GitHub 仓库信息结构
type GitHubRepoInfo struct {
	ID            int64       `json:"id"`
	Name          string      `json:"name"`
	FullName      string      `json:"full_name"`
	Description   string      `json:"description"`
	HTMLURL       string      `json:"html_url"`
	CloneURL      string      `json:"clone_url"`
	Homepage      string      `json:"homepage"`
	Stars         int         `json:"stargazers_count"`
	Forks         int         `json:"forks_count"`
	Watchers      int         `json:"watchers_count"`
	Language      string      `json:"language"`
	Topics        []string    `json:"topics"`
	CreatedAt     string      `json:"created_at"`
	UpdatedAt     string      `json:"updated_at"`
	DefaultBranch string      `json:"default_branch"`
	Owner         GitHubOwner `json:"owner"`
	IsPrivate     bool        `json:"private"`
	Size          int         `json:"size"`
}

// GitHubOwner GitHub 所有者信息
type GitHubOwner struct {
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
	HTMLURL   string `json:"html_url"`
}

// GitHubURLRequest GitHub URL 请求
type GitHubURLRequest struct {
	URL string `json:"url" validate:"required"`
}

// GitHubProjectInfo 项目信息响应
type GitHubProjectInfo struct {
	Success bool            `json:"success"`
	Message string          `json:"message,omitempty"`
	Data    *GitHubRepoInfo `json:"data,omitempty"`
}

// ParseGitHubURL 解析 GitHub URL，提取 owner 和 repo
func ParseGitHubURL(url string) (owner, repo string, err error) {
	// 移除 URL 中的协议头和尾部斜杠
	url = strings.TrimSpace(url)
	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimPrefix(url, "http://")
	url = strings.TrimPrefix(url, "github.com/")
	url = strings.TrimSuffix(url, "/")
	url = strings.TrimSuffix(url, ".git")

	// 按 / 分割
	parts := strings.Split(url, "/")
	if len(parts) < 2 {
		return "", "", fmt.Errorf("invalid GitHub URL")
	}

	owner = parts[0]
	repo = parts[1]

	// 移除可能的额外路径（如 /tree/main 等）
	if idx := strings.Index(repo, "/"); idx != -1 {
		repo = repo[:idx]
	}

	return owner, repo, nil
}

// FetchGitHubRepo 获取 GitHub 仓库信息
func FetchGitHubRepo(owner, repo string) (*GitHubRepoInfo, error) {
	// 构建 GitHub API URL
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, repo)

	// 创建 HTTP 请求
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// 设置 User-Agent（GitHub API 要求）
	req.Header.Set("User-Agent", "NOWEN-Blog/1.0")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	// 如果有 GitHub Token，添加到请求头（可选，用于提高 API 限制）
	if token := getGitHubToken(); token != "" {
		req.Header.Set("Authorization", "token "+token)
	}

	// 发送请求
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch repo info: %w", err)
	}
	defer resp.Body.Close()

	// 检查响应状态
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	// 解析响应
	var repoInfo GitHubRepoInfo
	if err := json.NewDecoder(resp.Body).Decode(&repoInfo); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &repoInfo, nil
}

// getGitHubToken 获取 GitHub Token（从环境变量）
func getGitHubToken() string {
	// 从环境变量获取 GitHub Token
	// 用于提高 API 限制（未认证：60次/小时，认证：5000次/小时）
	// 设置方法：
	//   - Windows (PowerShell): $env:GITHUB_TOKEN="your_token"
	//   - Linux/Mac: export GITHUB_TOKEN="your_token"
	//   - 或创建 .env 文件（需要额外配置）
	return os.Getenv("GITHUB_TOKEN")
}


// GitHubReadmeInfo README 信息
type GitHubReadmeInfo struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	Content  string `json:"content"` // Base64 encoded
	HTMLURL  string `json:"html_url"`
	Download string `json:"download_url"`
}

// FetchGitHubREADME 获取 GitHub 仓库的 README 内容
func FetchGitHubREADME(owner, repo string) (string, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/readme", owner, repo)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	if token := getGitHubToken(); token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch README: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	var readme GitHubReadmeInfo
	if err := json.NewDecoder(resp.Body).Decode(&readme); err != nil {
		return "", fmt.Errorf("failed to decode README response: %w", err)
	}

	content, err := base64.StdEncoding.DecodeString(readme.Content)
	if err != nil {
		return "", fmt.Errorf("failed to decode README content: %w", err)
	}

	return string(content), nil
}

// FetchGitHubRepoInfo 处理获取 GitHub 仓库信息的请求
func FetchGitHubRepoInfo(c *fiber.Ctx) error {
	var req GitHubURLRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(GitHubProjectInfo{
			Success: false,
			Message: "Invalid request body",
		})
	}

	// 验证 URL
	if req.URL == "" {
		return c.Status(400).JSON(GitHubProjectInfo{
			Success: false,
			Message: "GitHub URL is required",
		})
	}

	// 解析 GitHub URL
	owner, repo, err := ParseGitHubURL(req.URL)
	if err != nil {
		return c.Status(400).JSON(GitHubProjectInfo{
			Success: false,
			Message: "Invalid GitHub URL format. Please use format: https://github.com/owner/repo",
		})
	}

	// 获取仓库信息
	repoInfo, err := FetchGitHubRepo(owner, repo)
	if err != nil {
		return c.Status(500).JSON(GitHubProjectInfo{
			Success: false,
			Message: fmt.Sprintf("Failed to fetch repository info: %s", err.Error()),
		})
	}

	// 返回成功响应
	return c.JSON(GitHubProjectInfo{
		Success: true,
		Message: "Repository info fetched successfully",
		Data:    repoInfo,
	})
}

// GetGitHubRepoInfo 公开的 GET 接口，通过查询参数获取仓库信息
func GetGitHubRepoInfo(c *fiber.Ctx) error {
	owner := c.Query("owner")
	repo := c.Query("repo")

	if owner == "" || repo == "" {
		// 尝试从 URL 参数解析
		url := c.Query("url")
		if url == "" {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"message": "Missing required parameters: owner and repo, or url",
			})
		}
		var err error
		owner, repo, err = ParseGitHubURL(url)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"message": "Invalid GitHub URL",
			})
		}
	}

	// 获取仓库信息
	repoInfo, err := FetchGitHubRepo(owner, repo)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    repoInfo,
	})
}

// FetchGitHubRepoInfoWithREADME 处理获取 GitHub 仓库信息和 README 的请求
func FetchGitHubRepoInfoWithREADME(c *fiber.Ctx) error {
	var req GitHubURLRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	if req.URL == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "GitHub URL is required",
		})
	}

	owner, repo, err := ParseGitHubURL(req.URL)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid GitHub URL format",
		})
	}

	repoInfo, err := FetchGitHubRepo(owner, repo)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Failed to fetch repository info: %s", err.Error()),
		})
	}

	readme, err := FetchGitHubREADME(owner, repo)
	if err != nil {
		readme = ""
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"repo_info": repoInfo,
			"readme":    readme,
		},
	})
}
