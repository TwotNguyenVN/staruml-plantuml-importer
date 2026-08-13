const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const manage = require("../manage");

assert.strictEqual(typeof manage.safeDeleteExtension, "function", "manage.js must export canonical deletion validation");

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "staruml-delete-safety-"));
try {
  const userRoot = path.join(temporaryRoot, "StarUML", "extensions", "user");
  const target = path.join(userRoot, "twot.staruml-plantuml-importer");
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, "marker.txt"), "temporary test only");
  manage.safeDeleteExtension(target, userRoot);
  assert.strictEqual(fs.existsSync(target), false, "Validated temporary extension should be deleted");

  const outsideRoot = path.join(temporaryRoot, "outside");
  const outsideTarget = path.join(outsideRoot, "twot.staruml-plantuml-importer");
  fs.mkdirSync(outsideTarget, { recursive: true });
  assert.throws(function () {
    manage.safeDeleteExtension(outsideTarget, userRoot);
  }, /canonical|containment|root/i, "Deletion outside the exact user-extension root must be rejected");
  assert.strictEqual(fs.existsSync(outsideTarget), true);

  const realDirectory = path.join(temporaryRoot, "real-extension");
  fs.mkdirSync(realDirectory);
  fs.mkdirSync(userRoot, { recursive: true });
  const linkedTarget = path.join(userRoot, "twot.staruml-plantuml-importer");
  try {
    fs.symlinkSync(realDirectory, linkedTarget, process.platform === "win32" ? "junction" : "dir");
    assert.throws(function () {
      manage.safeDeleteExtension(linkedTarget, userRoot);
    }, /symbolic|junction|reparse/i, "Linked extension targets must be rejected");
    assert.strictEqual(fs.existsSync(realDirectory), true);
  } catch (error) {
    if (!error || (error.code !== "EPERM" && error.code !== "EACCES")) throw error;
  }
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

function extractTopLevelShellExecution(source) {
  const lines = source.split(/\r?\n/);
  let inFunction = false;
  let lastFunctionEnd = -1;
  lines.forEach(function(line, index) {
    if (!inFunction && /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\(\)\s*\{\s*$/.test(line)) {
      inFunction = true;
    } else if (inFunction && /^\s*\}\s*$/.test(line)) {
      inFunction = false;
      lastFunctionEnd = index;
    }
  });
  assert.strictEqual(inFunction, false, "Shell function extraction must end outside a function");
  return lines.slice(lastFunctionEnd + 1);
}

function assertTopLevelInstallPreflight(source) {
  const execution = extractTopLevelShellExecution(source);
  const preflightIndex = execution.findIndex(line => /^validate_install_paths\b/.test(line.trim()));
  const firstMutationIndex = execution.findIndex(line =>
    /^(?:mkdir|cp|rm|mv)\b/.test(line.trim()) || /^(?:install|remove)_extension_atomic\b/.test(line.trim())
  );
  assert.notStrictEqual(preflightIndex, -1, "install.sh must execute top-level validate_install_paths");
  assert.notStrictEqual(firstMutationIndex, -1, "install.sh must contain a top-level filesystem mutation");
  assert.ok(preflightIndex < firstMutationIndex, "install.sh top-level preflight must precede every mutation");
}

const installShell = read("install.sh");
assertTopLevelInstallPreflight(installShell);
const installWithoutTopLevelPreflight = installShell.replace(
  /^(validate_install_paths\b[^\r\n]*\r?\n)/m,
  ""
);
assert.throws(
  function() { assertTopLevelInstallPreflight(installWithoutTopLevelPreflight); },
  /top-level validate_install_paths/,
  "Shell contract must fail when the top-level preflight is removed"
);
assert.match(installShell, /native-path-safety\.sh/, "install.sh must use the shared POSIX atomic helper");
assert.match(installShell, /^install_extension_atomic\s+"\$EXTENSION_ROOT"\s+"\$SCRIPT_DIR"/m);
const clearShell = read("clear.sh");
assert.match(clearShell, /native-path-safety\.sh/, "clear.sh must use the shared POSIX atomic helper");
assert.match(clearShell, /^remove_extension_atomic\s+"\$EXTENSION_ROOT"\s+"twot\.staruml-plantuml-importer"/m);

