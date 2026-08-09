require('./fail_on_console_error.js');
const fs = require("fs");
const path = require("path");
const assert = require("assert");

var created = [];

global.app = {
  project: {
    getProject: () => ({ getClassName: () => "Project", ownedElements: [] })
  },
  factory: {
    createModelAndView: (options) => {
      var view = { model: { getClassName: () => options.id.replace("View", ""), regions: [] } };
      if (options.modelInitializer) options.modelInitializer(view.model);
      if (options.viewInitializer) options.viewInitializer(view);
      created.push({
        id: options.id,
        name: view.model.name || "",
        left: view.left, top: view.top, width: view.width, height: view.height
      });
      return view;
    }
  }
};

var usecaseParser = require("../parsers/usecase-parser");

var files = ["usecaseC0.puml", "usecaseC1.puml", "usecaseC2.puml", "usecaseC123.2.puml"];

files.forEach(function (filename) {
  var code = fs.readFileSync(path.join(__dirname, filename), "utf8");
  created = [];

  var diagram = { _parent: { getClassName: () => "UMLUseCaseDiagram", ownedElements: [] } };

  const result = usecaseParser.generateDiagram(diagram, code);
  assert.strictEqual(result.success, true, "Import should succeed for " + filename);
  assert.strictEqual(result.diagramType, "UMLUseCaseDiagram", "Should return UMLUseCaseDiagram");
  assert.deepStrictEqual(result.errors, [], "Errors should be empty for " + filename);
  assert.ok(result.createdCount > 0, "Created count should be greater than 0");

  // Overlap check restricted to UMLUseCase and UMLActor siblings (ignore subject/note/relation boxes)
  var boxes = created.filter(function (c) {
    return (c.id === "UMLUseCase" || c.id === "UMLActor") && typeof c.left === "number" && typeof c.top === "number";
  });
  var overlaps = 0;
  for (var i = 0; i < boxes.length; i++) {
    for (var j = i + 1; j < boxes.length; j++) {
      var a = boxes[i], b = boxes[j];
      var ax2 = a.left + (a.width || 0), ay2 = a.top + (a.height || 0);
      var bx2 = b.left + (b.width || 0), by2 = b.top + (b.height || 0);
      var overlapX = a.left < bx2 && b.left < ax2;
      var overlapY = a.top < by2 && b.top < ay2;
      if (overlapX && overlapY) {
        overlaps++;
      }
    }
  }

  // NaN / undefined coordinate check
  var badCoords = created.filter(function (c) {
    return c.id !== "UMLInclude" && c.id !== "UMLExtend" && c.id !== "UMLAssociation" &&
      c.id !== "UMLGeneralization" && c.id !== "UMLDependency" && c.id !== "UMLNoteLink" &&
      (typeof c.left !== "number" || isNaN(c.left) || typeof c.top !== "number" || isNaN(c.top));
  });
  if (badCoords.length > 0) {
    assert.fail("Found NaN or undefined coordinates on non-relation elements");
  }
});

console.log("Success: run_usecase_test completed successfully.");
