# PlantUML Importer Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every High and Medium audit finding, close the identified quality gaps, and make the StarUML extension safe and reproducible to release.

**Architecture:** Preserve the existing StarUML plugin and parser dispatch structure while introducing a small shared input guard and a diagnostics-aware Requirement parser contract. Harden the preview and management boundaries independently, then add CI and packaging gates without rewriting the other seven parsers.

**Tech Stack:** Plain JavaScript, Node.js 20/22 tooling, StarUML v7+ APIs, Node's built-in test/assert modules, ESLint 9, c8 10, GitHub Actions.

## Global Constraints

- Support StarUML `>=7.0.0`; do not claim StarUML v6 support.
- Do not rewrite all eight parsers or redesign existing layout algorithms.
- Preview is disabled by default and performs no encoding or remote URL creation until explicitly enabled.
- Input limits are 200,000 characters, 10,000 lines, 2,000 declarations, 5,000 relationships, 50 nesting levels, and a 16,384-character preview URL.
- `clear` removes only this extension; no full-StarUML deletion path or compatibility alias remains.
- Preserve the repository's CommonJS modules and existing two-space parser style where files are touched.
- Do not commit, push, or create a PR unless the user explicitly requests it.
- Preserve the pre-existing untracked `AGY_TASK_requirement.md` file.

## File Map

- Create `utils/input-guard.js`: pure validation and count limits shared by preview and import.
- Modify `parsers/requirement-parser.js`: AST diagnostics, label support, contract fields, containment operation.
- Modify `utils/parser-helper.js`: truthful success/result and rollback diagnostics.
- Modify `utils/preview-helper.js`: safe default and preview URL length validation.
- Modify `utils/dialog-helper.js`: input guard, consent messaging, HTML safety, bounded diagnostics support, event cleanup.
- Modify `main.js`: import validation, warning display, StarUML v7 preference copy.
- Modify `manage.js`: shell-free updater and removal of `clear-all`.
- Modify `clear.bat`, `clear.sh`: extension-only removal.
- Modify `install.bat`, `install.sh`: include the shared input guard.
- Create `test/run_input_guard_test.js`, `test/run_preview_security_test.js`, `test/run_installer_manifest_test.js`, `test/run_class_test.js`, and `test/run_mindmap_test.js`.
- Modify Requirement, regression, Use Case, and aggregate tests.
- Create `eslint.config.js`, `scripts/check-source.js`, `.github/workflows/ci.yml`, `LICENSE`, and `docs/STARUML_V7_SMOKE_TEST.md`.
- Modify `package.json`, generate `package-lock.json`, update `README.md`, `README-VN.md`, and `.gitignore`.

---

### Task 1: Requirement AST And Diagnostics

**Files:**
- Modify: `parsers/requirement-parser.js:8-111`
- Modify: `test/run_requirement_parser_unit_test.js`

**Interfaces:**
- Produces: `parseRequirementDiagram(text)` returning `{ requirements, elements, relations, diagnostics }`.
- Produces: diagnostics shaped as `{ severity: "warning" | "error", line: number, message: string }`.
- Requirements retain `alias` for internal relation lookup while exposing all documented fields.

- [ ] **Step 1: Expand the AST tests and make them fail**

Add assertions equivalent to:

```js
const labeled = requirementParser.parseRequirementDiagram([
  'requirement "Source" as R1',
  'requirement "Target" as R2',
  'R1 --> R2 : audit trail'
].join('\n'));

assertEqual(labeled.relations.length, 1, "Labeled relation count");
assertEqual(labeled.relations[0].label, "audit trail", "Relation label");
assertEqual(labeled.requirements[0].row, 1, "Requirement source row");
assertEqual(typeof labeled.requirements[0].col, "number", "Requirement source column type");
assertEqual(labeled.diagnostics.length, 0, "Valid input diagnostics");

const malformed = requirementParser.parseRequirementDiagram([
  'requirement "First" as R1',
  'requirement "Duplicate" as R1',
  'R1 -satisfies-> Missing',
  'unsupported syntax here'
].join('\n'));

assertEqual(malformed.requirements.length, 1, "Duplicate alias is not added twice");
assertEqual(malformed.diagnostics.length, 3, "Duplicate, missing endpoint, unknown line diagnostics");
```

