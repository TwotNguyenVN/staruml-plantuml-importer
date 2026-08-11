require("./fail_on_console_error.js");

const assert = require("assert");
const dialogHelper = require("../utils/dialog-helper");
const classParser = require("../parsers/class-parser");

const warnings = Array.from({ length: 12 }, function (_, index) { return "warning-" + (index + 1); });
classParser.generateDiagram = function () {
  return { success: true, createdCount: 1, warnings: warnings, errors: [] };
};

let infoMessage = "";
global.app = {
  diagrams: { getCurrentDiagram: function () { return { getClassName: function () { return "UMLClassDiagram"; } }; } },
  dialogs: {
    showAlertDialog: function (message) { throw new Error("Unexpected alert: " + message); },
    showInfoDialog: function (message) { infoMessage = message; }
  }
};
dialogHelper.showImportDialog = function () { return Promise.resolve("class A"); };
dialogHelper.closeImportDialog = function () {};

const main = require("../main");
main.handleImportAuto();

setTimeout(function () {
  try {
    for (let index = 1; index <= 10; index += 1) assert.match(infoMessage, new RegExp("warning-" + index + "(?:\\n|$)"));
    assert.doesNotMatch(infoMessage, /warning-11|warning-12/);
    assert.match(infoMessage, /2 more warning\(s\)/);
    console.log("Import warning integration test passed.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}, 20);
