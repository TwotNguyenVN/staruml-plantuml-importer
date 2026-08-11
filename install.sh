#!/bin/bash
set -e

echo "============================================"
echo "  PlantUML Importer - Installer"
echo "============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/scripts/native-path-safety.sh"

EXTENSION_ROOT="$(resolve_extension_root "$OSTYPE")"
validate_install_paths "$EXTENSION_ROOT"
remove_extension_atomic "$EXTENSION_ROOT" "staruml-plantuml-importer"
remove_extension_atomic "$EXTENSION_ROOT" "staruml-usecase-importer"
install_extension_atomic "$EXTENSION_ROOT" "$SCRIPT_DIR"

echo "[*] Installed extension under the validated StarUML user-extension root."
echo "[OK] Installation complete!"
echo ""
echo "How to use:"
echo "  1. Open StarUML"
echo "  2. Create a specific Diagram depending on your code"
echo "  3. Go to Tools > PlantUML Importer > \"Import ...\""
echo "  4. Paste your PlantUML code and click OK"
