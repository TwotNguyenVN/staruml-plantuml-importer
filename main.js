/**
 * PlantUML Importer Extension for StarUML v7+
 * Compatible with StarUML v7+
 * Imports eight supported PlantUML diagram types; State Diagram remains unstable.
 */

const dialogHelper = require("./utils/dialog-helper");
const inputGuard = require("./utils/input-guard");
const usecaseParser = require("./parsers/usecase-parser");
const classParser = require("./parsers/class-parser");
const sequenceParser = require("./parsers/sequence-parser");
const activityParser = require("./parsers/activity-parser");
const stateParser = require("./parsers/state-parser");
const erdParser = require("./parsers/erd-parser");
const mindmapParser = require("./parsers/mindmap-parser");
const requirementParser = require("./parsers/requirement-parser");

function init() {
  if (typeof app === "undefined" || !app.commands) {
    return;
  }

  app.commands.register(
    "plantuml-importer:import-auto",
    handleImportAuto,
    "PlantUML Importer..."
  );

  if (app.preferences && typeof app.preferences.register === "function") {
    try {
      var preferences = {
        id: "plantuml-importer",
        name: "PlantUML Importer",
        schema: {
          "plantuml-importer.server": {
            text: "PlantUML Server URL",
            description: "Preview destination. When enabled, the complete reversibly encoded PlantUML source is sent in a GET URL. (Default: https://www.plantuml.com/plantuml)",
            type: "string",
            default: "https://www.plantuml.com/plantuml"
          },
          "plantuml-importer.preview": {
            text: "Enable Preview",
            description: "Opt in only after reviewing the destination: the complete reversibly encoded PlantUML source is sent in a GET URL.",
            type: "check",
            default: false
          }
        }
      };
      app.preferences.register(preferences);
    } catch (_) {
      console.error("[plantuml-importer] Failed to register preferences.");
    }
  }
}

