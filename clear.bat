@echo off
chcp 65001 >nul
echo =================================================
echo    StarUML Uninstaller - Clean Uninstallation   
echo =================================================
echo.

:: Confirm with user
set /p confirm="[?] Are you sure you want to completely uninstall StarUML and delete all configurations? (y/N): "
if /i "%confirm%" neq "y" (
    echo [*] Uninstallation cancelled.
    goto end
)

:: 1. Close StarUML if running
echo [*] Closing StarUML processes...
tasklist /FI "IMAGENAME eq StarUML.exe" 2>nul | find /I "StarUML.exe" >nul
if not errorlevel 1 (
    taskkill /F /IM StarUML.exe >nul 2>&1
    ping 127.0.0.1 -n 2 >nul
)

:: 2. Run official Uninstaller silently if exists
echo [*] Running official uninstaller...
set "USER_UNINSTALL=%LocalAppData%\Programs\StarUML\Uninstall StarUML.exe"
set "SYSTEM_UNINSTALL=%ProgramFiles%\StarUML\Uninstall StarUML.exe"

if exist "%USER_UNINSTALL%" (
    start "" /wait "%USER_UNINSTALL%" /S
) else if exist "%SYSTEM_UNINSTALL%" (
    start "" /wait "%SYSTEM_UNINSTALL%" /S
) else (
    echo [*] Official uninstaller not found. Proceeding with manual file cleanup.
)

:: 3. Delete config, cache, and app folders
echo [*] Cleaning configuration files and caches...

:: APPDATA (Roaming) folder
if exist "%APPDATA%\StarUML" (
    echo   - Removing: %APPDATA%\StarUML
    rmdir /S /Q "%APPDATA%\StarUML"
)

:: LOCALAPPDATA folders
if exist "%LocalAppData%\Programs\StarUML" (
    echo   - Removing: %LocalAppData%\Programs\StarUML
    rmdir /S /Q "%LocalAppData%\Programs\StarUML"
)
if exist "%LocalAppData%\staruml-updater" (
    echo   - Removing: %LocalAppData%\staruml-updater
    rmdir /S /Q "%LocalAppData%\staruml-updater"
)

:: Program Files system folder (if installed for all users)
if exist "%ProgramFiles%\StarUML" (
    echo   - Removing: %ProgramFiles%\StarUML
    rmdir /S /Q "%ProgramFiles%\StarUML"
)

echo.
echo [OK] StarUML has been completely removed from your system!
echo.

:end
pause
