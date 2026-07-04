@echo off
chcp 65001 >nul
title ??????
color 0e

echo ==================================================
echo   ????????
echo ==================================================
echo.

echo [1/5] ????????...
taskkill /fi "WINDOWTITLE eq VideoDL-Backend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq VideoDL-Frontend*" /f >nul 2>&1
echo       OK

echo [2/5] ?? Python ????...
set "VENV_DIR=%~dp0backend\venv"
if exist "%VENV_DIR%" (
    rmdir /s /q "%VENV_DIR%"
    echo       OK - backend\venv ???
) else (
    echo       ?? - venv ???
)

echo [3/5] ?? node_modules...
set "NM_DIR=%~dp0frontend\node_modules"
if exist "%NM_DIR%" (
    rmdir /s /q "%NM_DIR%"
    echo       OK - frontend\node_modules ???
) else (
    echo       ?? - node_modules ???
)

echo [4/5] ?? Python ?????????...
for /d /r "%~dp0backend" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d"
if exist "%~dp0frontend\dist" rmdir /s /q "%~dp0frontend\dist"
if exist "%~dp0frontend\package-lock.json" del /q "%~dp0frontend\package-lock.json"
echo       OK

echo [5/5] ??????...
if exist "%~dp0data\videos" rmdir /s /q "%~dp0data\videos"
if exist "%~dp0data\cookies" rmdir /s /q "%~dp0data\cookies"
if exist "%~dp0data\app.db" del /q "%~dp0data\app.db"
echo       OK

echo.
echo ==================================================
echo   ????????:
echo   [X] backend\venv           (Python ????)
echo   [X] frontend\node_modules   (npm ??)
echo   [X] __pycache__             (Python ??)
echo   [X] data\app.db / videos / cookies (????)
echo.
echo   [O] ?? Python  -- ????
echo   [O] ?? npm     -- ????
echo   [O] ???       -- ????
echo ==================================================

pause
