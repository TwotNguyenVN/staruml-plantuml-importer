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
  var warnings = [];
  var errors = [];
  var rollbackAttempted = false;
  var rollbackSucceeded = false;

  // Overrides to intercept and track created elements
  app.factory.createModel = function(options) {
    var model = originalCreateModel.call(app.factory, options);
    if (model) {
      if (createdModels.indexOf(model) === -1) {
        createdModels.push(model);
      }
    }
    return model;
  };

  app.factory.createModelAndView = function(options) {
    var view = originalCreateModelAndView.call(app.factory, options);
    if (view) {
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
  if (app.repository && originalGetOperationBuilder) {
    app.repository.getOperationBuilder = function() {
      var builder = originalGetOperationBuilder.call(app.repository);
      builderInstance = builder;
      var originalInsert = builder.insert;
      builder.insert = function(elem) {
        originalInsert.call(builder, elem);
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
    return {
      success: true,
      diagramType: diagramType,
      createdCount: createdModels.length + createdViews.length,
      warnings: warnings,
      errors: errors,
      rollbackAttempted: false,
      rollbackSucceeded: false
    };
  } catch (err) {
    rollbackAttempted = true;
    var rollbackError = null;

    if (builderInstance) {
      try {
        builderInstance.discard();
      } catch (discardErr) {
        // Safe discard
      }
    }

    var residualCount = createdModels.length + createdViews.length;
    if (createdModels.length > 0 || createdViews.length > 0) {
      try {
        if (app.engine && typeof app.engine.deleteElements === "function") {
          app.engine.deleteElements(createdModels, createdViews);
          rollbackSucceeded = true;
          residualCount = 0; // successfully deleted everything
        } else {
          rollbackSucceeded = false;
        }
      } catch (rerr) {
        rollbackSucceeded = false;
        rollbackError = rerr;
      }
    } else {
      // Nothing to delete, rollback succeeded
      rollbackSucceeded = true;
      residualCount = 0;
    }

    var errMsg = err.message || String(err);
    errors.push(errMsg);
    if (rollbackError) {
      errors.push("Rollback failed: " + (rollbackError.message || String(rollbackError)));
    }

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
  }
}

module.exports = {
  runInTransaction: runInTransaction
};
