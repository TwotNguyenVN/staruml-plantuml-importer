const parserHelper = require("../utils/parser-helper.js");

function generateDiagram(diagram, text) {
  return parserHelper.runInTransaction("MindmapDiagram", function(warnings, errors) {
    var parentModel = diagram._parent || diagram;
    var lines = text.split("\n");
    var nodes = []; // Flat list of nodes
    var root = null;
    var currentPath = []; // Keeps track of the hierarchy

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/\r/g, "");
      var trimmed = line.trim();

      if (!trimmed || trimmed.indexOf("@start") === 0 || trimmed.indexOf("@end") === 0 || trimmed.indexOf("'") === 0) {
        continue;
      }

      var match = line.match(/^(\s*)([\*\+\-_]+)\s+(.+)$/);
      if (!match) continue;

      var spaces = match[1].length;
      var symbol = match[2];
      var name = match[3].trim();

      var depth = symbol.length;

      var node = {
        id: "node_" + i,
        name: name,
        depth: depth,
        direction: symbol.indexOf("-") !== -1 ? "left" : "right",
        children: [],
        parent: null,
        width: Math.max(100, name.length * 8 + 30),
        height: 40
      };

      if (depth === 1 || !root) {
        root = node;
        currentPath = [root];
        nodes.push(node);
      } else {
        while (currentPath.length > 0 && currentPath[currentPath.length - 1].depth >= depth) {
          currentPath.pop();
        }

        var parent = currentPath.length > 0 ? currentPath[currentPath.length - 1] : root;
        node.parent = parent;
        parent.children.push(node);
        currentPath.push(node);
        nodes.push(node);
      }
    }

    if (!root) {
      throw new Error("No valid mindmap nodes found.");
    }

    var startX = 600;
    var startY = 300;
    var yOffsets = {};
    var ySpacing = 60;
    var xSpacing = 150;

    function layoutNode(n, x, dir) {
      var myYOffset = yOffsets[n.depth] || startY;

      n.x = x;
      n.y = myYOffset;

      yOffsets[n.depth] = myYOffset + ySpacing;

      var childrenLeft = n.children.filter(function(c) { return c.direction === "left"; });
      var childrenRight = n.children.filter(function(c) { return c.direction === "right" || c.direction !== "left"; });

      if (n === root) {
        yOffsets[n.depth + 1] = startY - Math.floor((childrenRight.length - 1) * ySpacing / 2);
        var childStartXRight = x + n.width + xSpacing;
        childrenRight.forEach(function(c) {
          layoutNode(c, childStartXRight, "right");
        });

        yOffsets[n.depth + 1] = startY - Math.floor((childrenLeft.length - 1) * ySpacing / 2);
        var childStartXLeft = x - xSpacing;
        childrenLeft.forEach(function(c) {
          layoutNode(c, childStartXLeft, "left");
        });
      } else {
        var childStartY = yOffsets[n.depth] || n.y;
        yOffsets[n.depth + 1] = childStartY;

        var childX = dir === "left" ? x - xSpacing : x + n.width + xSpacing;

        n.children.forEach(function(c) {
          if (dir === "left") {
              c.x = childX - c.width;
              layoutNode(c, c.x, "left");
          } else {
              layoutNode(c, childX, "right");
          }
        });
      }
    }

    yOffsets[root.depth] = startY;
    layoutNode(root, startX, "right");

    var elementsMap = {};

    nodes.forEach(function(n) {
      try {
        var view = app.factory.createModelAndView({
          id: "MindmapTopic",
          parent: parentModel,
          diagram: diagram,
          modelInitializer: function (model) {
            model.name = n.name;
          },
          viewInitializer: function (v) {
            v.left = n.x;
            v.top = n.y;
            v.width = n.width;
            v.height = n.height;
          }
        });
        if (view) {
          elementsMap[n.id] = view;
          n.view = view;
        }
      } catch (e) {
        console.warn("Failed to create MindmapTopic, falling back to UMLNode.", e);
        try {
          var fbView = app.factory.createModelAndView({
            id: "UMLNode",
            parent: parentModel,
            diagram: diagram,
            modelInitializer: function(m) { m.name = n.name; },
            viewInitializer: function(v) { v.left = n.x; v.top = n.y; v.width = n.width; v.height = n.height; }
          });
          if (fbView) {
            elementsMap[n.id] = fbView;
            n.view = fbView;
          }
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      }
    });

    nodes.forEach(function(n) {
      if (n.parent && n.view && n.parent.view) {
        try {
          app.factory.createModelAndView({
            id: "MindmapEdge",
            parent: parentModel,
            diagram: diagram,
            tailView: n.parent.view,
            headView: n.view,
            viewInitializer: function (view) {
              view.lineStyle = 3;
            }
          });
        } catch (e) {
          console.warn("Failed to create MindmapEdge, falling back to UMLDependency.", e);
          try {
            app.factory.createModelAndView({
              id: "UMLDependency",
              parent: parentModel,
              diagram: diagram,
              tailView: n.parent.view,
              headView: n.view
            });
          } catch (fallbackErr) {
            throw fallbackErr;
          }
        }
      }
    });

  });
}

module.exports = {
  generateDiagram: generateDiagram
};
