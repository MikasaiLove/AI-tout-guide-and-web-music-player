@echo off
title Stopping services...

echo Stopping all services...

taskkill /FI "WINDOWTITLE eq Travel-Server*" /F 2>nul
taskkill /FI "WINDOWTITLE eq Travel-Frontend*" /F 2>nul
taskkill /IM node.exe /F 2>nul

echo Done. All services stopped.
pause
