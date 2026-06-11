@echo off
chcp 65001 >nul
echo ============================================
echo   StarUML PlantUML Importer - Installer
echo ============================================
echo.

set "TARGET=%APPDATA%\StarUML\extensions\user\staruml-plantuml-importer"
set "OLD_TARGET=%APPDATA%\StarUML\extensions\user\staruml-usecase-importer"

:: Close StarUML if running
tasklist /FI "IMAGENAME eq StarUML.exe" 2>nul | find /I "StarUML.exe" >nul
if not errorlevel 1 (
    echo [!] StarUML is running. Closing...
    taskkill /F /IM StarUML.exe >nul 2>&1
    ping 127.0.0.1 -n 3 >nul
)

:: Clean up old extension
if exist "%OLD_TARGET%" (
    echo [*] Removing old extension...
    rmdir /S /Q "%OLD_TARGET%"
)

:: Create target directories
if not exist "%TARGET%" mkdir "%TARGET%"
if not exist "%TARGET%\menus" mkdir "%TARGET%\menus"
if not exist "%TARGET%\utils" mkdir "%TARGET%\utils"
if not exist "%TARGET%\parsers" mkdir "%TARGET%\parsers"
if not exist "%TARGET%\keymaps" mkdir "%TARGET%\keymaps"

:: Copy files
echo [*] Installing extension to:
echo     %TARGET%
echo.

copy /Y "%~dp0PlantUML_Importer.png" "%TARGET%\PlantUML_Importer.png" >nul
copy /Y "%~dp0main.js" "%TARGET%\main.js" >nul
copy /Y "%~dp0package.json" "%TARGET%\package.json" >nul
copy /Y "%~dp0menus\menu.json" "%TARGET%\menus\menu.json" >nul
copy /Y "%~dp0keymaps\keymap.json" "%TARGET%\keymaps\keymap.json" >nul
copy /Y "%~dp0utils\dialog-helper.js" "%TARGET%\utils\dialog-helper.js" >nul
copy /Y "%~dp0parsers\usecase-parser.js" "%TARGET%\parsers\usecase-parser.js" >nul
copy /Y "%~dp0parsers\class-parser.js" "%TARGET%\parsers\class-parser.js" >nul
copy /Y "%~dp0parsers\sequence-parser.js" "%TARGET%\parsers\sequence-parser.js" >nul
copy /Y "%~dp0parsers\activity-parser.js" "%TARGET%\parsers\activity-parser.js" >nul
copy /Y "%~dp0parsers\state-parser.js" "%TARGET%\parsers\state-parser.js" >nul
copy /Y "%~dp0parsers\erd-parser.js" "%TARGET%\parsers\erd-parser.js" >nul

echo [OK] Installation complete!
echo.
echo How to use:
echo   1. Open StarUML
echo   2. Create a Use Case or Class Diagram (Model ^> Add Diagram)
echo   3. Go to Tools ^> PlantUML Importer ^> "Import ..."
echo   4. Paste your PlantUML code and click OK
echo.
pause
