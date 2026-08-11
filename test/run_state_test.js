require('./fail_on_console_error.js');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const stateParser = require('../parsers/state-parser');

const simplePuml = fs.readFileSync(path.join(__dirname, 'state_simple.puml'), 'utf8');
const compositePuml = fs.readFileSync(path.join(__dirname, 'state_composite.puml'), 'utf8');
const orthogonalPuml = fs.readFileSync(path.join(__dirname, 'Statechart_Diagram.puml'), 'utf8');

let elements = [];
let rollbackCalled = false;

// Provide global type constructors
global.type = {};
[
  "UMLStateMachine", "UMLRegion", "UMLState", "UMLPseudostate", "UMLFinalState", "UMLTransition",
  "UMLStateMachineView", "UMLStateView", "UMLPseudostateView", "UMLFinalStateView", "UMLTransitionView",
  "UMLStatechartDiagram", "UMLRegionView"
].forEach(name => {
  global.type[name] = function() {
    this.getClassName = () => name;
    this.name = "";
    this._parent = null;
    this.regions = [];
    this.vertices = [];
    this.transitions = [];
    this.ownedElements = [];
    this.ownedViews = [];
    this.subViews = [];
    this.model = null;
    this.decompositionCompartment = {
        getClassName: () => "UMLDecompositionCompartmentView",
        visible: false,
        subViews: []
    };
    this.nameCompartment = {};
    this.initialize = function() {};
  };
  global.type[name].PSK_INITIAL = "initial";
  global.type[name].PSK_CHOICE = "choice";
  global.type[name].PSK_FORK = "fork";
  global.type[name].PSK_JOIN = "join";
});

let pendingOperations = [];
let builderActive = false;

// Mock StarUML API with strict containment rules
global.app = {
  dialogs: {
    showAlertDialog: (msg) => { throw new Error("ALERT: " + msg); },
    showInfoDialog: (msg) => console.log("INFO:", msg)
  },
  project: {
    getProject: () => ({ getClassName: () => "Project", ownedElements: [] })
  },
  repository: {
    getOperationBuilder: () => {
      return {
        begin: (name) => { builderActive = true; pendingOperations = []; },
        insert: (elem) => { },
        fieldInsert: (parent, field, elem) => {
          pendingOperations.push({ action: 'insert', parent, field, elem });
        },
        fieldRemove: (parent, field, elem) => {
          pendingOperations.push({ action: 'remove', parent, field, elem });
        },
        end: () => {},
        discard: () => { builderActive = false; pendingOperations = []; },
        getOperation: () => pendingOperations
      };
    },
    doOperation: (cmd) => {
      if (!builderActive) return;
      cmd.forEach(op => {
        let pid = op.parent ? op.parent.getClassName() : "unknown";
        let cid = op.elem ? op.elem.getClassName() : "unknown";

        if (op.action === 'insert') {
          // Simulate StarUML containment rules
          if (cid === "UMLState" && pid !== "UMLRegion") throw new Error(`State cannot be placed here. Parent must be UMLRegion. Got: ${pid}`);
          if (cid === "UMLRegion" && !["UMLStateMachine", "UMLState"].includes(pid)) throw new Error(`Region cannot be placed here. Parent must be UMLStateMachine or UMLState. Got: ${pid}`);
          if (cid === "UMLTransition" && pid !== "UMLRegion") throw new Error(`Transition cannot be placed here. Parent must be UMLRegion. Got: ${pid}`);
          if (cid === "UMLPseudostate" && pid !== "UMLRegion") throw new Error(`Pseudostate cannot be placed here. Parent must be UMLRegion. Got: ${pid}`);
          if (cid === "UMLFinalState" && pid !== "UMLRegion") throw new Error(`FinalState cannot be placed here. Parent must be UMLRegion. Got: ${pid}`);

          if (!op.parent[op.field]) op.parent[op.field] = [];
          op.parent[op.field].push(op.elem);
          if (cid.indexOf("View") === -1) {
             elements.push(op.elem); // track models
          } else {
             elements.push(op.elem); // track views
          }
        } else if (op.action === 'remove') {
          if (op.parent[op.field]) {
            op.parent[op.field] = op.parent[op.field].filter(e => e !== op.elem);
          }
        }
      });
      builderActive = false;
      pendingOperations = [];
    }
  }
};

