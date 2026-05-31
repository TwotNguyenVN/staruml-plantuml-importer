/**
 * StarUML Use Case Diagram Importer Extension (v2.0)
 * Compatible with StarUML v7+
 * Imports Use Case diagrams from PlantUML syntax
 */

// Guard: only run in StarUML renderer process
function init() {
  if (typeof app === "undefined" || !app.commands) {
    return;
  }
  app.commands.register(
    "usecase-importer:import",
    handleImport,
    "Import Use Case Diagram from PlantUML Code"
  );
}

function handleImport() {
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
      'actor "Librarian" as Librarian',
      'actor "Admin" as Admin',
      "",
      "Member --|> Guest",
      "Admin --|> Librarian",
      "",
      'rectangle "Library System" {',
      '    usecase "Register" as UC1',
      '    usecase "Login" as UC2',
      '    usecase "Search Books" as UC3',
      '    usecase "Borrow Book" as UC4',
      '    usecase "Return Book" as UC5',
      '    usecase "Manage Books" as UC6',
      '    usecase "Manage Members" as UC7',
      '    usecase "View Reports" as UC8',
      "}",
      "",
      "Guest --> UC1",
      "Guest --> UC3",
      "",
      "Member --> UC2",
      "Member --> UC4",
      "Member --> UC5",
      "",
      "Librarian --> UC6",
      "Librarian --> UC7",
      "",
      "Admin --> UC8",
      "",
      "UC4 ..> UC2 : <<include>>",
      "UC5 ..> UC2 : <<include>>",
      "",
      "@enduml"
    ].join("\n");

    app.dialogs
      .showTextDialog("Paste your PlantUML Use Case code below:", sampleCode)
      .then(function (result) {
        if (result.buttonId === "ok") {
          try {
            generateDiagram(diagram, result.returnValue || "");
            app.dialogs.showInfoDialog(
              "Use Case diagram imported successfully!"
            );
          } catch (e) {
            app.dialogs.showAlertDialog(
              "Error generating diagram:\n" + String(e && e.message ? e.message : e)
            );
          }
        }
      })
      .catch(function (err) {
        console.error("[usecase-importer] Dialog error:", err);
      });
  } catch (outerErr) {
    console.error("[usecase-importer] handleImport error:", outerErr);
    try {
      app.dialogs.showAlertDialog(
        "Unexpected error:\n" + String(outerErr && outerErr.message ? outerErr.message : outerErr)
      );
    } catch (_) {
      // silently fail if even alert fails
    }
  }
}