Assert every requirement has `id`, `name`, `text`, `stereotype`, `kind`, `row`, and `col`; every element has `id`, `name`, `type`, and `docRef`; and all eight fixture relationship types map to the expected type/from/to values.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node test/run_requirement_parser_unit_test.js`

Expected: FAIL because labeled relations and diagnostics are absent and contract fields are incomplete.

- [ ] **Step 3: Implement the minimal parser contract**

Change relation parsing to accept a bounded optional label:

```js
var relMatch = line.match(
  /^([a-zA-Z0-9_]+)\s+-+([a-zA-Z]*)-*?>\s+([a-zA-Z0-9_]+)(?:\s*:\s*(.+))?$/
);
```

Initialize `diagnostics: []`, record one-based `row` and zero-based `col`, preserve the body `id` while keeping `alias`, and set element `id` to its alias and `docRef` to an empty string. After parsing and deduplication, validate both relationship endpoints against requirement/element aliases and append warnings for unresolved endpoints. Unknown non-empty, non-comment, non-directive lines also append warnings.

- [ ] **Step 4: Run focused and aggregate tests and verify GREEN**

Run: `node test/run_requirement_parser_unit_test.js`

Expected: PASS.

Run: `npm test`

Expected: all registered tests PASS.

- [ ] **Step 5: Review checkpoint**

Review only `parsers/requirement-parser.js` and its unit test for grammar regressions, duplicate diagnostic emission, and exact AST field names before proceeding.

---

### Task 2: Requirement Containment And Truthful Import Results

**Files:**
- Modify: `parsers/requirement-parser.js:113-247`
- Modify: `utils/parser-helper.js:17-142`
- Modify: `main.js:87-183`
- Modify: `test/run_requirement_test.js`
- Modify: `test/run_regression_tests.js`

**Interfaces:**
- Consumes: `parseRequirementDiagram(text).diagnostics` from Task 1.
- Produces: transaction results `{ success, diagramType, createdCount, warnings, errors, rollbackAttempted, rollbackSucceeded }`.
- `warnings` and `errors` contain user-readable strings; no unresolved relationship is silently skipped.

- [ ] **Step 1: Replace the Requirement operation mock with commit-aware behavior**

Make the mock builder queue operations until `doOperation` and track calls:

```js
var pending = [];
var committedOperations = 0;
var operationBuilder = {
  begin: function(name) { pending = []; this.name = name; },
  insert: function(element) { pending.push({ type: "insert", element: element }); },
  fieldInsert: function(parent, field, element) {
    pending.push({ type: "fieldInsert", parent: parent, field: field, element: element });
  },
  fieldRemove: function(parent, field, element) {
    pending.push({ type: "fieldRemove", parent: parent, field: field, element: element });
  },
  end: function() {},
  discard: function() { pending = []; },
  getOperation: function() { return pending.slice(); }
};
```

`repository.doOperation(operation)` must apply inserts/removes and increment `committedOperations`. Assert `committedOperations === 1`, `E1._parent === R1`, the old owner's `ownedElements` excludes E1, R1's `ownedElements` includes E1, and the diagram owns one containment view.

- [ ] **Step 2: Add failure-result tests**

In `test/run_regression_tests.js`, add tests proving:

```js
const emptyResult = parserHelper.runInTransaction("TestDiagram", function () {});
assert.strictEqual(emptyResult.success, false);
assert.match(emptyResult.errors[0], /No elements were created/);