let parserHelper = require('../utils/parser-helper');
// Intercept parser-helper to ensure we test rollback correctly
parserHelper.runInTransaction = function(diagramType, func) {
    rollbackCalled = false;
    let warnings = [];
    let errors = [];
    try {
        func(warnings, errors);
        if (errors.length > 0) throw new Error(errors[0]);
        return { success: true, diagramType, errors, createdCount: elements.length };
    } catch (e) {
        rollbackCalled = true;
        // In the real system, discard or rollback deletes elements. We simulate this by clearing.
        elements = [];
        return { success: false, diagramType, errors: [e.message], createdCount: 0 };
    }
};

function setupDiagram() {
  elements = [];
  rollbackCalled = false;
  let sm = new global.type.UMLStateMachine();
  let region = new global.type.UMLRegion();
  region.name = "Region1";
  region._parent = sm;
  sm.regions.push(region);
  let diag = new global.type.UMLStatechartDiagram();
  diag._parent = sm;
  return { sm, rootRegion: region, diag };
}

// 1. Simple diagram
let setup1 = setupDiagram();
let res1 = stateParser.generateDiagram(setup1.diag, simplePuml);
assert.strictEqual(res1.success, true, "Simple should succeed: " + JSON.stringify(res1.errors));
assert.strictEqual(rollbackCalled, false);
let states1 = elements.filter(e => e.getClassName() === "UMLState");
assert.strictEqual(states1.length, 1);
assert.strictEqual(states1[0].name, "State1");
assert.strictEqual(states1[0]._parent, setup1.rootRegion, "State1 must be owned by rootRegion");
assert.strictEqual(elements.filter(e => e.getClassName() === "UMLPseudostate").length, 1);
assert.strictEqual(elements.filter(e => e.getClassName() === "UMLFinalState").length, 1);
assert.strictEqual(elements.filter(e => e.getClassName() === "UMLTransition").length, 2);

// 2. Composite state with one nested region
let setup2 = setupDiagram();
let res2 = stateParser.generateDiagram(setup2.diag, compositePuml);
assert.strictEqual(res2.success, true, "Composite should succeed: " + JSON.stringify(res2.errors));
let states2 = elements.filter(e => e.getClassName() === "UMLState");
assert.strictEqual(states2.length, 2); // State1, State2
let state1 = states2.find(s => s.name === "State1");
let state2 = states2.find(s => s.name === "State2");
assert.strictEqual(state1._parent, setup2.rootRegion, "State1 must be owned by rootRegion");
assert.strictEqual(state1.regions.length, 1, "State1 should own exactly 1 region");
assert.strictEqual(state2._parent, state1.regions[0], "State2 must be owned by State1's region");

// 3. Three orthogonal regions
let setup3 = setupDiagram();
let res3 = stateParser.generateDiagram(setup3.diag, orthogonalPuml);
assert.strictEqual(res3.success, true, "Orthogonal should succeed: " + JSON.stringify(res3.errors));

let states3 = elements.filter(e => e.getClassName() === "UMLState");
assert.strictEqual(states3.length, 16, "Should have exactly 16 UMLState models");

let expectedStateNames = ["TaoDonHang", "DangXuLy", "Region 1: Thanh toán", "ChoThanhToan", "DaThanhToan", "ThanhToanThatBai", "Region 2: Kho hàng", "KiemTraTonKho", "DaGiuHang", "HetHang", "Region 3: Giao hàng", "ChuanBiGiao", "DangGiao", "DaGiao", "HoanTat", "HuyDon"];
let actualStateNames = states3.map(s => s.name);
expectedStateNames.forEach(name => {
    assert.ok(actualStateNames.includes(name), "Missing state: " + name);
});

