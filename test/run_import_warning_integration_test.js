require("./fail_on_console_error.js");

const assert = require("assert");
const dialogHelper = require("../utils/dialog-helper");
const classParser = require("../parsers/class-parser");

const warnings = Array.from({ length: 12 }, function (_, index) { return "warning-" + (index + 1); });
warnings[0] += " Authorization: Bearer integration-secret-token";
warnings[1] += " access_token=integration-access-token file://server/private/warning.txt\u001b[31m";
warnings[2] += " password=\"integration multiword password\"";
warnings[3] += " AWS_ACCESS_KEY_ID=AKIAINTEGRATION AWS_SECRET_ACCESS_KEY=integration-provider-secret";
warnings[4] += " ghp_integrationGitHubToken github_pat_integrationPatToken";
warnings[5] += " eyJhbGciOiJIUzI1NiJ9.e30.integrationSignature";
warnings[6] += " -----BEGIN PRIVATE KEY-----\nintegration-truncated-private-key-body";
warnings[7] += " C:\\Program Files\\StarUML\\integration private file.js";
warnings[8] += " standalone ASIAIOSFODNN7EXAMPLE";
warnings[9] += " password=integration unquoted multiword password";
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
    for (let index = 1; index <= 10; index += 1) assert.match(infoMessage, new RegExp("warning-" + index + "(?:\\s|$)"));
    assert.doesNotMatch(infoMessage, /warning-11|warning-12/);
    assert.match(infoMessage, /2 more warning\(s\)/);
    assert.doesNotMatch(infoMessage, /integration-secret-token|integration-access-token|server|private|warning\.txt|\u001b/);
    assert.doesNotMatch(infoMessage, /integration multiword password|integration unquoted multiword password|AKIAINTEGRATION|ASIAIOSFODNN7EXAMPLE|integration-provider-secret|ghp_|github_pat_|eyJhbGci|integration-truncated-private-key-body|BEGIN PRIVATE KEY|Program Files|integration private file/i);
    assert.ok(infoMessage.length < 1500, "Integrated warning output must remain bounded.");
    console.log("Import warning integration test passed.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}, 20);
