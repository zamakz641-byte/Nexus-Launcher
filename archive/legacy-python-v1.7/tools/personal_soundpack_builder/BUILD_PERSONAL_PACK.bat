@echo off
setlocal
cd /d "%~dp0"
if not exist "user_sounds" mkdir "user_sounds"
echo.
echo Place dans user_sounds exactement ces 10 fichiers:
echo focus / confirm / back / launch / success / toggle / hover / wake / sleep / startup
echo Formats: .wav .ogg .mp3 .m4a
echo.
py -3 build_personal_pack.py "%CD%\user_sounds"
if errorlevel 1 python build_personal_pack.py "%CD%\user_sounds"
echo.
pause
