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

  // R1
  const r1 = ast.requirements.find(r => r.alias === "R1");
  assertEqual(r1.name, "User can log in", "R1 name");
  assertEqual(r1.id, "1", "R1 id");
  assertEqual(r1.risk, "low", "R1 risk");
  assertEqual(r1.verifymethod, "test", "R1 verifymethod");
  
  // Relations: R1 -satisfies-> E1, R2 -satisfies-> E2, R3 -derives-> R1, R4 -verifies-> R1, R2 -refines-> R1, R4 -traces-> R3, R1 -copies-> R2, R1 -contains-> E1
  const containsRel = ast.relations.find(r => r.type === "contains");
  assertEqual(containsRel.from, "R1", "contains from");
  assertEqual(containsRel.to, "E1", "contains to");

  const tracesRel = ast.relations.find(r => r.type === "traces");
  assertEqual(tracesRel.from, "R4", "traces from");
  assertEqual(tracesRel.to, "R3", "traces to");

  // Negative tests
  const emptyAst = requirementParser.parseRequirementDiagram("@startuml\n@enduml");
  assertEqual(emptyAst.requirements.length, 0, "Empty ast req count");
  
  console.log("Requirement Parser Unit Test Passed.");
  process.exit(0);
} catch (e) {
  console.error("Requirement Parser Unit Test Failed: " + e.message, e);
  process.exit(1);
}
