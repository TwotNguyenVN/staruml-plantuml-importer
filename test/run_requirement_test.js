const fs = require("fs");
const path = require("path");
const requirementParser = require("../parsers/requirement-parser");

// --- StarUML Mock ---
global.type = {
  SysMLRequirementDiagram: class {
    getClassName() { return "SysMLRequirementDiagram"; }
  },
  SysMLRequirement: class {
    getClassName() { return "SysMLRequirement"; }
  },
  SysMLRequirementView: class {
    getClassName() { return "SysMLRequirementView"; }
    initialize() {}
  },
  UMLClass: class {
    getClassName() { return "UMLClass"; }
  },
  UMLClassView: class {
    getClassName() { return "UMLClassView"; }
    initialize() {}
  },
  UMLContainmentView: class {
    getClassName() { return "UMLContainmentView"; }
    initialize() {}
  },
  SysMLSatisfy: class { getClassName() { return "SysMLSatisfy"; } },
  SysMLSatisfyView: class { getClassName() { return "SysMLSatisfyView"; } },
  SysMLDeriveReqt: class { getClassName() { return "SysMLDeriveReqt"; } },
  SysMLDeriveReqtView: class { getClassName() { return "SysMLDeriveReqtView"; } },
  SysMLVerify: class { getClassName() { return "SysMLVerify"; } },
  SysMLVerifyView: class { getClassName() { return "SysMLVerifyView"; } },
  SysMLRefine: class { getClassName() { return "SysMLRefine"; } },
  SysMLRefineView: class { getClassName() { return "SysMLRefineView"; } },
  SysMLCopy: class { getClassName() { return "SysMLCopy"; } },
  SysMLCopyView: class { getClassName() { return "SysMLCopyView"; } },
  UMLDependency: class { getClassName() { return "UMLDependency"; } },
  UMLDependencyView: class { getClassName() { return "UMLDependencyView"; } }
};

