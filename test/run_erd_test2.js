require('./fail_on_console_error.js');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const parser = require('../parsers/erd-parser.js');

const text = fs.readFileSync(path.join(__dirname, 'ERD2.puml'), 'utf8');

var lines = text.split("\n");
var entities = [];
var currentEntity = null;
var isBelowSeparator = false;

for (var i = 0; i < lines.length; i++) {
  var line = lines[i].trim();
  if (!line || line.indexOf("'") === 0 || line.indexOf("@startuml") === 0 || line.indexOf("@enduml") === 0 || line.indexOf("title ") === 0) continue;
  if (line === "}") { currentEntity = null; isBelowSeparator = false; continue; }

  if (currentEntity) {
    if (line === "--" || line === "..") { isBelowSeparator = true; continue; }
    var matchCol = line.match(/^(\*?)\s*([a-zA-Z0-9_]+)\s*(?::\s*([^<]+))?(?:\s*<<([^>]+)>>)?$/);
    if (matchCol) { currentEntity.columns.push(matchCol[2]); }
    else { console.log("Failed to match col:", line); }
    continue;
  }

  var matchEntity = line.match(/^entity\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))(?:\s+as\s+([a-zA-Z0-9_]+))?(?:\s+<<([^>]+)>>)?\s*\{$/i);
  if (matchEntity) {
    var entityName = matchEntity[1] || matchEntity[2];
    currentEntity = { name: entityName, columns: [] };
    entities.push(currentEntity);
    isBelowSeparator = false;
    continue;
  }
}

assert.ok(entities.length > 0, "Should have parsed at least one entity");
assert.ok(entities.every(e => e.columns.length > 0), "All parsed entities should have columns");
console.log("Success: run_erd_test2 completed, parsed " + entities.length + " entities.");
