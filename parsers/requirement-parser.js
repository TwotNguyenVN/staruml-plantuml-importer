function sanitizeName(name) {
  if (!name) return "";
  return name.trim();
}

const parserHelper = require("../utils/parser-helper.js");

function parseRequirementDiagram(text) {
  var ast = {
    requirements: [],
    elements: [],
    relations: []
  };

  var lines = text.split("\n");
  var inRequirement = false;
  var currentReq = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.indexOf("'") === 0 || line.indexOf("@startuml") === 0 || line.indexOf("@enduml") === 0) continue;

    if (inRequirement) {
      if (line === "}") {
        inRequirement = false;
        currentReq = null;
        continue;
      }
      var propMatch = line.match(/^([a-zA-Z0-9_]+)\s*:\s*(.+)$/);
      if (propMatch) {
        var key = propMatch[1].toLowerCase();
        var val = propMatch[2].trim();
        if (key === "id") currentReq.id = val;
        else if (key === "text") currentReq.text = val;
        else if (key === "risk") currentReq.risk = val;
        else if (key === "verifymethod") currentReq.verifymethod = val;
        else if (key === "kind") currentReq.kind = val;
      }
      continue;
    }

    var reqBlockMatch = line.match(/^requirement\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?\s*\{$/i);
    if (reqBlockMatch) {
      var name = reqBlockMatch[1] || reqBlockMatch[2];
      var alias = reqBlockMatch[3] || name;
      var stereo = reqBlockMatch[4] || "";
      currentReq = { alias: alias, name: name, id: "", text: "", risk: "", verifymethod: "", kind: "", stereotype: stereo };
      ast.requirements.push(currentReq);
      inRequirement = true;
      continue;
    }

    var reqLineMatch = line.match(/^requirement\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?$/i);
    if (reqLineMatch) {
      var name = reqLineMatch[1] || reqLineMatch[2];
      var alias = reqLineMatch[3] || name;
      var stereo = reqLineMatch[4] || "";
      ast.requirements.push({ alias: alias, name: name, id: "", text: "", risk: "", verifymethod: "", kind: "", stereotype: stereo });
      continue;
    }

    var elemMatch = line.match(/^element\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?$/i);
    if (elemMatch) {
      var name = elemMatch[1] || elemMatch[2];
      var alias = elemMatch[3] || name;
      var stereo = elemMatch[4] || "";
      ast.elements.push({ alias: alias, name: name, type: "element", stereotype: stereo });
      continue;
    }

    var relMatch = line.match(/^([a-zA-Z0-9_]+)\s+-+([a-zA-Z]*)-*>\s+([a-zA-Z0-9_]+)$/);
    if (relMatch) {
      var from = relMatch[1];
      var typeStr = relMatch[2].toLowerCase();
      var to = relMatch[3];
      var type = "traces"; // default
      if (typeStr === "satisfies" || typeStr === "satisfy") type = "satisfies";
      else if (typeStr === "derives" || typeStr === "derive") type = "derives";
      else if (typeStr === "verifies" || typeStr === "verify") type = "verifies";
      else if (typeStr === "refines" || typeStr === "refine") type = "refines";
      else if (typeStr === "copies" || typeStr === "copy") type = "copies";
      else if (typeStr === "contains" || typeStr === "contain") type = "contains";
      else if (typeStr === "traces" || typeStr === "trace") type = "traces";
      
      ast.relations.push({ type: type, from: from, to: to, label: "" });
    }
  }

  // Deduplicate
  var reqMap = {};
  var dedupReqs = [];
  ast.requirements.forEach(function(r) {
    if (!reqMap[r.alias]) {
      reqMap[r.alias] = r;
      dedupReqs.push(r);
    }
  });
  ast.requirements = dedupReqs;

  var elemMap = {};
  var dedupElems = [];
  ast.elements.forEach(function(e) {
    if (!elemMap[e.alias]) {
      elemMap[e.alias] = e;
      dedupElems.push(e);
    }
  });
  ast.elements = dedupElems;

  return ast;
}

