function generateDiagram(diagram, text) {
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

    // Match mindmap syntax: *, +, -, or _ for nodes
    // PlantUML mindmap syntax uses repeated symbols for depth
    var match = line.match(/^(\s*)([\*\+\-_]+)\s+(.+)$/);
    if (!match) continue;

    var spaces = match[1].length;
    var symbol = match[2];
    var name = match[3].trim();
    
    // Determine depth: length of the symbol string if it's *, +, -
    // If they use spaces before the symbol, we might need to factor that in, but usually the symbol count indicates depth.
    var depth = symbol.length;

    var node = {
      id: "node_" + i,
      name: name,
      depth: depth,
      direction: symbol.indexOf("-") !== -1 ? "left" : "right", // Heuristic for left/right
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
      // Find parent
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

  // Layout the tree
  // A simple horizontal tree layout
  var startX = 600;
  var startY = 300;
  var yOffsets = {};
  var ySpacing = 60;
  var xSpacing = 150;

  function layoutNode(n, x, dir) {
    var myYOffset = yOffsets[n.depth] || startY;
    
    n.x = x;
    n.y = myYOffset;
    
    // We increment the Y offset for this depth so the next sibling is placed below
    yOffsets[n.depth] = myYOffset + ySpacing;
    
    var childrenLeft = n.children.filter(function(c) { return c.direction === "left"; });
    var childrenRight = n.children.filter(function(c) { return c.direction === "right" || c.direction !== "left"; });

    // If this is the root, we might have both left and right children
    if (n === root) {
      // Reset Y offsets for children
      yOffsets[n.depth + 1] = startY - Math.floor((childrenRight.length - 1) * ySpacing / 2);
      var childStartXRight = x + n.width + xSpacing;
      childrenRight.forEach(function(c) {
        layoutNode(c, childStartXRight, "right");
      });

      yOffsets[n.depth + 1] = startY - Math.floor((childrenLeft.length - 1) * ySpacing / 2);
      var childStartXLeft = x - xSpacing; // We subtract width later in layoutNode if dir is left
      childrenLeft.forEach(function(c) {
        layoutNode(c, childStartXLeft, "left");
      });
    } else {
      // All children follow the direction of the parent
      var childStartY = yOffsets[n.depth] || n.y; // Start slightly below parent
      yOffsets[n.depth + 1] = childStartY;
      
      var childX = dir === "left" ? x - xSpacing : x + n.width + xSpacing;
      
      n.children.forEach(function(c) {
        if (dir === "left") {
            // Adjust X for width of the child
            c.x = childX - c.width;
            layoutNode(c, c.x, "left");
        } else {
            layoutNode(c, childX, "right");
        }
      });
    }
  }

  // Start layout
  yOffsets[root.depth] = startY;
  layoutNode(root, startX, "right"); // Root can have both

  // Create Views in StarUML
  var elementsMap = {};
  
  nodes.forEach(function(n) {
    try {
      // We assume StarUML uses MindmapTopic for the node class
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
      } catch (fallbackErr) {}
    }
  });

  // Create Relationships
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
            view.lineStyle = 3; // Oblique or bezier
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
        } catch (fallbackErr) {}
      }
    }
  });
}

module.exports = {
  generateDiagram: generateDiagram
};
