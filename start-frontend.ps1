# ReelBox 前端测试启动脚本
# 启动后浏览器打开，按 F12 → Ctrl+Shift+M 切换移动端/桌面端

$projectDir = Join-Path $PSScriptRoot "frontend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ReelBox 前端开发服务器" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 杀掉占用 5173 端口的旧进程
$existing = netstat -ano | Select-String ":5173.*LISTENING"
if ($existing) {
    $pidStr = ($existing -split '\s+')[-1]
    Stop-Process -Id $pidStr -Force -ErrorAction SilentlyContinue
    Write-Host "已停止旧进程 (PID: $pidStr)" -ForegroundColor Gray
}

# 启动 Vite dev server
Write-Host "正在启动 Vite..." -ForegroundColor Green
Write-Host ""

Push-Location $projectDir
try {
    npx vite --host 0.0.0.0
} finally {
    Pop-Location
}
