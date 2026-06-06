const fs = require('fs');
const path = require('path');

// Mock StarUML app object
const views = [];

global.app = {
  project: {
    getProject: () => ({ getClassName: () => 'Project', ownedElements: [] })
  },
  factory: {
    createModel: (opts) => {
      let m = {};
      if(opts.modelInitializer) opts.modelInitializer(m);
      return { model: m };
    },
    createModelAndView: (opts) => {
      let view = {};
      let m = {};
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

const parser = require('./parsers/activity-parser.js');

const filesToTest = ['test2.puml', 'test.puml'];

for (const filename of filesToTest) {
  console.log(`\n========================================`);
  console.log(`Testing file: ${filename}`);
  console.log(`========================================`);
  const code = fs.readFileSync(path.join(__dirname, filename), 'utf8');

  // Reset views array for each file
  views.length = 0;

  // Mock diagram object
  const diagram = {
    _parent: { getClassName: () => 'UMLActivity', ownedElements: [] }
  };

  try {
    parser.generateDiagram(diagram, code);
    console.table(views);
  } catch(e) {
    console.error(`Test failed for ${filename} with exception:`, e);
  }
}

console.log("Running layout algorithm test...");
console.log("Running layout algorithm test...");
