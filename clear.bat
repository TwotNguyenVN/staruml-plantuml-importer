@echo off
chcp 65001 >nul
echo =================================================
echo    PlantUML Importer - Atomic Extension Removal
echo =================================================
echo.

choice /C YN /N /M "[?] Remove the PlantUML Importer extension from StarUML? [Y/N]: "
if errorlevel 2 goto cancelled
if not errorlevel 1 goto cancelled

powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0scripts\native-path-safety.ps1" -Action Remove -Name "twot.staruml-plantuml-importer"
if errorlevel 1 exit /B 1
echo [OK] PlantUML Importer extension removed.
goto end

:cancelled
echo [*] Extension removal cancelled.

:end
pause
