require('./fail_on_console_error.js');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

// 1. Preview URL normalization and validation
const previewHelper = require('../utils/preview-helper.js');

console.log("Starting regression tests...");

// Test getNormalizedServerUrl
assert.strictEqual(
  previewHelper.getNormalizedServerUrl("http://localhost:8080"),
  "http://localhost:8080",
  "Should preserve http for localhost"
);
assert.strictEqual(
  previewHelper.getNormalizedServerUrl("http://127.0.0.1:8080/plantuml/png"),
  "http://127.0.0.1:8080/plantuml",
  "Should normalize trailing png and keep http for loopback"
);
assert.strictEqual(
  previewHelper.getNormalizedServerUrl("http://www.plantuml.com/plantuml/"),
  "https://www.plantuml.com/plantuml",
  "Should upgrade to https and remove trailing slash"
);
assert.strictEqual(
  previewHelper.getNormalizedServerUrl("www.plantuml.com"),
  "https://www.plantuml.com/plantuml",
  "Should normalize plantuml.com base exactly once"
);
assert.strictEqual(
  previewHelper.getNormalizedServerUrl("https://plantuml.yourcompany.com/png/"),
  "https://plantuml.yourcompany.com",
  "Should strip trailing /png/ and slash"
);
assert.strictEqual(
  previewHelper.getNormalizedServerUrl("https://www.plantuml.com/plantuml?foo=bar#hash"),
  "https://www.plantuml.com/plantuml",
  "Should strip query string and hash from normalized URL"
);
assert.strictEqual(
  previewHelper.buildPreviewUrl("https://www.plantuml.com/plantuml?foo=bar#hash", "encoded123"),
  "https://www.plantuml.com/plantuml/png/encoded123",
  "Should build clean preview URL without query or hash"
);
// Test isValidUrl
assert.strictEqual(previewHelper.isValidUrl("https://google.com"), true);
assert.strictEqual(previewHelper.isValidUrl("http://localhost:8080"), true);
assert.strictEqual(previewHelper.isValidUrl("ftp://invalid.com"), false);
assert.strictEqual(previewHelper.isValidUrl("just-string"), false);

// 2. Mock app preferences toggle
global.app = {
  preferences: {
    get: (key) => {
      if (key === 'plantuml-importer.preview') return false;
      if (key === 'plantuml-importer.server') return 'http://localhost:8080';
      return undefined;
    }
  }
};
assert.strictEqual(previewHelper.isPreviewEnabled(), false, "Should return false if preference is false");
assert.strictEqual(previewHelper.getNormalizedServerUrl(app.preferences.get('plantuml-importer.server')), "http://localhost:8080", "Should read configured url preference");

// 3. Activity parser double-invocation state-isolation
const activityParser = require('../parsers/activity-parser.js');
const diagram = { _parent: { getClassName: () => 'UMLActivity', ownedElements: [] } };

// Reset mock app
const views = [];
global.app = {
  project: { getProject: () => ({ getClassName: () => 'Project', ownedElements: [] }) },
  factory: {
    createModel: (opts) => { return { getClassName: () => opts.id }; },
    createModelAndView: (opts) => {
      let view = {};
      let m = { getClassName: () => opts.id };
      if (opts.viewInitializer) opts.viewInitializer(view);
      if (opts.modelInitializer) opts.modelInitializer(m);
      views.push({ id: opts.id, name: m.name || '' });
      return { model: m, view: view };
    }
  }
};

const code1 = `@startuml\n:Action A;\n@enduml`;
const code2 = `@startuml\n:Action B;\n@enduml`;

activityParser.generateDiagram(diagram, code1);
const count1 = views.length;
assert.ok(count1 > 0);

views.length = 0;
activityParser.generateDiagram(diagram, code2);
const count2 = views.length;
assert.ok(count2 > 0);

// If state leaks (e.g. pendingGuardGlobal or lastNodeGlobal not reset), views count/names might differ or fail
assert.strictEqual(count1, count2, "Consecutive calls should generate the same number of views under state isolation");

// 4. Parser partial-failure and rollback verification
let deleteElementsCalled = false;
let deletedModelsCount = 0;
let deletedViewsCount = 0;

