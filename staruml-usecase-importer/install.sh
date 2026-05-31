#!/bin/bash
echo "============================================"
echo "  StarUML Use Case Importer - Installer"
echo "============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    TARGET="$HOME/Library/Application Support/StarUML/extensions/user/staruml-usecase-importer"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    TARGET="$HOME/.config/StarUML/extensions/user/staruml-usecase-importer"
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

# Create target directory
mkdir -p "$TARGET/menus"

# Copy files
echo "[*] Installing extension to:"
echo "    $TARGET"
echo ""

cp "$SCRIPT_DIR/main.js" "$TARGET/main.js"
cp "$SCRIPT_DIR/package.json" "$TARGET/package.json"
cp "$SCRIPT_DIR/menus/usecase-menu.json" "$TARGET/menus/usecase-menu.json"

echo "[OK] Installation complete!"
echo ""
echo "How to use:"
echo "  1. Open StarUML"
echo "  2. Create a Use Case Diagram (Model > Add Diagram > Use Case Diagram)"
echo '  3. Go to Tools > "Import Use Case from PlantUML..."'
echo "  4. Paste your PlantUML code and click OK"
