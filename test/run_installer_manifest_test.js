const fs = require("fs");
const path = require("path");
const assert = require("assert");
const os = require("os");
const manage = require("../manage");

const root = path.join(__dirname, "..");
const expected = [
  "PlantUML_Importer.png", "main.js", "package.json",
  "menus/menu.json", "keymaps/keymap.json",
  "utils/dialog-helper.js", "utils/parser-helper.js",
  "utils/preview-helper.js", "utils/input-guard.js",
  "parsers/usecase-parser.js", "parsers/class-parser.js",
  "parsers/sequence-parser.js", "parsers/activity-parser.js",
  "parsers/state-parser.js", "parsers/erd-parser.js",
  "parsers/mindmap-parser.js", "parsers/requirement-parser.js"
].sort();

function read(filename) {
  return fs.readFileSync(path.join(root, filename), "utf8");
}

function nativeManifest(filename, pattern) {
  var source = read(filename);
  var files = [];
  var match;
  while ((match = pattern.exec(source)) !== null) {
    files.push(match[1].replace(/\\/g, "/"));
  }
  return files.sort();
}

var powerShellSource = read("scripts/native-path-safety.ps1");
var powerShellManifest = /\$Manifest\s*=\s*@\(([\s\S]*?)\)\s*\n\s*function/.exec(powerShellSource);
assert.ok(powerShellManifest, "PowerShell helper should declare the fixed runtime manifest");
var batFiles = [];
var powerShellEntryPattern = /'([^']+)'/g;
var powerShellEntry;
while ((powerShellEntry = powerShellEntryPattern.exec(powerShellManifest[1])) !== null) {
  batFiles.push(powerShellEntry[1].replace(/\\/g, "/"));
}
batFiles.sort();
var shellFiles = nativeManifest("scripts/native-path-safety.sh", /copy_manifest_file\s+"\$1"\s+"\$2"\s+"([^"]+)"/g);
assert.deepStrictEqual(batFiles, expected, "install.bat should copy the complete runtime manifest");
assert.deepStrictEqual(shellFiles, expected, "install.sh should copy the complete runtime manifest");

var manageSource = read("manage.js");
var dirsMatch = manageSource.match(/const dirsToCopy = \[([^\]]+)\]/);
var filesMatch = manageSource.match(/const filesToCopy = \[([^\]]+)\]/);
assert.ok(dirsMatch, "manage.js should declare dirsToCopy");
assert.ok(filesMatch, "manage.js should declare filesToCopy");

function quotedValues(source) {
  var values = [];
  var pattern = /['"]([^'"]+)['"]/g;
  var match;
  while ((match = pattern.exec(source)) !== null) values.push(match[1]);
  return values;
}

var dirs = quotedValues(dirsMatch[1]).sort();
var rootFiles = quotedValues(filesMatch[1]).sort();
assert.deepStrictEqual(dirs, ["keymaps", "menus", "parsers", "utils"], "manage.js should copy all runtime directories");
assert.deepStrictEqual(rootFiles, ["PlantUML_Importer.png", "main.js", "package.json"], "manage.js should copy all runtime root files");

var managedFiles = rootFiles.slice();
dirs.forEach(function(dir) {
  fs.readdirSync(path.join(root, dir)).forEach(function(filename) {
    managedFiles.push(dir + "/" + filename);
  });
});
assert.deepStrictEqual(managedFiles.sort(), expected, "manage.js directories should contain exactly the runtime manifest");

assert.strictEqual(manage.install.length, 1, "manage.install must accept isolated path injection for regression tests");

var installTemporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "staruml-manage-install-"));
try {
  var sourceRoot = path.join(installTemporaryRoot, "source");
  var normalRoot = path.join(installTemporaryRoot, "normal-root");
  var normalTarget = path.join(normalRoot, "twot.staruml-plantuml-importer");
  fs.mkdirSync(sourceRoot);
  fs.writeFileSync(path.join(sourceRoot, "package.json"), "isolated package");

  manage.install({ targetDir: normalTarget, sourceDir: sourceRoot });
  assert.strictEqual(
    fs.readFileSync(path.join(normalTarget, "package.json"), "utf8"),
    "isolated package",
    "Normal isolated first-time install must succeed"
  );

  var externalRoot = path.join(installTemporaryRoot, "external-root");
  var linkedRoot = path.join(installTemporaryRoot, "linked-root");
  var linkedTarget = path.join(linkedRoot, "twot.staruml-plantuml-importer");
  fs.mkdirSync(externalRoot);
  fs.writeFileSync(path.join(externalRoot, "marker.txt"), "unchanged");
  fs.symlinkSync(externalRoot, linkedRoot, process.platform === "win32" ? "junction" : "dir");

  assert.throws(function() {
    manage.install({ targetDir: linkedTarget, sourceDir: sourceRoot });
  }, /symbolic|junction|reparse|linked|canonical/i, "First-time install through a linked extension root must be rejected");
  assert.deepStrictEqual(fs.readdirSync(externalRoot), ["marker.txt"], "Rejected install must not create or copy through the link");
  assert.strictEqual(fs.readFileSync(path.join(externalRoot, "marker.txt"), "utf8"), "unchanged");
} finally {
  fs.rmSync(installTemporaryRoot, { recursive: true, force: true });
}

console.log("Success: run_installer_manifest_test completed successfully.");
