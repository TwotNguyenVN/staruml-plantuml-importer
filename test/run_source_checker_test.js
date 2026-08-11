const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const checker = path.join(root, "scripts", "check-source.js");
const sourceChecker = require(checker);

assert.strictEqual(typeof sourceChecker.runChecks, "function", "source checker must export runChecks");

function runChecker() {
  return spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: "utf8"
  });
}

const isolatedScanRoot = fs.mkdtempSync(path.join(os.tmpdir(), "staruml-source-checker-"));
try {
  const isolatedScripts = path.join(isolatedScanRoot, "scripts");
  fs.mkdirSync(isolatedScripts);
  fs.writeFileSync(path.join(isolatedScripts, "invalid.js"), "const = ;  \n");

  const firstResult = sourceChecker.runChecks({
    root: isolatedScanRoot,
    rootJavaScriptFiles: [],
    sourceDirectories: ["scripts"],
    requiredRuntimeFiles: ["required.png"]
  });
  const secondResult = sourceChecker.runChecks({
    root: isolatedScanRoot,
    rootJavaScriptFiles: [],
    sourceDirectories: ["scripts"],
    requiredRuntimeFiles: ["required.png"]
  });
  const expectedFailures = [
    "required.png: required runtime file is missing",
    "scripts/invalid.js: JavaScript syntax check failed",
    "scripts/invalid.js: trailing whitespace on line(s) 1"
  ];
  assert.deepStrictEqual(firstResult.failures, expectedFailures);
  assert.deepStrictEqual(secondResult.failures, expectedFailures, "isolated diagnostics must be deterministic");

  fs.writeFileSync(path.join(isolatedScanRoot, "required.png"), "isolated fixture");
  const requiredPresent = sourceChecker.runChecks({
    root: isolatedScanRoot,
    rootJavaScriptFiles: [],
    sourceDirectories: [],
    requiredRuntimeFiles: ["required.png"]
  });
  assert.deepStrictEqual(requiredPresent.failures, []);
} finally {
  fs.rmSync(isolatedScanRoot, { recursive: true, force: true });
}

const cliResult = runChecker();
assert.strictEqual(cliResult.status, 0, "source checker CLI behavior should remain successful:\n" + cliResult.stderr);
assert.match(cliResult.stdout, /Source checks passed\./);

function runGit(repository, args) {
  return spawnSync("git", args, {
    cwd: repository,
    encoding: "utf8"
  });
}

function assertGitSuccess(result, description) {
  assert.strictEqual(
    result.status,
    0,
    description + ":\n" + result.stdout + result.stderr
  );
}

function commit(repository, message) {
  const result = runGit(repository, [
    "-c", "user.name=CI Test",
    "-c", "user.email=ci-test@example.invalid",
    "commit", "-m", message
  ]);
  assertGitSuccess(result, "git commit should succeed");
}

