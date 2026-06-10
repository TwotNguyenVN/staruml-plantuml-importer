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
  var parsedPackages = []; // stores boundaries
  var parsedNotes = [];
  var relations = [];
  var noteLinks = [];
  
  var currentPackage = null;
  var inSkinparam = false;
  var currentNote = null; // for multiline notes

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

  function cleanEndpoint(str) {
    if (!str) return "";
    var cleaned = str.trim();
    if (cleaned.indexOf(":") === 0 && cleaned.lastIndexOf(":") === cleaned.length - 1 && cleaned.length > 1) {
      cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }
    if (cleaned.indexOf("(") === 0 && cleaned.lastIndexOf(")") === cleaned.length - 1 && cleaned.length > 1) {
      cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }
    if (cleaned.indexOf('"') === 0 && cleaned.lastIndexOf('"') === cleaned.length - 1 && cleaned.length > 1) {
      cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }
    if (cleaned.indexOf("<") === 0) cleaned = cleaned.substring(1).trim();
    if (cleaned.lastIndexOf(">") === cleaned.length - 1 && cleaned.length > 0) cleaned = cleaned.substring(0, cleaned.length - 1).trim();
    return cleaned;
  }

  function ensureElementRegistered(alias, rawStr, forceUC) {
    if (!alias) return;
    var isActor = parsedActors.some(function(a) { return a.alias === alias; });
    var isUC = parsedUseCases.some(function(u) { return u.alias === alias; });
    var isNote = parsedNotes.some(function(n) { return n.alias === alias; });

    if (!isActor && !isUC && !isNote) {
      if (forceUC || rawStr.indexOf("(") === 0) {
        parsedUseCases.push({ name: alias, alias: alias, stereotype: "", parent: currentPackage });
      } else if (rawStr.indexOf(":") === 0) {
        parsedActors.push({ name: alias, alias: alias, stereotype: "" });
      } else {
        if (/^uc/i.test(alias) || /usecase/i.test(alias)) {
          parsedUseCases.push({ name: alias, alias: alias, stereotype: "", parent: currentPackage });
        } else {
          parsedActors.push({ name: alias, alias: alias, stereotype: "" });
        }
      }
    }
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();

    if (!line || line.indexOf("'") === 0 || line.indexOf("@startuml") === 0 || line.indexOf("@enduml") === 0 || line.indexOf("left to right") === 0 || line.indexOf("top to bottom") === 0 || line.indexOf("title ") === 0) {
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

    // Multiline notes
    if (currentNote) {
      if (line.toLowerCase() === "end note") {
        currentNote = null;
      } else {
        currentNote.text += (currentNote.text ? "\n" : "") + line;
      }
      continue;
    }

    var matchNoteBlock = line.match(/^note\s+(left\s+of|right\s+of|top\s+of|bottom\s+of|as)\s+(\w+)/i);
    if (matchNoteBlock && line.indexOf(":") === -1) {
      var notePos = matchNoteBlock[1].toLowerCase();
      var noteTarget = matchNoteBlock[2];
      var nAlias = "note_" + parsedNotes.length;
      if (notePos === "as") {
        nAlias = noteTarget;
        currentNote = { text: "", alias: nAlias };
        parsedNotes.push(currentNote);
      } else {
        currentNote = { text: "", alias: nAlias };
        parsedNotes.push(currentNote);
        noteLinks.push({ from: nAlias, to: noteTarget });
      }
      continue;
    }

    // Single line notes
    var matchSingleNote = line.match(/^note\s+(left\s+of|right\s+of|top\s+of|bottom\s+of)\s+(\w+)\s*:\s*(.+)$/i);
    if (matchSingleNote) {
      var nTarget = matchSingleNote[2];
      var nText = matchSingleNote[3];
      var snAlias = "note_" + parsedNotes.length;
      parsedNotes.push({ text: nText, alias: snAlias });
      noteLinks.push({ from: snAlias, to: nTarget });
      continue;
    }
    var matchSingleNoteAs = line.match(/^note\s+"([^"]+)"\s+as\s+(\w+)/i);
    if (matchSingleNoteAs) {
      parsedNotes.push({ text: matchSingleNoteAs[1], alias: matchSingleNoteAs[2] });
      continue;
    }

    // Package / Rectangle
    var matchSub = line.match(/^(rectangle|package)\s+(?:"([^"]+)"|([a-zA-Z0-9_\-]+))\s*(?:as\s+(\w+))?\s*\{?$/i);
    if (matchSub) {
      var pkgName = matchSub[2] || matchSub[3];
      var pkgAlias = matchSub[4] || pkgName;
      var newPkg = { name: pkgName, alias: pkgAlias, children: [] };
      parsedPackages.push(newPkg);
      currentPackage = pkgAlias;
      continue;
    }
    
    if (line === "}") {
      currentPackage = null;
      continue;
    }

    // Parse actors
    if (line.toLowerCase().indexOf("actor ") === 0) {
      var nameAct = "", aliasAct = "", stereotypeAct = "", matchAct;
      if ((matchAct = line.match(/actor\s+"([^"]+)"\s+as\s+(\w+)(?:\s+<<([^>]+)>>)?/i))) {
        nameAct = matchAct[1]; aliasAct = matchAct[2]; stereotypeAct = matchAct[3] || "";
      } else if ((matchAct = line.match(/actor\s+(\w+)\s+as\s+"([^"]+)"(?:\s+<<([^>]+)>>)?/i))) {
        aliasAct = matchAct[1]; nameAct = matchAct[2]; stereotypeAct = matchAct[3] || "";
      } else if ((matchAct = line.match(/actor\s+"([^"]+)"(?:\s+<<([^>]+)>>)?/i))) {
        nameAct = matchAct[1]; aliasAct = matchAct[1]; stereotypeAct = matchAct[2] || "";
      } else if ((matchAct = line.match(/actor\s+(\w+)(?:\s+<<([^>]+)>>)?/i))) {
        nameAct = matchAct[1]; aliasAct = matchAct[1]; stereotypeAct = matchAct[2] || "";
      }
      if (aliasAct) {
        parsedActors.push({ name: nameAct, alias: aliasAct, stereotype: stereotypeAct });
      }
      continue;
    }

    // Parse use cases
    var isUseCaseLine = false;
    var nameUC = "", aliasUC = "", stereotypeUC = "", matchUC;
    if (line.toLowerCase().indexOf("usecase ") === 0) {
      isUseCaseLine = true;
      if ((matchUC = line.match(/usecase\s+"([^"]+)"\s+as\s+(\w+)(?:\s+<<([^>]+)>>)?/i))) {
        nameUC = matchUC[1]; aliasUC = matchUC[2]; stereotypeUC = matchUC[3] || "";
      } else if ((matchUC = line.match(/usecase\s+(\w+)\s+as\s+"([^"]+)"(?:\s+<<([^>]+)>>)?/i))) {
        aliasUC = matchUC[1]; nameUC = matchUC[2]; stereotypeUC = matchUC[3] || "";
      } else if ((matchUC = line.match(/usecase\s+"([^"]+)"(?:\s+<<([^>]+)>>)?/i))) {
        nameUC = matchUC[1]; aliasUC = matchUC[1]; stereotypeUC = matchUC[2] || "";
      } else if ((matchUC = line.match(/usecase\s+(\w+)(?:\s+<<([^>]+)>>)?/i))) {
        nameUC = matchUC[1]; aliasUC = matchUC[1]; stereotypeUC = matchUC[2] || "";
      }
    } else if (line.match(/^\(([^)]+)\)(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?$/i)) {
      matchUC = line.match(/^\(([^)]+)\)(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?$/i);
      isUseCaseLine = true;
      nameUC = matchUC[1]; aliasUC = matchUC[2] || matchUC[1]; stereotypeUC = matchUC[3] || "";
    }
    if (isUseCaseLine && aliasUC) {
      parsedUseCases.push({ name: nameUC, alias: aliasUC, stereotype: stereotypeUC, parent: currentPackage });
      if (currentPackage) {
        var p = parsedPackages.find(function(x){ return x.alias === currentPackage; });
        if (p) p.children.push(aliasUC);
      }
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

        // Note Link
        if (arrow.indexOf(".") !== -1 && (parsedNotes.some(function(n){ return n.alias === fromAlias; }) || parsedNotes.some(function(n){ return n.alias === toAlias; }))) {
          noteLinks.push({ from: fromAlias, to: toAlias });
          continue;
        }

        var relType = "UMLAssociation";
        var isDashed = arrow.indexOf(".") !== -1;
        var isGeneralization = arrow === "--|>" || arrow === "<|--";
        var stereo = label ? label.replace(/<<|>>/g, "").trim().toLowerCase() : "";

        if (isGeneralization) {
          relType = "UMLGeneralization";
          if (arrow === "<|--") {
            var temp = fromAlias; fromAlias = toAlias; toAlias = temp;
          }
        } else if (isDashed) {
          relType = "UMLDependency";
          if (stereo === "include") relType = "UMLInclude";
          else if (stereo === "extend") relType = "UMLExtend";
          if (arrow.indexOf("<") === 0 && arrow.indexOf(">") === -1) {
             var temp = fromAlias; fromAlias = toAlias; toAlias = temp;
          }
        } else {
          if (arrow.indexOf("<") === 0 && arrow.indexOf(">") === -1) {
             var temp = fromAlias; fromAlias = toAlias; toAlias = temp;
          }
        }
        relations.push({ type: relType, from: fromAlias, to: toAlias, name: stereo ? "" : label.replace(/"/g, "") });
      }
    }
  }

  // --- Layout Engine ---
  var parentModel = diagram._parent;
  if (!parentModel) parentModel = app.project.getProject();
  var elementsMap = {};
  var maxDiagramHeight = 1000;

  function detectLevel(text, relations, parsedUseCases) {
    var lowerText = text.toLowerCase();
    if (lowerText.indexOf("cấp 0") !== -1 || lowerText.indexOf("level 0") !== -1 || lowerText.indexOf("uc-00") !== -1) return 0;
    if (lowerText.indexOf("cấp 1") !== -1 || lowerText.indexOf("level 1") !== -1) return 1;
    if (lowerText.indexOf("cấp 2") !== -1 || lowerText.indexOf("level 2") !== -1) return 2;

    var totalInclude = 0;
    var totalExtend = 0;
    relations.forEach(function(r) {
      if (r.type === "UMLInclude") totalInclude++;
      if (r.type === "UMLExtend") totalExtend++;
    });

    if (totalInclude + totalExtend === 0) return 0;
    if (totalExtend > totalInclude) return 1;
    if (totalExtend < totalInclude) return 2;

    var centrality = {};
    relations.forEach(function(r) {
      centrality[r.from] = (centrality[r.from] || 0) + 1;
      centrality[r.to] = (centrality[r.to] || 0) + 1;
    });

    var mainUC = null;
    var maxScore = -1;
    parsedUseCases.forEach(function(uc) {
      var score = centrality[uc.alias] || 0;
      if (score > maxScore) {
        maxScore = score;
        mainUC = uc;
      }
    });

    if (mainUC) {
       var outInclude = 0;
       relations.forEach(function(r) {
         if (r.type === "UMLInclude" && r.from === mainUC.alias) outInclude++;
       });
       if (outInclude >= 2) return 2;
       return 1;
    }
    return 0;
  }

  function createViews(ucs, actors) {
    ucs.forEach(function (uc) {
      try {
        var view = app.factory.createModelAndView({
          id: "UMLUseCase",
          parent: parentModel,
          diagram: diagram,
          modelInitializer: function (model) {
            model.name = sanitizeName(uc.name);
            if (uc.stereotype) model.stereotype = uc.stereotype;
          },
          viewInitializer: function (v) {
            v.left = uc.x;
            v.top = uc.y;
            v.width = uc.width || 150;
            v.height = 55;
          }
        });
        if (view) elementsMap[uc.alias] = view;
      } catch (e) {}
    });

    actors.forEach(function (actor) {
      try {
        var view = app.factory.createModelAndView({
          id: "UMLActor",
          parent: parentModel,
          diagram: diagram,
          modelInitializer: function (model) {
            model.name = sanitizeName(actor.name);
            if (actor.stereotype) model.stereotype = actor.stereotype;
          },
          viewInitializer: function (v) {
            v.left = actor.x;
            v.top = actor.y;
            v.width = 60;
            v.height = 80;
          }
        });
        if (view) elementsMap[actor.alias] = view;
      } catch (e) {}
    });
  }

  function layoutLevel0() {
    var leftActors = [];
    var rightActors = [];
    parsedActors.forEach(function (actor) {
      if (isSecondaryActor(actor.name, actor.alias)) rightActors.push(actor);
      else leftActors.push(actor);
    });

    var PADDING = 40;
    var COL_WIDTH = 250;
    var ROW_HEIGHT = 100;
    var START_Y = 100;

    var maxElements = Math.max(leftActors.length, rightActors.length, parsedUseCases.length);
    var TOTAL_HEIGHT = Math.max(1, maxElements - 1) * ROW_HEIGHT;

    function getSpacing(count) {
      if (count <= 1) return 0;
      return TOTAL_HEIGHT / (count - 1);
    }

    var leftSpacing = getSpacing(leftActors.length);
    var rightSpacing = getSpacing(rightActors.length);

    var actorsMap = {};
    leftActors.forEach(function (actor, index) {
      actor.x = 50;
      actor.y = leftActors.length === 1 ? START_Y + TOTAL_HEIGHT / 2 : START_Y + index * leftSpacing;
      actorsMap[actor.alias] = actor;
    });
    rightActors.forEach(function (actor, index) {
      actor.y = rightActors.length === 1 ? START_Y + TOTAL_HEIGHT / 2 : START_Y + index * rightSpacing;
      actorsMap[actor.alias] = actor;
    });

    var ucTargetY = {};
    parsedUseCases.forEach(function (uc) {
      var connectedActors = [];
      relations.forEach(function (rel) {
        if (rel.from === uc.alias && actorsMap[rel.to]) connectedActors.push(actorsMap[rel.to]);
        if (rel.to === uc.alias && actorsMap[rel.from]) connectedActors.push(actorsMap[rel.from]);
      });
      if (connectedActors.length > 0) {
        var sumY = 0;
        connectedActors.forEach(function (a) { sumY += a.y; });
        ucTargetY[uc.alias] = sumY / connectedActors.length;
      } else {
        ucTargetY[uc.alias] = START_Y + TOTAL_HEIGHT / 2;
      }
    });

    var currentX = 300;
    var rightActorStartX = currentX + COL_WIDTH * 2;
    var pkgTargetY = {};
    parsedPackages.forEach(function(pkg) {
      var ucs = parsedUseCases.filter(function(u){ return u.parent === pkg.alias; });
      var sum = 0;
      ucs.forEach(function(u) { sum += ucTargetY[u.alias]; });
      pkgTargetY[pkg.alias] = ucs.length > 0 ? sum / ucs.length : START_Y + TOTAL_HEIGHT / 2;
    });

    parsedPackages.sort(function(a, b) {
      return pkgTargetY[a.alias] - pkgTargetY[b.alias];
    });

    var globalUcSpacing = getSpacing(parsedUseCases.length);
    var currentGlobalUcIndex = 0;

    parsedPackages.forEach(function (pkg) {
      var ucsInPkg = parsedUseCases.filter(function(u){ return u.parent === pkg.alias; });
      if (ucsInPkg.length === 0) return;
      ucsInPkg.sort(function(a, b) { return ucTargetY[a.alias] - ucTargetY[b.alias]; });
      var pkgTop = START_Y + currentGlobalUcIndex * globalUcSpacing - PADDING;
      var maxUcWidth = 0;
      ucsInPkg.forEach(function(uc) {
        uc.width = Math.max(150, (uc.name ? uc.name.length : 10) * 8 + 60);
        if (uc.width > maxUcWidth) maxUcWidth = uc.width;
      });

      var pkgWidth = Math.max(350, maxUcWidth + PADDING * 2);

      ucsInPkg.forEach(function(uc) {
        uc.x = currentX + (pkgWidth - uc.width) / 2;
        uc.y = parsedUseCases.length === 1 ? START_Y + TOTAL_HEIGHT / 2 : START_Y + currentGlobalUcIndex * globalUcSpacing;
        currentGlobalUcIndex++;
      });

      var pkgBottom = START_Y + (currentGlobalUcIndex - 1) * globalUcSpacing + 55 + PADDING;
      var pkgHeight = Math.max(150, pkgBottom - pkgTop);

      try {
        var subjectView = app.factory.createModelAndView({
          id: "UMLUseCaseSubject",
          parent: parentModel,
          diagram: diagram,
          modelInitializer: function (model) { model.name = pkg.name; },
          viewInitializer: function (v) {
            v.left = currentX;
            v.top = pkgTop;
            v.width = pkgWidth;
            v.height = pkgHeight;
          }
        });
        elementsMap[pkg.alias] = subjectView;
      } catch (e) {}

      rightActorStartX = Math.max(rightActorStartX, currentX + pkgWidth + 150);
    });

    var unassignedUCs = parsedUseCases.filter(function(u){ return !u.parent; });
    unassignedUCs.sort(function(a, b) { return ucTargetY[a.alias] - ucTargetY[b.alias]; });

    unassignedUCs.forEach(function(uc) {
      uc.x = currentX;
      uc.y = parsedUseCases.length === 1 ? START_Y + TOTAL_HEIGHT / 2 : START_Y + currentGlobalUcIndex * globalUcSpacing;
      uc.width = Math.max(150, (uc.name ? uc.name.length : 10) * 8 + 60);
      currentGlobalUcIndex++;
      rightActorStartX = Math.max(rightActorStartX, uc.x + uc.width + 150);
    });

    rightActors.forEach(function(a) { a.x = rightActorStartX; });
    createViews(parsedUseCases, parsedActors);
    maxDiagramHeight = START_Y + TOTAL_HEIGHT + 100;
  }

  function layoutLevel1() {
    var centrality = {};
    relations.forEach(function(r) {
      centrality[r.from] = (centrality[r.from] || 0) + 1;
      centrality[r.to] = (centrality[r.to] || 0) + 1;
    });

    var mainUC = null;
    var maxScore = -1;
    parsedUseCases.forEach(function(uc) {
      var score = centrality[uc.alias] || 0;
      if (score > maxScore) {
        maxScore = score;
        mainUC = uc;
      }
    });

    if (!mainUC) {
      layoutLevel0();
      return;
    }

    var includes = [];
    var extendsUCs = [];
    var others = [];
    parsedUseCases.forEach(function(uc) {
      if (uc === mainUC) return;
      var isInclude = relations.some(function(r) { return r.type === "UMLInclude" && r.from === mainUC.alias && r.to === uc.alias; });
      var isExtend = relations.some(function(r) { return r.type === "UMLExtend" && r.to === mainUC.alias && r.from === uc.alias; });
      if (isInclude) includes.push(uc);
      else if (isExtend) extendsUCs.push(uc);
      else others.push(uc);
    });

    var centerX = 400;
    var centerY = 300;

    mainUC.width = Math.max(150, (mainUC.name ? mainUC.name.length : 10) * 8 + 60);
    mainUC.x = centerX;
    mainUC.y = centerY;

    var actorSpacing = 100;
    var actorStartY = centerY - (parsedActors.length - 1) * actorSpacing / 2;
    parsedActors.forEach(function(a, i) {
      a.x = 50;
      a.y = actorStartY + i * actorSpacing;
    });

    var includeSpacing = 150;
    var includeStartX = centerX - (includes.length - 1) * includeSpacing / 2;
    includes.forEach(function(uc, i) {
      uc.width = Math.max(150, (uc.name ? uc.name.length : 10) * 8 + 60);
      uc.x = includeStartX + i * includeSpacing;
      uc.y = centerY + 150;
    });

    var extendSpacing = 80;
    var extendStartY = centerY - (extendsUCs.length - 1) * extendSpacing / 2;
    extendsUCs.forEach(function(uc, i) {
      uc.width = Math.max(150, (uc.name ? uc.name.length : 10) * 8 + 60);
      uc.x = centerX + mainUC.width + 100;
      uc.y = extendStartY + i * extendSpacing;
    });

    var otherY = Math.max(centerY + 300, extendStartY + extendsUCs.length * extendSpacing + 100);
    others.forEach(function(uc, i) {
      uc.width = Math.max(150, (uc.name ? uc.name.length : 10) * 8 + 60);
      uc.x = centerX + (i % 3) * 200;
      uc.y = otherY + Math.floor(i / 3) * 100;
    });

    parsedPackages.forEach(function(pkg) {
      var pkgTop = Math.min(centerY - 100, extendStartY - 50);
      var pkgBottom = otherY + 100;
      var pkgLeft = centerX - 100;
      var pkgRight = centerX + mainUC.width + 400;
      var subjectView = app.factory.createModelAndView({
        id: "UMLUseCaseSubject",
        parent: parentModel,
        diagram: diagram,
        modelInitializer: function (model) { model.name = pkg.name; },
        viewInitializer: function (v) {
          v.left = pkgLeft;
          v.top = pkgTop;
          v.width = pkgRight - pkgLeft;
          v.height = pkgBottom - pkgTop;
        }
      });
      elementsMap[pkg.alias] = subjectView;
    });

    createViews(parsedUseCases, parsedActors);
    maxDiagramHeight = Math.max(actorStartY + parsedActors.length * actorSpacing, otherY + 100);
  }

  function layoutLevel2() {
    var centrality = {};
    relations.forEach(function(r) {
      centrality[r.from] = (centrality[r.from] || 0) + 1;
      centrality[r.to] = (centrality[r.to] || 0) + 1;
    });

    var mainUC = null;
    var maxScore = -1;
    parsedUseCases.forEach(function(uc) {
      var score = centrality[uc.alias] || 0;
      if (score > maxScore) {
        maxScore = score;
        mainUC = uc;
      }
    });

    if (!mainUC) {
      layoutLevel0();
      return;
    }

    var includes = [];
    var extendsUCs = [];
    var others = [];
    parsedUseCases.forEach(function(uc) {
      if (uc === mainUC) return;
      var isInclude = relations.some(function(r) { return r.type === "UMLInclude" && r.from === mainUC.alias && r.to === uc.alias; });
      var isExtend = relations.some(function(r) { return r.type === "UMLExtend" && r.to === mainUC.alias && r.from === uc.alias; });
      if (isInclude) includes.push(uc);
      else if (isExtend) extendsUCs.push(uc);
      else others.push(uc);
    });

    parsedActors.forEach(function(a, i) {
      a.x = 50 + i * 100;
      a.y = 100;
    });

    mainUC.width = Math.max(150, (mainUC.name ? mainUC.name.length : 10) * 8 + 60);
    mainUC.x = 250;
    mainUC.y = 100;

    var stepSpacing = 100;
    includes.forEach(function(uc, i) {
      uc.width = Math.max(150, (uc.name ? uc.name.length : 10) * 8 + 60);
      uc.x = 250;
      uc.y = 250 + i * stepSpacing;
    });

    var extendSpacing = 100;
    extendsUCs.forEach(function(uc, i) {
      uc.width = Math.max(150, (uc.name ? uc.name.length : 10) * 8 + 60);
      uc.x = 550;
      uc.y = 250 + i * extendSpacing;
    });

    var otherY = 250 + Math.max(includes.length, extendsUCs.length) * stepSpacing + 50;
    others.forEach(function(uc, i) {
      uc.width = Math.max(150, (uc.name ? uc.name.length : 10) * 8 + 60);
      uc.x = 250 + (i % 3) * 200;
      uc.y = otherY + Math.floor(i / 3) * 100;
    });

    parsedPackages.forEach(function(pkg) {
      var pkgTop = 50;
      var pkgBottom = otherY + 100;
      var pkgLeft = 200;
      var pkgRight = 800;
      var subjectView = app.factory.createModelAndView({
        id: "UMLUseCaseSubject",
        parent: parentModel,
        diagram: diagram,
        modelInitializer: function (model) { model.name = pkg.name; },
        viewInitializer: function (v) {
          v.left = pkgLeft;
          v.top = pkgTop;
          v.width = pkgRight - pkgLeft;
          v.height = pkgBottom - pkgTop;
        }
      });
      elementsMap[pkg.alias] = subjectView;
    });

    createViews(parsedUseCases, parsedActors);
    maxDiagramHeight = otherY + 100;
  }

  var diagramLevel = detectLevel(text, relations, parsedUseCases);
  if (diagramLevel === 1) {
    layoutLevel1();
  } else if (diagramLevel === 2) {
    layoutLevel2();
  } else {
    layoutLevel0();
  }

    // Notes
  var noteY = maxDiagramHeight + 50;
  var noteX = 50;
  parsedNotes.forEach(function (note) {
    try {
      var view = app.factory.createModelAndView({
        id: "UMLNote",
        parent: parentModel,
        diagram: diagram,
        modelInitializer: function (model) {
          model.text = note.text;
        },
        viewInitializer: function (v) {
          v.left = noteX;
          v.top = noteY;
          v.width = 150;
          v.height = Math.max(50, note.text.split("\n").length * 20 + 20);
        }
      });
      if (view) elementsMap[note.alias] = view;
      noteX += 180;
      if (noteX > rightActorStartX) {
        noteX = 50;
        noteY += 100;
      }
    } catch (e) {}
  });

  // Relations
  relations.forEach(function (rel) {
    var tailView = elementsMap[rel.from];
    var headView = elementsMap[rel.to];
    if (!tailView || !headView) return;
    try {
      app.factory.createModelAndView({
        id: rel.type,
        parent: parentModel,
        diagram: diagram,
        tailView: tailView,
        headView: headView,
        tailModel: tailView.model,
        headModel: headView.model,
        modelInitializer: function (model) {
          if (rel.name) model.name = rel.name;
        }
      });
    } catch (e) {}
  });

  // Note Links
  noteLinks.forEach(function (link) {
    var tailView = elementsMap[link.from];
    var headView = elementsMap[link.to];
    if (!tailView || !headView) return;
    try {
      app.factory.createModelAndView({
        id: "UMLNoteLink",
        parent: parentModel,
        diagram: diagram,
        tailView: tailView,
        headView: headView
      });
    } catch (e) {}
  });
}

module.exports = {
  generateDiagram: generateDiagram
};
