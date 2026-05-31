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
      var type = matchLife[1].toLowerCase();
      var name = matchLife[2] || matchLife[3];
      var alias = matchLife[4] || name;
      
      parsedLifelines.push({
        type: type,
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

  var parentModel = diagram._parent || app.project.getProject();

  // Create Lifelines
  parsedLifelines.forEach(function (life, index) {
    var posX = index * spacingX + 100;
    var posY = 50;
    var nameClean = sanitizeName(life.name);

    try {
      var view = app.factory.createModelAndView({
        id: "UMLLifeline",
        parent: parentModel,
        diagram: diagram,
        modelInitializer: function (model) {
          model.name = nameClean;
        },
        viewInitializer: function (dgmView) {
          dgmView.left = posX;
          dgmView.top = posY;
          dgmView.width = 100;
          dgmView.height = lifelineHeight;
        }
      });

      if (view) {
        elementsMap[life.alias] = view;
      }
    } catch (e) {
      console.error("[sequence-parser] Failed to create lifeline:", life.name, e);
    }
  });

  // Create Messages
  parsedMessages.forEach(function (msg, index) {
    var tailView = elementsMap[msg.from];
    var headView = elementsMap[msg.to];

    if (!tailView || !headView) {
      console.warn(
        "[sequence-parser] Skipping message: " +
        msg.from + " -> " + msg.to + " (missing lifeline)"
      );
      return;
    }

    var x1 = tailView.left + tailView.width / 2;
    var x2 = headView.left + headView.width / 2;
    var y = 120 + index * 45;

    try {
      var view = app.factory.createModelAndView({
        id: "UMLMessage",
        parent: parentModel,
        diagram: diagram,
        tailView: tailView,
        headView: headView,
        tailModel: tailView.model,
        headModel: headView.model,
        modelInitializer: function (model) {
          model.name = msg.label;
          model.messageSort = msg.sort;
        }
      });

      if (view && view.points) {
        view.points.clear();
        view.points.add({ x: x1, y: y });
        view.points.add({ x: x2, y: y });
      }
    } catch (e) {
      console.error(
        "[sequence-parser] Failed to create message:",
        msg.label, msg.from, "->", msg.to, e
      );
    }
  });
}

module.exports = {
  generateDiagram: generateDiagram
};
