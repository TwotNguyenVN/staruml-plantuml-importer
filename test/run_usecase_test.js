const fs = require("fs");
const path = require("path");

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
  console.log("\n========================================");
  console.log("Testing file:", filename);
  console.log("========================================");
  var code = fs.readFileSync(path.join(__dirname, filename), "utf8");
  created = [];

  var diagram = { _parent: { getClassName: () => "UMLUseCaseDiagram", ownedElements: [] } };

  try {
    usecaseParser.generateDiagram(diagram, code);
  } catch (e) {
    console.error("FAILED with exception:", e);
    return;
  }

  console.log("Views created:", created.length);

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
        console.log("  OVERLAP:", a.id, JSON.stringify(a.name), "<->", b.id, JSON.stringify(b.name));
      }
    }
  }
  console.log("Sibling overlaps (UseCase/Actor only):", overlaps);

  // NaN / undefined coordinate check
  var badCoords = created.filter(function (c) {
    return c.id !== "UMLInclude" && c.id !== "UMLExtend" && c.id !== "UMLAssociation" &&
      c.id !== "UMLGeneralization" && c.id !== "UMLDependency" && c.id !== "UMLNoteLink" &&
      (typeof c.left !== "number" || isNaN(c.left) || typeof c.top !== "number" || isNaN(c.top));
  });
  if (badCoords.length > 0) {
    console.log("BAD COORDS on non-relation elements:", badCoords);
  } else {
    console.log("No NaN/undefined coordinates on vertex-like elements.");
  }
});