let dangXuLy = states3.find(s => s.name === "DangXuLy");
assert.strictEqual(dangXuLy._parent, setup3.rootRegion, "DangXuLy should be owned by rootRegion");
assert.strictEqual(dangXuLy.regions.length, 3, "DangXuLy should have exactly 3 regions");

let payment = states3.find(s => s.name === "Region 1: Thanh toán");
assert.strictEqual(payment._parent, dangXuLy.regions[0], "Payment should be in DangXuLy's first region");
let choThanhToan = states3.find(s => s.name === "ChoThanhToan");
assert.strictEqual(choThanhToan._parent, payment.regions[0], "ChoThanhToan should be in Payment's region");
let daThanhToan = states3.find(s => s.name === "DaThanhToan");
assert.strictEqual(daThanhToan._parent, payment.regions[0], "DaThanhToan should be in Payment's region");
let thanhToanThatBai = states3.find(s => s.name === "ThanhToanThatBai");
assert.strictEqual(thanhToanThatBai._parent, payment.regions[0], "ThanhToanThatBai should be in Payment's region");

let inventory = states3.find(s => s.name === "Region 2: Kho hàng");
assert.strictEqual(inventory._parent, dangXuLy.regions[1], "Inventory should be in DangXuLy's second region");
let kiemTraTonKho = states3.find(s => s.name === "KiemTraTonKho");
assert.strictEqual(kiemTraTonKho._parent, inventory.regions[0], "KiemTraTonKho should be in Inventory's region");
let daGiuHang = states3.find(s => s.name === "DaGiuHang");
assert.strictEqual(daGiuHang._parent, inventory.regions[0], "DaGiuHang should be in Inventory's region");
let hetHang = states3.find(s => s.name === "HetHang");
assert.strictEqual(hetHang._parent, inventory.regions[0], "HetHang should be in Inventory's region");

let delivery = states3.find(s => s.name === "Region 3: Giao hàng");
assert.strictEqual(delivery._parent, dangXuLy.regions[2], "Delivery should be in DangXuLy's third region");
let chuanBiGiao = states3.find(s => s.name === "ChuanBiGiao");
assert.strictEqual(chuanBiGiao._parent, delivery.regions[0], "ChuanBiGiao should be in Delivery's region");
let dangGiao = states3.find(s => s.name === "DangGiao");
assert.strictEqual(dangGiao._parent, delivery.regions[0], "DangGiao should be in Delivery's region");
let daGiao = states3.find(s => s.name === "DaGiao");
assert.strictEqual(daGiao._parent, delivery.regions[0], "DaGiao should be in Delivery's region");

let pseudostates3 = elements.filter(e => e.getClassName() === "UMLPseudostate");
assert.strictEqual(pseudostates3.length, 4, "Should have 4 initials");

let finalstates3 = elements.filter(e => e.getClassName() === "UMLFinalState");
assert.strictEqual(finalstates3.length, 5, "Should have 5 finals");

let transitions3 = elements.filter(e => e.getClassName() === "UMLTransition");
assert.strictEqual(transitions3.length, 19, "Should have exactly 19 transitions");

let labeledTransitions = transitions3.filter(t => t.name && t.name.length > 0);
assert.strictEqual(labeledTransitions.length, 10, "Should have exactly 10 labeled transitions");

// Test geometry: non-overlap of sibling state rectangles and initial/final circles
let allViews = elements.filter(e => e.getClassName().includes("View"));
let uniqueViews = Array.from(new Set(allViews));
let vertexViews = uniqueViews.filter(v => ["UMLStateView", "UMLPseudostateView", "UMLFinalStateView"].includes(v.getClassName()));

for (let i = 0; i < vertexViews.length; i++) {
    for (let j = i + 1; j < vertexViews.length; j++) {
        let v1 = vertexViews[i];
        let v2 = vertexViews[j];
        if (v1.containerView === v2.containerView || (!v1.containerView && !v2.containerView)) {
            let overlap = !(v1.left + v1.width <= v2.left || v2.left + v2.width <= v1.left || v1.top + v1.height <= v2.top || v2.top + v2.height <= v1.top);
            assert.strictEqual(overlap, false, `Overlap detected between ${v1.model.name} and ${v2.model.name}`);
        }
    }
}