global.app = {
  project: { getProject: () => ({ getClassName: () => 'Project', ownedElements: [] }) },
  engine: {
    deleteElements: (models, views) => {
      deleteElementsCalled = true;
      deletedModelsCount = models.length;
      deletedViewsCount = views.length;
    }
  },
  factory: {
    createModel: (opts) => {
      return { getClassName: () => opts.id };
    },
    createModelAndView: (opts) => {
      // Deliberately fail if we try to create a relationship, to simulate partial failure after creating entities
      if (opts.id === 'ERDRelationship') {
        throw new Error("Simulated ERDRelationship creation failure");
      }
      return {
        model: {
          getClassName: () => opts.id,
          end1: {},
          end2: {}
        }
      };
    }
  }
};

const erdParser = require('../parsers/erd-parser.js');
const erdCodeWithRelation = `
@startuml
entity User {
  * id : number
}
entity Post {
  * id : number
}
User ||--o{ Post
@enduml
`;

const dummyDiagram = { _parent: { getClassName: () => "ERDDataModel", ownedElements: [] } };
global.silenceConsoleError();
let result;
try {
  result = erdParser.generateDiagram(dummyDiagram, erdCodeWithRelation);
} finally {
  global.restoreConsoleError();
}

assert.strictEqual(result.success, false, "Import should fail due to simulated relationship failure");
assert.strictEqual(result.rollbackAttempted, true, "Rollback should have been attempted");
assert.strictEqual(result.rollbackSucceeded, true, "Rollback should succeed");
assert.strictEqual(result.createdCount, 0, "Residual createdCount should be 0 after successful rollback");
assert.ok(deleteElementsCalled, "deleteElements should have been called to roll back elements");
assert.ok(deletedModelsCount > 0, "Should have rolled back created models");

// 4.5 Transaction results reject empty imports and preserve warnings
const parserHelper = require('../utils/parser-helper.js');
let transactionDeleteCalled = false;
const transactionBuilderInsert = () => {};
const transactionBuilder = {
  insert: transactionBuilderInsert,
  discard: () => {}
};
global.app = {
  engine: {
    deleteElements: () => { transactionDeleteCalled = true; }
  },
  factory: {
    createModel: () => ({ getClassName: () => "UMLClass" }),
    createModelAndView: () => ({
      model: { getClassName: () => "UMLClass" },
      getClassName: () => "UMLClassView"
    })
  },
  repository: {
    getOperationBuilder: () => transactionBuilder
  }
};

const emptyResult = parserHelper.runInTransaction("TestDiagram", function() {});
assert.strictEqual(emptyResult.success, false);
assert.match(emptyResult.errors[0], /No elements were created/);
assert.strictEqual(emptyResult.rollbackAttempted, false);

const warningResult = parserHelper.runInTransaction("TestDiagram", function(warnings) {
  warnings.push("Skipped unresolved relation R1 -> Missing");
  app.repository.getOperationBuilder();
  app.factory.createModelAndView({ id: "UMLClass" });
});
assert.strictEqual(warningResult.success, true);
assert.strictEqual(warningResult.warnings.length, 1);
assert.strictEqual(warningResult.errors.length, 0);
assert.strictEqual(transactionDeleteCalled, false);
assert.strictEqual(transactionBuilder.insert, transactionBuilderInsert, "Operation builder insert should be restored");

