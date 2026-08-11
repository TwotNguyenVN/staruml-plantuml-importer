require("./fail_on_console_error.js");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

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

var mindmapParser = require("../parsers/mindmap-parser.js");
var code = fs.readFileSync(path.join(__dirname, "mindmap.puml"), "utf8");
var diagram = { _parent: { type: "UMLModel" } };
var result = mindmapParser.generateDiagram(diagram, code);

assert.strictEqual(result.success, true, "Mindmap import should succeed");
assert.deepStrictEqual(result.errors, [], "Mindmap import should not report errors");

var topicViews = views.filter(function(view) { return view.type === "MindmapTopicView"; });
var edgeViews = views.filter(function(view) { return view.type === "MindmapEdgeView"; });
assert.ok(topicViews.length > 2, "Mindmap import should create multiple child topics");
topicViews.forEach(function(view) {
  assert.ok(Number.isFinite(view.left), "Topic view left coordinate should be finite");
  assert.ok(Number.isFinite(view.top), "Topic view top coordinate should be finite");
});

var roots = topicViews.filter(function(topic) {
  return !edgeViews.some(function(edge) { return edge.head === topic; });
});
assert.strictEqual(roots.length, 1, "Mindmap should have exactly one topic with no incoming edge");
assert.strictEqual(edgeViews.length, topicViews.length - 1, "Every non-root topic should have one edge");
edgeViews.forEach(function(edge) {
  assert.ok(edge.tail, "Mindmap edge should have a tail topic");
  assert.ok(edge.head, "Mindmap edge should have a head topic");
});

console.log("Success: run_mindmap_test completed successfully.");
