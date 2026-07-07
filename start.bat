@echo off
title Travel AI - Starting...

echo.
echo ========================================
echo   Travel AI Assistant v2.0
echo   Starting services...
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Starting backend (port 3000)...
start "Travel-Server" cmd /k "cd /d server && npm run dev"

timeout /t 4 /nobreak >nul

echo [2/2] Starting frontend (port 5174)...
start "Travel-Frontend" cmd /k "cd /d travel-h5 && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Opening browser...
start http://localhost:5174

echo.
echo ========================================
echo   All services started!
echo.
echo   Frontend : http://localhost:5174
echo   Backend  : http://localhost:3000
echo   Health   : http://localhost:3000/api/health
echo.
echo   Admin: admin / admin123
echo.
echo   Run stop.bat to stop all services.
echo ========================================
echo.

pause