function sanitizeName(name) {
  if (!name) return "";
  return name
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/[\/\-\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function generateDiagram(diagram, text) {
  var lines = text.split("\n");
  var elementsMap = {};

  var parsedActors = [];
  var parsedUseCases = [];
  var relations = [];

  var inSkinparam = false;
  var secondaryKeywords = [
    "service", "gateway", "system", "supplier",
    "provider", "bank", "payment", "email", "sms", "api"
  ];

  function isSecondaryActor(name, alias) {
    var lowerName = (name || "").toLowerCase();
    var lowerAlias = (alias || "").toLowerCase();
    return secondaryKeywords.some(function (kw) {
      return lowerName.indexOf(kw) !== -1 || lowerAlias.indexOf(kw) !== -1;
    });
  }

  // Parse PlantUML lines
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();

    // Skip empty, comments, directives
    if (
      !line ||
      line.indexOf("'") === 0 ||
      line.indexOf("@startuml") === 0 ||
      line.indexOf("@enduml") === 0 ||
      line.indexOf("left to right") === 0 ||
      line.indexOf("top to bottom") === 0 ||
      line.indexOf("title ") === 0 ||
      line.indexOf("rectangle ") === 0 ||
      line.indexOf("package ") === 0
    ) {
      continue;
    }

    if (line.indexOf("skinparam") === 0) {
      if (line.indexOf("{") !== -1) inSkinparam = true;
      continue;
    }
    if (inSkinparam) {
      if (line.indexOf("}") !== -1) inSkinparam = false;
      continue;
    }
    if (line === "}") continue;

    // Parse actors
    if (line.toLowerCase().indexOf("actor ") === 0) {
      var nameAct = "";
      var aliasAct = "";
      var matchAct;

      if ((matchAct = line.match(/actor\s+"([^"]+)"\s+as\s+(\w+)/i))) {
        nameAct = matchAct[1];
        aliasAct = matchAct[2];
      } else if ((matchAct = line.match(/actor\s+(\w+)\s+as\s+"([^"]+)"/i))) {
        aliasAct = matchAct[1];
        nameAct = matchAct[2];
      } else if ((matchAct = line.match(/actor\s+"([^"]+)"/i))) {
        nameAct = matchAct[1];
        aliasAct = matchAct[1];
      } else if ((matchAct = line.match(/actor\s+(\w+)/i))) {
        nameAct = matchAct[1];
        aliasAct = matchAct[1];
      }

      if (aliasAct) {
        parsedActors.push({ name: nameAct, alias: aliasAct });
      }
      continue;
    }

    // Parse use cases
    if (line.toLowerCase().indexOf("usecase ") === 0) {
      var nameUC = "";
      var aliasUC = "";
      var matchUC;

      if ((matchUC = line.match(/usecase\s+"([^"]+)"\s+as\s+(\w+)/i))) {
        nameUC = matchUC[1];
        aliasUC = matchUC[2];
      } else if ((matchUC = line.match(/usecase\s+(\w+)\s+as\s+"([^"]+)"/i))) {
        aliasUC = matchUC[1];
        nameUC = matchUC[2];
      } else if ((matchUC = line.match(/usecase\s+"([^"]+)"/i))) {
        nameUC = matchUC[1];
        aliasUC = matchUC[1];
      } else if ((matchUC = line.match(/usecase\s+(\w+)/i))) {
        nameUC = matchUC[1];
        aliasUC = matchUC[1];
      }

      if (aliasUC) {
        parsedUseCases.push({ name: nameUC, alias: aliasUC });
      }
      continue;
    }

    // Parse relations
    var matchRel;
    // Generalization: A --|> B
    if ((matchRel = line.match(/^(\w+)\s*--\|>\s*(\w+)$/))) {
      relations.push({ type: "UMLGeneralization", from: matchRel[1], to: matchRel[2] });
    }
    // Generalization reverse: A <|-- B
    else if ((matchRel = line.match(/^(\w+)\s*<\|--\s*(\w+)$/))) {
      relations.push({ type: "UMLGeneralization", from: matchRel[2], to: matchRel[1] });
    }
    // Include/Extend: A ..> B : <<include>>
    else if ((matchRel = line.match(/^(\w+)\s*(?:\.\.>|\.>)\s*(\w+)(?:\s*:\s*(.+))?$/))) {
      var stereo = matchRel[3] ? matchRel[3].replace(/<<|>>/g, "").trim().toLowerCase() : "";
      var relType = "UMLAssociation";
      if (stereo === "include") relType = "UMLInclude";
      else if (stereo === "extend") relType = "UMLExtend";
      relations.push({ type: relType, from: matchRel[1], to: matchRel[2] });
    }
    // Association: A --> B or A -> B or A -- B
    else if ((matchRel = line.match(/^(\w+)\s*(?:-->|->|--)\s*(\w+)(?:\s*:\s*(.+))?$/))) {
      relations.push({ type: "UMLAssociation", from: matchRel[1], to: matchRel[2] });
    }
  }

  // Split actors into left (primary) and right (secondary)
  var leftActors = [];
  var rightActors = [];
  parsedActors.forEach(function (actor) {
    if (isSecondaryActor(actor.name, actor.alias)) {
      rightActors.push(actor);
    } else {
      leftActors.push(actor);
    }
  });

  // Calculate layout dimensions
  var totalUC = parsedUseCases.length;
  var colsCount = 2;
  var useCaseCols = [360, 600];
  var leftActorX = 80;
  var rightActorX = 850;

  if (totalUC > 30) {
    colsCount = 4;
    useCaseCols = [280, 480, 680, 880];
    rightActorX = 1100;
  } else if (totalUC > 10) {
    colsCount = 3;
    useCaseCols = [300, 520, 740];
    rightActorX = 980;
  }

  var ucRowCount = Math.ceil(totalUC / colsCount);
  var diagramHeight = Math.max(500, ucRowCount * 95 + 100);

  var leftSpacing = leftActors.length > 0 ? Math.floor(diagramHeight / (leftActors.length + 1)) : 160;
  var rightSpacing = rightActors.length > 0 ? Math.floor(diagramHeight / (rightActors.length + 1)) : 160;

  // Use diagram._parent as model container, fallback to project root
  var parentModel = diagram._parent;
  if (!parentModel) {
    parentModel = app.project.getProject();
  }

  // Create left actors using viewInitializer (StarUML v7 API)
  leftActors.forEach(function (actor, index) {
    var posX = leftActorX;
    var posY = leftSpacing + index * leftSpacing - 40;
    var actorName = sanitizeName(actor.name);

    try {
      var view = app.factory.createModelAndView({
        id: "UMLActor",
        parent: parentModel,
        diagram: diagram,
        modelInitializer: function (model) {
          model.name = actorName;
        },
        viewInitializer: function (dgmView) {
          dgmView.left = posX;
          dgmView.top = posY;
          dgmView.width = 60;
          dgmView.height = 80;
        }
      });
      if (view) {
        elementsMap[actor.alias] = view;
      }
    } catch (e) {
      console.error("[usecase-importer] Failed to create actor:", actorName, e);
    }
  });

  // Create right actors
  rightActors.forEach(function (actor, index) {
    var posX = rightActorX;
    var posY = rightSpacing + index * rightSpacing - 40;
    var actorName = sanitizeName(actor.name);

    try {
      var view = app.factory.createModelAndView({
        id: "UMLActor",
        parent: parentModel,
        diagram: diagram,
        modelInitializer: function (model) {
          model.name = actorName;
        },
        viewInitializer: function (dgmView) {
          dgmView.left = posX;
          dgmView.top = posY;
          dgmView.width = 60;
          dgmView.height = 80;
        }
      });
      if (view) {
        elementsMap[actor.alias] = view;
      }
    } catch (e) {
      console.error("[usecase-importer] Failed to create actor:", actorName, e);
    }
  });

  // Create use cases
  parsedUseCases.forEach(function (uc, index) {
    var colIndex = index % colsCount;
    var rowIndex = Math.floor(index / colsCount);
    var posX = useCaseCols[colIndex];
    var posY = 80 + rowIndex * 95;
    var ucName = sanitizeName(uc.name);

    try {
      var view = app.factory.createModelAndView({
        id: "UMLUseCase",
        parent: parentModel,
        diagram: diagram,
        modelInitializer: function (model) {
          model.name = ucName;
        },
        viewInitializer: function (dgmView) {
          dgmView.left = posX;
          dgmView.top = posY;
          dgmView.width = 150;
          dgmView.height = 55;
        }
      });
      if (view) {
        elementsMap[uc.alias] = view;
      }
    } catch (e) {
      console.error("[usecase-importer] Failed to create use case:", ucName, e);
    }
  });

  // Create relations
  relations.forEach(function (rel) {
    var tailView = elementsMap[rel.from];
    var headView = elementsMap[rel.to];

    if (!tailView || !headView) {
      console.warn(
        "[usecase-importer] Skipping relation: " +
        rel.from + " -> " + rel.to +
        " (missing element)"
      );
      return;
    }

    try {
      app.factory.createModelAndView({
        id: rel.type,
        parent: parentModel,
        diagram: diagram,
        tailView: tailView,
        headView: headView,
        tailModel: tailView.model,
        headModel: headView.model
      });
    } catch (e) {
      console.error(
        "[usecase-importer] Failed to create relation:",
        rel.type, rel.from, "->", rel.to, e
      );
    }
  });
}

exports.init = init;
