require('./fail_on_console_error.js');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const views = [];
global.app = {
  project: { getProject: () => ({ getClassName: () => 'Project', ownedElements: [] }) },
  factory: {
    createModel: (opts) => { let m = {}; if(opts.modelInitializer) opts.modelInitializer(m); return m; },
    createModelAndView: (opts) => {
      let m = { end1: {}, end2: {} };
      let view = { model: m };
      if (opts.viewInitializer) opts.viewInitializer(view);
      if (opts.modelInitializer) opts.modelInitializer(m);
      if (opts.id === 'ERDEntity') {
        views.push({ name: m.name, top: view.top, left: view.left, height: view.height });
      }
      return view;
    }
  }
};

const parser = require('../parsers/erd-parser.js');
const code = fs.readFileSync(path.join(__dirname, 'ERD2.puml'), 'utf8');
const result = parser.generateDiagram({ _parent: { getClassName: () => 'ERDDataModel', ownedElements: [] } }, code);

assert.strictEqual(result.success, true, "Import should succeed");
assert.strictEqual(result.diagramType, "ERDDiagram", "Should return ERDDiagram diagram type");
assert.deepStrictEqual(result.errors, [], "Errors should be empty");
assert.ok(result.createdCount > 0, "Created count should be greater than 0");

assert.ok(views.length > 0, "Should have created multiple entity views");
assert.ok(views.every(v => typeof v.left === 'number' && !isNaN(v.left)), "All entity views must have numeric coordinates");
console.log("Success: run_erd_test completed, Entities layout check:", views.slice(0, 5));
