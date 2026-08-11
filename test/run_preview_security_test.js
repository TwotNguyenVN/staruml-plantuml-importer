require("./fail_on_console_error.js");

const assert = require("assert");
const previewHelper = require("../utils/preview-helper");

delete global.app;
assert.strictEqual(previewHelper.isPreviewEnabled(), false);

global.app = { preferences: { get: function () { return undefined; } } };
assert.strictEqual(previewHelper.isPreviewEnabled(), false);

assert.throws(function () {
  previewHelper.buildPreviewUrl("https://example.com/plantuml", "x".repeat(16384));
}, /Preview URL exceeds 16384 characters/);

var encodeCalls = 0;
function encode(code) {
  encodeCalls += 1;
  assert.strictEqual(code, "@startuml\nclass A\n@enduml");
  return "encoded";
}

var disabledOptions = { enabled: false, encode: encode };
Object.defineProperty(disabledOptions, "configuredUrl", {
  get: function () {
    throw new Error("Disabled preview must not read the configured destination.");
  }
});
var disabled = previewHelper.preparePreview("@startuml\nclass A\n@enduml", disabledOptions, {
  validateInput: function () {
    throw new Error("Disabled preview must not validate source.");
  },
  buildPreviewUrl: function () {
    throw new Error("Disabled preview must not construct a final URL.");
  }
});
assert.strictEqual(encodeCalls, 0);
assert.deepStrictEqual(disabled, {
  status: "disabled",
  message: "Preview disabled. Enable it in Preferences after reviewing the source-disclosure risk.",
  url: null
});

var dependencyCalls = { validate: 0, buildUrl: 0 };
var dependencyReady = previewHelper.preparePreview("@startuml\nclass A\n@enduml", {
  enabled: true,
  configuredUrl: "https://example.com/plantuml",
  encode: function () { return "injected-encoding"; }
}, {
  validateInput: function () {
    dependencyCalls.validate += 1;
    return { valid: true, errors: [], stats: {} };
  },
  buildPreviewUrl: function (configuredUrl, encoded) {
    dependencyCalls.buildUrl += 1;
    assert.strictEqual(configuredUrl, "https://example.com/plantuml");
    assert.strictEqual(encoded, "injected-encoding");
    return "https://preview.test/injected";
  }
});
assert.deepStrictEqual(dependencyCalls, { validate: 1, buildUrl: 1 });
assert.strictEqual(dependencyReady.url, "https://preview.test/injected");
assert.match(dependencyReady.message, /https:\/\/example\.com\/plantuml/);
assert.match(dependencyReady.message, /complete reversibly encoded PlantUML source/i);
assert.match(dependencyReady.message, /GET URL/i);

var ready = previewHelper.preparePreview("@startuml\nclass A\n@enduml", {
  enabled: true,
  configuredUrl: "http://example.com/plantuml/png/",
  encode: encode
});
assert.strictEqual(encodeCalls, 1);
assert.strictEqual(ready.status, "ready");
assert.strictEqual(ready.url, "https://example.com/plantuml/png/encoded");

var invalidEncodeCalls = 0;
var invalid = previewHelper.preparePreview("x".repeat(200001), {
  enabled: true,
  configuredUrl: "https://example.com/plantuml",
  encode: function () {
    invalidEncodeCalls += 1;
    return "should-not-run";
  }
});
assert.strictEqual(invalidEncodeCalls, 0);
assert.strictEqual(invalid.status, "invalid");
assert.match(invalid.message, /200000 characters/);
assert.strictEqual(invalid.url, null);

function createElement(name) {
  return {
    name: name,
    length: 1,
    handlers: {},
    offCalls: [],
    attributes: {},
    value: "",
    0: {
      getBoundingClientRect: function () { return { top: 0, left: 0, width: 800, height: 600 }; },
      setSelectionRange: function () {}
    },
    css: function () { return this; },
    append: function () { return this; },
    text: function () { return this; },
    hide: function () { return this; },
    show: function () { return this; },
    focus: function () { return this; },
    parent: function () { return { length: 0 }; },
    is: function () { return false; },
    val: function (value) {
      if (arguments.length) {
        this.value = value;
        return this;
      }
      return this.value;
    },
    attr: function (key, value) {
      if (arguments.length === 2) {
        this.attributes[key] = value;
        return this;
      }
      return this.attributes[key];
    },
    on: function (eventName, selector, handler) {
      this.handlers[eventName] = typeof selector === "function" ? selector : handler;
      return this;
    },
    off: function (eventName) {
      this.offCalls.push(eventName || "*");
      if (eventName) delete this.handlers[eventName];
      else this.handlers = {};
      return this;
    },
    trigger: function (eventName, event) {
      if (this.handlers[eventName]) this.handlers[eventName](event || {});
    },
    find: function () { return this; }
  };
}

