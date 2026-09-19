@echo off
setlocal
cd /d "%~dp0"
title Nexus Launcher - DEBUG
if not exist "logs" mkdir "logs" >nul 2>&1

echo ============================================================
echo  NEXUS DEBUG - cette fenetre restera toujours ouverte
echo ============================================================
echo.
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File ".\scripts\dev_windows.ps1"
set "NEXUS_EXIT=%ERRORLEVEL%"
echo.
echo Nexus s'est termine avec le code %NEXUS_EXIT%.
echo Log : %CD%\logs\startup.log
echo.
pause
endlocal & exit /b %NEXUS_EXIT%
