#!/usr/bin/env node

/**
 * ==============================================================================
 * PLANTUML IMPORTER - CROSS-PLATFORM DEV TOOL
 * ==============================================================================
 *
 * Đây là tệp tin công cụ duy nhất dùng để cài đặt (install), cập nhật (update),
 * hoặc gỡ bỏ (clear) tiện ích trên mọi hệ điều hành.
 *
 * Cách sử dụng:
 * 1. Chạy tương tác (Hiển thị Menu):
 *    node manage.js
 *
 * 2. Chạy nhanh qua dòng lệnh:
 *    node manage.js install      - Cài đặt tiện ích vào StarUML
 *    node manage.js update       - Cập nhật code mới nhất từ GitHub và cài đặt
 *    node manage.js clear        - Xóa tiện ích khỏi StarUML
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const readline = require('readline');

// Màu sắc Console ANSI
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
};

const REQUIRED_NODE_VERSION = 14;

// Banner ASCII nghệ thuật
function showBanner() {
  console.clear();

  const logo = [
    "  _____  _             _   _    _ __  __ _      ",
    " |  __ \\| |           | | | |  | |  \\/  | |     ",
    " | |__) | | __ _ _ __ | |_| |  | | \\  / | |     ",
    " |  ___/| |/ _` | '_ \\| __| |  | | |\\/| | |     ",
    " | |    | | (_| | | | | |_| |__| | |  | | |____ ",
    " |_|    |_|\\__,_|_| |_|\\__|\\____/|_|  |_|______|",
    "  _____ __  __ _____   ____  _____ _______ ______ _____  ",
    " |_   _|  \\/  |  __ \\ / __ \\|  __ \\__   __|  ____|  __ \\ ",
    "   | | | \\  / | |__) | |  | | |__) | | |  | |__  | |__) |",
    "   | | | |\\/| |  ___/| |  | |  _  /  | |  |  __| |  _  / ",
    "  _| |_| |  | | |    | |__| | | \\ \\  | |  | |____| | \\ \\ ",
    " |_____|_|  |_|_|     \\____/|_|  \\_\\ |_|  |______|_|  \\_\\"
  ];

  const cyan = `${COLORS.cyan}${COLORS.bright}`;
  const magenta = `${COLORS.magenta}${COLORS.bright}`;
  const yellow = `${COLORS.yellow}${COLORS.bright}`;
  const reset = COLORS.reset;

  const boxWidth = 72;
  console.log(`  ${cyan}┌${"─".repeat(boxWidth / 2)}${magenta}${"─".repeat(boxWidth / 2)}┐`);

  logo.forEach(line => {
    const totalPad = boxWidth - line.length;
    const padLeft = " ".repeat(Math.floor(totalPad / 2));
    const padRight = " ".repeat(Math.ceil(totalPad / 2));
    const paddedLine = padLeft + line + padRight;
    const part1 = paddedLine.substring(0, boxWidth / 2);
    const part2 = paddedLine.substring(boxWidth / 2);
    console.log(`  ${cyan}│${part1}${magenta}${part2}│`);
  });

  console.log(`  ${cyan}│${" ".repeat(boxWidth)}│`);

  const subtitleText = "✨ PLANTUML IMPORTER - CROSS-PLATFORM DEV TOOL ✨";
  // subtitleText string length is 47, but emojis ✨ take 2 visual columns each.
  // So visual width is 49.
  const visualLength = 49;
  const subtitlePad = boxWidth - visualLength;
  const leftSpaces = " ".repeat(Math.floor(subtitlePad / 2));
  const rightSpaces = " ".repeat(Math.ceil(subtitlePad / 2));
  console.log(`  ${cyan}│${leftSpaces}${yellow}${subtitleText}${magenta}${rightSpaces}│`);

  console.log(`  ${cyan}└${"─".repeat(boxWidth / 2)}${magenta}${"─".repeat(boxWidth / 2)}┘`);
  console.log(reset);
}

// Kiểm tra phiên bản Node.js
function checkNodeVersion() {
  const currentVersion = process.version;
  const majorVersion = parseInt(currentVersion.replace('v', '').split('.')[0], 10);

  console.log(`${COLORS.bright}Kiểm tra môi trường:${COLORS.reset}`);

  let osName = os.type();
  let arch = os.arch();
  let displayOs = `${osName} (${arch})`;

  if (osName === 'Darwin') {
    displayOs = arch === 'arm64' ? 'macOS (Chip Apple Silicon / M-series)' : 'macOS (Chip Intel)';
  } else if (osName === 'Windows_NT') {
    displayOs = `Windows (${arch})`;
  } else if (osName === 'Linux') {
    displayOs = `Linux (${arch})`;
  }

  console.log(`- Hệ điều hành: ${COLORS.yellow}${displayOs}${COLORS.reset}`);
  console.log(`- Phiên bản Node.js hiện tại: ${COLORS.yellow}${currentVersion}${COLORS.reset}`);

  if (majorVersion < REQUIRED_NODE_VERSION) {
    console.log(`\n${COLORS.bgYellow}${COLORS.bright} CẢNH BÁO / WARNING ${COLORS.reset}`);
    console.log(`${COLORS.yellow}Công cụ khuyến nghị Node.js v${REQUIRED_NODE_VERSION} trở lên (Hiện tại: ${currentVersion}).${COLORS.reset}\n`);
  } else {
    console.log(`- Phiên bản Node.js: ${COLORS.green}Đạt yêu cầu (v${REQUIRED_NODE_VERSION}+)${COLORS.reset}\n`);
  }
}

const platform = os.platform();
let targetDir = '';

if (platform === 'darwin') {
    targetDir = path.join(os.homedir(), 'Library/Application Support/StarUML/extensions/user/twot.staruml-plantuml-importer');
} else if (platform === 'win32') {
    targetDir = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData/Roaming'), 'StarUML/extensions/user/twot.staruml-plantuml-importer');
} else if (platform === 'linux') {
    targetDir = path.join(os.homedir(), '.config/StarUML/extensions/user/twot.staruml-plantuml-importer');
} else {
    console.error(`${COLORS.red}[ERROR] Unsupported OS: ${platform}${COLORS.reset}`);
    process.exit(1);
}

const SRC_DIR = __dirname;
const EXTENSION_ID = 'twot.staruml-plantuml-importer';
const extensionRoot = path.dirname(targetDir);
const REQUIRED_RUNTIME_FILES = [
    'PlantUML_Importer.png',
    'main.js',
    'package.json',
    'menus/menu.json',
    'keymaps/keymap.json',
    'utils/dialog-helper.js',
    'utils/parser-helper.js',
    'utils/preview-helper.js',
    'utils/input-guard.js',
    'parsers/usecase-parser.js',
    'parsers/class-parser.js',
    'parsers/sequence-parser.js',
    'parsers/activity-parser.js',
    'parsers/state-parser.js',
    'parsers/erd-parser.js',
    'parsers/mindmap-parser.js',
    'parsers/requirement-parser.js'
];
const INSTALL_LOCK_NAME = `.${EXTENSION_ID}.lock`;
const INSTALL_LOCK_OWNER_FILE = 'owner.json';
const DEFAULT_LOCK_STALE_AFTER_MS = 15 * 60 * 1000;

function comparablePath(value) {
    const resolved = path.resolve(value);
    return platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function assertCanonicalRoot(userExtensionRoot) {
    if (!path.isAbsolute(userExtensionRoot) || path.normalize(userExtensionRoot) !== userExtensionRoot) {
        throw new Error('Extension root must be an absolute, lexically normalized path.');
    }

    const root = path.parse(userExtensionRoot).root;
    const components = path.relative(root, userExtensionRoot).split(path.sep).filter(Boolean);
    let current = root;
    for (const component of components) {
        current = path.join(current, component);
        if (!fs.existsSync(current)) break;
        const stats = fs.lstatSync(current);
        if (stats.isSymbolicLink()) {
            throw new Error('Refusing filesystem mutation through a symbolic link, junction, or reparse point.');
        }
    }

    let nearest = userExtensionRoot;
    while (!fs.existsSync(nearest)) {
        const parent = path.dirname(nearest);
        if (parent === nearest) break;
        nearest = parent;
    }
    const nearestStats = fs.lstatSync(nearest);
    if (!nearestStats.isDirectory() || nearestStats.isSymbolicLink()) {
        throw new Error('Nearest existing extension-root ancestor is invalid or linked.');
    }
    if (comparablePath(fs.realpathSync(nearest)) !== comparablePath(nearest)) {
        throw new Error('Extension root ancestor is not canonical.');
    }
    const relativeRoot = path.relative(nearest, userExtensionRoot);
    if (relativeRoot === '..' || relativeRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeRoot)) {
        throw new Error('Extension root escapes its canonical existing ancestor.');
    }
    if (fs.existsSync(userExtensionRoot) && !fs.lstatSync(userExtensionRoot).isDirectory()) {
        throw new Error('Extension root must be a directory.');
    }
    return userExtensionRoot;
}

function assertExactExtensionTarget(extensionDir, userExtensionRoot) {
    const expectedTarget = path.join(userExtensionRoot, EXTENSION_ID);
    if (path.basename(extensionDir) !== EXTENSION_ID ||
        comparablePath(extensionDir) !== comparablePath(expectedTarget)) {
        throw new Error('Extension target must be the fixed immediate child of the validated root.');
    }
}

function assertNoLinks(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    entries.forEach(entry => {
        const entryPath = path.join(directory, entry.name);
        const stats = fs.lstatSync(entryPath);
        if (stats.isSymbolicLink()) {
            throw new Error('Refusing recursive deletion: symbolic links, junctions, or reparse points are not allowed.');
        }
        if (stats.isDirectory()) assertNoLinks(entryPath);
    });
}

function assertRegularTree(directory, canonicalRoot, description) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    entries.forEach(entry => {
        const entryPath = path.join(directory, entry.name);
        const stats = fs.lstatSync(entryPath);
        if (stats.isSymbolicLink() || (!stats.isDirectory() && !stats.isFile())) {
            throw new Error(`${description} must contain only regular non-link files and directories.`);
        }
        const canonicalEntry = fs.realpathSync(entryPath);
        const relativeEntry = path.relative(canonicalRoot, canonicalEntry);
        if (!relativeEntry || relativeEntry === '..' || relativeEntry.startsWith(`..${path.sep}`) || path.isAbsolute(relativeEntry)) {
            throw new Error(`${description} contains an entry outside its canonical root.`);
        }
        if (stats.isDirectory()) assertRegularTree(entryPath, canonicalRoot, description);
    });
}

function assertRuntimeManifest(directory, description) {
    if (!fs.existsSync(directory)) {
        throw new Error(`${description} is missing; the complete runtime manifest is required.`);
    }
    assertCanonicalRoot(directory);
    const rootStats = fs.lstatSync(directory);
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
        throw new Error(`${description} must be a canonical non-link directory.`);
    }
    const canonicalRoot = fs.realpathSync(directory);

    REQUIRED_RUNTIME_FILES.forEach(relativePath => {
        const entry = path.join(directory, relativePath);
        if (!fs.existsSync(entry)) throw new Error(`${description} runtime manifest is missing required file: ${relativePath}.`);
        const stats = fs.lstatSync(entry);
        if (!stats.isFile() || stats.isSymbolicLink()) {
            throw new Error(`${description} runtime manifest file must be a regular non-link entry: ${relativePath}.`);
        }
        const relativeEntry = path.relative(canonicalRoot, fs.realpathSync(entry));
        if (!relativeEntry || relativeEntry === '..' || relativeEntry.startsWith(`..${path.sep}`) || path.isAbsolute(relativeEntry)) {
            throw new Error(`${description} contains a required file outside its canonical root.`);
        }
    });
}

function assertSafeExtensionTarget(extensionDir, userExtensionRoot) {
    assertCanonicalRoot(userExtensionRoot);
    assertExactExtensionTarget(extensionDir, userExtensionRoot);
    const rootStats = fs.lstatSync(userExtensionRoot);
    const targetStats = fs.lstatSync(extensionDir);
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink() || !targetStats.isDirectory() || targetStats.isSymbolicLink()) {
        throw new Error('Refusing recursive deletion: symbolic links, junctions, or reparse points are not allowed.');
    }
    const canonicalRoot = fs.realpathSync(userExtensionRoot);
    const canonicalParent = fs.realpathSync(path.dirname(extensionDir));
    const canonicalTarget = fs.realpathSync(extensionDir);
    const expectedTarget = path.join(canonicalRoot, EXTENSION_ID);
    if (comparablePath(canonicalRoot) !== comparablePath(userExtensionRoot) ||
        comparablePath(canonicalParent) !== comparablePath(canonicalRoot) ||
        comparablePath(canonicalTarget) !== comparablePath(expectedTarget)) {
        throw new Error('Refusing recursive deletion: canonical containment under the StarUML user-extension root failed.');
    }
    assertNoLinks(extensionDir);
}

function safeDeleteExtension(extensionDir, userExtensionRoot) {
    if (!fs.existsSync(extensionDir)) return false;
    assertSafeExtensionTarget(extensionDir, userExtensionRoot);
    fs.rmSync(extensionDir, { recursive: true, force: true });
    return true;
}

function safeDeleteInstallPath(candidate, invocationDir, userExtensionRoot) {
    if (!fs.existsSync(candidate)) return;
    assertCanonicalRoot(userExtensionRoot);
    const invocationPrefix = `.${EXTENSION_ID}-install-`;
    const validInvocation = path.dirname(invocationDir) === userExtensionRoot &&
        path.basename(invocationDir).startsWith(invocationPrefix);
    const validCandidate = candidate === invocationDir || candidate === path.join(invocationDir, 'staging');
    if (!validInvocation || !validCandidate) {
        throw new Error('Refusing to clean an unrecognized installer temporary path.');
    }
    const candidateStats = fs.lstatSync(candidate);
    if (!candidateStats.isDirectory() || candidateStats.isSymbolicLink()) {
        throw new Error('Refusing to clean an invalid or linked installer temporary path.');
    }
    const canonicalRoot = fs.realpathSync(userExtensionRoot);
    const canonicalCandidate = fs.realpathSync(candidate);
    const relativeCandidate = path.relative(canonicalRoot, canonicalCandidate);
    if (!relativeCandidate || relativeCandidate === '..' || relativeCandidate.startsWith(`..${path.sep}`) || path.isAbsolute(relativeCandidate)) {
        throw new Error('Refusing to clean an installer temporary path outside the extension root.');
    }
    assertNoLinks(candidate);
    fs.rmSync(candidate, { recursive: true, force: true });
}

function recoverAbandonedInstall(installTarget, installRoot) {
    if (fs.existsSync(installTarget)) return;

    const invocationPrefix = `.${EXTENSION_ID}-install-`;
    const backups = [];
    fs.readdirSync(installRoot, { withFileTypes: true }).forEach(entry => {
        if (!entry.name.startsWith(invocationPrefix) || entry.name.length === invocationPrefix.length) return;
        const invocationDir = path.join(installRoot, entry.name);
        try {
            const invocationStats = fs.lstatSync(invocationDir);
            if (!invocationStats.isDirectory() || invocationStats.isSymbolicLink()) return;
            assertCanonicalRoot(invocationDir);
            assertRegularTree(invocationDir, fs.realpathSync(invocationDir), 'Installer recovery directory');
            const backupDir = path.join(invocationDir, 'backup');
            assertRuntimeManifest(backupDir, 'Installer recovery backup');
            backups.push({ invocationDir, backupDir });
        } catch (error) {
            // Invalid or linked abandoned paths are ignored rather than followed.
        }
    });

    if (backups.length > 1) {
        throw new Error('Ambiguous installer recovery: multiple valid abandoned backups exist.');
    }
    if (backups.length === 1) {
        fs.renameSync(backups[0].backupDir, installTarget);
        safeDeleteInstallPath(backups[0].invocationDir, backups[0].invocationDir, installRoot);
    }
}

function inspectInstallLock(lockDir, installRoot) {
    const expectedLock = path.join(installRoot, INSTALL_LOCK_NAME);
    if (comparablePath(lockDir) !== comparablePath(expectedLock)) {
        throw new Error('Installer lock must be the fixed immediate child of the validated root.');
    }
    const lockStats = fs.lstatSync(lockDir);
    if (!lockStats.isDirectory() || lockStats.isSymbolicLink()) {
        throw new Error('Installer lock must be a regular non-link directory.');
    }
    const markerPath = path.join(lockDir, INSTALL_LOCK_OWNER_FILE);
    let markerStats;
    try {
        markerStats = fs.lstatSync(markerPath);
    } catch (error) {
        if (error && error.code === 'ENOENT') return { lockStats, marker: null };
        throw error;
    }
    if (!markerStats.isFile() || markerStats.isSymbolicLink()) {
        throw new Error('Installer lock ownership marker must be a regular non-link file.');
    }
    const canonicalLock = fs.realpathSync(lockDir);
    const relativeMarker = path.relative(canonicalLock, fs.realpathSync(markerPath));
    if (!relativeMarker || relativeMarker === '..' || relativeMarker.startsWith(`..${path.sep}`) || path.isAbsolute(relativeMarker)) {
        throw new Error('Installer lock ownership marker escapes its canonical lock root.');
    }
    let marker;
    try {
        marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    } catch (error) {
        return { lockStats, marker: null };
    }
    if (!marker || typeof marker.ownerId !== 'string' || !marker.ownerId ||
        !Number.isInteger(marker.pid) || marker.pid <= 0 || !Number.isFinite(marker.createdAt)) {
        return { lockStats, marker: null };
    }
    return { lockStats, marker };
}

function readInstallLock(lockDir, installRoot) {
    const inspection = inspectInstallLock(lockDir, installRoot);
    if (!inspection.marker) throw new Error('Installer lock ownership marker is invalid.');
    return inspection.marker;
}

function removeOwnedInstallLock(lockDir, installRoot, ownerId) {
    const marker = readInstallLock(lockDir, installRoot);
    if (marker.ownerId !== ownerId) {
        throw new Error('Installer lock ownership changed; refusing to remove another invocation lock.');
    }
    assertNoLinks(lockDir);
    const entries = fs.readdirSync(lockDir);
    if (entries.length !== 1 || entries[0] !== INSTALL_LOCK_OWNER_FILE) {
        throw new Error('Installer lock contains unexpected entries; refusing ownership cleanup.');
    }
    fs.unlinkSync(path.join(lockDir, INSTALL_LOCK_OWNER_FILE));
    fs.rmdirSync(lockDir);
}

function removeStaleInvalidInstallLock(lockDir, installRoot, now, staleAfterMs) {
    const inspection = inspectInstallLock(lockDir, installRoot);
    if (inspection.marker) {
        throw new Error('Another installer invocation owns the active install lock.');
    }
    const age = now - inspection.lockStats.mtimeMs;
    if (!Number.isFinite(inspection.lockStats.mtimeMs) || age < 0 || age <= staleAfterMs) {
        throw new Error('Another installer invocation may be initializing the active install lock.');
    }

    assertNoLinks(lockDir);
    const entries = fs.readdirSync(lockDir);
    if (entries.length > 1 || (entries.length === 1 && entries[0] !== INSTALL_LOCK_OWNER_FILE)) {
        throw new Error('Invalid installer lock contains unexpected entries; refusing recovery.');
    }
    if (entries.length === 1) fs.unlinkSync(path.join(lockDir, INSTALL_LOCK_OWNER_FILE));
    fs.rmdirSync(lockDir);
}

function isProcessAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return !error || error.code !== 'ESRCH';
    }
}

function acquireInstallLock(installRoot, lockOptions) {
    const settings = lockOptions || {};
    const now = typeof settings.now === 'function' ? settings.now : Date.now;
    const checkProcessAlive = typeof settings.isProcessAlive === 'function'
        ? settings.isProcessAlive
        : isProcessAlive;
    const staleAfterMs = settings.staleAfterMs === undefined
        ? DEFAULT_LOCK_STALE_AFTER_MS
        : settings.staleAfterMs;
    const ownerId = settings.ownerId || `${process.pid}-${crypto.randomBytes(16).toString('hex')}`;
    if (!Number.isFinite(staleAfterMs) || staleAfterMs < 0 || typeof ownerId !== 'string' || !ownerId) {
        throw new Error('Installer lock configuration is invalid.');
    }

    const lockDir = path.join(installRoot, INSTALL_LOCK_NAME);
    const createdAt = now();
    if (!Number.isFinite(createdAt)) throw new Error('Installer lock clock returned an invalid timestamp.');

    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            fs.mkdirSync(lockDir);
        } catch (error) {
            if (!error || error.code !== 'EEXIST') throw error;
            const inspection = inspectInstallLock(lockDir, installRoot);
            if (!inspection.marker) {
                removeStaleInvalidInstallLock(lockDir, installRoot, createdAt, staleAfterMs);
                continue;
            }
            const ownerAlive = checkProcessAlive(inspection.marker.pid);
            if (ownerAlive !== false) {
                throw new Error('Another installer invocation owns the active install lock.');
            }
            removeOwnedInstallLock(lockDir, installRoot, inspection.marker.ownerId);
            continue;
        }
        try {
            fs.writeFileSync(
                path.join(lockDir, INSTALL_LOCK_OWNER_FILE),
                JSON.stringify({ ownerId, pid: process.pid, createdAt }),
                { flag: 'wx' }
            );
        } catch (error) {
            try {
                fs.rmdirSync(lockDir);
            } catch (cleanupError) {
                error.message += ` Installer lock initialization cleanup failed. (${cleanupError.message})`;
            }
            throw error;
        }
        return { lockDir, ownerId };
    }
    throw new Error('Could not acquire the installer lock after stale-lock recovery.');
}

function install(options) {
    const installTarget = options && options.targetDir ? options.targetDir : targetDir;
    const installSource = options && options.sourceDir ? options.sourceDir : SRC_DIR;
    const installRoot = path.dirname(installTarget);

    console.log(`\n${COLORS.magenta}${COLORS.bright}========== CÀI ĐẶT TIỆN ÍCH (INSTALL) ==========${COLORS.reset}\n`);
    console.log(`${COLORS.bright}[*] Đang cài đặt vào thư mục:${COLORS.reset}`);
    console.log(`    ${COLORS.cyan}${installTarget}${COLORS.reset}\n`);

    assertCanonicalRoot(installRoot);
    assertExactExtensionTarget(installTarget, installRoot);
    if (!fs.existsSync(installRoot)) {
        fs.mkdirSync(installRoot, { recursive: true });
        assertCanonicalRoot(installRoot);
    }
    const installLock = acquireInstallLock(installRoot, options && options.lock);
    let operationError;

    try {
        assertRuntimeManifest(installSource, 'Install source');
        recoverAbandonedInstall(installTarget, installRoot);

        const invocationDir = fs.mkdtempSync(path.join(installRoot, `.${EXTENSION_ID}-install-`));
        const stagingDir = path.join(invocationDir, 'staging');
        const backupDir = path.join(invocationDir, 'backup');
        let backupCreated = false;
        let preserveBackup = false;
        let promoted = false;
        let installError;

        try {
            REQUIRED_RUNTIME_FILES.forEach(relativePath => {
                assertCanonicalRoot(installRoot);
                const destination = path.join(stagingDir, relativePath);
                fs.mkdirSync(path.dirname(destination), { recursive: true });
                fs.copyFileSync(path.join(installSource, relativePath), destination);
            });

            assertRuntimeManifest(stagingDir, 'Installer staging tree');
            if (fs.existsSync(installTarget)) {
                assertSafeExtensionTarget(installTarget, installRoot);
                fs.renameSync(installTarget, backupDir);
                backupCreated = true;
            }

            try {
                fs.renameSync(stagingDir, installTarget);
                promoted = true;
            } catch (promotionError) {
                if (backupCreated) {
                    try {
                        fs.renameSync(backupDir, installTarget);
                        backupCreated = false;
                    } catch (restoreError) {
                        preserveBackup = true;
                        promotionError.message += ` Restore failed; existing install preserved at ${backupDir}. (${restoreError.message})`;
                    }
                }
                throw promotionError;
            }
        } catch (error) {
            installError = error;
        }

        try {
            if (preserveBackup) {
                safeDeleteInstallPath(stagingDir, invocationDir, installRoot);
            } else {
                safeDeleteInstallPath(invocationDir, invocationDir, installRoot);
            }
        } catch (cleanupError) {
            if (promoted && !installError) {
                console.warn(`${COLORS.yellow}[WARNING] Installation completed, but installer temporary cleanup failed. Recoverable artifacts may remain under the extension root.${COLORS.reset}`);
            } else if (installError) {
                installError.message += ` Installer temporary-path cleanup failed. (${cleanupError.message})`;
            } else {
                throw cleanupError;
            }
        }

        if (installError) throw installError;

        console.log(`${COLORS.bgGreen}${COLORS.bright} CÀI ĐẶT THÀNH CÔNG! / INSTALLATION COMPLETE ${COLORS.reset}\n`);
        console.log(`${COLORS.bright}Cách sử dụng:${COLORS.reset}`);
        console.log(`  1. Mở phần mềm StarUML`);
        console.log(`  2. Tạo sơ đồ (Model > Add Diagram > ...)`);
        console.log(`  3. Vào menu Tools > PlantUML Importer > "Import ..."`);
        console.log(`  4. Dán code PlantUML và chọn OK\n`);
    } catch (error) {
        operationError = error;
        throw error;
    } finally {
        try {
            removeOwnedInstallLock(installLock.lockDir, installRoot, installLock.ownerId);
        } catch (lockCleanupError) {
            if (operationError) {
                operationError.message += ` Installer lock cleanup failed. (${lockCleanupError.message})`;
            } else {
                console.warn(`${COLORS.yellow}[WARNING] Installation completed, but installer lock cleanup failed.${COLORS.reset}`);
            }
        }
    }
}

function capture(run, args) {
    return String(run('git', args, { encoding: 'utf8' }) || '').trim();
}

function runVisible(run, args) {
    return run('git', args, { stdio: 'inherit' });
}

function checkDirty(run) {
    if (capture(run, ['status', '--porcelain'])) {
        throw new Error('Worktree is dirty. Aborting update to avoid data loss.');
    }
}

function update(deps) {
    const run = (deps && typeof deps.execFileSync === 'function')
        ? deps.execFileSync
        : execFileSync;
    const doInstall = (deps && typeof deps.install === 'function') ? deps.install : install;

    console.log(`\n${COLORS.magenta}${COLORS.bright}========== CẬP NHẬT TIỆN ÍCH (UPDATE) ==========${COLORS.reset}\n`);
    console.log(`${COLORS.bright}[*] Đang kiểm tra trạng thái làm việc...${COLORS.reset}`);

    try {
        checkDirty(run);
        const branch = capture(run, ['rev-parse', '--abbrev-ref', 'HEAD']);
        if (!branch) {
            throw new Error('Current branch could not be determined. Aborting update.');
        }
        if (branch === 'HEAD') {
            throw new Error('Repository is in detached HEAD state. Check out a branch before updating.');
        }

        let upstream;
        try {
            upstream = capture(run, ['rev-parse', '--symbolic-full-name', '@{u}']);
        } catch (e) {
            throw new Error(`Current branch has no upstream. Configure one before updating. (${e.message})`);
        }
        const upstreamMatch = /^refs\/remotes\/([^/]+)\/(.+)$/.exec(upstream);
        if (!upstreamMatch) {
            throw new Error(`Unexpected upstream reference: ${upstream || '(empty)'}.`);
        }
        const remote = upstreamMatch[1];

        const remoteUrl = capture(run, ['remote', 'get-url', remote]);
        const expectedRemoteUrls = [
            'https://github.com/TwotNguyenVN/staruml-plantuml-importer.git',
            'git@github.com:TwotNguyenVN/staruml-plantuml-importer.git'
        ];
        if (!expectedRemoteUrls.includes(remoteUrl)) {
            throw new Error(`Unexpected remote URL for ${remote}.`);
        }

        console.log(`${COLORS.green}✔ Worktree và remote hợp lệ. Đang tải mã nguồn mới nhất...${COLORS.reset}`);
        runVisible(run, ['fetch', remote]);
        const targetRevision = capture(run, ['rev-parse', upstream]);
        if (!targetRevision) {
            throw new Error(`Could not resolve target revision for ${upstream}.`);
        }
        console.log(`${COLORS.bright}[*] Target revision: ${COLORS.cyan}${targetRevision}${COLORS.reset}`);
        runVisible(run, ['merge', '--ff-only', upstream]);

        console.log(`\n${COLORS.green}✔ Đã cập nhật mã nguồn thành công.${COLORS.reset}`);
        doInstall();
    } catch (error) {
        console.error(`\n${COLORS.bgRed}${COLORS.bright} LỖI CẬP NHẬT / UPDATE ERROR ${COLORS.reset}`);
        console.error(`${COLORS.red}${error.message}${COLORS.reset}\n`);
        // Do not leave the repo in a half-updated state: re-throw so callers can detect failure.
        throw error;
    }
}

function clear() {
    console.log(`\n${COLORS.magenta}${COLORS.bright}========== GỠ BỎ TIỆN ÍCH (CLEAR) ==========${COLORS.reset}\n`);
    console.log(`${COLORS.bright}[*] Đang xóa extension khỏi StarUML...${COLORS.reset}`);
    if (fs.existsSync(targetDir)) {
        safeDeleteExtension(targetDir, extensionRoot);
        console.log(`${COLORS.green}✔ Đã gỡ bỏ extension thành công.${COLORS.reset}\n`);
    } else {
        console.log(`${COLORS.yellow}[*] Không tìm thấy extension, không cần gỡ bỏ.${COLORS.reset}\n`);
    }
}

function showInteractiveMenu() {
    showBanner();
    checkNodeVersion();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log(`${COLORS.bright}Vui lòng lựa chọn thao tác bạn muốn thực hiện:${COLORS.reset}`);
    console.log(`${COLORS.cyan}  [1] Cài đặt tiện ích (Install)   - Copy tiện ích vào StarUML${COLORS.reset}`);
    console.log(`${COLORS.magenta}  [2] Cập nhật bản mới (Update)    - Tải code mới nhất từ GitHub và cài đặt${COLORS.reset}`);
    console.log(`${COLORS.yellow}  [3] Gỡ bỏ tiện ích (Clear)       - Chỉ gỡ tiện ích khỏi StarUML${COLORS.reset}`);
    console.log(`${COLORS.dim}  [4] Thoát công cụ (Exit)${COLORS.reset}\n`);

    rl.question(`${COLORS.bright}Lựa chọn của bạn (1-4): ${COLORS.reset}`, (answer) => {
        const selection = answer.trim();

        switch (selection) {
            case '1':
                rl.close();
                install();
                break;
            case '2':
                rl.close();
                update();
                break;
            case '3':
                rl.close();
                clear();
                break;
            case '4':
                rl.close();
                console.log('Đã thoát. Chúc bạn một ngày tốt lành!\n');
                process.exit(0);
                break;
            default:
                rl.close();
                console.log(`${COLORS.red}Lựa chọn không hợp lệ. Vui lòng chạy lại lệnh!${COLORS.reset}\n`);
                process.exit(1);
        }
    });
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        showInteractiveMenu();
        return;
    }

    const action = args[0].toLowerCase().trim();

    switch (action) {
        case 'install':
            install();
            break;
        case 'update':
            update();
            break;
        case 'clear':
            clear();
            break;
        case 'help':
        case '--help':
        case '-h':
            console.log(`\n${COLORS.bright}CÁCH SỬ DỤNG STARUML IMPORTER CLI:${COLORS.reset}`);
            console.log(`  node manage.js            - Mở menu tương tác`);
            console.log(`  node manage.js install    - Cài đặt tiện ích`);
            console.log(`  node manage.js update     - Kéo code mới và cài đặt (ff-only merge, an toàn)`);
            console.log(`  node manage.js clear      - Xóa tiện ích khỏi StarUML\n`);
            break;
        default:
            console.log(`${COLORS.red}Lệnh không hợp lệ: "${action}". Chạy "node manage.js --help" để xem hướng dẫn.${COLORS.reset}\n`);
            process.exit(1);
    }
}

// Export for unit testing (does NOT execute main on require)
module.exports = {
    install,
    update,
    checkDirty,
    clear,
    main,
    showInteractiveMenu,
    safeDeleteExtension
};

// Only run the CLI when executed directly (not when required by a test)
if (require.main === module) {
    main();
}
