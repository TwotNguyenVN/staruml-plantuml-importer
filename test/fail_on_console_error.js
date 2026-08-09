// test/fail_on_console_error.js
const originalConsoleError = console.error;

console.error = function(msg, ...args) {
  const err = new Error("Unexpected console.error: " + msg + " " + args.join(" "));
  originalConsoleError("\n=== UNEXPECTED CONSOLE.ERROR IN TEST ===");
  originalConsoleError(err.stack);
  originalConsoleError("========================================\n");
  process.exit(1);
};

global.silenceConsoleError = function() {
  console.error = () => {};
};

global.restoreConsoleError = function() {
  console.error = originalConsoleError;
};
