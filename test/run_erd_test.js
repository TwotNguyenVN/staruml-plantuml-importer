const fs = require('fs');
const views = [];
global.app = {
  project: { getProject: () => ({ getClassName: () => 'Project', ownedElements: [] }) },
  factory: {
    createModel: (opts) => { let m = {}; if(opts.modelInitializer) opts.modelInitializer(m); return m; },
    createModelAndView: (opts) => {
      let view = {}; let m = {};
      if (opts.viewInitializer) opts.viewInitializer(view);
      if (opts.modelInitializer) opts.modelInitializer(m);
      if (opts.id === 'ERDEntity') {
        views.push({ name: m.name, top: view.top, left: view.left, height: view.height });
      }
      return { model: m, view: view };
    }
  }
};
const parser = require('./parsers/erd-parser.js');
const code = fs.readFileSync('./test/ERD2.puml', 'utf8');
parser.generateDiagram({ _parent: { getClassName: () => 'ERDDataModel', ownedElements: [] } }, code);
console.log("Entities layout check:", views.slice(0, 5));
