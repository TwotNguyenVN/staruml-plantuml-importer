/**
 * Dialog Helper Utility for StarUML Importer Extension
 * Handles previewing diagrams from server using PlantUML encoding
 */

const zlib = require("zlib");

function encode6bit(b) {
  if (b < 10) return String.fromCharCode(48 + b); // '0'-'9'
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b); // 'A'-'Z'
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b); // 'a'-'z'
  b -= 26;
  if (b === 0) return "-";
  if (b === 1) return "_";
  return "?";
}

function append3bytes(b1, b2, b3) {
  var c1 = b1 >> 2;
  var c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  var c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
  var c4 = b3 & 0x3F;
  return (
    encode6bit(c1 & 0x3F) +
    encode6bit(c2 & 0x3F) +
    encode6bit(c3 & 0x3F) +
    encode6bit(c4 & 0x3F)
  );
}

function encodePlantUML(text) {
  var utf8Data = Buffer.from(text, "utf8");
  var compressed = zlib.deflateRawSync(utf8Data);
  var r = "";
  for (var i = 0; i < compressed.length; i += 3) {
    if (i + 2 < compressed.length) {
      r += append3bytes(compressed[i], compressed[i + 1], compressed[i + 2]);
    } else if (i + 1 < compressed.length) {
      r += append3bytes(compressed[i], compressed[i + 1], 0);
    } else {
      r += append3bytes(compressed[i], 0, 0);
    }
  }
  return r;
}

function showImportDialog(title, sampleCode) {
  if (typeof app === "undefined") {
    return Promise.reject(new Error("StarUML 'app' context not found."));
  }

  // 1. HTML Dialog Template
  var template = [
    '<div class="dialog plantuml-preview-dialog" style="width: 1050px; display: flex; flex-direction: column;">',
    '  <div class="modal-header">',
    '    <span class="dialog-title">' + title + '</span>',
    '  </div>',
    '  <div class="modal-body" style="display: flex; gap: 15px; padding: 15px; height: 500px;">',
    '    <div style="flex: 1; display: flex; flex-direction: column; min-width: 0;">',
    '      <label style="font-weight: bold; margin-bottom: 5px;">PlantUML Code:</label>',
    '      <textarea class="plantuml-code-input" style="flex: 1; font-family: monospace; font-size: 13px; resize: none; padding: 8px; line-height: 1.5;">' + sampleCode + '</textarea>',
    '    </div>',
    '    <div style="flex: 1; display: flex; flex-direction: column; border-left: 1px solid #ccc; padding-left: 15px; min-width: 0;">',
    '      <label style="font-weight: bold; margin-bottom: 5px;">Server Preview:</label>',
    '      <div class="preview-container" style="flex: 1; background: #fafafa; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; overflow: auto; min-height: 0;">',
    '        <span class="preview-placeholder" style="color: #666; font-size: 12px; text-align: center; padding: 10px;">Click Preview button to render</span>',
    '        <img class="preview-img" style="display: none; max-width: 100%; max-height: 100%; object-fit: contain;" />',
    '      </div>',
    '    </div>',
    '  </div>',
    '  <div class="modal-footer" style="padding: 10px 15px; display: flex; justify-content: space-between; align-items: center;">',
    '    <div>',
    '      <button class="btn btn-default btn-preview">Preview</button>',
    '    </div>',
    '    <div>',
    '      <button class="btn btn-default" data-button-id="cancel">Cancel</button>',
    '      <button class="btn btn-primary" data-button-id="ok">Import</button>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join("\n");

  return new Promise(function (resolve, reject) {
    try {
      // 2. Render Modal
      var dialog = app.dialogs.showModalDialogUsingTemplate(template, true);
      var $dlg = dialog.getElement();

      var $textarea = $dlg.find(".plantuml-code-input");
      var $previewPlaceholder = $dlg.find(".preview-placeholder");
      var $previewImg = $dlg.find(".preview-img");
      var $btnPreview = $dlg.find(".btn-preview");

      // Click handler for preview button
      $btnPreview.on("click", function (e) {
        e.preventDefault();
        var code = $textarea.val().trim();
        if (!code) {
          $previewPlaceholder.text("No code to preview.").show();
          $previewImg.hide();
          return;
        }

        $previewPlaceholder.text("Loading diagram from server...").show();
        $previewImg.hide();

        try {
          var encoded = encodePlantUML(code);
          var imageUrl = "http://www.plantuml.com/plantuml/png/" + encoded;

          // Register handlers BEFORE setting src to avoid synchronous load race conditions
          $previewImg.off("load").on("load", function () {
            $previewPlaceholder.hide();
            $previewImg.show();
          });
          $previewImg.off("error").on("error", function () {
            $previewPlaceholder.text("Failed to load image from PlantUML server.").show();
            $previewImg.hide();
          });
          
          $previewImg.attr("src", imageUrl);
        } catch (err) {
          $previewPlaceholder.text("Encoding error: " + err.message).show();
          $previewImg.hide();
        }
      });

      var isResolved = false;

      // Cancel button click handler
      $dlg.find('[data-button-id="cancel"]').on("click", function (e) {
        e.preventDefault();
        isResolved = true;
        dialog.close("cancel");
        resolve(null);
      });

      // Import button click handler
      $dlg.find('[data-button-id="ok"]').on("click", function (e) {
        e.preventDefault();
        var valueToReturn = $textarea.val() || "";
        isResolved = true;
        dialog.close("ok");
        resolve(valueToReturn);
      });

      // Fallback in case the dialog is closed by pressing escape or clicking Brackets close (x) button
      var promise = dialog.getPromise ? dialog.getPromise() : dialog;
      if (promise && promise.done) {
        promise.done(function (buttonId) {
          if (!isResolved) {
            isResolved = true;
            resolve(buttonId === "ok" ? ($textarea.val() || "") : null);
          }
        });
      } else if (promise && promise.then) {
        promise.then(function (buttonId) {
          if (!isResolved) {
            isResolved = true;
            resolve(buttonId === "ok" ? ($textarea.val() || "") : null);
          }
        });
      }
    } catch (dialogErr) {
      reject(dialogErr);
    }
  });
}

module.exports = {
  showImportDialog: showImportDialog,
  encodePlantUML: encodePlantUML
};
