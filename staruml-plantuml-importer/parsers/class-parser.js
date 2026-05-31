/**
 * Class Diagram Parser & Layout Module for StarUML Importer Extension
 */

function sanitizeName(name) {
  if (!name) return "";
  return name.trim();
}

function parseVisibility(char) {
  switch (char) {
    case "+": return "public";
    case "-": return "private";
    case "#": return "protected";
    case "~": return "package";
    default: return "public";
  }
}

function parseParameters(paramsStr) {
  if (!paramsStr) return [];
  var parts = paramsStr.split(",");
  var params = [];
  parts.forEach(function (part) {
    part = part.trim();
    if (!part) return;
    
    // Check "name: type"
    var matchParam = part.match(/^(\w+)\s*:\s*(.+)$/);
    if (matchParam) {
      params.push({
        name: matchParam[1],
        type: matchParam[2].trim()
      });
    } else {
      // Check "type name"
      var matchParam2 = part.match(/^([^\s]+)\s+(\w+)$/);
      if (matchParam2) {
        params.push({
          name: matchParam2[2],
          type: matchParam2[1]
        });
      } else {
        params.push({
          name: part
        });
      }
    }
  });
  return params;
}

function generateDiagram(diagram, text) {
  var lines = text.split("\n");
  var elementsMap = {};
  var elements = [];
  var relations = [];
  
  var currentElement = null;
  
  // 1. Parser Engine (Line by line)
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    
    // Skip empty, comments, directives, title, skinparam
    if (
      !line ||
      line.indexOf("'") === 0 ||
      line.indexOf("@startuml") === 0 ||
      line.indexOf("@enduml") === 0 ||
      line.indexOf("title ") === 0 ||
      line.indexOf("left to right") === 0 ||
      line.indexOf("top to bottom") === 0
    ) {
      continue;
    }
    
    // Skip skinparam block
    if (line.indexOf("skinparam") === 0) {
      if (line.indexOf("{") !== -1) {
        // block skinparam
        while (i < lines.length && lines[i].indexOf("}") === -1) {
          i++;
        }
      }
      continue;
    }
    
    // End of block
    if (line === "}") {
      currentElement = null;
      continue;
    }
    
    // If inside class/enum/interface block
    if (currentElement) {
      if (currentElement.type === "UMLEnumeration") {
        var cleanLit = line.replace(/,/g, "").trim();
        if (cleanLit) {
          currentElement.literals.push(cleanLit);
        }
      } else {
        // Parse attributes and operations
        // Operations: has parentheses
        var matchOp = line.match(/^([-+#~])?\s*(\w+)\s*\(([^)]*)\)\s*(?::\s*(.+))?$/);
        if (matchOp) {
          currentElement.operations.push({
            name: matchOp[2],
            visibility: parseVisibility(matchOp[1]),
            parameters: parseParameters(matchOp[3]),
            returnType: matchOp[4] ? matchOp[4].trim() : ""
          });
        } else {
          // Attributes
          var matchAttr = line.match(/^([-+#~])?\s*(\w+)\s*:\s*(.+)$/);
          if (matchAttr) {
            currentElement.attributes.push({
              name: matchAttr[2],
              visibility: parseVisibility(matchAttr[1]),
              type: matchAttr[3].trim()
            });
          } else {
            var matchAttr2 = line.match(/^([-+#~])?\s*([^\s]+)\s+(\w+)$/);
            if (matchAttr2) {
              currentElement.attributes.push({
                name: matchAttr2[3],
                visibility: parseVisibility(matchAttr2[1]),
                type: matchAttr2[2]
              });
            } else {
              var cleanAttr = line.replace(/[-+#~]/, "").trim();
              if (cleanAttr) {
                var visChar = line.match(/^([-+#~])/);
                currentElement.attributes.push({
                  name: cleanAttr,
                  visibility: parseVisibility(visChar ? visChar[0] : "")
                });
              }
            }
          }
        }
      }
      continue;
    }
    
    // Check start of class/interface/enum block
    var matchBlock = line.match(/^(abstract\s+class|class|interface|enum)\s+(\w+)(?:\s+as\s+(\w+))?\s*\{?$/);
    if (matchBlock) {
      var blockType = matchBlock[1];
      var blockName = matchBlock[2];
      var alias = matchBlock[3] || blockName;
      
      var type = "UMLClass";
      var isAbstract = false;
      if (blockType === "interface") type = "UMLInterface";
      else if (blockType === "enum") type = "UMLEnumeration";
      else if (blockType === "abstract class") {
        type = "UMLClass";
        isAbstract = true;
      }
      
      currentElement = {
        type: type,
        name: blockName,
        alias: alias,
        isAbstract: isAbstract,
        attributes: [],
        operations: [],
        literals: []
      };
      elements.push(currentElement);
      continue;
    }
    
    // Relations (e.g. A <|-- B, A --|> B, A "1" o-- "0..*" B, etc.)
    // Matches: LeftName "LeftMult" RelationSymbol "RightMult" RightName : label
    var matchRel = line.match(/^([a-zA-Z0-9_\.]+)\s*(?:"([^"]+)")?\s*([<|o*.\-~]+)\s*(?:"([^"]+)")?\s*([a-zA-Z0-9_\.]+)(?:\s*:\s*([^>]+)?\s*([><])?)?$/);
    if (matchRel) {
      var left = matchRel[1];
      var leftMult = matchRel[2] || "";
      var arrow = matchRel[3];
      var rightMult = matchRel[4] || "";
      var right = matchRel[5];
      var label = matchRel[6] ? matchRel[6].trim() : "";
      
      var relType = "UMLAssociation";
      var tailAggregation = "none";
      var headAggregation = "none";
      
      if (arrow.indexOf("<|--") !== -1 || arrow.indexOf("--|>") !== -1) {
        relType = "UMLGeneralization";
      } else if (arrow.indexOf("<|..") !== -1 || arrow.indexOf("..|>") !== -1) {
        relType = "UMLInterfaceRealization";
      } else if (arrow.indexOf("..>") !== -1) {
        relType = "UMLDependency";
      } else if (arrow.indexOf("o--") !== -1) {
        relType = "UMLAssociation";
        tailAggregation = "shared";
      } else if (arrow.indexOf("--o") !== -1) {
        relType = "UMLAssociation";
        headAggregation = "shared";
      } else if (arrow.indexOf("*--") !== -1) {
        relType = "UMLAssociation";
        tailAggregation = "composite";
      } else if (arrow.indexOf("--*") !== -1) {
        relType = "UMLAssociation";
        headAggregation = "composite";
      }
      
      var from = left;
      var to = right;
      
      // Generalization and Realization direction normalization
      if (arrow.indexOf("<|--") !== -1 || arrow.indexOf("<|..") !== -1) {
        from = right;
        to = left;
      } else if (arrow.indexOf("--|>") !== -1 || arrow.indexOf("..|>") !== -1) {
        from = left;
        to = right;
      }
      
      relations.push({
        type: relType,
        from: from,
        to: to,
        leftMult: leftMult,
        rightMult: rightMult,
        tailAggregation: tailAggregation,
        headAggregation: headAggregation,
        label: label
      });
    }
  }
  
  // 2. Classify Elements for Hierarchical Grid Layout
  var enumsList = [];
  var coreList = [];
  var concreteList = [];
  var transactionList = [];
  var serviceList = [];
  
  elements.forEach(function (el) {
    var nameLower = el.name.toLowerCase();
    
    if (el.type === "UMLEnumeration") {
      enumsList.push(el);
    } else if (nameLower.indexOf("service") !== -1 || nameLower.indexOf("controller") !== -1 || nameLower.indexOf("api") !== -1) {
      serviceList.push(el);
    } else if (el.isAbstract || el.type === "UMLInterface" || el.name === "Library" || el.name === "Book" || el.name === "User") {
      coreList.push(el);
    } else if (
      nameLower.indexOf("loan") !== -1 ||
      nameLower.indexOf("reservation") !== -1 ||
      nameLower.indexOf("fine") !== -1 ||
      nameLower.indexOf("payment") !== -1 ||
      nameLower.indexOf("review") !== -1 ||
      nameLower.indexOf("notification") !== -1 ||
      nameLower.indexOf("receipt") !== -1 ||
      nameLower.indexOf("policy") !== -1 ||
      nameLower.indexOf("detail") !== -1 ||
      nameLower.indexOf("report") !== -1
    ) {
      transactionList.push(el);
    } else {
      concreteList.push(el);
    }
  });
  
  var parentModel = diagram._parent || app.project.getProject();
  
  // Helper to layout row
  function layoutRow(rowElements, startY, spacingX) {
    rowElements.forEach(function (el, colIndex) {
      // Calculate dynamic width based on name & members
      var maxLength = el.name.length;
      el.attributes.forEach(function (attr) {
        var len = (attr.name + ": " + (attr.type || "")).length + 3;
        if (len > maxLength) maxLength = len;
      });
      el.operations.forEach(function (op) {
        var len = op.name.length + 15;
        if (len > maxLength) maxLength = len;
      });
      el.literals.forEach(function (lit) {
        if (lit.length > maxLength) maxLength = lit.length;
      });
      
      var width = Math.max(180, maxLength * 7.5);
      var height = Math.max(65, 45 + (el.attributes.length + el.operations.length + el.literals.length) * 15);
      
      var posX = colIndex * spacingX + 50;
      var posY = startY;
      
      try {
        var view = app.factory.createModelAndView({
          id: el.type,
          parent: parentModel,
          diagram: diagram,
          modelInitializer: function (model) {
            model.name = el.name;
            if (el.isAbstract) model.isAbstract = true;
          },
          viewInitializer: function (dgmView) {
            dgmView.left = posX;
            dgmView.top = posY;
            dgmView.width = width;
            dgmView.height = height;
          }
        });
        
        if (view && view.model) {
          elementsMap[el.alias] = view;
          var model = view.model;
          
          // Add attributes
          el.attributes.forEach(function (attrData) {
            try {
              app.factory.createModel({
                id: "UMLAttribute",
                parent: model,
                modelInitializer: function (attr) {
                  attr.name = attrData.name;
                  attr.type = attrData.type || "";
                  attr.visibility = attrData.visibility;
                }
              });
            } catch (errAttr) {
              console.error("[class-parser] Failed to create attribute:", attrData.name, errAttr);
            }
          });
          
          // Add operations
          el.operations.forEach(function (opData) {
            try {
              var opModel = app.factory.createModel({
                id: "UMLOperation",
                parent: model,
                modelInitializer: function (op) {
                  op.name = opData.name;
                  op.type = opData.returnType || "";
                  op.visibility = opData.visibility;
                }
              });
              
              opData.parameters.forEach(function (paramData) {
                try {
                  app.factory.createModel({
                    id: "UMLParameter",
                    parent: opModel,
                    modelInitializer: function (param) {
                      param.name = paramData.name;
                      param.type = paramData.type || "";
                      param.direction = "in";
                    }
                  });
                } catch (errParam) {
                  console.error("[class-parser] Failed to create parameter:", paramData.name, errParam);
                }
              });
            } catch (errOp) {
              console.error("[class-parser] Failed to create operation:", opData.name, errOp);
            }
          });
          
          // Add literals (for enums)
          el.literals.forEach(function (litName) {
            try {
              app.factory.createModel({
                id: "UMLEnumerationLiteral",
                parent: model,
                modelInitializer: function (lit) {
                  lit.name = litName;
                }
              });
            } catch (errLit) {
              console.error("[class-parser] Failed to create literal:", litName, errLit);
            }
          });
        }
      } catch (e) {
        console.error("[class-parser] Failed to create element:", el.name, e);
      }
    });
  }
  
  // Layout rows
  layoutRow(enumsList, 50, 240);
  layoutRow(coreList, 300, 360);
  layoutRow(concreteList, 650, 360);
  layoutRow(transactionList, 1050, 360);
  layoutRow(serviceList, 1500, 380);
  
  // 3. Create Relations
  relations.forEach(function (rel) {
    var tailView = elementsMap[rel.from];
    var headView = elementsMap[rel.to];
    
    if (!tailView || !headView) {
      console.warn(
        "[class-parser] Skipping relation: " +
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
        headModel: headView.model,
        modelInitializer: function (model) {
          if (rel.type === "UMLAssociation") {
            model.end1.multiplicity = rel.leftMult;
            model.end2.multiplicity = rel.rightMult;
            model.end1.aggregation = rel.tailAggregation;
            model.end2.aggregation = rel.headAggregation;
            model.name = rel.label;
          }
        }
      });
    } catch (e) {
      console.error(
        "[class-parser] Failed to create relation:",
        rel.type, rel.from, "->", rel.to, e
      );
    }
  });
}

module.exports = {
  generateDiagram: generateDiagram
};
