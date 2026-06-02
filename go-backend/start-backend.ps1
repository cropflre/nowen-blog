# GitHub Token 配置和后端启动脚本

Write-Host "=== NOWEN Blog 后端启动（带 GitHub Token 配置）===" -ForegroundColor Green

# 检查是否设置了 GITHUB_TOKEN
if (-not $env:GITHUB_TOKEN) {
    Write-Host "`n⚠️  警告: 未设置 GITHUB_TOKEN 环境变量" -ForegroundColor Yellow
    Write-Host "GitHub API 将受到速率限制 (60次/小时)`n" -ForegroundColor Yellow
    
    # 提示用户配置
    Write-Host "请选择操作:" -ForegroundColor Cyan
    Write-Host "  1. 输入 Token (临时设置，当前会话有效)" -ForegroundColor White
    Write-Host "  2. 跳过，继续启动（可能会遇到速率限制）" -ForegroundColor White
    Write-Host "  3. 查看如何获取 Token" -ForegroundColor White
    Write-Host "  4. 退出" -ForegroundColor White
    
    $choice = Read-Host "`n请选择 (1-4)"
    
    switch ($choice) {
        "1" {
            $token = Read-Host "请输入 GitHub Token (ghp_xxx...)"
            if ($token) {
                $env:GITHUB_TOKEN = $token
                Write-Host "✓ Token 已设置（当前会话）" -ForegroundColor Green
            }
        }
        "2" {
            Write-Host "继续启动（未配置 Token）..." -ForegroundColor Yellow
        }
        "3" {
            Write-Host "`n📖 如何获取 GitHub Token:" -ForegroundColor Cyan
            Write-Host "  1. 访问: https://github.com/settings/tokens" -ForegroundColor White
            Write-Host "  2. 点击 'Generate new token' > 'Generate new token (classic)'" -ForegroundColor White
            Write-Host "  3. Note: NOWEN Blog Development" -ForegroundColor White
            Write-Host "  4. Expiration: 90 days" -ForegroundColor White
            Write-Host "  5. Scopes: 勾选 'public_repo'" -ForegroundColor White
            Write-Host "  6. 点击 'Generate token' 并复制`n" -ForegroundColor White
            pause
            $token = Read-Host "请输入 GitHub Token (ghp_xxx...)"
            if ($token) {
                $env:GITHUB_TOKEN = $token
                Write-Host "✓ Token 已设置（当前会话）" -ForegroundColor Green
            }
        }
        default {
            Write-Host "退出" -ForegroundColor Yellow
            exit 1
        }
    }
} else {
    Write-Host "✓ GITHUB_TOKEN 已配置" -ForegroundColor Green
    Write-Host "  Token: $($env:GITHUB_TOKEN.Substring(0, [Math]::Min(10, $env:GITHUB_TOKEN.Length)))...`n" -ForegroundColor Cyan
}

# 设置端口
$env:PORT = "8080"

# 切换到后端目录
Set-Location $PSScriptRoot

Write-Host "🚀 启动后端服务..." -ForegroundColor Green
Write-Host "   端口: $env:PORT" -ForegroundColor Cyan
Write-Host "   按 Ctrl+C 停止服务`n" -ForegroundColor Cyan

# 启动服务
go run main.go github.go
