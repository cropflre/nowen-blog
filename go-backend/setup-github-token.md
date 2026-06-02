# GitHub Token 配置指南

## 问题说明

GitHub API 有速率限制：
- **未认证请求**：60 次/小时
- **已认证请求**：5000 次/小时

当遇到 `API rate limit exceeded` 错误时，需要配置 GitHub Token。

## 获取 GitHub Token

1. 访问 [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. 点击 **"Generate new token"** > **"Generate new token (classic)"**
3. 填写信息：
   - **Note**: `NOWEN Blog Development`
   - **Expiration**: 选择过期时间（建议 90 天）
   - **Scopes**: 勾选 `public_repo` (只需访问公开仓库)
4. 点击 **"Generate token"**
5. **重要**: 立即复制生成的 token，只显示一次！

## 配置方法

### 方法 1: 环境变量（推荐）

#### Windows (PowerShell)
```powershell
# 临时设置（当前会话有效）
$env:GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 永久设置（所有会话有效）
[System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "User")
```

#### Windows (Command Prompt)
```cmd
# 临时设置
set GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 永久设置
setx GITHUB_TOKEN "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

#### Linux/Mac
```bash
# 临时设置
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 永久设置（添加到 ~/.bashrc 或 ~/.zshrc）
echo 'export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"' >> ~/.bashrc
```

### 方法 2: 使用 .env 文件（需要修改代码）

在项目根目录创建 `.env` 文件：
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

然后安装 `godotenv` 包并在代码中加载。

## 验证配置

启动后端服务后，使用以下命令测试：

```powershell
# 测试 API（需要先在 PowerShell 中设置环境变量）
$env:GITHUB_TOKEN="your_token_here"
go run main.go github.go

# 在另一个 PowerShell 窗口中测试
$body = @{ url = "https://github.com/facebook/react" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/github/repo-info" -Method Post -Body $body -ContentType "application/json"
```

## 安全提示

⚠️ **重要**：
- **永远不要**将 Token 提交到 Git 仓库
- **永远不要**在代码中硬编码 Token
- 定期更换 Token（建议每 90 天）
- 使用最小权限原则（只勾选必要的 Scopes）

## 故障排除

### Token 不生效
1. 确认环境变量已正确设置：`echo $env:GITHUB_TOKEN`
2. 重启 PowerShell/终端使环境变量生效
3. 检查 Token 是否过期

### 仍然遇到速率限制
1. 确认 Token 已正确添加到请求头（检查后端日志）
2. 检查 Token 的权限设置
3. 尝试重新生成 Token
