# PowerShell 脚本：测试 GitHub API 功能

$baseUrl = "http://localhost:8080/api"

Write-Host "=== 测试 GitHub API 功能 ===" -ForegroundColor Green

# 测试 1: 健康检查
Write-Host "`n[1] 测试健康检查..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 5
    Write-Host "✓ 后端服务正常" -ForegroundColor Green
    $health | ConvertTo-Json
} catch {
    Write-Host "✗ 后端服务未运行" -ForegroundColor Red
    Write-Host "  请先运行: .\start-backend.ps1" -ForegroundColor Yellow
    exit 1
}

# 测试 2: POST 方式获取仓库信息
Write-Host "`n[2] 测试 POST /api/github/repo-info..." -ForegroundColor Cyan
$testURLs = @(
    "https://github.com/facebook/react",
    "https://github.com/microsoft/vscode",
    "https://github.com/golang/go"
)

foreach ($url in $testURLs) {
    Write-Host "`n  测试 URL: $url" -ForegroundColor Yellow
    
    $body = @{ url = $url } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/github/repo-info" `
            -Method Post `
            -Body $body `
            -ContentType "application/json" `
            -TimeoutSec 10
        
        if ($response.success) {
            Write-Host "  ✓ 成功获取仓库信息" -ForegroundColor Green
            Write-Host "    名称: $($response.data.name)" -ForegroundColor White
            Write-Host "    完整名称: $($response.data.full_name)" -ForegroundColor White
            Write-Host "    Stars: $($response.data.stargazers_count)" -ForegroundColor White
            Write-Host "    Forks: $($response.data.forks_count)" -ForegroundColor White
            Write-Host "    语言: $($response.data.language)" -ForegroundColor White
            if ($response.data.description) {
                Write-Host "    描述: $($response.data.description)" -ForegroundColor White
            }
        } else {
            Write-Host "  ✗ 获取失败: $($response.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
        
        # 检查是否是速率限制错误
        if ($_.Exception.Response.StatusCode -eq 403) {
            Write-Host "`n  ⚠️  可能遇到 GitHub API 速率限制" -ForegroundColor Yellow
            Write-Host "  请配置 GITHUB_TOKEN 环境变量" -ForegroundColor Yellow
            Write-Host "  查看 setup-github-token.md 了解详情`n" -ForegroundColor Cyan
        }
    }
    
    Start-Sleep -Seconds 1
}

# 测试 3: GET 方式获取仓库信息
Write-Host "`n[3] 测试 GET /api/github/repo-info?owner=&repo=..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/github/repo-info?owner=facebook&repo=react" `
        -Method Get `
        -TimeoutSec 10
    
    if ($response.success) {
        Write-Host "  ✓ 成功获取仓库信息" -ForegroundColor Green
        Write-Host "    名称: $($response.data.name)" -ForegroundColor White
        Write-Host "    Stars: $($response.data.stargazers_count)" -ForegroundColor White
    }
} catch {
    Write-Host "  ✗ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试 4: 错误情况
Write-Host "`n[4] 测试错误情况..." -ForegroundColor Cyan

# 4.1 无效 URL
Write-Host "  4.1 测试无效 URL..." -ForegroundColor Yellow
$body = @{ url = "https://not-github.com/invalid" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/github/repo-info" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 10
    Write-Host "    结果: $($response.message)" -ForegroundColor White
} catch {
    Write-Host "    ✓ 正确返回错误" -ForegroundColor Green
}

# 4.2 缺少参数
Write-Host "  4.2 测试缺少参数..." -ForegroundColor Yellow
$body = @{ } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/github/repo-info" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 10
    Write-Host "    结果: $($response.message)" -ForegroundColor White
} catch {
    Write-Host "    ✓ 正确返回错误" -ForegroundColor Green
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Green

# 提示
Write-Host "`n💡 提示:" -ForegroundColor Cyan
Write-Host "  - 如遇速率限制，请配置 GITHUB_TOKEN" -ForegroundColor White
Write-Host "  - 查看 setup-github-token.md 了解详情" -ForegroundColor White
Write-Host "  - 前端测试: 访问 http://localhost:5173/github-demo`n" -ForegroundColor White
