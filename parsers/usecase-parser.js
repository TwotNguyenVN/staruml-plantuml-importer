/**
 * Use Case Diagram Parser & Generator Module
 */

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

  // Helper to clean up colons and parentheses from aliases
  function cleanEndpoint(str) {
    if (!str) return "";
    var cleaned = str.trim();
    // Remove starting/ending colons for actors: :Actor: -> Actor
    if (cleaned.indexOf(":") === 0 && cleaned.lastIndexOf(":") === cleaned.length - 1 && cleaned.length > 1) {
      cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }
    // Remove starting/ending parentheses for use cases: (UseCase) -> UseCase
    if (cleaned.indexOf("(") === 0 && cleaned.lastIndexOf(")") === cleaned.length - 1 && cleaned.length > 1) {
      cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }
    // Strip quotes if any
    if (cleaned.indexOf('"') === 0 && cleaned.lastIndexOf('"') === cleaned.length - 1 && cleaned.length > 1) {
      cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }
    // Strip extraneous < or > that might have been left over from parser bugs
    if (cleaned.indexOf("<") === 0) cleaned = cleaned.substring(1).trim();
    if (cleaned.lastIndexOf(">") === cleaned.length - 1 && cleaned.length > 0) cleaned = cleaned.substring(0, cleaned.length - 1).trim();
    return cleaned;
  }

  function ensureElementRegistered(alias, rawStr, forceUC) {
    if (!alias) return;
    var isActor = parsedActors.some(function(a) { return a.alias === alias; });
    var isUC = parsedUseCases.some(function(u) { return u.alias === alias; });

    if (!isActor && !isUC) {
      if (forceUC || rawStr.indexOf("(") === 0) {
        parsedUseCases.push({ name: alias, alias: alias, stereotype: "" });
      } else if (rawStr.indexOf(":") === 0) {
        parsedActors.push({ name: alias, alias: alias, stereotype: "" });
      } else {
        if (/^uc/i.test(alias) || /usecase/i.test(alias)) {
          parsedUseCases.push({ name: alias, alias: alias, stereotype: "" });
        } else {
          parsedActors.push({ name: alias, alias: alias, stereotype: "" });
        }
      }
    }
  }

  // Parse PlantUML lines
  var subjectName = "";

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
      line.indexOf("title ") === 0
    ) {
      continue;
    }

    // Parse Subject name (rectangle or package)
    var matchSub = line.match(/^(rectangle|package)\s+(?:"([^"]+)"|([a-zA-Z0-9_\-]+))\s*\{?$/i);
    if (matchSub) {
      subjectName = matchSub[2] || matchSub[3];
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
      var stereotypeAct = "";
      var matchAct;

      if ((matchAct = line.match(/actor\s+"([^"]+)"\s+as\s+(\w+)(?:\s+<<([^>]+)>>)?/i))) {
        nameAct = matchAct[1];
        aliasAct = matchAct[2];
        stereotypeAct = matchAct[3] || "";
      } else if ((matchAct = line.match(/actor\s+(\w+)\s+as\s+"([^"]+)"(?:\s+<<([^>]+)>>)?/i))) {
        aliasAct = matchAct[1];
        nameAct = matchAct[2];
        stereotypeAct = matchAct[3] || "";
      } else if ((matchAct = line.match(/actor\s+"([^"]+)"(?:\s+<<([^>]+)>>)?/i))) {
        nameAct = matchAct[1];
        aliasAct = matchAct[1];
        stereotypeAct = matchAct[2] || "";
      } else if ((matchAct = line.match(/actor\s+(\w+)(?:\s+<<([^>]+)>>)?/i))) {
        nameAct = matchAct[1];
        aliasAct = matchAct[1];
        stereotypeAct = matchAct[2] || "";
      }

      if (aliasAct) {
        parsedActors.push({ name: nameAct, alias: aliasAct, stereotype: stereotypeAct });
      }
      continue;
    }

    // Parse use cases
    var isUseCaseLine = false;
    var nameUC = "";
    var aliasUC = "";
    var stereotypeUC = "";
    var matchUC;

    if (line.toLowerCase().indexOf("usecase ") === 0) {
      isUseCaseLine = true;
      if ((matchUC = line.match(/usecase\s+"([^"]+)"\s+as\s+(\w+)(?:\s+<<([^>]+)>>)?/i))) {
        nameUC = matchUC[1];
        aliasUC = matchUC[2];
        stereotypeUC = matchUC[3] || "";
      } else if ((matchUC = line.match(/usecase\s+(\w+)\s+as\s+"([^"]+)"(?:\s+<<([^>]+)>>)?/i))) {
        aliasUC = matchUC[1];
        nameUC = matchUC[2];
        stereotypeUC = matchUC[3] || "";
      } else if ((matchUC = line.match(/usecase\s+"([^"]+)"(?:\s+<<([^>]+)>>)?/i))) {
        nameUC = matchUC[1];
        aliasUC = matchUC[1];
        stereotypeUC = matchUC[2] || "";
      } else if ((matchUC = line.match(/usecase\s+(\w+)(?:\s+<<([^>]+)>>)?/i))) {
        nameUC = matchUC[1];
        aliasUC = matchUC[1];
        stereotypeUC = matchUC[2] || "";
      }
    } else if (line.match(/^\(([^)]+)\)(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?$/i)) {
      matchUC = line.match(/^\(([^)]+)\)(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?$/i);
      isUseCaseLine = true;
      nameUC = matchUC[1];
      aliasUC = matchUC[2] || matchUC[1];
      stereotypeUC = matchUC[3] || "";
    }

    if (isUseCaseLine && aliasUC) {
      parsedUseCases.push({ name: nameUC, alias: aliasUC, stereotype: stereotypeUC });
      continue;
    }

    // Parse relations
    var arrowRegex = /\s*(<\|?-+|-+\|?>|<\.+|\.+>|<-+|-+>|--+|\.\.+)\s*/;
    var parts = line.split(arrowRegex);
    if (parts.length >= 3) {
      var leftStr = parts[0].trim();
      var arrow = parts[1].trim();
      var rightWithLabel = parts.slice(2).join("");
      var rightStr = rightWithLabel;
      var label = "";
      var colonIndex = rightWithLabel.indexOf(":");
      if (colonIndex !== -1) {
        rightStr = rightWithLabel.substring(0, colonIndex).trim();
        label = rightWithLabel.substring(colonIndex + 1).trim();
      }

      var fromAlias = cleanEndpoint(leftStr);
      var toAlias = cleanEndpoint(rightStr);

      if (fromAlias && toAlias) {
        var fromIsUC = leftStr.indexOf("(") === 0;
        var toIsUC = rightStr.indexOf("(") === 0;

        ensureElementRegistered(fromAlias, leftStr, fromIsUC);
        ensureElementRegistered(toAlias, rightStr, toIsUC);

        var relType = "UMLAssociation";
        if (arrow === "--|>" || arrow === "<|--") {
          var realFrom = (arrow === "--|>") ? fromAlias : toAlias;
          var realTo = (arrow === "--|>") ? toAlias : fromAlias;
          relations.push({ type: "UMLGeneralization", from: realFrom, to: realTo });
        } else {
          var stereo = label ? label.replace(/<<|>>/g, "").trim().toLowerCase() : "";
          if (stereo === "include") relType = "UMLInclude";
          else if (stereo === "extend") relType = "UMLExtend";
          relations.push({ type: relType, from: fromAlias, to: toAlias });
        }
      }
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
  var minHeightForActors = Math.max(leftActors.length, rightActors.length) * 120;
  var diagramHeight = Math.max(500, Math.max(ucRowCount * 95 + 100, minHeightForActors + 100));

  var leftSpacing = leftActors.length > 0 ? Math.floor(diagramHeight / (leftActors.length + 1)) : 160;
  var rightSpacing = rightActors.length > 0 ? Math.floor(diagramHeight / (rightActors.length + 1)) : 160;

  var parentModel = diagram._parent;
  if (!parentModel) {
    parentModel = app.project.getProject();
  }

  // Create Use Case Subject (System Boundary) if defined
  if (subjectName) {
    var subjectLeft = useCaseCols[0] - 30;
    var subjectTop = 40;
    var subjectWidth = useCaseCols[useCaseCols.length - 1] + 150 + 30 - subjectLeft;
    var subjectHeight = 80 + ucRowCount * 95 - 40;

    try {
      app.factory.createModelAndView({
        id: "UMLUseCaseSubject",
        parent: parentModel,
        diagram: diagram,
        modelInitializer: function (model) {
          model.name = subjectName;
        },
        viewInitializer: function (dgmView) {
          dgmView.left = subjectLeft;
          dgmView.top = subjectTop;
          dgmView.width = subjectWidth;
          dgmView.height = subjectHeight;
        }
      });
    } catch (e) {
      console.error("[usecase-parser] Failed to create UseCaseSubject:", subjectName, e);
    }
  }

  // Create left actors
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
          if (actor.stereotype) {
            model.stereotype = actor.stereotype;
          }
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
          if (actor.stereotype) {
            model.stereotype = actor.stereotype;
          }
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
          if (uc.stereotype) {
            model.stereotype = uc.stereotype;
          }
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

module.exports = {
  generateDiagram: generateDiagram
};
