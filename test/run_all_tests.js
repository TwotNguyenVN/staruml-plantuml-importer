const test = require('node:test');
const assert = require('node:assert');
const { fork } = require('child_process');
const path = require('path');

const testFiles = [
  'run_detect_test.js',
  'run_erd_unit_test.js',
  'run_erd_test.js',
  'run_erd_test2.js',
  'run_algorithm_test.js',
  'run_activity_sequence_test.js',
  'run_sequence_parser_test.js',
  'run_state_test.js',
  'run_usecase_test.js',
  'run_regression_tests.js'
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