var capturedTemplate = "";
var elements = {
  dialog: createElement("dialog"),
  textarea: createElement("textarea"),
  previewContainer: createElement("previewContainer"),
  previewPlaceholder: createElement("previewPlaceholder"),
  previewImg: createElement("previewImg"),
  splitter: createElement("splitter"),
  splitterLine: createElement("splitterLine"),
  panelLeft: createElement("panelLeft"),
  dialogBody: createElement("dialogBody"),
  zoomIn: createElement("zoomIn"),
  zoomOut: createElement("zoomOut"),
  zoomReset: createElement("zoomReset"),
  clear: createElement("clear"),
  moreInfo: createElement("moreInfo"),
  issues: createElement("issues"),
  author: createElement("author"),
  cancel: createElement("cancel"),
  ok: createElement("ok"),
  title: createElement("title"),
  window: createElement("window"),
  body: createElement("body")
};
elements.splitter.find = function () { return elements.splitterLine; };
var selectorMap = {
  ".plantuml-code-input": elements.textarea,
  ".preview-container": elements.previewContainer,
  ".preview-placeholder": elements.previewPlaceholder,
  ".preview-img": elements.previewImg,
  ".panel-splitter": elements.splitter,
  ".panel-left": elements.panelLeft,
  ".dialog-body": elements.dialogBody,
  ".btn-zoom-in": elements.zoomIn,
  ".btn-zoom-out": elements.zoomOut,
  ".btn-zoom-reset": elements.zoomReset,
  ".btn-clear-code": elements.clear,
  ".link-more-info": elements.moreInfo,
  ".link-issues": elements.issues,
  ".link-author": elements.author,
  '[data-button-id="cancel"]': elements.cancel,
  '[data-button-id="ok"]': elements.ok,
  ".dialog-title": elements.title
};
elements.dialog.find = function (selector) { return selectorMap[selector] || createElement(selector); };

var timeoutIds = [];
var clearedTimeouts = [];
var animationIds = [];
var cancelledAnimations = [];
var originalSetTimeout = global.setTimeout;
var originalClearTimeout = global.clearTimeout;
global.setTimeout = function () {
  var id = timeoutIds.length + 1;
  timeoutIds.push(id);
  return id;
};
global.clearTimeout = function (id) { clearedTimeouts.push(id); };
global.requestAnimationFrame = function () {
  var id = animationIds.length + 101;
  animationIds.push(id);
  return id;
};
global.cancelAnimationFrame = function (id) { cancelledAnimations.push(id); };

global.window = {};
global.document = { body: {} };
global.$ = function (value) {
  if (value === global.window) return elements.window;
  if (value === "body") return elements.body;
  return createElement("created");
};
var serverPreferenceReads = 0;
global.app = {
  dialogs: {
    showModalDialogUsingTemplate: function (template) {
      capturedTemplate = template;
      return {
        getElement: function () { return elements.dialog; },
        close: function () {}
      };
    }
  },
  preferences: {
    get: function (key) {
      if (key === "plantuml-importer.preview") return false;
      serverPreferenceReads += 1;
      return "https://example.com/plantuml";
    }
  }
};

var dialogHelper = require("../utils/dialog-helper");
var hostileSample = "</textarea><img src=x onerror=alert(1)>";
dialogHelper.showImportDialog("PlantUML <Importer>", hostileSample);
assert.strictEqual(capturedTemplate.indexOf(hostileSample), -1);
assert.strictEqual(capturedTemplate.indexOf("onclick="), -1);
assert.strictEqual(capturedTemplate.indexOf("PlantUML <Importer>"), -1);
assert.strictEqual(elements.textarea.value, hostileSample);
assert.strictEqual(elements.previewImg.attributes.src, undefined, "Disabled preview must not assign image src");
assert.strictEqual(serverPreferenceReads, 0, "Disabled preview must not read the configured destination");

elements.textarea.trigger("input");
elements.splitter.trigger("mousedown", { preventDefault: function () {}, stopPropagation: function () {} });
elements.window.trigger("mousemove.plantuml-split", { clientX: 300 });
dialogHelper.closeImportDialog();

assert.deepStrictEqual(clearedTimeouts.sort(), timeoutIds.sort(), "Close must clear focus and debounce timeouts");
assert.deepStrictEqual(cancelledAnimations, animationIds, "Close must cancel pending animation work");
assert.ok(elements.window.offCalls.indexOf(".plantuml-pan") !== -1);
assert.ok(elements.window.offCalls.indexOf(".plantuml-resize") !== -1);
assert.ok(elements.window.offCalls.indexOf(".plantuml-split") !== -1);
assert.ok(elements.textarea.offCalls.indexOf("*") !== -1);
assert.ok(elements.splitter.offCalls.indexOf("*") !== -1);
assert.ok(elements.previewContainer.offCalls.indexOf("*") !== -1);
assert.ok(elements.previewImg.offCalls.indexOf("*") !== -1);
assert.ok(elements.zoomIn.offCalls.indexOf("*") !== -1);
assert.ok(elements.zoomOut.offCalls.indexOf("*") !== -1);
assert.ok(elements.zoomReset.offCalls.indexOf("*") !== -1);
assert.ok(elements.clear.offCalls.indexOf("*") !== -1);
assert.ok(elements.moreInfo.offCalls.indexOf("*") !== -1);
assert.ok(elements.issues.offCalls.indexOf("*") !== -1);
assert.ok(elements.author.offCalls.indexOf("*") !== -1);
assert.ok(elements.cancel.offCalls.indexOf("*") !== -1);
assert.ok(elements.ok.offCalls.indexOf("*") !== -1);

assert.strictEqual(typeof dialogHelper.openExternalSafely, "function");
var openResult = dialogHelper.openExternalSafely("https://example.com/fixed", {
  openExternal: function () { return Promise.reject(new Error("secret URL failure")); }
});

Promise.resolve(openResult).then(function () {
  global.setTimeout = originalSetTimeout;
  global.clearTimeout = originalClearTimeout;
  delete global.requestAnimationFrame;
  delete global.cancelAnimationFrame;
  delete global.$;
  delete global.window;
  delete global.document;
  delete global.app;
  console.log("Preview security tests passed.");
}).catch(function (error) {
  global.setTimeout = originalSetTimeout;
  global.clearTimeout = originalClearTimeout;
  throw error;
});
