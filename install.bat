@echo off
chcp 65001 >nul
echo ============================================
echo   PlantUML Importer - Atomic Installer
echo ============================================
echo.

tasklist /FI "IMAGENAME eq StarUML.exe" 2>nul | find /I "StarUML.exe" >nul
if not errorlevel 1 echo [*] StarUML is running. Reload it after installation.

powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0scripts\native-path-safety.ps1" -Action Remove -Name "staruml-plantuml-importer"
if errorlevel 1 exit /B 1
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0scripts\native-path-safety.ps1" -Action Remove -Name "staruml-usecase-importer"
if errorlevel 1 exit /B 1
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0scripts\native-path-safety.ps1" -Action Install -Name "twot.staruml-plantuml-importer"
if errorlevel 1 exit /B 1

echo [OK] Installation complete!
pause
