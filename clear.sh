#!/bin/bash

# Ensure script stops on critical failures
set -e

echo "================================================="
echo "   StarUML Uninstaller - Clean Uninstallation   "
echo "================================================="

# 1. Check Operating System
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "[ERROR] Script này chỉ hỗ trợ hệ điều hành macOS!"
    exit 1
fi

# 2. User Confirmation
read -p "[?] Bạn có chắc chắn muốn xóa triệt để StarUML và toàn bộ cấu hình? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "[*] Đã hủy tác vụ."
    exit 0
fi

# 3. Terminate running StarUML processes
echo "[*] Đang tắt các tiến trình StarUML..."
pkill -f "StarUML" 2>/dev/null || true
sleep 1

# 4. Remove main Application
if [ -d "/Applications/StarUML.app" ]; then
    echo "[*] Đang xóa ứng dụng chính trong /Applications..."
    # Check write permission for /Applications directory
    if [ -w "/Applications" ]; then
        rm -rf "/Applications/StarUML.app"
    else
        echo "[!] Yêu cầu quyền Admin (sudo) để xóa ứng dụng trong thư mục Applications:"
        sudo rm -rf "/Applications/StarUML.app"
    fi
else
    echo "[*] Không tìm thấy ứng dụng StarUML.app trong /Applications."
fi

# 5. Remove configurations, caches, logs for current user
echo "[*] Đang dọn dẹp dữ liệu cấu hình và cache..."

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
        echo "  - Đang xóa: $p"
        rm -rf "$p"
    fi
done

# 6. Clean specific CrashReporter logs & Recent Document lists
echo "[*] Đang tìm và xóa các file rác phát sinh..."

# Find and delete crash reports related to StarUML
find "$HOME/Library/Application Support/CrashReporter" -iname "*staruml*" -exec rm -f {} \; 2>/dev/null || true

# Find and delete recent document history files
find "$HOME/Library/Application Support/com.apple.sharedfilelist" -iname "*staruml*" -exec rm -f {} \; 2>/dev/null || true

echo "[OK] Đã hoàn tất dọn dẹp!"

# 7. Scan for any remaining files
echo "[*] Đang quét kiểm tra các file còn lại..."
# Exclude the workspace/script directory itself from the search
remaining_files=$(find "$HOME/Library" -iname "*staruml*" 2>/dev/null | grep -v "staruml-plantuml-importer" || true)

if [ -n "$remaining_files" ]; then
    echo "[!] Phát hiện một số file có thể liên quan còn sót lại (vui lòng kiểm tra thủ công):"
    echo "$remaining_files"
else
    echo "[OK] StarUML đã được xóa sạch hoàn toàn khỏi hệ thống!"
fi

echo "================================================="
