// utils/preview-helper.js

function isPreviewEnabled() {
  if (typeof app !== "undefined" && app.preferences) {
    var val = app.preferences.get("plantuml-importer.preview");
    if (val !== undefined) return !!val;
  }
  return true;
}

function getNormalizedServerUrl(val) {
  var url = "https://www.plantuml.com/plantuml";
  if (val && typeof val === "string" && val.trim()) {
    url = val.trim();
  }

  try {
    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    var parsed = new URL(url);
    var protocol = parsed.protocol;
    var host = parsed.hostname;

    // Force HTTPS unless it's localhost / loopback
    if (protocol === "http:") {
      if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
        protocol = "https:";
      }
    }

    var pathname = parsed.pathname;
    // Clean up pathname: remove trailing slashes and formats like /png, /svg, /txt
    pathname = pathname.replace(/\/+$/, "");
    pathname = pathname.replace(/\/(png|svg|txt)$/i, "");
    pathname = pathname.replace(/\/+$/, "");

    // Normalize plantuml base exactly once for plantuml.com
    if (/(^|\.)plantuml\.com$/i.test(host)) {
      if (pathname === "" || pathname === "/") {
        pathname = "/plantuml";
      }
    }

    var portStr = parsed.port ? (":" + parsed.port) : "";
    // Note: parsed.search (query) and parsed.hash are deliberately stripped/omitted here
    // to prevent malformed URLs like base?x=1/png/encoded
    var normalized = protocol + "//" + host + portStr + pathname;
    normalized = normalized.replace(/\/+$/, "");
    return normalized;
  } catch (e) {
    return url;
  }
}

function isValidUrl(urlString) {
  try {
    var url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function buildPreviewUrl(configuredUrl, encodedDiagram) {
  var normalized = getNormalizedServerUrl(configuredUrl);
  return normalized + "/png/" + encodedDiagram;
}

module.exports = {
  isPreviewEnabled: isPreviewEnabled,
  getNormalizedServerUrl: getNormalizedServerUrl,
  isValidUrl: isValidUrl,
  buildPreviewUrl: buildPreviewUrl
};
