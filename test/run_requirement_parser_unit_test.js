const fs = require("fs");
const path = require("path");
const requirementParser = require("../parsers/requirement-parser");

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(msg + ": expected " + expected + " but got " + actual);
  }
}

try {
  const samplePath = path.join(__dirname, "requirement_sample.puml");
  const code = fs.readFileSync(samplePath, "utf8");
  const ast = requirementParser.parseRequirementDiagram(code);

  assertEqual(ast.requirements.length, 4, "Requirements count");
  assertEqual(ast.elements.length, 2, "Elements count");
  assertEqual(ast.relations.length, 8, "Relations count");
  assertEqual(ast.diagnostics.length, 0, "Fixture diagnostics");

  ast.requirements.forEach((requirement, index) => {
    ["id", "name", "text", "stereotype", "kind", "row", "col"].forEach(field => {
      assertEqual(Object.prototype.hasOwnProperty.call(requirement, field), true, "Requirement " + index + " has " + field);
    });
  });

  ast.elements.forEach((element, index) => {
    ["id", "name", "type", "docRef"].forEach(field => {
      assertEqual(Object.prototype.hasOwnProperty.call(element, field), true, "Element " + index + " has " + field);
    });
  });

  // R1
  const r1 = ast.requirements.find(r => r.alias === "R1");
  assertEqual(r1.name, "User can log in", "R1 name");
  assertEqual(r1.id, "1", "R1 id");
  assertEqual(r1.risk, "low", "R1 risk");
  assertEqual(r1.verifymethod, "test", "R1 verifymethod");

  const expectedRelations = [
    ["satisfies", "R1", "E1"],
    ["satisfies", "R2", "E2"],
    ["derives", "R3", "R1"],
    ["verifies", "R4", "R1"],
    ["refines", "R2", "R1"],
    ["traces", "R4", "R3"],
    ["copies", "R1", "R2"],
    ["contains", "R1", "E1"]
  ];
  expectedRelations.forEach((expected, index) => {
    assertEqual(ast.relations[index].type, expected[0], "Relation " + index + " type");
    assertEqual(ast.relations[index].from, expected[1], "Relation " + index + " from");
    assertEqual(ast.relations[index].to, expected[2], "Relation " + index + " to");
  });

  const labeled = requirementParser.parseRequirementDiagram([
    'requirement "Source" as R1',
    'requirement "Target" as R2',
    'R1 --> R2 : audit trail'
  ].join('\n'));

  assertEqual(labeled.relations.length, 1, "Labeled relation count");
  assertEqual(labeled.relations[0].label, "audit trail", "Relation label");
  assertEqual(labeled.requirements[0].row, 1, "Requirement source row");
  assertEqual(typeof labeled.requirements[0].col, "number", "Requirement source column type");
  assertEqual(labeled.diagnostics.length, 0, "Valid input diagnostics");

  const labeledContainment = requirementParser.parseRequirementDiagram([
    'requirement "Container" as R1',
    'element "Contained" as E1',
    'R1 -contains-> E1 : ownership label'
  ].join('\n'));
  assertEqual(labeledContainment.relations.length, 1, "Labeled containment relation count");
  assertEqual(labeledContainment.relations[0].type, "contains", "Labeled containment relation type");
  assertEqual(labeledContainment.relations[0].label, "ownership label", "Containment label remains in the AST");
  assertEqual(labeledContainment.diagnostics.length, 1, "Labeled containment diagnostic count");
  assertEqual(labeledContainment.diagnostics[0].severity, "warning", "Labeled containment diagnostic severity");
  assertEqual(labeledContainment.diagnostics[0].line, 3, "Labeled containment diagnostic line");
  assertEqual(
    labeledContainment.diagnostics[0].message,
    "Containment relation labels are not supported by StarUML and were omitted.",
    "Labeled containment diagnostic message"
  );

  const malformed = requirementParser.parseRequirementDiagram([
    'requirement "First" as R1',
    'requirement "Duplicate" as R1',
    'R1 -satisfies-> Missing',
    'unsupported syntax here'
  ].join('\n'));

  assertEqual(malformed.requirements.length, 1, "Duplicate alias is not added twice");
  assertEqual(malformed.diagnostics.length, 3, "Duplicate, missing endpoint, unknown line diagnostics");

  const duplicateDiagnostic = malformed.diagnostics.find(diagnostic => diagnostic.message === "Duplicate requirement alias: R1");
  assertEqual(duplicateDiagnostic.severity, "warning", "Duplicate alias diagnostic severity");
  assertEqual(duplicateDiagnostic.line, 2, "Duplicate alias diagnostic line");

  const unresolvedDiagnostic = malformed.diagnostics.find(diagnostic => diagnostic.message === "Unresolved relationship endpoint: Missing");
  assertEqual(unresolvedDiagnostic.severity, "warning", "Unresolved endpoint diagnostic severity");
  assertEqual(unresolvedDiagnostic.line, 3, "Unresolved endpoint diagnostic line");

  const unknownDiagnostic = malformed.diagnostics.find(diagnostic => diagnostic.message === "Unsupported syntax: unsupported syntax here");
  assertEqual(unknownDiagnostic.severity, "warning", "Unknown syntax diagnostic severity");
  assertEqual(unknownDiagnostic.line, 4, "Unknown syntax diagnostic line");

  const prototypeAliases = requirementParser.parseRequirementDiagram([
    'requirement "Stringifier" as toString',
    'requirement "Constructor" as constructor',
    'toString --> constructor'
  ].join('\n'));

  assertEqual(prototypeAliases.requirements.length, 2, "Prototype-name aliases are retained");
  assertEqual(prototypeAliases.relations.length, 1, "Prototype-name alias relation count");
  assertEqual(prototypeAliases.diagnostics.length, 0, "Prototype-name aliases resolve without diagnostics");

  const unresolvedPrototype = requirementParser.parseRequirementDiagram([
    'requirement "Source" as R1',
    'R1 --> valueOf'
  ].join('\n'));
  assertEqual(unresolvedPrototype.diagnostics.length, 1, "Undeclared prototype-name endpoint diagnostic count");
  assertEqual(unresolvedPrototype.diagnostics[0].severity, "warning", "Undeclared prototype-name endpoint severity");
  assertEqual(unresolvedPrototype.diagnostics[0].line, 2, "Undeclared prototype-name endpoint line");
  assertEqual(unresolvedPrototype.diagnostics[0].message, "Unresolved relationship endpoint: valueOf", "Undeclared prototype-name endpoint message");

  const crossKindCollision = requirementParser.parseRequirementDiagram([
    'requirement "Requirement" as Shared',
    'element "Later element" as Shared',
    'requirement "Target" as R2',
    'Shared --> R2'
  ].join('\n'));
  assertEqual(crossKindCollision.requirements.length, 2, "Requirements retain the first shared alias");
  assertEqual(crossKindCollision.elements.length, 0, "Later cross-kind alias declaration is skipped");
  assertEqual(crossKindCollision.relations.length, 1, "Shared alias still resolves to the first declaration");
  const crossKindDiagnostic = crossKindCollision.diagnostics.find(diagnostic => /Shared/.test(diagnostic.message));
  assertEqual(crossKindDiagnostic.severity, "warning", "Cross-kind collision severity");
  assertEqual(crossKindDiagnostic.line, 2, "Cross-kind collision line");

  const unknownArrow = requirementParser.parseRequirementDiagram([
    'requirement "Source" as R1',
    'requirement "Target" as R2',
    'R1 -mystery-> R2',
    'R1 --> R2'
  ].join('\n'));
  assertEqual(unknownArrow.relations.length, 1, "Unknown named arrow is skipped while empty arrow defaults to trace");
  assertEqual(unknownArrow.relations[0].type, "traces", "Empty arrow type defaults to trace");
  const arrowDiagnostic = unknownArrow.diagnostics.find(diagnostic => /mystery/.test(diagnostic.message));
  assertEqual(arrowDiagnostic.severity, "warning", "Unknown named arrow severity");
  assertEqual(arrowDiagnostic.line, 3, "Unknown named arrow line");

  // Negative tests
  const emptyAst = requirementParser.parseRequirementDiagram("@startuml\n@enduml");
  assertEqual(emptyAst.requirements.length, 0, "Empty ast req count");

  console.log("Requirement Parser Unit Test Passed.");
  process.exit(0);
} catch (e) {
  console.error("Requirement Parser Unit Test Failed: " + e.message, e);
  process.exit(1);
}
