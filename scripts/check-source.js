#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const defaultRoot = path.resolve(__dirname, "..");
const defaultRootJavaScriptFiles = ["main.js", "manage.js", "eslint.config.js"];
const defaultSourceDirectories = ["parsers", "utils", "test", "scripts"];
const defaultRequiredRuntimeFiles = [
  "PlantUML_Importer.png",
  "package.json",
  "main.js",
  "menus/menu.json",
  "keymaps/keymap.json",
  "parsers/activity-parser.js",
  "parsers/class-parser.js",
  "parsers/erd-parser.js",
  "parsers/mindmap-parser.js",
  "parsers/requirement-parser.js",
  "parsers/sequence-parser.js",
  "parsers/state-parser.js",
  "parsers/usecase-parser.js",
  "utils/dialog-helper.js",
  "utils/input-guard.js",
  "utils/parser-helper.js",
  "utils/preview-helper.js"
];
function collectJavaScriptFiles(directory) {
  const files = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

function runChecks(options) {
  const settings = options || {};
  const root = path.resolve(settings.root || defaultRoot);
  const rootJavaScriptFiles = settings.rootJavaScriptFiles || defaultRootJavaScriptFiles;
  const sourceDirectories = settings.sourceDirectories || defaultSourceDirectories;
  const requiredRuntimeFiles = settings.requiredRuntimeFiles || defaultRequiredRuntimeFiles;
  const failures = [];

  for (const relativePath of requiredRuntimeFiles) {
    if (!fs.existsSync(path.join(root, relativePath))) {
      failures.push(relativePath + ": required runtime file is missing");
    }
  }

  const sourceFiles = rootJavaScriptFiles.map((file) => path.join(root, file));
  for (const directory of sourceDirectories) {
    sourceFiles.push(...collectJavaScriptFiles(path.join(root, directory)));
  }

  for (const file of sourceFiles) {
    const relativePath = path.relative(root, file).split(path.sep).join("/");
    try {
      execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    } catch (_) {
      failures.push(relativePath + ": JavaScript syntax check failed");
    }

    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    const trailingWhitespaceLines = [];
    lines.forEach((line, index) => {
      if (/[ \t]+$/.test(line)) trailingWhitespaceLines.push(index + 1);
    });
    if (trailingWhitespaceLines.length > 0) {
      failures.push(relativePath + ": trailing whitespace on line(s) " + trailingWhitespaceLines.join(", "));
    }
  }

  return { failures: failures };
}

function main() {
  const result = runChecks();
  if (result.failures.length > 0) {
    console.error("Source checks failed:\n" + result.failures.map((failure) => "- " + failure).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Source checks passed.");
  }
}

module.exports = { runChecks: runChecks, main: main };

if (require.main === module) {
  main();
}
