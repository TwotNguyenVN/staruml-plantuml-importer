function detectDiagramType(code) {
  code = code.replace(/```[a-z]*\n/g, "").replace(/```/g, "");

  if (/^\s*usecase\s+/im.test(code) || /^\s*\(/im.test(code)) return "UMLUseCaseDiagram";
  if (/^\s*entity\s+/im.test(code) || /\|\|--o\{/.test(code)) return "ERDDiagram";
  if (/^\s*(class|interface|abstract class|enum)\s+/im.test(code)) return "UMLClassDiagram";
  if (/^\s*(start|stop|if\s*\(|:\w+;)/im.test(code)) return "UMLActivityDiagram";
  if (/^\s*(state|\[\*\])/im.test(code)) return "UMLStatechartDiagram";
  if (/^\s*(participant|boundary|control|database|collections)\s+/im.test(code)) return "UMLSequenceDiagram";
  
  if (/^\s*actor\s+/im.test(code)) {
    if (/\.\.>/m.test(code) || /--/m.test(code)) return "UMLUseCaseDiagram";
    return "UMLSequenceDiagram";
  }
  
  if (/->/.test(code)) return "UMLSequenceDiagram";

  return null;
}

const fs = require('fs');
for (const file of fs.readdirSync('./test')) {
  if (file.endsWith('.puml')) {
    const code = fs.readFileSync('./test/' + file, 'utf8');
    console.log(file, '=>', detectDiagramType(code));
  }
}
