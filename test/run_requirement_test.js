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
var operationBuilder = {
  begin: function() {},
  insert: function(e) {
    if (e.getClassName().endsWith("View")) createdViews.push(e);
    else createdModels.push(e);
  },
  fieldInsert: function() {},
  fieldRemove: function() {},
  end: function() {},
  discard: function() {},
  getOperation: function() { return {}; }
};

global.app = {
  project: {
    getProject: function() { return { _parent: null, getClassName: () => "Project" }; }
  },
  factory: {
    createModel: function(options) {
      const ModelClass = global.type[options.id];
      if (!ModelClass) throw new Error("No such model: " + options.id);
      const m = new ModelClass();
      m._parent = options.parent;
      if (options.modelInitializer) options.modelInitializer(m);
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
      
      operationBuilder.insert(v);
      if (m) operationBuilder.insert(m);
      return v;
    }
  },
  repository: {
    getOperationBuilder: function() { return operationBuilder; },
    doOperation: function() {}
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

  console.log("Requirement Test Passed.");
  process.exit(0);
} catch (e) {
  console.error("Requirement Test Failed: " + e.message, e);
  process.exit(1);
}
