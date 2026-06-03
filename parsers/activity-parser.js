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
      nodes.push(initNode);
      
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
      nodes.push(finalNode);
      
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
      nodes.push(actionNode);
      
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
      nodes.push(decNode);
      
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
        pendingGuard: thenBranchGuard
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
      }
      continue;
    }
    
    // Parse Endif
    if (line.toLowerCase() === "endif") {
      if (stack.length > 0 && stack[stack.length - 1].type === "if") {
        var currentBlock = stack.pop();
        currentBlock.elseBranchTail = currentBlock.lastNode;
        
        var mergeNode = {
          type: "UMLMergeNode",
          id: "merge_" + i,
          name: "Merge",
          lane: activeLaneName
        };
        nodes.push(mergeNode);
        
        if (currentBlock.thenBranchTail) {
          connections.push({ from: currentBlock.thenBranchTail.id, to: mergeNode.id });
        }
        if (currentBlock.elseBranchTail) {
          connections.push({ from: currentBlock.elseBranchTail.id, to: mergeNode.id });
        }
        
        if (stack.length > 0) {
          stack[stack.length - 1].lastNode = mergeNode;
        } else {
          generateDiagram.lastNodeGlobal = mergeNode;
        }
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
      nodes.push(forkNode);
      
      var prevNode = stack.length > 0 ? stack[stack.length - 1].lastNode : generateDiagram.lastNodeGlobal;
      if (prevNode) {
        connections.push({ from: prevNode.id, to: forkNode.id });
      }
      
      stack.push({
        type: "fork",
        forkNode: forkNode,
        branchTails: [],
        lastNode: forkNode
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
        
        var joinNode = {
          type: "UMLJoinNode",
          id: "join_" + i,
          name: "Join",
          lane: activeLaneName
        };
        nodes.push(joinNode);
        
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
  
  // Set up Swimlanes layout geometry
  var laneWidth = 280;
  var diagramHeight = Math.max(600, nodes.length * 90 + 100);
  var laneViewsMap = {};
  var laneModelsMap = {};
  
  parsedLanes.forEach(function (laneName, index) {
    var posX = index * laneWidth + 50;
    var posY = 40;
    
    try {
      // Create Partition Model
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
          view.width = laneWidth;
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
  nodes.forEach(function (node, index) {
    var laneIndex = parsedLanes.indexOf(node.lane);
    if (laneIndex === -1) laneIndex = 0;
    
    // Position node in its swimlane
    var posX = laneIndex * laneWidth + 50 + Math.floor((laneWidth - 120) / 2);
    var posY = index * 90 + 80;
    
    // Set specific sizes based on node type
    var width = 120;
    var height = 40;
    if (node.type === "UMLInitialNode" || node.type === "UMLActivityFinalNode") {
      width = 25;
      height = 25;
      posX = laneIndex * laneWidth + 50 + Math.floor((laneWidth - 25) / 2);
    } else if (node.type === "UMLDecisionNode" || node.type === "UMLMergeNode") {
      width = 60;
      height = 40;
      posX = laneIndex * laneWidth + 50 + Math.floor((laneWidth - 60) / 2);
    } else if (node.type === "UMLForkNode" || node.type === "UMLJoinNode") {
      width = 180;
      height = 8;
      posX = laneIndex * laneWidth + 50 + Math.floor((laneWidth - 180) / 2);
    }
    
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
