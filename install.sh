#!/bin/bash
echo "============================================"
echo "  StarUML PlantUML Importer - Installer"
echo "============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    TARGET="$HOME/Library/Application Support/StarUML/extensions/user/staruml-plantuml-importer"
    OLD_TARGET="$HOME/Library/Application Support/StarUML/extensions/user/staruml-usecase-importer"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    TARGET="$HOME/.config/StarUML/extensions/user/staruml-plantuml-importer"
    OLD_TARGET="$HOME/.config/StarUML/extensions/user/staruml-usecase-importer"
else
    echo "[ERROR] Unsupported OS: $OSTYPE"
    exit 1
fi

# Kill StarUML if running
if pgrep -x "StarUML" > /dev/null 2>&1; then
    echo "[!] StarUML is running. Closing..."
    pkill -x "StarUML"
    sleep 2
fi

# Clean up old extension
if [ -d "$OLD_TARGET" ]; then
    echo "[*] Removing old extension..."
    rm -rf "$OLD_TARGET"
fi

# Create target directories
mkdir -p "$TARGET/menus"
mkdir -p "$TARGET/utils"
mkdir -p "$TARGET/parsers"

# Copy files
echo "[*] Installing extension to:"
echo "    $TARGET"
echo ""

cp "$SCRIPT_DIR/main.js" "$TARGET/main.js"
cp "$SCRIPT_DIR/package.json" "$TARGET/package.json"
cp "$SCRIPT_DIR/menus/menu.json" "$TARGET/menus/menu.json"
cp "$SCRIPT_DIR/utils/dialog-helper.js" "$TARGET/utils/dialog-helper.js"
cp "$SCRIPT_DIR/parsers/usecase-parser.js" "$TARGET/parsers/usecase-parser.js"
cp "$SCRIPT_DIR/parsers/class-parser.js" "$TARGET/parsers/class-parser.js"
cp "$SCRIPT_DIR/parsers/sequence-parser.js" "$TARGET/parsers/sequence-parser.js"
cp "$SCRIPT_DIR/parsers/activity-parser.js" "$TARGET/parsers/activity-parser.js"
cp "$SCRIPT_DIR/parsers/state-parser.js" "$TARGET/parsers/state-parser.js"

echo "[OK] Installation complete!"
echo ""
echo "How to use:"
echo "  1. Open StarUML"
echo "  2. Create a Use Case or Class Diagram (Model > Add Diagram)"
echo '  3. Go to Tools > PlantUML Importer > "Import ..."'
echo "  4. Paste your PlantUML code and click OK"
echo ""
