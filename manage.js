#!/usr/bin/env node

/**
 * ==============================================================================
 * PLANTUML IMPORTER - CROSS-PLATFORM DEV TOOL
 * ==============================================================================
 * 
 * Đây là tệp tin công cụ duy nhất dùng để cài đặt (install), cập nhật (update), 
 * hoặc dọn dẹp (clear) toàn bộ tiện ích trên mọi hệ điều hành.
 * 
 * Cách sử dụng:
 * 1. Chạy tương tác (Hiển thị Menu):
 *    node manage.js
 * 
 * 2. Chạy nhanh qua dòng lệnh:
 *    node manage.js install      - Cài đặt tiện ích vào StarUML
 *    node manage.js update       - Cập nhật code mới nhất từ GitHub và cài đặt
 *    node manage.js clear        - Xóa tiện ích khỏi StarUML
 *    node manage.js clear-all    - Gỡ cài đặt hoàn toàn phần mềm StarUML
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
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
    "   _____ _             _    _ __  __ _      ",
    "  / ____| |           | |  | |  \\/  | |     ",
    " | (___ | |_ __ _ _ __| |  | | \\  / | |     ",
    "  \\___ \\| __/ _` | '__| |  | | |\\/| | |     ",
    "  ____) | || (_| | |  | |__| | |  | | |____ ",
    " |_____/ \\__\\__,_|_|   \\____/|_|  |_|______|"
  ];
  
  const cyan = `${COLORS.cyan}${COLORS.bright}`;
  const magenta = `${COLORS.magenta}${COLORS.bright}`;
  const yellow = `${COLORS.yellow}${COLORS.bright}`;
  const reset = COLORS.reset;
  
  console.log(`  ${cyan}╔════════════════════════════════════${magenta}════════════════════════════════════╗`);
  
  logo.forEach(line => {
    const pad = " ".repeat(14);
    const paddedLine = pad + line + pad;
    const part1 = paddedLine.substring(0, 36);
    const part2 = paddedLine.substring(36);
    console.log(`  ${cyan}║${part1}${magenta}${part2}║`);
  });
  
  console.log(`  ${cyan}║                                    ${magenta}                                    ║`);
  
  const subtitleText = "✨  PLANTUML IMPORTER - CROSS-PLATFORM MANAGEMENT TOOL  ✨";
  const leftSpaces = " ".repeat(8);
  const rightSpaces = " ".repeat(8);
  console.log(`  ${cyan}║${leftSpaces}${yellow}${subtitleText}${magenta}${rightSpaces}║`);
  
  console.log(`  ${cyan}╚════════════════════════════════════${magenta}════════════════════════════════════╝`);
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

function copyRecursiveSync(src, dest) {
    if (fs.existsSync(src)) {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
            }
            fs.readdirSync(src).forEach(childItemName => {
                copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    }
}

function install() {
    console.log(`\n${COLORS.magenta}${COLORS.bright}========== CÀI ĐẶT TIỆN ÍCH (INSTALL) ==========${COLORS.reset}\n`);
    console.log(`${COLORS.bright}[*] Đang cài đặt vào thư mục:${COLORS.reset}`);
    console.log(`    ${COLORS.cyan}${targetDir}${COLORS.reset}\n`);

    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
    }

    const dirsToCopy = ['menus', 'utils', 'parsers', 'keymaps'];
    const filesToCopy = ['PlantUML_Importer.png', 'main.js', 'package.json'];

    dirsToCopy.forEach(dir => {
        copyRecursiveSync(path.join(SRC_DIR, dir), path.join(targetDir, dir));
    });

    filesToCopy.forEach(file => {
        if (fs.existsSync(path.join(SRC_DIR, file))) {
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            fs.copyFileSync(path.join(SRC_DIR, file), path.join(targetDir, file));
        }
    });

    console.log(`${COLORS.bgGreen}${COLORS.bright} CÀI ĐẶT THÀNH CÔNG! / INSTALLATION COMPLETE ${COLORS.reset}\n`);
    console.log(`${COLORS.bright}Cách sử dụng:${COLORS.reset}`);
    console.log(`  1. Mở phần mềm StarUML`);
    console.log(`  2. Tạo sơ đồ (Model > Add Diagram > ...)`);
    console.log(`  3. Vào menu Tools > PlantUML Importer > "Import ..."`);
    console.log(`  4. Dán code PlantUML và chọn OK\n`);
}

function update() {
    console.log(`\n${COLORS.magenta}${COLORS.bright}========== CẬP NHẬT TIỆN ÍCH (UPDATE) ==========${COLORS.reset}\n`);
    console.log(`${COLORS.bright}[*] Đang tải mã nguồn mới nhất từ GitHub...${COLORS.reset}`);
    try {
        execSync('git fetch --all', { stdio: 'inherit' });
        execSync('git reset --hard origin/main', { stdio: 'inherit' });
        console.log(`\n${COLORS.green}✔ Đã cập nhật mã nguồn thành công.${COLORS.reset}`);
        install();
    } catch (error) {
        console.error(`\n${COLORS.bgRed}${COLORS.bright} LỖI CẬP NHẬT / UPDATE ERROR ${COLORS.reset}`);
        console.error(`${COLORS.red}${error.message}${COLORS.reset}\n`);
    }
}

function clear() {
    console.log(`\n${COLORS.magenta}${COLORS.bright}========== GỠ BỎ TIỆN ÍCH (CLEAR) ==========${COLORS.reset}\n`);
    console.log(`${COLORS.bright}[*] Đang xóa extension khỏi StarUML...${COLORS.reset}`);
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        console.log(`${COLORS.green}✔ Đã gỡ bỏ extension thành công.${COLORS.reset}\n`);
    } else {
        console.log(`${COLORS.yellow}[*] Không tìm thấy extension, không cần gỡ bỏ.${COLORS.reset}\n`);
    }
}

function clearAll() {
    console.log(`\n${COLORS.magenta}${COLORS.bright}========== GỠ BỎ HOÀN TOÀN STARUML (CLEAR ALL) ==========${COLORS.reset}\n`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question(`${COLORS.bgRed}${COLORS.bright} [!] CẢNH BÁO: ${COLORS.reset}${COLORS.red} Thao tác này sẽ xóa HOÀN TOÀN StarUML và sạch sẽ mọi cấu hình. Bạn có chắc chắn? (y/N): ${COLORS.reset}`, (answer) => {
        rl.close();
        if (answer.trim().toLowerCase() !== 'y') {
            console.log(`\n${COLORS.yellow}[*] Đã hủy thao tác.${COLORS.reset}\n`);
            return;
        }

        console.log(`\n${COLORS.bright}[*] Đang đóng StarUML...${COLORS.reset}`);
        try {
            if (platform === 'win32') {
                execSync('taskkill /F /IM StarUML.exe', { stdio: 'ignore' });
            } else {
                execSync('pkill -f "StarUML"', { stdio: 'ignore' });
            }
        } catch (e) {}

        setTimeout(() => {
            console.log(`${COLORS.bright}[*] Đang xóa ứng dụng chính...${COLORS.reset}`);
            try {
                if (platform === 'win32') {
                    const userUninstall = path.join(process.env.LocalAppData || '', 'Programs\\StarUML\\Uninstall StarUML.exe');
                    const sysUninstall = path.join(process.env.ProgramFiles || '', 'StarUML\\Uninstall StarUML.exe');
                    
                    if (fs.existsSync(userUninstall)) {
                        execSync(`"${userUninstall}" /S`, { stdio: 'ignore' });
                    } else if (fs.existsSync(sysUninstall)) {
                        execSync(`"${sysUninstall}" /S`, { stdio: 'ignore' });
                    } else {
                        console.log(`    ${COLORS.yellow}[!] Không tìm thấy trình gỡ cài đặt chính thức.${COLORS.reset}`);
                    }
                } else if (platform === 'darwin') {
                    const appPath = '/Applications/StarUML.app';
                    if (fs.existsSync(appPath)) {
                        fs.rmSync(appPath, { recursive: true, force: true });
                    }
                }
            } catch (e) {
                console.error(`    ${COLORS.red}[!] Gặp lỗi khi xóa App. Bạn có thể cần chạy bằng quyền sudo/Admin.${COLORS.reset}`);
            }

            console.log(`${COLORS.bright}[*] Đang dọn dẹp cấu hình, cache, logs...${COLORS.reset}`);
            const pathsToRemove = [];
            
            if (platform === 'win32') {
                const appData = process.env.APPDATA;
                const localAppData = process.env.LocalAppData;
                if(appData) pathsToRemove.push(path.join(appData, 'StarUML'));
                if(localAppData) pathsToRemove.push(path.join(localAppData, 'StarUML-updater'));
            } else if (platform === 'darwin') {
                const home = os.homedir();
                pathsToRemove.push(
                    path.join(home, 'Library/Application Support/StarUML'),
                    path.join(home, 'Library/Caches/io.staruml.StarUML'),
                    path.join(home, 'Library/Caches/StarUML'),
                    path.join(home, 'Library/Preferences/io.staruml.StarUML.plist'),
                    path.join(home, 'Library/Preferences/com.staruml.StarUML.plist'),
                    path.join(home, 'Library/Logs/StarUML'),
                    path.join(home, 'Library/Logs/io.staruml.StarUML'),
                    path.join(home, 'Library/Saved Application State/io.staruml.StarUML.savedState'),
                    path.join(home, 'Library/Saved Application State/com.staruml.StarUML.savedState')
                );
            }

            pathsToRemove.forEach(p => {
                if (fs.existsSync(p)) {
                    try {
                        fs.rmSync(p, { recursive: true, force: true });
                        console.log(`${COLORS.green}  ✔ Đã xóa: ${p}${COLORS.reset}`);
                    } catch(e) {
                        console.error(`${COLORS.red}  ✗ Lỗi khi xóa: ${p}${COLORS.reset}`);
                    }
                }
            });

            console.log(`\n${COLORS.bgGreen}${COLORS.bright} DỌN DẸP HOÀN TẤT! Đã gỡ bỏ StarUML sạch sẽ. ${COLORS.reset}\n`);
        }, 1000);
    });
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
    console.log(`${COLORS.red}  [4] Xóa sạch StarUML (Clear All) - Gỡ cài đặt tận gốc phần mềm StarUML${COLORS.reset}`);
    console.log(`${COLORS.dim}  [5] Thoát công cụ (Exit)${COLORS.reset}\n`);
    
    rl.question(`${COLORS.bright}Lựa chọn của bạn (1-5): ${COLORS.reset}`, (answer) => {
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
                clearAll();
                break;
            case '5':
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
        case 'clear-all':
            clearAll();
            break;
        case 'help':
        case '--help':
        case '-h':
            console.log(`\n${COLORS.bright}CÁCH SỬ DỤNG STARUML IMPORTER CLI:${COLORS.reset}`);
            console.log(`  node manage.js            - Mở menu tương tác`);
            console.log(`  node manage.js install    - Cài đặt tiện ích`);
            console.log(`  node manage.js update     - Kéo code mới và cài đặt`);
            console.log(`  node manage.js clear      - Xóa tiện ích khỏi StarUML`);
            console.log(`  node manage.js clear-all  - Xóa sạch StarUML khỏi máy\n`);
            break;
        default:
            console.log(`${COLORS.red}Lệnh không hợp lệ: "${action}". Chạy "node manage.js --help" để xem hướng dẫn.${COLORS.reset}\n`);
            process.exit(1);
    }
}

main();
