require("./fail_on_console_error.js");

const assert = require("assert");
const inputGuard = require("../utils/input-guard");

assert.strictEqual(inputGuard.LIMITS.maxCharacters, 200000);
assert.strictEqual(inputGuard.LIMITS.maxLines, 10000);
assert.strictEqual(inputGuard.LIMITS.maxDeclarations, 2000);
assert.strictEqual(inputGuard.LIMITS.maxRelationships, 5000);
assert.strictEqual(inputGuard.LIMITS.maxNestingDepth, 50);

function expectLimitError(result, pattern) {
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(function (error) {
    return pattern.test(error);
  }), "Expected an error matching " + pattern + ", got: " + result.errors.join(" | "));
}

var valid = inputGuard.validateInput("@startuml\nclass A\n@enduml");
assert.strictEqual(valid.valid, true);
assert.deepStrictEqual(valid.errors, []);
assert.strictEqual(valid.stats.characters, 25);
assert.strictEqual(valid.stats.lines, 3);
assert.strictEqual(valid.stats.declarations, 1);
assert.strictEqual(valid.stats.relationships, 0);
assert.strictEqual(valid.stats.nestingDepth, 0);

expectLimitError(
  inputGuard.validateInput("x".repeat(inputGuard.LIMITS.maxCharacters + 1)),
  /200000 characters/
);
assert.strictEqual(
  inputGuard.validateInput("x".repeat(inputGuard.LIMITS.maxCharacters + 1)).stats.lines,
  0,
  "Character-limit rejection must return before scanning lines"
);

expectLimitError(
  inputGuard.validateInput(Array(inputGuard.LIMITS.maxLines + 2).join("x\n")),
  new RegExp(inputGuard.LIMITS.maxLines + " lines")
);

var declarations = Array(inputGuard.LIMITS.maxDeclarations + 2).join("class Item\n");
expectLimitError(
  inputGuard.validateInput(declarations),
  new RegExp(inputGuard.LIMITS.maxDeclarations + " declarations")
);

var activityActions = Array(inputGuard.LIMITS.maxDeclarations + 2).join(":Process item;\n");
expectLimitError(
  inputGuard.validateInput(activityActions),
  new RegExp(inputGuard.LIMITS.maxDeclarations + " declarations")
);

var mindmapTopics = Array(inputGuard.LIMITS.maxDeclarations + 2).join("** Topic\n");
expectLimitError(
  inputGuard.validateInput(mindmapTopics),
  new RegExp(inputGuard.LIMITS.maxDeclarations + " declarations")
);

var bareUseCases = Array(inputGuard.LIMITS.maxDeclarations + 2).join("(Login)\n");
expectLimitError(
  inputGuard.validateInput(bareUseCases),
  new RegExp(inputGuard.LIMITS.maxDeclarations + " declarations")
);

var relationships = Array(inputGuard.LIMITS.maxRelationships + 2).join("A --> B\n");
expectLimitError(
  inputGuard.validateInput(relationships),
  new RegExp(inputGuard.LIMITS.maxRelationships + " relationships")
);

var nestedStates = Array(inputGuard.LIMITS.maxNestingDepth + 2).join("state S {\n") +
  Array(inputGuard.LIMITS.maxNestingDepth + 2).join("}\n");
expectLimitError(
  inputGuard.validateInput(nestedStates),
  new RegExp(inputGuard.LIMITS.maxNestingDepth + " levels")
);

var nonStructuralBraces = [
  "@startuml",
  "' comment with { braces }",
  'note "quoted { braces }"',
  "Customer ||--o{ Order",
  "Order }o--|| Product",
  "@enduml"
].join("\n");
var nonStructuralResult = inputGuard.validateInput(nonStructuralBraces);
assert.strictEqual(nonStructuralResult.valid, true);
assert.strictEqual(nonStructuralResult.stats.nestingDepth, 0, "Comments, quotes, and ER cardinalities are not nesting");

var blockCommentBraces = ["@startuml", "/'"]
  .concat(Array(inputGuard.LIMITS.maxNestingDepth + 2).fill("state CommentedOut {"))
  .concat(["'/", "@enduml"])
  .join("\n");
var blockCommentResult = inputGuard.validateInput(blockCommentBraces);
assert.strictEqual(blockCommentResult.valid, true, "PlantUML block-comment contents must not trigger limits");
assert.strictEqual(blockCommentResult.stats.declarations, 0, "Block-comment declarations must be ignored");
assert.strictEqual(blockCommentResult.stats.nestingDepth, 0, "Block-comment braces must be ignored");

var quotedCommentMarkers = Array(inputGuard.LIMITS.maxNestingDepth + 2)
  .fill('state "Quoted /\' marker" as S {')
  .join("\n");
expectLimitError(
  inputGuard.validateInput(quotedCommentMarkers),
  new RegExp(inputGuard.LIMITS.maxNestingDepth + " levels")
);

var singleLineCommentMarker = "' disabled /'\n" +
  Array(inputGuard.LIMITS.maxDeclarations + 2).join("class Visible\n");
expectLimitError(
  inputGuard.validateInput(singleLineCommentMarker),
  new RegExp(inputGuard.LIMITS.maxDeclarations + " declarations")
);

console.log("Input guard tests passed.");
