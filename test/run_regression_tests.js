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


// 5. Test safe update imports and orchestrations
const manage = require('../manage.js');
assert.ok(typeof manage.checkDirty === 'function', "manage.js must export checkDirty");
assert.ok(typeof manage.update === 'function', "manage.js must export update");

// Scenario 1: dirty tracked change aborts before fetch/install
let installCalled = false;
let mockCommandsRun = [];

const mockDepsDirtyTracked = {
  execFileSync: (cmd, args) => {
    mockCommandsRun.push({ cmd, args });
    if (args[0] === 'status' && args[1] === '--porcelain') {
      return "M main.js\n";
    }
    return "";
  },
  install: () => {
    installCalled = true;
  }
};

assert.throws(() => {
  manage.update(mockDepsDirtyTracked);
}, /Worktree is dirty/);
assert.strictEqual(installCalled, false, "Should not install if tracked files are dirty");
assert.deepStrictEqual(mockCommandsRun, [
  { cmd: 'git', args: ['status', '--porcelain'] }
], "Should only check dirty state and abort before fetch");

// Scenario 2: untracked file aborts
installCalled = false;
mockCommandsRun = [];

const mockDepsUntracked = {
  execFileSync: (cmd, args) => {
    mockCommandsRun.push({ cmd, args });
    if (args[0] === 'status' && args[1] === '--porcelain') {
      return "?? test/untracked_file.js\n";
    }
    return "";
  },
  install: () => {
    installCalled = true;
  }
};

assert.throws(() => {
  manage.update(mockDepsUntracked);
}, /Worktree is dirty/);
assert.strictEqual(installCalled, false, "Should not install if untracked files exist");

// Scenario 3: clean repo uses fetch and ff-only upstream merge
installCalled = false;
mockCommandsRun = [];

const mockDepsCleanUpstream = {
  execFileSync: (cmd, args) => {
    mockCommandsRun.push({ cmd, args });
    if (args[0] === 'status' && args[1] === '--porcelain') {
      return "";
    }
    if (args[0] === 'rev-parse' && args[1] === '--abbrev-ref') {
      return "main";
    }
    if (args[0] === 'rev-parse' && args[1] === '--symbolic-full-name') {
      // Mock successful upstream check
      return "refs/remotes/origin/main";
    }
    return "";
  },
  install: () => {
    installCalled = true;
  }
};

manage.update(mockDepsCleanUpstream);
assert.strictEqual(installCalled, true, "Should call install on clean update");
const expectedCommandsUpstream = [
  { cmd: 'git', args: ['status', '--porcelain'] },
  { cmd: 'git', args: ['fetch'] },
  { cmd: 'git', args: ['rev-parse', '--abbrev-ref', 'HEAD'] },
  { cmd: 'git', args: ['rev-parse', '--symbolic-full-name', '@{u}'] },
  { cmd: 'git', args: ['merge', '--ff-only'] }
];
assert.deepStrictEqual(mockCommandsRun, expectedCommandsUpstream, "Commands should match upstream merge pattern");

// Scenario 4: no-upstream fallback uses origin/currentBranch with argument array
installCalled = false;
mockCommandsRun = [];

const mockDepsNoUpstream = {
  execFileSync: (cmd, args) => {
    mockCommandsRun.push({ cmd, args });
    if (args[0] === 'status' && args[1] === '--porcelain') {
      return "";
    }
    if (args[0] === 'rev-parse' && args[1] === '--abbrev-ref') {
      return "feature-x";
    }
    if (args[0] === 'rev-parse' && args[1] === '--symbolic-full-name') {
      // Mock no upstream
      throw new Error("No upstream branch configured");
    }
    return "";
  },
  install: () => {
    installCalled = true;
  }
};

manage.update(mockDepsNoUpstream);
assert.strictEqual(installCalled, true, "Should call install on clean fallback update");
const expectedCommandsNoUpstream = [
  { cmd: 'git', args: ['status', '--porcelain'] },
  { cmd: 'git', args: ['fetch'] },
  { cmd: 'git', args: ['rev-parse', '--abbrev-ref', 'HEAD'] },
  { cmd: 'git', args: ['rev-parse', '--symbolic-full-name', '@{u}'] },
  { cmd: 'git', args: ['merge', '--ff-only', 'origin/feature-x'] }
];
assert.deepStrictEqual(mockCommandsRun, expectedCommandsNoUpstream, "Fallback commands should match");

// Scenario 5: merge/fetch failure never calls install
installCalled = false;
mockCommandsRun = [];

const mockDepsFetchFailure = {
  execFileSync: (cmd, args) => {
    mockCommandsRun.push({ cmd, args });
    if (args[0] === 'status' && args[1] === '--porcelain') {
      return "";
    }
    if (args[0] === 'fetch') {
      throw new Error("Fetch failed");
    }
    return "";
  },
  install: () => {
    installCalled = true;
  }
};

assert.throws(() => {
  manage.update(mockDepsFetchFailure);
}, /Fetch failed/);
assert.strictEqual(installCalled, false, "Should not call install on merge/fetch failure");


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
      "Alert message should report the launch failure details: " + alertDialogMessage
    );
    assert.ok(
      alertDialogMessage.indexOf("Simulated Kendo Window layout failure") !== -1,
      "Alert message should contain the original error details"
    );
    console.log("Success: run_regression_tests completed successfully.");
  } catch (err) {
    console.error("Dialog launch failure regression test failed:", err);
    process.exit(1);
  }
}, 20);
