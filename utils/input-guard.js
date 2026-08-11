var LIMITS = Object.freeze({
  maxCharacters: 200000,
  maxLines: 10000,
  maxDeclarations: 2000,
  maxRelationships: 5000,
  maxNestingDepth: 50
});

var declarationPattern = /^\s*(?:abstract\s+class|actor|annotation|artifact|boundary|card|class|cloud|collections|component|control|database|entity|enum|file|folder|frame|interface|node|object|package|participant|queue|rectangle|requirement|state|storage|usecase|element)\b/i;
var activityActionPattern = /^\s*:[^;]+;/;
var mindmapTopicPattern = /^\s*[*+-]+\s+\S/;
var bareUseCasePattern = /^\s*\([^\r\n)]+\)(?:\s+as\s+\w+)?\s*$/i;
var structuralBlockPattern = /^\s*(?:abstract\s+class|class|interface|enum|entity|state|package|namespace|rectangle|frame|folder|node|cloud|database|component|object|artifact|storage|requirement|together|partition|group)\b/i;
var relationshipPattern = /(?:<?[-.=]+(?:\[[^\]]*\])?(?:up|down|left|right)?[-.=]*[|o*{}<>]*>|[|o*{}<>]*[-.=]+(?:\[[^\]]*\])?(?:up|down|left|right)?[-.=]*>?)/i;

function countCharacters(text, character) {
  var count = 0;
  for (var index = 0; index < text.length; index += 1) {
    if (text.charAt(index) === character) count += 1;
  }
  return count;
}

function stripNonStructuralSyntax(line) {
  var stripped = line.replace(/"(?:\\.|[^"\\])*"/g, '""');
  var commentIndex = stripped.indexOf("'");
  if (commentIndex !== -1) stripped = stripped.slice(0, commentIndex);
  return stripped
    .replace(/[|o}]\{/g, "")
    .replace(/\}(?=[|o{])/g, "");
}

function stripBlockComments(line, state) {
  var result = "";
  var inString = false;
  var escaped = false;
  for (var cursor = 0; cursor < line.length; cursor += 1) {
    var character = line.charAt(cursor);
    if (state.inBlockComment) {
      if (character === "'" && line.charAt(cursor + 1) === "/") {
        state.inBlockComment = false;
        cursor += 1;
      }
      continue;
    }
    if (inString) {
      result += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      result += character;
    } else if (character === "'") {
      result += line.slice(cursor);
      break;
    } else if (character === "/" && line.charAt(cursor + 1) === "'") {
      state.inBlockComment = true;
      cursor += 1;
    } else {
      result += character;
    }
  }
  return result;
}

function validateInput(text) {
  if (typeof text !== "string") {
    return {
      valid: false,
      errors: ["PlantUML input must be text."],
      stats: { characters: 0, lines: 0, declarations: 0, relationships: 0, nestingDepth: 0 }
    };
  }

  var stats = {
    characters: text.length,
    lines: 0,
    declarations: 0,
    relationships: 0,
    nestingDepth: 0
  };
  var errors = [];
  var declarationsExceeded = false;
  var relationshipsExceeded = false;
  var nestingExceeded = false;
  var linesExceeded = false;

  if (stats.characters > LIMITS.maxCharacters) {
    return {
      valid: false,
      errors: ["PlantUML input exceeds the limit of " + LIMITS.maxCharacters + " characters."],
      stats: stats
    };
  }

  var lines = text.length === 0 ? [] : text.split("\n");
  stats.lines = lines.length;
  var depth = 0;
  var commentState = { inBlockComment: false };
  for (var index = 0; index < lines.length; index += 1) {
    var line = lines[index];
    var countableLine = stripBlockComments(line, commentState);
    if (!declarationsExceeded && (declarationPattern.test(countableLine) || activityActionPattern.test(countableLine) || mindmapTopicPattern.test(countableLine) || bareUseCasePattern.test(countableLine))) {
      stats.declarations += 1;
      if (stats.declarations > LIMITS.maxDeclarations) {
        declarationsExceeded = true;
        errors.push("PlantUML input exceeds the limit of " + LIMITS.maxDeclarations + " declarations.");
      }
    }
    if (!relationshipsExceeded && relationshipPattern.test(countableLine)) {
      stats.relationships += 1;
      if (stats.relationships > LIMITS.maxRelationships) {
        relationshipsExceeded = true;
        errors.push("PlantUML input exceeds the limit of " + LIMITS.maxRelationships + " relationships.");
      }
    }
    if (!nestingExceeded) {
      var structuralLine = stripNonStructuralSyntax(countableLine);
      var openings = structuralBlockPattern.test(structuralLine) ? countCharacters(structuralLine, "{") : 0;
      var closings = countCharacters(structuralLine, "}");
      depth += openings;
      if (depth > stats.nestingDepth) stats.nestingDepth = depth;
      if (stats.nestingDepth > LIMITS.maxNestingDepth) {
        nestingExceeded = true;
        errors.push("PlantUML input exceeds the limit of " + LIMITS.maxNestingDepth + " levels of nesting.");
      }
      depth = Math.max(0, depth - closings);
    }
    if (index + 1 > LIMITS.maxLines && !linesExceeded) {
      linesExceeded = true;
      errors.push("PlantUML input exceeds the limit of " + LIMITS.maxLines + " lines.");
    }
  }

  return { valid: errors.length === 0, errors: errors, stats: stats };
}

module.exports = {
  LIMITS: LIMITS,
  validateInput: validateInput
};
