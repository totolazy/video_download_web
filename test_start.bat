@echo off
chcp 65001 >nul
title Video Download - One Click Start

echo ========================================
echo   Video Download Site - Startup
echo ========================================
echo.

set "ROOT=%~dp0"
set "VENV=%ROOT%venv"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "PYTHON=%VENV%\Scripts\python.exe"
set "LOGDIR=%ROOT%logs"
set "DBLOG=%LOGDIR%\database\init.log"

:: Create log dirs
if not exist "%LOGDIR%\backend" mkdir "%LOGDIR%\backend" 2>nul
if not exist "%LOGDIR%\frontend" mkdir "%LOGDIR%\frontend" 2>nul
if not exist "%LOGDIR%\database" mkdir "%LOGDIR%\database" 2>nul

:: ===== Step 1: Venv =====
echo [1/5] Checking Python virtual environment...
if not exist "%PYTHON%" (
    echo   Creating venv...
    cd /d "%ROOT%"
    python -m venv venv
    if %errorlevel% neq 0 (
        echo   [FAIL] Cannot create venv. Is Python 3.11+ installed?
        pause
        exit /b 1
    )
    echo   Done.
) else (
    echo   Already exists.
)

:: ===== Step 2: Backend deps =====
echo [2/5] Installing backend dependencies...
"%PYTHON%" -m pip install -r "%BACKEND%\requirements.txt" -i https://pypi.tuna.tsinghua.edu.cn/simple -q
if %errorlevel% neq 0 (
    echo   Mirror failed, trying default...
    "%PYTHON%" -m pip install -r "%BACKEND%\requirements.txt" -q
)
"%PYTHON%" -m pip install yt-dlp -i https://pypi.tuna.tsinghua.edu.cn/simple -q
if %errorlevel% neq 0 (
    "%PYTHON%" -m pip install yt-dlp -q
)
echo   Done.

:: Verify bcrypt
"%PYTHON%" -c "import bcrypt; h=bcrypt.hashpw(b'test',bcrypt.gensalt()); assert bcrypt.checkpw(b'test',h)" >nul 2>&1
if %errorlevel% neq 0 (
    echo   [WARN] bcrypt broken, reinstalling...
    "%PYTHON%" -m pip uninstall bcrypt passlib -y -q 2>nul
    "%PYTHON%" -m pip install bcrypt==4.0.1 -q
)

:: ===== Step 3: Frontend deps =====
echo [3/5] Installing frontend dependencies...
cd /d "%FRONTEND%"
if not exist node_modules (
    call npm install --silent
    echo   Done.
) else (
    echo   Already exists.
)

:: ===== Step 4: Init DB =====
echo [4/5] Initializing database...
cd /d "%BACKEND%"
"%PYTHON%" -c "import asyncio; from app.database import init_db; asyncio.run(init_db()); print('OK')" > "%DBLOG%" 2>&1
if %errorlevel% neq 0 (
    echo   [FAIL] DB init failed. See logs\database\init.log
    pause
    exit /b 1
)
echo   Database ready.

:: ===== Step 5: Start servers (background) =====
echo [5/5] Starting servers...
cd /d "%ROOT%"

:: Kill old
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000.*LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173.*LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul

:: Start backend (background via start)
echo   Starting backend on port 8000...
start "Backend" /MIN "%PYTHON%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --log-level warning

:: Start frontend (background via start)
echo   Starting frontend on port 5173...
start "Frontend" /MIN cmd /c "cd /d %FRONTEND% && npx vite --host 127.0.0.1 --port 5173"

:: Wait for startup
echo   Waiting for servers...
timeout /t 8 /nobreak >nul

echo.
echo ========================================
echo   Startup complete!
echo.
echo   Backend:  http://127.0.0.1:8000
echo   Frontend: http://127.0.0.1:5173
echo   Login:    root / Admin123!
echo.
echo   Logs:     logs\
echo ========================================
echo.
start "" http://127.0.0.1:5173
pause