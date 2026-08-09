require('./fail_on_console_error.js');
const path = require('path');
const assert = require('assert');
const parser = require('../parsers/erd-parser.js');
const fs = require('fs');
const code = fs.readFileSync(path.join(__dirname, 'ERD.puml'), 'utf8');

const dummyDiagram = {
  _parent: {
    getClassName: () => "ERDDataModel",
    ownedElements: []
  }
};

let createdCount = 0;
global.app = {
  project: { getProject: () => dummyDiagram._parent },
  factory: {
    createModel: (opts) => {
      createdCount++;
      return { getClassName: () => opts.id };
    },
    createModelAndView: (opts) => {
      createdCount++;
      return {
        model: {
          getClassName: () => opts.id,
          end1: {},
          end2: {}
        }
      };
    }
  }
};

try {
  const result = parser.generateDiagram(dummyDiagram, code);
  assert.strictEqual(result.success, true, "Import should succeed");
  assert.strictEqual(result.diagramType, "ERDDiagram", "Should return ERDDiagram diagram type");
  assert.deepStrictEqual(result.errors, [], "Errors should be empty");
  assert.ok(result.createdCount > 0, "Created count should be greater than 0");
  console.log("Success: run_erd_unit_test completed, created elements:", result.createdCount);
} catch (e) {
  console.error("Test failed:", e);
  process.exit(1);
}
