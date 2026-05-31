/**
 * Dialog Helper Utility for StarUML Importer Extension
 */
function showImportDialog(title, sampleCode) {
  if (typeof app === "undefined") {
    return Promise.reject(new Error("StarUML 'app' context not found."));
  }
  return app.dialogs.showTextDialog(title, sampleCode)
    .then(function (result) {
      if (result.buttonId === "ok") {
        return result.returnValue || "";
      }
      return null;
    });
}

module.exports = {
  showImportDialog: showImportDialog
};