const installBatch = read("install.bat");
assert.doesNotMatch(
  installBatch,
  /-(?:Root|Target|Source|Destination|RelativeDestination)\b/i,
  "install.bat must pass constants only to the atomic helper"
);
assert.match(installBatch, /-Action\s+Install\s+-Name\s+"twot\.staruml-plantuml-importer"/i);
assert.doesNotMatch(installBatch, /\bcopy\b|:SafeCopy/i, "install.bat must not copy outside the atomic helper");
installBatch.split(/\r?\n/).filter(line => /native-path-safety\.ps1/i.test(line)).forEach(line => {
  assert.match(
    line.trim(),
    /^powershell\.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0scripts\\native-path-safety\.ps1" -Action (?:Install|Remove) -Name "(?:twot\.staruml-plantuml-importer|staruml-plantuml-importer|staruml-usecase-importer)"$/i,
    "install.bat helper invocations must pass constants only"
  );
});
const clearBatch = read("clear.bat");
assert.doesNotMatch(clearBatch, /-(?:Root|Target|Source|Destination|RelativeDestination)\b/i);
assert.match(clearBatch, /-Action\s+Remove\s+-Name\s+"twot\.staruml-plantuml-importer"/i);
assert.match(
  clearBatch.split(/\r?\n/).find(line => /native-path-safety\.ps1/i.test(line)).trim(),
  /^powershell\.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0scripts\\native-path-safety\.ps1" -Action Remove -Name "twot\.staruml-plantuml-importer"$/i,
  "clear.bat helper invocation must pass constants only"
);

const powerShellSafety = read("scripts/native-path-safety.ps1");
[
  "Assert-NoReparseInExistingPath",
  "Assert-ExactTarget",
  "Install-ExtensionAtomic",
  "Move-EntryAtomic",
  "Remove-EntryNoFollow"
].forEach(functionName => {
  assert.ok(powerShellSafety.includes("function " + functionName), "PowerShell safety module must define " + functionName);
});

function selectPosixShell(platformName) {
  if (platformName === "win32") {
    const gitBash = "C:\\Program Files\\Git\\bin\\bash.exe";
    assert.ok(fs.existsSync(gitBash), "Verified Git Bash is required for native POSIX wrapper tests on Windows");
    return gitBash;
  }
  return "bash";
}

const posixShell = selectPosixShell(process.platform);
assert.strictEqual(selectPosixShell("linux"), "bash", "Ubuntu CI must resolve bash from PATH");
assert.strictEqual(selectPosixShell("darwin"), "bash", "macOS must resolve bash from PATH");
if (process.platform === "win32") {
  assert.strictEqual(posixShell, "C:\\Program Files\\Git\\bin\\bash.exe");
} else {
  assert.strictEqual(posixShell, "bash", "Non-Windows POSIX tests must not require a Windows executable");
}
const shellProbe = spawnSync(posixShell, ["--version"], { encoding: "utf8" });
assert.ifError(shellProbe.error);
assert.strictEqual(shellProbe.status, 0, "Selected POSIX shell must be executable: " + shellProbe.stderr);

function toGitBashPath(windowsPath) {
  if (process.platform !== "win32") return windowsPath;
  return windowsPath.replace(/^([A-Za-z]):/, function(_, drive) {
    return "/" + drive.toLowerCase();
  }).replace(/\\/g, "/");
}

function runShell(script, extensionRoot, extraEnv, input) {
  const environment = Object.assign({}, process.env, {
    STARUML_NATIVE_TEST_MODE: "1"
  }, extraEnv || {});
  if (extensionRoot === undefined) delete environment.STARUML_EXTENSION_ROOT;
  else environment.STARUML_EXTENSION_ROOT = toGitBashPath(extensionRoot);
  return spawnSync(posixShell, [script], {
    cwd: path.join(__dirname, ".."),
    env: environment,
    input: input || "",
    encoding: "utf8"
  });
}

