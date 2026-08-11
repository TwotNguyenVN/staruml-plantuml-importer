#!/bin/bash

CURRENT_EXTENSION_NAME="twot.staruml-plantuml-importer"

validate_extension_name() {
    case "$1" in
        twot.staruml-plantuml-importer|staruml-plantuml-importer|staruml-usecase-importer) return 0 ;;
        *) echo "[ERROR] Refusing unknown or unsafe extension name." >&2; return 1 ;;
    esac
}

validate_absolute_normalized_path() {
    local candidate="$1"
    case "$candidate" in
        /*) ;;
        *) echo "[ERROR] Extension root must be absolute." >&2; return 1 ;;
    esac
    case "$candidate/" in
        *"/./"*|*"/../"*|*"//"*)
            echo "[ERROR] Extension root must be lexically normalized." >&2
            return 1
            ;;
    esac
    [ "$candidate" = "/" ] || [ "${candidate%/}" = "$candidate" ] || {
        echo "[ERROR] Extension root must not have a trailing separator." >&2
        return 1
    }
}

assert_no_linked_components() {
    local candidate="$1"
    local current="/"
    local component
    local components=()
    IFS='/' read -r -a components <<< "${candidate#/}"
    for component in "${components[@]}"; do
        [ -n "$component" ] || continue
        current="${current%/}/$component"
        if [ -L "$current" ]; then
            echo "[ERROR] Refusing linked path component: $current" >&2
            return 1
        fi
    done
}

validate_root_before_creation() {
    local root="$1"
    local nearest="$root"
    local parent canonical_nearest
    validate_absolute_normalized_path "$root"
    assert_no_linked_components "$root"
    while [ ! -e "$nearest" ] && [ ! -L "$nearest" ]; do
        parent="$(dirname -- "$nearest")"
        [ "$parent" != "$nearest" ] || break
        nearest="$parent"
    done
    [ -d "$nearest" ] && [ ! -L "$nearest" ] || {
        echo "[ERROR] Nearest existing root ancestor is invalid or linked." >&2
        return 1
    }
    canonical_nearest="$(cd -P -- "$nearest" && pwd)"
    [ "$canonical_nearest" = "$nearest" ] || {
        echo "[ERROR] Extension root ancestor is not canonical." >&2
        return 1
    }
    case "$root/" in
        "$nearest/"*) ;;
        *) echo "[ERROR] Intended root escapes its existing ancestor." >&2; return 1 ;;
    esac
}

validate_install_paths() {
    local root="$1"
    validate_root_before_creation "$root"
    if [ -e "$root" ]; then
        [ -d "$root" ] && [ ! -L "$root" ] || {
            echo "[ERROR] Extension root is invalid or linked." >&2
            return 1
        }
        [ "$(cd -P -- "$root" && pwd)" = "$root" ] || {
            echo "[ERROR] Extension root is not canonical." >&2
            return 1
        }
    fi
}

ensure_canonical_root() {
    local root="$1"
    validate_install_paths "$root"
    mkdir -p -- "$root"
    validate_install_paths "$root"
}

assert_immediate_child() {
    local root="$1"
    local child="$2"
    local expected_name="$3"
    [ "$(dirname -- "$child")" = "$root" ] && [ "$(basename -- "$child")" = "$expected_name" ] || {
        echo "[ERROR] Entry is not the expected immediate child of the extension root." >&2
        return 1
    }
}

assert_no_linked_tree() {
    [ -z "$(find "$1" -type l -print -quit)" ] || {
        echo "[ERROR] Staging tree contains a linked entry." >&2
        return 1
    }
}

remove_entry_no_follow() {
    local entry="$1"
    if [ -L "$entry" ] || [ -f "$entry" ]; then
        rm -f -- "$entry"
    elif [ -d "$entry" ]; then
        rm -rf -- "$entry"
    elif [ -e "$entry" ]; then
        rm -f -- "$entry"
    fi
}

move_entry_atomic() {
    if [ "${STARUML_NATIVE_TEST_MODE:-}" = "1" ] && [ "${STARUML_NATIVE_TEST_FAIL_RENAME:-}" = "1" ]; then
        echo "[ERROR] Atomic rename failure injected for isolated testing." >&2
        return 1
    fi
    [ ! -e "$2" ] && [ ! -L "$2" ] || {
        echo "[ERROR] Atomic rename destination already exists." >&2
        return 1
    }
    mv -- "$1" "$2"
}

promote_staging_atomic() {
    if [ "${STARUML_NATIVE_TEST_MODE:-}" = "1" ] && [ "${STARUML_NATIVE_TEST_FAIL_PROMOTE:-}" = "1" ]; then
        echo "[ERROR] Staging promotion failure injected for isolated testing." >&2
        return 1
    fi
    move_entry_atomic "$1" "$2"
}

copy_manifest_file() {
    local source_root="$1"
    local staging="$2"
    local relative="$3"
    local destination="$staging/$relative"
    [ -f "$source_root/$relative" ] && [ ! -L "$source_root/$relative" ] || {
        echo "[ERROR] Runtime manifest source is missing or linked: $relative" >&2
        return 1
    }
    mkdir -p -- "$(dirname -- "$destination")"
    cp -- "$source_root/$relative" "$destination"
}

populate_staging_manifest() {
    copy_manifest_file "$1" "$2" "PlantUML_Importer.png"
    copy_manifest_file "$1" "$2" "main.js"
    copy_manifest_file "$1" "$2" "package.json"
    copy_manifest_file "$1" "$2" "menus/menu.json"
    copy_manifest_file "$1" "$2" "keymaps/keymap.json"
    copy_manifest_file "$1" "$2" "utils/dialog-helper.js"
    copy_manifest_file "$1" "$2" "utils/parser-helper.js"
    copy_manifest_file "$1" "$2" "utils/preview-helper.js"
    copy_manifest_file "$1" "$2" "utils/input-guard.js"
    copy_manifest_file "$1" "$2" "parsers/usecase-parser.js"
    copy_manifest_file "$1" "$2" "parsers/class-parser.js"
    copy_manifest_file "$1" "$2" "parsers/sequence-parser.js"
    copy_manifest_file "$1" "$2" "parsers/activity-parser.js"
    copy_manifest_file "$1" "$2" "parsers/state-parser.js"
    copy_manifest_file "$1" "$2" "parsers/erd-parser.js"
    copy_manifest_file "$1" "$2" "parsers/mindmap-parser.js"
    copy_manifest_file "$1" "$2" "parsers/requirement-parser.js"
}

remove_extension_atomic() {
    local root="$1"
    local name="$2"
    local target quarantine
    validate_extension_name "$name"
    validate_install_paths "$root"
    [ -d "$root" ] || return 0
    target="$root/$name"
    assert_immediate_child "$root" "$target" "$name"
    if [ ! -e "$target" ] && [ ! -L "$target" ]; then return 0; fi
    [ ! -L "$target" ] || {
        echo "[ERROR] Refusing removal of a linked extension target." >&2
        return 1
    }
    quarantine="$root/.$name.quarantine.$$.$RANDOM"
    assert_immediate_child "$root" "$quarantine" "$(basename -- "$quarantine")"
    move_entry_atomic "$target" "$quarantine" || return 1
    remove_entry_no_follow "$quarantine"
}

install_extension_atomic() {
    local root="$1"
    local source_root="$2"
    local name="$CURRENT_EXTENSION_NAME"
    local target staging quarantine=""
    ensure_canonical_root "$root"
    target="$root/$name"
    assert_immediate_child "$root" "$target" "$name"
    [ ! -L "$target" ] || {
        echo "[ERROR] Refusing installation over a linked extension target." >&2
        return 1
    }
    staging="$root/.$name.staging.$$.$RANDOM"
    assert_immediate_child "$root" "$staging" "$(basename -- "$staging")"
    (umask 077 && mkdir -- "$staging")
    if ! populate_staging_manifest "$source_root" "$staging"; then
        remove_entry_no_follow "$staging"
        return 1
    fi
    [ -d "$staging" ] && [ ! -L "$staging" ] && assert_no_linked_tree "$staging" || {
        remove_entry_no_follow "$staging"
        return 1
    }
    validate_install_paths "$root"
    if [ -e "$target" ] || [ -L "$target" ]; then
        quarantine="$root/.$name.quarantine.$$.$RANDOM"
        assert_immediate_child "$root" "$quarantine" "$(basename -- "$quarantine")"
        move_entry_atomic "$target" "$quarantine" || { remove_entry_no_follow "$staging"; return 1; }
    fi
    if ! promote_staging_atomic "$staging" "$target"; then
        if [ -n "$quarantine" ] && [ ! -e "$target" ] && [ ! -L "$target" ]; then
            move_entry_atomic "$quarantine" "$target" || true
        fi
        remove_entry_no_follow "$staging"
        return 1
    fi
    [ -z "$quarantine" ] || remove_entry_no_follow "$quarantine"
}

validate_test_controls() {
    if [ "${STARUML_NATIVE_TEST_MODE:-}" != "1" ] &&
        { [ -n "${STARUML_NATIVE_TEST_FAIL_RENAME:-}" ] || [ -n "${STARUML_NATIVE_TEST_FAIL_PROMOTE:-}" ]; }; then
        echo "[ERROR] Test-only failure controls require dedicated test mode." >&2
        return 1
    fi
}

derive_production_extension_root() {
    local platform="$1"
    local appdata_root production_root
    [ -n "${HOME:-}" ] || { echo "[ERROR] HOME is required." >&2; return 1; }
    validate_absolute_normalized_path "$HOME"
    case "$platform" in
        darwin*) production_root="$HOME/Library/Application Support/StarUML/extensions/user" ;;
        linux*) production_root="$HOME/.config/StarUML/extensions/user" ;;
        msys*|cygwin*)
            [ -n "${APPDATA:-}" ] && command -v cygpath >/dev/null 2>&1 || {
                echo "[ERROR] APPDATA and cygpath are required on Git Bash." >&2
                return 1
            }
            appdata_root="$(cygpath -u "$APPDATA")"
            validate_absolute_normalized_path "$appdata_root"
            production_root="$appdata_root/StarUML/extensions/user"
            ;;
        *) echo "[ERROR] Unsupported OS: $platform" >&2; return 1 ;;
    esac
    validate_absolute_normalized_path "$production_root"
    printf '%s\n' "$production_root"
}

path_comparison_key() {
    local candidate platform
    candidate="$(printf '%s' "$1" | tr '\\' '/')"
    platform="$2"
    case "$platform" in
        msys*|cygwin*) candidate="$(cygpath -am "$candidate")" || return 1 ;;
    esac
    [ "$candidate" = "/" ] || candidate="${candidate%/}"
    case "$platform" in
        msys*|cygwin*|win32*) printf '%s\n' "$(printf '%s' "$candidate" | tr '[:upper:]' '[:lower:]')" ;;
        *) printf '%s\n' "$candidate" ;;
    esac
}

assert_test_root_isolated() {
    local test_root="$1"
    local production_root="$2"
    local platform="$3"
    local test_key production_key
    test_key="$(path_comparison_key "$test_root" "$platform")"
    production_key="$(path_comparison_key "$production_root" "$platform")"
    case "$test_key/" in "$production_key/"*)
        echo "[ERROR] Test root must not equal or be inside the production root." >&2
        return 1
    esac
    case "$production_key/" in "$test_key/"*)
        echo "[ERROR] Test root must not contain the production root." >&2
        return 1
    esac
}

resolve_extension_root() {
    local platform="$1"
    local production_root
    validate_test_controls || return 1
    production_root="$(derive_production_extension_root "$platform")" || return 1
    if [ "${STARUML_NATIVE_TEST_MODE:-}" = "1" ]; then
        [ -n "${STARUML_EXTENSION_ROOT:-}" ] || {
            echo "[ERROR] Dedicated test mode requires an explicit isolated root." >&2
            return 1
        }
        validate_absolute_normalized_path "$STARUML_EXTENSION_ROOT" || return 1
        assert_test_root_isolated "$STARUML_EXTENSION_ROOT" "$production_root" "$platform" || return 1
        printf '%s\n' "$STARUML_EXTENSION_ROOT"
    else
        [ -z "${STARUML_EXTENSION_ROOT:-}" ] || {
            echo "[ERROR] Explicit extension root is allowed only in dedicated test mode." >&2
            return 1
        }
        printf '%s\n' "$production_root"
    fi
}