const temporaryRepository = fs.mkdtempSync(path.join(os.tmpdir(), "staruml-ci-whitespace-"));
try {
  assertGitSuccess(runGit(temporaryRepository, ["init", "-b", "main"]), "git init should succeed");

  const conflictFile = path.join(temporaryRepository, "diagram.txt");
  fs.writeFileSync(conflictFile, "base\n");
  assertGitSuccess(runGit(temporaryRepository, ["add", "diagram.txt"]), "git add should succeed");
  commit(temporaryRepository, "base");

  fs.writeFileSync(conflictFile, "clean ordinary commit\n");
  assertGitSuccess(runGit(temporaryRepository, ["add", "diagram.txt"]), "git add should succeed");
  commit(temporaryRepository, "clean commit");
  const cleanCommit = runGit(temporaryRepository, ["rev-parse", "HEAD"]).stdout.trim();
  const cleanCheck = runGit(temporaryRepository, [
    "diff-tree", "--check", "--root", "--no-commit-id", "-m", "-r", cleanCommit
  ]);
  assertGitSuccess(cleanCheck, "merge-aware diff-tree should accept an ordinary clean commit");

  assertGitSuccess(runGit(temporaryRepository, ["checkout", "-b", "feature"]), "feature checkout should succeed");
  fs.writeFileSync(conflictFile, "feature edit\n");
  assertGitSuccess(runGit(temporaryRepository, ["add", "diagram.txt"]), "git add should succeed");
  commit(temporaryRepository, "feature edit");

  assertGitSuccess(runGit(temporaryRepository, ["checkout", "main"]), "main checkout should succeed");
  fs.writeFileSync(conflictFile, "main edit\n");
  assertGitSuccess(runGit(temporaryRepository, ["add", "diagram.txt"]), "git add should succeed");
  commit(temporaryRepository, "main edit");

  const mergeResult = runGit(temporaryRepository, ["merge", "feature"]);
  assert.notStrictEqual(mergeResult.status, 0, "branch edits should produce a merge conflict");
  fs.writeFileSync(conflictFile, "resolved merge with trailing whitespace  \n");
  assertGitSuccess(runGit(temporaryRepository, ["add", "diagram.txt"]), "resolved merge add should succeed");
  commit(temporaryRepository, "merge feature");

  const mergeCommit = runGit(temporaryRepository, ["rev-parse", "HEAD"]).stdout.trim();
  const mergeCheck = runGit(temporaryRepository, [
    "diff-tree", "--check", "--root", "--no-commit-id", "-m", "-r", mergeCommit
  ]);
  assert.notStrictEqual(mergeCheck.status, 0, "merge-aware diff-tree should reject merge whitespace");
  assert.match(
    mergeCheck.stdout + mergeCheck.stderr,
    /trailing whitespace/,
    "merge-aware diff-tree should report trailing whitespace"
  );
} finally {
  fs.rmSync(temporaryRepository, { recursive: true, force: true });
}

const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "ci.yml"), "utf8");

function indentation(line) {
  return /^(\s*)/.exec(line)[1].length;
}

function extractTestJob(source) {
  const lines = source.split(/\r?\n/);
  const jobsIndex = lines.findIndex(line => /^jobs:\s*$/.test(line));
  assert.notStrictEqual(jobsIndex, -1, "CI should define active jobs");
  const testIndent = indentation(lines[jobsIndex]) + 2;
  const testIndex = lines.findIndex((line, index) =>
    index > jobsIndex && indentation(line) === testIndent && line.trim() === "test:"
  );
  assert.notStrictEqual(testIndex, -1, "CI should define active jobs.test");
  let end = testIndex + 1;
  while (end < lines.length && (!lines[end].trim() || indentation(lines[end]) > testIndent)) end += 1;
  return lines.slice(testIndex, end);
}

function extractStep(jobLines, name) {
  const start = jobLines.findIndex(line => line.trim() === "- name: " + name);
  assert.notStrictEqual(start, -1, "CI jobs.test should define step: " + name);
  const stepIndent = indentation(jobLines[start]);
  let end = start + 1;
  while (end < jobLines.length && (!jobLines[end].trim() || indentation(jobLines[end]) > stepIndent)) end += 1;
  return jobLines.slice(start, end);
}

function assertEnabledStep(jobLines, firstLine) {
  const start = jobLines.findIndex(line => line.trim() === firstLine);
  assert.notStrictEqual(start, -1, "CI jobs.test should contain enabled step: " + firstLine);
  const stepIndent = indentation(jobLines[start]);
  let end = start + 1;
  while (end < jobLines.length && (!jobLines[end].trim() || indentation(jobLines[end]) > stepIndent)) end += 1;
  const step = jobLines.slice(start, end).map(line => line.trim());
  assert.ok(!step.includes("if: false") && !step.includes("if: ${{ false }}"), "CI step must not be disabled: " + firstLine);
}

