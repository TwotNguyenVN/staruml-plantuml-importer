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
    '<div class="dialog plantuml-preview-dialog" style="width: 1400px; display: flex; flex-direction: column;">',
    '  <div class="modal-header">',
    '    <span class="dialog-title">' + title + '</span>',
    '  </div>',
    '  <div class="modal-body" style="display: flex; gap: 15px; padding: 15px; height: 700px;">',
    '    <div style="flex: 1; display: flex; flex-direction: column; min-width: 0;">',
    '      <label style="font-weight: bold; margin-bottom: 5px;">PlantUML Code:</label>',
    '      <textarea class="plantuml-code-input" style="flex: 1; font-family: monospace; font-size: 13px; resize: none; padding: 8px; line-height: 1.5; margin-bottom: 10px;">' + sampleCode + '</textarea>',
    '      <div style="display: flex; justify-content: flex-end; margin-bottom: 5px;">',
    '        <button class="btn btn-default btn-clear-code" style="padding: 4px 12px;">Clear Code</button>',
    '      </div>',
    '    </div>',
    '    <div style="flex: 2; display: flex; flex-direction: column; border-left: 1px solid #ccc; padding-left: 15px; min-width: 0;">',
    '      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">',
    '        <label style="font-weight: bold; margin: 0;">Server Preview:</label>',
    '        <div class="preview-controls" style="display: flex; gap: 5px;">',
    '          <button class="btn btn-zoom-out" style="padding: 2px 8px;" title="Zoom Out">-</button>',
    '          <button class="btn btn-zoom-reset" style="padding: 2px 8px; font-size: 11px;" title="Reset Zoom">Fit</button>',
    '          <button class="btn btn-zoom-in" style="padding: 2px 8px;" title="Zoom In">+</button>',
    '        </div>',
    '      </div>',
    '      <div class="preview-container" style="flex: 1; background: #fafafa; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 0; cursor: grab; position: relative;">',
    '        <span class="preview-placeholder" style="color: #666; font-size: 12px; text-align: center; padding: 10px;">Loading preview...</span>',
    '        <img class="preview-img" style="display: none; width: 100%; height: 100%; object-fit: contain; user-select: none; transform-origin: center center;" />',
    '      </div>',
    '    </div>',
    '  </div>',
    '  <div class="modal-footer" style="padding: 10px 15px; display: flex; justify-content: flex-end; align-items: center; gap: 10px;">',
    '    <button class="btn btn-default" data-button-id="cancel">Cancel</button>',
    '    <button class="btn btn-primary" data-button-id="ok">Import</button>',
    '  </div>',
    '</div>'
  ].join("\n");

  return new Promise(function (resolve, reject) {
    try {
      // 2. Render Modal
      var dialog = app.dialogs.showModalDialogUsingTemplate(template, true);
      var $dlg = dialog.getElement();

      var $textarea = $dlg.find(".plantuml-code-input");
      var $previewContainer = $dlg.find(".preview-container");
      var $previewPlaceholder = $dlg.find(".preview-placeholder");
      var $previewImg = $dlg.find(".preview-img");

      var $btnZoomIn = $dlg.find(".btn-zoom-in");
      var $btnZoomOut = $dlg.find(".btn-zoom-out");
      var $btnZoomReset = $dlg.find(".btn-zoom-reset");

      var currentScale = 1.0;
      var translateX = 0;
      var translateY = 0;

      function applyTransform(animate) {
        $previewImg.css({
          "transition": animate ? "transform 0.15s ease-out" : "none",
          "transform": "translate(" + translateX + "px, " + translateY + "px) scale(" + currentScale + ")"
        });
      }

      var debounceTimeout = null;
      function updatePreview() {
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
            
            // Reset transforms on load
            currentScale = 1.0;
            translateX = 0;
            translateY = 0;
            applyTransform(false);
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
      }

      // Input event listener with 800ms debounce
      $textarea.on("input", function () {
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
        }
        debounceTimeout = setTimeout(function () {
          updatePreview();
        }, 800);
      });

      // Initial update when dialog opens
      updatePreview();

      // Clear Code button handler
      var $btnClearCode = $dlg.find(".btn-clear-code");
      $btnClearCode.on("click", function (e) {
        e.preventDefault();
        $textarea.val("");
        updatePreview();
        $textarea.focus();
      });

      // Zoom Controls handlers
      $btnZoomIn.on("click", function (e) {
        e.preventDefault();
        if (!$previewImg.is(":visible")) return;
        currentScale = Math.min(currentScale * 1.25, 8.0);
        applyTransform(true);
      });

      $btnZoomOut.on("click", function (e) {
        e.preventDefault();
        if (!$previewImg.is(":visible")) return;
        currentScale = Math.max(currentScale / 1.25, 0.15);
        applyTransform(true);
      });

      $btnZoomReset.on("click", function (e) {
        e.preventDefault();
        if (!$previewImg.is(":visible")) return;
        currentScale = 1.0;
        translateX = 0;
        translateY = 0;
        applyTransform(true);
      });

      // Mouse Drag Panning handlers
      var isDragging = false;
      var startX, startY;
      var startTranslateX = 0;
      var startTranslateY = 0;

      $previewContainer.on("mousedown", function (e) {
        if ($previewImg.is(":visible")) {
          isDragging = true;
          $previewContainer.css("cursor", "grabbing");
          startX = e.clientX;
          startY = e.clientY;
          startTranslateX = translateX;
          startTranslateY = translateY;
          e.preventDefault();
        }
      });

      $previewImg.on("dragstart", function (e) {
        e.preventDefault();
      });

      $(window).on("mousemove.plantuml-pan", function (e) {
        if (!isDragging) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        translateX = startTranslateX + dx;
        translateY = startTranslateY + dy;
        applyTransform(false);
      });

      $(window).on("mouseup.plantuml-pan", function () {
        if (isDragging) {
          isDragging = false;
          $previewContainer.css("cursor", "grab");
        }
      });

      // Mouse Wheel Zoom (requires Ctrl key)
      $previewContainer.on("wheel", function (e) {
        if (!$previewImg.is(":visible")) return;
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();

          var delta = e.originalEvent.deltaY;
          var factor = delta < 0 ? 1.15 : 0.85;

          var newScale = currentScale * factor;
          newScale = Math.max(0.15, Math.min(newScale, 8.0));
          
          currentScale = newScale;
          applyTransform(true);
        }
      });

      // Keyboard Ctrl + +/- Zoom
      $(window).on("keydown.plantuml-pan", function (e) {
        if (e.ctrlKey || e.metaKey) {
          var key = e.which || e.keyCode;
          var zoomType = null;
          if (key === 187 || key === 61 || key === 107) {
            zoomType = "in";
          } else if (key === 189 || key === 173 || key === 109) {
            zoomType = "out";
          }

          if (zoomType) {
            e.preventDefault();
            if (!$previewImg.is(":visible")) return;

            var factor = zoomType === "in" ? 1.25 : 0.8;
            currentScale = Math.max(0.15, Math.min(currentScale * factor, 8.0));
            applyTransform(true);
          }
        }
      });

      function cleanUpEvents() {
        $(window).off(".plantuml-pan");
      }

      var isResolved = false;

      // Cancel button click handler
      $dlg.find('[data-button-id="cancel"]').on("click", function (e) {
        e.preventDefault();
        isResolved = true;
        cleanUpEvents();
        dialog.close("cancel");
        resolve(null);
      });

      // Import button click handler
      $dlg.find('[data-button-id="ok"]').on("click", function (e) {
        e.preventDefault();
        var valueToReturn = $textarea.val() || "";
        isResolved = true;
        cleanUpEvents();
        dialog.close("ok");
        resolve(valueToReturn);
      });

      // Fallback in case the dialog is closed by pressing escape or clicking close (x) button
      var promise = dialog.getPromise ? dialog.getPromise() : dialog;
      if (promise && promise.done) {
        promise.done(function (buttonId) {
          if (!isResolved) {
            isResolved = true;
            cleanUpEvents();
            resolve(buttonId === "ok" ? ($textarea.val() || "") : null);
          }
        });
      } else if (promise && promise.then) {
        promise.then(function (buttonId) {
          if (!isResolved) {
            isResolved = true;
            cleanUpEvents();
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
