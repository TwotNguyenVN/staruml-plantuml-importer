@echo off
chcp 65001 >nul
echo ============================================
echo   StarUML Use Case Importer - Installer
echo ============================================
echo.

set "TARGET=%APPDATA%\StarUML\extensions\user\staruml-usecase-importer"

:: Close StarUML if running
tasklist /FI "IMAGENAME eq StarUML.exe" 2>nul | find /I "StarUML.exe" >nul
if not errorlevel 1 (
    echo [!] StarUML is running. Closing...
    taskkill /F /IM StarUML.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

:: Create target directory
if not exist "%TARGET%" (
    mkdir "%TARGET%\menus"
)

:: Copy files
echo [*] Installing extension to:
echo     %TARGET%
echo.

copy /Y "%~dp0main.js" "%TARGET%\main.js" >nul
copy /Y "%~dp0package.json" "%TARGET%\package.json" >nul
if not exist "%TARGET%\menus" mkdir "%TARGET%\menus"
copy /Y "%~dp0menus\usecase-menu.json" "%TARGET%\menus\usecase-menu.json" >nul

echo [OK] Installation complete!
echo.
echo How to use:
echo   1. Open StarUML
echo   2. Create a Use Case Diagram (Model ^> Add Diagram ^> Use Case Diagram)
echo   3. Go to Tools ^> "Import Use Case from PlantUML..."
echo   4. Paste your PlantUML code and click OK
echo.
pause