function validateWorkflow(source) {
  const sourceLines = source.split(/\r?\n/);
  assert.ok(sourceLines.includes("permissions:"), "CI should declare permissions");
  assert.ok(sourceLines.includes("  contents: read"), "CI permissions should be read-only");

  const testJobLines = extractTestJob(source);
  const jobIndent = indentation(testJobLines[0]);
  const jobLevelGuard = testJobLines.find(line =>
    indentation(line) === jobIndent + 2 && line.trim().startsWith("if:")
  );
  assert.strictEqual(jobLevelGuard, undefined, "CI jobs.test must not be disabled by a job-level guard");
  const matrixLine = testJobLines.find(line => line.trim().startsWith("node-version:"));
  assert.ok(matrixLine, "CI jobs.test should define a Node matrix");
  const matrixMatch = /node-version:\s*\[([^\]]+)\]\s*$/.exec(matrixLine.trim());
  assert.ok(matrixMatch, "CI jobs.test Node matrix should use an explicit list");
  const versions = matrixMatch[1].split(",").map(value => Number(value.trim())).sort((left, right) => left - right);
  assert.deepStrictEqual(versions, [20, 22], "CI jobs.test Node matrix must contain exactly 20 and 22");

  assertEnabledStep(testJobLines, "- uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4");
  assertEnabledStep(testJobLines, "- uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4");
  ["npm ci", "npm run check", "npm run coverage", "git diff --check", "npm audit", "npm audit --omit=dev --audit-level=high"].forEach(command => {
    assertEnabledStep(testJobLines, "- run: " + command);
  });

  const pullRequestLines = extractStep(testJobLines, "Check pull request changes for whitespace errors");
  const pushLines = extractStep(testJobLines, "Check pushed commits for whitespace errors");
  assert.strictEqual(
    pullRequestLines.filter(line => line.trim().startsWith("if:")).map(line => line.trim()).join(""),
    "if: github.event_name == 'pull_request'",
    "Pull request whitespace guard must be exact"
  );
  assert.strictEqual(
    pushLines.filter(line => line.trim().startsWith("if:")).map(line => line.trim()).join(""),
    "if: github.event_name == 'push'",
    "Push whitespace guard must be exact"
  );
  return { pullRequestStep: pullRequestLines.join("\n"), pushStep: pushLines.join("\n") };
}

const validatedWorkflow = validateWorkflow(workflow);
const pullRequestStep = validatedWorkflow.pullRequestStep;
assert.match(pullRequestStep, /git diff --check "origin\/\$\{\{ github\.base_ref \}\}\.\.\.HEAD"/);
const pushStep = validatedWorkflow.pushStep;
assert.match(
  pushStep,
  /git rev-list --reverse "\$before\.\.HEAD"/,
  "push CI should derive every commit after a valid before SHA"
);
assert.match(
  pushStep,
  /git rev-list --reverse HEAD/,
  "push CI should derive all reachable commits when before is unavailable"
);
assert.match(pushStep, /while IFS= read -r commit; do/, "push CI should loop over derived commits");
assert.match(
  pushStep,
  /git diff-tree --check --root --no-commit-id -m -r "\$commit"/,
  "push CI should check each derived commit independently, including merge parents"
);
assert.doesNotMatch(pushStep, /exit 0/, "push CI should not exit after an HEAD-only fallback check");

const auditMovedToDisabledJob = workflow.replace("      - run: npm audit\n", "") + [
  "  disabled-audit:",
  "    if: false",
  "    steps:",
  "      - run: npm audit",
  ""
].join("\n");
assert.throws(
  () => validateWorkflow(auditMovedToDisabledJob),
  /npm audit/,
  "CI validation must reject commands moved outside active jobs.test"
);

const missingPullRequestGuard = workflow.replace("        if: github.event_name == 'pull_request'\n", "");
assert.throws(
  () => validateWorkflow(missingPullRequestGuard),
  /guard must be exact/,
  "CI validation must reject a missing pull request event guard"
);

const disabledTestJob = workflow.replace("  test:\n", "  test:\n    if: false\n");
assert.throws(
  () => validateWorkflow(disabledTestJob),
  /jobs\.test must not be disabled/,
  "CI validation must reject a disabled jobs.test"
);

console.log("Source checker tests passed.");
