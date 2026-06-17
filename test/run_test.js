const fs = require('fs');
const main = require('./main.js');
// Let's just copy the exact new logic to see
function detectDiagramType(code) {
  code = code.replace(/```[a-z]*\n/g, "").replace(/```/g, "");

  var hasSequenceKeywords = /^\s*(participant|boundary|control|database|collections|autonumber|activate|deactivate|alt|opt|loop|par|break|critical)\b/im.test(code);
  var hasSequenceArrows = /->/im.test(code);
  var hasERDRelations = /\|\|--o\{|}--\|\{|\|o--|--o\{|}--\||\|\|--\|\|/im.test(code);

  if (hasSequenceKeywords) return "UMLSequenceDiagram";
  if (/^\s*usecase\s+/im.test(code) || /^\s*\(/im.test(code)) return "UMLUseCaseDiagram";
  if (/^\s*(class|interface|abstract class|enum)\s+/im.test(code)) return "UMLClassDiagram";
  if (/^\s*(start\b|stop\b|if\s*\(|:\w+;)/im.test(code)) return "UMLActivityDiagram";
  if (/^\s*(state\b|\[\*\])/im.test(code)) return "UMLStatechartDiagram";
  if (/^\s*actor\s+/im.test(code)) {
    if (/\.\.>[^>]/m.test(code) || /--[^>]/m.test(code)) return "UMLUseCaseDiagram";
    return "UMLSequenceDiagram";
  }
  
  if (hasERDRelations || (/^\s*entity\s+/im.test(code) && !hasSequenceArrows)) return "ERDDiagram";
  
  if (hasSequenceArrows) return "UMLSequenceDiagram";

  return null;
}
const code = fs.readFileSync("./test/ERD2.puml", "utf8");
console.log("Detected type:", detectDiagramType(code));
