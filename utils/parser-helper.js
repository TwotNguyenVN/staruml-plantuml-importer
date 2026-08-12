// utils/parser-helper.js

function isViewElement(elem) {
  if (!elem) return false;
  if (typeof elem.getClassName === "function") {
    var className = elem.getClassName();
    if (typeof className === "string" && className.endsWith("View")) {
      return true;
    }
  }
  if (elem.constructor && typeof elem.constructor.name === "string" && elem.constructor.name.endsWith("View")) {
    return true;
  }
  return false;
}

function runInTransaction(diagramType, parseFn) {
  var originalCreateModel = app.factory.createModel;
  var originalCreateModelAndView = app.factory.createModelAndView;
  var originalGetOperationBuilder = (app.repository && typeof app.repository.getOperationBuilder === "function")
    ? app.repository.getOperationBuilder
    : null;

  var createdModels = [];
  var createdViews = [];
  var expectedOwners = [];
  var warnings = [];
  var errors = [];
  var rollbackAttempted = false;
  var rollbackSucceeded = false;
  var rollbackUnverifiable = false;

  function getOwnerCollections(element, isView) {
    var collections = [];
    var owners = [];
    if (element && element._parent) owners.push(element._parent);
    for (var ownerIndex = 0; ownerIndex < expectedOwners.length; ownerIndex++) {
      if (expectedOwners[ownerIndex].element === element && owners.indexOf(expectedOwners[ownerIndex].owner) === -1) {
        owners.push(expectedOwners[ownerIndex].owner);
      }
    }

    for (var i = 0; i < owners.length; i++) {
      var owner = owners[i];
      var preferredField = isView ? "ownedViews" : "ownedElements";
      if (Array.isArray(owner[preferredField])) {
        collections.push(owner[preferredField]);
      }
      for (var field in owner) {
        if (Object.prototype.hasOwnProperty.call(owner, field) &&
            Array.isArray(owner[field]) &&
            owner[field].indexOf(element) !== -1 &&
            collections.indexOf(owner[field]) === -1) {
          collections.push(owner[field]);
        }
      }
    }
    return collections;
  }

  function captureRollbackObservations(elements, isView) {
    return elements.map(function(element) {
      return {
        element: element,
        collections: getOwnerCollections(element, isView)
      };
    });
  }

  function isDetached(observation) {
    var element = observation.element;
    var observed = false;
    if (app.repository && typeof app.repository.get === "function" && element && element._id !== undefined) {
      try {
        observed = true;
        if (app.repository.get(element._id)) return false;
      } catch (_) {
        return false;
      }
    }
    for (var i = 0; i < observation.collections.length; i++) {
      observed = true;
      if (observation.collections[i].indexOf(element) !== -1) return false;
    }
    return observed;
  }

  function rollbackCreatedElements() {
    rollbackAttempted = true;
    var rollbackFailed = false;
    var modelObservations = captureRollbackObservations(createdModels, false);
    var viewObservations = captureRollbackObservations(createdViews, true);
    var observations = modelObservations.concat(viewObservations);

    if (builderInstance) {
      try {
        builderInstance.discard();
      } catch (_) {
        rollbackFailed = true;
      }
    }

    var residualCount = observations.length;
    if (residualCount > 0) {
      try {
        if (app.engine && typeof app.engine.deleteElements === "function") {
          app.engine.deleteElements(createdModels, createdViews);
          residualCount = observations.reduce(function(count, observation) {
            return count + (isDetached(observation) ? 0 : 1);
          }, 0);
        } else {
          rollbackFailed = true;
        }
      } catch (_) {
        rollbackFailed = true;
      }
    }

    if (rollbackUnverifiable) residualCount = null;
    rollbackSucceeded = !rollbackFailed && !rollbackUnverifiable && residualCount === 0;
    if (!rollbackSucceeded) {
      errors.push("Rollback failed or may be incomplete.");
    }
    return residualCount;
  }

  // Overrides to intercept and track created elements
  app.factory.createModel = function(options) {
    var model;
    try {
      model = originalCreateModel.call(app.factory, options);
    } catch (error) {
      rollbackUnverifiable = true;
      throw error;
    }
    if (model) {
      if (options && options.parent) expectedOwners.push({ element: model, owner: options.parent });
      if (createdModels.indexOf(model) === -1) {
        createdModels.push(model);
      }
    }
    return model;
  };

  app.factory.createModelAndView = function(options) {
    var view;
    try {
      view = originalCreateModelAndView.call(app.factory, options);
    } catch (error) {
      rollbackUnverifiable = true;
      throw error;
    }
    if (view) {
      if (view.model && options && options.parent) expectedOwners.push({ element: view.model, owner: options.parent });
      if (options && options.diagram) expectedOwners.push({ element: view, owner: options.diagram });
      if (view.model && createdModels.indexOf(view.model) === -1) {
        createdModels.push(view.model);
      }
      if (createdViews.indexOf(view) === -1) {
        createdViews.push(view);
      }
    }
    return view;
  };

  var builderInstance = null;
  var builderPatches = [];
  if (app.repository && originalGetOperationBuilder) {
    app.repository.getOperationBuilder = function() {
      var builder = originalGetOperationBuilder.call(app.repository);
      builderInstance = builder;
      var originalInsert = builder.insert;
      builderPatches.push({ builder: builder, insert: originalInsert });
      builder.insert = function(elem) {
        try {
          originalInsert.call(builder, elem);
        } catch (error) {
          rollbackUnverifiable = true;
          throw error;
        }
        if (isViewElement(elem)) {
          if (createdViews.indexOf(elem) === -1) {
            createdViews.push(elem);
          }
        } else {
          if (createdModels.indexOf(elem) === -1) {
            createdModels.push(elem);
          }
        }
      };
      return builder;
    };
  }

  try {
    parseFn(warnings, errors);
    var createdCount = createdModels.length + createdViews.length;
    if (createdCount === 0) {
      errors.push("No elements were created.");
    }
    if (errors.length > 0 && createdCount > 0) {
      createdCount = rollbackCreatedElements();
    }
    return {
      success: errors.length === 0,
      diagramType: diagramType,
      createdCount: createdCount,
      warnings: warnings,
      errors: errors,
      rollbackAttempted: rollbackAttempted,
      rollbackSucceeded: rollbackSucceeded
    };
  } catch (_) {
    errors.push("Import failed because an unexpected error occurred during parsing or commit.");
    var residualCount = rollbackCreatedElements();

    return {
      success: false,
      diagramType: diagramType,
      createdCount: residualCount,
      warnings: warnings,
      errors: errors,
      rollbackAttempted: rollbackAttempted,
      rollbackSucceeded: rollbackSucceeded
    };
  } finally {
    // Restoration guaranteed in finally block
    app.factory.createModel = originalCreateModel;
    app.factory.createModelAndView = originalCreateModelAndView;
    if (app.repository && originalGetOperationBuilder) {
      app.repository.getOperationBuilder = originalGetOperationBuilder;
    }
    for (var i = builderPatches.length - 1; i >= 0; i--) {
      builderPatches[i].builder.insert = builderPatches[i].insert;
    }
  }
}

module.exports = {
  runInTransaction: runInTransaction
};
