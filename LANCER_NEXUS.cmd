@echo off
setlocal
set "APP_DIR=%~dp0frontend"
set "ELECTRON_EXE=%APP_DIR%\node_modules\electron\dist\electron.exe"

if not exist "%APP_DIR%\package.json" (
  echo Nexus Launcher: dossier frontend introuvable.
  goto :error
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Nexus Launcher: Node.js et npm sont requis. Installez Node.js puis relancez ce fichier.
  goto :error
)

if not exist "%ELECTRON_EXE%" (
  echo Nexus Launcher: dependances absentes. Lancez "npm ci" dans "%APP_DIR%".
  goto :error
)

if /I "%~1"=="--check" (
  echo Nexus Launcher: environnement pret.
  exit /b 0
)

pushd "%APP_DIR%" || goto :error
echo Preparation de Nexus Launcher...
call npm run build
if errorlevel 1 (
  popd
  echo La construction a echoue. Consultez les erreurs ci-dessus.
  goto :error
)

rem Some developer shells set this variable; Electron must run as a desktop app.
set "ELECTRON_RUN_AS_NODE="
start "" /D "%APP_DIR%" "%ELECTRON_EXE%" .
if errorlevel 1 (
  popd
  echo Le demarrage de Nexus Launcher a echoue.
  goto :error
)
popd
exit /b 0

:error
if /I not "%~1"=="--check" pause
exit /b 1
