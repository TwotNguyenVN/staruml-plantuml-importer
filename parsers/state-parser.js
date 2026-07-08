/**
 * State Diagram (Statechart) Parser & Layout Module for StarUML Importer Extension
 */

function sanitizeName(name) {
  if (!name) return "";
  return name.trim();
}

function generateDiagram(diagram, text) {
  try {
    global.hasShownStateError = false;
    
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
        var parentAlias = stack.length > 0 ? stack[stack.length - 1].alias : null;
        
        getOrCreateStateInfo(leftStr, parentAlias);
        getOrCreateStateInfo(rightStr, parentAlias);
        
        parsedTransitions.push({ from: leftStr, to: rightStr, label: label, parentAlias: parentAlias });
      }
    }
    
    // 2. Initialize Models in StarUML
    var parentModel = diagram._parent || app.project.getProject();
    var stateMachineModel = null;
    var rootRegion = null;

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
          stateMachineModel = app.factory.createModel({
              id: "UMLStateMachine", parent: parentModel,
              modelInitializer: function (model) { model.name = "StateMachineContext"; }
          });
      }
    }
    
    try {
        var rlen = stateMachineModel.regions ? stateMachineModel.regions.length : 0;
        if (rlen > 0) {
            rootRegion = stateMachineModel.regions[0];
        } else {
            rootRegion = app.factory.createModel({
                id: "UMLRegion", parent: stateMachineModel, field: "regions",
                modelInitializer: function (model) { model.name = "Region1"; }
            });
        }
    } catch (regErr) {
      console.error("[state-parser] Failed to create root UMLRegion:", regErr);
    }
    
    if (diagram && diagram._parent !== stateMachineModel) {
        try {
            if (app.engine && app.engine.relocate) {
                app.engine.relocate(diagram, stateMachineModel, "ownedElements");
            } else {
                diagram._parent = stateMachineModel;
            }
        } catch (err) {
            console.error("[state-parser] Failed to relocate diagram:", err);
            diagram._parent = stateMachineModel;
        }
    }
    
    // 3. Tree-based Layout Engine
    var childrenMap = {};
    var rootStates = [];
    var elementsData = {};
    
    parsedStates.forEach(function(s) {
      elementsData[s.alias] = s;
      if (s.parentAlias) {
        if (!childrenMap[s.parentAlias]) childrenMap[s.parentAlias] = [];
        childrenMap[s.parentAlias].push(s);
      } else {
        rootStates.push(s);
      }
    });
    
    var PADDING = 20;
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
        var rX = 0;
        var maxRowH = 0;
        
        rStates.forEach(function(c) {
          calculateSize(c.alias);
          c.relX = rX + PADDING;
          c.relY = PADDING;
          rX += c.w + PADDING;
          maxRowH = Math.max(maxRowH, c.h);
        });
        
        var regW = rX + PADDING;
        var regH = maxRowH + PADDING * 2;
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
    
    var rootX = 50;
    var rootY = 50;
    var rootMaxH = 0;
    var rootCols = Math.ceil(Math.sqrt(rootStates.length + 2));
    var rc = 0;
    rootStates.forEach(function(s) {
      calculateSize(s.alias);
      calculateAbsolute(s.alias, rootX, rootY);
      rootX += s.w + PADDING;
      rootMaxH = Math.max(rootMaxH, s.h);
      rc++;
      if (rc >= rootCols) {
        rc = 0;
        rootX = 50;
        rootY += rootMaxH + PADDING;
        rootMaxH = 0;
      }
    });
    
    function renderState(stateAlias, parentRegionModel, parentContainerView) {
      var state = elementsData[stateAlias];
      
      var view = null;
      try {
        var children = childrenMap[stateAlias] || [];
        
        view = app.factory.createModelAndView({
          id: "UMLState",
          parent: parentRegionModel,
          field: "vertices",
          diagram: diagram,
          containerView: parentContainerView,
          modelInitializer: function(m) {
            m.name = sanitizeName(state.name);
            if (state.stereotype) m.stereotype = state.stereotype;
          },
          viewInitializer: function(v) {
            v.left = state.x;
            v.top = state.y;
            v.width = state.w;
            v.height = state.h;
            if (parentContainerView && parentContainerView !== diagram) {
               v.containerView = parentContainerView;
            }
          }
        });
        
        if (view && view.model && children.length > 0) {
            var count = state.regionSizes ? state.regionSizes.length : 1;
            for (var i = 0; i < count; i++) {
                try {
                    app.factory.createModel({
                        id: "UMLRegion", parent: view.model, field: "regions",
                        modelInitializer: function(reg) { reg.name = "Region"; }
                    });
                } catch(e) { console.error("Failed to create UMLRegion", e); }
            }
        }
        
        // Bơm Model xuống tất cả các Khối phụ để hiển thị Chữ và Fix lỗi Tàng hình (0x0)
        if (view && view.model) {
            if (view.nameCompartment) view.nameCompartment.model = view.model;
            if (view.internalActivityCompartment) view.internalActivityCompartment.model = view.model;
            if (view.internalTransitionCompartment) view.internalTransitionCompartment.model = view.model;
            if (view.decompositionCompartment) view.decompositionCompartment.model = view.model;
        }
        
      } catch (e) {
        console.error("Error creating state", state.name, e);
        if (app.dialogs) app.dialogs.showAlertDialog("Failed to create state '" + state.name + "': " + String(e));
        return;
      }
      
      if (!view) return;
      
      elementsMap[state.alias] = view;
      var children = childrenMap[stateAlias] || [];
      
      if (children.length > 0) {
        var compView = view.decompositionCompartment;
        if (compView) {
          compView.visible = true;
          
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
            var regModel = (view.model.regions && view.model.regions.length > r) ? view.model.regions[r] : view.model;
            var rSize = (state.regionSizes && state.regionSizes.length > r) ? state.regionSizes[r] : {absX: state.x, absY: state.y+30, w: state.w, h: state.h-30};
            
            var regView = null;
            if (compView.subViews && compView.subViews.length > r) {
               regView = compView.subViews[r];
               if (regView) {
                  regView.left = rSize.absX;
                  regView.top = rSize.absY;
                  regView.width = rSize.w;
                  regView.height = rSize.h;
               }
            }
            
            var rStates = regionsData[r] || [];
            rStates.forEach(function(c) {
              renderState(c.alias, regModel, regView || view);
            });
          }
        } else {
          // Fallback if no compartment view
          children.forEach(function(c) {
            renderState(c.alias, rootRegion, parentContainerView); // flatten fallback
          });
        }
      }
    }
    
    // Find StateMachineView to act as frame container for root elements
    var frameView = null;
    if (diagram && diagram.ownedViews) {
        for (var f = 0; f < diagram.ownedViews.length; f++) {
            var v = diagram.ownedViews[f];
            if (v && v.getClassName() === "UMLStateMachineView") {
                frameView = v;
                break;
            }
        }
    }
    var starUMLType = typeof type !== "undefined" ? type : (typeof global !== "undefined" && global.type ? global.type : null);
    if (!frameView && starUMLType && starUMLType.UMLStateMachineView) {
        try {
            frameView = new starUMLType.UMLStateMachineView();
            frameView._parent = diagram;
            frameView.model = stateMachineModel;
            frameView.initialize(null, 10, 10, 800, 600);
            app.engine.addItem(diagram, "ownedViews", frameView);
        } catch (err) {
            console.error("Failed to create UMLStateMachineView manually:", err);
            frameView = diagram; // fallback
        }
    } else if (!frameView) {
        frameView = diagram; // fallback
    }
    
    
    // Render all roots
    rootStates.forEach(function(s) {
      renderState(s.alias, rootRegion, frameView);
    });
    
    // 5. Create Pseudostates & Transitions
    var pseudostateCount = 0;
    function createPseudostate(isInitial, parentAlias, referenceView) {
      var typeId = isInitial ? "UMLPseudostate" : "UMLFinalState";
      var parentRegionModel = rootRegion;
      var parentContainerView = frameView;
      
      if (parentAlias && elementsMap[parentAlias]) {
        var parentView = elementsMap[parentAlias];
        if (parentView.model && parentView.model.regions && parentView.model.regions.length > 0) {
          parentRegionModel = parentView.model.regions[parentView.model.regions.length - 1];
        }
        if (parentView.decompositionCompartment && parentView.decompositionCompartment.subViews && parentView.decompositionCompartment.subViews.length > 0) {
          parentContainerView = parentView.decompositionCompartment.subViews.get(parentView.decompositionCompartment.subViews.length - 1);
        } else {
          parentContainerView = parentView;
        }
      }
      
      var posX = 60 + pseudostateCount * 80;
      var posY = 40;
      if (parentContainerView && parentContainerView !== diagram) {
         posX = parentContainerView.left + 20 + pseudostateCount * 40;
         posY = parentContainerView.top + 40;
      }
      if (referenceView) {
         if (isInitial) {
             posX = referenceView.left + Math.max(0, ((referenceView.width || 60) / 2) - 12);
             posY = referenceView.top - 40;
         } else {
             posX = referenceView.left + (referenceView.width || 60) + 40;
             posY = referenceView.top + Math.max(0, ((referenceView.height || 40) / 2) - 12);
         }
      }
      pseudostateCount++;
      
      try {
        var view = app.factory.createModelAndView({
          id: typeId,
          parent: parentRegionModel,
          field: "vertices",
          diagram: diagram,
          containerView: parentContainerView,
          modelInitializer: function(m) {
            m.name = isInitial ? "Initial" : "Final";
          },
          viewInitializer: function(v) {
            v.left = posX;
            v.top = posY;
            v.width = 25;
            v.height = 25;
            if (parentContainerView && parentContainerView !== diagram) {
               v.containerView = parentContainerView;
            }
          }
        });
        
        return view;
  
      } catch (err) {
        console.error("[state-parser] Failed to create pseudostate:", err);
        return null;
      }
    }
    
    parsedTransitions.forEach(function (trans) {
      var tailView = trans.from === "[*]" ? null : elementsMap[trans.from];
      var headView = trans.to === "[*]" ? null : elementsMap[trans.to];
      
      if (trans.from === "[*]") tailView = createPseudostate(true, trans.parentAlias, headView);
      if (trans.to === "[*]") headView = createPseudostate(false, trans.parentAlias, tailView);
      
      if (!tailView || !headView) return;
      
      var parentRegionModel = rootRegion;
      var parentContainerView = frameView;
      if (trans.parentAlias && elementsMap[trans.parentAlias]) {
         var pView = elementsMap[trans.parentAlias];
         if (pView.model && pView.model.regions && pView.model.regions.length > 0) {
            parentRegionModel = pView.model.regions[pView.model.regions.length - 1];
         }
         if (pView.decompositionCompartment && pView.decompositionCompartment.subViews && pView.decompositionCompartment.subViews.length > 0) {
            parentContainerView = pView.decompositionCompartment.subViews.get(pView.decompositionCompartment.subViews.length - 1);
         } else {
            parentContainerView = pView;
         }
      }
      
      try {
        var tView = app.factory.createModelAndView({
          id: "UMLTransition",
          parent: parentRegionModel,
          field: "transitions",
          diagram: diagram,
          containerView: parentContainerView,
          tailView: tailView,
          headView: headView,
          tailModel: tailView.model,
          headModel: headView.model,
          modelInitializer: function (model) {
            model.source = tailView.model;
            model.target = headView.model;
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
              model.name = cleanLabel;
              if (stereo) model.stereotype = stereo;
            }
          },
          viewInitializer: function (v) {
            v.lineStyle = 1; // Rectilinear
            if (v.nameLabel) {
                v.nameLabel.visible = true;
                v.nameLabel.alpha = Math.PI / 2;
                v.nameLabel.distance = 15;
            }
            if (v.stereotypeLabel) v.stereotypeLabel.visible = true;
            if (v.propertyLabel) v.propertyLabel.visible = true;
          }
        });
      } catch (transErr) {
        console.error("[state-parser] Failed to create UMLTransition:", transErr);
      }
    });

  } catch (globalErr) {
    var errTxt = (globalErr && globalErr.message) ? (globalErr.message + "\n" + globalErr.stack) : String(globalErr);
    app.dialogs.showAlertDialog("FATAL ERROR in state-parser:\n" + errTxt);
    console.error(globalErr);
  }
}

module.exports = {
  generateDiagram: generateDiagram
};