function detectDiagramType(code) {
  // Clean markdown code blocks if any
  code = code.replace(/```[a-z]*\n/g, "").replace(/```/g, "");

  var hasSequenceKeywords = /^\s*(participant|boundary|control|database|collections|autonumber|activate|deactivate|alt|opt|loop|par|break|critical)\b/im.test(code);
  var hasSequenceArrows = /->/im.test(code);
  var hasERDRelations = /\|\|--o\{|}--\|\{|\|o--|--o\{|}--\||\|\|--\|\|/im.test(code);

  if (hasSequenceKeywords) return "UMLSequenceDiagram";
  if (/^\s*usecase\s+/im.test(code) || /^\s*\(/im.test(code)) return "UMLUseCaseDiagram";
  if (/^\s*(class|interface|abstract class|enum)\s+/im.test(code)) return "UMLClassDiagram";
  if (/^\s*(start\b|stop\b|if\s*\(|:\w+;)/im.test(code)) return "UMLActivityDiagram";
  if (/^\s*rectangle\s+/im.test(code) && /-(?:\[hidden\])?(?:up|down|left|right)?-/im.test(code)) return "UMLActivityDiagram";
  if (/^\s*(state\b|\[\*\])/im.test(code)) return "UMLStatechartDiagram";
  if (/^\s*actor\s+/im.test(code)) {
    if (/\.\.>[^>]/m.test(code) || /--[^>]/m.test(code)) return "UMLUseCaseDiagram";
    return "UMLSequenceDiagram";
  }

  if (hasERDRelations || (/^\s*entity\s+/im.test(code) && !hasSequenceArrows)) return "ERDDiagram";
  if (/^\s*(@startmindmap|[*+-]{1,}\s+)/im.test(code)) return "MMDiagram"; // Assuming MMDiagram or generic

  if (/^\s*requirement\s+/im.test(code) || /^\s*element\s+/im.test(code) || /-(satisfies|derives|verifies|refines|copies|traces|contains)->/im.test(code)) return "SysMLRequirementDiagram";

  if (hasSequenceArrows) return "UMLSequenceDiagram";

  return null;
}

var isDialogOpen = false;
var lastToggleTime = 0;

function formatImportSuccessMessage(result) {
  var msg = "Diagram imported successfully!";
  if (result.createdCount !== undefined) {
    msg += " (Created " + result.createdCount + " elements)";
  }
  if (result.warnings && result.warnings.length > 0) {
    var shownWarnings = result.warnings.slice(0, 10);
    msg += "\nWarnings:\n" + shownWarnings.join("\n");
    if (result.warnings.length > shownWarnings.length) {
      msg += "\n... and " + (result.warnings.length - shownWarnings.length) + " more warning(s).";
    }
  }
  return msg;
}

function formatImportFailureMessage(result) {
  var message = "Import failed.";
  if (result && result.rollbackAttempted) {
    if (result.rollbackSucceeded) {
      message += "\nRollback succeeded. Residual elements: " + (result.createdCount || 0) + ".";
    } else {
      var residualCount = typeof result.createdCount === "number" ? result.createdCount : "unknown";
      message += "\nRollback failed or may be incomplete. Residual elements: " + residualCount + ".";
    }
  }
  return message;
}

function handleImportAuto() {
  try {
    var now = Date.now();
    var diff = now - lastToggleTime;
    lastToggleTime = now; // Always update to catch continuous key holding

    if (diff < 600) {
      return; // Prevent spamming/holding key
    }

    if (isDialogOpen) {
      if (dialogHelper.closeImportDialog) {
        dialogHelper.closeImportDialog();
      }
      isDialogOpen = false;
      return;
    }

    var diagram = app.diagrams.getCurrentDiagram();
    if (!diagram) {
      app.dialogs.showAlertDialog("Please create and open a diagram first.");
      return;
    }

    var sampleCode = "@startuml\n\n' Paste your PlantUML code here\n\n@enduml";

    isDialogOpen = true;
    dialogHelper.showImportDialog("PlantUML Importer", sampleCode)
      .then(function (code) {
        if (code !== null) {
          try {
            var validation = inputGuard.validateInput(code);
            if (!validation.valid) {
              app.dialogs.showAlertDialog(
                "PlantUML input is too large or complex:\n" + validation.errors.slice(0, 5).join("\n")
              );
              return;
            }

            var diagramClass = diagram.getClassName();
            var detectedClass = detectDiagramType(code);

            if (detectedClass && detectedClass !== diagramClass) {
              app.dialogs.showAlertDialog(
                "Warning: The code looks like a " + detectedClass.replace("UML", "").replace("Diagram", "").replace("SysMLRequirement", "Requirement") +
                " Diagram, but you are currently in a " + diagramClass.replace("UML", "").replace("Diagram", "").replace("SysMLRequirement", "Requirement") + " Diagram.\n" +
                "Please open the correct diagram type before importing."
              );
              return;
            }

            var result = null;
            if (diagramClass === "UMLUseCaseDiagram") {
              result = usecaseParser.generateDiagram(diagram, code);
            } else if (diagramClass === "UMLClassDiagram") {
              result = classParser.generateDiagram(diagram, code);
            } else if (diagramClass === "UMLSequenceDiagram") {
              result = sequenceParser.generateDiagram(diagram, code);
            } else if (diagramClass === "UMLActivityDiagram") {
              result = activityParser.generateDiagram(diagram, code);
            } else if (diagramClass === "UMLStatechartDiagram") {
              result = stateParser.generateDiagram(diagram, code);
            } else if (diagramClass === "ERDDiagram") {
              result = erdParser.generateDiagram(diagram, code);
            } else if (diagramClass.indexOf("MMDiagram") !== -1 || diagramClass.indexOf("Mindmap") !== -1) {
              result = mindmapParser.generateDiagram(diagram, code);
            } else if (diagramClass === "SysMLRequirementDiagram") {
              result = requirementParser.generateDiagram(diagram, code);
            } else {
              app.dialogs.showAlertDialog("Unsupported diagram type for importing PlantUML.");
              return;
            }

            if (result && result.success) {
              app.dialogs.showInfoDialog(formatImportSuccessMessage(result));
            } else {
              app.dialogs.showAlertDialog(formatImportFailureMessage(result));
            }
          } catch (e) {
            app.dialogs.showAlertDialog(
              "Error generating diagram. Rollback status unavailable; partial changes may remain. Residual elements: unknown."
            );
          }
        }
      })
      .catch(function () {
        console.error("[plantuml-importer] Import dialog failed to open.");
        app.dialogs.showAlertDialog("Failed to open Import dialog.");
      })
      .finally(function () {
        isDialogOpen = false;
        lastToggleTime = Date.now();
      });
  } catch (_) {
    console.error("[plantuml-importer] Import command failed unexpectedly.");
    if (typeof app !== "undefined" && app.dialogs) {
      app.dialogs.showAlertDialog(
        "Import failed unexpectedly. Rollback status unavailable; partial changes may remain. Residual elements: unknown."
      );
    }
  }
}

exports.init = init;
exports.detectDiagramType = detectDiagramType;
exports.handleImportAuto = handleImportAuto;
exports.formatImportSuccessMessage = formatImportSuccessMessage;
exports.formatImportFailureMessage = formatImportFailureMessage;
