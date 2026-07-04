@echo off
chcp 65001 >nul
title Video Download - Cleanup

echo ========================================
echo   Video Download Site - Cleanup
echo ========================================
echo.

set "ROOT=%~dp0"

:: Kill servers
echo [1/3] Stopping servers...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
echo   Done.

:: Clean data
echo [2/3] Cleaning data...
if exist "%ROOT%data\app.db" del /q "%ROOT%data\app.db" 2>nul
if exist "%ROOT%data\videos" rmdir /s /q "%ROOT%data\videos" 2>nul & mkdir "%ROOT%data\videos" 2>nul
if exist "%ROOT%data\cookies" rmdir /s /q "%ROOT%data\cookies" 2>nul & mkdir "%ROOT%data\cookies" 2>nul
echo   Done.

:: Clean logs
echo [3/3] Cleaning logs...
if exist "%ROOT%logs\backend" del /q "%ROOT%logs\backend\*.log" 2>nul
if exist "%ROOT%logs\frontend" del /q "%ROOT%logs\frontend\*.log" 2>nul
if exist "%ROOT%logs\database" del /q "%ROOT%logs\database\*.log" 2>nul
if exist "%ROOT%logs\uvi_err.log" del /q "%ROOT%logs\uvi_err.log" 2>nul
if exist "%ROOT%logs\uvi_out.log" del /q "%ROOT%logs\uvi_out.log" 2>nul
echo   Done.

echo.
echo ========================================
echo   Cleanup complete!
echo   Run test_start.bat to start fresh.
echo ========================================
pause