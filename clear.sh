#!/bin/bash

# Ensure script stops on critical failures
set -e

echo "================================================="
echo "   StarUML Uninstaller - Clean Uninstallation   "
echo "================================================="

# 1. Check Operating System
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "[ERROR] This script only supports macOS!"
    exit 1
fi

# 2. User Confirmation
read -p "[?] Are you sure you want to completely uninstall StarUML and delete all configuration? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "[*] Uninstallation cancelled."
    exit 0
fi

# 3. Terminate running StarUML processes
echo "[*] Closing StarUML processes..."
pkill -f "StarUML" 2>/dev/null || true
sleep 1

# 4. Remove main Application
if [ -d "/Applications/StarUML.app" ]; then
    echo "[*] Removing main application from /Applications..."
    # Check write permission for /Applications directory
    if [ -w "/Applications" ]; then
        rm -rf "/Applications/StarUML.app"
    else
        echo "[!] Admin privileges (sudo) required to remove application from Applications folder:"
        sudo rm -rf "/Applications/StarUML.app"
    fi
else
    echo "[*] StarUML.app not found in /Applications."
fi

# 5. Remove configurations, caches, logs for current user
echo "[*] Cleaning configuration data and caches..."

paths_to_remove=(
    "$HOME/Library/Application Support/StarUML"
    "$HOME/Library/Caches/io.staruml.StarUML"
    "$HOME/Library/Caches/StarUML"
    "$HOME/Library/Preferences/io.staruml.StarUML.plist"
    "$HOME/Library/Preferences/com.staruml.StarUML.plist"
    "$HOME/Library/Logs/StarUML"
    "$HOME/Library/Logs/io.staruml.StarUML"
    "$HOME/Library/Saved Application State/io.staruml.StarUML.savedState"
    "$HOME/Library/Saved Application State/com.staruml.StarUML.savedState"
)

for p in "${paths_to_remove[@]}"; do
    if [ -e "$p" ]; then
        echo "  - Removing: $p"
        rm -rf "$p"
    fi
done

# 6. Clean specific CrashReporter logs & Recent Document lists
echo "[*] Locating and removing additional files..."

# Find and delete crash reports related to StarUML
find "$HOME/Library/Application Support/CrashReporter" -iname "*staruml*" -exec rm -f {} \; 2>/dev/null || true

# Find and delete recent document history files
find "$HOME/Library/Application Support/com.apple.sharedfilelist" -iname "*staruml*" -exec rm -f {} \; 2>/dev/null || true

echo "[OK] Cleanup complete!"

# 7. Scan for any remaining files
echo "[*] Scanning for any remaining files..."
# Exclude the workspace/script directory itself from the search
remaining_files=$(find "$HOME/Library" -iname "*staruml*" 2>/dev/null | grep -v "staruml-plantuml-importer" || true)

if [ -n "$remaining_files" ]; then
    echo "[!] Found potentially related files remaining (please review manually):"
    echo "$remaining_files"
else
    echo "[OK] StarUML has been completely removed from your system!"
fi

echo "================================================="