function runIsolationShell(extensionRoot, fakeProfileRoot, fakeProfileEnvironment) {
  assert.ok(fakeProfileRoot, "Isolation wrapper calls require an explicit fake profile root");
  ["APPDATA", "HOME", "USERPROFILE"].forEach(function(name) {
    assert.ok(
      fakeProfileEnvironment && Object.prototype.hasOwnProperty.call(fakeProfileEnvironment, name),
      "Isolation wrapper calls require explicit fake " + name
    );
    const profileValue = toGitBashPath(fakeProfileEnvironment[name]).toLowerCase();
    const fakeRootValue = toGitBashPath(fakeProfileRoot).toLowerCase();
    assert.ok(
      profileValue === fakeRootValue || profileValue.startsWith(fakeRootValue + "/"),
      "Isolation wrapper " + name + " must remain inside the explicit fake profile root"
    );
  });
  return runShell("install.sh", extensionRoot, fakeProfileEnvironment);
}

function snapshotTree(root) {
  const snapshot = {};

  function visit(entry, relative) {
    const metadata = fs.lstatSync(entry);
    const key = relative || ".";
    if (metadata.isSymbolicLink()) {
      snapshot[key] = "link:" + fs.readlinkSync(entry);
      return;
    }
    if (metadata.isDirectory()) {
      snapshot[key] = "directory";
      fs.readdirSync(entry).sort().forEach(function(name) {
        visit(path.join(entry, name), relative ? path.join(relative, name) : name);
      });
      return;
    }
    const digest = crypto.createHash("sha256").update(fs.readFileSync(entry)).digest("hex");
    snapshot[key] = "file:" + metadata.size + ":" + digest;
  }

  visit(root, "");
  return snapshot;
}

function assertRejectedInstallLeavesTreeUnchanged(label, watchedRoot, runInstall) {
  const before = snapshotTree(watchedRoot);
  const result = runInstall();
  const after = snapshotTree(watchedRoot);
  assert.ifError(result.error);
  assert.notStrictEqual(
    result.status,
    0,
    "Install entry point must reject " + label + ": " + result.stderr + result.stdout
  );
  assert.deepStrictEqual(after, before, "Rejected install must not mutate " + label + " tree");
}

