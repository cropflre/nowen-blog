# GitHub 项目自动识别功能 - 快速启动指南

## 🚀 快速开始

### 1. 配置 GitHub Token（推荐）

为避免 API 速率限制，建议配置 GitHub Token：

```powershell
# 1. 获取 Token
# 访问: https://github.com/settings/tokens
# 创建新 token，勾选 public_repo 权限

# 2. 设置环境变量（当前 PowerShell 会话）
$env:GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 3. 永久设置（所有会话有效）
[System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "User")
```

详细步骤请查看 `setup-github-token.md`

### 2. 启动后端服务

```powershell
# 方法 1: 使用启动脚本（推荐）
cd c:\UGit\nowen-blog\go-backend
.\start-backend.ps1

# 方法 2: 手动启动
$env:PORT="8080"
go run main.go github.go
```

### 3. 启动前端服务

```powershell
cd c:\UGit\nowen-blog\react-frontend
npm run dev
```

### 4. 测试功能

#### 后端 API 测试

```powershell
# 使用测试脚本
cd c:\UGit\nowen-blog\go-backend
.\test-github-api.ps1

# 或手动测试
$body = @{ url = "https://github.com/facebook/react" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/github/repo-info" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

#### 前端界面测试

1. 访问: http://localhost:5173/github-demo
2. 输入 GitHub 仓库 URL（如 `https://github.com/facebook/react`）
3. 点击 "Fetch Info" 或等待自动识别（防抖 800ms）
4. 查看仓库信息展示

## 🧪 测试检查清单

- [ ] 后端启动成功（显示路由列表）
- [ ] 健康检查通过 (`GET /api/health`)
- [ ] POST 方式获取仓库信息成功
- [ ] GET 方式获取仓库信息成功
- [ ] 无效 URL 错误正确处理
- [ ] 前端组件正确渲染
- [ ] 防抖功能正常工作
- [ ] 仓库信息展示完整（名称、描述、Stars、Forks 等）
- [ ] 点击链接正确跳转到 GitHub
- [ ] Avatar 图片正确显示

## 🐛 常见问题

### 1. API rate limit exceeded (403)

**原因**: 未配置 GitHub Token，达到速率限制

**解决**:
```powershell
# 设置环境变量
$env:GITHUB_TOKEN="your_token_here"

# 重启后端服务
```

### 2. 后端编译失败

**原因**: 可能有语法错误或缺少依赖

**解决**:
```powershell
cd c:\UGit\nowen-blog\go-backend
go mod tidy
go build -o ../server.exe .
```

### 3. 前端 TypeScript 错误

**原因**: 类型定义不匹配

**解决**:
```powershell
cd c:\UGit\nowen-blog\react-frontend
npx tsc --noEmit
```

### 4. CORS 错误

**原因**: 前端和后端域名/端口不匹配

**解决**: 检查后端 CORS 配置，确保允许前端地址

## 📊 API 端点

### POST /api/github/repo-info

**请求体**:
```json
{
  "url": "https://github.com/owner/repo"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Repository info fetched successfully",
  "data": {
    "id": 102402489,
    "name": "react",
    "full_name": "facebook/react",
    "description": "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
    "html_url": "https://github.com/facebook/react",
    "clone_url": "https://github.com/facebook/react.git",
    "homepage": "https://react.dev",
    "stargazers_count": 228000,
    "forks_count": 47000,
    "watchers_count": 228000,
    "language": "JavaScript",
    "topics": ["declarative", "facebook", "frontend", "javascript", "library", "react", "ui"],
    "created_at": "2013-05-24T16:15:54Z",
    "updated_at": "2024-01-15T10:22:15Z",
    "default_branch": "main",
    "owner": {
      "login": "facebook",
      "avatar_url": "https://avatars.githubusercontent.com/u/69631?v=4",
      "html_url": "https://github.com/facebook"
    },
    "private": false,
    "size": 367809
  }
}
```

### GET /api/github/repo-info

**参数**:
- `owner`: 仓库所有者
- `repo`: 仓库名称
- `url`: 完整 GitHub URL（可选，与 owner/repo 二选一）

**示例**:
```
GET /api/github/repo-info?owner=facebook&repo=react
GET /api/github/repo-info?url=https://github.com/facebook/react
```

## 🎨 功能特性

✨ **自动识别**: 输入 URL 后自动获取仓库信息（防抖 800ms）
✨ **多种输入格式支持**: 
  - `https://github.com/owner/repo`
  - `http://github.com/owner/repo`
  - `github.com/owner/repo`
  - `owner/repo`
✨ **完整信息展示**: 名称、描述、Stars、Forks、Watchers、语言、Topics 等
✨ **友好界面**: 深色主题、响应式设计、加载动画、错误提示
✨ **安全**: Token 通过环境变量配置，不硬编码在代码中

## 📝 后续优化建议

1. **缓存机制**: 缓存已获取的仓库信息，减少 API 调用
2. **批量查询**: 支持一次输入多个 URL，批量获取信息
3. **错误处理优化**: 更详细的错误提示（网络错误、仓库不存在、私有仓库等）
4. **单元测试**: 添加后端单元测试和前端组件测试
5. **集成到项目管理系统**: 将功能集成到现有的项目管理页面
6. **支持更多平台**: 扩展支持 GitLab、Bitbucket 等

## 📞 需要帮助？

如果遇到问题，请检查：
1. 后端日志（控制台输出）
2. 浏览器开发者工具（Network 和 Console 标签）
3. PowerShell 错误信息
4. `setup-github-token.md` 文档

---
**开发时间**: 2026-06-02
**开发者**: NOWEN Team
**状态**: ✅ 功能完成，待测试和配置 Token
