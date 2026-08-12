const test = require('node:test');
const assert = require('node:assert');
const { fork } = require('child_process');
const path = require('path');

const testFiles = [
  'run_input_guard_test.js',
  'run_preview_security_test.js',
  'run_detect_test.js',
  'run_erd_unit_test.js',
  'run_erd_test.js',
  'run_erd_test2.js',
  'run_algorithm_test.js',
  'run_activity_sequence_test.js',
  'run_sequence_parser_test.js',
  'run_state_test.js',
  'run_usecase_test.js',
  'run_class_test.js',
  'run_mindmap_test.js',
  'run_installer_manifest_test.js',
  'run_deletion_safety_test.js',
  'run_source_checker_test.js',
  'run_source_checker_concurrency_test.js',
  'run_import_guard_integration_test.js',
  'run_import_warning_integration_test.js',
  'run_missing_relation_warning_test.js',
  'run_regression_tests.js',
  'run_requirement_parser_unit_test.js',
  'run_requirement_test.js'
];

testFiles.forEach((file) => {
  test(`Running ${file}`, (t, done) => {
    const child = fork(path.join(__dirname, file), [], { stdio: 'inherit' });
    child.on('exit', (code) => {
      assert.strictEqual(code, 0, `Test script ${file} exited with non-zero code ${code}`);
      done();
    });
  });
});