function generateDiagram(diagram, text) {
  return parserHelper.runInTransaction("SysMLRequirementDiagram", function(warnings, errors) {
    var ast = parseRequirementDiagram(text);
    var parentModel = diagram._parent || diagram;
    var builder = app.repository ? app.repository.getOperationBuilder() : null; // In tests we might not have builder if mock creates it implicitly, wait parser-helper handles it.

    var elementsMap = {};
    var currentX = 50;
    var currentY = 50;

    ast.requirements.forEach(function(req) {
      var view = app.factory.createModelAndView({
        id: "SysMLRequirement",
        parent: parentModel,
        diagram: diagram,
        modelInitializer: function(m) {
          m.name = sanitizeName(req.name);
          m.id = req.id || "";
          m.text = req.text || "";
          
          var doc = [];
          if (req.risk) doc.push("Risk: " + req.risk);
          if (req.verifymethod) doc.push("VerifyMethod: " + req.verifymethod);
          m.documentation = doc.join("\n");

          var stereo = req.stereotype;
          if (!stereo) {
             var lower = (m.name + " " + m.text).toLowerCase();
             if (lower.indexOf("performance") !== -1) stereo = "performanceRequirement";
             else if (lower.indexOf("interface") !== -1) stereo = "interfaceRequirement";
             else if (lower.indexOf("physical") !== -1) stereo = "physicalRequirement";
             else if (lower.indexOf("design constraint") !== -1) stereo = "designConstraint";
             else if (lower.indexOf("functional") !== -1) stereo = "functionalRequirement";
          }
          if (stereo) m.stereotype = stereo;
        },
        viewInitializer: function(v) {
          var w = 150;
          var h = 90;
          if (v.initialize) v.initialize(null, currentX, currentY, currentX + w, currentY + h);
          v.left = currentX;
          v.top = currentY;
          v.width = w;
          v.height = h;
        }
      });
      if (view) {
        elementsMap[req.alias] = view;
      }
      currentX += 250;
      if (currentX > 800) {
        currentX = 50;
        currentY += 150;
      }
    });

    ast.elements.forEach(function(elem) {
      var view = app.factory.createModelAndView({
        id: "UMLClass",
        parent: parentModel,
        diagram: diagram,
        modelInitializer: function(m) {
          m.name = sanitizeName(elem.name);
          m.stereotype = "element";
        },
        viewInitializer: function(v) {
          var w = 150;
          var h = 60;
          if (v.initialize) v.initialize(null, currentX, currentY, currentX + w, currentY + h);
          v.left = currentX;
          v.top = currentY;
          v.width = w;
          v.height = h;
        }
      });
      if (view) {
        elementsMap[elem.alias] = view;
      }
      currentX += 200;
      if (currentX > 800) {
        currentX = 50;
        currentY += 150;
      }
    });

    ast.relations.forEach(function(rel) {
      var tailView = elementsMap[rel.from];
      var headView = elementsMap[rel.to];
      if (!tailView || !headView) return;

      var typeId = "";
      if (rel.type === "satisfies") typeId = "SysMLSatisfy";
      else if (rel.type === "derives") typeId = "SysMLDeriveReqt";
      else if (rel.type === "verifies") typeId = "SysMLVerify";
      else if (rel.type === "refines") typeId = "SysMLRefine";
      else if (rel.type === "copies") typeId = "SysMLCopy";
      else if (rel.type === "traces") typeId = "UMLDependency";
      else if (rel.type === "contains") typeId = "UMLContainmentView";

      if (typeId === "UMLContainmentView") {
        try {
          var T = typeof type !== "undefined" ? type.UMLContainmentView : (global.type ? global.type.UMLContainmentView : null);
          if (T) {
            var v = new T();
            v.tail = tailView;
            v.head = headView;
            v._parent = diagram;
            if (builder && builder.insert) {
              builder.insert(v);
              builder.fieldInsert(diagram, "ownedViews", v);
            }
          }
        } catch (e) {
           console.warn("Failed to create UMLContainmentView", e);
        }
      } else {
        app.factory.createModelAndView({
          id: typeId,
          parent: tailView.model,
          diagram: diagram,
          tailView: tailView,
          headView: headView,
          modelInitializer: function(m) {
            m.source = tailView.model;
            m.target = headView.model;
            if (rel.type === "traces") {
              m.stereotype = "trace";
            }
          }
        });
      }
    });

  });
}

module.exports = {
  parseRequirementDiagram: parseRequirementDiagram,
  generateDiagram: generateDiagram
};
