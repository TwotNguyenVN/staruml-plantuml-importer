const fs = require('fs');
const path = require('path');
const parser = require('../parsers/activity-parser.js');

const text = fs.readFileSync(path.join(__dirname, 'sequence.puml'), 'utf8');

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

let outputText = "";
function log(msg) {
  outputText += msg + "\n";
}

try {
  parser.generateDiagram(mockDiagram, text);
  
  log("=== PARTITIONS ===");
  views.filter(v => v.type === 'UMLActivityPartition').forEach(v => {
    log(`Partition: ${v.name} (Left: ${v.left}, Width: ${v.width})`);
  });
  
  log("\n=== NODES ===");
  views.filter(v => v.type !== 'UMLActivityPartition').forEach(v => {
    log(`Node: ${v.name} [${v.type}] (Left: ${v.left}, Top: ${v.top}, Width: ${v.width})`);
  });
  
  log("\n=== CONNECTIONS ===");
  connections.forEach(c => {
    log(`Connection: ${c.from} -> ${c.to} [Guard: ${c.guard}] [LineStyle: ${c.lineStyle === 1 ? 'Rectilinear' : 'Oblique'}]`);
  });
  
  fs.writeFileSync(path.join(__dirname, 'test_output.txt'), outputText, 'utf8');
  console.log("Output written to test/test_output.txt successfully.");
} catch (e) {
  console.error("Test failed with exception:", e);
}
