require('./fail_on_console_error.js');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const parser = require('../parsers/activity-parser.js');

const text = fs.readFileSync(path.join(__dirname, 'Activity.puml'), 'utf8');

const views = [];
const connections = [];

global.app = {
  project: {
    getProject: () => ({ getClassName: () => 'Project', ownedElements: [] })
  },
  factory: {
    createModel: (opts) => {
      let m = { getClassName: () => opts.id };
      if (opts.modelInitializer) opts.modelInitializer(m);
      return { model: m };
    },
    createModelAndView: (opts) => {
      let view = { id: opts.id + '_' + (views.length + connections.length) };
      let m = { id: opts.id + '_model_' + (views.length + connections.length), getClassName: () => opts.id };
      
      if (opts.viewInitializer) opts.viewInitializer(view);
      if (opts.modelInitializer) opts.modelInitializer(m);
      
      if (opts.id === 'UMLControlFlow') {
        connections.push({
          from: opts.tailView.name || opts.tailView.id,
          to: opts.headView.name || opts.headView.id,
          guard: m.guard || '',
          lineStyle: view.lineStyle
        });
      } else {
        views.push({
          id: view.id,
          type: opts.id,
          name: m.name || '',
          left: view.left,
          top: view.top,
          width: view.width,
          height: view.height
        });
      }
      return { model: m, id: view.id, name: m.name || opts.id };
    }
  }
};

const mockDiagram = {
  _parent: { getClassName: () => 'UMLActivity', ownedElements: [] }
};

try {
  const result = parser.generateDiagram(mockDiagram, text);
  
  // Assertions on result
  assert.strictEqual(result.success, true, "Import should succeed");
  assert.strictEqual(result.diagramType, "UMLActivityDiagram", "Expected UMLActivityDiagram");
  assert.deepStrictEqual(result.errors, [], "Errors should be empty");
  
  const partitions = views.filter(v => v.type === 'UMLActivityPartition');
  const nodes = views.filter(v => v.type !== 'UMLActivityPartition');
  
  assert.ok(partitions.length > 0, "Should have created activity partitions");
  assert.ok(nodes.length > 0, "Should have created action nodes");
  assert.ok(connections.length > 0, "Should have created connections");
  
  console.log("Success: run_activity_sequence_test completed successfully.");
} catch (e) {
  console.error("Test failed with exception:", e);
  process.exit(1);
}
