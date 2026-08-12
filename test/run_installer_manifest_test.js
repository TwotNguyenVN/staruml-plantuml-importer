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
var manifestMatch = manageSource.match(/const REQUIRED_RUNTIME_FILES = \[([\s\S]*?)\];/);
assert.ok(manifestMatch, "manage.js should declare one explicit required runtime file manifest");

function quotedValues(source) {
  var values = [];
  var pattern = /['"]([^'"]+)['"]/g;
  var match;
  while ((match = pattern.exec(source)) !== null) values.push(match[1]);
  return values;
}

var managedFiles = quotedValues(manifestMatch[1]).sort();
assert.deepStrictEqual(managedFiles, expected, "manage.js should explicitly name every required runtime file");

assert.strictEqual(manage.install.length, 1, "manage.install must accept isolated path injection for regression tests");

var installTemporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "staruml-manage-install-"));
try {
  function createRuntimeTree(directory, packageContents) {
    fs.mkdirSync(directory, { recursive: true });
    expected.forEach(function(relativePath) {
      var destination = path.join(directory, relativePath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, relativePath === "package.json" ? packageContents : relativePath);
    });
  }

  var sourceRoot = path.join(installTemporaryRoot, "source");
  var normalRoot = path.join(installTemporaryRoot, "normal-root");
  var normalTarget = path.join(normalRoot, "twot.staruml-plantuml-importer");
  createRuntimeTree(sourceRoot, "isolated package");

  manage.install({ targetDir: normalTarget, sourceDir: sourceRoot });
  assert.strictEqual(
    fs.readFileSync(path.join(normalTarget, "package.json"), "utf8"),
    "isolated package",
    "Normal isolated first-time install must succeed"
  );

  function createExistingInstall(name) {
    var installRoot = path.join(installTemporaryRoot, name);
    var installTarget = path.join(installRoot, "twot.staruml-plantuml-importer");
    createRuntimeTree(installTarget, "existing package");
    return { root: installRoot, target: installTarget };
  }

  function assertExistingInstallSurvived(fixture, message) {
    assert.strictEqual(
      fs.readFileSync(path.join(fixture.target, "package.json"), "utf8"),
      "existing package",
      message
    );
    assert.deepStrictEqual(
      fs.readdirSync(fixture.root),
      ["twot.staruml-plantuml-importer"],
      "Failed install must clean only its staging and backup paths"
    );
  }

  var regressionFailures = [];
  try {
    var missingManifestInstall = createExistingInstall("missing-manifest-root");
    var incompleteSource = path.join(installTemporaryRoot, "incomplete-source");
    createRuntimeTree(incompleteSource, "incomplete package");
    fs.rmSync(path.join(incompleteSource, "parsers"), { recursive: true });
    assert.throws(function() {
      manage.install({ targetDir: missingManifestInstall.target, sourceDir: incompleteSource });
    }, /manifest|parsers|required/i, "Missing manifest entries must reject the install");
    assertExistingInstallSurvived(missingManifestInstall, "Missing manifest entries must preserve the existing install");
  } catch (error) {
    regressionFailures.push("missing manifest: " + error.message);
  }

  try {
    var missingNestedFileInstall = createExistingInstall("missing-nested-file-root");
    var missingNestedFileSource = path.join(installTemporaryRoot, "missing-nested-file-source");
    createRuntimeTree(missingNestedFileSource, "incomplete nested package");
    fs.rmSync(path.join(missingNestedFileSource, "parsers", "sequence-parser.js"));
    assert.throws(function() {
      manage.install({ targetDir: missingNestedFileInstall.target, sourceDir: missingNestedFileSource });
    }, /manifest|sequence-parser\.js|required/i, "A missing nested manifest file must reject the install");
    assertExistingInstallSurvived(missingNestedFileInstall, "A missing nested manifest file must preserve the live install");
  } catch (error) {
    regressionFailures.push("missing nested manifest file: " + error.message);
  }

  try {
    var emptySourceInstall = createExistingInstall("empty-source-root");
    var emptySource = path.join(installTemporaryRoot, "empty-source");
    fs.mkdirSync(emptySource);
    assert.throws(function() {
      manage.install({ targetDir: emptySourceInstall.target, sourceDir: emptySource });
    }, /manifest|required/i, "An empty source must reject the install");
    assertExistingInstallSurvived(emptySourceInstall, "An empty source must preserve the existing install");
  } catch (error) {
    regressionFailures.push("empty source: " + error.message);
  }

  try {
    var missingSourceInstall = createExistingInstall("missing-source-root");
    assert.throws(function() {
      manage.install({
        targetDir: missingSourceInstall.target,
        sourceDir: path.join(installTemporaryRoot, "source-does-not-exist")
      });
    }, /source|manifest|required|exist/i, "A missing source must reject the install");
    assertExistingInstallSurvived(missingSourceInstall, "A missing source must preserve the existing install");
  } catch (error) {
    regressionFailures.push("missing source: " + error.message);
  }

  try {
    var linkedSourceInstall = createExistingInstall("linked-source-install-root");
    var linkedSource = path.join(installTemporaryRoot, "linked-source");
    fs.symlinkSync(sourceRoot, linkedSource, process.platform === "win32" ? "junction" : "dir");
    assert.throws(function() {
      manage.install({ targetDir: linkedSourceInstall.target, sourceDir: linkedSource });
    }, /symbolic|junction|reparse|linked|canonical/i, "A linked source root must be rejected");
    assertExistingInstallSurvived(linkedSourceInstall, "A linked source root must preserve the existing install");
  } catch (error) {
    regressionFailures.push("linked source: " + error.message);
  }

  try {
    var invalidStagingInstall = createExistingInstall("invalid-staging-root");
    var stagingCopyFileSync = fs.copyFileSync;
    fs.copyFileSync = function(src, dest) {
      stagingCopyFileSync(src, dest);
      if (src === path.join(sourceRoot, "main.js")) {
        fs.rmSync(dest);
        fs.mkdirSync(dest);
      }
    };
    try {
      assert.throws(function() {
        manage.install({ targetDir: invalidStagingInstall.target, sourceDir: sourceRoot });
      }, /regular|file|staging|manifest/i, "Non-regular staged manifest entries must reject promotion");
    } finally {
      fs.copyFileSync = stagingCopyFileSync;
    }
    assertExistingInstallSurvived(invalidStagingInstall, "Invalid staging must preserve the existing install");
  } catch (error) {
    regressionFailures.push("invalid staging: " + error.message);
  }

  try {
    var recoveryRoot = path.join(installTemporaryRoot, "recovery-root");
    var recoveryTarget = path.join(recoveryRoot, "twot.staruml-plantuml-importer");
    var abandonedInvocation = path.join(recoveryRoot, ".twot.staruml-plantuml-importer-install-crashed");
    createRuntimeTree(path.join(abandonedInvocation, "backup"), "existing package");
    var recoveryCopyFileSync = fs.copyFileSync;
    fs.copyFileSync = function(src, dest) {
      if (src === path.join(sourceRoot, "package.json")) throw new Error("injected post-recovery copy failure");
      return recoveryCopyFileSync(src, dest);
    };
    try {
      assert.throws(function() {
        manage.install({ targetDir: recoveryTarget, sourceDir: sourceRoot });
      }, /post-recovery copy failure/, "A later failure must still be reported after recovery");
    } finally {
      fs.copyFileSync = recoveryCopyFileSync;
    }
    assert.strictEqual(
      fs.readFileSync(path.join(recoveryTarget, "package.json"), "utf8"),
      "existing package",
      "A sole valid abandoned backup must be restored before installing"
    );
    assert.deepStrictEqual(fs.readdirSync(recoveryRoot), ["twot.staruml-plantuml-importer"]);
  } catch (error) {
    regressionFailures.push("crash recovery: " + error.message);
  }

  try {
    var concurrentInstall = createExistingInstall("concurrent-install-root");
    var nestedInstallAttempted = false;
    var concurrentCopyFileSync = fs.copyFileSync;
    fs.copyFileSync = function(src, dest) {
      if (!nestedInstallAttempted && src === path.join(sourceRoot, "main.js")) {
        nestedInstallAttempted = true;
        assert.throws(function() {
          manage.install({
            targetDir: concurrentInstall.target,
            sourceDir: sourceRoot,
            lock: { now: function() { return 1000; }, ownerId: "second-owner" }
          });
        }, /active|already.*install|lock/i, "A second active install must be rejected by the installer lock");
      }
      return concurrentCopyFileSync(src, dest);
    };
    try {
      manage.install({
        targetDir: concurrentInstall.target,
        sourceDir: sourceRoot,
        lock: { now: function() { return 1000; }, ownerId: "first-owner" }
      });
    } finally {
      fs.copyFileSync = concurrentCopyFileSync;
    }
    assert.strictEqual(nestedInstallAttempted, true, "Concurrent install fixture must execute deterministically");
    assert.strictEqual(
      fs.readFileSync(path.join(concurrentInstall.target, "package.json"), "utf8"),
      "isolated package",
      "The first invocation must retain ownership and complete successfully"
    );
    assert.deepStrictEqual(fs.readdirSync(concurrentInstall.root), ["twot.staruml-plantuml-importer"]);
  } catch (error) {
    regressionFailures.push("concurrent install lock: " + error.message);
  }

  try {
    var oldAliveLockInstall = createExistingInstall("old-alive-lock-root");
    var oldAliveLock = path.join(oldAliveLockInstall.root, ".twot.staruml-plantuml-importer.lock");
    fs.mkdirSync(oldAliveLock);
    fs.writeFileSync(path.join(oldAliveLock, "owner.json"), JSON.stringify({
      ownerId: "old-live-owner",
      pid: 4242,
      createdAt: 1000
    }));
    assert.throws(function() {
      manage.install({
        targetDir: oldAliveLockInstall.target,
        sourceDir: sourceRoot,
        lock: {
          now: function() { return 10000; },
          staleAfterMs: 5000,
          ownerId: "replacement-owner",
          isProcessAlive: function(pid) {
            assert.strictEqual(pid, 4242);
            return true;
          }
        }
      });
    }, /active|already.*install|lock/i, "An old lock must not be stolen while its owner PID is alive");
    assert.strictEqual(fs.existsSync(oldAliveLock), true, "The live owner's lock must remain intact");
    assert.strictEqual(
      fs.readFileSync(path.join(oldAliveLockInstall.target, "package.json"), "utf8"),
      "existing package",
      "Rejecting an old live lock must not disrupt the active install target"
    );
  } catch (error) {
    regressionFailures.push("old alive install lock: " + error.message);
  }

  try {
    var staleRoot = path.join(installTemporaryRoot, "stale-lock-recovery-root");
    var staleTarget = path.join(staleRoot, "twot.staruml-plantuml-importer");
    var staleInvocation = path.join(staleRoot, ".twot.staruml-plantuml-importer-install-crashed");
    var staleLock = path.join(staleRoot, ".twot.staruml-plantuml-importer.lock");
    createRuntimeTree(path.join(staleInvocation, "backup"), "existing package");
    fs.mkdirSync(staleLock);
    fs.writeFileSync(path.join(staleLock, "owner.json"), JSON.stringify({
      ownerId: "abandoned-owner",
      pid: 1234,
      createdAt: 1000
    }));
    var staleCopyFileSync = fs.copyFileSync;
    fs.copyFileSync = function(src, dest) {
      if (src === path.join(sourceRoot, "package.json")) throw new Error("injected stale-lock post-recovery failure");
      return staleCopyFileSync(src, dest);
    };
    try {
      assert.throws(function() {
        manage.install({
          targetDir: staleTarget,
          sourceDir: sourceRoot,
          lock: {
            now: function() { return 10000; },
            staleAfterMs: 5000,
            ownerId: "replacement-owner",
            isProcessAlive: function(pid) {
              assert.strictEqual(pid, 1234);
              return false;
            }
          }
        });
      }, /stale-lock post-recovery failure/, "Install failure after stale-lock recovery must still be reported");
    } finally {
      fs.copyFileSync = staleCopyFileSync;
    }
    assert.strictEqual(
      fs.readFileSync(path.join(staleTarget, "package.json"), "utf8"),
      "existing package",
      "Abandoned backup recovery must run after safely replacing a stale lock"
    );
    assert.deepStrictEqual(fs.readdirSync(staleRoot), ["twot.staruml-plantuml-importer"]);
  } catch (error) {
    regressionFailures.push("stale lock recovery: " + error.message);
  }

  try {
    var deadLockInstall = createExistingInstall("fresh-dead-lock-root");
    var deadLock = path.join(deadLockInstall.root, ".twot.staruml-plantuml-importer.lock");
    fs.mkdirSync(deadLock);
    fs.writeFileSync(path.join(deadLock, "owner.json"), JSON.stringify({
      ownerId: "dead-owner",
      pid: 5252,
      createdAt: 9999
    }));
    manage.install({
      targetDir: deadLockInstall.target,
      sourceDir: sourceRoot,
      lock: {
        now: function() { return 10000; },
        staleAfterMs: 5000,
        ownerId: "replacement-owner",
        isProcessAlive: function(pid) {
          assert.strictEqual(pid, 5252);
          return false;
        }
      }
    });
    assert.strictEqual(
      fs.readFileSync(path.join(deadLockInstall.target, "package.json"), "utf8"),
      "isolated package",
      "A valid lock whose owner PID is confirmed dead must be reclaimed regardless of age"
    );
    assert.deepStrictEqual(fs.readdirSync(deadLockInstall.root), ["twot.staruml-plantuml-importer"]);
  } catch (error) {
    regressionFailures.push("dead install lock: " + error.message);
  }

  [
    { name: "missing", contents: null },
    { name: "invalid", contents: "{\"ownerId\":" }
  ].forEach(function(markerFixture) {
    try {
      var freshMarkerInstall = createExistingInstall("fresh-" + markerFixture.name + "-lock-root");
      var freshMarkerLock = path.join(freshMarkerInstall.root, ".twot.staruml-plantuml-importer.lock");
      fs.mkdirSync(freshMarkerLock);
      if (markerFixture.contents !== null) {
        fs.writeFileSync(path.join(freshMarkerLock, "owner.json"), markerFixture.contents);
      }
      var freshNow = Date.now();
      fs.utimesSync(freshMarkerLock, new Date(freshNow), new Date(freshNow));
      assert.throws(function() {
        manage.install({
          targetDir: freshMarkerInstall.target,
          sourceDir: sourceRoot,
          lock: {
            now: function() { return freshNow + 1000; },
            staleAfterMs: 5000,
            ownerId: "replacement-owner",
            isProcessAlive: function() {
              throw new Error("Invalid markers must not trigger PID liveness checks");
            }
          }
        });
      }, /active|ownership|marker|lock/i, "A fresh " + markerFixture.name + " owner marker must fail safely");
      assert.strictEqual(fs.existsSync(freshMarkerLock), true, "A fresh malformed lock must not be removed");
      assert.strictEqual(
        fs.readFileSync(path.join(freshMarkerInstall.target, "package.json"), "utf8"),
        "existing package",
        "A fresh malformed lock must preserve the live install"
      );
    } catch (error) {
      regressionFailures.push("fresh " + markerFixture.name + " install lock: " + error.message);
    }
  });

  [
    { name: "missing", contents: null },
    { name: "invalid", contents: "not-json" }
  ].forEach(function(markerFixture) {
    try {
      var staleMarkerInstall = createExistingInstall("stale-" + markerFixture.name + "-lock-root");
      var staleMarkerLock = path.join(staleMarkerInstall.root, ".twot.staruml-plantuml-importer.lock");
      fs.mkdirSync(staleMarkerLock);
      if (markerFixture.contents !== null) {
        fs.writeFileSync(path.join(staleMarkerLock, "owner.json"), markerFixture.contents);
      }
      var staleNow = Date.now();
      fs.utimesSync(staleMarkerLock, new Date(staleNow - 10000), new Date(staleNow - 10000));
      manage.install({
        targetDir: staleMarkerInstall.target,
        sourceDir: sourceRoot,
        lock: {
          now: function() { return staleNow; },
          staleAfterMs: 5000,
          ownerId: "replacement-owner",
          isProcessAlive: function() {
            throw new Error("Invalid markers must not trigger PID liveness checks");
          }
        }
      });
      assert.strictEqual(
        fs.readFileSync(path.join(staleMarkerInstall.target, "package.json"), "utf8"),
        "isolated package",
        "A stale lock with a " + markerFixture.name + " marker must be safely reclaimed"
      );
      assert.deepStrictEqual(fs.readdirSync(staleMarkerInstall.root), ["twot.staruml-plantuml-importer"]);
    } catch (error) {
      regressionFailures.push("stale " + markerFixture.name + " install lock: " + error.message);
    }
  });

  try {
    var ambiguousRoot = path.join(installTemporaryRoot, "ambiguous-recovery-root");
    var ambiguousTarget = path.join(ambiguousRoot, "twot.staruml-plantuml-importer");
    createRuntimeTree(path.join(ambiguousRoot, ".twot.staruml-plantuml-importer-install-first", "backup"), "first backup");
    createRuntimeTree(path.join(ambiguousRoot, ".twot.staruml-plantuml-importer-install-second", "backup"), "second backup");
    assert.throws(function() {
      manage.install({ targetDir: ambiguousTarget, sourceDir: sourceRoot });
    }, /ambiguous|multiple|more than one/i, "Multiple valid abandoned backups must not be chosen automatically");
    assert.strictEqual(fs.existsSync(ambiguousTarget), false, "Ambiguous recovery must not create a live target");
    assert.deepStrictEqual(fs.readdirSync(ambiguousRoot).sort(), [
      ".twot.staruml-plantuml-importer-install-first",
      ".twot.staruml-plantuml-importer-install-second"
    ]);
  } catch (error) {
    regressionFailures.push("ambiguous recovery: " + error.message);
  }

  try {
    var cleanupFailureInstall = createExistingInstall("cleanup-failure-root");
    var cleanupFailureRmSync = fs.rmSync;
    var cleanupWarning = [];
    var originalConsoleWarn = console.warn;
    fs.rmSync = function(candidate, options) {
      if (path.dirname(candidate) === cleanupFailureInstall.root &&
          path.basename(candidate).indexOf(".twot.staruml-plantuml-importer-install-") === 0) {
        throw new Error("injected cleanup failure");
      }
      return cleanupFailureRmSync(candidate, options);
    };
    console.warn = function(message) {
      cleanupWarning.push(String(message));
    };
    try {
      manage.install({ targetDir: cleanupFailureInstall.target, sourceDir: sourceRoot });
    } finally {
      fs.rmSync = cleanupFailureRmSync;
      console.warn = originalConsoleWarn;
    }
    assert.strictEqual(
      fs.readFileSync(path.join(cleanupFailureInstall.target, "package.json"), "utf8"),
      "isolated package",
      "Cleanup failure after promotion must leave the new live install successful"
    );
    assert.strictEqual(cleanupWarning.length, 1, "Post-promotion cleanup failure must emit one warning");
    assert.match(cleanupWarning[0], /warning|cleanup|temporary/i);
    assert.ok(cleanupWarning[0].length <= 500, "Cleanup warning must be bounded");
    var cleanupArtifacts = fs.readdirSync(cleanupFailureInstall.root).filter(function(entry) {
      return entry !== "twot.staruml-plantuml-importer";
    });
    assert.strictEqual(cleanupArtifacts.length, 1, "Failed cleanup must preserve one recoverable invocation artifact");
    assert.strictEqual(
      fs.readFileSync(path.join(cleanupFailureInstall.root, cleanupArtifacts[0], "backup", "package.json"), "utf8"),
      "existing package",
      "Failed cleanup must preserve the previous install as a backup"
    );
  } catch (error) {
    regressionFailures.push("post-promotion cleanup failure: " + error.message);
  }

  try {
    var copyFailureInstall = createExistingInstall("copy-failure-root");
    var originalCopyFileSync = fs.copyFileSync;
    fs.copyFileSync = function(src, dest) {
      if (src === path.join(sourceRoot, "package.json")) {
        throw new Error("injected copy failure");
      }
      return originalCopyFileSync(src, dest);
    };
    try {
      assert.throws(function() {
        manage.install({ targetDir: copyFailureInstall.target, sourceDir: sourceRoot });
      }, /injected copy failure/, "Copy failure must be reported");
    } finally {
      fs.copyFileSync = originalCopyFileSync;
    }
    assertExistingInstallSurvived(copyFailureInstall, "Copy failure must preserve the existing install");
  } catch (error) {
    regressionFailures.push("copy failure: " + error.message);
  }

  try {
    var promotionFailureInstall = createExistingInstall("promotion-failure-root");
    var originalRenameSync = fs.renameSync;
    var movedExistingInstall = false;
    var promotionFailureInjected = false;
    fs.renameSync = function(src, dest) {
      if (src === promotionFailureInstall.target) movedExistingInstall = true;
      if (dest === promotionFailureInstall.target && movedExistingInstall && !promotionFailureInjected) {
        promotionFailureInjected = true;
        throw new Error("injected promotion failure");
      }
      return originalRenameSync(src, dest);
    };
    try {
      assert.throws(function() {
        manage.install({ targetDir: promotionFailureInstall.target, sourceDir: sourceRoot });
      }, /injected promotion failure/, "Promotion failure must be reported");
    } finally {
      fs.renameSync = originalRenameSync;
    }
    assertExistingInstallSurvived(promotionFailureInstall, "Promotion failure must restore the existing install");
  } catch (error) {
    regressionFailures.push("promotion failure: " + error.message);
  }

  try {
    var restoreFailureInstall = createExistingInstall("restore-failure-root");
    var restoreFailureRenameSync = fs.renameSync;
    var liveInstallMoved = false;
    var targetRenameAttempts = 0;
    fs.renameSync = function(src, dest) {
      if (src === restoreFailureInstall.target) liveInstallMoved = true;
      if (dest === restoreFailureInstall.target && liveInstallMoved) {
        targetRenameAttempts += 1;
        throw new Error(targetRenameAttempts === 1 ? "injected promotion failure" : "injected restore failure");
      }
      return restoreFailureRenameSync(src, dest);
    };
    try {
      assert.throws(function() {
        manage.install({ targetDir: restoreFailureInstall.target, sourceDir: sourceRoot });
      }, /injected promotion failure.*injected restore failure/i, "Restore failure must be reported with promotion failure");
    } finally {
      fs.renameSync = restoreFailureRenameSync;
    }
    var preservedPaths = fs.readdirSync(restoreFailureInstall.root);
    assert.strictEqual(preservedPaths.length, 1, "Only the invocation backup container may remain after restore failure");
    var preservedContainer = path.join(restoreFailureInstall.root, preservedPaths[0]);
    assert.deepStrictEqual(fs.readdirSync(preservedContainer), ["backup"], "Staging must be cleaned while backup is preserved");
    assert.strictEqual(
      fs.readFileSync(path.join(preservedContainer, "backup", "package.json"), "utf8"),
      "existing package",
      "Restore failure must preserve the old payload in backup"
    );
  } catch (error) {
    regressionFailures.push("restore failure: " + error.message);
  }

  assert.deepStrictEqual(regressionFailures, [], regressionFailures.join("\n"));

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
