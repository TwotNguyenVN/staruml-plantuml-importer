require("./fail_on_console_error.js");

const assert = require("assert");
const classParser = require("../parsers/class-parser.js");
const activityParser = require("../parsers/activity-parser.js");
const erdParser = require("../parsers/erd-parser.js");

function installApp(parent) {
  global.app = {
    project: { getProject: function () { return parent; } },
    factory: {
      createModel: function (options) {
        var model = { getClassName: function () { return options.id; }, ownedElements: [] };
        if (options.modelInitializer) options.modelInitializer(model);
        return model;
      },
      createModelAndView: function (options) {
        var model = {
          getClassName: function () { return options.id; },
          end1: {},
          end2: {}
        };
        var view = { model: model };
        if (options.modelInitializer) options.modelInitializer(model);
        if (options.viewInitializer) options.viewInitializer(view);
        return view;
      }
    }
  };
}

var classParent = { getClassName: function () { return "UMLModel"; }, ownedElements: [] };
installApp(classParent);
var classResult = classParser.generateDiagram(
  { _parent: classParent },
  "class Present {\n}\nPresent --> Missing"
);
assert.strictEqual(classResult.success, true, "Class import should preserve valid elements");
assert.ok(classResult.createdCount > 0, "Class import should create the declared class");

var activityParent = { getClassName: function () { return "UMLActivity"; }, ownedElements: [] };
installApp(activityParent);
var activityResult = activityParser.generateDiagram(
  { _parent: activityParent },
  'rectangle "Present" as Present\nPresent -down- Missing'
);
assert.strictEqual(activityResult.success, true, "Activity import should preserve valid nodes");
assert.ok(activityResult.createdCount > 0, "Activity import should create the declared action");

var erdParent = { getClassName: function () { return "ERDDataModel"; }, ownedElements: [] };
installApp(erdParent);
var erdResult = erdParser.generateDiagram(
  { _parent: erdParent },
  "entity Present {\n* id : integer\n}\nPresent ||--o{ Missing"
);
assert.strictEqual(erdResult.success, true, "ERD import should preserve valid entities");
assert.ok(erdResult.createdCount > 0, "ERD import should create the declared entity");
assert.deepStrictEqual([
  classResult.warnings,
  activityResult.warnings,
  erdResult.warnings
], [
  ["Skipped class relation Present -> Missing: missing endpoint Missing."],
  ["Skipped activity relation Present -> Missing: missing endpoint Missing."],
  ["Skipped ERD relation Present -> Missing: missing endpoint Missing."]
]);

console.log("Missing relation warning regression tests passed.");
