@echo off
chcp 65001 >nul 2>&1
title Quant Dashboard

:: =============================================
::  Quant Dashboard - One-Click Launcher
::  Auto-installs deps & starts all services
:: =============================================

echo.
echo =============================================
echo    Quant Dashboard
echo    Personal Quantitative Monitoring System
echo =============================================
echo.

:: --- Check Node.js ---
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js (v18+)
    echo         Download: https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo [OK] Node.js %%i
for /f "tokens=*" %%i in ('npm -v') do echo [OK] npm %%i

:: --- Kill any existing node processes on common ports ---
echo.
echo Cleaning up existing processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: --- Install server dependencies ---
cd /d "%~dp0server"
echo.
echo [1/3] Installing server dependencies...
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] Server dependency install failed. Check network.
    pause
    exit /b 1
)
echo [OK] Server dependencies installed

:: --- Install client dependencies ---
cd /d "%~dp0client"
echo.
echo [2/3] Installing client dependencies...
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] Client dependency install failed. Check network.
    pause
    exit /b 1
)
echo [OK] Client dependencies installed

:: --- Start services ---
cd /d "%~dp0"
echo.
echo [3/3] Starting services...
echo.
echo =============================================
echo    Backend API:   http://localhost:3001
echo    WebSocket:     ws://localhost:3001  (same as API)
echo    Frontend:      http://localhost:5173
echo =============================================
echo.

:: Start backend in a new window
start "Quant-Backend" cmd /c "cd /d %~dp0server && echo Starting backend... && node app.js"
timeout /t 4 /nobreak >nul

:: Start frontend in a new window
start "Quant-Frontend" cmd /c "cd /d %~dp0client && echo Starting frontend... && npx vite --host 0.0.0.0"
timeout /t 4 /nobreak >nul

:: Open browser
start http://localhost:5173

echo.
echo =============================================
echo    System started!
echo    Close this window - services keep running.
echo    Close "Quant-Backend" and "Quant-Frontend"
echo    windows to stop services.
echo =============================================
echo.
pause
