/**
 * State Diagram (Statechart) Parser & Layout Module for StarUML Importer Extension
 */

function sanitizeName(name) {
  if (!name) return "";
  return name.trim();
}

const parserHelper = require("../utils/parser-helper.js");

function generateDiagram(diagram, text) {
  return parserHelper.runInTransaction("UMLStatechartDiagram", function(warnings, errors) {
    global.hasShownStateError = false;
    var debugLog = "";

    // Strict diagram type checking to prevent StarUML internal crash
    if (diagram && diagram.getClassName() !== "UMLStatechartDiagram") {
      app.dialogs.showAlertDialog("Please create and open a 'Statechart Diagram' first before importing PlantUML State Code. Current diagram is: " + diagram.getClassName());
      return;
    }

    var lines = text.split("\n");
    var elementsMap = {};

    var parsedStates = [];
    var parsedTransitions = [];

    var stack = [];

    function getOrCreateStateInfo(alias, parentAlias) {
      if (alias === "[*]") return null;
      var existing = parsedStates.find(function(s) { return s.alias === alias; });
      if (existing) return existing;

      var newState = {
        type: "UMLState",
        name: alias,
        alias: alias,
        stereotype: "",
        parentAlias: parentAlias,
        isComposite: false,
        regionIndex: stack.length > 0 ? (stack[stack.length - 1].activeRegionIndex || 0) : 0
      };
      parsedStates.push(newState);
      return newState;
    }

    // 1. First Pass: Parse lines to build State and Transition AST
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      if (!line || line.indexOf("'") === 0 || line.indexOf("@startuml") === 0 || line.indexOf("@enduml") === 0 || line.indexOf("title ") === 0) {
        continue;
      }

      if (line === "}") {
        if (stack.length > 0) stack.pop();
        continue;
      }

      // Parse orthogonal region (--)
      var matchRegion = line.match(/^\s*--\s*$/);
      if (matchRegion) {
        if (stack.length > 0) {
          var composite = stack[stack.length - 1];
          var existing = parsedStates.find(function(s) { return s.alias === composite.alias; });
          if (existing) {
            existing.regionsCounter = (existing.regionsCounter || 1) + 1;
            composite.activeRegionIndex = existing.regionsCounter - 1;
          }
        }
        continue;
      }

      var matchStateBlock = line.match(/^state\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?\s*\{$/i);
      if (matchStateBlock) {
        var stateName = matchStateBlock[1] || matchStateBlock[2];
        var alias = matchStateBlock[3] || stateName;
        var stereotype = matchStateBlock[4] || "";
        var parentAlias = stack.length > 0 ? stack[stack.length - 1].alias : null;
        var regionIndex = stack.length > 0 ? (stack[stack.length - 1].activeRegionIndex || 0) : 0;

        var existing = parsedStates.find(function(s) { return s.alias === alias; });
        var stateObj;
        if (existing) {
          existing.isComposite = true;
          existing.name = stateName;
          existing.stereotype = stereotype;
          existing.parentAlias = parentAlias;
          existing.regionIndex = regionIndex;
          stateObj = existing;
        } else {
          stateObj = {
            type: "UMLState", name: stateName, alias: alias, stereotype: stereotype,
            parentAlias: parentAlias, isComposite: true, regionIndex: regionIndex,
            regionsCounter: 1
          };
          parsedStates.push(stateObj);
        }
        stack.push({ alias: stateObj.alias, activeRegionIndex: 0 });
        continue;
      }

      var matchState = line.match(/^state\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?$/i);
      if (matchState) {
        var stateName = matchState[1] || matchState[2];
        var alias = matchState[3] || stateName;
        var stereotype = matchState[4] || "";
        var parentAlias = stack.length > 0 ? stack[stack.length - 1].alias : null;
        var regionIndex = stack.length > 0 ? (stack[stack.length - 1].activeRegionIndex || 0) : 0;

        var existing = parsedStates.find(function(s) { return s.alias === alias; });
        if (existing) {
          existing.name = stateName;
          existing.stereotype = stereotype;
          existing.parentAlias = parentAlias;
          existing.regionIndex = regionIndex;
        } else {
          parsedStates.push({
            type: "UMLState", name: stateName, alias: alias, stereotype: stereotype,
            parentAlias: parentAlias, isComposite: false, regionIndex: regionIndex
          });
        }
        continue;
      }

      var matchStateValue = line.match(/^state\s+(\w+)\s*:\s*(.+)$/i);
      if (matchStateValue) {
        var alias = matchStateValue[1];
        var value = matchStateValue[2].trim();
        var parentAlias = stack.length > 0 ? stack[stack.length - 1].alias : null;
        var regionIndex = stack.length > 0 ? (stack[stack.length - 1].activeRegionIndex || 0) : 0;
        var existing = parsedStates.find(function(s) { return s.alias === alias; });
        if (existing) {
          existing.name = existing.name + " (" + value + ")";
        } else {
          parsedStates.push({
            type: "UMLState", name: alias + " (" + value + ")", alias: alias, stereotype: "",
            parentAlias: parentAlias, isComposite: false, regionIndex: regionIndex
          });
        }
        continue;
      }

      var arrowRegex = /\s*(-->|->)\s*/;
      var parts = line.split(arrowRegex);
      if (parts.length >= 3) {
        var leftStr = parts[0].trim();
        var rightWithLabel = parts.slice(2).join("");
        var rightStr = rightWithLabel;
        var label = "";
        var colonIndex = rightWithLabel.indexOf(":");
        if (colonIndex !== -1) {
          rightStr = rightWithLabel.substring(0, colonIndex).trim();
          label = rightWithLabel.substring(colonIndex + 1).trim();
        }
        var currentParentAlias = stack.length > 0 ? stack[stack.length - 1].alias : null;
        var regionIndex = stack.length > 0 ? (stack[stack.length - 1].activeRegionIndex || 0) : 0;
        getOrCreateStateInfo(leftStr, currentParentAlias);
        getOrCreateStateInfo(rightStr, currentParentAlias);

        parsedTransitions.push({ from: leftStr, to: rightStr, label: label, parentAlias: currentParentAlias, regionIndex: regionIndex });
      }
    }

    // 2. Initialize Models in StarUML
    var parentModel = diagram._parent || app.project.getProject();
    var stateMachineModel = null;
    var rootRegion = null;
    var builder = app.repository.getOperationBuilder();
    builder.begin("import state diagram");

    try {

    function addModel(typeId, parent, field, initFn) {
      var T = typeof type !== "undefined" ? type[typeId] : global.type[typeId];
      var m = new T();
      m._parent = parent;
      if (initFn) initFn(m);
      builder.insert(m);
      builder.fieldInsert(parent, field, m);
      return m;
    }

    function addView(typeId, diagram, model, initFn, containerView) {
      var T = typeof type !== "undefined" ? type[typeId] : global.type[typeId];
      var v = new T();
      v._parent = diagram;
      if (model) v.model = model;
      if (initFn) initFn(v);
      if (containerView) {
         v.containerView = containerView;
      }
      builder.insert(v);
      builder.fieldInsert(diagram, "ownedViews", v);
      if (containerView) {
         builder.fieldInsert(containerView, "containedViews", v);
      }
      return v;
    }

    var originalDiagramParent = diagram ? diagram._parent : null;
    var diagramParentChanged = false;
    if (parentModel.getClassName() === "UMLRegion") {
      rootRegion = parentModel;
      stateMachineModel = rootRegion._parent;
    } else if (parentModel.getClassName() === "UMLStateMachine") {
      stateMachineModel = parentModel;
    } else {
      stateMachineModel = parentModel;
      var len = parentModel.ownedElements ? parentModel.ownedElements.length : 0;
      for (var i = 0; i < len; i++) {
          if (parentModel.ownedElements[i].getClassName() === "UMLStateMachine") {
              stateMachineModel = parentModel.ownedElements[i];
              break;
          }
      }
      if (stateMachineModel === parentModel) {
          stateMachineModel = addModel("UMLStateMachine", parentModel, "ownedElements", function(m) { m.name = "StateMachineContext"; });
      }
    }

    var rlen = stateMachineModel.regions ? stateMachineModel.regions.length : 0;
    if (rlen > 0) {
        rootRegion = stateMachineModel.regions[0];
    } else {
        rootRegion = addModel("UMLRegion", stateMachineModel, "regions", function(m) { m.name = "Region1"; });
    }

    if (diagram && diagram._parent !== stateMachineModel) {
        var oldParent = diagram._parent;
        diagram._parent = stateMachineModel;
        try {
            if (oldParent) {
                builder.fieldRemove(oldParent, "ownedElements", diagram);
            }
            builder.fieldInsert(stateMachineModel, "ownedElements", diagram);
            diagramParentChanged = true;
        } catch (reloErr) {
            diagram._parent = originalDiagramParent;
            throw reloErr;
        }
    }

    var childrenMap = {};
    var rootStates = [];
    var elementsData = {};

    parsedStates.forEach(function(s) {
      s.hasInitial = false;
      s.hasFinal = false;
      s.maxTransWidth = 0;
      elementsData[s.alias] = s;
      if (s.parentAlias) {
        if (!childrenMap[s.parentAlias]) childrenMap[s.parentAlias] = [];
        childrenMap[s.parentAlias].push(s);
      } else {
        rootStates.push(s);
      }
    });

    parsedTransitions.forEach(function(trans) {
        if (trans.from === "[*]" && elementsData[trans.to]) {
            elementsData[trans.to].hasInitial = true;
        }
        if (trans.to === "[*]" && elementsData[trans.from]) {
            elementsData[trans.from].hasFinal = true;
        }
        if (trans.label && trans.from !== "[*]" && trans.to !== "[*]") {
            if (elementsData[trans.from]) {
                var w = trans.label.length * 7;
                if (w > elementsData[trans.from].maxTransWidth) {
                    elementsData[trans.from].maxTransWidth = w;
                }
            }
        }
    });

    var HEADER_HEIGHT = 40;
    var REGION_DIVIDER_HEIGHT = 10;

    // Phase 3.1: Calculate Sizes Bottom-Up
    function calculateSize(stateAlias) {
      var state = elementsData[stateAlias];
      var children = childrenMap[stateAlias] || [];
      if (children.length === 0) {
        state.w = Math.max(120, state.name.length * 8 + 20);
        state.h = 40;
        return;
      }

      var regionsData = [];
      var numRegions = state.regionsCounter || 1;
      for (var k = 0; k < numRegions; k++) regionsData[k] = [];
      children.forEach(function(c) {
        var rIdx = c.regionIndex || 0;
        if (!regionsData[rIdx]) regionsData[rIdx] = [];
        regionsData[rIdx].push(c);
      });

      var maxRegW = 0;
      var totalRegH = 0;
      state.regionSizes = [];

      for (var r = 0; r < regionsData.length; r++) {
        var rStates = regionsData[r] || [];

        var rStateAliases = rStates.map(function(c) { return c.alias; });
        var inDegree = {};
        var adj = {};
        rStateAliases.forEach(function(a) { inDegree[a] = 0; adj[a] = []; });

        parsedTransitions.forEach(function(t) {
            if (rStateAliases.indexOf(t.from) >= 0 && rStateAliases.indexOf(t.to) >= 0) {
                adj[t.from].push(t.to);
                inDegree[t.to] = (inDegree[t.to] || 0) + 1;
            }
        });

        var roots = rStateAliases.filter(function(a) { return inDegree[a] === 0; });
        if (roots.length === 0 && rStateAliases.length > 0) roots.push(rStateAliases[0]);

        var colMap = {};
        var visited = {};
        var q = [];
        roots.forEach(function(rNode) { q.push({alias: rNode, col: 0}); });

        while(q.length > 0) {
            var curr = q.shift();
            if (visited[curr.alias]) continue;
            visited[curr.alias] = true;
            colMap[curr.alias] = curr.col;
            (adj[curr.alias] || []).forEach(function(v) {
                if (!visited[v]) {
                    q.push({alias: v, col: curr.col + 1});
                }
            });
        }

        var cols = [];
        rStates.forEach(function(c) {
            var colIdx = colMap[c.alias] || 0;
            if (!cols[colIdx]) cols[colIdx] = [];
            cols[colIdx].push(c);
        });

        var rX = 0;
        var maxRegH = 0;

        for (var i = 0; i < cols.length; i++) {
            var colStates = cols[i];
            if (!colStates) continue;
            var colW = 0;
            var rY = 40;
            colStates.forEach(function(c) {
                calculateSize(c.alias);
                var leftPad = c.hasInitial ? 70 : 30;
                var rightPad = c.hasFinal ? 70 : 0;
                var transPad = c.maxTransWidth > 0 ? c.maxTransWidth + 20 : 40;
                var postPad = Math.max(rightPad, transPad);

                c.relX = rX + leftPad;
                c.relY = rY;
                colW = Math.max(colW, leftPad + c.w + postPad);
                rY += c.h + 50;
            });
            rX += colW;
            maxRegH = Math.max(maxRegH, rY);
        }

        var regW = rX + 20;
        var regH = maxRegH + 10;
        maxRegW = Math.max(maxRegW, regW);
        totalRegH += regH;
        state.regionSizes.push({ w: regW, h: regH });
      }

      state.w = Math.max(150, maxRegW);
      state.h = HEADER_HEIGHT + totalRegH + (regionsData.length - 1) * REGION_DIVIDER_HEIGHT;
    }

    // Phase 3.2: Calculate Absolute Positions Top-Down
    function calculateAbsolute(stateAlias, absX, absY) {
      var state = elementsData[stateAlias];
      state.x = absX;
      state.y = absY;

      var children = childrenMap[stateAlias] || [];
      if (children.length === 0) return;

      var regionsData = [];
      var numRegions = state.regionsCounter || 1;
      for (var k = 0; k < numRegions; k++) regionsData[k] = [];
      children.forEach(function(c) {
        var rIdx = c.regionIndex || 0;
        if (!regionsData[rIdx]) regionsData[rIdx] = [];
        regionsData[rIdx].push(c);
      });

      var currY = absY + HEADER_HEIGHT;
      for (var r = 0; r < state.regionSizes.length; r++) {
        var rStates = regionsData[r] || [];
        var rSize = state.regionSizes[r];

        rSize.absX = absX;
        rSize.absY = currY;
        rSize.w = state.w; // force width to match composite state width

        rStates.forEach(function(c) {
          calculateAbsolute(c.alias, absX + c.relX, currY + c.relY);
        });

        currY += rSize.h + REGION_DIVIDER_HEIGHT;
      }
    }

    var rootAliases = rootStates.map(function(c) { return c.alias; });
    var inDegreeRoot = {};
    var adjRoot = {};
    rootAliases.forEach(function(a) { inDegreeRoot[a] = 0; adjRoot[a] = []; });
    parsedTransitions.forEach(function(t) {
        if (rootAliases.indexOf(t.from) >= 0 && rootAliases.indexOf(t.to) >= 0) {
            adjRoot[t.from].push(t.to);
            inDegreeRoot[t.to] = (inDegreeRoot[t.to] || 0) + 1;
        }
    });

    var rootsOfRoots = rootAliases.filter(function(a) { return inDegreeRoot[a] === 0; });
    if (rootsOfRoots.length === 0 && rootAliases.length > 0) rootsOfRoots.push(rootAliases[0]);

    var colMapRoot = {};
    var visitedRoot = {};
    var qRoot = [];
    rootsOfRoots.forEach(function(rNode) { qRoot.push({alias: rNode, col: 0}); });

    while(qRoot.length > 0) {
        var curr = qRoot.shift();
        if (visitedRoot[curr.alias]) continue;
        visitedRoot[curr.alias] = true;
        colMapRoot[curr.alias] = curr.col;
        (adjRoot[curr.alias] || []).forEach(function(v) {
            if (!visitedRoot[v]) {
                qRoot.push({alias: v, col: curr.col + 1});
            }
        });
    }

    var rootColsArr = [];
    rootStates.forEach(function(c) {
        var colIdx = colMapRoot[c.alias] || 0;
        if (!rootColsArr[colIdx]) rootColsArr[colIdx] = [];
        rootColsArr[colIdx].push(c);
    });

    var rootX = 50;
    var maxRootH = 0;
    for (var i = 0; i < rootColsArr.length; i++) {
        var colStates = rootColsArr[i];
        if (!colStates) continue;
        var colW = 0;
        var rootY = 50;
        colStates.forEach(function(s) {
            calculateSize(s.alias);
            var leftPad = s.hasInitial ? 70 : 30;
            var rightPad = s.hasFinal ? 70 : 0;
            var transPad = s.maxTransWidth > 0 ? s.maxTransWidth + 20 : 40;
            var postPad = Math.max(rightPad, transPad);

            calculateAbsolute(s.alias, rootX + leftPad, rootY);
            colW = Math.max(colW, leftPad + s.w + postPad);
            rootY += s.h + 50;
        });
        rootX += colW;
        maxRootH = Math.max(maxRootH, rootY);
    }

    function renderState(stateAlias, parentRegionModel, parentContainerView) {
      var state = elementsData[stateAlias];

      var children = childrenMap[stateAlias] || [];

      var model = addModel("UMLState", parentRegionModel, "vertices", function(m) {
        m.name = sanitizeName(state.name);
        if (state.stereotype) m.stereotype = state.stereotype;
      });

      var view = addView("UMLStateView", diagram, model, function(v) {
        if (v.initialize) v.initialize(null, state.x, state.y, state.x + state.w, state.y + state.h);
        v.left = state.x;
        v.top = state.y;
        v.width = state.w;
        v.height = state.h;
      }, parentContainerView);

      var regionModels = [];
      var regionViews = [];
      if (view && model && children.length > 0) {
          var count = state.regionSizes ? state.regionSizes.length : 1;
          var compView = view.decompositionCompartment;
          if (!compView) {
              throw new Error("Missing decompositionCompartment on UMLStateView for composite state " + state.name);
          }
          compView.visible = true;
          for (var i = 0; i < count; i++) {
              var regModel = addModel("UMLRegion", model, "regions", function(reg) { reg.name = "Region" + (i+1); });
              regionModels.push(regModel);

              var rSize = (state.regionSizes && state.regionSizes.length > i) ? state.regionSizes[i] : {absX: state.x, absY: state.y+30, w: state.w, h: state.h-30};
              var regViewType = typeof type !== "undefined" && type.UMLRegionView ? type.UMLRegionView : (global.type && global.type.UMLRegionView ? global.type.UMLRegionView : null);
              if (!regViewType) {
                  throw new Error("UMLRegionView constructor is unavailable");
              }
              var regView = new regViewType();
              regView._parent = compView;
              regView.model = regModel;
              regView.left = rSize.absX;
              regView.top = rSize.absY;
              regView.width = rSize.w;
              regView.height = rSize.h;
              builder.insert(regView);
              builder.fieldInsert(compView, "subViews", regView);
              regionViews.push(regView);
          }
      }

      elementsMap[state.alias] = { model: model, view: view, regions: regionModels, regionViews: regionViews };

      if (children.length > 0) {
          var regionsData = [];
          var numRegions = state.regionsCounter || 1;
          for (var k = 0; k < numRegions; k++) regionsData[k] = [];
          children.forEach(function(c) {
            var rIdx = c.regionIndex || 0;
            if (!regionsData[rIdx]) regionsData[rIdx] = [];
            regionsData[rIdx].push(c);
          });

          var regionCount = state.regionSizes ? state.regionSizes.length : 1;
          for (var r = 0; r < regionCount; r++) {
            var regModel = (regionModels.length > r) ? regionModels[r] : model;
            var regView = (regionViews.length > r) ? regionViews[r] : null;

            var rStates = regionsData[r] || [];
            rStates.forEach(function(c) {
              renderState(c.alias, regModel, regView);
            });
          }
      }
    }

    // Render all roots
    rootStates.forEach(function(s) {
      renderState(s.alias, rootRegion, null);
    });

    // 5. Create Pseudostates & Transitions
    var pseudostateCount = 0;
    function createPseudostate(isInitial, parentAlias, referenceView, overrideRegionIndex) {
      var typeId = isInitial ? "UMLPseudostate" : "UMLFinalState";
      var parentRegionModel = rootRegion;
      var parentContainerView = null;

      if (parentAlias && elementsMap[parentAlias]) {
        var parentData = elementsMap[parentAlias];
        var rIdx = overrideRegionIndex || 0;
        if (parentData.regions && parentData.regions.length > rIdx) {
          parentRegionModel = parentData.regions[rIdx];
        }
        if (parentData.regionViews && parentData.regionViews.length > rIdx) {
          parentContainerView = parentData.regionViews[rIdx];
        }
      }

      var posX = 60 + pseudostateCount * 80;
      var posY = 40;
      if (referenceView) {
         if (isInitial) {
             posX = referenceView.left - 50;
             posY = referenceView.top + Math.max(0, ((referenceView.height || 40) / 2) - 12);
         } else {
             posX = referenceView.left + (referenceView.width || 60) + 35;
             posY = referenceView.top + Math.max(0, ((referenceView.height || 40) / 2) - 12);
         }
      }
      pseudostateCount++;

      var model = addModel(typeId, parentRegionModel, "vertices", function(m) {
        m.name = isInitial ? "Initial" : "Final";
        if (isInitial && typeof type !== "undefined" && type.UMLPseudostate) {
            m.kind = type.UMLPseudostate.PSK_INITIAL;
        }
      });

      var view = addView(typeId + "View", diagram, model, function(v) {
        if (v.initialize) v.initialize(null, posX, posY, posX+25, posY+25);
        v.left = posX;
        v.top = posY;
        v.width = 25;
        v.height = 25;
      }, parentContainerView);

      return view;
    }

    parsedTransitions.forEach(function (trans) {
      var tailView = trans.from === "[*]" ? null : (elementsMap[trans.from] ? elementsMap[trans.from].view : null);
      var headView = trans.to === "[*]" ? null : (elementsMap[trans.to] ? elementsMap[trans.to].view : null);

      if (trans.from === "[*]") tailView = createPseudostate(true, trans.parentAlias, headView, trans.regionIndex);
      if (trans.to === "[*]") headView = createPseudostate(false, trans.parentAlias, tailView, trans.regionIndex);

      if (!tailView || !headView) return;

      var parentRegionModel = rootRegion;
      if (trans.parentAlias && elementsMap[trans.parentAlias]) {
         var pData = elementsMap[trans.parentAlias];
         if (pData.regions && pData.regions.length > (trans.regionIndex || 0)) {
            parentRegionModel = pData.regions[trans.regionIndex || 0];
         } else if (pData.regions && pData.regions.length > 0) {
            parentRegionModel = pData.regions[0];
         }
      }

      var model = addModel("UMLTransition", parentRegionModel, "transitions", function(m) {
        m.source = tailView.model;
        m.target = headView.model;
        if (trans.label) {
          var stereo = "";
          var cleanLabel = trans.label;
          if (cleanLabel.indexOf("<<") !== -1) {
            var matchStereo = cleanLabel.match(/<<([^>]+)>>/);
            if (matchStereo) {
              stereo = matchStereo[1].trim();
              cleanLabel = cleanLabel.replace(/<<[^>]+>>/g, "").trim();
            }
          }
          m.name = cleanLabel;
          if (stereo) m.stereotype = stereo;
        }
      });

      var view = addView("UMLTransitionView", diagram, model, function(v) {
        v.tail = tailView;
        v.head = headView;
        v.lineStyle = 1; // Rectilinear
        if (v.initialize) {
           var sx = tailView.left + (tailView.width || 0)/2;
           var sy = tailView.top + (tailView.height || 0)/2;
           var tx = headView.left + (headView.width || 0)/2;
           var ty = headView.top + (headView.height || 0)/2;
           v.initialize(null, sx, sy, tx, ty);
        }
        if (v.nameLabel) {
            v.nameLabel.visible = true;
            v.nameLabel.alpha = Math.PI / 2;
            v.nameLabel.distance = 15;
        }
        if (v.stereotypeLabel) v.stereotypeLabel.visible = true;
        if (v.propertyLabel) v.propertyLabel.visible = true;
      });
    });

    builder.end();
    var cmd = builder.getOperation();
    if (app.repository && app.repository.doOperation) {
        app.repository.doOperation(cmd);
    }
    } catch (finalErr) {
        console.error("[state-parser] State generation failed.");
        if (diagramParentChanged) {
            diagram._parent = originalDiagramParent;
        }
        if (builder && typeof builder.discard === 'function') {
            try { builder.discard(); } catch(e) {}
        }
        throw finalErr;
    }

  });
}

module.exports = {
  generateDiagram: generateDiagram
};
