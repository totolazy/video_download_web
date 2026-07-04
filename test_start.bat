@echo off
chcp 65001 >nul
title ?????? - ????
color 0b

echo ==================================================
echo   ?????? - ????
echo ==================================================
echo.

echo [1/3] ???? FastAPI (port 8000)...
start "VideoDL-Backend" /MIN cmd /c "cd /d "%~dp0backend" && "venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
echo       ?????...

echo [2/3] ???? Vite (port 5173)...
start "VideoDL-Frontend" /MIN cmd /c "cd /d "%~dp0frontend" && npx vite --host 127.0.0.1 --port 5173"
echo       ?????...

echo [3/3] ?????? (8?)...
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
echo     Python --^> backend\venv (????)
echo     Node   --^> frontend\node_modules
echo   ??????????
echo.
echo   ??: ???? "VideoDL-" ??
echo   ??: ?? test_cleanup.bat
echo ==================================================

pause
