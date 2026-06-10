/**
 * StarUML PlantUML Diagram Importer Extension (v2.1)
 * Compatible with StarUML v7+
 * Imports multiple diagram types (Use Case, Class) from PlantUML syntax
 */

const dialogHelper = require("./utils/dialog-helper");
const usecaseParser = require("./parsers/usecase-parser");
const classParser = require("./parsers/class-parser");
const sequenceParser = require("./parsers/sequence-parser");
const activityParser = require("./parsers/activity-parser");
const stateParser = require("./parsers/state-parser");
const erdParser = require("./parsers/erd-parser");

function injectCSS() {
  try {
    if (typeof document !== "undefined") {
      var style = document.createElement("style");
      style.id = "plantuml-importer-dialog-style";
      style.innerHTML = [
        ".dialog:has(textarea) {",
        "  width: 750px !important;",
        "}",
        ".dialog:has(textarea) textarea {",
        "  height: 400px !important;",
        "  font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;",
        "  font-size: 13px !important;",
        "  line-height: 1.5 !important;",
        "}",
        ".dialog.plantuml-preview-dialog {",
        "  width: 1400px !important;",
        "}",
        ".dialog.plantuml-preview-dialog textarea {",
        "  height: 100% !important;",
        "}"
      ].join("\n");
      
      var oldStyle = document.getElementById(style.id);
      if (oldStyle) {
        oldStyle.remove();
      }
      document.head.appendChild(style);
    }
  } catch (e) {
    console.error("[plantuml-importer] Failed to inject custom dialog CSS:", e);
  }
}

function init() {
  if (typeof app === "undefined" || !app.commands) {
    return;
  }
  
  injectCSS();
  
  app.commands.register(
    "plantuml-importer:import-auto",
    handleImportAuto,
    "PlantUML Importer..."
  );
}

function detectDiagramType(code) {
  // Clean markdown code blocks if any
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

function handleImportAuto() {
  try {
    var diagram = app.diagrams.getCurrentDiagram();
    if (!diagram) {
      app.dialogs.showAlertDialog("Please create and open a diagram first.");
      return;
    }

    var sampleCode = "@startuml\n\n' Paste your PlantUML code here\n\n@enduml";

    dialogHelper.showImportDialog("PlantUML Importer", sampleCode)
      .then(function (code) {
        if (code !== null) {
          try {
            var diagramClass = diagram.getClassName();
            var detectedClass = detectDiagramType(code);

            if (detectedClass && detectedClass !== diagramClass) {
              app.dialogs.showAlertDialog(
                "Warning: The code looks like a " + detectedClass.replace("UML", "").replace("Diagram", "") +
                " Diagram, but you are currently in a " + diagramClass.replace("UML", "").replace("Diagram", "") + " Diagram.\n" +
                "Please open the correct diagram type before importing."
              );
              return;
            }

            if (diagramClass === "UMLUseCaseDiagram") {
              usecaseParser.generateDiagram(diagram, code);
            } else if (diagramClass === "UMLClassDiagram") {
              classParser.generateDiagram(diagram, code);
            } else if (diagramClass === "UMLSequenceDiagram") {
              sequenceParser.generateDiagram(diagram, code);
            } else if (diagramClass === "UMLActivityDiagram") {
              activityParser.generateDiagram(diagram, code);
            } else if (diagramClass === "UMLStatechartDiagram") {
              stateParser.generateDiagram(diagram, code);
            } else if (diagramClass === "ERDDiagram") {
              erdParser.generateDiagram(diagram, code);
            } else {
              app.dialogs.showAlertDialog("Unsupported diagram type for importing PlantUML.");
              return;
            }

            app.dialogs.showInfoDialog("Diagram imported successfully!");
          } catch (e) {
            app.dialogs.showAlertDialog(
              "Error generating diagram:\n" + String(e && e.message ? e.message : e)
            );
          }
        }
      })
      .catch(function (err) {
        console.error("[plantuml-importer] Dialog error:", err);
      });
  } catch (outerErr) {
    console.error("[plantuml-importer] handleImportAuto error:", outerErr);
  }
}

exports.init = init;