// Test fan-out layering/staggering for Payment state
let stateViews = uniqueViews.filter(v => v.getClassName() === "UMLStateView");
let choThanhToanView = stateViews.find(v => v.model === choThanhToan);
let daThanhToanView = stateViews.find(v => v.model === daThanhToan);
let thatBaiView = stateViews.find(v => v.model === thanhToanThatBai);

assert.strictEqual(daThanhToanView.left, thatBaiView.left, "DaThanhToan and ThanhToanThatBai should be in the same column (staggered vertically)");
let vDiff = Math.abs(daThanhToanView.top - thatBaiView.top);
assert.ok(vDiff >= 50, `Vertical distance between staggered nodes should be at least 50px, got ${vDiff}`);
assert.ok(choThanhToanView.left < daThanhToanView.left, "ChoThanhToan should be placed to the left of DaThanhToan");

// 4. Rollback on placement failure test
let originalInsert = null;
let setup4 = setupDiagram();
let loggedErrors = [];
const originalConsoleError = console.error;
let res4;
// Inject a failure into the builder
let actualGetBuilder = global.app.repository.getOperationBuilder;
let actualDoOperation = global.app.repository.doOperation;
let discardCalled = false;
let doOperationCount = 0;
try {
  console.error = (...args) => {
    loggedErrors.push(args.join(" "));
  };

  global.app.repository.doOperation = function(cmd) {
    doOperationCount++;
    actualDoOperation(cmd);
  };

  global.app.repository.getOperationBuilder = function() {
     let builder = actualGetBuilder();
     originalInsert = builder.insert;
     builder.insert = function(elem) {
        if (elem.getClassName() === "UMLState") {
           throw new Error("Forced Failure Mid-Build");
        }
        originalInsert.call(builder, elem);
     };
     // track discard
     let originalDiscard = builder.discard;
     builder.discard = function() {
        discardCalled = true;
        originalDiscard.call(builder);
     };
     return builder;
  };

  res4 = stateParser.generateDiagram(setup4.diag, simplePuml);
} finally {
  console.error = originalConsoleError;
  global.app.repository.getOperationBuilder = actualGetBuilder;
  global.app.repository.doOperation = actualDoOperation;
}
assert.strictEqual(res4.success, false, "Should fail");
assert.strictEqual(res4.errors[0], "Forced Failure Mid-Build");
assert.strictEqual(discardCalled, true, "builder.discard should be called");
assert.strictEqual(doOperationCount, 0, "doOperation should not be called");
assert.strictEqual(elements.length, 0, "Tree should be clean after rollback");
assert.ok(loggedErrors.some(msg => msg.includes("State generation failed")), "Expected stable generic error log");
assert.ok(loggedErrors.every(msg => !msg.includes("Forced Failure Mid-Build")), "Unexpected exception details must not be logged");

// 5. Targeted relocation rollback test
let setup5 = setupDiagram();
setup5.diag._parent = setup5.rootRegion; // force relocation
let reloGetBuilder = global.app.repository.getOperationBuilder;
let discardCalled2 = false;
let origConsoleErr2 = console.error;
try {
  console.error = () => {};
  global.app.repository.getOperationBuilder = function() {
     let builder = reloGetBuilder();
     let origRemove = builder.fieldRemove;
     builder.fieldRemove = function(p, f, e) {
        throw new Error("Relocation failed");
     };
     let origDiscard = builder.discard;
     builder.discard = function() { discardCalled2 = true; origDiscard.call(builder); };
     return builder;
  };
  let res5 = stateParser.generateDiagram(setup5.diag, simplePuml);
  assert.strictEqual(res5.success, false);
  assert.strictEqual(res5.errors[0], "Relocation failed");
  assert.strictEqual(setup5.diag._parent, setup5.rootRegion, "Diagram parent should be restored");
  assert.strictEqual(discardCalled2, true);
} finally {
  console.error = origConsoleErr2;
  global.app.repository.getOperationBuilder = reloGetBuilder;
}

console.log("Success: All state parser tests passed successfully!");
