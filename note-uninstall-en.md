# StarUML Clean Uninstallation Guide (macOS & Windows)

This guide helps you completely clean all installation data, caches, and configuration files of StarUML to prepare for a fresh reinstallation (Resets 30-day evaluation).

---

## 🍎 Guide for macOS (Macbook)

You can choose one of the two options below:

### Option 1: Using Automatic Script (Recommended)
Run the built-in clean script:
```bash
./clear.sh
```

### Option 2: Manual via Terminal
Open the **Terminal** app and run the following commands:

1. **Close running StarUML processes:**
   ```bash
   pkill -f StarUML 2>/dev/null || true
   ```

2. **Remove main application and all config/cache files:**
   ```bash
   rm -rf "/Applications/StarUML.app"
   rm -rf "$HOME/Library/Application Support/StarUML"
   rm -rf "$HOME/Library/Caches/io.staruml.StarUML"
   rm -rf "$HOME/Library/Caches/StarUML"
   rm -f "$HOME/Library/Preferences/io.staruml.StarUML.plist"
   rm -f "$HOME/Library/Preferences/com.staruml.StarUML.plist"
   rm -rf "$HOME/Library/Logs/StarUML"
   rm -rf "$HOME/Library/Logs/io.staruml.StarUML"
   rm -rf "$HOME/Library/Saved Application State/io.staruml.StarUML.savedState"
   rm -rf "$HOME/Library/Saved Application State/com.staruml.StarUML.savedState"
   rm -f "$HOME/Library/Application Support/CrashReporter/StarUML_B7179D46-FBD6-5895-9D1B-08A989E61515.plist"
   rm -f "$HOME/Library/Application Support/com.apple.sharedfilelist/com.apple.LSSharedFileList.ApplicationRecentDocuments/io.staruml.staruml.sfl3"
   ```

3. **Verify if any files remain:**
   ```bash
   find "$HOME/Library" -iname "*staruml*" 2>/dev/null
   ```
   > [!NOTE]
   > If the Terminal returns no results, StarUML has been completely uninstalled.

---

## 💻 Guide for Windows

You can use the automatic file or perform manual steps as follows:

### Option 1: Using Automatic Script (Recommended)
**Double-click** the script file:
```text
clear.bat
```

### Option 2: Manual Steps
* **Step 1: Uninstall the application**
  1. Open **Control Panel** on your computer.
  2. Select **Programs and Features** (or *Uninstall a program*).
  3. Find **StarUML**, right-click, and select **Uninstall** to remove it.

* **Step 2: Delete residual directories**
  1. Open **File Explorer** (Win + E), go to: `C:\Program Files` -> Find and delete the **StarUML** folder (if it exists).
  2. Go to: `C:\Users\<Your-Username>\AppData\Roaming` -> Find and delete the **StarUML** folder.
     *(Quick Tip: Press `Win + R`, type `%APPDATA%` and hit Enter to open the Roaming folder directly).*

---

## 🔄 Step 3: Reinstall (Both Operating Systems)

1. Visit [StarUML Download](https://staruml.io/download) official page to download the appropriate installer for your OS.
2. Open the downloaded installer and proceed with installation as normal.

### 🎉 Result
After completing the setup, open StarUML and you will see a fresh **30-day evaluation** period instead of the expiration warning.

---

## 📺 References
* **Detailed Video Guide:** [Watch on YouTube](https://youtu.be/gZUSPmEOMGQ?si=xDPRAiWvb4nzXYJr)
