#!/bin/bash

# ==============================================================================
#  StarUML Clean Uninstaller for macOS
# ==============================================================================
# This script completely removes StarUML and all of its configurations,
# extensions, cache files, and preferences from macOS.
# ==============================================================================

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}        StarUML Complete Uninstaller (macOS)      ${NC}"
echo -e "${BLUE}==================================================${NC}"

# 1. Verify Operating System
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}[ERROR] This script is only compatible with macOS.${NC}"
    exit 1
fi

# 2. Close StarUML if it is running
if pgrep -f "StarUML" > /dev/null; then
    echo -e "${YELLOW}[!] StarUML is running. Force closing...${NC}"
    pkill -f "StarUML" 2>/dev/null
    sleep 2
fi

# 3. Define paths to remove
PATHS_TO_REMOVE=(
    "/Applications/StarUML.app"
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

echo -e "${BLUE}[*] Deleting application files and configurations...${NC}"
for TARGET in "${PATHS_TO_REMOVE[@]}"; do
    if [ -e "$TARGET" ]; then
        echo -e "  - Removing: $TARGET"
        rm -rf "$TARGET"
    fi
done

# 4. Remove system crash reports related to StarUML
CRASH_REPORTS_DIR="$HOME/Library/Application Support/CrashReporter"
if [ -d "$CRASH_REPORTS_DIR" ]; then
    echo -e "${BLUE}[*] Checking for system crash reports...${NC}"
    find "$CRASH_REPORTS_DIR" -name "*StarUML*" -type f -exec rm -f {} \; -print | while read -r file; do
        echo -e "  - Removed crash report: $file"
    done
fi

# 5. Remove Recent Documents lists
RECENT_DOCS_DIR="$HOME/Library/Application Support/com.apple.sharedfilelist/com.apple.LSSharedFileList.ApplicationRecentDocuments"
if [ -d "$RECENT_DOCS_DIR" ]; then
    echo -e "${BLUE}[*] Checking for application recent documents history...${NC}"
    find "$RECENT_DOCS_DIR" -name "*staruml*" -type f -exec rm -f {} \; -print | while read -r file; do
        echo -e "  - Removed recent doc file: $file"
    done
fi

# 6. Final verification
echo -e "${BLUE}[*] Verifying if any StarUML files remain...${NC}"
REMAINING_FILES=$(find "$HOME/Library" -iname "*staruml*" 2>/dev/null)

if [ -z "$REMAINING_FILES" ]; then
    echo -e "${GREEN}[OK] StarUML has been completely and cleanly uninstalled!${NC}"
else
    echo -e "${YELLOW}[!] The following minor files could not be automatically deleted:${NC}"
    echo "$REMAINING_FILES"
    echo -e "${YELLOW}[!] You may delete them manually if desired.${NC}"
fi

echo -e "${BLUE}==================================================${NC}"
echo -e "${GREEN} Done! Restarting your Mac is recommended.${NC}"
echo -e "${BLUE}==================================================${NC}"
