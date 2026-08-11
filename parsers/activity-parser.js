/**
 * Activity Diagram Parser & Generator Module for StarUML Importer Extension
 */

function sanitizeName(name) {
  if (!name) return "";
  return name.trim();
}

const parserHelper = require("../utils/parser-helper.js");

function generateDiagram(diagram, text) {
  var generateDiagram = { lastNodeGlobal: null, pendingGuardGlobal: "" };

  return parserHelper.runInTransaction("UMLActivityDiagram", function(warnings, errors) {
    var lines = text.split("\n");
  var elementsMap = {};

  var parsedLanes = [];
  var activeLaneName = "";
  var nodes = [];
  var connections = [];

  var explicitNodes = [];
  var explicitConns = [];

  var stack = [];
  var currentLevel = 0;

  function getOppositeGuard(g) {
    if (!g) return "";
    var gl = g.toLowerCase();
    if (gl === "có" || gl === "yes" || gl === "y" || gl === "true") {
      return (g.indexOf("Có") === 0 || g.indexOf("C") === 0) ? "Không" : "no";
    }
    if (gl === "không" || gl === "no" || gl === "n" || gl === "false") {
      return (g.indexOf("Không") === 0 || g.indexOf("K") === 0) ? "Có" : "yes";
    }
    return "";
  }

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

    // Parse Explicit Node (Rectangle as Action)
    var matchRect = line.match(/^\s*rectangle\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))\s+as\s+([a-zA-Z0-9_]+)/i);
    if (matchRect) {
      var nodeName = matchRect[1] || matchRect[2];
      var nodeId = matchRect[3];
      explicitNodes.push({
        id: nodeId,
        name: nodeName.replace(/\\n/g, "\n")
      });
      continue;
    }

    // Parse Explicit Connections: A -down- B or A -[hidden]right- B
    var matchConn = line.match(/^([a-zA-Z0-9_]+)\s+-(?:\[(hidden)\])?(up|down|left|right)?-\s+([a-zA-Z0-9_]+)/i);
    if (matchConn) {
      var fromNode = matchConn[1];
      var isHidden = matchConn[2] === "hidden";
      var direction = matchConn[3] ? matchConn[3].toLowerCase() : "down";
      var toNode = matchConn[4];

      explicitConns.push({
        from: fromNode,
        to: toNode,
        hidden: isHidden,
        direction: direction
      });
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
          var guardVal = "";
          if (currentBlock.pendingGuard) {
            guardVal = currentBlock.pendingGuard;
            currentBlock.pendingGuard = "";
          }
          connections.push({ from: currentBlock.lastNode.id, to: initNode.id, guard: guardVal });
        }
        currentBlock.lastNode = initNode;
      } else {
        if (generateDiagram.lastNodeGlobal) {
          var guardVal = "";
          if (generateDiagram.pendingGuardGlobal) {
            guardVal = generateDiagram.pendingGuardGlobal;
            generateDiagram.pendingGuardGlobal = "";
          }
          connections.push({ from: generateDiagram.lastNodeGlobal.id, to: initNode.id, guard: guardVal });
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
          var guardVal = "";
          if (currentBlock.pendingGuard) {
            guardVal = currentBlock.pendingGuard;
            currentBlock.pendingGuard = "";
          }
          connections.push({ from: currentBlock.lastNode.id, to: finalNode.id, guard: guardVal });
        }
        currentBlock.lastNode = null; // branch ends
      } else {
        if (generateDiagram.lastNodeGlobal) {
          var guardVal = "";
          if (generateDiagram.pendingGuardGlobal) {
            guardVal = generateDiagram.pendingGuardGlobal;
            generateDiagram.pendingGuardGlobal = "";
          }
          connections.push({ from: generateDiagram.lastNodeGlobal.id, to: finalNode.id, guard: guardVal });
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
          connections.push({
            from: generateDiagram.lastNodeGlobal.id,
            to: actionNode.id,
            guard: generateDiagram.pendingGuardGlobal || ""
          });
          generateDiagram.pendingGuardGlobal = "";
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
      var parentBlock = null;
      if (stack.length > 0) {
        parentBlock = stack[stack.length - 1];
        prevNode = parentBlock.lastNode;
      } else {
        prevNode = generateDiagram.lastNodeGlobal;
      }

      if (prevNode) {
        var guardVal = "";
        if (parentBlock && parentBlock.pendingGuard) {
          guardVal = parentBlock.pendingGuard;
          parentBlock.pendingGuard = "";
        } else if (generateDiagram.pendingGuardGlobal) {
          guardVal = generateDiagram.pendingGuardGlobal;
          generateDiagram.pendingGuardGlobal = "";
        }
        connections.push({ from: prevNode.id, to: decNode.id, guard: guardVal });
      }

      stack.push({
        type: "if",
        decisionNode: decNode,
        thenGuard: thenBranchGuard || "",
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
        currentBlock.thenBranchGuard = currentBlock.pendingGuard || "";
        currentBlock.hasElse = true;
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
        var thenGuard = "";
        var elseGuard = "";
        if (!currentBlock.hasElse) {
            // No else block was present
            thenTail = currentBlock.lastNode;
            elseTail = currentBlock.decisionNode;

            thenGuard = currentBlock.pendingGuard || "";
            elseGuard = getOppositeGuard(currentBlock.thenGuard) || "no";
        } else {
            // Else block was present
            thenTail = currentBlock.thenBranchTail;
            elseTail = currentBlock.lastNode;

            thenGuard = currentBlock.thenBranchGuard || "";
            elseGuard = currentBlock.pendingGuard || "";
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
             if (stack.length > 0) {
                 stack[stack.length - 1].pendingGuard = elseGuard;
             } else {
                 generateDiagram.pendingGuardGlobal = elseGuard;
             }
             continue;
        }

        if (connectThen && !connectElse) {
             // Only then continues
             setLastNode(thenTail);
             if (stack.length > 0) {
                 stack[stack.length - 1].pendingGuard = thenGuard;
             } else {
                 generateDiagram.pendingGuardGlobal = thenGuard;
             }
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

        connections.push({ from: thenTail.id, to: mergeNode.id, guard: thenGuard });
        connections.push({ from: elseTail.id, to: mergeNode.id, guard: elseGuard });

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

      var parentBlock = stack.length > 0 ? stack[stack.length - 1] : null;
      var prevNode = parentBlock ? parentBlock.lastNode : generateDiagram.lastNodeGlobal;
      if (prevNode) {
        var guardVal = "";
        if (parentBlock && parentBlock.pendingGuard) {
          guardVal = parentBlock.pendingGuard;
          parentBlock.pendingGuard = "";
        } else if (generateDiagram.pendingGuardGlobal) {
          guardVal = generateDiagram.pendingGuardGlobal;
          generateDiagram.pendingGuardGlobal = "";
        }
        connections.push({ from: prevNode.id, to: forkNode.id, guard: guardVal });
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
      var parentBlock = stack.length > 0 ? stack[stack.length - 1] : null;
      var prevRep = parentBlock ? parentBlock.lastNode : generateDiagram.lastNodeGlobal;
      addNode(repeatMerge);
      if (prevRep) {
        var guardVal = "";
        if (parentBlock && parentBlock.pendingGuard) {
          guardVal = parentBlock.pendingGuard;
          parentBlock.pendingGuard = "";
        } else if (generateDiagram.pendingGuardGlobal) {
          guardVal = generateDiagram.pendingGuardGlobal;
          generateDiagram.pendingGuardGlobal = "";
        }
        connections.push({ from: prevRep.id, to: repeatMerge.id, guard: guardVal });
      }
      stack.push({ type: "repeat", mergeNode: repeatMerge, lastNode: repeatMerge, maxLevel: currentLevel });
      continue;
    }

    // Parse Repeat While: repeat while (cond) is (label)
    var matchRepeatWhile = line.match(/^repeat\s*while\s*(?:\(([^)]+)\))?(?:\s+is\s*\(([^)]+)\))?\s*$/i);
    if (matchRepeatWhile) {
      if (stack.length > 0 && stack[stack.length - 1].type === "repeat") {
        var currentBlock = stack.pop();
        var cond = matchRepeatWhile[1] ? matchRepeatWhile[1].trim() : "";
        var loopGuard = matchRepeatWhile[2] ? matchRepeatWhile[2].trim() : "yes";
        var repeatDec = { type: "UMLDecisionNode", id: "dec_" + i, name: cond, lane: activeLaneName };
        addNode(repeatDec);
        if (currentBlock.lastNode) connections.push({ from: currentBlock.lastNode.id, to: repeatDec.id });
        connections.push({ from: repeatDec.id, to: currentBlock.mergeNode.id, guard: loopGuard }); // loop back

        if (stack.length > 0) {
          stack[stack.length - 1].lastNode = repeatDec;
          stack[stack.length - 1].pendingGuard = "no";
        } else {
          generateDiagram.lastNodeGlobal = repeatDec;
        }
      }
      continue;
    }

    // Parse While: while (cond) is (label)
    var matchWhile = line.match(/^while\s*\(([^)]+)\)(?:\s+is\s*\(([^)]+)\))?\s*$/i);
    if (matchWhile) {
      var whileMerge = { type: "UMLMergeNode", id: "merge_" + i, name: "While", lane: activeLaneName };
      var cond2 = matchWhile[1].trim();
      var bodyGuard = matchWhile[2] ? matchWhile[2].trim() : "yes";
      var whileDec = { type: "UMLDecisionNode", id: "dec_" + i, name: cond2, lane: activeLaneName };

      var parentBlock = stack.length > 0 ? stack[stack.length - 1] : null;
      var prev2 = parentBlock ? parentBlock.lastNode : generateDiagram.lastNodeGlobal;
      addNode(whileMerge);
      addNode(whileDec);

      if (prev2) {
        var guardVal = "";
        if (parentBlock && parentBlock.pendingGuard) {
          guardVal = parentBlock.pendingGuard;
          parentBlock.pendingGuard = "";
        } else if (generateDiagram.pendingGuardGlobal) {
          guardVal = generateDiagram.pendingGuardGlobal;
          generateDiagram.pendingGuardGlobal = "";
        }
        connections.push({ from: prev2.id, to: whileMerge.id, guard: guardVal });
      }
      connections.push({ from: whileMerge.id, to: whileDec.id });

      stack.push({ type: "while", mergeNode: whileMerge, decisionNode: whileDec, lastNode: whileDec, pendingGuard: bodyGuard, maxLevel: currentLevel });
      continue;
    }

    // Parse Endwhile: endwhile (label)
    var matchEndwhile = line.match(/^(?:endwhile|end\s+while)(?:\s*\(([^)]+)\))?\s*$/i);
    if (matchEndwhile) {
      if (stack.length > 0 && stack[stack.length - 1].type === "while") {
        var currentBlock = stack.pop();
        var outGuard = matchEndwhile[1] ? matchEndwhile[1].trim() : "no";
        if (currentBlock.lastNode) {
          connections.push({ from: currentBlock.lastNode.id, to: currentBlock.mergeNode.id });
        }
        if (stack.length > 0) {
          stack[stack.length - 1].lastNode = currentBlock.decisionNode;
          stack[stack.length - 1].pendingGuard = outGuard;
        } else {
          generateDiagram.lastNodeGlobal = currentBlock.decisionNode;
        }
      }
      continue;
    }

    // Parse Outward Guard: -> guard;
    var matchOutGuard = line.match(/^->\s*([^;]+);?$/);
    if (matchOutGuard) {
      var guardText = matchOutGuard[1].trim();
      if (stack.length > 0) {
        stack[stack.length - 1].pendingGuard = guardText;
      } else {
        generateDiagram.pendingGuardGlobal = guardText;
      }
      continue;
    }
  }

  // Clean up global last node
  generateDiagram.lastNodeGlobal = null;

  // Handle Explicit BFD Mode (Rectangles and Arrows)
  if (explicitNodes.length > 0) {
     var grid = {};
     grid[explicitNodes[0].id] = {x: 0, y: 0};
     var resolved = 1;
     var maxIter = explicitConns.length * 2 + 10;
     while(resolved < explicitNodes.length && maxIter > 0) {
        maxIter--;
        explicitConns.forEach(function(conn) {
           if (grid[conn.from]) {
              if (!grid[conn.to]) {
                 grid[conn.to] = { x: grid[conn.from].x, y: grid[conn.from].y };
                 resolved++;
              }
              if (conn.direction === "right") grid[conn.to].x = grid[conn.from].x + 1;
              else if (conn.direction === "left") grid[conn.to].x = grid[conn.from].x - 1;
              else if (conn.direction === "down" || !conn.direction) grid[conn.to].y = grid[conn.from].y + 1;
              else if (conn.direction === "up") grid[conn.to].y = grid[conn.from].y - 1;
           } else if (grid[conn.to]) {
              if (!grid[conn.from]) {
                 grid[conn.from] = { x: grid[conn.to].x, y: grid[conn.to].y };
                 resolved++;
              }
              if (conn.direction === "right") grid[conn.from].x = grid[conn.to].x - 1;
              else if (conn.direction === "left") grid[conn.from].x = grid[conn.to].x + 1;
              else if (conn.direction === "down" || !conn.direction) grid[conn.from].y = grid[conn.to].y - 1;
              else if (conn.direction === "up") grid[conn.from].y = grid[conn.to].y + 1;
           }
        });
     }

     var minX = 0, minY = 0;
     explicitNodes.forEach(function(n) {
        if (!grid[n.id]) grid[n.id] = {x: 0, y: 0};
        if (grid[n.id].x < minX) minX = grid[n.id].x;
        if (grid[n.id].y < minY) minY = grid[n.id].y;
     });

     var gridCellW = 200;
     var gridCellH = 150;
     var offsetX = 100;
     var offsetY = 100;

     var parentModelExp = diagram._parent || app.project.getProject();
     var activityModelExp = parentModelExp;
     if (parentModelExp.getClassName() !== "UMLActivity") {
        var existingActExp = parentModelExp.ownedElements.find(function(el) { return el.getClassName() === "UMLActivity"; });
        if (existingActExp) { activityModelExp = existingActExp; }
        else {
           activityModelExp = app.factory.createModel({
              id: "UMLActivity", parent: parentModelExp,
              modelInitializer: function(m) { m.name = "ActivityContext"; }
           });
        }
     }

     var expElementsMap = {};

     explicitNodes.forEach(function(n) {
        var g = grid[n.id];
        var posX = (g.x - minX) * gridCellW + offsetX;
        var posY = (g.y - minY) * gridCellH + offsetY;

        var view = app.factory.createModelAndView({
           id: "UMLAction",
           parent: activityModelExp,
           diagram: diagram,
           modelInitializer: function(m) { m.name = n.name; },
           viewInitializer: function(v) {
              v.left = posX;
              v.top = posY;
              v.width = 160;
              v.height = 80;
           }
        });
        if (view) expElementsMap[n.id] = view;
     });

     explicitConns.forEach(function(c) {
        if (c.hidden) return;
        var t = expElementsMap[c.from];
        var h = expElementsMap[c.to];
        if (t && h) {
           app.factory.createModelAndView({
              id: "UMLControlFlow",
              parent: activityModelExp,
              diagram: diagram,
              tailView: t,
              headView: h,
              tailModel: t.model,
              headModel: h.model,
              viewInitializer: function(v) { v.lineStyle = 1; }
           });
        }
     });

     return;
  }

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
      console.error("[activity-parser] Failed to create the activity context.");
      throw actErr;
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
      console.error("[activity-parser] Failed to create a swimlane.");
      throw laneErr;
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
      console.error("[activity-parser] Failed to create a node.");
      throw nodeErr;
    }
  });

  // Create Connections (ControlFlows)
  connections.forEach(function (conn) {
    var tailView = elementsMap[conn.from];
    var headView = elementsMap[conn.to];

    if (!tailView || !headView) {
      console.warn("[activity-parser] Skipping a connection with a missing node view.");
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
        },
        viewInitializer: function (view) {
          view.lineStyle = 1; // Rectilinear
        }
      });
    } catch (connErr) {
      console.error("[activity-parser] Failed to create a control flow.");
      throw connErr;
    }
  });

  });
}

module.exports = {
  generateDiagram: generateDiagram
};
