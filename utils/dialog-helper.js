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
    '<div class="dialog plantuml-preview-dialog" style="width: 80vw; height: 80vh; min-width: 700px; min-height: 450px; max-width: 95vw; max-height: 95vh; display: flex; flex-direction: column; background: #282828; color: #e0e0e0; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #3c3c3c; overflow: hidden; position: relative;">',
    '  <div class="modal-header" style="padding: 16px 20px 12px 20px; border-bottom: 1px solid #3c3c3c; background: #282828; display: flex; justify-content: space-between; align-items: center;">',
    '    <div style="flex: 1;"></div>',
    '    <span class="dialog-title" style="font-size: 15px; font-weight: 600; color: #ffffff; font-family: sans-serif; flex: 1; text-align: center;">' + title + '</span>',
    '    <div style="flex: 1; text-align: right; font-size: 13px; font-family: sans-serif;">',
    '      <a href="#" onclick="require(\'electron\').shell.openExternal(\'https://github.com/TwotNguyenVN/staruml-plantuml-importer\'); return false;" style="color: #007acc; text-decoration: none; cursor: pointer;">More info</a>',
    '      <span style="color: #555; margin: 0 6px;">|</span>',
    '      <a href="#" onclick="require(\'electron\').shell.openExternal(\'https://github.com/TwotNguyenVN/staruml-plantuml-importer/issues\'); return false;" style="color: #007acc; text-decoration: none; cursor: pointer;">Issues</a>',
    '      <span style="color: #555; margin: 0 6px;">|</span>',
    '      <a href="#" onclick="require(\'electron\').shell.openExternal(\'https://github.com/TwotNguyenVN\'); return false;" style="color: #007acc; text-decoration: none; cursor: pointer;">Twot Nguyen</a>',
    '    </div>',
    '  </div>',
    '  <div class="modal-body" style="display: flex; gap: 20px; padding: 20px; flex: 1; background: #202020; min-height: 0;">',
    '    <div style="flex: 1; display: flex; flex-direction: column; min-width: 0;">',
    '      <div style="display: flex; align-items: center; min-height: 32px; margin-bottom: 8px;">',
    '        <label style="font-weight: 600; color: #a0a0a0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-family: sans-serif;">PlantUML Code</label>',
    '      </div>',
    '      <textarea class="plantuml-code-input" style="flex: 1; font-family: \'Consolas\', \'Monaco\', \'Courier New\', monospace; font-size: 13px; resize: none; padding: 12px; line-height: 1.5; background: #181818; color: #d4d4d4; border: 1px solid #3a3a3a; border-radius: 6px; outline: none; box-shadow: inset 0 1px 3px rgba(0,0,0,0.3); transition: border-color 0.2s;" placeholder="Type PlantUML code here...">' + sampleCode + '</textarea>',
    '    </div>',
    '    <div style="flex: 2; display: flex; flex-direction: column; border-left: 1px solid #2d2d2d; padding-left: 20px; min-width: 0;">',
    '      <div style="display: flex; justify-content: space-between; align-items: center; min-height: 32px; margin-bottom: 8px;">',
    '        <label style="font-weight: 600; margin: 0; color: #a0a0a0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-family: sans-serif;">Server Preview</label>',
    '        <div class="preview-controls" style="display: flex; gap: 4px; background: #181818; padding: 2px; border-radius: 4px; border: 1px solid #323232;">',
    '          <button class="btn btn-zoom-out" style="padding: 3px 10px; background: transparent; border: none; color: #999; cursor: pointer; font-weight: bold; border-radius: 3px; font-family: sans-serif;" title="Zoom Out">-</button>',
    '          <button class="btn btn-zoom-reset" style="padding: 3px 10px; background: #2d2d2d; border: none; color: #fff; cursor: pointer; font-size: 11px; border-radius: 3px; font-weight: 500; font-family: sans-serif;" title="Reset Zoom">Fit</button>',
    '          <button class="btn btn-zoom-in" style="padding: 3px 10px; background: transparent; border: none; color: #999; cursor: pointer; font-weight: bold; border-radius: 3px; font-family: sans-serif;" title="Zoom In">+</button>',
    '        </div>',
    '      </div>',
    '      <div class="preview-container" style="flex: 1; background: #141414; border: 1px solid #2d2d2d; display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 0; cursor: grab; position: relative; border-radius: 6px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);">',
    '        <span class="preview-placeholder" style="color: #666; font-size: 12px; text-align: center; padding: 10px; font-family: sans-serif;">Loading preview...</span>',
    '        <img class="preview-img" style="display: none; width: 100%; height: 100%; object-fit: contain; user-select: none; transform-origin: center center; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6));" />',
    '      </div>',
    '    </div>',
    '  </div>',
    '  <div class="modal-footer" style="padding: 12px 20px; display: flex; justify-content: flex-end; align-items: center; gap: 8px; border-top: 1px solid #3c3c3c; background: #282828;">',
    '    <button class="btn btn-clear-code" style="padding: 6px 14px; background: #2d2d2d; color: #ccc; border: 1px solid #3c3c3c; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; font-family: sans-serif; transition: background 0.2s;">Clear Code</button>',
    '    <button class="btn btn-default" data-button-id="cancel" style="padding: 6px 16px; background: #2d2d2d; color: #ccc; border: 1px solid #3c3c3c; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 13px; font-family: sans-serif; transition: background 0.2s;">Cancel</button>',
    '    <button class="btn btn-primary" data-button-id="ok" style="padding: 6px 20px; background: #007acc; color: #fff; border: 1px solid #0062a3; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px; font-family: sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: background 0.2s;">Import</button>',
    '  </div>',
    '</div>'
  ].join("\n");

  return new Promise(function (resolve, reject) {
    try {
      // 2. Render Modal
      var dialog = app.dialogs.showModalDialogUsingTemplate(template, true);
      var $dlg = dialog.getElement();

      // Custom Resizing Logic (All 4 edges and corners)
      var handles = ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'];
      handles.forEach(function(dir) {
        var $handle = $('<div class="resizer resizer-' + dir + '"></div>');
        $handle.css({ position: 'absolute', 'z-index': 100 });
        if (dir.indexOf('n') !== -1) $handle.css({ top: 0, height: '8px', cursor: 'ns-resize' });
        if (dir.indexOf('s') !== -1) $handle.css({ bottom: 0, height: '8px', cursor: 'ns-resize' });
        if (dir.indexOf('w') !== -1) $handle.css({ left: 0, width: '8px', cursor: 'ew-resize' });
        if (dir.indexOf('e') !== -1) $handle.css({ right: 0, width: '8px', cursor: 'ew-resize' });
        if (dir.length === 2) {
          $handle.css({ width: '12px', height: '12px', cursor: dir + '-resize' });
        } else {
          if (dir === 'n' || dir === 's') $handle.css({ left: '12px', right: '12px' });
          if (dir === 'e' || dir === 'w') $handle.css({ top: '12px', bottom: '12px' });
        }
        $dlg.append($handle);
      });

      var isResizing = false;
      var currentResizer = null;
      var startMouseX, startMouseY;
      var $wrapper = null;
      var wrapperStartRect = null;
      var diffW = 0, diffH = 0;

      $dlg.on('mousedown', '.resizer', function(e) {
        isResizing = true;
        var resizerClass = $(this).attr('class').match(/resizer-([nesw]{1,2})/);
        currentResizer = resizerClass ? resizerClass[1] : null;
        startMouseX = e.clientX;
        startMouseY = e.clientY;

        $wrapper = $dlg;
        var $parent = $dlg.parent();
        while ($parent.length && $parent[0] !== document.body) {
          var w = $parent[0].getBoundingClientRect().width;
          if (w > window.innerWidth - 20) {
            break; // Stop at full-screen backdrop. The previous element is the dialog box.
          }
          $wrapper = $parent;
          $parent = $parent.parent();
        }

        var wrapperRect = $wrapper[0].getBoundingClientRect();
        var dlgRect = $dlg[0].getBoundingClientRect();
        
        wrapperStartRect = {
          top: wrapperRect.top,
          left: wrapperRect.left,
          width: wrapperRect.width,
          height: wrapperRect.height
        };
        
        diffW = wrapperRect.width - dlgRect.width;
        diffH = wrapperRect.height - dlgRect.height;

        $wrapper.css({
          'box-sizing': 'border-box',
          'position': 'fixed',
          'top': wrapperStartRect.top + 'px',
          'left': wrapperStartRect.left + 'px',
          'width': wrapperStartRect.width + 'px',
          'height': wrapperStartRect.height + 'px',
          'margin': 0,
          'transform': 'none',
          'max-width': 'none',
          'max-height': 'none',
          'transition': 'none'
        });
        
        $dlg.css({
          'box-sizing': 'border-box',
          'width': dlgRect.width + 'px',
          'height': dlgRect.height + 'px',
          'max-width': 'none',
          'max-height': 'none',
          'min-width': '0',
          'min-height': '0',
          'margin': 0,
          'transition': 'none',
          'position': 'relative'
        });

        var cursor = $(this).css('cursor');
        $('body').css({ 'user-select': 'none', 'cursor': cursor });
        e.preventDefault();
        e.stopPropagation();
      });

      var resizeRaf = null;
      $(window).on('mousemove.plantuml-resize', function(e) {
        if (!isResizing || !$wrapper) return;
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(function() {
          var dx = e.clientX - startMouseX;
          var dy = e.clientY - startMouseY;
          var newRect = {
            top: wrapperStartRect.top,
            left: wrapperStartRect.left,
            width: wrapperStartRect.width,
            height: wrapperStartRect.height
          };

          if (currentResizer.indexOf('e') !== -1) newRect.width = Math.max(700 + diffW, wrapperStartRect.width + dx);
          if (currentResizer.indexOf('s') !== -1) newRect.height = Math.max(450 + diffH, wrapperStartRect.height + dy);
          if (currentResizer.indexOf('w') !== -1) {
            var actualDx = Math.min(dx, wrapperStartRect.width - (700 + diffW));
            newRect.left = wrapperStartRect.left + actualDx;
            newRect.width = wrapperStartRect.width - actualDx;
          }
          if (currentResizer.indexOf('n') !== -1) {
            var actualDy = Math.min(dy, wrapperStartRect.height - (450 + diffH));
            newRect.top = wrapperStartRect.top + actualDy;
            newRect.height = wrapperStartRect.height - actualDy;
          }

          $wrapper.css({
            top: newRect.top + 'px',
            left: newRect.left + 'px',
            width: newRect.width + 'px',
            height: newRect.height + 'px'
          });

          $dlg.css({
            width: Math.max(0, newRect.width - diffW) + 'px',
            height: Math.max(0, newRect.height - diffH) + 'px'
          });
        });
      });

      $(window).on('mouseup.plantuml-resize', function(e) {
        if (isResizing) {
          isResizing = false;
          $('body').css({ 'user-select': '', 'cursor': '' });
        }
      });

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

        // Show local welcome image for the default code
        if (code === "@startuml\n\n' Paste your PlantUML code here\n\n@enduml".trim()) {
          $previewPlaceholder.hide();
          var path = require("path");
          var imgPath = path.join(__dirname, "..", "PlantUML_Importer.png").replace(/\\/g, '/');
          $previewImg.off("load").off("error").attr("src", "file:///" + imgPath).show();
          currentScale = 1.0;
          translateX = 0;
          translateY = 0;
          applyTransform(false);
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
        $(window).off(".plantuml-resize");
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
