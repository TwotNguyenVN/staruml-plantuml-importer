/**
 * Activity Diagram Parser & Generator Module for StarUML Importer Extension
 */

function sanitizeName(name) {
  if (!name) return "";
  return name.trim();
}

function generateDiagram(diagram, text) {
  var lines = text.split("\n");
  var elementsMap = {};
  
  var parsedLanes = [];
  var activeLaneName = "";
  var nodes = [];
  var connections = [];
  
  var stack = [];
  var currentLevel = 0;
  
  // Helper to attach grid coordinates
  function addNode(node) {
    node.level = currentLevel++;
    nodes.push(node);
    if (stack.length > 0) {
      for (var s = 0; s < stack.length; s++) {
        stack[s].maxLevel = Math.max(stack[s].maxLevel || 0, currentLevel);
      }
    }
  }

  // 1. First Pass: Parse lines to build AST (Nodes & Connections & Swimlanes)
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    
    // Skip empty, comments, start/end UML directives, title
    if (
      !line ||
      line.indexOf("'") === 0 ||
      line.indexOf("@startuml") === 0 ||
      line.indexOf("@enduml") === 0 ||
      line.indexOf("title ") === 0
    ) {
      continue;
    }
    
    // Parse Swimlane: |Lane Name|
    var matchLane = line.match(/^\|([^|]+)\|$/);
    if (matchLane) {
      activeLaneName = matchLane[1].trim();
      if (parsedLanes.indexOf(activeLaneName) === -1) {
        parsedLanes.push(activeLaneName);
      }
      continue;
    }
    
    // Parse Initial Node: start or (*)
    if (line.toLowerCase() === "start" || line === "(*)") {
      var initNode = {
        type: "UMLInitialNode",
        id: "init_" + i,
        name: "Initial",
        lane: activeLaneName
      };
      addNode(initNode);
      
      // Connect to last node if active
      if (stack.length > 0) {
        var currentBlock = stack[stack.length - 1];
        if (currentBlock.lastNode) {
          connections.push({ from: currentBlock.lastNode.id, to: initNode.id });
        }
        currentBlock.lastNode = initNode;
      } else {
        if (generateDiagram.lastNodeGlobal) {
          connections.push({ from: generateDiagram.lastNodeGlobal.id, to: initNode.id });
        }
        generateDiagram.lastNodeGlobal = initNode;
      }
      continue;
    }
    
    // Parse Final Node: stop or end
    if (line.toLowerCase() === "stop" || line.toLowerCase() === "end") {
      var finalNode = {
        type: "UMLActivityFinalNode",
        id: "final_" + i,
        name: "Final",
        lane: activeLaneName
      };
      addNode(finalNode);
      
      if (stack.length > 0) {
        var currentBlock = stack[stack.length - 1];
        if (currentBlock.lastNode) {
          connections.push({ from: currentBlock.lastNode.id, to: finalNode.id });
        }
        currentBlock.lastNode = null; // branch ends
      } else {
        if (generateDiagram.lastNodeGlobal) {
          connections.push({ from: generateDiagram.lastNodeGlobal.id, to: finalNode.id });
        }
        generateDiagram.lastNodeGlobal = null;
      }
      continue;
    }
    
    // Parse Action: :Action Name;
    var matchAction = line.match(/^:(.+);$/);
    if (matchAction) {
      var actionName = matchAction[1].trim();
      var actionNode = {
        type: "UMLAction",
        id: "action_" + i,
        name: actionName,
        lane: activeLaneName
      };
      addNode(actionNode);
      
      if (stack.length > 0) {
        var currentBlock = stack[stack.length - 1];
        if (currentBlock.lastNode) {
          connections.push({ 
            from: currentBlock.lastNode.id, 
            to: actionNode.id,
            guard: currentBlock.pendingGuard || ""
          });
          currentBlock.pendingGuard = "";
        }
        currentBlock.lastNode = actionNode;
      } else {
        if (generateDiagram.lastNodeGlobal) {
          connections.push({ from: generateDiagram.lastNodeGlobal.id, to: actionNode.id });
        }
        generateDiagram.lastNodeGlobal = actionNode;
      }
      continue;
    }
    
    // Parse Decision: if (Condition) then (branch)
    var matchIf = line.match(/^if\s*\(([^)]+)\)\s*then\s*(?:\(([^)]+)\))?\s*$/i);
    if (matchIf) {
      var cond = matchIf[1].trim();
      var thenBranchGuard = matchIf[2] ? matchIf[2].trim() : "";
      
      var decNode = {
        type: "UMLDecisionNode",
        id: "dec_" + i,
        name: cond,
        lane: activeLaneName
      };
      addNode(decNode);
      
      // Connect to last node
      var prevNode = null;
      if (stack.length > 0) {
        prevNode = stack[stack.length - 1].lastNode;
      } else {
        prevNode = generateDiagram.lastNodeGlobal;
      }
      
      if (prevNode) {
        connections.push({ from: prevNode.id, to: decNode.id });
      }
      
      stack.push({
        type: "if",
        decisionNode: decNode,
        thenBranchTail: null,
        elseBranchTail: null,
        lastNode: decNode,
        pendingGuard: thenBranchGuard,
        baseLevel: currentLevel,
        maxLevel: currentLevel
      });
      continue;
    }
    
    // Parse Else: else (branch)
    var matchElse = line.match(/^else\s*(?:\(([^)]+)\))?\s*$/i);
    if (matchElse) {
      if (stack.length > 0 && stack[stack.length - 1].type === "if") {
        var currentBlock = stack[stack.length - 1];
        currentBlock.thenBranchTail = currentBlock.lastNode;
        currentBlock.lastNode = currentBlock.decisionNode;
        currentBlock.pendingGuard = matchElse[1] ? matchElse[1].trim() : "";
        
        currentLevel = currentBlock.baseLevel;
      }
      continue;
    }
    
    // Parse Endif
    if (line.toLowerCase() === "endif") {
      if (stack.length > 0 && stack[stack.length - 1].type === "if") {
        var currentBlock = stack.pop();
        
        var thenTail, elseTail;
        if (currentBlock.thenBranchTail === null) {
            // No else block was present
            thenTail = currentBlock.lastNode;
            elseTail = currentBlock.decisionNode;
        } else {
            // Else block was present
            thenTail = currentBlock.thenBranchTail;
            elseTail = currentBlock.lastNode;
        }
        
        currentLevel = Math.max(currentLevel, currentBlock.maxLevel || currentLevel);
        
        var connectThen = thenTail && thenTail.type !== "UMLActivityFinalNode";
        var connectElse = elseTail && elseTail.type !== "UMLActivityFinalNode";
        
        function setLastNode(node) {
            if (stack.length > 0) {
                stack[stack.length - 1].lastNode = node;
            } else {
                generateDiagram.lastNodeGlobal = node;
            }
        }
        
        if (!connectThen && !connectElse) {
             // Both stopped
             setLastNode(null);
             continue;
        }
        
        if (!connectThen && connectElse) {
             // Only else continues
             setLastNode(elseTail);
             continue;
        }
        
        if (connectThen && !connectElse) {
             // Only then continues
             setLastNode(thenTail);
             continue;
        }
        
        // Both continue -> Merge Node
        var mergeNode = {
          type: "UMLMergeNode",
          id: "merge_" + i,
          name: "Merge",
          lane: activeLaneName
        };
        addNode(mergeNode);
        
        connections.push({ from: thenTail.id, to: mergeNode.id });
        connections.push({ from: elseTail.id, to: mergeNode.id });
        
        setLastNode(mergeNode);
      }
      continue;
    }
    
    // Parse Fork
    if (line.toLowerCase() === "fork") {
      var forkNode = {
        type: "UMLForkNode",
        id: "fork_" + i,
        name: "Fork",
        lane: activeLaneName
      };
      addNode(forkNode);
      
      var prevNode = stack.length > 0 ? stack[stack.length - 1].lastNode : generateDiagram.lastNodeGlobal;
      if (prevNode) {
        connections.push({ from: prevNode.id, to: forkNode.id });
      }
      
      stack.push({
        type: "fork",
        forkNode: forkNode,
        branchTails: [],
        lastNode: forkNode,
        baseLevel: currentLevel,
        maxLevel: currentLevel,
        branchIndex: 0
      });
      continue;
    }
    
    // Parse Fork Again
    if (line.toLowerCase() === "fork again") {
      if (stack.length > 0 && stack[stack.length - 1].type === "fork") {
        var currentBlock = stack[stack.length - 1];
        if (currentBlock.lastNode) {
          currentBlock.branchTails.push(currentBlock.lastNode);
        }
        currentBlock.lastNode = currentBlock.forkNode;
        currentBlock.branchIndex++;
        currentLevel = currentBlock.baseLevel;
      }
      continue;
    }
    
    // Parse End Fork
    if (line.toLowerCase() === "end fork" || line.toLowerCase() === "endfork") {
      if (stack.length > 0 && stack[stack.length - 1].type === "fork") {
        var currentBlock = stack.pop();
        if (currentBlock.lastNode) {
          currentBlock.branchTails.push(currentBlock.lastNode);
        }
        
        currentLevel = Math.max(currentLevel, currentBlock.maxLevel || currentLevel);
        
        var joinNode = {
          type: "UMLJoinNode",
          id: "join_" + i,
          name: "Join",
          lane: activeLaneName
        };
        addNode(joinNode);
        
        currentBlock.branchTails.forEach(function (tail) {
          connections.push({ from: tail.id, to: joinNode.id });
        });
        
        if (stack.length > 0) {
          stack[stack.length - 1].lastNode = joinNode;
        } else {
          generateDiagram.lastNodeGlobal = joinNode;
        }
      }
      continue;
    }

    // Parse Repeat: repeat
    if (line.toLowerCase() === "repeat") {
      var repeatMerge = { type: "UMLMergeNode", id: "merge_" + i, name: "Repeat", lane: activeLaneName };
      var prevRep = stack.length > 0 ? stack[stack.length - 1].lastNode : generateDiagram.lastNodeGlobal;
      addNode(repeatMerge);
      if (prevRep) connections.push({ from: prevRep.id, to: repeatMerge.id });
      stack.push({ type: "repeat", mergeNode: repeatMerge, lastNode: repeatMerge, maxLevel: currentLevel });
      continue;
    }
    
    // Parse Repeat While: repeat while (cond)
    var matchRepeatWhile = line.match(/^repeat\s*while\s*(?:\(([^)]+)\))?\s*$/i);
    if (matchRepeatWhile) {
      if (stack.length > 0 && stack[stack.length - 1].type === "repeat") {
        var currentBlock = stack.pop();
        var cond = matchRepeatWhile[1] ? matchRepeatWhile[1].trim() : "";
        var repeatDec = { type: "UMLDecisionNode", id: "dec_" + i, name: cond, lane: activeLaneName };
        addNode(repeatDec);
        if (currentBlock.lastNode) connections.push({ from: currentBlock.lastNode.id, to: repeatDec.id });
        connections.push({ from: repeatDec.id, to: currentBlock.mergeNode.id, guard: "yes" }); // loop back
        
        if (stack.length > 0) {
          stack[stack.length - 1].lastNode = repeatDec;
          stack[stack.length - 1].pendingGuard = "no";
        } else {
          generateDiagram.lastNodeGlobal = repeatDec;
        }
      }
      continue;
    }

    // Parse While: while (cond)
    var matchWhile = line.match(/^while\s*(?:\(([^)]+)\))?\s*$/i);
    if (matchWhile) {
      var whileMerge = { type: "UMLMergeNode", id: "merge_" + i, name: "While", lane: activeLaneName };
      var cond2 = matchWhile[1] ? matchWhile[1].trim() : "";
      var whileDec = { type: "UMLDecisionNode", id: "dec_" + i, name: cond2, lane: activeLaneName };
      
      var prev2 = stack.length > 0 ? stack[stack.length - 1].lastNode : generateDiagram.lastNodeGlobal;
      addNode(whileMerge);
      addNode(whileDec);
      
      if (prev2) connections.push({ from: prev2.id, to: whileMerge.id });
      connections.push({ from: whileMerge.id, to: whileDec.id });
      
      stack.push({ type: "while", mergeNode: whileMerge, decisionNode: whileDec, lastNode: whileDec, pendingGuard: "yes", maxLevel: currentLevel });
      continue;
    }
    
    // Parse Endwhile: endwhile
    if (line.toLowerCase() === "endwhile" || line.toLowerCase() === "end while") {
      if (stack.length > 0 && stack[stack.length - 1].type === "while") {
        var currentBlock = stack.pop();
        if (currentBlock.lastNode) {
          connections.push({ from: currentBlock.lastNode.id, to: currentBlock.mergeNode.id });
        }
        if (stack.length > 0) {
          stack[stack.length - 1].lastNode = currentBlock.decisionNode;
          stack[stack.length - 1].pendingGuard = "no";
        } else {
          generateDiagram.lastNodeGlobal = currentBlock.decisionNode;
        }
      }
      continue;
    }
  }
  
  // Clean up global last node
  generateDiagram.lastNodeGlobal = null;
  
  // 2. Initialize Models and Views in StarUML
  var parentModel = diagram._parent || app.project.getProject();
  
  // Create a context UMLActivity if not already defined
  var activityModel = parentModel;
  if (parentModel.getClassName() !== "UMLActivity") {
    try {
      // Find or create activity model
      var existingAct = parentModel.ownedElements.find(function (el) {
        return el.getClassName() === "UMLActivity";
      });
      if (existingAct) {
        activityModel = existingAct;
      } else {
        activityModel = app.factory.createModel({
          id: "UMLActivity",
          parent: parentModel,
          modelInitializer: function (model) {
            model.name = "ActivityContext";
          }
        });
      }
    } catch (actErr) {
      console.error("[activity-parser] Failed to find/create UMLActivity context:", actErr);
    }
  }
  
  // --- Dynamic Width Occupancy Grid Layout Calculation ---
  var buckets = {};
  parsedLanes.forEach(function(lane) { buckets[lane] = {}; });
  if (!buckets[""]) buckets[""] = {};

  nodes.forEach(function(node) {
    var l = node.lane || "";
    if (!buckets[l]) buckets[l] = {};
    if (!buckets[l][node.level]) buckets[l][node.level] = [];
    buckets[l][node.level].push(node);
  });
  
  var gap = 40; // spacing between parallel nodes

  // 1. Calculate dynamic width for each node
  nodes.forEach(function(node) {
    var nameLen = node.name ? node.name.length : 0;
    var w = 120;
    if (node.type === "UMLInitialNode" || node.type === "UMLActivityFinalNode") {
      w = 25;
    } else if (node.type === "UMLDecisionNode" || node.type === "UMLMergeNode") {
      w = 60;
    } else if (node.type === "UMLForkNode" || node.type === "UMLJoinNode") {
      w = 0; // handled dynamically
    } else {
      // Dynamic width: text length * 7px + padding, minimum 120
      w = Math.max(120, nameLen * 7 + 20);
    }
    node.dynamicWidth = w;
  });

  // 2. Calculate required width for each lane
  var laneWidths = {};
  parsedLanes.forEach(function(lane) {
    var maxLaneWidth = 280; // minimum lane width
    
    for (var lvl in buckets[lane]) {
      var levelNodes = buckets[lane][lvl];
      var totalLevelWidth = 0;
      
      var actionableNodes = levelNodes.filter(function(n) {
          return n.type !== "UMLForkNode" && n.type !== "UMLJoinNode";
      });
      
      actionableNodes.forEach(function(node) {
         totalLevelWidth += node.dynamicWidth;
      });
      
      if (actionableNodes.length > 1) {
          totalLevelWidth += (actionableNodes.length - 1) * gap;
      }
      if (actionableNodes.length > 0) {
          totalLevelWidth += 50; // Side padding (25px each side)
      }

      if (totalLevelWidth > maxLaneWidth) {
          maxLaneWidth = totalLevelWidth;
      }
    }
    laneWidths[lane] = maxLaneWidth;
  });

  var laneX = {};
  var currentX = 50;
  parsedLanes.forEach(function(lane) {
    laneX[lane] = currentX;
    currentX += laneWidths[lane];
  });
  
  var maxLevelGlob = 0;
  Object.keys(buckets).forEach(function(lane) {
    Object.keys(buckets[lane]).forEach(function(lvl) {
      var lNum = parseInt(lvl, 10);
      if (lNum > maxLevelGlob) {
        maxLevelGlob = lNum;
      }
    });
  });
  var diagramHeight = Math.max(600, maxLevelGlob * 90 + 200);

  // 3. Calculate X coordinates based on dynamic widths
  Object.keys(buckets).forEach(function(lane) {
    Object.keys(buckets[lane]).forEach(function(lvl) {
      var levelNodes = buckets[lane][lvl];
      var actionableNodes = levelNodes.filter(function(n) {
          return n.type !== "UMLForkNode" && n.type !== "UMLJoinNode";
      });
      
      var centerX = (laneX[lane] || 50) + (laneWidths[lane] || 280) / 2;
      
      var totalW = 0;
      actionableNodes.forEach(function(n) { totalW += n.dynamicWidth; });
      totalW += (actionableNodes.length > 1) ? (actionableNodes.length - 1) * gap : 0;
      
      var startX = centerX - totalW / 2;
      var currX = startX;
      
      levelNodes.forEach(function(node) {
        if (node.type === "UMLForkNode" || node.type === "UMLJoinNode") {
            node.finalCenterX = centerX;
        } else {
            node.finalCenterX = currX + node.dynamicWidth / 2;
            currX += node.dynamicWidth + gap;
        }
        node.finalY = parseInt(lvl) * 90 + 80;
      });
    });
  });

  var laneViewsMap = {};
  var laneModelsMap = {};
  
  parsedLanes.forEach(function (laneName) {
    var posX = laneX[laneName];
    var posY = 40;
    var lWidth = laneWidths[laneName];
    
    try {
      var laneModel = app.factory.createModelAndView({
        id: "UMLActivityPartition",
        parent: activityModel,
        diagram: diagram,
        modelInitializer: function (model) {
          model.name = laneName;
        },
        viewInitializer: function (view) {
          view.left = posX;
          view.top = posY;
          view.width = lWidth;
          view.height = diagramHeight;
        }
      });
      if (laneModel) {
        laneModelsMap[laneName] = laneModel.model;
        laneViewsMap[laneName] = laneModel;
      }
    } catch (laneErr) {
      console.error("[activity-parser] Failed to create swimlane:", laneName, laneErr);
    }
  });
  
  // Create Nodes
  nodes.forEach(function (node) {
    var lane = node.lane || "";
    var width = node.dynamicWidth || 120;
    var height = 40;
    
    if (node.type === "UMLInitialNode" || node.type === "UMLActivityFinalNode") {
      height = 25;
    } else if (node.type === "UMLDecisionNode" || node.type === "UMLMergeNode") {
      height = 40;
    } else if (node.type === "UMLForkNode" || node.type === "UMLJoinNode") {
      // Dynamic width spanning the lane
      width = (laneWidths[lane] || 280) - 40;
      height = 8;
    }
    
    // Fork/Join nodes center on the lane, others center on their allocated sub-column
    var posX = (node.type === "UMLForkNode" || node.type === "UMLJoinNode") 
               ? (laneX[lane] || 50) + 20 
               : (node.finalCenterX || 150) - width / 2;
    var posY = node.finalY || 80;
    
    var nodeParent = activityModel;
    
    try {
      var view = app.factory.createModelAndView({
        id: node.type,
        parent: nodeParent,
        diagram: diagram,
        modelInitializer: function (model) {
          model.name = node.name;
        },
        viewInitializer: function (dgmView) {
          dgmView.left = posX;
          dgmView.top = posY;
          dgmView.width = width;
          dgmView.height = height;
        }
      });
      if (view) {
        elementsMap[node.id] = view;
      }
    } catch (nodeErr) {
      console.error("[activity-parser] Failed to create node:", node.name, nodeErr);
    }
  });
  
  // Create Connections (ControlFlows)
  connections.forEach(function (conn) {
    var tailView = elementsMap[conn.from];
    var headView = elementsMap[conn.to];
    
    if (!tailView || !headView) {
      console.warn("[activity-parser] Skipping connection: missing node view", conn.from, "->", conn.to);
      return;
    }
    
    try {
      app.factory.createModelAndView({
        id: "UMLControlFlow",
        parent: activityModel,
        diagram: diagram,
        tailView: tailView,
        headView: headView,
        tailModel: tailView.model,
        headModel: headView.model,
        modelInitializer: function (model) {
          if (conn.guard) {
            model.guard = conn.guard;
          }
        }
      });
    } catch (connErr) {
      console.error("[activity-parser] Failed to create ControlFlow:", conn.from, "->", conn.to, connErr);
    }
  });
}

module.exports = {
  generateDiagram: generateDiagram
};