const shellIsolationRoot = fs.mkdtempSync(path.join(os.tmpdir(), "staruml-shell-isolation-"));
try {
  const fakeAppData = path.join(shellIsolationRoot, "FakeAppData");
  const fakeHome = path.join(shellIsolationRoot, "FakeHome");
  const fakeProductionRoot = path.join(fakeAppData, "StarUML", "extensions", "user");
  const fakeEnvironment = {
    APPDATA: fakeAppData,
    HOME: toGitBashPath(fakeHome),
    USERPROFILE: fakeHome
  };
  fs.mkdirSync(fakeHome, { recursive: true });
  fs.mkdirSync(fakeProductionRoot, { recursive: true });
  fs.writeFileSync(path.join(fakeAppData, "production-base-marker.txt"), "production base");
  fs.writeFileSync(path.join(fakeProductionRoot, "production-root-marker.txt"), "production root");
  [
    "twot.staruml-plantuml-importer",
    "staruml-plantuml-importer",
    "staruml-usecase-importer"
  ].forEach(function(name) {
    const seededTarget = path.join(fakeProductionRoot, name);
    fs.mkdirSync(seededTarget);
    fs.writeFileSync(path.join(seededTarget, "marker.txt"), name);
  });

  ["APPDATA", "HOME", "USERPROFILE"].forEach(function(name) {
    const incompleteEnvironment = Object.assign({}, fakeEnvironment);
    delete incompleteEnvironment[name];
    assert.throws(function() {
      runIsolationShell(fakeProductionRoot, shellIsolationRoot, incompleteEnvironment);
    }, new RegExp("explicit fake " + name), "Isolation wrapper gate must reject missing fake " + name);
  });

  const mutationProofRoot = path.join(shellIsolationRoot, "mutation-proof");
  fs.mkdirSync(mutationProofRoot);
  fs.writeFileSync(path.join(mutationProofRoot, "marker.txt"), "unchanged");
  assert.throws(function() {
    assertRejectedInstallLeavesTreeUnchanged(
      "controlled mutation",
      mutationProofRoot,
      function() {
        fs.writeFileSync(path.join(mutationProofRoot, "main.js"), "unexpected manifest file");
        return { status: 1, stdout: "", stderr: "" };
      }
    );
  }, /must not mutate/i, "Snapshot assertion must detect mutation despite a rejected exit status");
  fs.rmSync(mutationProofRoot, { recursive: true, force: true });

  if (process.platform === "win32") {
    const fakeProductionPosix = toGitBashPath(fakeProductionRoot);
    [
      [fakeProductionPosix.toUpperCase(), "case-variant production root"],
      [(fakeProductionPosix + "/ISOLATED-CHILD").toUpperCase(), "case-variant production child"],
      [path.posix.dirname(fakeProductionPosix).toUpperCase(), "case-variant production parent"]
    ].forEach(function(testCase) {
      assertRejectedInstallLeavesTreeUnchanged(testCase[1], shellIsolationRoot, function() {
        return runIsolationShell(testCase[0], shellIsolationRoot, fakeEnvironment);
      });
    });
  }
} finally {
  fs.rmSync(shellIsolationRoot, { recursive: true, force: true });
}

const shellTemporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "staruml-shell-atomic-"));
try {
  const shellRoot = path.join(shellTemporaryRoot, "config", "StarUML", "extensions", "user");
  const shellTarget = path.join(shellRoot, "twot.staruml-plantuml-importer");
  if (process.platform === "win32") {
    const realProductionRootString = path.join(process.env.APPDATA, "StarUML", "extensions", "user");
    const shellProductionPosix = toGitBashPath(realProductionRootString);
    [
      [shellProductionPosix.toUpperCase(), "case-variant production root"],
      [(shellProductionPosix + "/isolated-child").toUpperCase(), "case-variant production child"],
      [path.posix.dirname(shellProductionPosix).toUpperCase(), "case-variant production parent"]
    ].forEach(function(testCase) {
      const comparisonResult = spawnSync(posixShell, ["-lc", [
        '. "scripts/native-path-safety.sh"',
        'production_root="$(derive_production_extension_root "$OSTYPE")"',
        'assert_test_root_isolated "$1" "$production_root" "$OSTYPE"'
      ].join("; "), "--", testCase[0]], {
        cwd: path.join(__dirname, ".."),
        env: Object.assign({}, process.env),
        encoding: "utf8"
      });
      assert.notStrictEqual(comparisonResult.status, 0, "MSYS comparison must reject " + testCase[1]);
    });
  } else {
    const linuxProductionRoot = path.join(shellTemporaryRoot, "production-root");
    const exactComparison = spawnSync(posixShell, ["-lc", [
      '. "scripts/native-path-safety.sh"',
      'assert_test_root_isolated "$1" "$2" linux'
    ].join("; "), "--", linuxProductionRoot, linuxProductionRoot], {
      cwd: path.join(__dirname, ".."), encoding: "utf8"
    });
    assert.notStrictEqual(exactComparison.status, 0, "Linux comparison must reject the exact production root");
    const caseVariantComparison = spawnSync(posixShell, ["-lc", [
      '. "scripts/native-path-safety.sh"',
      'assert_test_root_isolated "$1" "$2" linux'
    ].join("; "), "--", linuxProductionRoot.toUpperCase(), linuxProductionRoot], {
      cwd: path.join(__dirname, ".."), encoding: "utf8"
    });
    assert.strictEqual(caseVariantComparison.status, 0, "Linux root isolation must remain case-sensitive");
  }

  ["STARUML_NATIVE_TEST_FAIL_RENAME", "STARUML_NATIVE_TEST_FAIL_PROMOTE"].forEach(function(flag) {
    const shellFlagOutsideTestMode = spawnSync(posixShell, ["-lc", [
      '. "scripts/native-path-safety.sh"',
      flag + '=1',
      'STARUML_NATIVE_TEST_MODE=',
      'validate_test_controls'
    ].join("; ")], { cwd: path.join(__dirname, ".."), encoding: "utf8" });
    assert.notStrictEqual(shellFlagOutsideTestMode.status, 0, flag + " must be rejected outside test mode");
  });

  fs.mkdirSync(shellTarget, { recursive: true });
  fs.writeFileSync(path.join(shellTarget, "obsolete.txt"), "replace me");
  const shellInstall = runShell("install.sh", shellRoot);
  assert.strictEqual(shellInstall.status, 0, "Isolated install.sh should succeed: " + shellInstall.stderr + shellInstall.stdout);
  assert.strictEqual(fs.existsSync(path.join(shellTarget, "main.js")), true);
  assert.strictEqual(fs.existsSync(path.join(shellTarget, "obsolete.txt")), false, "Atomic install must replace the old tree");
  assert.deepStrictEqual(
    fs.readdirSync(shellRoot).filter(name => /\.(?:staging|quarantine)\./.test(name)),
    [],
    "Atomic install must clean private staging and quarantine entries"
  );

  const shellClear = runShell("clear.sh", shellRoot, null, "y\n");
  assert.strictEqual(shellClear.status, 0, "Isolated clear.sh should succeed: " + shellClear.stderr + shellClear.stdout);
  assert.strictEqual(fs.existsSync(shellTarget), false);

  const shellEscape = runShell("install.sh", shellRoot + "/../escape");
  assert.notStrictEqual(shellEscape.status, 0, "install.sh must reject lexical parent traversal in test root");
  const missingTestFlag = runShell("install.sh", shellRoot, { STARUML_NATIVE_TEST_MODE: "" });
  assert.notStrictEqual(missingTestFlag.status, 0, "Explicit root must be refused outside dedicated test mode");
  assert.match(missingTestFlag.stdout + missingTestFlag.stderr, /test mode/i);

  const shellOutside = path.join(shellTemporaryRoot, "outside-target");
  fs.mkdirSync(shellOutside);
  fs.writeFileSync(path.join(shellOutside, "marker.txt"), "outside");
  fs.symlinkSync(shellOutside, shellTarget, process.platform === "win32" ? "junction" : "dir");
  const linkedTargetInstall = runShell("install.sh", shellRoot);
  assert.notStrictEqual(linkedTargetInstall.status, 0, "Install must reject an existing linked target");
  assert.strictEqual(fs.lstatSync(shellTarget).isSymbolicLink(), true, "Rejected install must leave target link in place");
  assert.strictEqual(fs.readFileSync(path.join(shellOutside, "marker.txt"), "utf8"), "outside");
  assert.deepStrictEqual(fs.readdirSync(shellRoot).filter(name => /\.(?:staging|quarantine)\./.test(name)), []);
  fs.rmSync(shellTarget, { force: true });

  fs.symlinkSync(shellOutside, shellTarget, process.platform === "win32" ? "junction" : "dir");
  const linkedTargetClear = runShell("clear.sh", shellRoot, null, "y\n");
  assert.notStrictEqual(linkedTargetClear.status, 0, "Clear must reject an existing linked target");
  assert.strictEqual(fs.lstatSync(shellTarget).isSymbolicLink(), true, "Rejected clear must leave target link in place");
  assert.strictEqual(fs.readFileSync(path.join(shellOutside, "marker.txt"), "utf8"), "outside");
  assert.deepStrictEqual(fs.readdirSync(shellRoot).filter(name => /\.(?:staging|quarantine)\./.test(name)), []);
  fs.rmSync(shellTarget, { force: true });

  fs.mkdirSync(shellTarget);
  fs.writeFileSync(path.join(shellTarget, "original.txt"), "original");
  const failedShellPromotion = runShell("install.sh", shellRoot, { STARUML_NATIVE_TEST_FAIL_PROMOTE: "1" });
  assert.notStrictEqual(failedShellPromotion.status, 0, "Install must expose isolated promotion failure");
  assert.strictEqual(fs.readFileSync(path.join(shellTarget, "original.txt"), "utf8"), "original");
  assert.deepStrictEqual(fs.readdirSync(shellRoot).filter(name => /\.(?:staging|quarantine)\./.test(name)), []);

  const failedShellClear = runShell("clear.sh", shellRoot, { STARUML_NATIVE_TEST_FAIL_RENAME: "1" }, "y\n");
  assert.notStrictEqual(failedShellClear.status, 0, "clear.sh must abort when atomic quarantine rename fails");
  assert.strictEqual(fs.existsSync(path.join(shellTarget, "original.txt")), true, "Failed rename must leave target intact");
  runShell("clear.sh", shellRoot, null, "y\n");

  fs.mkdirSync(path.join(shellTarget, "nested"), { recursive: true });
  fs.symlinkSync(shellOutside, path.join(shellTarget, "nested", "outside"), process.platform === "win32" ? "junction" : "dir");
  const linkedChildClear = runShell("clear.sh", shellRoot, null, "y\n");
  assert.strictEqual(linkedChildClear.status, 0, "Clear may remove linked children as leaves after quarantining a normal target");
  assert.strictEqual(fs.readFileSync(path.join(shellOutside, "marker.txt"), "utf8"), "outside");
  assert.strictEqual(fs.existsSync(shellTarget), false);

  const realShellRoot = path.join(shellTemporaryRoot, "real-root");
  const linkedShellRoot = path.join(shellTemporaryRoot, "linked-root");
  fs.mkdirSync(realShellRoot);
  fs.symlinkSync(realShellRoot, linkedShellRoot, process.platform === "win32" ? "junction" : "dir");
  const linkedRootInstall = runShell("install.sh", linkedShellRoot);
  assert.notStrictEqual(linkedRootInstall.status, 0, "install.sh must reject a linked root");
  assert.strictEqual(fs.existsSync(path.join(realShellRoot, "twot.staruml-plantuml-importer")), false);
} finally {
  fs.rmSync(shellTemporaryRoot, { recursive: true, force: true });
}

