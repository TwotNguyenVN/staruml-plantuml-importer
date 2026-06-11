/**
 * Sequence Diagram Parser & Generator Module for StarUML Importer Extension
 */

function sanitizeName(name) {
  if (!name) return "";
  return name.trim();
}

function getMessageSort(arrow) {
  switch (arrow) {
    case "->": return "synchCall";
    case "->>": return "asynchCall";
    case "-->": return "reply";
    case "->*": return "createMessage";
    case "->x": return "deleteMessage";
    default: return "synchCall";
  }
}

function generateDiagram(diagram, text) {
  var lines = text.split("\n");
  var elementsMap = {};
  var parsedLifelines = [];
  var events = [];

  // Helper to find or implicitly create lifelines
  function getOrCreateLifeline(alias) {
    var existing = parsedLifelines.find(function (life) {
      return life.alias === alias;
    });
    if (existing) return existing;

    var newLife = {
      type: "participant",
      name: alias,
      alias: alias
    };
    parsedLifelines.push(newLife);
    return newLife;
  }

  // 1. Parsing PlantUML Sequence lines
  var inNote = false;
  var currentNote = null;
  var isAutonumber = false;
  var msgCount = 1;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();

    // Skip empty lines, start/end, title, autonumber
    if (
      !line ||
      line.indexOf("'") === 0 ||
      line.indexOf("@startuml") === 0 ||
      line.indexOf("@enduml") === 0 ||
      line.indexOf("title ") === 0 ||
      line.indexOf("hide footbox") === 0 ||
      line.indexOf("skinparam") === 0
    ) {
      if (line.indexOf("skinparam") === 0 && line.indexOf("{") !== -1) {
        while (i < lines.length && lines[i].indexOf("}") === -1) {
          i++;
        }
      }
      continue;
    }

    if (line === "autonumber") {
      isAutonumber = true;
      continue;
    }

    var matchActivate = line.match(/^activate\s+([a-zA-Z0-9_\-]+)$/i);
    if (matchActivate) {
      events.push({ type: "activate", target: matchActivate[1] });
      continue;
    }

    var matchDeactivate = line.match(/^deactivate\s+([a-zA-Z0-9_\-]+)$/i);
    if (matchDeactivate) {
      events.push({ type: "deactivate", target: matchDeactivate[1] });
      continue;
    }

    var matchDivider = line.match(/^==\s*(.+?)\s*==$/);
    if (matchDivider) {
      events.push({ type: "divider", text: matchDivider[1].trim() });
      continue;
    }

    if (inNote) {
      if (line === "end note") {
        events.push(currentNote);
        inNote = false;
        currentNote = null;
      } else {
        if (currentNote.text !== "") currentNote.text += "\n";
        currentNote.text += line;
      }
      continue;
    }

    // Parse note start
    var matchNote = line.match(/^note\s+(right|left|over)(?:\s+of)?\s+([a-zA-Z0-9_\-]+)(?:\s*:\s*(.*))?$/i);
    if (matchNote) {
      var position = matchNote[1].toLowerCase();
      var target = matchNote[2];
      var singleLineText = matchNote[3];

      getOrCreateLifeline(target);

      if (singleLineText !== undefined && singleLineText !== "") {
        events.push({
          type: "note",
          position: position,
          target: target,
          text: singleLineText.trim()
        });
      } else {
        inNote = true;
        currentNote = {
          type: "note",
          position: position,
          target: target,
          text: ""
        };
      }
      continue;
    }

    // Parse Fragments (group, loop, alt, opt)
    var matchFragment = line.match(/^(group|loop|alt|opt|par)(?:\s+(.*))?$/i);
    if (matchFragment) {
      events.push({
        type: "fragment_start",
        fragType: matchFragment[1].toLowerCase(),
        label: matchFragment[2] ? matchFragment[2].trim() : ""
      });
      continue;
    }

    if (line.indexOf("else") === 0) {
      var matchElse = line.match(/^else(?:\s+(.*))?$/i);
      events.push({
        type: "operand",
        label: matchElse && matchElse[1] ? matchElse[1].trim() : ""
      });
      continue;
    }

    if (line === "end") {
      events.push({ type: "fragment_end" });
      continue;
    }

    // Parse Lifelines: actor/participant/database/etc. Name as Alias
    var matchLife = line.match(/^(actor|participant|boundary|control|entity|database|collections)\s+(?:"([^"]+)"|([a-zA-Z0-9_\-]+))\s*(?:as\s+(\w+))?(?:\s+<<([^>]+)>>)?$/i);
    if (matchLife) {
      var lifeType = matchLife[1].toLowerCase();
      var name = matchLife[2] || matchLife[3];
      var alias = matchLife[4] || name;
      var stereotype = matchLife[5] || "";
      
      parsedLifelines.push({
        type: lifeType,
        name: name,
        alias: alias,
        stereotype: stereotype
      });
      continue;
    }

    // Parse Messages: Sender (Arrow) Receiver : Label
    var matchMsg = line.match(/^([a-zA-Z0-9_\.\-]+)\s*(->>|-->|->\*|->x|->)\s*([a-zA-Z0-9_\.\-]+)\s*(?:\s*:\s*(.+))?$/);
    if (matchMsg) {
      var from = matchMsg[1];
      var arrow = matchMsg[2];
      var to = matchMsg[3];
      var label = matchMsg[4] ? matchMsg[4].trim() : "";

      // Replace \n with space as per user feedback
      label = label.replace(/\\n/g, " ");

      // Implicitly register lifelines if they weren't declared
      getOrCreateLifeline(from);
      getOrCreateLifeline(to);

      events.push({
        type: "message",
        from: from,
        to: to,
        sort: getMessageSort(arrow),
        label: label
      });
    }
  }

  // 2. Element Positioning & Layout Calculations
  var spacingX = 220;
  
  var yCursor = 100;
  events.forEach(function(ev) {
    if (ev.type === "message") yCursor += 45;
    else if (ev.type === "note") yCursor += 50 + (ev.text.split("\n").length * 15);
    else if (ev.type === "fragment_start") yCursor += 30;
    else if (ev.type === "operand") yCursor += 25;
    else if (ev.type === "fragment_end") yCursor += 25;
    else if (ev.type === "divider") yCursor += 40;
  });
  
  var lifelineHeight = Math.max(300, yCursor + 50);

  var interaction = diagram._parent;
  var collaboration = interaction ? interaction._parent : null;
  if (!collaboration) {
    collaboration = app.project.getProject();
  }

  var types = app.type;
  var builder = app.repository.getOperationBuilder();
  builder.begin("Import Sequence Diagram");

  try {
    // Create Lifelines
    parsedLifelines.forEach(function (life, index) {
      var posX = index * spacingX + 100;
      var posY = 50;
      var nameClean = sanitizeName(life.name);
      var isActor = life.type === "actor";

      var actorModel = null;
      if (isActor) {
        actorModel = new types.UMLActor();
        actorModel.name = nameClean;
        actorModel._parent = collaboration;
        builder.insert(actorModel);
        builder.fieldInsert(collaboration, "ownedElements", actorModel);
      }

      var roleModel = new types.UMLAttribute();
      roleModel.name = nameClean + "Role";
      if (isActor) roleModel.type = actorModel;
      roleModel._parent = collaboration;
      builder.insert(roleModel);
      builder.fieldInsert(collaboration, "attributes", roleModel);

      var lifelineModel = new types.UMLLifeline();
      lifelineModel.name = nameClean;
      lifelineModel.represent = roleModel;
      lifelineModel._parent = interaction;
      if (life.stereotype) lifelineModel.stereotype = life.stereotype;
      builder.insert(lifelineModel);
      builder.fieldInsert(interaction, "participants", lifelineModel);

      var lifelineView = new types.UMLSeqLifelineView();
      lifelineView._parent = diagram;
      lifelineView.model = lifelineModel;
      if (isActor) lifelineView.stereotypeDisplay = types.UMLGeneralNodeView.SD_ICON;
      lifelineView.initialize(null, posX, posY, posX + 100, posY + lifelineHeight);
      builder.insert(lifelineView);
      builder.fieldInsert(diagram, "ownedViews", lifelineView);

      elementsMap[life.alias] = {
        model: lifelineModel,
        view: lifelineView,
        posX: posX + 50, // center line X
        linePart: lifelineView.linePart
      };
    });

    var currentY = 120;
    var fragmentStack = [];
    var notesToDraw = [];
    var fragmentsToDraw = [];
    var msgViewsToInsert = [];

    events.forEach(function (ev, index) {
      if (ev.type === "message") {
        var tailData = elementsMap[ev.from];
        var headData = elementsMap[ev.to];
        if (!tailData || !headData) return;

        var msgModel = new types.UMLMessage();
        var stereo = "";
        var cleanLabel = ev.label;
        if (cleanLabel.indexOf("<<") !== -1) {
          var matchStereo = cleanLabel.match(/<<([^>]+)>>/);
          if (matchStereo) {
            stereo = matchStereo[1].trim();
            cleanLabel = cleanLabel.replace(/<<[^>]+>>/g, "").trim();
          }
        }
        // StarUML tự động đánh số Message trong Sequence Diagram.
        // Cần luôn luôn cắt bỏ số do người dùng tự gõ (VD: "1: ", "2.", "3 -") để tránh hiển thị "1 : 1. "
        cleanLabel = cleanLabel.replace(/^\d+[\s\.\-:]*\s*/, "");

        if (isAutonumber) {
          msgModel.sequenceNumber = String(msgCount++);
        }
        msgModel.name = cleanLabel;
        if (stereo) msgModel.stereotype = stereo;
        msgModel.messageSort = ev.sort;
        msgModel.source = tailData.model;
        msgModel.target = headData.model;
        msgModel._parent = interaction;
        builder.insert(msgModel);
        builder.fieldInsert(interaction, "messages", msgModel);

        var msgView = new types.UMLSeqMessageView();
        msgView._parent = diagram;
        msgView.model = msgModel;
        msgView.tail = tailData.view.linePart;
        msgView.head = headData.view.linePart;
        if (!msgView.activation) msgView.activation = {};
        msgView.activation.height = 0;

        var x1 = tailData.posX;
        var x2 = headData.posX;
        msgView.initialize(null, x1, currentY, x2, currentY);

        if (msgView.points && msgView.points.points) {
          msgView.points.points.forEach(function (point) {
            point.y = currentY;
          });
        }

        // Defer insertion until activation height is calculated
        msgViewsToInsert.push(msgView);

        headData.lastReceivedMsgView = msgView;

        fragmentStack.forEach(function(fState) {
            fState.minX = Math.min(fState.minX, x1, x2);
            fState.maxX = Math.max(fState.maxX, x1, x2);
        });

        currentY += 45;

      } else if (ev.type === "activate") {
        var targetData = elementsMap[ev.target];
        if (targetData && targetData.lastReceivedMsgView) {
            targetData.activations = targetData.activations || [];
            targetData.activations.push({
                msgView: targetData.lastReceivedMsgView,
                startY: currentY
            });
        }
      } else if (ev.type === "deactivate") {
        var targetData = elementsMap[ev.target];
        if (targetData && targetData.activations && targetData.activations.length > 0) {
            var act = targetData.activations.pop();
            act.msgView.activation.height = Math.max(20, currentY - act.startY);
        }
      } else if (ev.type === "divider") {
        var totalWidth = parsedLifelines.length > 0 ? (parsedLifelines.length - 1) * spacingX + 100 : 800;
        var width = Math.max(200, ev.text.length * 8 + 40);
        notesToDraw.push({
            text: "== " + ev.text + " ==",
            left: (totalWidth / 2) - (width / 2) + 50,
            top: currentY,
            width: width,
            height: 30,
            targetView: null
        });
        currentY += 40;

      } else if (ev.type === "note") {
        var targetData = elementsMap[ev.target];
        if (!targetData) return;
        
        var lines = ev.text.split("\n");
        var width = 150;
        var height = Math.max(40, lines.length * 15 + 20);
        
        var nx = targetData.posX;
        if (ev.position === "right") {
           nx = targetData.posX + 30;
        } else if (ev.position === "left") {
           nx = targetData.posX - width - 30;
        } else {
           nx = targetData.posX - (width / 2);
        }
        
        notesToDraw.push({
            text: ev.text,
            left: nx,
            top: currentY,
            width: width,
            height: height,
            targetView: targetData.view.linePart
        });

        fragmentStack.forEach(function(fState) {
            fState.minX = Math.min(fState.minX, nx);
            fState.maxX = Math.max(fState.maxX, nx + width);
        });

        currentY += height + 15;

      } else if (ev.type === "fragment_start") {
        fragmentStack.push({
            fragType: ev.fragType,
            top: currentY,
            minX: 999999,
            maxX: -999999,
            operands: [{ name: ev.label || "", top: currentY }]
        });
        currentY += 30;

      } else if (ev.type === "operand") {
        if (fragmentStack.length > 0) {
            var fState = fragmentStack[fragmentStack.length - 1];
            var prevOp = fState.operands[fState.operands.length - 1];
            prevOp.height = currentY - prevOp.top;

            fState.operands.push({ name: ev.label || "", top: currentY });
            currentY += 30;
        }

      } else if (ev.type === "fragment_end") {
        if (fragmentStack.length > 0) {
            var fState = fragmentStack.pop();
            var prevOp = fState.operands[fState.operands.length - 1];
            prevOp.height = currentY - prevOp.top + 15;
            
            currentY += 20;

            if (fState.minX > fState.maxX) {
                fState.minX = 100;
                fState.maxX = 300;
            } else {
                fState.minX -= 40;
                fState.maxX += 40;
            }

            fState.bottom = currentY;
            fragmentsToDraw.push(fState);
        }
      }
    });

    // Now that all activation heights are calculated, insert message views
    msgViewsToInsert.forEach(function (mView) {
      builder.insert(mView);
      builder.fieldInsert(diagram, "ownedViews", mView);
    });

    builder.end();
    var cmd = builder.getOperation();
    app.repository.doOperation(cmd);

    // Refresh display
    app.diagrams.setCurrentDiagram(diagram);

    // Draw Notes using app.factory
    notesToDraw.forEach(function(noteData) {
        try {
            var noteView = app.factory.createModelAndView({
                id: "UMLNote",
                parent: interaction, // model parent
                diagram: diagram,
                modelInitializer: function(m) { m.text = noteData.text; },
                viewInitializer: function(v) {
                    v.left = noteData.left;
                    v.top = noteData.top;
                    v.width = noteData.width;
                    v.height = noteData.height;
                }
            });
            if (noteView && noteData.targetView) {
                app.factory.createModelAndView({
                    id: "UMLNoteLink",
                    parent: interaction,
                    diagram: diagram,
                    tailView: noteView,
                    headView: noteData.targetView
                });
            }
        } catch(e) { console.error("Error drawing note", e); }
    });

    // Draw Fragments using app.factory
    fragmentsToDraw.forEach(function(fState) {
        try {
            var fragView = app.factory.createModelAndView({
                id: "UMLCombinedFragment",
                parent: interaction,
                diagram: diagram,
                modelInitializer: function(m) {
                    m.name = "";
                    m.interactionOperator = fState.fragType;
                },
                viewInitializer: function(v) {
                    v.left = fState.minX;
                    v.top = fState.top;
                    v.width = fState.maxX - fState.minX;
                    v.height = fState.bottom - fState.top;
                }
            });

            if (fragView && fragView.model) {
                // Remove auto-generated default operand
                if (fragView.model.operands && fragView.model.operands.length > 0) {
                    // It's safer to just overwrite the first one's name instead of deleting
                    var defaultOp = fragView.model.operands[0];
                    if (fState.operands.length > 0) {
                        defaultOp.name = fState.operands[0].name;
                        // For subsequent operands, create them
                        for (var i = 1; i < fState.operands.length; i++) {
                            app.factory.createModelAndView({
                                id: "UMLInteractionOperand",
                                parent: fragView.model,
                                diagram: diagram,
                                modelInitializer: function(m) {
                                    m.name = fState.operands[i].name;
                                }
                            });
                        }
                    }
                }
            }
        } catch(e) { console.error("Error drawing fragment", e); }
    });

  } catch (e) {
    builder.discard();
    console.error("[sequence-parser] Failed to import sequence diagram:", e);
    throw e;
  }
}

module.exports = {
  generateDiagram: generateDiagram
};