const warningResult = parserHelper.runInTransaction("TestDiagram", function (warnings) {
  warnings.push("Skipped unresolved relation R1 -> Missing");
  app.factory.createModelAndView({ id: "UMLClass" });
});
assert.strictEqual(warningResult.success, true);
assert.strictEqual(warningResult.warnings.length, 1);
```

Also test a containment commit exception to prove rollback is attempted and the final result is unsuccessful.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `node test/run_requirement_test.js`

Expected: FAIL because containment is never committed or reparented.

Run: `node test/run_regression_tests.js`

Expected: FAIL because empty transactions currently report success.

- [ ] **Step 4: Implement containment as one repository operation**

For `contains`, require a repository builder, begin an operation, queue ownership removal/insertion and the containment view, end, and commit:

```js
builder.begin("Create requirement containment");
builder.fieldRemove(oldOwner, "ownedElements", headView.model);
builder.fieldInsert(tailView.model, "ownedElements", headView.model);
builder.insert(containmentView);
builder.fieldInsert(diagram, "ownedViews", containmentView);
builder.end();
app.repository.doOperation(builder.getOperation());
headView.model._parent = tailView.model;
```

Do not catch and downgrade containment errors. Let `runInTransaction` perform rollback. Convert parser diagnostics to warning strings and skip unresolved relationships only after recording their warning.

- [ ] **Step 5: Make transaction success truthful and surface warnings**

In `runInTransaction`, after `parseFn`, return failure when `errors.length > 0` or no models/views were created. In `main.js`, append at most ten warnings to the success dialog and add a remaining-warning count when more exist. Do not include full PlantUML input in logs or dialogs.

- [ ] **Step 6: Run focused and aggregate tests and verify GREEN**

Run: `node test/run_requirement_test.js`

Expected: PASS with committed containment and correct ownership.

Run: `node test/run_regression_tests.js`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Review checkpoint**

Review transaction monkey-patch restoration, operation-builder failure paths, ownership changes, rollback residual counts, and warning bounds.

---

### Task 3: Input Limits, Private Preview Defaults, And Dialog Safety

**Files:**
- Create: `utils/input-guard.js`
- Modify: `utils/preview-helper.js`
- Modify: `utils/dialog-helper.js`
- Modify: `main.js`
- Create: `test/run_input_guard_test.js`
- Create: `test/run_preview_security_test.js`
- Modify: `test/run_all_tests.js`

**Interfaces:**
- Produces: `inputGuard.validateInput(text)` returning `{ valid, errors, stats }`.
- Produces: `inputGuard.LIMITS` with `maxCharacters`, `maxLines`, `maxDeclarations`, `maxRelationships`, and `maxNestingDepth`.
- Produces: `previewHelper.buildPreviewUrl(configuredUrl, encodedDiagram)` that throws when the URL exceeds 16,384 characters.
- Produces: `previewHelper.preparePreview(code, options)` returning `{ status, message, url }`; `options` contains `enabled`, `configuredUrl`, and `encode`.

- [ ] **Step 1: Write failing pure input-limit tests**

Cover each limit without allocating excessive memory:

```js
const inputGuard = require("../utils/input-guard");
assert.strictEqual(inputGuard.validateInput("@startuml\nclass A\n@enduml").valid, true);
assert.match(
  inputGuard.validateInput("x".repeat(inputGuard.LIMITS.maxCharacters + 1)).errors[0],
  /200000 characters/
);
assert.strictEqual(
  inputGuard.validateInput(Array(inputGuard.LIMITS.maxLines + 2).join("x\n")).valid,
  false
);
```

Generate declaration, relationship, and nested-state strings one item over their limits and assert a specific error for each.

- [ ] **Step 2: Write failing preview-security tests**

Mock preferences and assert:

```js
delete global.app;
assert.strictEqual(previewHelper.isPreviewEnabled(), false);

global.app = { preferences: { get: function() { return undefined; } } };
assert.strictEqual(previewHelper.isPreviewEnabled(), false);

