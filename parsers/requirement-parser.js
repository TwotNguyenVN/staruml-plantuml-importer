function sanitizeName(name) {
  if (!name) return "";
  return name.trim();
}

const parserHelper = require("../utils/parser-helper.js");

function parseRequirementDiagram(text) {
  var ast = {
    requirements: [],
    elements: [],
    relations: [],
    diagnostics: []
  };

  var lines = text.split("\n");
  var inRequirement = false;
  var currentReq = null;
  var relationRows = [];

  for (var i = 0; i < lines.length; i++) {
    var rawLine = lines[i];
    var line = rawLine.trim();
    var col = rawLine.search(/\S/);
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
        else ast.diagnostics.push({ severity: "warning", line: i + 1, message: "Unsupported requirement property: " + propMatch[1] });
      } else {
        ast.diagnostics.push({ severity: "warning", line: i + 1, message: "Unsupported syntax: " + line });
      }
      continue;
    }

    var reqBlockMatch = line.match(/^requirement\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?\s*\{$/i);
    if (reqBlockMatch) {
      var name = reqBlockMatch[1] || reqBlockMatch[2];
      var alias = reqBlockMatch[3] || name;
      var stereo = reqBlockMatch[4] || "";
      currentReq = { alias: alias, name: name, id: "", text: "", risk: "", verifymethod: "", kind: "", stereotype: stereo, row: i + 1, col: col };
      ast.requirements.push(currentReq);
      inRequirement = true;
      continue;
    }

    var reqLineMatch = line.match(/^requirement\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?$/i);
    if (reqLineMatch) {
      var name = reqLineMatch[1] || reqLineMatch[2];
      var alias = reqLineMatch[3] || name;
      var stereo = reqLineMatch[4] || "";
      ast.requirements.push({ alias: alias, name: name, id: "", text: "", risk: "", verifymethod: "", kind: "", stereotype: stereo, row: i + 1, col: col });
      continue;
    }

    var elemMatch = line.match(/^element\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?$/i);
    if (elemMatch) {
      var name = elemMatch[1] || elemMatch[2];
      var alias = elemMatch[3] || name;
      var stereo = elemMatch[4] || "";
      ast.elements.push({ alias: alias, id: alias, name: name, type: "element", docRef: "", stereotype: stereo, row: i + 1, col: col });
      continue;
    }

    var relMatch = line.match(
      /^([a-zA-Z0-9_]+)\s+-+([a-zA-Z]*)-*?>\s+([a-zA-Z0-9_]+)(?:\s*:\s*(.+))?$/
    );
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
      else if (typeStr) {
        ast.diagnostics.push({ severity: "warning", line: i + 1, message: "Unknown relationship arrow: " + typeStr });
        continue;
      }

      var label = relMatch[4] || "";
      ast.relations.push({ type: type, from: from, to: to, label: label });
      relationRows.push(i + 1);
      if (type === "contains" && label.trim()) {
        ast.diagnostics.push({
          severity: "warning",
          line: i + 1,
          message: "Containment relation labels are not supported by StarUML and were omitted."
        });
      }
      continue;
    }

    ast.diagnostics.push({ severity: "warning", line: i + 1, message: "Unsupported syntax: " + line });
  }

  // Deduplicate
  var aliases = Object.create(null);
  var declarations = ast.requirements.map(function(requirement) {
    return { kind: "requirement", value: requirement };
  }).concat(ast.elements.map(function(element) {
    return { kind: "element", value: element };
  })).sort(function(left, right) {
    return left.value.row - right.value.row;
  });
  declarations.forEach(function(declaration) {
    var existing = aliases[declaration.value.alias];
    if (!existing) {
      aliases[declaration.value.alias] = declaration;
      return;
    }
    declaration.duplicate = true;
    var message = existing.kind === declaration.kind
      ? "Duplicate " + declaration.kind + " alias: " + declaration.value.alias
      : "Duplicate alias across requirement and element declarations: " + declaration.value.alias;
    ast.diagnostics.push({ severity: "warning", line: declaration.value.row, message: message });
  });
  ast.requirements = declarations.filter(function(declaration) {
    return declaration.kind === "requirement" && !declaration.duplicate;
  }).map(function(declaration) { return declaration.value; });
  ast.elements = declarations.filter(function(declaration) {
    return declaration.kind === "element" && !declaration.duplicate;
  }).map(function(declaration) { return declaration.value; });

  var reqMap = Object.create(null);
  ast.requirements.forEach(function(requirement) { reqMap[requirement.alias] = requirement; });
  var elemMap = Object.create(null);
  ast.elements.forEach(function(element) { elemMap[element.alias] = element; });

  ast.relations.forEach(function(rel, index) {
    if (!reqMap[rel.from] && !elemMap[rel.from]) {
      ast.diagnostics.push({ severity: "warning", line: relationRows[index], message: "Unresolved relationship endpoint: " + rel.from });
    }
    if (!reqMap[rel.to] && !elemMap[rel.to]) {
      ast.diagnostics.push({ severity: "warning", line: relationRows[index], message: "Unresolved relationship endpoint: " + rel.to });
    }
  });

  return ast;
}

