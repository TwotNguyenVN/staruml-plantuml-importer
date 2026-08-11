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

const parserHelper = require("../utils/parser-helper.js");

function generateDiagram(diagram, text) {
  return parserHelper.runInTransaction("UMLClassDiagram", function(warnings, errors) {
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
    var matchBlock = line.match(/^(abstract\s+class|class|interface|enum)\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?\s*\{?$/);
    if (matchBlock) {
      var blockType = matchBlock[1];
      var blockName = matchBlock[2] || matchBlock[3];
      var alias = matchBlock[4] || blockName;
      var stereotype = matchBlock[5] || "";

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
        stereotype: stereotype,
        attributes: [],
        operations: [],
        literals: []
      };
      elements.push(currentElement);
      continue;
    }

    // Relations (e.g. A <|-- B, A --|> B, A "1" o-- "0..*" B, etc.)
    // Matches: LeftName "LeftMult" RelationSymbol "RightMult" RightName : label
    var matchRel = line.match(/^([a-zA-Z0-9_\.]+)\s*(?:"([^"]+)")?\s*([<|o*.\-~>]+)\s*(?:"([^"]+)")?\s*([a-zA-Z0-9_\.]+)(?:\s*:\s*(.*?)(?:\s+([><]))?)?$/);
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

  // 2. Build Graph for Hierarchical (Sugiyama-style) Layout
  var nodesMap = {};
  elements.forEach(function(e) {
    nodesMap[e.alias] = {
      data: e,
      edgesIn: [],
      edgesOut: [],
      level: 0,
      avgParentIndex: 0
    };
  });

  relations.forEach(function(r) {
    var from = r.from;
    var to = r.to;
    // Reverse generalization direction for layout logic (Parent above Child)
    if (r.type === "UMLGeneralization" || r.type === "UMLInterfaceRealization") {
      from = r.to;
      to = r.from;
    }

    if (nodesMap[from] && nodesMap[to]) {
      nodesMap[from].edgesOut.push(to);
      nodesMap[to].edgesIn.push(from);
    }
  });

  // Level Assignment (Bellman-Ford style for longest path)
  var changed = true;
  var iterations = 0;
  while(changed && iterations < elements.length) {
    changed = false;
    relations.forEach(function(r) {
      var from = r.from;
      var to = r.to;
      if (r.type === "UMLGeneralization" || r.type === "UMLInterfaceRealization") {
        from = r.to; to = r.from;
      }

      var nodeFrom = nodesMap[from];
      var nodeTo = nodesMap[to];

      if (nodeFrom && nodeTo) {
        if (nodeTo.level <= nodeFrom.level) {
          nodeTo.level = nodeFrom.level + 1;
          changed = true;
        }
      }
    });
    iterations++;
  }

  // 2.1 Edge Shortening (Push-Down logic)
  // Pull independent nodes down closer to their children
  var maxLevel = 0;
  Object.keys(nodesMap).forEach(function(k) {
    if (nodesMap[k].level > maxLevel) maxLevel = nodesMap[k].level;
  });

  for (var i = maxLevel - 1; i >= 0; i--) {
    Object.keys(nodesMap).forEach(function(k) {
      var node = nodesMap[k];
      if (node.level === i && node.edgesOut.length > 0) {
        var minChildLevel = Infinity;
        node.edgesOut.forEach(function(childId) {
          if (nodesMap[childId] && nodesMap[childId].level < minChildLevel) {
            minChildLevel = nodesMap[childId].level;
          }
        });
        if (minChildLevel !== Infinity && minChildLevel > node.level + 1) {
          node.level = minChildLevel - 1;
        }
      }
    });
  }

  // Group by Level
  var levels = [];
  Object.keys(nodesMap).forEach(function(key) {
    var n = nodesMap[key];
    if (!levels[n.level]) levels[n.level] = [];
    levels[n.level].push(n);
  });

  // Remove empty levels
  levels = levels.filter(function(l) { return l !== undefined && l.length > 0; });

  // 2.2 Multi-pass Barycenter Heuristic (Reduce crossings)
  for (var iter = 0; iter < 4; iter++) {
    // Sweep Down
    for (var i = 1; i < levels.length; i++) {
      levels[i].forEach(function(node) {
        var sum = 0;
        var count = 0;
        node.edgesIn.forEach(function(parentId) {
          var parentNode = nodesMap[parentId];
          if (parentNode && parentNode.level === i - 1) {
            var pIndex = levels[i - 1].indexOf(parentNode);
            if (pIndex !== -1) {
              sum += pIndex;
              count++;
            }
          }
        });
        node.barycenter = count > 0 ? sum / count : levels[i].indexOf(node);
      });
      levels[i].sort(function(a, b) {
        return a.barycenter - b.barycenter;
      });
    }

    // Sweep Up
    for (var i = levels.length - 2; i >= 0; i--) {
      levels[i].forEach(function(node) {
        var sum = 0;
        var count = 0;
        node.edgesOut.forEach(function(childId) {
          var childNode = nodesMap[childId];
          if (childNode && childNode.level === i + 1) {
            var cIndex = levels[i + 1].indexOf(childNode);
            if (cIndex !== -1) {
              sum += cIndex;
              count++;
            }
          }
        });
        node.barycenter = count > 0 ? sum / count : levels[i].indexOf(node);
      });
      levels[i].sort(function(a, b) {
        return a.barycenter - b.barycenter;
      });
    }
  }

  var parentModel = diagram._parent || app.project.getProject();

  // 3. Layout Grid & Calculate Coordinates (Symmetrical Centered Grid)
  var currentY = 50;
  var verticalSpacing = 150;
  var horizontalSpacing = 100;

  // First pass: calculate widths, heights, and total width of each level
  var levelWidths = [];
  var maxDiagramWidth = 0;

  levels.forEach(function(levelNodes, i) {
    var totalWidth = 0;
    levelNodes.forEach(function(nodeNode) {
      var el = nodeNode.data;
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

      nodeNode.width = width;
      nodeNode.height = height;

      totalWidth += width + horizontalSpacing;
    });

    totalWidth -= horizontalSpacing; // Remove trailing spacing
    levelWidths[i] = totalWidth;
    if (totalWidth > maxDiagramWidth) maxDiagramWidth = totalWidth;
  });

  // Second pass: Assign coordinates with center alignment
  levels.forEach(function(levelNodes, i) {
    // Center this level relative to the max diagram width
    var currentX = 50 + (maxDiagramWidth - levelWidths[i]) / 2;
    var maxLevelHeight = 0;

    levelNodes.forEach(function(nodeNode) {
      nodeNode.x = currentX;
      nodeNode.y = currentY;

      currentX += nodeNode.width + horizontalSpacing;
      if (nodeNode.height > maxLevelHeight) maxLevelHeight = nodeNode.height;
    });

    currentY += maxLevelHeight + verticalSpacing;
  });

  // 4. Create Models and Views in StarUML
  levels.forEach(function(levelNodes) {
    levelNodes.forEach(function(nodeNode) {
      var el = nodeNode.data;
      var width = nodeNode.width;
      var height = nodeNode.height;
      var posX = Math.round(nodeNode.x);
      var posY = Math.round(nodeNode.y);

      try {
        var view = app.factory.createModelAndView({
          id: el.type,
          parent: parentModel,
          diagram: diagram,
          modelInitializer: function (model) {
            model.name = el.name;
            if (el.isAbstract) model.isAbstract = true;
            if (el.stereotype) model.stereotype = el.stereotype;
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
                field: "attributes",
                modelInitializer: function (attr) {
                  attr.name = attrData.name;
                  attr.type = attrData.type || "";
                  attr.visibility = attrData.visibility;
                }
              });
            } catch (errAttr) {
              console.error("[class-parser] Failed to create an attribute.");
              throw errAttr;
            }
          });

          // Add operations
          el.operations.forEach(function (opData) {
            try {
              var opModel = app.factory.createModel({
                id: "UMLOperation",
                parent: model,
                field: "operations",
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
                    field: "parameters",
                    modelInitializer: function (param) {
                      param.name = paramData.name;
                      param.type = paramData.type || "";
                      param.direction = "in";
                    }
                  });
                } catch (errParam) {
                  console.error("[class-parser] Failed to create a parameter.");
                  throw errParam;
                }
              });
            } catch (errOp) {
              console.error("[class-parser] Failed to create an operation.");
              throw errOp;
            }
          });

          // Add literals (for enums)
          el.literals.forEach(function (litName) {
            try {
              app.factory.createModel({
                id: "UMLEnumerationLiteral",
                parent: model,
                field: "literals",
                modelInitializer: function (lit) {
                  lit.name = litName;
                }
              });
            } catch (errLit) {
              console.error("[class-parser] Failed to create a literal.");
              throw errLit;
            }
          });
        }
      } catch (e) {
        console.error("[class-parser] Failed to create an element.");
        throw e;
      }
    });
  });

  // 3. Create Relations
  relations.forEach(function (rel) {
    var tailView = elementsMap[rel.from];
    var headView = elementsMap[rel.to];

    if (!tailView || !headView) {
      console.warn("[class-parser] Skipping a relation with a missing element.");
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

            var stereo = "";
            var cleanLabel = rel.label || "";
            if (cleanLabel.indexOf("<<") !== -1) {
              var matchStereo = cleanLabel.match(/<<([^>]+)>>/);
              if (matchStereo) {
                stereo = matchStereo[1].trim();
                cleanLabel = cleanLabel.replace(/<<[^>]+>>/g, "").trim();
              }
            }
            model.name = cleanLabel;
            if (stereo) {
              model.stereotype = stereo;
            }
          }
        },
        viewInitializer: function (view) {
          view.lineStyle = 1; // Rectilinear
        }
      });
    } catch (e) {
      console.error("[class-parser] Failed to create a relation.");
      throw e;
    }
  });
  });
}

module.exports = {
  generateDiagram: generateDiagram
};
