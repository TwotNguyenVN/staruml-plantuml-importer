const parser = require('./parsers/erd-parser.js');
const fs = require('fs');
const code = fs.readFileSync('./test/ERD.puml', 'utf8');

const dummyDiagram = {
  _parent: {
    getClassName: () => "ERDDataModel",
    ownedElements: []
  }
};

global.app = {
  project: { getProject: () => dummyDiagram._parent },
  factory: {
    createModel: (opts) => { console.log('createModel', opts.id); return { getClassName: () => opts.id }; },
    createModelAndView: (opts) => { console.log('createModelAndView', opts.id); return { model: {} }; }
  }
};

try {
  parser.generateDiagram(dummyDiagram, code);
  console.log("Success");
} catch (e) {
  console.error(e);
}
