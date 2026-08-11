/**
 * ER Diagram (ERD) Parser & Layout Module for StarUML Importer Extension
 */

function sanitizeName(name) {
  if (!name) return "";
  return name.trim();
}

function mapCardinality(symbol) {
  if (!symbol) return "";

  if (symbol === "||") return "1";
  if (symbol === "o|" || symbol === "|o") return "0..1";
  if (symbol === "|{" || symbol === "}|") return "1..*";
  if (symbol === "o{" || symbol === "}o") return "0..*";

  // Fallbacks
  if (symbol.indexOf("{") !== -1 || symbol.indexOf("}") !== -1) {
    if (symbol.indexOf("o") !== -1) return "0..*";
    return "1..*";
  }
  if (symbol.indexOf("o") !== -1) return "0..1";
  return "1";
}

const parserHelper = require("../utils/parser-helper.js");

function generateDiagram(diagram, text) {
  return parserHelper.runInTransaction("ERDDiagram", function(warnings, errors) {
    var lines = text.split("\n");
    var elementsMap = {};
    var entities = [];
    var relations = [];

    var currentEntity = null;
    var isBelowSeparator = false;

    // 1. Parse PlantUML ERD Lines
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      // Skip empty, comments, directives, title
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
        currentEntity = null;
        isBelowSeparator = false;
        continue;
      }

      // If inside entity block
      if (currentEntity) {
        if (line === "--" || line === "..") {
          isBelowSeparator = true;
          continue;
        }

        // Parse columns: * name : type <<stereotype>>
        // Matches optional '*', column name, optional ': type', optional '<<stereotype>>'
        var matchCol = line.match(/^(\*?)\s*([a-zA-Z0-9_]+)\s*(?::\s*([^<]+))?(?:\s*<<([^>]+)>>)?$/);
        if (matchCol) {
          var isMandatory = matchCol[1] === "*";
          var colName = matchCol[2];
          var colType = matchCol[3] ? matchCol[3].trim() : "";
          var stereotype = matchCol[4] ? matchCol[4].trim().toLowerCase() : "";

          var isPK = !isBelowSeparator || stereotype === "pk";
          var isFK = stereotype === "fk";

          currentEntity.columns.push({
            name: colName,
            type: colType,
            primaryKey: isPK,
            foreignKey: isFK,
            nullable: !isMandatory
          });
        }
        continue;
      }

      // Parse Entity declaration: entity "Name" as alias <<stereotype>> {
      var matchEntity = line.match(/^entity\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+([a-zA-Z0-9_]+))?(?:\s+<<([^>]+)>>)?\s*\{$/i);
      if (matchEntity) {
        var entityName = matchEntity[1] || matchEntity[2];
        var alias = matchEntity[3] || entityName;

        currentEntity = {
          name: entityName,
          alias: alias,
          columns: []
        };
        entities.push(currentEntity);
        isBelowSeparator = false;
        continue;
      }

      // Parse Relationships: user ||--o{ order : places
      // Matches LeftEntity "LeftMult" RelationSymbol "RightMult" RightEntity : label
      var matchRel = line.match(/^([a-zA-Z0-9_\.]+)\s*(?:"([^"]+)")?\s*([|o{}]+[\-.]+?[|o{}]+)\s*(?:"([^"]+)")?\s*([a-zA-Z0-9_\.]+)(?:\s*:\s*(.*?)(?:\s+([><]))?)?$/);
      if (matchRel) {
        var left = matchRel[1];
        var symbol = matchRel[3];
        var right = matchRel[5];
        var label = matchRel[6] ? matchRel[6].trim() : "";

        var leftSymbol = "";
        var rightSymbol = "";
        var lineMatch = symbol.match(/^([|o{}]+)([\-.]+)([|o{}]+)$/);
        if (lineMatch) {
          leftSymbol = lineMatch[1];
          rightSymbol = lineMatch[3];
        }

        relations.push({
          from: left,
          to: right,
          leftCardinality: mapCardinality(leftSymbol),
          rightCardinality: mapCardinality(rightSymbol),
          label: label
        });
      }
    }

    // 2. Initialize Models in StarUML
    var parentModel = diagram._parent || app.project.getProject();
    var dataModel = parentModel;

    if (parentModel.getClassName() !== "ERDDataModel") {
      try {
        var existingDM = (parentModel.ownedElements || []).find(function (el) {
          return el.getClassName() === "ERDDataModel";
        });
        if (existingDM) {
          dataModel = existingDM;
        } else {
          dataModel = app.factory.createModel({
            id: "ERDDataModel",
            parent: parentModel,
            modelInitializer: function (model) {
              model.name = "Data Model1";
            }
          });
        }
      } catch (dmErr) {
        console.error("[erd-parser] Failed to create the data model context.");
        throw dmErr;
      }
    }

    // 3. Create Entity Models and Views
    var colsCount = Math.ceil(Math.sqrt(entities.length + 1));
    var columnHeights = [];
    for (var c = 0; c < colsCount; c++) {
      columnHeights.push(100); // Initial Y offset
    }

    entities.forEach(function (entity, index) {
      var colIndex = 0;
      var minHeight = columnHeights[0];
      for (var i = 1; i < colsCount; i++) {
        if (columnHeights[i] < minHeight) {
          minHeight = columnHeights[i];
          colIndex = i;
        }
      }

      var posX = colIndex * 450 + 80;
      var posY = columnHeights[colIndex];
      var height = 40 + (entity.columns.length * 25);

      columnHeights[colIndex] += height + 120;

      try {
        var view = app.factory.createModelAndView({
          id: "ERDEntity",
          parent: dataModel,
          diagram: diagram,
          modelInitializer: function (model) {
            model.name = sanitizeName(entity.name);
          },
          viewInitializer: function (dgmView) {
            dgmView.left = posX;
            dgmView.top = posY;
            dgmView.width = 180;
            dgmView.height = 40 + (entity.columns.length * 20);
          }
        });

        if (view && view.model) {
          elementsMap[entity.alias] = view;

          entity.columns.forEach(function (col) {
            try {
              app.factory.createModel({
                id: "ERDColumn",
                parent: view.model,
                field: "columns",
                modelInitializer: function (model) {
                  model.name = col.name;
                  model.type = col.type;
                  model.primaryKey = col.primaryKey;
                  model.foreignKey = col.foreignKey;
                  model.nullable = col.nullable;
                }
              });
            } catch (colErr) {
              console.error("[erd-parser] Failed to create a column.");
              throw colErr;
            }
          });
        }
      } catch (entityErr) {
        console.error("[erd-parser] Failed to create an entity.");
        throw entityErr;
      }
    });

    // 4. Create Relationships
    relations.forEach(function (rel) {
      var tailView = elementsMap[rel.from];
      var headView = elementsMap[rel.to];

      if (!tailView || !headView) {
        console.warn("[erd-parser] Skipping a relationship with missing entity views.");
        return;
      }

      try {
        app.factory.createModelAndView({
          id: "ERDRelationship",
          parent: dataModel,
          diagram: diagram,
          tailView: tailView,
          headView: headView,
          tailModel: tailView.model,
          headModel: headView.model,
          modelInitializer: function (model) {
            model.end1.cardinality = rel.leftCardinality;
            model.end2.cardinality = rel.rightCardinality;

            if (rel.label) {
              var cleanLabel = rel.label.trim();
              if (cleanLabel.indexOf('"') === 0 && cleanLabel.lastIndexOf('"') === cleanLabel.length - 1) {
                cleanLabel = cleanLabel.substring(1, cleanLabel.length - 1);
              }
              model.name = cleanLabel;
            }
          },
          viewInitializer: function (view) {
            view.lineStyle = 1; // Rectilinear
          }
        });
      } catch (relErr) {
        console.error("[erd-parser] Failed to create a relationship.");
        throw relErr;
      }
    });

  });
}

module.exports = {
  generateDiagram: generateDiagram
};