assert.throws(function () {
  previewHelper.buildPreviewUrl("https://example.com/plantuml", "x".repeat(16384));
}, /Preview URL exceeds 16384 characters/);
```

Test `previewHelper.preparePreview(code, { enabled: false, configuredUrl, encode })` with a spy encoder and assert the encoder has zero calls and the result status is `disabled`. Test the enabled path and assert one encoder call and a `ready` result containing the normalized URL.

- [ ] **Step 3: Run tests and verify RED**

Run: `node test/run_input_guard_test.js`

Expected: FAIL because `utils/input-guard.js` does not exist.

Run: `node test/run_preview_security_test.js`

Expected: FAIL because preview currently defaults to enabled and has no URL-length guard.

- [ ] **Step 4: Implement `utils/input-guard.js`**

Use one linear scan to count lines, declarations, relationships, and brace depth. Return all exceeded-limit errors, but stop detailed scanning once a limit breach is known to avoid unnecessary work. Keep recognition conservative: diagram declaration keywords count toward declarations and arrow lines count toward relationships.

- [ ] **Step 5: Apply the guard before preview and import**

Implement `previewHelper.preparePreview(code, options)` so it returns early for disabled preview, validates input before calling `options.encode`, builds the bounded URL, and returns a structured status. The dialog consumes this function instead of calling `encodePlantUML` and `buildPreviewUrl` directly. In `main.js`, validate again immediately after the dialog resolves and before diagram detection or parser dispatch. Display the first five guard errors and do not mutate StarUML on invalid input.

- [ ] **Step 6: Make preview opt-in and harden dialog construction**

Set the registered preference default to `false` and make `isPreviewEnabled()` return false when unavailable. Show `Preview disabled. Enable it in Preferences to send source to <normalized URL>.` without encoding source.

Stop interpolating `sampleCode` into HTML; render an empty textarea and call `$textarea.val(sampleCode)`. Escape the fixed title before use or assign it through `.text(title)`. Replace inline `onclick` handlers with classes and bound click handlers calling Electron's `shell.openExternal` with fixed URLs.

Extend `cleanUpEvents()` to clear `debounceTimeout`, remove `.plantuml-split`, detach local control handlers, and prevent delayed preview updates after close.

- [ ] **Step 7: Register tests and verify GREEN**

Add both tests to `test/run_all_tests.js`.

Run: `node test/run_input_guard_test.js`

Expected: PASS.

Run: `node test/run_preview_security_test.js`

Expected: PASS with no encoder or URL-builder calls while disabled.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 8: Review checkpoint**

Review for source disclosure before opt-in, URL logging, synchronous large-input work before validation, HTML interpolation, stale event handlers, and inaccurate preference copy.

---

### Task 4: Shell-Free Updates And Extension-Only Removal

**Files:**
- Modify: `manage.js`
- Modify: `test/run_regression_tests.js`
- Rewrite: `clear.bat`
- Rewrite: `clear.sh`
- Modify: `README.md`
- Modify: `README-VN.md`

**Interfaces:**
- `update(deps)` accepts `deps.execFileSync(command, args, options)` and `deps.install()`.
- Capturing calls use `{ encoding: "utf8" }`; progress calls use `{ stdio: "inherit" }`.
- Only CLI actions `install`, `update`, and `clear` remain.

- [ ] **Step 1: Add failing updater argument and safety tests**

Capture exact invocations:

```js
const calls = [];
function run(command, args, options) {
  calls.push({ command: command, args: args, options: options });
  const key = args.join(" ");
  if (key === "status --porcelain") return "";
  if (key === "rev-parse --abbrev-ref HEAD") return "main\n";
  if (key === "rev-parse --symbolic-full-name @{u}") return "refs/remotes/origin/main\n";
  if (key === "remote get-url origin") return "https://github.com/TwotNguyenVN/staruml-plantuml-importer.git\n";
  if (key === "rev-parse refs/remotes/origin/main") return "abc123\n";
  return "";
}
```

Assert no call contains a shell string, `git merge --ff-only refs/remotes/origin/main` is invoked as an argument array, detached HEAD fails, missing upstream fails, unexpected remote fails, and install is never called after any failure.

- [ ] **Step 2: Add failing destructive-path absence tests**

Read `manage.js`, `clear.bat`, and `clear.sh` as text. Assert they do not contain application uninstall paths, StarUML process killing, `clear-all`, configuration/cache deletion, `sudo rm`, or `Program Files\\StarUML`. Assert each clear implementation contains only the extension identifier `twot.staruml-plantuml-importer` as its deletion target.

- [ ] **Step 3: Run regression tests and verify RED**

Run: `node test/run_regression_tests.js`

Expected: FAIL because production still uses `execSync` shell construction and destructive clear paths exist.

- [ ] **Step 4: Implement shell-free update execution**

Import `execFileSync`, remove `execSync` from update flow, and define separate helpers:

```js
function capture(run, args) {
  return String(run("git", args, { encoding: "utf8" }) || "").trim();
}

