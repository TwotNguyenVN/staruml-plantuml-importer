const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const checker = path.join(root, "scripts", "check-source.js");
const image = path.join(root, "PlantUML_Importer.png");

function digest(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function createFixture(name) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "staruml-source-concurrency-" + name + "-"));
  fs.mkdirSync(path.join(fixtureRoot, "scripts"));
  fs.writeFileSync(path.join(fixtureRoot, "scripts", "invalid.js"), "const = ;  \n");
  return fixtureRoot;
}

function runIsolated(rootPath) {
  const program = [
    "const checker = require(" + JSON.stringify(checker) + ");",
    "const result = checker.runChecks({",
    "root: " + JSON.stringify(rootPath) + ",",
    "rootJavaScriptFiles: [], sourceDirectories: ['scripts'], requiredRuntimeFiles: ['missing.png']",
    "});",
    "if (result.failures.length !== 3) process.exit(2);"
  ].join("\n");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", program], { stdio: "pipe" });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error("isolated checker exited " + code)));
  });
}

const fixtures = [createFixture("a"), createFixture("b")];
const before = digest(image);

Promise.all(fixtures.map(runIsolated)).then(() => {
  assert.strictEqual(digest(image), before, "concurrent isolated checks must not modify the shared runtime image");
  console.log("Source checker concurrency test passed.");
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  fixtures.forEach(fixture => fs.rmSync(fixture, { recursive: true, force: true }));
});
