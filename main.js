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
        ".plantuml-preview-dialog {",
        "  width: 1050px !important;",
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
    "plantuml-importer:import-usecase",
    handleImportUseCase,
    "Import Use Case Diagram from PlantUML Code"
  );
  
  app.commands.register(
    "plantuml-importer:import-classdiagram",
    handleImportClassDiagram,
    "Import Class Diagram from PlantUML Code"
  );
  
  app.commands.register(
    "plantuml-importer:import-sequencediagram",
    handleImportSequenceDiagram,
    "Import Sequence Diagram from PlantUML Code"
  );
  
  app.commands.register(
    "plantuml-importer:import-activitydiagram",
    handleImportActivityDiagram,
    "Import Activity Diagram from PlantUML Code"
  );
  
  app.commands.register(
    "plantuml-importer:import-statechart",
    handleImportStatechartDiagram,
    "Import State Diagram from PlantUML Code"
  );
  
  app.commands.register(
    "plantuml-importer:import-erd",
    handleImportERD,
    "Import ER Diagram from PlantUML Code"
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

function handleImportSequenceDiagram() {
  try {
    var diagram = app.diagrams.getCurrentDiagram();
    if (!diagram) {
      app.dialogs.showAlertDialog("Please create and open a Sequence Diagram first.");
      return;
    }
    if (diagram.getClassName() !== "UMLSequenceDiagram") {
      app.dialogs.showAlertDialog(
        "The current diagram is not a Sequence Diagram.\n" +
        "Please open or create a UMLSequenceDiagram."
      );
      return;
    }

    var sampleCode = [
      "@startuml",
      "",
      "actor User as U",
      'participant "Auth Service" as Auth',
      "database DB as DB",
      "",
      "U -> Auth : Login Request",
      "Auth -> DB : Query User",
      "DB --> Auth : User Data",
      "Auth --> U : Token / Response",
      "",
      "@enduml"
    ].join("\n");

    dialogHelper.showImportDialog("Paste your PlantUML Sequence code below:", sampleCode)
      .then(function (code) {
        if (code !== null) {
          try {
            sequenceParser.generateDiagram(diagram, code);
            app.dialogs.showInfoDialog("Sequence diagram imported successfully!");
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
    console.error("[plantuml-importer] handleImportSequenceDiagram error:", outerErr);
  }
}

function handleImportActivityDiagram() {
  try {
    var diagram = app.diagrams.getCurrentDiagram();
    if (!diagram) {
      app.dialogs.showAlertDialog("Please create and open an Activity Diagram first.");
      return;
    }
    if (diagram.getClassName() !== "UMLActivityDiagram") {
      app.dialogs.showAlertDialog(
        "The current diagram is not an Activity Diagram.\n" +
        "Please open or create a UMLActivityDiagram."
      );
      return;
    }

    var sampleCode = [
      "@startuml",
      "|Độc giả|",
      "start",
      ":Yêu cầu mượn sách;",
      "|Thủ thư|",
      ":Chọn sách;",
      "|Hệ thống|",
      "if (Sách còn không?) then (Có)",
      "  :Lập phiếu mượn;",
      "else (Không)",
      "  :Thông báo hết sách;",
      "endif",
      "stop",
      "@enduml"
    ].join("\n");

    dialogHelper.showImportDialog("Paste your PlantUML Activity code below:", sampleCode)
      .then(function (code) {
        if (code !== null) {
          try {
            activityParser.generateDiagram(diagram, code);
            app.dialogs.showInfoDialog("Activity diagram imported successfully!");
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
    console.error("[plantuml-importer] handleImportActivityDiagram error:", outerErr);
  }
}

function handleImportStatechartDiagram() {
  try {
    var diagram = app.diagrams.getCurrentDiagram();
    if (!diagram) {
      app.dialogs.showAlertDialog("Please create and open a State Diagram first.");
      return;
    }
    if (diagram.getClassName() !== "UMLStatechartDiagram") {
      app.dialogs.showAlertDialog(
        "The current diagram is not a State Diagram.\n" +
        "Please open or create a UMLStatechartDiagram."
      );
      return;
    }

    var sampleCode = [
      "@startuml",
      "[*] --> Active",
      "state Active {",
      "  [*] --> Idle",
      "  Idle --> Processing : startEvent",
      "  Processing --> Idle : finishEvent",
      "}",
      "Active --> [*] : shutdown",
      "@enduml"
    ].join("\n");

    dialogHelper.showImportDialog("Paste your PlantUML State code below:", sampleCode)
      .then(function (code) {
        if (code !== null) {
          try {
            stateParser.generateDiagram(diagram, code);
            app.dialogs.showInfoDialog("State diagram imported successfully!");
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
    console.error("[plantuml-importer] handleImportStatechartDiagram error:", outerErr);
  }
}

function handleImportERD() {
  try {
    var diagram = app.diagrams.getCurrentDiagram();
    if (!diagram) {
      app.dialogs.showAlertDialog("Please create and open an ER Diagram first.");
      return;
    }
    if (diagram.getClassName() !== "ERDDiagram") {
      app.dialogs.showAlertDialog(
        "The current diagram is not an ER Diagram.\n" +
        "Please open or create a ERDDiagram."
      );
      return;
    }

    var sampleCode = [
      "@startuml",
      "entity \"User\" as user {",
      "  * user_id : number <<generated>>",
      "  --",
      "  * username : varchar(50)",
      "  email : varchar(100)",
      "}",
      "",
      "entity \"Order\" as order {",
      "  * order_id : number <<generated>>",
      "  --",
      "  * user_id : number <<FK>>",
      "  order_date : date",
      "}",
      "",
      "user ||--o{ order : places",
      "@enduml"
    ].join("\n");

    dialogHelper.showImportDialog("Paste your PlantUML ERD code below:", sampleCode)
      .then(function (code) {
        if (code !== null) {
          try {
            erdParser.generateDiagram(diagram, code);
            app.dialogs.showInfoDialog("ER Diagram imported successfully!");
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
    console.error("[plantuml-importer] handleImportERD error:", outerErr);
  }
}

exports.init = init;
