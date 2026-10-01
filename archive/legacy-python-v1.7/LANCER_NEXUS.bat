@echo off
setlocal
cd /d "%~dp0"
title Nexus Launcher
if not exist "logs" mkdir "logs" >nul 2>&1

powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File ".\scripts\dev_windows.ps1"
set "NEXUS_EXIT=%ERRORLEVEL%"

if not "%NEXUS_EXIT%"=="0" (
  echo.
  echo ============================================================
  echo  NEXUS : LE DEMARRAGE A ECHOUE
  echo ============================================================
  echo Le detail est conserve dans :
  echo   %CD%\logs\startup.log
  echo.
  echo Cette fenetre NE se fermera pas tant que tu n'appuies pas.
  pause
)

endlocal & exit /b %NEXUS_EXIT%
