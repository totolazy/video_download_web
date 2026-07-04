@echo off
chcp 65001 >nul
title ?????? - ????
color 0b

echo ==================================================
echo   ?????? - ????
echo ==================================================
echo.
echo [0/4] ?? yt-dlp...
cd /d "%~dp0backend"
"venv\Scripts\python.exe" -m pip install -q yt-dlp bcrypt >nul 2>&1
echo       OK!

echo [1/4] ??????...
"venv\Scripts\python.exe" -c "import asyncio;from app.database import init_db;asyncio.run(init_db())" > "..\logs\database\init.log" 2>&1
echo       OK! ??: logs\database\init.log

echo [2/4] ???? FastAPI (port 8000)...
start "VDL-Backend" /MIN cmd /c "cd /d "%~dp0" && "venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level info > "..\logs\backend\server.log" 2>&1"
echo       ?????... ??: logs\backend\server.log

echo [3/4] ???? Vite (port 5173)...
cd /d "%~dp0..\frontend"
start "VDL-Frontend" /MIN cmd /c "npx vite --host 127.0.0.1 --port 5173 > "..\logs\frontend\server.log" 2>&1"
echo       ?????... ??: logs\frontend\server.log

echo [4/4] ?????? (8?)...
timeout /t 8 /nobreak >nul

echo       ?????...
start http://127.0.0.1:5173

echo.
echo ==================================================
echo   ????:  http://127.0.0.1:5173
echo   ?? API:  http://127.0.0.1:8000/docs
echo.
echo   ????:  root / Admin123!
echo.
echo   ????:
echo     ??:  logs\backend\server.log
echo     ??:  logs\frontend\server.log  
echo     ???: logs\database\init.log
echo.
echo   ????:
echo     Python --^> backend\venv (????)
echo     Node   --^> frontend\node_modules
echo   ??????????
echo.
echo   ??: ?? "VDL-Backend" ? "VDL-Frontend" ??
echo   ??: ?? test_cleanup.bat
echo ==================================================

pause