var createdModels = [];
var createdViews = [];
var pending = [];
var committedOperations = 0;
var operationBuilder = {
  begin: function(name) { pending = []; this.name = name; },
  insert: function(element) {
    pending.push({ type: "insert", element: element });
  },
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

function addOwnedElement(parent, field, element) {
  if (!parent[field]) parent[field] = [];
  if (parent[field].indexOf(element) === -1) parent[field].push(element);
}

global.app = {
  project: {
    getProject: function() { return { _parent: null, ownedElements: [], getClassName: () => "Project" }; }
  },
  factory: {
    createModel: function(options) {
      const ModelClass = global.type[options.id];
      if (!ModelClass) throw new Error("No such model: " + options.id);
      const m = new ModelClass();
      m._parent = options.parent;
      if (options.modelInitializer) options.modelInitializer(m);
      createdModels.push(m);
      addOwnedElement(options.parent, "ownedElements", m);
      return m;
    },
    createModelAndView: function(options) {
      const ModelClass = global.type[options.id];
      const ViewClass = global.type[options.id + "View"] || global.type[options.id]; // in case of UMLContainmentView

      let m = null;
      if (ModelClass && !options.id.endsWith("View")) {
        m = new ModelClass();
        m._parent = options.parent;
        if (options.modelInitializer) options.modelInitializer(m);
      }

      const v = new ViewClass();
      v.model = m;
      if (options.tailView) v.tail = options.tailView;
      if (options.headView) v.head = options.headView;

      if (options.viewInitializer) options.viewInitializer(v);

      createdViews.push(v);
      if (m) {
        createdModels.push(m);
        addOwnedElement(options.parent, "ownedElements", m);
      }
      addOwnedElement(options.diagram, "ownedViews", v);
      return v;
    }
  },
  repository: {
    getOperationBuilder: function() { return operationBuilder; },
    doOperation: function(operation) {
      operation.forEach(function(item) {
        if (item.type === "insert") {
          if (item.element.getClassName().endsWith("View")) createdViews.push(item.element);
          else createdModels.push(item.element);
        } else if (item.type === "fieldInsert") {
          addOwnedElement(item.parent, item.field, item.element);
        } else if (item.type === "fieldRemove") {
          var collection = item.parent[item.field] || [];
          var index = collection.indexOf(item.element);
          if (index !== -1) collection.splice(index, 1);
        }
      });
      committedOperations++;
    }
  },
  dialogs: {
    showAlertDialog: function(msg) { throw new Error("Dialog shown: " + msg); },
    showInfoDialog: function(msg) {}
  }
};

try {
  const samplePath = path.join(__dirname, "requirement_sample.puml");
  const code = fs.readFileSync(samplePath, "utf8");
  const diagram = new global.type.SysMLRequirementDiagram();
  diagram._parent = app.project.getProject();
  diagram.ownedViews = [];

  const result = requirementParser.generateDiagram(diagram, code);

  if (!result || !result.success) {
    throw new Error("Failed to generate diagram: " + (result ? result.errors.join(", ") : "no result"));
  }

  const reqModels = createdModels.filter(m => m.getClassName() === "SysMLRequirement");
  const elemModels = createdModels.filter(m => m.getClassName() === "UMLClass");
  const relViews = createdViews.filter(v => v.getClassName() !== "SysMLRequirementView" && v.getClassName() !== "UMLClassView");

  if (reqModels.length !== 4) throw new Error("Expected 4 SysMLRequirement models, got " + reqModels.length);
  if (elemModels.length !== 2) throw new Error("Expected 2 UMLClass models, got " + elemModels.length);
  if (relViews.length !== 8) throw new Error("Expected 8 relation views, got " + relViews.length);

  const hasContainsView = relViews.some(v => v.getClassName() === "UMLContainmentView");
  if (!hasContainsView) throw new Error("Missing UMLContainmentView relation");

  const r1 = reqModels.find(m => m.id === "1");
  const e1 = elemModels.find(m => m.name === "Auth Service");
  const containmentViews = diagram.ownedViews.filter(v => v.getClassName() === "UMLContainmentView");
  if (committedOperations !== 1) throw new Error("Expected one committed containment operation, got " + committedOperations);
  if (e1._parent !== r1) throw new Error("Expected E1 to be reparented to R1");
  if (diagram._parent.ownedElements.indexOf(e1) !== -1) throw new Error("Expected old owner to exclude E1");
  if (!r1.ownedElements || r1.ownedElements.indexOf(e1) === -1) throw new Error("Expected R1 to own E1");
  if (containmentViews.length !== 1) throw new Error("Expected diagram to own one containment view, got " + containmentViews.length);

  const hardeningFailures = [];
  const prototypeDiagram = new global.type.SysMLRequirementDiagram();
  prototypeDiagram._parent = app.project.getProject();
  prototypeDiagram.ownedViews = [];
  const relationCountBeforePrototypeImport = createdViews.filter(v =>
    v.getClassName() !== "SysMLRequirementView" && v.getClassName() !== "UMLClassView"
  ).length;
  const prototypeResult = requirementParser.generateDiagram(prototypeDiagram, [
    'requirement "Source" as R1',
    'R1 --> valueOf',
    'R1 --> constructor',
    'R1 --> __proto__'
  ].join('\n'));
  const relationCountAfterPrototypeImport = createdViews.filter(v =>
    v.getClassName() !== "SysMLRequirementView" && v.getClassName() !== "UMLClassView"
  ).length;
  if (!prototypeResult.success) hardeningFailures.push("Unresolved prototype endpoints should not fail the transaction");
  if (prototypeResult.warnings.length !== 3) hardeningFailures.push("Expected three unresolved endpoint warnings");
  if (relationCountAfterPrototypeImport !== relationCountBeforePrototypeImport) {
    hardeningFailures.push("Undeclared prototype endpoints must not create relations");
  }

  const unsupportedSource = 'note "INTERNAL-SECRET-PLANTUML"';
  const unsupportedDiagram = new global.type.SysMLRequirementDiagram();
  unsupportedDiagram._parent = app.project.getProject();
  unsupportedDiagram.ownedViews = [];
  const unsupportedResult = requirementParser.generateDiagram(unsupportedDiagram, [
    'requirement "Source" as R1',
    unsupportedSource
  ].join('\n'));
  const displayedWarning = require("../main").formatImportSuccessMessage(unsupportedResult);
  if (!unsupportedResult.success) hardeningFailures.push("Unsupported syntax warning should not fail the transaction");
  if (displayedWarning.indexOf("Line 2: Unsupported syntax") === -1) {
    hardeningFailures.push("Displayed warning must preserve unsupported syntax line and category");
  }
  if (displayedWarning.indexOf(unsupportedSource) !== -1 || displayedWarning.indexOf("INTERNAL-SECRET-PLANTUML") !== -1) {
    hardeningFailures.push("Displayed warning must redact unsupported PlantUML source");
  }

  const generationStart = createdModels.length;
  const generationDiagram = new global.type.SysMLRequirementDiagram();
  generationDiagram._parent = app.project.getProject();
  generationDiagram.ownedViews = [];
  const generationResult = requirementParser.generateDiagram(generationDiagram, [
    'requirement "Source" as Shared',
    'element "Collision" as Shared',
    'requirement "Target" as R2',
    'Shared -mystery-> R2',
    'Shared --> R2 : rendered label'
  ].join('\n'));
  const generationModels = createdModels.slice(generationStart);
  const generatedClasses = generationModels.filter(m => m.getClassName() === "UMLClass");
  const generatedRelations = generationModels.filter(m => m.getClassName() === "UMLDependency");
  if (!generationResult.success) hardeningFailures.push("Recoverable Requirement warnings should preserve a successful import");
  if (generatedClasses.length !== 0) hardeningFailures.push("Cross-kind alias collision must skip the later element model");
  if (generatedRelations.length !== 1) hardeningFailures.push("Unknown named arrow must be skipped");
  if (!generatedRelations[0] || generatedRelations[0].name !== "rendered label") {
    hardeningFailures.push("Parsed Requirement relation label must be assigned to the rendered model");
  }
  if (!generationResult.warnings.some(warning => /Shared/.test(warning))) {
    hardeningFailures.push("Cross-kind alias collision must produce a warning");
  }
  if (!generationResult.warnings.some(warning => /mystery/.test(warning))) {
    hardeningFailures.push("Unknown named arrow must produce a warning");
  }

  const labeledContainmentModelStart = createdModels.length;
  const labeledContainmentViewStart = createdViews.length;
  const labeledContainmentOperationStart = committedOperations;
  const labeledContainmentDiagram = new global.type.SysMLRequirementDiagram();
  labeledContainmentDiagram._parent = app.project.getProject();
  labeledContainmentDiagram.ownedViews = [];
  const labeledContainmentResult = requirementParser.generateDiagram(labeledContainmentDiagram, [
    'requirement "Container" as R1',
    'element "Contained" as E1',
    'R1 -contains-> E1 : ownership label'
  ].join('\n'));
  const labeledContainmentModels = createdModels.slice(labeledContainmentModelStart);
  const labeledContainmentViews = createdViews.slice(labeledContainmentViewStart);
  const labeledContainer = labeledContainmentModels.find(m => m.getClassName() === "SysMLRequirement");
  const labeledContained = labeledContainmentModels.find(m => m.getClassName() === "UMLClass");
  if (!labeledContainmentResult.success) hardeningFailures.push("Labeled containment must preserve a successful import");
  if (!labeledContainmentResult.warnings.includes(
    "Line 3: Containment relation labels are not supported by StarUML and were omitted."
  )) {
    hardeningFailures.push("Labeled containment must surface the line-specific omission warning");
  }
  if (!labeledContainmentViews.some(v => v.getClassName() === "UMLContainmentView")) {
    hardeningFailures.push("Labeled containment must still create a UMLContainmentView");
  }
  if (labeledContained._parent !== labeledContainer) {
    hardeningFailures.push("Labeled containment must still reparent the contained model");
  }
  if (committedOperations !== labeledContainmentOperationStart + 1) {
    hardeningFailures.push("Labeled containment must commit exactly one containment operation");
  }
  if (labeledContainmentModels.some(m => m.getClassName() === "UMLDependency")) {
    hardeningFailures.push("Labeled containment must not invent a relationship model");
  }
  if (hardeningFailures.length > 0) throw new Error(hardeningFailures.join("; "));

  console.log("Requirement Test Passed.");
  process.exit(0);
} catch (e) {
  console.error("Requirement Test Failed: " + e.message, e);
  process.exit(1);
}