function runVisible(run, args) {
  return run("git", args, { stdio: "inherit" });
}
```

Validate branch is neither empty nor `HEAD`; parse `refs/remotes/<remote>/<branch>`; check `<remote>` URL against the HTTPS or SSH form of the package repository; resolve and display the target revision; then run `merge --ff-only <upstream-ref>` and install.

- [ ] **Step 5: Remove full-StarUML deletion**

Delete `clearAll`, the `clear-all` switch case, and the interactive menu option. Rewrite `clear.bat` and `clear.sh` to remove only the platform-specific extension directory after a normal `y/N` confirmation. Do not stop StarUML or delete application/configuration/cache paths.

- [ ] **Step 6: Update management documentation**

Remove full-uninstallation sections from both READMEs. Describe `clear` and native clear scripts as extension-only removal. Document fast-forward-only updates, clean-worktree requirement, expected remote validation, and lack of signed-release verification.

- [ ] **Step 7: Run focused and aggregate tests and verify GREEN**

Run: `node test/run_regression_tests.js`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 8: Review checkpoint**

Review command argument boundaries, output capture, fork/upstream behavior, install-after-failure prevention, and every deletion target on Windows, macOS, and Linux.

---

### Task 5: Parser Coverage And Installer Manifest Parity

**Files:**
- Create: `test/run_class_test.js`
- Create: `test/run_mindmap_test.js`
- Create: `test/run_installer_manifest_test.js`
- Modify: `test/run_usecase_test.js`
- Modify: `test/run_all_tests.js`
- Modify: `install.bat`
- Modify: `install.sh`
- Delete: `test/run_test.js`

**Interfaces:**
- Tests remain standalone Node scripts exiting zero on success.
- Native installers must include `utils/input-guard.js` and all eight parser files.

- [ ] **Step 1: Turn the Use Case overlap count into an assertion**

Add after the overlap loop:

```js
assert.strictEqual(overlaps, 0, "Use Case/Actor boxes overlap in " + filename);
```

Run: `node test/run_usecase_test.js`

Expected: PASS, or RED with a concrete fixture/layout regression that must be fixed surgically before continuing.

- [ ] **Step 2: Add Class parser smoke coverage**

Create a generic mock that records model/view behavior rather than only call counts:

```js
var models = [];
var views = [];
global.app = {
  factory: {
    createModel: function(options) {
      var model = { type: options.id, _parent: options.parent };
      if (options.modelInitializer) options.modelInitializer(model);
      models.push(model);
      return model;
    },
    createModelAndView: function(options) {
      var model = {
        type: options.id,
        _parent: options.parent,
        end1: {},
        end2: {}
      };
      var view = {
        type: options.id + "View",
        model: model,
        tail: options.tailView,
        head: options.headView
      };
      if (options.modelInitializer) options.modelInitializer(model);
      if (options.viewInitializer) options.viewInitializer(view);
      models.push(model);
      views.push(view);
      return view;
    }
  },
  engine: { deleteElements: function() {} }
};
```

Load `test/classdiagram.puml` and assert successful import, at least two models whose type is `UMLClass`, finite coordinates for corresponding views, and at least one relation view with both `tail` and `head`.

Run: `node test/run_class_test.js`

Expected: PASS only when the mock matches the production API calls and all assertions hold.

- [ ] **Step 3: Add Mindmap generation coverage**

Use a focused factory mock:

```js
var views = [];
global.app = {
  factory: {
    createModel: function() { return {}; },
    createModelAndView: function(options) {
      var model = { type: options.id, _parent: options.parent };
      var view = {
        type: options.id + "View",
        model: model,
        tail: options.tailView,
        head: options.headView
      };
      if (options.modelInitializer) options.modelInitializer(model);
      if (options.viewInitializer) options.viewInitializer(view);
      views.push(view);
      return view;
    }
  },
  engine: { deleteElements: function() {} }
};
```

Load `test/mindmap.puml`. Assert a successful result, exactly one topic with no incoming edge, multiple child topics, finite coordinates on every topic view, and one `MindmapEdgeView` per non-root topic with non-null `tail` and `head`.

Run: `node test/run_mindmap_test.js`

Expected: PASS only when generated hierarchy and geometry assertions hold.

- [ ] **Step 4: Add installer parity tests and verify RED**

Define the expected runtime set:

```js
const expected = [
  "PlantUML_Importer.png", "main.js", "package.json",
  "menus/menu.json", "keymaps/keymap.json",
  "utils/dialog-helper.js", "utils/parser-helper.js",
  "utils/preview-helper.js", "utils/input-guard.js",
  "parsers/usecase-parser.js", "parsers/class-parser.js",
  "parsers/sequence-parser.js", "parsers/activity-parser.js",
  "parsers/state-parser.js", "parsers/erd-parser.js",
  "parsers/mindmap-parser.js", "parsers/requirement-parser.js"
];
```

Parse quoted source paths from both native installers and compare sorted sets to `expected`. Assert `manage.js` copies the four directories and three root files that contain the same runtime set.

Run: `node test/run_installer_manifest_test.js`

Expected: FAIL until both installers copy `utils/input-guard.js`.

- [ ] **Step 5: Update installers, aggregate suite, and dead tests**

Add the input guard copy line to both installers. Register the Class, Mindmap, and manifest tests in `test/run_all_tests.js`. Delete the unused `test/run_test.js`, which imports a nonexistent `test/main.js` and is not part of the suite.

- [ ] **Step 6: Run all tests and verify GREEN**

Run: `npm test`

Expected: all registered tests PASS, including Class, Mindmap, overlap, and manifest parity.

- [ ] **Step 7: Review checkpoint**

Review whether mocks assert behavior instead of implementation counts, whether endpoint/geometry assertions can catch real regressions, and whether all install methods ship exactly the same runtime files.

---

### Task 6: Reproducible Tooling, CI, Metadata, And Release Documentation

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`
- Create: `package-lock.json` using npm
- Create: `eslint.config.js`
- Create: `scripts/check-source.js`
- Create: `.github/workflows/ci.yml`
- Create: `LICENSE`
- Create: `docs/STARUML_V7_SMOKE_TEST.md`
- Modify: `README.md`
- Modify: `README-VN.md`
- Modify: `main.js:1-5`

