/**
 * State Diagram (Statechart) Parser & Layout Module for StarUML Importer Extension
 */

function sanitizeName(name) {
  if (!name) return "";
  return name.trim();
}

function generateDiagram(diagram, text) {
  var lines = text.split("\n");
  var elementsMap = {};
  
  var parsedStates = [];
  var parsedTransitions = [];
  
  var stack = [];
  var activeRegionName = "main";

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
      isComposite: false
    };
    parsedStates.push(newState);
    return newState;
  }
  
  // 1. First Pass: Parse lines to build State and Transition AST
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
    
    // End of block
    if (line === "}") {
      if (stack.length > 0) {
        stack.pop();
      }
      continue;
    }
    
    // Parse State with block definition: state "name" as alias <<stereotype>> {
    var matchStateBlock = line.match(/^state\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?\s*\{$/i);
    if (matchStateBlock) {
      var stateName = matchStateBlock[1] || matchStateBlock[2];
      var alias = matchStateBlock[3] || stateName;
      var stereotype = matchStateBlock[4] || "";
      
      var parentAlias = stack.length > 0 ? stack[stack.length - 1].alias : null;
      
      var existing = parsedStates.find(function(s) { return s.alias === alias; });
      var stateObj;
      if (existing) {
        existing.isComposite = true;
        existing.name = stateName;
        existing.stereotype = stereotype;
        existing.parentAlias = parentAlias;
        stateObj = existing;
      } else {
        stateObj = {
          type: "UMLState",
          name: stateName,
          alias: alias,
          stereotype: stereotype,
          parentAlias: parentAlias,
          isComposite: true
        };
        parsedStates.push(stateObj);
      }
      stack.push(stateObj);
      continue;
    }
    
    // Parse State inline definition: state "name" as alias <<stereotype>>
    var matchState = line.match(/^state\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+(\w+))?(?:\s+<<([^>]+)>>)?$/i);
    if (matchState) {
      var stateName = matchState[1] || matchState[2];
      var alias = matchState[3] || stateName;
      var stereotype = matchState[4] || "";
      
      var parentAlias = stack.length > 0 ? stack[stack.length - 1].alias : null;
      
      var existing = parsedStates.find(function(s) { return s.alias === alias; });
      if (existing) {
        existing.name = stateName;
        existing.stereotype = stereotype;
        existing.parentAlias = parentAlias;
      } else {
        parsedStates.push({
          type: "UMLState",
          name: stateName,
          alias: alias,
          stereotype: stereotype,
          parentAlias: parentAlias,
          isComposite: false
        });
      }
      continue;
    }
    
    // Parse State Value details: state alias : Key=Value (ignore or keep as name/stereotype)
    var matchStateValue = line.match(/^state\s+(\w+)\s*:\s*(.+)$/i);
    if (matchStateValue) {
      var alias = matchStateValue[1];
      var value = matchStateValue[2].trim();
      var existing = parsedStates.find(function(s) { return s.alias === alias; });
      if (existing) {
        existing.name = existing.name + " (" + value + ")";
      } else {
        parsedStates.push({
          type: "UMLState",
          name: alias + " (" + value + ")",
          alias: alias,
          stereotype: "",
          parentAlias: stack.length > 0 ? stack[stack.length - 1].alias : null,
          isComposite: false
        });
      }
      continue;
    }
    
    // Parse Transitions: state1 --> state2 : event <<stereotype>>
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
      
      var from = leftStr;
      var to = rightStr;
      
      var parentAlias = stack.length > 0 ? stack[stack.length - 1].alias : null;
      
      getOrCreateStateInfo(from, parentAlias);
      getOrCreateStateInfo(to, parentAlias);
      
      parsedTransitions.push({
        from: from,
        to: to,
        label: label,
        parentAlias: parentAlias
      });
    }
  }
  
  // 2. Initialize Models in StarUML
  var parentModel = diagram._parent || app.project.getProject();
  var stateMachineModel = null;
  var rootRegion = null;

  if (parentModel.getClassName() === "UMLRegion") {
    // If we're already inside a Region (normal case for Statechart Diagram in StarUML)
    rootRegion = parentModel;
    stateMachineModel = rootRegion._parent;
  } else {
    // Find or create UMLStateMachine context
    stateMachineModel = parentModel;
    if (parentModel.getClassName() !== "UMLStateMachine") {
      try {
        var existingSM = null;
        if (parentModel.ownedElements && typeof parentModel.ownedElements.find === "function") {
            existingSM = parentModel.ownedElements.find(function (el) {
                return el.getClassName() === "UMLStateMachine";
            });
        }
        if (existingSM) {
          stateMachineModel = existingSM;
        } else {
          stateMachineModel = app.factory.createModel({
            id: "UMLStateMachine",
            parent: parentModel,
            modelInitializer: function (model) {
              model.name = "StateMachineContext";
            }
          });
        }
      } catch (smErr) {
        console.error("[state-parser] Failed to find/create UMLStateMachine context:", smErr);
      }
    }
    
    // Ensure StateMachine has a UMLRegion
    try {
      if (stateMachineModel && stateMachineModel.regions && typeof stateMachineModel.regions.find === "function") {
        rootRegion = stateMachineModel.regions.find(function(r) { return r.getClassName() === "UMLRegion"; });
      }
      if (!rootRegion) {
        rootRegion = app.factory.createModel({
          id: "UMLRegion",
          parent: stateMachineModel,
          field: "regions",
          modelInitializer: function (model) {
            model.name = "Region1";
          }
        });
      }
    } catch (regErr) {
      console.error("[state-parser] Failed to create root UMLRegion:", regErr);
    }
  }
  
  // Map to hold parent regions for composite states
  var regionsMap = {
    root: rootRegion
  };
  
  // Helper to ensure a composite state has a region
  function getRegionForState(stateModel) {
    try {
      var reg = stateModel.regions.find(function(r) { return r.getClassName() === "UMLRegion"; });
      if (!reg) {
        reg = app.factory.createModel({
          id: "UMLRegion",
          parent: stateModel,
          field: "regions",
          modelInitializer: function(m) {
            m.name = "Region_" + stateModel.name;
          }
        });
      }
      return reg;
    } catch (err) {
      console.error("[state-parser] Failed to create region inside composite state:", stateModel.name, err);
      return rootRegion;
    }
  }
  
  // Create defined states (composite first, then simple)
  // Sort composite states first so that children can look up parents
  parsedStates.sort(function(a, b) {
    if (a.isComposite && !b.isComposite) return -1;
    if (!a.isComposite && b.isComposite) return 1;
    return 0;
  });
  

  
  // Create all State views
  var totalStates = parsedStates.length;
  var colsCount = Math.ceil(Math.sqrt(totalStates + 2)); // grid spacing
  
  parsedStates.forEach(function (state, index) {
    var parentRegion = rootRegion;
    if (state.parentAlias) {
      var parentStateView = elementsMap[state.parentAlias];
      if (parentStateView && parentStateView.model) {
        parentRegion = getRegionForState(parentStateView.model);
      }
    }
    
    // Grid positioning layout
    var colIndex = index % colsCount;
    var rowIndex = Math.floor(index / colsCount);
    
    var posX = colIndex * 240 + 80;
    var posY = rowIndex * 160 + 100;
    var width = state.isComposite ? 200 : 120;
    var height = state.isComposite ? 120 : 50;
    
    try {
      var view = app.factory.createModelAndView({
        id: "UMLState",
        parent: parentRegion,
        field: "vertices",
        diagram: diagram,
        modelInitializer: function (model) {
          model.name = sanitizeName(state.name);
          if (state.stereotype) {
            model.stereotype = state.stereotype;
          }
        },
        viewInitializer: function (dgmView) {
          dgmView.left = posX;
          dgmView.top = posY;
          dgmView.width = width;
          dgmView.height = height;
        }
      });
      if (view) {
        elementsMap[state.alias] = view;
      }
    } catch (stateErr) {
      console.error("[state-parser] Failed to create state:", state.name, stateErr);
    }
  });
  
  // Create Pseudostates for initial/final transitions
  var pseudostateCount = 0;
  function createPseudostate(isInitial, parentAlias) {
    var parentRegion = rootRegion;
    if (parentAlias) {
      var parentStateView = elementsMap[parentAlias];
      if (parentStateView && parentStateView.model) {
        parentRegion = getRegionForState(parentStateView.model);
      }
    }
    
    var typeId = isInitial ? "UMLPseudostate" : "UMLFinalState";
    var posX = 60 + pseudostateCount * 80;
    var posY = 40;
    pseudostateCount++;
    
    try {
      var view = app.factory.createModelAndView({
        id: typeId,
        parent: parentRegion,
        field: "vertices",
        diagram: diagram,
        modelInitializer: function (model) {
          if (isInitial) {
            model.kind = "initial";
          }
        },
        viewInitializer: function (dgmView) {
          dgmView.left = posX;
          dgmView.top = posY;
          dgmView.width = 25;
          dgmView.height = 25;
        }
      });
      return view;
    } catch (err) {
      console.error("[state-parser] Failed to create pseudostate/final state:", err);
      return null;
    }
  }
  
  // Create Transitions
  parsedTransitions.forEach(function (trans) {
    var tailView = null;
    var headView = null;
    
    // Handle initial state transitions
    if (trans.from === "[*]") {
      tailView = createPseudostate(true, trans.parentAlias);
    } else {
      tailView = elementsMap[trans.from];
    }
    
    // Handle final state transitions
    if (trans.to === "[*]") {
      headView = createPseudostate(false, trans.parentAlias);
    } else {
      headView = elementsMap[trans.to];
    }
    
    if (!tailView || !headView) {
      console.warn("[state-parser] Skipping transition: missing state views", trans.from, "->", trans.to);
      return;
    }
    
    var parentRegion = rootRegion;
    if (trans.parentAlias) {
      var parentStateView = elementsMap[trans.parentAlias];
      if (parentStateView && parentStateView.model) {
        parentRegion = getRegionForState(parentStateView.model);
      }
    }
    
    try {
      app.factory.createModelAndView({
        id: "UMLTransition",
        parent: parentRegion,
        field: "transitions",
        diagram: diagram,
        tailView: tailView,
        headView: headView,
        tailModel: tailView.model,
        headModel: headView.model,
        modelInitializer: function (model) {
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
            if (stereo) {
              model.stereotype = stereo;
            }
          }
        },
        viewInitializer: function (view) {
          view.lineStyle = 1; // Rectilinear
        }
      });
    } catch (transErr) {
      console.error("[state-parser] Failed to create UMLTransition:", trans.from, "->", trans.to, transErr);
    }
  });
}

module.exports = {
  generateDiagram: generateDiagram
};
