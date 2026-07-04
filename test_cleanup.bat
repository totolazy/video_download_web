@echo off
chcp 65001 >nul
title 清理测试环境
echo ==================================================
echo   清理本地测试环境
echo ==================================================
echo.
echo [1] 停止所有测试进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "127.0.0.1:8000"') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "127.0.0.1:5173"') do taskkill /f /pid %%a >nul 2>nul
echo [OK] 进程已停止

echo [2] 删除 Python 虚拟环境 (backend\venv)...
if exist "%~dp0backend\venv" (
    rmdir /s /q "%~dp0backend\venv"
    echo [OK] venv 已删除
) else (
    echo [跳过] venv 不存在
)

echo [3] 删除前端 node_modules...
if exist "%~dp0frontend\node_modules" (
    rmdir /s /q "%~dp0frontend\node_modules"
    echo [OK] node_modules 已删除
) else (
    echo [跳过] node_modules 不存在
)

echo [4] 清理其他生成文件...
if exist "%~dp0frontend\package-lock.json" del /q "%~dp0frontend\package-lock.json" >nul
if exist "%~dp0frontend\dist" rmdir /s /q "%~dp0frontend\dist" >nul 2>nul
for /d %%d in ("%~dp0backend\app\__pycache__") do rmdir /s /q "%%d" >nul 2>nul
for /d %%d in ("%~dp0backend\app\core\__pycache__") do rmdir /s /q "%%d" >nul 2>nul
for /d %%d in ("%~dp0backend\app\models\__pycache__") do rmdir /s /q "%%d" >nul 2>nul
for /d %%d in ("%~dp0backend\app\schemas\__pycache__") do rmdir /s /q "%%d" >nul 2>nul
for /d %%d in ("%~dp0backend\app\routers\__pycache__") do rmdir /s /q "%%d" >nul 2>nul
for /d %%d in ("%~dp0backend\app\services\__pycache__") do rmdir /s /q "%%d" >nul 2>nul
for /d %%d in ("%~dp0backend\app\utils\__pycache__") do rmdir /s /q "%%d" >nul 2>nul
echo [OK] pycache 已清除

echo [5] 删除测试数据...
if exist "%~dp0data\videos" rmdir /s /q "%~dp0data\videos" >nul 2>nul
if exist "%~dp0data\cookies" rmdir /s /q "%~dp0data\cookies" >nul 2>nul
if exist "%~dp0data\app.db" del /q "%~dp0data\app.db" >nul
echo [OK] 测试数据已清除

echo.
echo ==================================================
echo   清理完成！
echo ==================================================
echo   X backend\venv        - 已删除（虚拟环境）
echo   X frontend\node_modules - 已删除（npm 依赖）
echo   X __pycache__          - 已删除（Python 缓存）
echo   X data\*               - 已删除（测试数据）
echo   O 系统 Python - 未受影响
echo   O 系统 npm    - 未受影响
echo ==================================================
pause