// A containment commit exception must remain a failure and trigger rollback.
const requirementParser = require('../parsers/requirement-parser.js');
let containmentDiscarded = false;
let containmentDeleteCalled = false;
let containmentChildModel = null;
let containmentParentModel = null;
let partiallyInsertedContainmentView = null;
let containmentPending = [];
global.type = {
  UMLContainmentView: class UMLContainmentView {
    getClassName() { return "UMLContainmentView"; }
  }
};
const containmentBuilder = {
  begin: () => { containmentPending = []; },
  insert: element => { containmentPending.push({ type: "insert", element: element }); },
  fieldInsert: (parent, field, element) => { containmentPending.push({ type: "fieldInsert", parent, field, element }); },
  fieldRemove: (parent, field, element) => { containmentPending.push({ type: "fieldRemove", parent, field, element }); },
  end: () => {},
  getOperation: () => containmentPending.slice(),
  discard: () => { containmentDiscarded = true; containmentPending = []; }
};
global.app = {
  engine: {
    deleteElements: () => { containmentDeleteCalled = true; }
  },
  repository: {
    getOperationBuilder: () => containmentBuilder,
    doOperation: (operation) => {
      operation.forEach(item => {
        if (item.type === "fieldRemove") {
          const index = item.parent[item.field].indexOf(item.element);
          if (index !== -1) item.parent[item.field].splice(index, 1);
        } else if (item.type === "fieldInsert") {
          item.parent[item.field].push(item.element);
          if (item.field === "ownedElements") item.element._parent = item.parent;
          if (item.field === "ownedViews") partiallyInsertedContainmentView = item.element;
        }
      });
      throw new Error("SECRET /private/path containment commit failure");
    }
  },
  factory: {
    createModel: () => null,
    createModelAndView: (opts) => {
      const model = {
        _parent: opts.parent,
        ownedElements: [],
        getClassName: () => opts.id
      };
      const view = { model: model, getClassName: () => opts.id + "View" };
      if (opts.id === "UMLClass") containmentChildModel = model;
      if (opts.id === "SysMLRequirement") containmentParentModel = model;
      if (opts.modelInitializer) opts.modelInitializer(model);
      if (opts.viewInitializer) opts.viewInitializer(view);
      opts.parent.ownedElements.push(model);
      opts.diagram.ownedViews.push(view);
      return view;
    }
  }
};
const containmentDiagram = {
  _parent: { ownedElements: [] },
  ownedViews: []
};
const containmentResult = requirementParser.generateDiagram(
  containmentDiagram,
  'requirement "Parent" as R1\nelement "Child" as E1\nR1 -contains-> E1'
);
assert.strictEqual(containmentResult.success, false);
assert.strictEqual(containmentResult.rollbackAttempted, true);
assert.strictEqual(containmentResult.rollbackSucceeded, true);
assert.match(containmentResult.errors[0], /unexpected error/i);
assert.doesNotMatch(containmentResult.errors.join("\n"), /SECRET|private|containment commit failure/);
assert.strictEqual(containmentDiscarded, true);
assert.strictEqual(containmentDeleteCalled, true);
assert.strictEqual(containmentChildModel._parent, containmentDiagram._parent, "Failed commit must leave child with its old owner");
assert.ok(containmentDiagram._parent.ownedElements.includes(containmentChildModel), "Failed commit must restore the old owner's child");
assert.ok(!containmentParentModel.ownedElements.includes(containmentChildModel), "Failed commit must remove the child from the new owner");
assert.ok(!containmentDiagram.ownedViews.includes(partiallyInsertedContainmentView), "Failed commit must remove the partially inserted containment view");


// 5. Test shell-free update orchestration and validation
const manage = require('../manage.js');
assert.ok(typeof manage.checkDirty === 'function', "manage.js must export checkDirty");
assert.ok(typeof manage.update === 'function', "manage.js must export update");

function createUpdateDeps(overrides) {
  const calls = [];
  let installCount = 0;
  const responses = Object.assign({
    'status --porcelain': '',
    'rev-parse --abbrev-ref HEAD': 'main\n',
    'rev-parse --symbolic-full-name @{u}': 'refs/remotes/origin/main\n',
    'remote get-url origin': 'https://github.com/TwotNguyenVN/staruml-plantuml-importer.git\n',
    'rev-parse refs/remotes/origin/main': 'abc123\n'
  }, overrides && overrides.responses);

  return {
    calls: calls,
    getInstallCount: () => installCount,
    deps: {
      execFileSync: (command, args, options) => {
        calls.push({ command: command, args: args, options: options });
        const key = args.join(' ');
        if (overrides && overrides.failAt === key) throw new Error(overrides.message || 'command failed');
        return responses[key] || '';
      },
      install: () => { installCount += 1; }
    }
  };
}