**Interfaces:**
- `npm run lint` executes ESLint without rewriting files.
- `npm run check:source` runs syntax and whitespace/policy checks.
- `npm run check` executes lint, source checks, and tests.

- [ ] **Step 1: Make project documentation trackable**

Replace the blanket `docs/` ignore with narrow generated-output ignores, leaving `docs/superpowers/` and `docs/STARUML_V7_SMOKE_TEST.md` trackable. Keep `coverage/` ignored.

- [ ] **Step 2: Add package metadata and scripts**

Set:

```json
{
  "license": "MIT",
  "engines": {
    "staruml": ">=7.0.0"
  },
  "scripts": {
    "test": "node test/run_all_tests.js",
    "lint": "eslint .",
    "check:source": "node scripts/check-source.js",
    "check": "npm run lint && npm run check:source && npm test"
  },
  "devDependencies": {
    "c8": "^10.1.3",
    "eslint": "^9.0.0"
  }
}
```

Retain existing name, version, description, author, repository, and StarUML metadata.

- [ ] **Step 3: Add minimal ESLint correctness rules**

Create a CommonJS flat config that ignores `node_modules`, `coverage`, and images; defines Node and StarUML globals (`app`, `type`, `$`, `window`, `document`); and enables `no-undef`, `no-unreachable`, `no-dupe-keys`, and `no-constant-condition` as errors. Do not introduce formatting rules or mass-reformat legacy files.

- [ ] **Step 4: Add deterministic source checks**

`scripts/check-source.js` recursively scans tracked source directories and root JavaScript files, skipping `node_modules` and `docs`. For every `.js` file, run `node --check` with `execFileSync(process.execPath, ["--check", file])`. Reject trailing whitespace and required runtime files missing from disk. Exit nonzero with all offending paths listed.

- [ ] **Step 5: Install tooling and fix only real violations**

Run: `npm install --package-lock-only`

Run: `npm install --save-dev eslint@^9.0.0 c8@^10.1.3`

Run: `npm run lint`

Expected: initially RED if correctness violations exist. Fix only reported correctness defects and globals; do not reformat unrelated code.

