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
  var parsedMessages = [];

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
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();

    // Skip comments, empty lines, start/end, title, autonumber
    if (
      !line ||
      line.indexOf("'") === 0 ||
      line.indexOf("@startuml") === 0 ||
      line.indexOf("@enduml") === 0 ||
      line.indexOf("title ") === 0 ||
      line.indexOf("autonumber") === 0
    ) {
      continue;
    }

    // Skip skinparam block
    if (line.indexOf("skinparam") === 0) {
      if (line.indexOf("{") !== -1) {
        while (i < lines.length && lines[i].indexOf("}") === -1) {
          i++;
        }
      }
      continue;
    }

    // Parse Lifelines: actor/participant/database/etc. Name as Alias
    var matchLife = line.match(/^(actor|participant|boundary|control|entity|database|collections)\s+(?:"([^"]+)"|([a-zA-Z0-9_\-]+))\s*(?:as\s+(\w+))?$/i);
    if (matchLife) {
      var lifeType = matchLife[1].toLowerCase();
      var name = matchLife[2] || matchLife[3];
      var alias = matchLife[4] || name;
      
      parsedLifelines.push({
        type: lifeType,
        name: name,
        alias: alias
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

      // Implicitly register lifelines if they weren't declared
      getOrCreateLifeline(from);
      getOrCreateLifeline(to);

      parsedMessages.push({
        from: from,
        to: to,
        sort: getMessageSort(arrow),
        label: label
      });
    }
  }

  // 2. Element Positioning & Layout Calculations
  var spacingX = 220;
  var totalMessages = parsedMessages.length;
  var lifelineHeight = Math.max(300, totalMessages * 45 + 120);

  var interaction = diagram._parent;
  var collaboration = interaction ? interaction._parent : null;
  if (!collaboration) {
    collaboration = app.project.getProject();
  }

  // Use app.type explicitly to prevent any variable shadowing issues (e.g. from local `type` variables)
  var types = app.type;

  // Prepare repository operation builder
  var builder = app.repository.getOperationBuilder();
  builder.begin("Import Sequence Diagram");

  try {
    // Create Lifelines
    parsedLifelines.forEach(function (life, index) {
      var posX = index * spacingX + 100;
      var posY = 50;
      var nameClean = sanitizeName(life.name);
      var isActor = life.type === "actor";

      // Create Actor model if type is actor
      var actorModel = null;
      if (isActor) {
        actorModel = new types.UMLActor();
        actorModel.name = nameClean;
        actorModel._parent = collaboration;
        builder.insert(actorModel);
        builder.fieldInsert(collaboration, "ownedElements", actorModel);
      }

      // Create Role (Attribute)
      var roleModel = new types.UMLAttribute();
      roleModel.name = nameClean + "Role";
      if (isActor) {
        roleModel.type = actorModel;
      }
      roleModel._parent = collaboration;
      builder.insert(roleModel);
      builder.fieldInsert(collaboration, "attributes", roleModel);

      // Create Lifeline model
      var lifelineModel = new types.UMLLifeline();
      lifelineModel.name = nameClean;
      lifelineModel.represent = roleModel;
      lifelineModel._parent = interaction;
      builder.insert(lifelineModel);
      builder.fieldInsert(interaction, "participants", lifelineModel);

      // Create LifelineView
      var lifelineView = new types.UMLSeqLifelineView();
      lifelineView._parent = diagram;
      lifelineView.model = lifelineModel;
      if (isActor) {
        lifelineView.stereotypeDisplay = types.UMLGeneralNodeView.SD_ICON;
      }
      lifelineView.initialize(null, posX, posY, posX + 100, posY + lifelineHeight);
      builder.insert(lifelineView);
      builder.fieldInsert(diagram, "ownedViews", lifelineView);

      elementsMap[life.alias] = {
        model: lifelineModel,
        view: lifelineView
      };
    });

    // Create Messages
    parsedMessages.forEach(function (msg, index) {
      var tailData = elementsMap[msg.from];
      var headData = elementsMap[msg.to];

      if (!tailData || !headData) {
        console.warn(
          "[sequence-parser] Skipping message: " +
          msg.from + " -> " + msg.to + " (missing lifeline)"
        );
        return;
      }

      var tailView = tailData.view;
      var headView = headData.view;
      var tailModel = tailData.model;
      var headModel = headData.model;

      var y = 120 + index * 45;

      // Create Message model
      var msgModel = new types.UMLMessage();
      msgModel.name = msg.label;
      msgModel.messageSort = msg.sort;
      msgModel.source = tailModel;
      msgModel.target = headModel;
      msgModel._parent = interaction;
      builder.insert(msgModel);
      builder.fieldInsert(interaction, "messages", msgModel);

      // Create UMLSeqMessageView
      var msgView = new types.UMLSeqMessageView();
      msgView._parent = diagram;
      msgView.model = msgModel;
      msgView.tail = tailView.linePart;
      msgView.head = headView.linePart;
      msgView.activation.height = 0;

      var x1 = tailView.left + tailView.width / 2;
      var x2 = headView.left + headView.width / 2;

      msgView.initialize(null, x1, y, x2, y);

      // Adjust points to be exactly horizontal at Y
      if (msgView.points && msgView.points.points) {
        msgView.points.points.forEach(function (point) {
          point.y = y;
        });
      }

      builder.insert(msgView);
      builder.fieldInsert(diagram, "ownedViews", msgView);
    });

    // Execute the bulk repository operation
    builder.end();
    var cmd = builder.getOperation();
    app.repository.doOperation(cmd);

    // Refresh display
    app.diagrams.setCurrentDiagram(diagram);
  } catch (e) {
    builder.discard();
    console.error("[sequence-parser] Failed to import sequence diagram:", e);
    throw e;
  }
}

module.exports = {
  generateDiagram: generateDiagram
};