const cleanUpdate = createUpdateDeps();
manage.update(cleanUpdate.deps);
assert.strictEqual(cleanUpdate.getInstallCount(), 1, 'A successful update should install exactly once');
assert.deepStrictEqual(cleanUpdate.calls, [
  { command: 'git', args: ['status', '--porcelain'], options: { encoding: 'utf8' } },
  { command: 'git', args: ['rev-parse', '--abbrev-ref', 'HEAD'], options: { encoding: 'utf8' } },
  { command: 'git', args: ['rev-parse', '--symbolic-full-name', '@{u}'], options: { encoding: 'utf8' } },
  { command: 'git', args: ['remote', 'get-url', 'origin'], options: { encoding: 'utf8' } },
  { command: 'git', args: ['fetch', 'origin'], options: { stdio: 'inherit' } },
  { command: 'git', args: ['rev-parse', 'refs/remotes/origin/main'], options: { encoding: 'utf8' } },
  { command: 'git', args: ['merge', '--ff-only', 'refs/remotes/origin/main'], options: { stdio: 'inherit' } }
]);
cleanUpdate.calls.forEach(call => {
  assert.strictEqual(call.command, 'git', 'Updater must invoke git directly, never a shell command string');
  assert.ok(Array.isArray(call.args), 'Updater command arguments must always be an array');
});

const updateFailures = [
  {
    name: 'dirty worktree',
    overrides: { responses: { 'status --porcelain': 'M main.js\n' } },
    expected: /Worktree is dirty/
  },
  {
    name: 'detached HEAD',
    overrides: { responses: { 'rev-parse --abbrev-ref HEAD': 'HEAD\n' } },
    expected: /detached HEAD/
  },
  {
    name: 'empty branch',
    overrides: { responses: { 'rev-parse --abbrev-ref HEAD': '' } },
    expected: /branch/
  },
  {
    name: 'missing upstream',
    overrides: { failAt: 'rev-parse --symbolic-full-name @{u}', message: 'no upstream' },
    expected: /upstream/
  },
  {
    name: 'malformed upstream',
    overrides: { responses: { 'rev-parse --symbolic-full-name @{u}': 'origin/main\n' } },
    expected: /upstream/
  },
  {
    name: 'unexpected remote',
    overrides: { responses: { 'remote get-url origin': 'https://github.com/example/fork.git\n' } },
    expected: /remote/
  },
  {
    name: 'fetch failure',
    overrides: { failAt: 'fetch origin', message: 'Fetch failed' },
    expected: /Fetch failed/
  },
  {
    name: 'unresolved target revision',
    overrides: { responses: { 'rev-parse refs/remotes/origin/main': '' } },
    expected: /target revision/
  },
  {
    name: 'merge failure',
    overrides: { failAt: 'merge --ff-only refs/remotes/origin/main', message: 'Not a fast-forward' },
    expected: /Not a fast-forward/
  }
];

updateFailures.forEach(testCase => {
  const scenario = createUpdateDeps(testCase.overrides);
  assert.throws(() => manage.update(scenario.deps), testCase.expected, testCase.name + ' should abort the update');
  assert.strictEqual(scenario.getInstallCount(), 0, testCase.name + ' must not install');
});

const credentialRemote = 'https://user:secret-token@github.com/example/fork.git';
const credentialScenario = createUpdateDeps({
  responses: { 'remote get-url origin': credentialRemote + '\n' }
});
let credentialError = null;
try {
  manage.update(credentialScenario.deps);
} catch (error) {
  credentialError = error;
}
assert.ok(credentialError, 'An unexpected credential-bearing remote should fail');
assert.match(credentialError.message, /Unexpected remote URL for origin/);
assert.doesNotMatch(credentialError.message, /user|secret-token/, 'Remote validation errors must not echo credentials');
assert.strictEqual(credentialScenario.getInstallCount(), 0, 'A rejected credential-bearing remote must not install');

const sshRemote = createUpdateDeps({
  responses: { 'remote get-url origin': 'git@github.com:TwotNguyenVN/staruml-plantuml-importer.git\n' }
});
manage.update(sshRemote.deps);
assert.strictEqual(sshRemote.getInstallCount(), 1, 'The package repository SSH remote should be accepted');