Run: `npm run check:source`

Expected: initially RED on existing trailing whitespace. Remove only the reported trailing spaces, then rerun to PASS.

- [ ] **Step 6: Add a reproducible coverage gate**

Add this package script:

```json
"coverage": "c8 --all --include=main.js --include=manage.js --include=parsers/*.js --include=utils/*.js --reporter=text --reporter=lcov --check-coverage --lines=40 --functions=40 --branches=30 npm test"
```

Run: `npm run coverage`

Expected: PASS at the initial conservative floor of 40% lines/functions and 30% branches. If the measured baseline is lower, add behavior-focused tests to reach these fixed thresholds rather than lowering them.

- [ ] **Step 7: Add CI**

Create a workflow triggered by pushes and pull requests with a Node 20/22 matrix. Each job checks out code, runs `npm ci`, `npm run check`, `npm run coverage`, `git diff --check`, and `npm audit --omit=dev --audit-level=high`. Use only pinned major versions of official GitHub actions.

- [ ] **Step 8: Add license and StarUML v7 smoke checklist**

Add the standard MIT license with copyright holder `Twot Nguyen` and year `2026`. The smoke checklist must cover installation, reload, all eight diagram types, mismatch warning, disabled-preview no-network behavior, opt-in preview destination, invalid/oversized input, rollback behavior, fast-forward update, and extension-only clear on each supported OS.

- [ ] **Step 9: Synchronize documentation and source headers**

Update both READMEs and `main.js` to say StarUML v7+. Document preview disabled by default, reversible URL encoding, GET logging risk, input limits, safe update constraints, extension-only removal, CI commands, and the fact that State Diagram remains unstable. Remove stale v2.1 header text from `main.js`.

- [ ] **Step 10: Verify tooling and audit GREEN**

Run: `npm ci`

Expected: PASS from the lockfile.

Run: `npm run check`

Expected: PASS.

Run: `npm run coverage`

Expected: PASS with at least 40% lines/functions and 30% branches.

Run: `git diff --check`

Expected: no output and exit zero.

Run: `npm audit --omit=dev --audit-level=high`

Expected: zero unresolved High or Critical production vulnerabilities.

- [ ] **Step 11: Review checkpoint**

Review CI reproducibility, ESLint scope, package/runtime dependency separation, license consistency, bilingual documentation parity, and every StarUML v7 smoke-test step.

---

### Task 7: Final Verification And Independent Reviews

**Files:**
- Modify only files required to resolve verified review findings.

**Interfaces:**
- Consumes all outputs from Tasks 1-6.
- Produces a release-readiness report with commands, pass counts, residual risks, and live-StarUML evidence status.

- [ ] **Step 1: Run the complete local gate from a clean dependency install**

Run: `npm ci`

Run: `npm run check`

Run: `git diff --check`

Run: `npm audit --omit=dev --audit-level=high`

Run: `node -e "require('./main.js'); require('./parsers/requirement-parser.js'); console.log('load ok')"`

Expected: every command exits zero; aggregate test output reports zero failures.

- [ ] **Step 2: Run targeted security probes**

Probe a labeled Requirement relation and assert it appears in AST output. Probe missing preferences and assert preview is false. Probe an oversized input and assert rejection. Inspect management scripts for `clear-all`, process killing, app uninstall paths, shell command joins, and global StarUML config deletion; expect no matches.

- [ ] **Step 3: Dispatch independent JavaScript and security reviews**

The JavaScript reviewer checks correctness, async/event cleanup, operation-builder semantics, test quality, and maintainability. The security reviewer checks preview disclosure, HTML construction, command execution, update trust, deletion boundaries, and resource exhaustion. Resolve every verified High or Medium finding with a focused failing test before implementation.

- [ ] **Step 4: Re-run the full gate after review fixes**

Repeat Step 1 exactly. Expected: every command exits zero and no review fix regresses another workstream.

- [ ] **Step 5: Report residual evidence honestly**

State whether the StarUML v7 smoke checklist was run by a human. If not, classify live StarUML behavior as unverified rather than complete. Report changed files, exact verification commands, test totals, audit result, and any remaining Low findings.
