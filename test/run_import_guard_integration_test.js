require("./fail_on_console_error.js");

const assert = require("assert");
const dialogHelper = require("../utils/dialog-helper");
const parsers = [
  require("../parsers/usecase-parser"),
  require("../parsers/class-parser"),
  require("../parsers/sequence-parser"),
  require("../parsers/activity-parser"),
  require("../parsers/state-parser"),
  require("../parsers/erd-parser"),
  require("../parsers/mindmap-parser"),
  require("../parsers/requirement-parser")
];

let parserCalls = 0;
parsers.forEach(parser => {
  parser.generateDiagram = function () {
    parserCalls += 1;
    throw new Error("Parser must not run for oversized input");
  };
});

let alertMessage = "";
global.app = {
  diagrams: { getCurrentDiagram: function () { return { getClassName: function () { return "UMLClassDiagram"; } }; } },
  dialogs: {
    showAlertDialog: function (message) { alertMessage = message; },
    showInfoDialog: function () { throw new Error("Oversized import must not succeed"); }
  }
};
dialogHelper.showImportDialog = function () { return Promise.resolve("x".repeat(200001)); };
dialogHelper.closeImportDialog = function () {};

const main = require("../main");
main.handleImportAuto();

setTimeout(function () {
  try {
    assert.strictEqual(parserCalls, 0, "Oversized input must cause zero parser/factory calls");
    assert.match(alertMessage, /200000 characters/);
    assert.ok(alertMessage.length < 500, "Oversized input alert must remain bounded");
    console.log("Import guard integration test passed.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}, 20);