// 5.5 Destructive StarUML removal must not exist in any clear implementation.
const manageSource = fs.readFileSync(path.join(__dirname, '..', 'manage.js'), 'utf8');
const clearBatSource = fs.readFileSync(path.join(__dirname, '..', 'clear.bat'), 'utf8');
const clearShSource = fs.readFileSync(path.join(__dirname, '..', 'clear.sh'), 'utf8');
const installShSource = fs.readFileSync(path.join(__dirname, '..', 'install.sh'), 'utf8');
const nativePathSafetyShSource = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'native-path-safety.sh'), 'utf8');
const nativePathSafetySource = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'native-path-safety.ps1'), 'utf8');
const clearBatImplementation = clearBatSource + '\n' + nativePathSafetySource;
const clearSources = [manageSource, clearBatImplementation, clearShSource];
assert.doesNotMatch(manageSource, /\bexecSync\b/, 'Updater must not construct shell commands');
function containsStarUmlProcessKill(source) {
  const commandPatterns = [
    /^\s*(?:(?:#|\/\/|::)\s*|rem\s+)?(?:sudo\s+)?(?:pkill|killall)\b(?=[^\r\n]*\bStarUML(?:\.exe)?\b)/i,
    /^\s*(?:(?:#|\/\/|::)\s*|rem\s+)?taskkill(?:\.exe)?\b(?=[^\r\n]*\/IM\s+["']?StarUML(?:\.exe)?\b)/i,
    /^\s*(?:(?:#|\/\/|::)\s*|rem\s+)?Stop-Process\b(?=[^\r\n]*-Name\s+["']?StarUML(?:\.exe)?\b)/i
  ];
  return source.split(/\r?\n/).some(line => commandPatterns.some(pattern => pattern.test(line)));
}

[
  'pkill -f StarUML',
  '# pkill -f StarUML',
  'killall StarUML',
  '# killall StarUML',
  'taskkill /F /IM StarUML.exe',
  'REM taskkill /F /IM StarUML.exe',
  'Stop-Process -Name StarUML',
  '# Stop-Process -Name "StarUML"'
].forEach(command => {
  assert.strictEqual(containsStarUmlProcessKill(command), true, 'Detector must reject process-kill command: ' + command);
});
[
  'echo "Close StarUML before installing"',
  '# Close StarUML before installing',
  'printf "Stop StarUML manually, then retry\\n"',
  'echo "Example: killall StarUML"'
].forEach(instruction => {
  assert.strictEqual(containsStarUmlProcessKill(instruction), false, 'Detector must allow harmless instruction: ' + instruction);
});
assert.strictEqual(
  containsStarUmlProcessKill(installShSource),
  false,
  'install.sh must not contain active or commented StarUML process-kill commands'
);
const forbiddenClearPatterns = [
  /clear-all/i,
  /taskkill|pkill/i,
  /uninstall staruml/i,
  /staruml-updater/i,
  /library[\\/]caches/i,
  /library[\\/]preferences/i,
  /library[\\/]logs/i,
  /sudo\s+rm/i,
  /programfiles|program files\\staruml/i
];

clearSources.forEach(source => {
  forbiddenClearPatterns.forEach(pattern => {
    assert.doesNotMatch(source, pattern, 'Clear implementations must not contain destructive StarUML path or process operations');
  });
  assert.match(source, /twot\.staruml-plantuml-importer/, 'Each clear implementation must target this extension');
});

const manageDeletionTargets = Array.from(
  manageSource.matchAll(/fs\.rmSync\(\s*([^,\r\n]+)\s*,/g),
  match => match[1].trim()
);
assert.deepStrictEqual(manageDeletionTargets, ['extensionDir'], 'manage.js must centralize recursive deletion in its validator');
assert.match(manageSource, /safeDeleteExtension\(targetDir, extensionRoot\)/, 'manage.js install and clear must use validated deletion');

assert.match(
  manageSource,
  /if \(platform === 'darwin'\) \{\s*targetDir = path\.join\(os\.homedir\(\), 'Library\/Application Support\/StarUML\/extensions\/user\/twot\.staruml-plantuml-importer'\);\s*\}/,
  'macOS targetDir must use the StarUML extension root and fixed extension suffix'
);
assert.match(
  manageSource,
  /else if \(platform === 'win32'\) \{\s*targetDir = path\.join\(process\.env\.APPDATA \|\| path\.join\(os\.homedir\(\), 'AppData\/Roaming'\), 'StarUML\/extensions\/user\/twot\.staruml-plantuml-importer'\);\s*\}/,
  'Windows targetDir must use the roaming StarUML extension root and fixed extension suffix'
);
assert.match(
  manageSource,
  /else if \(platform === 'linux'\) \{\s*targetDir = path\.join\(os\.homedir\(\), '\.config\/StarUML\/extensions\/user\/twot\.staruml-plantuml-importer'\);\s*\}/,
  'Linux targetDir must use the StarUML extension root and fixed extension suffix'
);
assert.match(
  manageSource,
  /else \{\s*console\.error\(`[^`]*Unsupported OS:[^`]*`\);\s*process\.exit\(1\);\s*\}/,
  'Unsupported platforms must exit instead of producing a deletion target'
);

assert.match(
  clearShSource,
  /remove_extension_atomic "\$EXTENSION_ROOT" "twot\.staruml-plantuml-importer"/,
  'clear.sh must pass only the validated root and fixed extension identifier to atomic removal'
);
assert.doesNotMatch(clearShSource, /^\s*rm\b/m, 'clear.sh wrapper must not delete paths directly');
assert.match(nativePathSafetyShSource, /move_entry_atomic "\$target" "\$quarantine"/);
assert.match(nativePathSafetyShSource, /rm -rf -- "\$entry"/);

assert.doesNotMatch(clearBatSource, /set\s+\/p/i, 'clear.bat must not read arbitrary confirmation text');
assert.doesNotMatch(clearBatSource, /%confirm%/i, 'Confirmation input must never be interpolated as CMD syntax');
assert.doesNotMatch(clearBatSource, /%APPDATA%/i, 'APPDATA must never be interpolated into a deletion command');
assert.doesNotMatch(clearBatSource, /%[^%\r\n]+%/, 'Environment values must never become CMD syntax');
assert.match(clearBatSource, /choice\s+\/C\s+YN\s+\/N\b/i, 'clear.bat must accept only explicit Y or N');
assert.match(clearBatSource, /if\s+not\s+errorlevel\s+1\s+goto\s+cancelled\b/i, 'ERRORLEVEL 0 must cancel removal');
assert.match(clearBatSource, /if\s+errorlevel\s+2\s+goto\s+cancelled\b/i, 'ERRORLEVEL 2 and above must cancel removal');
const lowerChoiceGateIndex = clearBatSource.search(/if\s+not\s+errorlevel\s+1\s+goto\s+cancelled\b/i);
const upperChoiceGateIndex = clearBatSource.search(/if\s+errorlevel\s+2\s+goto\s+cancelled\b/i);
const batchDeletionIndex = clearBatSource.search(/powershell\.exe\b/i);
assert.ok(
  upperChoiceGateIndex < lowerChoiceGateIndex && lowerChoiceGateIndex < batchDeletionIndex,
  'Both choice gates must run before the deletion command'
);
assert.match(nativePathSafetySource, /GetFolderPath\('ApplicationData'\)/, 'PowerShell must derive ApplicationData itself');
assert.match(
  nativePathSafetySource,
  /Join-Path \$rootFull \$ExtensionName/,
  'PowerShell must join the fixed extension suffix to the derived user-extension root'
);
assert.match(nativePathSafetySource, /Move-EntryAtomic \$target \$quarantine/);
assert.match(nativePathSafetySource, /Remove-EntryNoFollow \$quarantine/);
assert.doesNotMatch(nativePathSafetySource, /Remove-Item[^\r\n]+-Recurse/i, 'PowerShell must not recursively follow a quarantined reparse entry');


// 6. Sequence diagram late-failure rollback regression test
const sequenceParser = require('../parsers/sequence-parser.js');

let seqDeleteCalled = false;
let seqDeletedModels = [];
let seqDeletedViews = [];

global.app = {
  project: {
    getProject: () => ({ _parent: null })
  },
  type: {
    UMLActor: class UMLActor { getClassName() { return "UMLActor"; } },
    UMLAttribute: class UMLAttribute { getClassName() { return "UMLAttribute"; } },
    UMLLifeline: class UMLLifeline { getClassName() { return "UMLLifeline"; } },
    UMLSeqLifelineView: class UMLSeqLifelineView { getClassName() { return "UMLSeqLifelineView"; } initialize() {} },
    UMLMessage: class UMLMessage { getClassName() { return "UMLMessage"; } },
    UMLSeqMessageView: class UMLSeqMessageView { getClassName() { return "UMLSeqMessageView"; } initialize() {} },
    UMLGeneralNodeView: { SD_ICON: 1 }
  },
  repository: {
    getOperationBuilder: () => ({
      begin: () => {},
      insert: (elem) => {},
      fieldInsert: () => {},
      end: () => {},
      getOperation: () => ({}),
      discard: () => {}
    }),
    doOperation: () => {}
  },
  diagrams: {
    setCurrentDiagram: () => {}
  },
  engine: {
    deleteElements: (models, views) => {
      seqDeleteCalled = true;
      seqDeletedModels = models;
      seqDeletedViews = views;
    }
  },
  factory: {
    createModel: (opts) => {
      return { getClassName: () => opts.id };
    },
    createModelAndView: (opts) => {
      // Throw error during CombinedFragment or Note creation (late failure after core commit)
      if (opts.id === "UMLCombinedFragment" || opts.id === "UMLNote") {
        throw new Error("Simulated CombinedFragment creation failure");
      }
      return {
        model: {
          getClassName: () => opts.id.replace("View", ""),
          operands: []
        }
      };
    }
  }
};

const origCreateModel = app.factory.createModel;
const origGetOpBuilder = app.repository.getOperationBuilder;

const seqText = `
@startuml
Alice -> Bob: Hello
opt Successful connection
  Bob -> Alice: Success
end
@enduml
`;

const mockDiagram = { _parent: { _parent: null } };
global.silenceConsoleError();
let seqResult;
try {
  seqResult = sequenceParser.generateDiagram(mockDiagram, seqText);
} finally {
  global.restoreConsoleError();
}

assert.strictEqual(seqResult.success, false, "Sequence import should fail due to combined fragment error");
assert.strictEqual(seqResult.rollbackAttempted, true);
assert.strictEqual(seqResult.rollbackSucceeded, true);
assert.strictEqual(seqResult.createdCount, 0);

// Verify that original methods were restored
assert.strictEqual(app.factory.createModel, origCreateModel, "createModel should be restored");
assert.strictEqual(app.repository.getOperationBuilder, origGetOpBuilder, "getOperationBuilder should be restored");

// Verify correct classifications in deleteElements arrays
assert.ok(seqDeleteCalled, "deleteElements should have been called");
assert.ok(seqDeletedModels.length > 0, "Should have deleted model elements");
assert.ok(seqDeletedViews.length > 0, "Should have deleted view elements");

// Ensure views did not end up in the models array, and models did not end up in the views array
seqDeletedModels.forEach(m => {
  const cn = typeof m.getClassName === "function" ? m.getClassName() : "";
  assert.ok(!cn.endsWith("View"), "Models array should not contain view elements: " + cn);
});
seqDeletedViews.forEach(v => {
  const cn = typeof v.getClassName === "function" ? v.getClassName() : "";
  assert.ok(cn.endsWith("View"), "Views array should only contain view elements: " + cn);
});


// 7. State diagram relocation failure test with targeted assertion
const stateParser = require('../parsers/state-parser.js');

let stateDeleteCalled = false;
let stateDeletedModels = [];

global.type = global.type || {};
[
  "UMLStateMachine", "UMLRegion", "UMLState", "UMLPseudostate", "UMLFinalState", "UMLTransition",
  "UMLStateMachineView", "UMLStateView", "UMLPseudostateView", "UMLFinalStateView", "UMLTransitionView",
  "UMLStatechartDiagram", "UMLRegionView"
].forEach(name => {
  if (!global.type[name]) {
    global.type[name] = function() {
      this.getClassName = () => name;
      this._parent = null;
    };
  }
});

global.app = {
  project: {
    getProject: () => ({ getClassName: () => "Project", ownedElements: [] })
  },
  engine: {
    deleteElements: (models, views) => {
      stateDeleteCalled = true;
      stateDeletedModels = models;
    }
  },
  repository: {
    getOperationBuilder: () => {
       return {
           begin: () => {},
           end: () => {},
           getOperation: () => [],
           discard: () => {},
           insert: () => {},
           fieldInsert: () => {},
           fieldRemove: () => { throw new Error("Simulated relocation failure"); }
       };
    },
    doOperation: () => {}
  },
  factory: {
    createModel: () => {},
    createModelAndView: () => {}
  }
};

const stateText = `
@startuml
[*] --> StateA
@enduml
`;

const stateRegion = {
  getClassName: () => "UMLRegion",
  _parent: { getClassName: () => "UMLStateMachine" }
};
const stateDiagramObj = {
  getClassName: () => "UMLStatechartDiagram",
  _parent: stateRegion,
  ownedViews: []
};

global.silenceConsoleError();
let stateResult;
try {
  stateResult = stateParser.generateDiagram(stateDiagramObj, stateText);
} finally {
  global.restoreConsoleError();
}

assert.strictEqual(stateResult.success, false, "State import should fail on relocate failure");
assert.strictEqual(stateResult.rollbackAttempted, true);
assert.strictEqual(stateResult.rollbackSucceeded, true);
assert.strictEqual(stateResult.createdCount, 0);
assert.ok(stateDeleteCalled, "Relocate failure must trigger rollback deleteElements");


// 7.5 Dialog button markup regression test
let capturedTemplate = "";
const dialogHelper = require('../utils/dialog-helper.js');
const mockJq = {
  css: () => mockJq,
  append: () => mockJq,
  on: () => mockJq,
  off: () => mockJq,
  find: () => mockJq,
  text: () => mockJq,
  hide: () => mockJq,
  show: () => mockJq,
  attr: () => mockJq,
  val: () => "",
  focus: () => mockJq
};
global.$ = () => mockJq;
global.window = {};
global.app = {
  dialogs: {
    showModalDialogUsingTemplate: (tpl) => {
      capturedTemplate = tpl;
      return {
        getElement: () => mockJq
      };
    }
  },
  preferences: {
    get: () => ""
  }
};
dialogHelper.showImportDialog("PlantUML Importer", "");
delete global.$;
delete global.window;

assert.ok(capturedTemplate, "Dialog template should be captured");
assert.ok(capturedTemplate.indexOf('class="k-button dialog-button btn btn-default"') !== -1, "Cancel button must be a dialog-button");
assert.ok(capturedTemplate.indexOf('class="k-button dialog-button primary btn btn-primary"') !== -1, "Import button must be a dialog-button");
assert.ok(capturedTemplate.indexOf('class="k-button outline btn-clear-code"') !== -1, "Clear Code button must NOT be a dialog-button");


// 8. Dialog launch failure compatibility & defensive wrapper test
const main = require('../main.js');

assert.strictEqual(typeof main.formatImportSuccessMessage, 'function');
assert.strictEqual(typeof main.formatImportFailureMessage, 'function');
const boundedWarningMessage = main.formatImportSuccessMessage({
  createdCount: 3,
  warnings: Array.from({ length: 12 }, (_, index) => 'warning-' + (index + 1))
});
assert.ok(boundedWarningMessage.indexOf('warning-1') !== -1);
assert.ok(boundedWarningMessage.indexOf('warning-10') !== -1);
assert.ok(boundedWarningMessage.indexOf('warning-11') === -1);
assert.ok(boundedWarningMessage.indexOf('2 more warning(s)') !== -1);
const failedRollbackMessage = main.formatImportFailureMessage({
  rollbackAttempted: true,
  rollbackSucceeded: false,
  createdCount: 4,
  errors: ['SECRET token /private/path']
});
assert.match(failedRollbackMessage, /rollback failed or may be incomplete/i);
assert.match(failedRollbackMessage, /Residual elements: 4/i);
assert.doesNotMatch(failedRollbackMessage, /SECRET|token|private/);

let alertDialogCalled = false;
let alertDialogMessage = "";

global.app = {
  dialogs: {
    showModalDialogUsingTemplate: () => {
      throw new Error("Simulated Kendo Window layout failure");
    },
    showAlertDialog: (msg) => {
      alertDialogCalled = true;
      alertDialogMessage = msg;
    }
  },
  diagrams: {
    getCurrentDiagram: () => ({
      getClassName: () => "UMLClassDiagram"
    })
  }
};

global.silenceConsoleError();
main.handleImportAuto();

setTimeout(() => {
  global.restoreConsoleError();
  try {
    assert.ok(alertDialogCalled, "showAlertDialog should have been called on dialog launch failure");
    assert.ok(
      alertDialogMessage.indexOf("Failed to open Import dialog") !== -1,
      "Alert message should report the launch failure: " + alertDialogMessage
    );
    assert.ok(
      alertDialogMessage.indexOf("Simulated Kendo Window layout failure") === -1,
      "Alert message must not contain unexpected exception details"
    );
    console.log("Success: run_regression_tests completed successfully.");
  } catch (err) {
    console.error("Dialog launch failure regression test failed:", err);
    process.exit(1);
  }
}, 20);
