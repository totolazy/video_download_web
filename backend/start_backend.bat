@echo off
cd /d "E:\Workspace\??????\backend"
if exist venv\Scripts\python.exe (
    venv\Scripts\python.exe -m pip install --no-cache-dir -q fastapi uvicorn sqlalchemy aiosqlite python-jose passlib python-multipart apscheduler pydantic-settings >nul 2>&1
    echo Dependencies installed
    start "Backend" /MIN venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
    echo Backend started
) else (
    echo Creating venv...
    python -m venv venv
    venv\Scripts\python.exe -m pip install --no-cache-dir -q fastapi uvicorn sqlalchemy aiosqlite python-jose passlib python-multipart apscheduler pydantic-settings >nul 2>&1
    echo Dependencies installed
    start "Backend" /MIN venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
    echo Backend started
)
