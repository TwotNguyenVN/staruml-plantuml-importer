require('./fail_on_console_error.js');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { detectDiagramType } = require('../main.js');

const expectations = {
  'Activity.puml': 'UMLActivityDiagram',
  'Activity2.puml': 'UMLActivityDiagram',
  'Activity3.puml': 'UMLActivityDiagram',
  'Activity4.puml': 'UMLActivityDiagram',
  'ERD.puml': 'ERDDiagram',
  'ERD2.puml': 'ERDDiagram',
  'Statechart_Diagram.puml': 'UMLStatechartDiagram',
  'classdiagram.puml': 'UMLClassDiagram',
  'mindmap.puml': 'MMDiagram',
  'sequence-diagram.puml': 'UMLSequenceDiagram',
  'sequence-diagram2.puml': 'UMLSequenceDiagram',
  'sequence-diagram3.puml': 'UMLSequenceDiagram',
  'sequence-diagram4.puml': 'UMLSequenceDiagram',
  'test.puml': 'UMLSequenceDiagram',
  'testactiBFD.puml': 'UMLActivityDiagram',
  'usecaseC0.puml': 'UMLUseCaseDiagram',
  'usecaseC1.puml': 'UMLUseCaseDiagram',
  'usecaseC123.2.puml': 'UMLUseCaseDiagram',
  'usecaseC123.puml': null,
  'usecaseC2.puml': 'UMLUseCaseDiagram'
};

Object.keys(expectations).forEach((file) => {
  const code = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const detected = detectDiagramType(code);
  assert.strictEqual(detected, expectations[file], `Expected ${file} to be detected as ${expectations[file]} but got ${detected}`);
});

console.log("Success: detect-test completed successfully.");
