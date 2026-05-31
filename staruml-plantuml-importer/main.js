/**
 * StarUML PlantUML Diagram Importer Extension (v2.1)
 * Compatible with StarUML v7+
 * Imports multiple diagram types (Use Case, Class) from PlantUML syntax
 */

const dialogHelper = require("./utils/dialog-helper");
const usecaseParser = require("./parsers/usecase-parser");
const classParser = require("./parsers/class-parser");

function init() {
  if (typeof app === "undefined" || !app.commands) {
    return;
  }
  
  app.commands.register(
    "plantuml-importer:import-usecase",
    handleImportUseCase,
    "Import Use Case Diagram from PlantUML Code"
  );
  
  app.commands.register(
    "plantuml-importer:import-classdiagram",
    handleImportClassDiagram,
    "Import Class Diagram from PlantUML Code"
  );
}

function handleImportUseCase() {
  try {
    var diagram = app.diagrams.getCurrentDiagram();
    if (!diagram) {
      app.dialogs.showAlertDialog("Please create and open a Use Case Diagram first.");
      return;
    }
    if (diagram.getClassName() !== "UMLUseCaseDiagram") {
      app.dialogs.showAlertDialog(
        "The current diagram is not a Use Case Diagram.\n" +
        "Please open or create a UMLUseCaseDiagram."
      );
      return;
    }

    var sampleCode = [
      "@startuml",
      "",
      'actor "Guest" as Guest',
      'actor "Member" as Member',
      "",
      "Member --|> Guest",
      "",
      'rectangle "System" {',
      '    usecase "Login" as UC1',
      '    usecase "Search" as UC2',
      "}",
      "",
      "Guest --> UC1",
      "Guest --> UC2",
      "",
      "@enduml"
    ].join("\n");

    dialogHelper.showImportDialog("Paste your PlantUML Use Case code below:", sampleCode)
      .then(function (code) {
        if (code !== null) {
          try {
            usecaseParser.generateDiagram(diagram, code);
            app.dialogs.showInfoDialog("Use Case diagram imported successfully!");
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
    console.error("[plantuml-importer] handleImportUseCase error:", outerErr);
  }
}

function handleImportClassDiagram() {
  try {
    var diagram = app.diagrams.getCurrentDiagram();
    if (!diagram) {
      app.dialogs.showAlertDialog("Please create and open a Class Diagram first.");
      return;
    }
    if (diagram.getClassName() !== "UMLClassDiagram") {
      app.dialogs.showAlertDialog(
        "The current diagram is not a Class Diagram.\n" +
        "Please open or create a UMLClassDiagram."
      );
      return;
    }

    var sampleCode = [
      "@startuml",
      "",
      "class User {",
      "    - id: String",
      "    - name: String",
      "    + login(): boolean",
      "}",
      "",
      "class Customer {",
      "    - email: String",
      "}",
      "",
      "User <|-- Customer",
      "",
      "@enduml"
    ].join("\n");

    dialogHelper.showImportDialog("Paste your PlantUML Class Diagram code below:", sampleCode)
      .then(function (code) {
        if (code !== null) {
          try {
            classParser.generateDiagram(diagram, code);
            app.dialogs.showInfoDialog("Class diagram imported successfully!");
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
    console.error("[plantuml-importer] handleImportClassDiagram error:", outerErr);
  }
}

exports.init = init;
