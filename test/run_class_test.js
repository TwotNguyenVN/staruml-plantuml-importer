require("./fail_on_console_error.js");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

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

var classParser = require("../parsers/class-parser.js");
var code = fs.readFileSync(path.join(__dirname, "classdiagram.puml"), "utf8");
var diagram = { _parent: { type: "UMLModel" } };
var result = classParser.generateDiagram(diagram, code);

assert.strictEqual(result.success, true, "Class import should succeed");
assert.deepStrictEqual(result.errors, [], "Class import should not report errors");

var classModels = models.filter(function(model) { return model.type === "UMLClass"; });
assert.ok(classModels.length >= 2, "Class import should create at least two UMLClass models");

var classViews = views.filter(function(view) { return view.model.type === "UMLClass"; });
assert.strictEqual(classViews.length, classModels.length, "Every UMLClass model should have a view");
classViews.forEach(function(view) {
  assert.ok(Number.isFinite(view.left), "Class view left coordinate should be finite");
  assert.ok(Number.isFinite(view.top), "Class view top coordinate should be finite");
});

var relationViews = views.filter(function(view) {
  return view.type !== "UMLClassView" && view.tail && view.head;
});
assert.ok(relationViews.length > 0, "Class import should create a relation with tail and head views");

console.log("Success: run_class_test completed successfully.");