function generateDiagram(diagram, text) {
  return parserHelper.runInTransaction("SysMLRequirementDiagram", function(warnings, errors) {
    var ast = parseRequirementDiagram(text);
    var parentModel = diagram._parent || diagram;
    var builder = app.repository && typeof app.repository.getOperationBuilder === "function"
      ? app.repository.getOperationBuilder()
      : null;

    ast.diagnostics.forEach(function(diagnostic) {
      var diagnosticMessage = diagnostic.message;
      if (diagnosticMessage.indexOf("Unsupported syntax:") === 0) {
        diagnosticMessage = "Unsupported syntax";
      }
      var message = "Line " + diagnostic.line + ": " + diagnosticMessage;
      if (diagnostic.severity === "error") errors.push(message);
      else warnings.push(message);
    });

    var elementsMap = Object.create(null);
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
        if (!builder || typeof app.repository.doOperation !== "function") {
          throw new Error("Requirement containment requires repository operation support");
        }
        var T = typeof type !== "undefined" ? type.UMLContainmentView : (global.type ? global.type.UMLContainmentView : null);
        if (!T) throw new Error("UMLContainmentView type is unavailable");

        var containmentView = new T();
        containmentView.tail = tailView;
        containmentView.head = headView;
        containmentView._parent = diagram;

        var oldOwner = headView.model._parent;
        var oldOwnerElements = oldOwner && oldOwner.ownedElements;
        var newOwnerElements = tailView.model.ownedElements;
        var diagramViews = diagram.ownedViews;
        var oldOwnerHadModel = !!oldOwnerElements && oldOwnerElements.indexOf(headView.model) !== -1;
        var newOwnerHadModel = !!newOwnerElements && newOwnerElements.indexOf(headView.model) !== -1;
        var diagramHadView = !!diagramViews && diagramViews.indexOf(containmentView) !== -1;
        builder.begin("Create requirement containment");
        builder.fieldRemove(oldOwner, "ownedElements", headView.model);
        builder.fieldInsert(tailView.model, "ownedElements", headView.model);
        builder.insert(containmentView);
        builder.fieldInsert(diagram, "ownedViews", containmentView);
        builder.end();
        try {
          app.repository.doOperation(builder.getOperation());
        } catch (operationError) {
          if (oldOwnerElements && oldOwnerHadModel && oldOwnerElements.indexOf(headView.model) === -1) {
            oldOwnerElements.push(headView.model);
          }
          if (newOwnerElements && !newOwnerHadModel) {
            var newOwnerIndex = newOwnerElements.indexOf(headView.model);
            if (newOwnerIndex !== -1) newOwnerElements.splice(newOwnerIndex, 1);
          }
          if (diagramViews && !diagramHadView) {
            var viewIndex = diagramViews.indexOf(containmentView);
            if (viewIndex !== -1) diagramViews.splice(viewIndex, 1);
          }
          headView.model._parent = oldOwner;
          throw operationError;
        }
        headView.model._parent = tailView.model;
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
            m.name = rel.label || "";
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
