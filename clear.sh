#!/bin/bash
set -e

echo "================================================="
echo "   PlantUML Importer - Extension Removal"
echo "================================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/scripts/native-path-safety.sh"

EXTENSION_ROOT="$(resolve_extension_root "$OSTYPE")"
validate_install_paths "$EXTENSION_ROOT"

read -r -p "[?] Remove the PlantUML Importer extension from StarUML? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "[*] Extension removal cancelled."
    exit 0
fi

remove_extension_atomic "$EXTENSION_ROOT" "twot.staruml-plantuml-importer"
echo "[OK] PlantUML Importer extension removed."