const powerShellCommand = process.platform === "win32" ? "powershell.exe" : "pwsh";
const powerShellProbe = spawnSync(powerShellCommand, ["-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.ToString()"], { encoding: "utf8" });
if (powerShellProbe.error && powerShellProbe.error.code === "ENOENT") {
  console.log("SKIP: PowerShell-specific deletion safety cases require " + powerShellCommand + ", which is unavailable.");
} else if (process.platform !== "win32") {
  assert.ifError(powerShellProbe.error);
  assert.strictEqual(powerShellProbe.status, 0, "PowerShell capability probe must succeed: " + powerShellProbe.stderr);
  const syntaxCommand = "$errors = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('" +
    path.join(__dirname, "..", "scripts", "native-path-safety.ps1").replace(/'/g, "''") +
    "', [ref]$null, [ref]$errors); if ($errors.Count) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }";
  const syntaxResult = spawnSync(powerShellCommand, ["-NoProfile", "-NonInteractive", "-Command", syntaxCommand], { encoding: "utf8" });
  assert.ifError(syntaxResult.error);
  assert.strictEqual(syntaxResult.status, 0, "PowerShell helper syntax must parse under pwsh: " + syntaxResult.stderr);
  console.log("SKIP: PowerShell filesystem cases require Windows path and junction semantics; pwsh syntax capability was verified.");
} else {
  assert.ifError(powerShellProbe.error);
  assert.strictEqual(powerShellProbe.status, 0, "PowerShell capability probe must succeed: " + powerShellProbe.stderr);
  const powerShellScript = path.join(__dirname, "..", "scripts", "native-path-safety.ps1");
  const nativeTemporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "staruml-native-safety-"));
  const nativeRoot = path.join(nativeTemporaryRoot, "config", "StarUML", "extensions", "user");
  const extensionName = "twot.staruml-plantuml-importer";
  const nativeTarget = path.join(nativeRoot, extensionName);
  const nativeProductionRoot = path.join(process.env.APPDATA, "StarUML", "extensions", "user");

  function runPowerShell(action, extraArguments, name) {
    return spawnSync(powerShellCommand, [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
      "-File", powerShellScript,
      "-Action", action,
      "-TestMode",
      "-Root", nativeRoot,
      "-Name", name || extensionName
    ].concat(extraArguments || []), { encoding: "utf8" });
  }

  try {
    [
      [null, "missing explicit test root"],
      [nativeProductionRoot, "production root"],
      [path.join(nativeProductionRoot, "isolated-child"), "child of production root"],
      [path.dirname(nativeProductionRoot), "parent containing production root"]
    ].forEach(function(testCase) {
      const args = [
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", powerShellScript,
        "-Action", "Remove",
        "-TestMode",
        "-Name", extensionName
      ];
      if (testCase[0]) args.push("-Root", testCase[0]);
      const isolationResult = spawnSync(powerShellCommand, args, { encoding: "utf8" });
      assert.notStrictEqual(isolationResult.status, 0, "PowerShell TestMode must reject " + testCase[1]);
    });

    ["-FailAtomicRenameForTest", "-FailPromotionForTest"].forEach(function(flag) {
      const nativeFlagOutsideTestMode = spawnSync(powerShellCommand, [
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", powerShellScript,
        "-Action", "Remove",
        "-Name", extensionName,
        flag
      ], { encoding: "utf8" });
      assert.notStrictEqual(nativeFlagOutsideTestMode.status, 0, flag + " must be rejected outside TestMode");
    });

    fs.mkdirSync(nativeTarget, { recursive: true });
    fs.writeFileSync(path.join(nativeTarget, "obsolete.txt"), "replace me");
    var installResult = runPowerShell("Install");
    assert.strictEqual(installResult.status, 0, "Temporary native install should succeed: " + installResult.stderr);
    assert.strictEqual(fs.existsSync(path.join(nativeTarget, "main.js")), true);
    assert.strictEqual(fs.existsSync(path.join(nativeTarget, "obsolete.txt")), false);
    assert.deepStrictEqual(fs.readdirSync(nativeRoot).filter(name => /\.(?:staging|quarantine)\./.test(name)), []);

    ["../evil", "..", ".", "evil/name", "evil\\name", path.join(nativeTemporaryRoot, "rooted")].forEach(badName => {
      const escapedName = runPowerShell("Remove", [], badName);
      assert.notStrictEqual(escapedName.status, 0, "PowerShell must reject extension name: " + badName);
    });
    ["..\\escape.txt", ".\\escape.txt", "\\rooted.txt", "utils\\..\\escape.txt"].forEach(relativePath => {
      const escapedRelative = runPowerShell("Install", ["-RelativeDestination", relativePath]);
      assert.notStrictEqual(escapedRelative.status, 0, "PowerShell must reject relative path escape: " + relativePath);
    });

    const outsideDirectory = path.join(nativeTemporaryRoot, "outside");
    fs.mkdirSync(outsideDirectory);
    fs.writeFileSync(path.join(outsideDirectory, "marker.txt"), "outside");
    runPowerShell("Remove");
    try {
      fs.symlinkSync(outsideDirectory, nativeTarget, "junction");
    } catch (error) {
      throw new Error("Windows junction capability is required and unavailable: " + error.message);
    }
    const linkedInstall = runPowerShell("Install");
    assert.notStrictEqual(linkedInstall.status, 0, "PowerShell install must reject a linked target");
    assert.strictEqual(fs.lstatSync(nativeTarget).isSymbolicLink(), true);
    assert.strictEqual(fs.readFileSync(path.join(outsideDirectory, "marker.txt"), "utf8"), "outside");
    assert.deepStrictEqual(fs.readdirSync(nativeRoot).filter(name => /\.(?:staging|quarantine)\./.test(name)), []);
    fs.rmSync(nativeTarget, { force: true });

    fs.symlinkSync(outsideDirectory, nativeTarget, "junction");
    const linkedNativeClear = runPowerShell("Remove");
    assert.notStrictEqual(linkedNativeClear.status, 0, "PowerShell clear must reject a linked target");
    assert.strictEqual(fs.lstatSync(nativeTarget).isSymbolicLink(), true);
    assert.strictEqual(fs.readFileSync(path.join(outsideDirectory, "marker.txt"), "utf8"), "outside");
    assert.deepStrictEqual(fs.readdirSync(nativeRoot).filter(name => /\.(?:staging|quarantine)\./.test(name)), []);
    fs.rmSync(nativeTarget, { force: true });

    fs.mkdirSync(nativeTarget);
    fs.writeFileSync(path.join(nativeTarget, "original.txt"), "original");
    const failedNativePromotion = runPowerShell("Install", ["-FailPromotionForTest"]);
    assert.notStrictEqual(failedNativePromotion.status, 0, "PowerShell install must expose isolated promotion failure");
    assert.strictEqual(fs.readFileSync(path.join(nativeTarget, "original.txt"), "utf8"), "original");
    assert.deepStrictEqual(fs.readdirSync(nativeRoot).filter(name => /\.(?:staging|quarantine)\./.test(name)), []);

    const failedNativeRemove = runPowerShell("Remove", ["-FailAtomicRenameForTest"]);
    assert.notStrictEqual(failedNativeRemove.status, 0, "PowerShell remove must abort when atomic rename fails");
    assert.strictEqual(fs.existsSync(path.join(nativeTarget, "original.txt")), true, "Failed PowerShell rename must leave target intact");

    const rootWithoutTestMode = spawnSync(powerShellCommand, [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
      "-File", powerShellScript,
      "-Action", "Remove",
      "-Root", nativeRoot,
      "-Name", extensionName
    ], { encoding: "utf8" });
    assert.notStrictEqual(rootWithoutTestMode.status, 0, "PowerShell explicit root must require dedicated test mode");

    const linkedChild = path.join(nativeTarget, "parsers");
    try {
      fs.symlinkSync(outsideDirectory, linkedChild, "junction");
    } catch (error) {
      throw new Error("Windows child junction capability is required and unavailable: " + error.message);
    }

    var removeResult = runPowerShell("Remove");
    assert.strictEqual(removeResult.status, 0, "Temporary native removal should succeed: " + removeResult.stderr);
    assert.strictEqual(fs.existsSync(nativeTarget), false, "Temporary native removal should delete only the validated target");

    const realConfig = path.join(nativeTemporaryRoot, "real-config");
    const linkedConfig = path.join(nativeTemporaryRoot, "linked-config");
    fs.mkdirSync(realConfig);
    try {
      fs.symlinkSync(realConfig, linkedConfig, "junction");
    } catch (error) {
      throw new Error("Windows root junction capability is required and unavailable: " + error.message);
    }
    const linkedRootInstall = spawnSync(powerShellCommand, [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
      "-File", powerShellScript,
      "-Action", "Install",
      "-TestMode",
      "-Root", path.join(linkedConfig, "StarUML", "extensions", "user"),
      "-Name", extensionName
    ], { encoding: "utf8" });
    assert.notStrictEqual(linkedRootInstall.status, 0, "Install through a linked ancestor must be rejected");
    assert.strictEqual(fs.existsSync(path.join(realConfig, "StarUML")), false);
  } finally {
    fs.rmSync(nativeTemporaryRoot, { recursive: true, force: true });
  }
}

console.log("Deletion safety tests passed.");
