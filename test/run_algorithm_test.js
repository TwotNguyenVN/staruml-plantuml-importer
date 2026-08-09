require('./fail_on_console_error.js');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Mock StarUML app object
const views = [];

global.app = {
  project: {
    getProject: () => ({ getClassName: () => 'Project', ownedElements: [] })
  },
  factory: {
    createModel: (opts) => {
      let m = { getClassName: () => opts.id };
      if(opts.modelInitializer) opts.modelInitializer(m);
      return { model: m };
    },
    createModelAndView: (opts) => {
      let view = {};
      let m = { getClassName: () => opts.id };
      if (opts.viewInitializer) opts.viewInitializer(view);
      if (opts.modelInitializer) opts.modelInitializer(m);
      if (opts.id !== 'UMLControlFlow') {
        views.push({
          id: opts.id,
          name: m.name || '',
          left: view.left,
          top: view.top,
          width: view.width,
          height: view.height
        });
      }
      return { model: m, view: view };
    }
  }
};

const parser = require('../parsers/activity-parser.js');

const filesToTest = ['Activity2.puml', 'test.puml'];

for (const filename of filesToTest) {
  const code = fs.readFileSync(path.join(__dirname, filename), 'utf8');

  // Reset views array for each file
  views.length = 0;

  // Mock diagram object
  const diagram = {
    _parent: { getClassName: () => 'UMLActivity', ownedElements: [] }
  };

  try {
    const result = parser.generateDiagram(diagram, code);
    assert.strictEqual(result.success, true, `Import for ${filename} should succeed`);
    assert.strictEqual(result.diagramType, "UMLActivityDiagram", `Expected UMLActivityDiagram but got ${result.diagramType}`);
    assert.deepStrictEqual(result.errors, [], `Errors should be empty for ${filename}`);
    assert.ok(views.length > 0, `Should have created views for ${filename}`);
    assert.ok(views.every(v => typeof v.left === 'number' && !isNaN(v.left)), `All views in ${filename} must have valid coordinates`);
  } catch(e) {
    console.error(`Test failed for ${filename} with exception:`, e);
    process.exit(1);
  }
}

console.log("Success: run_algorithm_test completed.");
