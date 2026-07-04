@echo off
chcp 65001 >nul
title 视频下载网站 - 本地测试
echo ==================================================
echo   视频下载网站 - 本地测试启动
echo ==================================================
echo.
echo [1] 启动后端 (FastAPI, port 8000)...
cd /d "%~dp0backend"
start "Backend" cmd /c "venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo [2] 启动前端 (Vite, port 5173)...
cd /d "%~dp0frontend"
start "Frontend" cmd /c "npx vite --host 127.0.0.1 --port 5173"

echo [3] 等待服务就绪 (5秒)...
timeout /t 5 /nobreak >nul

echo [4] 打开浏览器...
start http://127.0.0.1:5173

echo.
echo ==================================================
echo   测试访问地址: http://127.0.0.1:5173
echo   后端 API:      http://127.0.0.1:8000
echo   root 账号:     root / Admin123!
echo ==================================================
echo.
echo 所有依赖在 backend\venv 和 frontend\node_modules 中
echo 关闭 cmd 窗口即可停止服务
echo 清理: 运行 test_cleanup.bat
pause
